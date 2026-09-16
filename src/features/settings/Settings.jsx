import { useState, useEffect } from "react";
import { systemApi } from "@/services/api/systemApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sliders, Monitor, Bell, CheckCircle2, AlertCircle, RotateCcw, Loader2 } from "lucide-react";

export function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Settings State
  const [aiServiceUrl, setAiServiceUrl] = useState("http://localhost:8000");
  const [blurThreshold, setBlurThreshold] = useState(100);
  const [faceMatchThreshold, setFaceMatchThreshold] = useState(60);
  const [tamperingSensitivity, setTamperingSensitivity] = useState("HIGH");
  const [workstationName, setWorkstationName] = useState("Terminal 01 - Primary Inspection Booth");
  const [autoEscalateHighRisk, setAutoEscalateHighRisk] = useState(true);
  const [audioAlerts, setAudioAlerts] = useState(true);
  const [enforceStrictDates, setEnforceStrictDates] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await systemApi.getSettings();
        if (res.success && res.data) {
          const s = res.data;
          if (s.aiServiceUrl) setAiServiceUrl(s.aiServiceUrl);
          if (s.blurThreshold !== undefined) setBlurThreshold(s.blurThreshold);
          if (s.faceMatchThreshold !== undefined) setFaceMatchThreshold(s.faceMatchThreshold);
          if (s.tamperingSensitivity) setTamperingSensitivity(s.tamperingSensitivity);
          if (s.workstationName) setWorkstationName(s.workstationName);
          if (s.autoEscalateHighRisk !== undefined) setAutoEscalateHighRisk(s.autoEscalateHighRisk);
          if (s.audioAlerts !== undefined) setAudioAlerts(s.audioAlerts);
          if (s.enforceStrictDates !== undefined) setEnforceStrictDates(s.enforceStrictDates);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await systemApi.updateSettings({
        aiServiceUrl,
        blurThreshold: Number(blurThreshold),
        faceMatchThreshold: Number(faceMatchThreshold),
        tamperingSensitivity,
        workstationName,
        autoEscalateHighRisk,
        audioAlerts,
        enforceStrictDates,
      });

      if (res.success) {
        setMessage({ type: "success", text: "Workstation and AI heuristic settings saved successfully." });
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to update settings." });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setAiServiceUrl("http://localhost:8000");
    setBlurThreshold(100);
    setFaceMatchThreshold(60);
    setTamperingSensitivity("HIGH");
    setWorkstationName("Terminal 01 - Primary Inspection Booth");
    setAutoEscalateHighRisk(true);
    setAudioAlerts(true);
    setEnforceStrictDates(true);
    setMessage({ type: "info", text: "Reset to system defaults. Click 'Save Changes' to apply." });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-2" />
        Loading settings configuration...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Workstation Settings</h1>
          <p className="text-slate-500">
            Configure automated AI sensitivity cutoffs, inspection station terminal identity, and heuristic alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleResetDefaults}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Defaults
          </Button>
          <Button onClick={handleSave} disabled={saving} size="sm" className="bg-blue-600 hover:bg-blue-700">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {message.text && (
        <div
          className={`p-4 rounded-lg text-sm flex items-center gap-3 border ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border-green-200"
              : message.type === "error"
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-blue-50 text-blue-700 border-blue-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <Tabs defaultValue="ai" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Sliders className="h-4 w-4" />
            AI Heuristics & Rules
          </TabsTrigger>
          <TabsTrigger value="station" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Station Identity & Alerts
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: AI Model Thresholds */}
        <TabsContent value="ai" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Screening Engine Thresholds</CardTitle>
              <CardDescription>
                Fine-tune the mathematical decision boundaries used by the computer vision and biometric comparison pipelines.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-w-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="blur">Laplacian Blur Cutoff Score</Label>
                  <Input
                    id="blur"
                    type="number"
                    value={blurThreshold}
                    onChange={(e) => setBlurThreshold(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    Images with variance below this value trigger an automated Blur warning (Default: 100).
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="faceMatch">Face Biometric Match Threshold (%)</Label>
                  <Input
                    id="faceMatch"
                    type="number"
                    min="0"
                    max="100"
                    value={faceMatchThreshold}
                    onChange={(e) => setFaceMatchThreshold(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    Euclidean distance confidence floor required for matching portrait vs webcam (Default: 60%).
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tamper">Error Level Analysis (ELA) Sensitivity</Label>
                <Select value={tamperingSensitivity} onValueChange={setTamperingSensitivity}>
                  <SelectTrigger id="tamper">
                    <SelectValue placeholder="Select sensitivity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low (Permissive of general JPEG artifacts)</SelectItem>
                    <SelectItem value="STANDARD">Standard (Balanced border inspection)</SelectItem>
                    <SelectItem value="HIGH">High (Flags subtle pixel resaves & splicing)</SelectItem>
                    <SelectItem value="MAXIMUM">Maximum (Forensic lab grade)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Controls the standard deviation threshold for compression anomalies.
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Auto-Escalate High Risk Documents</p>
                    <p className="text-xs text-slate-500">Automatically promote screenings with score &ge; 80 to the Cases queue.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoEscalateHighRisk}
                    onChange={(e) => setAutoEscalateHighRisk(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Enforce Strict Date Logic</p>
                    <p className="text-xs text-slate-500">Flag future birth dates or expired documents as immediate Critical Failures.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={enforceStrictDates}
                    onChange={(e) => setEnforceStrictDates(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Workstation Station Configuration */}
        <TabsContent value="station" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Inspection Terminal Identity</CardTitle>
              <CardDescription>
                Define station descriptors and backend microservice endpoint addresses for this physical counter.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-w-2xl">
              <div className="space-y-2">
                <Label htmlFor="stationName">Inspection Workstation Name</Label>
                <Input
                  id="stationName"
                  value={workstationName}
                  onChange={(e) => setWorkstationName(e.target.value)}
                  placeholder="e.g. Counter 04 - Terminal 2"
                />
                <p className="text-xs text-slate-500">Appears in screening audit logs as the originating checkpoint.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="aiUrl">Python AI Microservice Gateway URL</Label>
                <Input
                  id="aiUrl"
                  value={aiServiceUrl}
                  onChange={(e) => setAiServiceUrl(e.target.value)}
                  placeholder="http://localhost:8000"
                />
                <p className="text-xs text-slate-500">Internal loopback or container gateway routing address.</p>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Audible Incident Alert</p>
                    <p className="text-xs text-slate-500">Play an alert chime when a document is detected as High Risk.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={audioAlerts}
                    onChange={(e) => setAudioAlerts(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
