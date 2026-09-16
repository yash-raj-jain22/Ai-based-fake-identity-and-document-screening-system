from PIL import Image, ImageChops, ImageEnhance
import numpy as np
import cv2
import os
import uuid

def analyze_tampering(image_path: str):
    temp_filename = f"temp_ela_{uuid.uuid4().hex}.jpg"
    try:
        img = Image.open(image_path).convert("RGB")
        w, h = img.size
        
        # 1. Error Level Analysis (ELA)
        # JPEG recompression at 90% highlights compression level mismatches from image splicing
        img.save(temp_filename, 'JPEG', quality=90)
        recompressed = Image.open(temp_filename)
        ela_img = ImageChops.difference(img, recompressed)
        ela_array = np.array(ela_img).astype(np.float32)

        global_std = float(np.std(ela_array))
        global_mean = float(np.mean(ela_array))

        # 2. Localized Patch / Block Variance Analysis (16x16 grid)
        gw, gh = 16, 16
        bw, bh = max(1, w // gw), max(1, h // gh)
        suspicious_blocks = []

        for i in range(gh):
            for j in range(gw):
                block = ela_array[i * bh:(i + 1) * bh, j * bw:(j + 1) * bw]
                if block.size > 0:
                    b_std = float(np.std(block))
                    # Flag block if standard deviation is significantly higher than global mean
                    if b_std > 35.0 and b_std > (global_mean + 2.8 * global_std):
                        suspicious_blocks.append({
                            "x": int(j * bw),
                            "y": int(i * bh),
                            "width": int(bw),
                            "height": int(bh)
                        })

        # 3. High-Frequency Sensor Noise Discontinuity Analysis
        cv_img = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2GRAY)
        blurred = cv2.GaussianBlur(cv_img, (3, 3), 0)
        noise_residual = cv2.absdiff(cv_img, blurred)
        noise_std = float(np.std(noise_residual))

        # 4. Metadata / Software Tag Check
        exif_info = img.getexif()
        software_used = exif_info.get(305, "") if exif_info else ""  # Tag 305 = Software
        suspicious_software = any(tool in str(software_used).lower() for tool in ["photoshop", "gimp", "canva", "paint.net"])

        findings = []
        anomaly_score = 0.0

        if global_std > 45.0:
            anomaly_score += 40.0
            findings.append({
                "type": "GLOBAL_COMPRESSION_ANOMALY",
                "message": f"Elevated global compression variance (ELA std: {global_std:.2f}). Possible digital recompression."
            })

        if len(suspicious_blocks) > 0:
            anomaly_score += min(50.0, len(suspicious_blocks) * 15.0)
            findings.append({
                "type": "LOCALIZED_SPLICING_ANOMALY",
                "message": f"Detected {len(suspicious_blocks)} localized region(s) with compression discrepancies inconsistent with background.",
                "region": suspicious_blocks[0]
            })

        if suspicious_software:
            anomaly_score += 25.0
            findings.append({
                "type": "METADATA_EDITING_TRACE",
                "message": f"EXIF metadata indicates image editing software: {software_used}."
            })

        if noise_std > 25.0:
            anomaly_score += 15.0
            findings.append({
                "type": "HIGH_FREQUENCY_NOISE_ANOMALY",
                "message": f"Elevated high-frequency noise variance ({noise_std:.2f})."
            })

        # Determine forensic status
        if anomaly_score >= 50.0:
            status = "POSSIBLE_ANOMALY"
            confidence = round(min(95.0, 60.0 + anomaly_score * 0.35), 1)
        elif anomaly_score >= 25.0:
            status = "REVIEW_REQUIRED"
            confidence = 70.0
        else:
            status = "NO_OBVIOUS_ANOMALY"
            confidence = 88.0

        return {
            "status": status,
            "confidence": confidence,
            "findings": findings
        }

    except Exception as e:
        print(f"Tampering Analysis Error: {e}")
        return {
            "status": "FAILED",
            "confidence": 0.0,
            "findings": [{"type": "SYSTEM_ERROR", "message": f"Tampering analysis error: {str(e)}"}]
        }
    finally:
        if os.path.exists(temp_filename):
            try:
                os.remove(temp_filename)
            except Exception:
                pass
