import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { DocumentUpload } from "./components/DocumentUpload"
import { ScreeningResult } from "./ScreeningResult"
import { screeningApi } from "@/services/api/screeningApi"
import { AlertCircle, Cpu } from "lucide-react"

export function NewScreening() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: Upload, 2: Processing, 3: Fallback Results
  const [resultData, setResultData] = useState(null)
  const [error, setError] = useState(null)

  const handleUploadComplete = async (fileData, docType) => {
    try {
      setStep(2)
      setError(null)
      
      const formData = new FormData()
      formData.append('document', fileData.file)
      formData.append('documentType', docType)
      
      if (fileData.liveFace) {
        formData.append('liveFace', fileData.liveFace)
      }
      
      const response = await screeningApi.createScreening(formData)
      const screening = response.data
      
      // Navigate directly to persistent screening URL so browser refresh and bookmarking work seamlessly
      if (screening && screening.screeningId) {
        navigate(`/screenings/${screening.screeningId}`)
      } else {
        setResultData(screening)
        setStep(3)
      }
    } catch (err) {
      console.error('Upload or processing failure:', err)
      setError(err.message || 'Failed to process document through screening pipeline.')
      setStep(1) // Return to upload step to allow retry
    }
  }

  return (
    <div className="h-full flex flex-col">
      {error && (
        <div className="m-4 p-4 bg-red-50 text-red-700 rounded-md border border-red-200 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold text-sm">Screening Error</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {step === 1 && (
        <DocumentUpload onUploadComplete={handleUploadComplete} />
      )}
      
      {step === 2 && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 max-w-xl mx-auto w-full p-6 text-center">
          <div className="rounded-full bg-blue-100 p-4 animate-pulse">
            <Cpu className="h-10 w-10 text-blue-600 animate-spin" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Screening in Progress</h2>
            <p className="text-slate-500 text-sm max-w-md">
              The AI engine is currently processing your uploaded document through forensic analysis, optical character recognition, MRZ verification, and biometric matching.
            </p>
          </div>
          
          <div className="w-full max-w-md bg-white border rounded-lg p-4 shadow-sm text-left space-y-3">
            <div className="flex items-center gap-3 text-sm text-slate-700">
              <div className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
              <span>Image Quality & Structure Analysis</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-700">
              <div className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
              <span>OCR & Field Spatial Extraction</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-700">
              <div className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
              <span>MRZ Parsing & 7-3-1 Checksum Validation</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-700">
              <div className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
              <span>Compression (ELA) & Tamper Forensics</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-700">
              <div className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
              <span>Facial Biometric Verification & Risk Scoring</span>
            </div>
          </div>
        </div>
      )}

      {step === 3 && resultData && (
        <div className="w-full">
          <ScreeningResult resultData={resultData} />
        </div>
      )}
    </div>
  )
}
