from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from PIL import Image
import io
import os
import uuid
from typing import Optional

from app.schemas import ScreeningResponse
from app.services.image_quality_service import analyze_image_quality
from app.services.document_analysis_service import analyze_document_structure
from app.services.ocr_service import extract_ocr
from app.services.mrz_service import extract_mrz
from app.services.tampering_service import analyze_tampering
from app.services.face_service import verify_face
from app.services.validation_service import validate_document

app = FastAPI(
    title="DocuScreen AI Service",
    description="AI Service for document analysis, OCR, MRZ parsing, and face verification.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
@app.get("/api/v1/health")
async def health_check():
    return {"status": "ok", "service": "ai-service"}

@app.post("/api/v1/screen", response_model=ScreeningResponse)
async def screen_document(
    document: UploadFile = File(...),
    liveFace: Optional[UploadFile] = File(None),
    documentType: str = Form("UNKNOWN")
):
    unique_id = str(uuid.uuid4())
    temp_doc_path = f"temp_processing_img_{unique_id}.jpg"
    temp_face_path = f"temp_live_face_{unique_id}.jpg"
    try:
        # Read document image
        contents = await document.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        image.save(temp_doc_path)
        
        # Read live face image if provided
        has_live_face = False
        if liveFace and liveFace.filename:
            face_contents = await liveFace.read()
            if len(face_contents) > 0:
                face_image = Image.open(io.BytesIO(face_contents)).convert("RGB")
                face_image.save(temp_face_path)
                has_live_face = True
        
        # 1. Quality & Structure
        quality_result = analyze_image_quality(image)
        structure_result = analyze_document_structure(image)
        
        # 2. Information Extraction
        ocr_result = extract_ocr(image)
        mrz_result = extract_mrz(image, ocr_result.get("fields"))
        
        # Cross-fill OCR missing fields from MRZ if visual zone was unprinted
        if ocr_result.get("fields") and mrz_result.get("fields"):
            if not ocr_result["fields"].get("sex") and mrz_result["fields"].get("sex"):
                ocr_result["fields"]["sex"] = mrz_result["fields"]["sex"]

        # 3. Validation
        validation_result = validate_document(ocr_result.get("fields"), mrz_result)
        
        # 4. Tampering & Face
        tampering_result = analyze_tampering(temp_doc_path)
        face_result = verify_face(temp_doc_path, temp_face_path if has_live_face else None)
        
        return ScreeningResponse(
            success=True,
            imageQuality=quality_result,
            documentAnalysis=structure_result,
            ocr=ocr_result,
            mrz=mrz_result,
            validation=validation_result,
            tampering=tampering_result,
            faceVerification=face_result
        )
        
    except Exception as e:
        print(f"Screening Error: {e}")
        return ScreeningResponse(
            success=False,
            error=str(e)
        )
    finally:
        # Cleanup temps
        if os.path.exists(temp_doc_path):
             os.remove(temp_doc_path)
        if os.path.exists(temp_face_path):
             os.remove(temp_face_path)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
