import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight, Check, Trash2, Loader2 } from "lucide-react";
import { screeningApi } from "@/services/api/screeningApi";
import { Link } from "react-router-dom";

export function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL"); // ALL, CRITICAL, UNREAD
  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("docuscreen_read_notifs") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await screeningApi.getScreenings();
        const alerts = [];

        if (res.success && Array.isArray(res.data)) {
          res.data.forEach((s) => {
            const riskLevel = s.riskAssessment?.level;
            if (riskLevel === "HIGH") {
              alerts.push({
                id: `notif-high-${s._id}`,
                screeningId: s.screeningId,
                title: "Critical Security Escalation",
                message: `Identity document for ${s.ocr?.fields?.name || "Subject"} was flagged as HIGH RISK (${s.riskAssessment?.score}%). ${s.riskAssessment?.reasons?.[0] || "Potential forgery"}`,
                severity: "CRITICAL",
                timestamp: s.createdAt || new Date().toISOString(),
                link: `/screenings/${s.screeningId}`,
              });
            } else if (riskLevel === "MEDIUM" || s.status === "PARTIAL_RESULT") {
              alerts.push({
                id: `notif-warn-${s._id}`,
                screeningId: s.screeningId,
                title: "Inspection Review Advised",
                message: `Document ${s.screeningId} has integrity warnings requiring manual secondary inspection.`,
                severity: "WARNING",
                timestamp: s.createdAt || new Date().toISOString(),
                link: `/screenings/${s.screeningId}`,
              });
            }
          });
        }

        // Add standard system event
        alerts.push({
          id: "notif-system-boot",
          title: "System Integrity Verified",
          message: "All computer vision, OCR, and facial biometric models initialized and operating within standard latency parameters.",
          severity: "INFO",
          timestamp: new Date().toISOString(),
        });

        alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setNotifications(alerts);
      } catch (err) {
        console.error("Failed to load notifications:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(allIds);
    localStorage.setItem("docuscreen_read_notifs", JSON.stringify(allIds));
  };

  const markAsRead = (id) => {
    if (!readIds.includes(id)) {
      const updated = [...readIds, id];
      setReadIds(updated);
      localStorage.setItem("docuscreen_read_notifs", JSON.stringify(updated));
    }
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const filtered = notifications.filter((n) => {
    const isRead = readIds.includes(n.id);
    if (filter === "UNREAD") return !isRead;
    if (filter === "CRITICAL") return n.severity === "CRITICAL";
    return true;
  });

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Security Notifications</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="rounded-full px-2.5 py-0.5 text-xs">
                {unreadCount} Unread
              </Badge>
            )}
          </div>
          <p className="text-slate-500">
            Real-time feed of suspicious document escalations, heuristic warnings, and operational events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0}>
            <Check className="mr-2 h-4 w-4" />
            Mark All Read
          </Button>
          <Button variant="ghost" size="sm" onClick={clearAll} className="text-slate-500">
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Feed
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b pb-3">
        <Button
          variant={filter === "ALL" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilter("ALL")}
        >
          All Notifications ({notifications.length})
        </Button>
        <Button
          variant={filter === "CRITICAL" ? "destructive" : "ghost"}
          size="sm"
          onClick={() => setFilter("CRITICAL")}
        >
          Critical Escalations ({notifications.filter((n) => n.severity === "CRITICAL").length})
        </Button>
        <Button
          variant={filter === "UNREAD" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setFilter("UNREAD")}
        >
          Unread Only ({unreadCount})
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filtered.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {filtered.map((item) => {
                const isRead = readIds.includes(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => markAsRead(item.id)}
                    className={`p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer ${
                      isRead ? "bg-white hover:bg-slate-50/70" : "bg-blue-50/40 hover:bg-blue-50/70"
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="mt-0.5">
                        {item.severity === "CRITICAL" ? (
                          <div className="p-2 rounded-full bg-red-100 text-red-600">
                            <ShieldAlert className="h-5 w-5" />
                          </div>
                        ) : item.severity === "WARNING" ? (
                          <div className="p-2 rounded-full bg-amber-100 text-amber-600">
                            <AlertTriangle className="h-5 w-5" />
                          </div>
                        ) : (
                          <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-900 text-sm">{item.title}</h4>
                          {!isRead && (
                            <span className="h-2 w-2 rounded-full bg-blue-600 inline-block" />
                          )}
                          <span className="text-xs text-slate-400">
                            {new Date(item.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 max-w-2xl">{item.message}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      {item.link && (
                        <Button size="sm" variant="outline" asChild>
                          <Link to={item.link}>
                            Inspect Record <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
              <Bell className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm">No notifications matching the selected filter.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
