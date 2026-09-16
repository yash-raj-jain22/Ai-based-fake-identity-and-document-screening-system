import { useState, useRef } from "react"
import { UploadCloud, FileType, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function DocumentUpload({ onUploadComplete }) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedLiveFace, setSelectedLiveFace] = useState(null)
  const [docType, setDocType] = useState("passport")
  const inputRef = useRef(null)
  const liveFaceRef = useRef(null)

  const handleLiveFaceChange = (e) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedLiveFace({
        file,
        name: file.name,
        preview: URL.createObjectURL(file),
      })
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file) => {
    if (file.type.match("image.*")) {
      // Create object URL for preview
      const previewUrl = URL.createObjectURL(file)
      setSelectedFile({
        file,
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        preview: previewUrl,
        type: file.type
      })
    } else {
      alert("Invalid file type. Please upload a valid image (JPEG, PNG).")
    }
  }

  const handleStartAnalysis = () => {
    if (selectedFile) {
      onUploadComplete({ file: selectedFile.file, liveFace: selectedLiveFace?.file }, docType)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Upload Document</h2>
        <p className="text-slate-500">Upload an identity or travel document for automated screening.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Card 
            className={cn(
              "border-2 border-dashed transition-colors duration-200 ease-in-out",
              dragActive ? "border-blue-500 bg-blue-50/50" : "border-slate-300 hover:border-slate-400",
              selectedFile && "border-solid border-slate-200"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <CardContent className="flex flex-col items-center justify-center p-12 text-center min-h-[350px]">
              {!selectedFile ? (
                <>
                  <div className="rounded-full bg-slate-100 p-4 mb-4">
                    <UploadCloud className="h-8 w-8 text-slate-500" />
                  </div>
                  <h3 className="mb-2 font-semibold text-lg text-slate-900">Drag and drop Identity Document here</h3>
                  <p className="mb-6 text-sm text-slate-500 max-w-sm">
                    Support for high-resolution images (JPEG, PNG) and PDF documents up to 20MB.
                  </p>
                  <input
                    ref={inputRef}
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png"
                    onChange={handleChange}
                  />
                  <Button onClick={() => inputRef.current?.click()} variant="outline">
                    Browse Files
                  </Button>
                </>
              ) : (
                <div className="w-full flex flex-col h-full">
                  <div className="flex-1 flex items-center justify-center overflow-hidden mb-4 bg-slate-50 rounded-md border p-2">
                    {selectedFile.type.includes('image') ? (
                      <img src={selectedFile.preview} alt="Preview" className="max-h-[250px] object-contain rounded" />
                    ) : (
                      <div className="flex flex-col items-center">
                        <FileType className="h-16 w-16 text-slate-400 mb-2" />
                        <span className="font-medium text-slate-600">PDF Document</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between bg-slate-100 p-3 rounded-md">
                    <div className="flex flex-col items-start overflow-hidden">
                      <span className="text-sm font-medium truncate w-full text-left">{selectedFile.name}</span>
                      <span className="text-xs text-slate-500">{selectedFile.size}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}>
                      Remove
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Live Face Upload (Optional) */}
          <Card className="border-2 border-dashed border-slate-300">
             <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center text-center">
                    {!selectedLiveFace ? (
                        <>
                            <h3 className="mb-1 font-semibold text-md text-slate-900">Upload Live Face (Optional)</h3>
                            <p className="mb-4 text-xs text-slate-500 max-w-sm">
                                For face verification against the document portrait.
                            </p>
                            <input
                                ref={liveFaceRef}
                                type="file"
                                className="hidden"
                                accept="image/jpeg,image/png"
                                onChange={handleLiveFaceChange}
                            />
                            <Button onClick={() => liveFaceRef.current?.click()} variant="outline" size="sm">
                                Browse Image
                            </Button>
                        </>
                    ) : (
                        <div className="w-full flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <img src={selectedLiveFace.preview} alt="Live Face" className="h-10 w-10 object-cover rounded-full border" />
                                <div className="flex flex-col items-start text-sm">
                                    <span className="font-medium truncate max-w-[150px]">{selectedLiveFace.name}</span>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedLiveFace(null)}>
                                Remove
                            </Button>
                        </div>
                    )}
                </div>
             </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="docType">Document Type</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger id="docType">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="national_id">National ID Card</SelectItem>
                    <SelectItem value="driving_license">Driving License</SelectItem>
                    <SelectItem value="visa">Visa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-slate-50 rounded-md p-3 text-sm text-slate-600 space-y-2 border">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <p>Ensure the document is well-lit and all corners are visible.</p>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <p>Avoid glare over critical information like the MRZ or photo.</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700" 
                  size="lg"
                  disabled={!selectedFile}
                  onClick={handleStartAnalysis}
                >
                  Start Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
