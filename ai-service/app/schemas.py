from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ImageQualityResult(BaseModel):
    status: str
    score: int
    resolution: Optional[str] = "Unknown"
    blurDetected: Optional[bool] = False
    brightnessStatus: Optional[str] = "UNKNOWN"
    warnings: List[str] = []

class DocumentAnalysisResult(BaseModel):
    detectedType: str
    confidence: float
    requiredRegions: List[str] = []
    missingRegions: List[str] = []
    portraitRegion: Optional[Dict[str, int]] = None
    warnings: List[str] = []

class OCRResult(BaseModel):
    status: str
    confidence: Optional[float] = None
    fields: Optional[Dict[str, Any]] = None

class MRZResult(BaseModel):
    status: str
    matches: Optional[bool] = None
    rawText: Optional[str] = None
    fields: Optional[Dict[str, Any]] = None
    checksumValid: Optional[bool] = None
    checksumDetails: Optional[Dict[str, Any]] = None
    comparisonDetails: Optional[Any] = None

class ValidationFinding(BaseModel):
    category: str
    rule: str
    status: str
    message: str
    severity: str

class ValidationResult(BaseModel):
    status: str
    findings: List[ValidationFinding] = []

class TamperingFinding(BaseModel):
    type: str
    message: str
    score: Optional[float] = None
    region: Optional[Dict[str, int]] = None

class TamperingResult(BaseModel):
    status: str
    confidence: Optional[float] = None
    findings: List[TamperingFinding] = []

class FaceResult(BaseModel):
    status: str
    confidence: Optional[float] = None
    message: Optional[str] = None

class ScreeningResponse(BaseModel):
    success: bool
    imageQuality: Optional[ImageQualityResult] = None
    documentAnalysis: Optional[DocumentAnalysisResult] = None
    ocr: Optional[OCRResult] = None
    mrz: Optional[MRZResult] = None
    validation: Optional[ValidationResult] = None
    tampering: Optional[TamperingResult] = None
    faceVerification: Optional[FaceResult] = None
    error: Optional[str] = None
