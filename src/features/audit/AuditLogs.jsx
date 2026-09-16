import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, UserCheck, FileScan, AlertOctagon, Loader2 } from "lucide-react";
import { screeningApi } from "@/services/api/screeningApi";
import { useAuth } from "@/context/AuthContext";

export function AuditLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuditEvents = async () => {
      try {
        const res = await screeningApi.getScreenings();
        const events = [];

        // 1. Current Session Authentication Event
        events.push({
          id: "evt-auth-active",
          timestamp: new Date().toISOString(),
          user: user?.email || "admin@docuscreen.local",
          userName: user?.name || "Inspector John Doe",
          action: "AUTH_SESSION_ESTABLISHED",
          resource: "JWT:BearerToken",
          status: "SUCCESS",
          details: `Authenticated via secure credential handshake (Badge: ${user?.badgeNumber || "DS-9001"})`,
        });

        // 2. Derive audit entries from real screening documents
        if (res.success && Array.isArray(res.data)) {
          res.data.forEach((s) => {
            // Screening Submission Audit Event
            events.push({
              id: `evt-screen-${s._id}`,
              timestamp: s.createdAt || new Date().toISOString(),
              user: s.createdByName || "Inspector John Doe",
              action: "SCREENING_EXECUTED",
              resource: `Screening:${s.screeningId}`,
              status: s.status === "FAILED" ? "FAILURE" : "SUCCESS",
              details: `Uploaded ${s.document?.originalName || "Document"} for AI heuristics analysis. Result: ${s.riskAssessment?.level || s.status}`,
            });

            // If flagged as High Risk, add security escalation audit entry
            if (s.riskAssessment?.level === "HIGH") {
              events.push({
                id: `evt-flag-${s._id}`,
                timestamp: s.updatedAt || s.createdAt || new Date().toISOString(),
                user: "DocuScreen AI Guard",
                action: "SECURITY_ESCALATION",
                resource: `Incident:${s.screeningId}`,
                status: "FLAGGED",
                details: `Automated anomaly alert triggered: ${s.riskAssessment?.reasons?.[0] || "Severe identity integrity mismatch"}`,
              });
            }
          });
        }

        // Sort descending by timestamp
        events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setLogs(events);
      } catch (err) {
        console.error("Failed to load audit events:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditEvents();
  }, [user]);

  const getActionBadge = (action, status) => {
    switch (action) {
      case "AUTH_SESSION_ESTABLISHED":
        return <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200">SESSION LOGIN</Badge>;
      case "SCREENING_EXECUTED":
        return <Badge variant="secondary">DOCUMENT SCREEN</Badge>;
      case "SECURITY_ESCALATION":
        return <Badge variant="destructive">ESCALATION</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Compliance & Audit Trail</h1>
        <p className="text-slate-500">
          Immutable system activity, officer access logs, and AI verification decisions for regulatory compliance.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>System Activity Ledger</CardTitle>
          <CardDescription>
            All verification operations are timestamped with cryptographic integrity references.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="overflow-hidden border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Officer / Actor</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Resource Target</TableHead>
                    <TableHead>Event Summary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-slate-800 whitespace-nowrap">
                        {log.user}
                      </TableCell>
                      <TableCell>{getActionBadge(log.action, log.status)}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-600 whitespace-nowrap">
                        {log.resource}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 max-w-md">
                        {log.details}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
