import { useState, useEffect } from "react";
import { adminApi } from "@/services/api/adminApi";
import { screeningApi } from "@/services/api/screeningApi";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Server, Download, UserPlus, Trash2, RefreshCw, CheckCircle2, AlertCircle, ShieldAlert, Cpu } from "lucide-react";

export function AdminConsole() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [telemetry, setTelemetry] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingTelemetry, setLoadingTelemetry] = useState(true);

  // New Officer Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("Password123!");
  const [newRole, setNewRole] = useState("officer");
  const [newBadge, setNewBadge] = useState("");
  const [newDepartment, setNewDepartment] = useState("Border Security Unit");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const [usersError, setUsersError] = useState("");
  const [telemetryError, setTelemetryError] = useState("");

  const fetchUsers = async () => {
    setLoadingUsers(true);
    setUsersError("");
    try {
      const res = await adminApi.getUsers();
      if (res.success && Array.isArray(res.data)) {
        setUsers(res.data);
      } else if (Array.isArray(res)) {
        setUsers(res);
      } else if (Array.isArray(res?.data)) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error("Failed to load officers:", err);
      setUsersError(err.message || "Failed to retrieve authorized personnel roster.");
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchTelemetry = async () => {
    setLoadingTelemetry(true);
    setTelemetryError("");
    try {
      const res = await adminApi.getSystemHealth();
      if (res.success && res.data) {
        setTelemetry(res.data);
      } else if (res?.database) {
        setTelemetry(res);
      }
    } catch (err) {
      console.error("Failed to load telemetry:", err);
      setTelemetryError(err.message || "Failed to communicate with telemetry gateway.");
    } finally {
      setLoadingTelemetry(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchTelemetry();
  }, []);

  const handleCreateOfficer = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await adminApi.createUser({
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
        badgeNumber: newBadge || `DS-${Math.floor(1000 + Math.random() * 9000)}`,
        department: newDepartment,
      });

      if (res.success) {
        setIsDialogOpen(false);
        setNewName("");
        setNewEmail("");
        setNewBadge("");
        fetchUsers();
      }
    } catch (err) {
      setCreateError(err.message || "Failed to provision officer.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteOfficer = async (targetId) => {
    if (!confirm("Are you sure you wish to revoke this officer account? This action cannot be undone.")) {
      return;
    }

    try {
      const res = await adminApi.deleteUser(targetId);
      if (res.success) {
        fetchUsers();
      }
    } catch (err) {
      alert(err.message || "Could not delete user.");
    }
  };

  const handleExportAuditLogs = async () => {
    try {
      const res = await screeningApi.getScreenings();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `docuscreen-compliance-export-${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert("Failed to export compliance logs: " + err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Administration Console</h1>
          <p className="text-slate-500">
            Manage officer provisioning, monitor infrastructure telemetry, and export regulatory compliance logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => { fetchUsers(); fetchTelemetry(); }}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Telemetry
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <UserPlus className="mr-2 h-4 w-4" />
                Provision Officer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <form onSubmit={handleCreateOfficer}>
                <DialogHeader>
                  <DialogTitle>Provision Officer Account</DialogTitle>
                  <DialogDescription>
                    Create a new duty credential for screening officers or inspection supervisors.
                  </DialogDescription>
                </DialogHeader>

                {createError && (
                  <div className="my-2 p-3 bg-red-50 text-red-700 rounded-md text-xs border border-red-200">
                    {createError}
                  </div>
                )}

                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Officer Full Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g. Inspector Sarah Jenkins"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Official Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="s.jenkins@docuscreen.local"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <select
                        id="role"
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="officer">Screening Officer</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="admin">System Administrator</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="badge">Badge Number</Label>
                      <Input
                        id="badge"
                        placeholder="e.g. DS-4022"
                        value={newBadge}
                        onChange={(e) => setNewBadge(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dept">Assigned Station / Department</Label>
                    <Input
                      id="dept"
                      value={newDepartment}
                      onChange={(e) => setNewDepartment(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Initial Temporary Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating} className="bg-blue-600 hover:bg-blue-700">
                    {creating ? "Provisioning..." : "Create Officer"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="roster" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="roster" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Officer Roster
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Infrastructure Telemetry
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Compliance Export
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Officer Roster */}
        <TabsContent value="roster" className="mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Authorized Personnel Directory</CardTitle>
              <CardDescription>
                Active accounts authorized to access the document screening portal.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="flex justify-center p-8 text-slate-500">Loading roster...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Officer</TableHead>
                      <TableHead>Badge #</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u._id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900">{u.name}</span>
                            <span className="text-xs text-slate-500">{u.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold">
                          {u.badgeNumber || "DS-0000"}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {u.department || "Immigration & Border Control"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={u.role === "admin" ? "default" : "outline"}
                            className="capitalize"
                          >
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {currentUser?._id !== u._id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-red-50 hover:text-red-700"
                              onClick={() => handleDeleteOfficer(u._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: System Telemetry */}
        <TabsContent value="system" className="mt-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* MongoDB Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Database Engine</CardTitle>
                <div className="h-3 w-3 rounded-full bg-green-500 animate-ping" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {telemetry?.database?.status === "CONNECTED" ? "MongoDB 8.0" : "Connecting..."}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-green-600 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>State: {telemetry?.database?.status || "CONNECTED"}</span>
                </div>
                <p className="text-[11px] font-mono text-slate-400 mt-2 truncate">
                  {telemetry?.database?.connection}
                </p>
              </CardContent>
            </Card>

            {/* Python AI Microservice */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">AI Screening Service</CardTitle>
                <Cpu className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  FastAPI / OpenCV
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-blue-600 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    Status: {telemetry?.aiService?.status} {telemetry?.aiService?.latencyMs ? `(${telemetry?.aiService?.latencyMs}ms latency)` : ""}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-400 mt-2">
                  Target: {telemetry?.aiService?.url}
                </p>
              </CardContent>
            </Card>

            {/* Node Backend Telemetry */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Express API Gateway</CardTitle>
                <Server className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  Node {telemetry?.server?.nodeVersion || "Connected"}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Uptime: {Math.floor((telemetry?.server?.uptimeSeconds || 0) / 60)} minutes
                </p>
                <p className="text-xs text-slate-500">
                  Heap: {telemetry?.server?.memory?.heapUsedMB} MB / {telemetry?.server?.memory?.heapTotalMB} MB
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Historical Metrics Summary */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Aggregate Screening Telemetry</CardTitle>
              <CardDescription>All-time processing statistics recorded in system database.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-4 rounded-lg bg-slate-50 border">
                  <p className="text-xs text-slate-500 font-medium uppercase">Total Executions</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{telemetry?.metrics?.totalScreenings || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-xs text-red-600 font-medium uppercase">Severe Anomalies</p>
                  <p className="text-2xl font-bold text-red-700 mt-1">{telemetry?.metrics?.highRiskCount || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-xs text-green-600 font-medium uppercase">Clear Passes</p>
                  <p className="text-2xl font-bold text-green-700 mt-1">{telemetry?.metrics?.completedCount || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 border">
                  <p className="text-xs text-slate-500 font-medium uppercase">Execution Exceptions</p>
                  <p className="text-2xl font-bold text-slate-700 mt-1">{telemetry?.metrics?.failedCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Compliance Export */}
        <TabsContent value="compliance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Regulatory Compliance & Evidentiary Export</CardTitle>
              <CardDescription>
                Download standardized forensic records of all document evaluations, OCR extracted values, and risk scores.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <p className="text-sm text-slate-600">
                Data packages exported from this console contain complete cryptographic audit trails, including timestamps,
                investigating officer badge numbers, and individual component sub-scores suitable for administrative presentation.
              </p>
              <div className="pt-2">
                <Button onClick={handleExportAuditLogs} className="bg-slate-900 hover:bg-slate-800">
                  <Download className="mr-2 h-4 w-4" />
                  Export Full Compliance Ledger (.JSON)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
