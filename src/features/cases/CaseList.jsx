import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, AlertTriangle, ArrowRight, Loader2, FolderCheck } from "lucide-react";
import { screeningApi } from "@/services/api/screeningApi";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function CaseList() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL"); // ALL, HIGH, REVIEW

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const res = await screeningApi.getScreenings();
        if (res.success && Array.isArray(res.data)) {
          // A case is generated for any screening that is high-risk, failed, or requires review
          const flagged = res.data.filter((s) => {
            const riskLevel = s.riskAssessment?.level;
            return (
              riskLevel === "HIGH" ||
              riskLevel === "MEDIUM" ||
              s.status === "PARTIAL_RESULT" ||
              s.status === "FAILED"
            );
          });
          setCases(flagged);
        }
      } catch (err) {
        console.error("Failed to load cases:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
  }, []);

  const filteredCases = cases.filter((c) => {
    if (filter === "HIGH") return c.riskAssessment?.level === "HIGH";
    if (filter === "REVIEW") return c.riskAssessment?.level === "MEDIUM" || c.status === "PARTIAL_RESULT";
    return true;
  });

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Investigation Cases</h1>
          <p className="text-slate-500">
            Escalated screenings and suspected document tampering incidents requiring formal officer review.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={filter === "ALL" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("ALL")}
          >
            All Flagged ({cases.length})
          </Button>
          <Button
            variant={filter === "HIGH" ? "destructive" : "outline"}
            size="sm"
            onClick={() => setFilter("HIGH")}
          >
            High Risk ({cases.filter((c) => c.riskAssessment?.level === "HIGH").length})
          </Button>
          <Button
            variant={filter === "REVIEW" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setFilter("REVIEW")}
          >
            Under Review ({cases.filter((c) => c.riskAssessment?.level === "MEDIUM" || c.status === "PARTIAL_RESULT").length})
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Active Incident Queue</CardTitle>
          <CardDescription>
            Documents that triggered heuristic alerts, face mismatches, or checksum failures.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredCases.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case / Screening ID</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Subject Name</TableHead>
                  <TableHead>Primary Suspicion</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Assigned Officer</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.map((c) => {
                  const riskLevel = c.riskAssessment?.level || "MEDIUM";
                  const primaryReason =
                    c.riskAssessment?.reasons?.[0] ||
                    (c.tampering?.findings?.[0]?.message) ||
                    "Anomalies detected in document structure";

                  return (
                    <TableRow key={c._id}>
                      <TableCell className="font-mono text-xs font-semibold text-slate-800">
                        {c.screeningId}
                      </TableCell>
                      <TableCell className="capitalize text-sm font-medium">
                        {c.document?.documentType || "Passport"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.ocr?.fields?.name || "Unidentified Subject"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 max-w-xs truncate">
                        {primaryReason}
                      </TableCell>
                      <TableCell>
                        {riskLevel === "HIGH" ? (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <ShieldAlert className="h-3 w-3" />
                            High Risk ({c.riskAssessment?.score || 90}%)
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="bg-amber-500 text-white flex items-center gap-1 w-fit">
                            <AlertTriangle className="h-3 w-3" />
                            Review Required
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {c.createdByName || user?.name || "Duty Officer"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/screenings/${c.screeningId}`}>
                            Investigate <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
              <FolderCheck className="h-12 w-12 text-green-500/60 mb-3" />
              <h3 className="font-semibold text-slate-700 text-lg">Queue Clear</h3>
              <p className="text-sm max-w-md mt-1">
                No active escalated cases found. All recently processed identity documents have passed verification thresholds.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
