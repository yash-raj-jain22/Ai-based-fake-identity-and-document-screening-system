import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { systemApi } from "@/services/api/systemApi";
import { screeningApi } from "@/services/api/screeningApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShieldCheck, Lock, Award, FileScan, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export function Profile() {
  const { user, updateUser } = useAuth();

  // Profile form state
  const [name, setName] = useState(user?.name || "");
  const [department, setDepartment] = useState(user?.department || "");
  const [badgeNumber, setBadgeNumber] = useState(user?.badgeNumber || "");

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: "", text: "" });
  const [passwordMessage, setPasswordMessage] = useState({ type: "", text: "" });

  // Duty metrics
  const [stats, setStats] = useState({ total: 0, highRisk: 0, clear: 0 });

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setDepartment(user.department || "");
      setBadgeNumber(user.badgeNumber || "");
    }

    const loadStats = async () => {
      try {
        const res = await screeningApi.getScreenings();
        if (res.success && Array.isArray(res.data)) {
          const total = res.data.length;
          const highRisk = res.data.filter((s) => s.riskAssessment?.level === "HIGH").length;
          const clear = res.data.filter((s) => s.riskAssessment?.level === "LOW").length;
          setStats({ total, highRisk, clear });
        }
      } catch (err) {
        console.error("Failed to load officer stats", err);
      }
    };
    loadStats();
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage({ type: "", text: "" });

    try {
      const res = await systemApi.updateProfile({
        name,
        department,
        badgeNumber,
      });

      if (res.success && res.data?.user) {
        updateUser(res.data.user);
        setProfileMessage({ type: "success", text: "Duty credentials updated successfully." });
      }
    } catch (err) {
      setProfileMessage({ type: "error", text: err.message || "Failed to update profile." });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage({ type: "", text: "" });

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }

    setSavingPassword(true);

    try {
      const res = await systemApi.updateProfile({
        currentPassword,
        newPassword,
      });

      if (res.success) {
        setPasswordMessage({ type: "success", text: "Password changed successfully." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      setPasswordMessage({ type: "error", text: err.message || "Failed to change password." });
    } finally {
      setSavingPassword(false);
    }
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "OF";

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 md:p-6">
      {/* Officer Header Card */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <Avatar className="h-20 w-20 border-2 border-blue-400/50 shadow-inner">
              <AvatarImage src="" alt={user?.name} />
              <AvatarFallback className="bg-blue-600 text-white text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{user?.name || "Duty Officer"}</h1>
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 uppercase text-[11px]">
                  {user?.role || "Inspector"}
                </Badge>
              </div>
              <p className="text-slate-300 text-sm mt-0.5">{user?.email}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                <span className="font-mono bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                  {user?.badgeNumber || "Badge #DS-9001"}
                </span>
                <span>•</span>
                <span>{user?.department || "Document Verification Unit"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm px-4 py-3 rounded-lg border border-white/10">
            <ShieldCheck className="h-8 w-8 text-blue-400" />
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase">Security Clearance</p>
              <p className="text-sm font-semibold text-white">Level 4 - National Border Control</p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Details & Configuration Tabs */}
      <Tabs defaultValue="duty" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="duty">Duty Profile</TabsTrigger>
          <TabsTrigger value="security">Security & Auth</TabsTrigger>
          <TabsTrigger value="metrics">Duty Ledger</TabsTrigger>
        </TabsList>

        {/* Tab 1: Duty Profile */}
        <TabsContent value="duty" className="mt-6">
          <Card>
            <form onSubmit={handleUpdateProfile}>
              <CardHeader>
                <CardTitle>Officer Information</CardTitle>
                <CardDescription>
                  Update your active personnel record and duty assignment information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-xl">
                {profileMessage.text && (
                  <div
                    className={`p-3 rounded-md text-sm flex items-center gap-2 ${
                      profileMessage.type === "success"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {profileMessage.type === "success" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <span>{profileMessage.text}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="officerName">Full Name</Label>
                  <Input
                    id="officerName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="officerEmail">Email Address (Read-only)</Label>
                  <Input id="officerEmail" value={user?.email || ""} disabled className="bg-slate-50" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="officerBadge">Badge Number</Label>
                    <Input
                      id="officerBadge"
                      value={badgeNumber}
                      onChange={(e) => setBadgeNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="officerRole">System Role</Label>
                    <Input id="officerRole" value={user?.role?.toUpperCase() || "OFFICER"} disabled className="bg-slate-50" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="officerDept">Department / Station Assignment</Label>
                  <Input
                    id="officerDept"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button type="submit" disabled={savingProfile} className="bg-blue-600 hover:bg-blue-700">
                  {savingProfile ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving changes...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Tab 2: Security & Credentials */}
        <TabsContent value="security" className="mt-6">
          <Card>
            <form onSubmit={handleChangePassword}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-slate-500" />
                  Change Password & Security Credentials
                </CardTitle>
                <CardDescription>
                  Ensure your account is using a secure, high-entropy password adhering to institutional security policy.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-xl">
                {passwordMessage.text && (
                  <div
                    className={`p-3 rounded-md text-sm flex items-center gap-2 ${
                      passwordMessage.type === "success"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {passwordMessage.type === "success" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <span>{passwordMessage.text}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="currentPass">Current Password</Label>
                  <Input
                    id="currentPass"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPass">New Password</Label>
                  <Input
                    id="newPass"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <p className="text-xs text-slate-400">Must be at least 6 characters long.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPass">Confirm New Password</Label>
                  <Input
                    id="confirmPass"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button type="submit" disabled={savingPassword}>
                  {savingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating password...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Tab 3: Duty Ledger */}
        <TabsContent value="metrics" className="mt-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Total Screenings</CardTitle>
                <FileScan className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.total}</div>
                <p className="text-xs text-slate-400 mt-1">Processed under active badge ID</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-destructive">Suspected Fraud Intercepts</CardTitle>
                <Award className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">{stats.highRisk}</div>
                <p className="text-xs text-slate-400 mt-1">High-risk documents escalated</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-green-600">Verified Cleared</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.clear}</div>
                <p className="text-xs text-slate-400 mt-1">Low-risk documents approved</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
