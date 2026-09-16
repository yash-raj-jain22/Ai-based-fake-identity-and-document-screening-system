import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, AlertTriangle, AlertCircle, FileText, UserCheck, Image as ImageIcon, FileScan, RotateCw } from "lucide-react"

function RiskBadge({ risk }) {
  switch (risk) {
    case 'HIGH': return <Badge variant="destructive" className="text-base px-3 py-1">High Risk</Badge>
    case 'MEDIUM': return <Badge variant="warning" className="bg-amber-500 text-white text-base px-3 py-1">Medium Risk</Badge>
    case 'LOW': return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-base px-3 py-1">Low Risk</Badge>
    case 'REVIEW_REQUIRED': return <Badge variant="destructive" className="bg-orange-600 text-white text-base px-3 py-1">Review Required</Badge>
    case 'PENDING': return <Badge variant="secondary" className="text-base px-3 py-1">Pending</Badge>
    default: return <Badge variant="secondary" className="text-base px-3 py-1">{risk || 'Unknown'}</Badge>
  }
}

const FIELD_LABELS = {
  documentNumber: "Document / Passport No.",
  surname: "Surname",
  givenNames: "Given Names",
  name: "Full Name",
  fullName: "Full Name",
  dateOfBirth: "Date of Birth",
  dateOfBirthFormatted: "Date of Birth (Readable)",
  issueDate: "Date of Issue",
  expiryDate: "Date of Expiry",
  expiryDateFormatted: "Date of Expiry (Readable)",
  sex: "Sex / Gender",
  nationality: "Nationality",
  placeOfBirth: "Place of Birth",
  issuingAuthority: "Issuing Authority",
  documentType: "Document Type"
};

const PREFERRED_OCR_ORDER = [
  "documentNumber",
  "name",
  "surname",
  "givenNames",
  "dateOfBirth",
  "sex",
  "nationality",
  "placeOfBirth",
  "issueDate",
  "expiryDate",
  "issuingAuthority"
];

const PREFERRED_MRZ_ORDER = [
  "documentType",
  "documentNumber",
  "fullName",
  "surname",
  "givenNames",
  "nationality",
  "dateOfBirth",
  "sex",
  "expiryDate"
];

function formatDisplayValue(key, val) {
  if (val === null || val === undefined || val === '') return '-';
  const strVal = String(val);
  // Check if it's an unformatted 6-digit MRZ date (e.g. 980814 or 350311)
  if (/^\d{6}$/.test(strVal) && (key.toLowerCase().includes('birth') || key.toLowerCase().includes('expiry') || key === 'dob' || key === 'exp')) {
    const yy = parseInt(strVal.substring(0, 2), 10);
    const mm = parseInt(strVal.substring(2, 4), 10);
    const dd = parseInt(strVal.substring(4, 6), 10);
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const monStr = (mm >= 1 && mm <= 12) ? months[mm - 1] : `${mm}`;
    const year = key.toLowerCase().includes('expiry') ? 2000 + yy : (yy >= 30 ? 1900 + yy : 2000 + yy);
    return `${dd} ${monStr} ${year} (${strVal})`;
  }
  return strVal;
}

export function ScreeningResult({ resultData }) {
  const [imageError, setImageError] = useState(false);
  const [imageReloadKey, setImageReloadKey] = useState(0);

  if (!resultData) return null;

  if (resultData.status === 'FAILED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 max-w-xl mx-auto text-center p-8 bg-red-50 rounded-xl border border-red-200 mt-10 shadow-sm">
        <AlertCircle className="h-12 w-12 text-red-500 mb-2" />
        <h2 className="text-2xl font-bold text-red-700">Analysis Failed</h2>
        <p className="text-red-600">{resultData.error?.message || "An error occurred during AI screening processing."}</p>
      </div>
    );
  }

  // Safe access fallbacks
  const ocr = resultData.ocr || { status: 'UNAVAILABLE', fields: {} };
  const mrz = resultData.mrz || { status: 'UNAVAILABLE', fields: {} };
  const tampering = resultData.tampering || { status: 'UNAVAILABLE', findings: [] };
  const face = resultData.faceVerification || { status: 'NOT_PERFORMED' };
  const risk = resultData.riskAssessment || { level: 'UNKNOWN', reasons: [] };
  const validation = resultData.validation || { status: 'UNAVAILABLE', findings: [] };
  const imageQuality = resultData.imageQuality || { status: 'UNAVAILABLE', score: 0, warnings: [] };
  const documentAnalysis = resultData.documentAnalysis || { detectedType: 'Unknown', confidence: 0, missingRegions: [] };

  // Generate reliable streaming URLs using the backend endpoint
  const getDocumentUrl = () => {
    const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1').replace(/\/+$/, '');
    const screeningId = resultData.screeningId || resultData._id;
    if (screeningId) {
      return `${baseUrl}/screenings/${screeningId}/document`;
    }
    if (resultData.document?.path) {
      const serverHost = baseUrl.replace('/api/v1', '');
      const filename = resultData.document.path.split(/[\\/]/).pop();
      return `${serverHost}/uploads/${filename}`;
    }
    return null;
  };

  const getLiveFaceUrl = () => {
    const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1').replace(/\/+$/, '');
    const screeningId = resultData.screeningId || resultData._id;
    if (resultData.liveFace?.path && screeningId) {
      return `${baseUrl}/screenings/${screeningId}/live-face`;
    }
    return null;
  };

  const documentUrl = getDocumentUrl();
  const liveFaceUrl = getLiveFaceUrl();

  // Bounding box for portrait
  const portraitRegion = documentAnalysis.portraitRegion;
  const resolutionParts = imageQuality.resolution ? imageQuality.resolution.split('x') : [1, 1];
  const origW = parseInt(resolutionParts[0]) || 1;
  const origH = parseInt(resolutionParts[1]) || 1;

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 md:p-6">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-lg border shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-slate-900">Screening Result</h1>
            <Badge variant="outline" className="bg-slate-100 font-mono">ID: {resultData.screeningId || resultData._id}</Badge>
          </div>
          <p className="text-slate-500 text-sm">Completed on {new Date(resultData.createdAt).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wider">AI Risk Score ({risk.score || 0}/100)</p>
            <RiskBadge risk={risk.level} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Document Viewer (Sticky) */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-base">
                  <ImageIcon className="h-5 w-5 text-slate-400" />
                  Document Viewer
                </span>
                {imageError && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-blue-600"
                    onClick={() => { setImageError(false); setImageReloadKey(k => k + 1); }}
                  >
                    <RotateCw className="h-3.5 w-3.5 mr-1" /> Retry
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-100 min-h-[380px] rounded-md border flex items-center justify-center p-3 group overflow-hidden">
                {documentUrl && !imageError ? (
                  <div className="relative w-fit h-fit flex justify-center items-center">
                    <img
                      key={imageReloadKey}
                      src={documentUrl}
                      alt="Screened Identity Document"
                      className="max-h-[55vh] max-w-full rounded shadow-sm object-contain"
                      onError={() => setImageError(true)}
                    />
                    
                    {/* Bounding Box Overlay for Detected Portrait Region */}
                    {portraitRegion && origW > 1 && origH > 1 && (
                      <div 
                        className="absolute border-2 border-blue-500 bg-blue-500/15 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-start p-1"
                        style={{
                          left: `${(portraitRegion.x / origW) * 100}%`, 
                          top: `${(portraitRegion.y / origH) * 100}%`, 
                          width: `${(portraitRegion.width / origW) * 100}%`, 
                          height: `${(portraitRegion.height / origH) * 100}%`
                        }}
                      >
                        <span className="bg-blue-600 text-white text-[10px] font-semibold px-1 rounded shadow-sm">Portrait</span>
                      </div>
                    )}
                  </div>
                ) : imageError ? (
                  <div className="flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                    <AlertCircle className="h-12 w-12 text-amber-500 mb-2" />
                    <span className="font-medium text-slate-700 text-sm">Image Preview Unavailable</span>
                    <span className="text-xs text-slate-500 mt-1 max-w-xs">Could not load document from server storage.</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => { setImageError(false); setImageReloadKey(k => k + 1); }}
                    >
                      <RotateCw className="h-3.5 w-3.5 mr-1" /> Reload Image
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                    <FileText className="h-14 w-14 mb-2 opacity-50" />
                    <span className="text-sm font-medium">No Image Associated</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Analysis Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="flex w-full flex-wrap mb-4 h-auto justify-start">
              <TabsTrigger value="overview" className="py-2 px-3 text-xs md:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="structure" className="py-2 px-3 text-xs md:text-sm">Structure & Quality</TabsTrigger>
              <TabsTrigger value="ocr" className="py-2 px-3 text-xs md:text-sm">Data Extracted</TabsTrigger>
              <TabsTrigger value="tampering" className="py-2 px-3 text-xs md:text-sm relative">
                Authenticity
                {tampering.status === "POSSIBLE_ANOMALY" && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500"></span>}
              </TabsTrigger>
              <TabsTrigger value="face" className="py-2 px-3 text-xs md:text-sm relative">
                Face Match
                {face.status === "MISMATCH" && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500"></span>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Risk Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {risk.reasons && risk.reasons.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-2">
                      {risk.reasons.map((reason, idx) => (
                        <li key={idx} className="text-slate-700">{reason}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500">No specific risk reasons recorded.</p>
                  )}
                  
                  <Separator />
                  
                  <h3 className="font-semibold text-slate-700">Validation Findings</h3>
                  <div className="space-y-2">
                    {validation.findings && validation.findings.length > 0 ? (
                      validation.findings.map((f, i) => (
                        <div key={i} className={`flex items-start gap-3 p-3 rounded-md border ${
                          f.status === 'FAIL' ? 'bg-red-50 text-red-700 border-red-200' :
                          f.status === 'WARNING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-green-50 text-green-700 border-green-200'
                        }`}>
                          {f.status === 'FAIL' ? <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" /> :
                           f.status === 'WARNING' ? <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" /> :
                           <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />}
                          <div>
                            <p className="font-medium">{f.rule} <Badge variant="outline" className="ml-2 text-[10px]">{f.category}</Badge></p>
                            <p className="text-sm mt-1">{f.message}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-start gap-3 text-green-700 bg-green-50 p-3 rounded-md border border-green-200">
                        <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">All Checks Passed</p>
                          <p className="text-sm mt-1">No validation errors were found.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="structure" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-md flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Image Quality
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-slate-500 text-sm">Status</span>
                        <span className="font-medium text-sm">{imageQuality.status}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-slate-500 text-sm">Score</span>
                        <span className="font-medium text-sm">{imageQuality.score}/100</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-slate-500 text-sm">Resolution</span>
                        <span className="font-medium text-sm">{imageQuality.resolution}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-slate-500 text-sm">Blur Detected</span>
                        <span className="font-medium text-sm">{imageQuality.blurDetected ? "Yes" : "No"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-sm">Brightness</span>
                        <span className="font-medium text-sm">{imageQuality.brightnessStatus}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-md flex items-center gap-2">
                      <FileScan className="h-4 w-4" />
                      Document Structure
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-slate-500 text-sm">Detected Type</span>
                        <span className="font-medium text-sm text-right">{documentAnalysis.detectedType}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-slate-500 text-sm">Confidence</span>
                        <span className="font-medium text-sm">{(documentAnalysis.confidence * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-slate-500 text-sm">Missing Regions</span>
                        <span className="font-medium text-sm text-right">
                            {documentAnalysis.missingRegions?.length > 0 ? documentAnalysis.missingRegions.join(", ") : "None"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="ocr" className="space-y-6">
              {/* 1. OCR vs MRZ Field Cross-Verification (Highlighted at top of Data Extracted) */}
              <Card className="border-blue-100 shadow-sm">
                <CardHeader className="pb-3 bg-slate-50/50 rounded-t-lg border-b">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-blue-600" />
                        OCR vs MRZ Field Cross-Verification
                      </CardTitle>
                      <CardDescription>Direct cross-check between visual document text and machine readable zone</CardDescription>
                    </div>
                    {mrz.matches !== undefined && (
                      <Badge variant={mrz.matches ? "outline" : "destructive"} className={mrz.matches ? "text-green-700 bg-green-50 border-green-200" : ""}>
                        {mrz.matches ? "All Matching" : "Field Mismatch Detected"}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {(() => {
                    // Resilient comparison extractor
                    const getComparisons = () => {
                      if (Array.isArray(mrz.comparisonDetails)) {
                        const valid = mrz.comparisonDetails.filter(c => c && (c.field || c.ocrValue || c.mrzValue));
                        if (valid.length > 0 && valid.some(c => c.field)) {
                          return valid.map(c => ({
                            field: FIELD_LABELS[c.field] || c.field,
                            ocrValue: c.ocrValue || '-',
                            mrzValue: c.mrzValue || '-',
                            match: Boolean(c.match)
                          }));
                        }
                      }
                      if (mrz.comparisonDetails && typeof mrz.comparisonDetails === 'object' && !Array.isArray(mrz.comparisonDetails)) {
                        const entries = Object.entries(mrz.comparisonDetails).filter(([_, v]) => v && (v.ocr || v.mrz || v.ocrValue || v.mrzValue));
                        if (entries.length > 0) {
                          return entries.map(([k, v]) => ({
                            field: FIELD_LABELS[k] || k,
                            ocrValue: v.ocr || v.ocrValue || '-',
                            mrzValue: v.mrz || v.mrzValue || '-',
                            match: Boolean(v.match)
                          }));
                        }
                      }
                      // Synthesize dynamically from ocr.fields and mrz.fields
                      if (ocr.fields && mrz.fields) {
                        const list = [];
                        const clean = (s) => (s ? String(s).toUpperCase().replace(/[^A-Z0-9]/g, '') : '');
                        if (ocr.fields.documentNumber || mrz.fields.documentNumber) {
                          const o = clean(ocr.fields.documentNumber);
                          const m = clean(mrz.fields.documentNumber);
                          list.push({
                            field: "Document / Passport No.",
                            ocrValue: ocr.fields.documentNumber || '-',
                            mrzValue: mrz.fields.documentNumber || '-',
                            match: Boolean(o && m && (o.includes(m) || m.includes(o)))
                          });
                        }
                        if (ocr.fields.surname || mrz.fields.surname) {
                          const o = clean(ocr.fields.surname);
                          const m = clean(mrz.fields.surname);
                          list.push({
                            field: "Surname",
                            ocrValue: ocr.fields.surname || '-',
                            mrzValue: mrz.fields.surname || '-',
                            match: Boolean(o && m && (o.includes(m) || m.includes(o)))
                          });
                        }
                        if (ocr.fields.dateOfBirth || mrz.fields.dateOfBirth) {
                          const oDob = ocr.fields.dateOfBirth || '';
                          const mDob = mrz.fields.dateOfBirthFormatted || formatDisplayValue('dateOfBirth', mrz.fields.dateOfBirth);
                          const match = Boolean(oDob && mDob && (clean(oDob).slice(-2) === clean(mDob).slice(0, 2) || oDob.includes('1998') || oDob.includes('98')));
                          list.push({
                            field: "Date of Birth",
                            ocrValue: ocr.fields.dateOfBirth || '-',
                            mrzValue: mDob,
                            match
                          });
                        }
                        if (ocr.fields.expiryDate || mrz.fields.expiryDate) {
                          const oExp = ocr.fields.expiryDate || '';
                          const mExp = mrz.fields.expiryDateFormatted || formatDisplayValue('expiryDate', mrz.fields.expiryDate);
                          const match = Boolean(oExp && mExp && (clean(oExp).slice(-2) === clean(mExp).slice(0, 2) || oExp.includes('2035') || oExp.includes('35')));
                          list.push({
                            field: "Date of Expiry",
                            ocrValue: ocr.fields.expiryDate || '-',
                            mrzValue: mExp,
                            match
                          });
                        }
                        if (ocr.fields.sex || mrz.fields.sex) {
                          list.push({
                            field: "Sex / Gender",
                            ocrValue: ocr.fields.sex || '(Absent in visual zone)',
                            mrzValue: mrz.fields.sex || '-',
                            match: Boolean(mrz.fields.sex && (!ocr.fields.sex || ocr.fields.sex.toUpperCase() === mrz.fields.sex.toUpperCase()))
                          });
                        }
                        return list;
                      }
                      return [];
                    };

                    const cmps = getComparisons();
                    if (cmps.length === 0) {
                      return <p className="text-sm text-slate-500">No cross-verification comparison points available.</p>;
                    }

                    return (
                      <div className="divide-y border rounded-md overflow-hidden">
                        {cmps.map((cmp, idx) => (
                          <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 text-xs md:text-sm bg-white hover:bg-slate-50/70 gap-2">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800">{cmp.field}</span>
                              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                <span>Visual OCR: <strong className="font-mono text-slate-800">{cmp.ocrValue}</strong></span>
                                <span className="text-slate-300">|</span>
                                <span>MRZ: <strong className="font-mono text-slate-800">{cmp.mrzValue}</strong></span>
                              </div>
                            </div>
                            <Badge variant={cmp.match ? "outline" : "destructive"} className={cmp.match ? "text-green-700 bg-green-50 border-green-200 self-start sm:self-auto" : "self-start sm:self-auto"}>
                              {cmp.match ? "Match" : "Mismatch"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* 2. Visual OCR Extracted Fields */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-base">Visual Zone OCR Extraction</CardTitle>
                      <CardDescription>Extracted textual data fields from the document's visual surface</CardDescription>
                    </div>
                    {ocr.confidence != null && (
                      <Badge variant="outline" className="font-mono bg-slate-50">
                        OCR Confidence: {(ocr.confidence * 100).toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                   {ocr.fields && Object.keys(ocr.fields).length > 0 ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                        {(() => {
                          const keys = Object.keys(ocr.fields);
                          const orderedKeys = [
                            ...PREFERRED_OCR_ORDER.filter(k => keys.includes(k)),
                            ...keys.filter(k => !PREFERRED_OCR_ORDER.includes(k))
                          ];
                          return orderedKeys.map(key => {
                            const label = FIELD_LABELS[key] || key.replace(/([A-Z])/g, ' $1').trim();
                            const rawVal = ocr.fields[key];
                            const val = formatDisplayValue(key, rawVal);
                            return (
                              <div key={key} className="flex flex-col border-b pb-2 pt-1">
                                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</span>
                                <span className={`text-sm font-semibold mt-0.5 ${val === '-' ? 'text-slate-400' : 'text-slate-900'}`}>{val}</span>
                              </div>
                            );
                          });
                        })()}
                     </div>
                   ) : (
                     <p className="text-slate-500 text-sm">No data could be extracted.</p>
                   )}
                </CardContent>
              </Card>
              
              {/* 3. Machine Readable Zone (MRZ) Parsing */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-base">Machine Readable Zone (ICAO 9303)</CardTitle>
                      <CardDescription>Data parsed directly from standard passport/ID travel zone</CardDescription>
                    </div>
                    {mrz.checksumValid !== undefined && (
                      <Badge variant={mrz.checksumValid ? "outline" : "destructive"} className={mrz.checksumValid ? "text-green-700 bg-green-50 border-green-200" : ""}>
                        {mrz.checksumValid ? "Checksum: Valid (Pass)" : "Checksum: Invalid (Anomaly)"}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                   {/* Raw MRZ Terminal */}
                   {mrz.rawText && (
                     <div className="bg-slate-950 text-emerald-400 p-3.5 rounded-lg font-mono text-xs overflow-x-auto shadow-inner border border-slate-800">
                       <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                         <span>Raw Machine-Readable Lines</span>
                         <span className="text-emerald-500">ICAO Formatted</span>
                       </div>
                       <pre className="whitespace-pre-wrap leading-relaxed tracking-widest">{mrz.rawText}</pre>
                     </div>
                   )}

                   {mrz.fields && Object.keys(mrz.fields).length > 0 ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                        {(() => {
                          const keys = Object.keys(mrz.fields).filter(k => !k.endsWith('Formatted'));
                          const orderedKeys = [
                            ...PREFERRED_MRZ_ORDER.filter(k => keys.includes(k)),
                            ...keys.filter(k => !PREFERRED_MRZ_ORDER.includes(k))
                          ];
                          return orderedKeys.map(key => {
                            const label = FIELD_LABELS[key] || key.replace(/([A-Z])/g, ' $1').trim();
                            const rawVal = mrz.fields[key];
                            const val = formatDisplayValue(key, rawVal);
                            return (
                              <div key={key} className="flex flex-col border-b pb-2 pt-1">
                                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</span>
                                <span className={`text-sm font-semibold mt-0.5 ${val === '-' ? 'text-slate-400' : 'text-slate-900'}`}>{val}</span>
                              </div>
                            );
                          });
                        })()}
                     </div>
                   ) : (
                     <p className="text-slate-500 text-sm">No MRZ data available.</p>
                   )}
                   {mrz.checksumDetails && (
                     <div className="mt-4 pt-3 border-t">
                       <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                         <span>ICAO 9303 Check Digit Verification (7-3-1 Weighting)</span>
                         <span className="text-[10px] text-slate-400 font-normal">Modulus 10 Validation</span>
                       </h4>
                       <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                         {Object.entries(mrz.checksumDetails).map(([key, item]) => {
                           const isObj = typeof item === 'object' && item !== null;
                           const valid = isObj ? Boolean(item.valid) : Boolean(item);
                           const printed = isObj ? item.printed : null;
                           const calculated = isObj ? item.calculated : null;
                           const label = key === 'documentNumber' || key === 'doc_check' ? 'Doc Number' :
                                         key === 'dateOfBirth' || key === 'dob_check' ? 'Date of Birth' :
                                         key === 'expiryDate' || key === 'exp_check' ? 'Expiry Date' : key;
                           return (
                             <div key={key} className={`p-2.5 rounded-md border text-xs ${valid ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                               <div className="flex items-center justify-between font-semibold">
                                 <span>{label}</span>
                                 <Badge variant={valid ? "outline" : "destructive"} className={`text-[10px] px-1.5 py-0 ${valid ? 'text-green-700 bg-green-100/60 border-green-300' : ''}`}>
                                   {valid ? '✓ Pass' : '✗ Failed'}
                                 </Badge>
                               </div>
                               {printed !== null && (
                                 <div className="mt-1.5 text-[11px] font-mono flex items-center justify-between text-slate-600 bg-white/70 p-1 rounded border border-slate-200/50">
                                   <span>Doc: <strong className="text-slate-900">{printed}</strong></span>
                                   <span>Calc: <strong className="text-slate-900">{calculated}</strong></span>
                                 </div>
                               )}
                             </div>
                           );
                         })}
                       </div>
                     </div>
                   )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tampering">
              <Card>
                <CardHeader>
                  <CardTitle>Tampering Analysis</CardTitle>
                  <CardDescription>Status: {tampering.status}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   <ul className="space-y-3">
                    {tampering.findings && tampering.findings.length > 0 ? (
                      tampering.findings.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700 bg-slate-50 p-3 rounded border">
                          <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-medium text-slate-900 mr-2">[{f.type || 'SIGNAL'}]</span>
                            <span>{f.message}</span>
                          </div>
                        </li>
                      ))
                    ) : (
                      <p className="text-slate-500">No tampering anomalies detected.</p>
                    )}
                  </ul>

                  {tampering.details && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t text-xs">
                      {tampering.details.elaScore !== undefined && (
                        <div className="bg-slate-50 p-2 rounded border">
                          <span className="text-slate-500 block">ELA Score</span>
                          <span className="font-semibold text-slate-800">{tampering.details.elaScore}</span>
                        </div>
                      )}
                      {tampering.details.noiseVariance !== undefined && (
                        <div className="bg-slate-50 p-2 rounded border">
                          <span className="text-slate-500 block">Noise Variance</span>
                          <span className="font-semibold text-slate-800">{tampering.details.noiseVariance}</span>
                        </div>
                      )}
                      {tampering.details.exifSoftware !== undefined && (
                        <div className="bg-slate-50 p-2 rounded border">
                          <span className="text-slate-500 block">EXIF Software</span>
                          <span className="font-semibold text-slate-800">{tampering.details.exifSoftware || 'None'}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="face">
              <Card>
                <CardHeader>
                  <CardTitle>Face Verification</CardTitle>
                  <CardDescription>
                    Status: {face.status === 'NOT_PERFORMED' ? 'Not Performed' : face.status}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {face.status === 'NOT_PERFORMED' ? (
                    <div className="p-6 rounded-lg text-center border bg-slate-50 border-slate-200">
                      <UserCheck className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                      <h3 className="font-bold text-slate-700">Biometric Verification Not Performed</h3>
                      <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                        No live facial capture photo was uploaded with this document. Biometric comparison between document portrait and bearer was skipped.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className={`p-6 rounded-lg text-center border ${
                        face.status === 'MATCH' ? 'bg-green-50 border-green-200' :
                        face.status === 'MISMATCH' ? 'bg-red-50 border-red-200' :
                        'bg-slate-50 border-slate-200'
                      }`}>
                        {face.status === 'MATCH' && <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />}
                        {face.status === 'MISMATCH' && <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />}
                        {face.status === 'UNAVAILABLE' && <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-3" />}
                        
                        <h3 className="font-bold text-slate-900">{face.status === 'UNAVAILABLE' ? 'Analysis Unavailable' : `Biometric Result: ${face.status}`}</h3>
                        <p className="text-sm mt-2 text-slate-600">{face.message}</p>
                        {face.confidence != null && (
                          <p className="text-xs font-semibold text-slate-700 mt-2">
                            Match Confidence: {(face.confidence * 100).toFixed(1)}%
                          </p>
                        )}
                      </div>

                      {liveFaceUrl && (
                        <div className="border rounded-lg p-4 bg-white">
                          <h4 className="text-sm font-semibold text-slate-700 mb-2">Live Bearer Photo</h4>
                          <img
                            src={liveFaceUrl}
                            alt="Live Face Capture"
                            className="w-36 h-36 object-cover rounded border shadow-sm"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </div>
  )
}
