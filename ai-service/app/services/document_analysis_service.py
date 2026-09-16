import cv2
import numpy as np
from PIL import Image
import os

def analyze_document_structure(image: Image.Image):
    try:
        cv_img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
        
        import face_recognition
        
        # We can use face_recognition since the cv2 haarcascade is missing in this env
        rgb_image = np.array(image)
        faces = face_recognition.face_locations(rgb_image)
        
        portrait_region = None
        if len(faces) > 0:
            # Take the first face
            top, right, bottom, left = faces[0]
            # Convert (top, right, bottom, left) to (x, y, w, h)
            portrait_region = {
                "x": int(left),
                "y": int(top),
                "width": int(right - left),
                "height": int(bottom - top)
            }
            
        detected_type = "Passport-style Synthetic Document" if portrait_region else "Unknown Document"
        
        return {
            "detectedType": detected_type,
            "confidence": 0.85 if portrait_region else 0.4,
            "requiredRegions": ["portrait", "mrz", "identity_info"],
            "missingRegions": [] if portrait_region else ["portrait"],
            "portraitRegion": portrait_region,
            "warnings": []
        }
    except Exception as e:
        print(f"Structure Analysis Error: {e}")
        return {
            "detectedType": "Unknown",
            "confidence": 0.0,
            "requiredRegions": [],
            "missingRegions": [],
            "portraitRegion": None,
            "warnings": ["Failed to analyze document structure"]
        }
