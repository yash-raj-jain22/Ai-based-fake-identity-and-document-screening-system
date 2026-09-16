import cv2
import numpy as np
from PIL import Image

def analyze_image_quality(image: Image.Image):
    try:
        # Convert PIL to OpenCV format
        cv_img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
        
        # 1. Blur Detection using Variance of Laplacian
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        is_blurry = laplacian_var < 100
        
        # 2. Brightness Detection
        brightness = np.mean(gray)
        brightness_status = "OK"
        if brightness < 50:
            brightness_status = "TOO_DARK"
        elif brightness > 230:
            brightness_status = "TOO_BRIGHT"
            
        # 3. Resolution
        height, width = gray.shape
        resolution = f"{width}x{height}"
        is_low_res = width < 500 or height < 500
        
        score = 100
        if is_blurry: score -= 30
        if brightness_status != "OK": score -= 20
        if is_low_res: score -= 30
        
        status = "GOOD"
        if score < 50:
            status = "UNUSABLE"
        elif score < 70:
            status = "POOR"
        elif score < 90:
            status = "ACCEPTABLE"
            
        warnings = []
        if is_blurry:
            warnings.append("Image is blurry (Laplacian variance low)")
        if brightness_status == "TOO_DARK":
            warnings.append("Image is underexposed/too dark")
        elif brightness_status == "TOO_BRIGHT":
            warnings.append("Image is overexposed/glare detected")
        if is_low_res:
            warnings.append(f"Low resolution image ({resolution})")
            
        return {
            "status": status,
            "score": max(0, score),
            "resolution": resolution,
            "blurDetected": bool(is_blurry),
            "brightnessStatus": brightness_status,
            "warnings": warnings
        }
    except Exception as e:
        print(f"Quality Analysis Error: {e}")
        return {
            "status": "UNAVAILABLE",
            "score": 0,
            "resolution": "Unknown",
            "blurDetected": False,
            "brightnessStatus": "UNKNOWN",
            "warnings": [f"Could not analyze image quality: {str(e)}"]
        }
