import numpy as np

def verify_face(document_image_path: str, live_image_path: str = None):
    try:
        import face_recognition
        
        # Load the document image
        doc_image = face_recognition.load_image_file(document_image_path)
        doc_face_locations = face_recognition.face_locations(doc_image)
        
        if not doc_face_locations:
            return {
                "status": "UNAVAILABLE",
                "confidence": 0.0,
                "message": "No face detected in the provided document image."
            }
            
        # Get the face encoding for the document face
        doc_face_encodings = face_recognition.face_encodings(doc_image, doc_face_locations)
        if not doc_face_encodings:
             return {
                "status": "UNAVAILABLE",
                "confidence": 0.0,
                "message": "Could not extract face features from the document image."
            }
            
        doc_encoding = doc_face_encodings[0]
        
        # If no live image is provided, comparison was not performed
        if not live_image_path:
            return {
                "status": "NOT_PERFORMED",
                "confidence": None,
                "message": "Document portrait detected. No live comparison photo was provided."
            }
            
        # Load the live image
        live_image = face_recognition.load_image_file(live_image_path)
        live_face_locations = face_recognition.face_locations(live_image)
        
        if not live_face_locations:
             return {
                "status": "UNAVAILABLE",
                "confidence": None,
                "message": "No face detected in the live comparison photo."
            }
            
        live_encoding = face_recognition.face_encodings(live_image, live_face_locations)[0]
        
        # Compare
        results = face_recognition.compare_faces([doc_encoding], live_encoding, tolerance=0.6)
        face_distances = face_recognition.face_distance([doc_encoding], live_encoding)
        
        match = bool(results[0])
        distance = float(face_distances[0])
        
        # Convert distance to a confidence percentage (tolerance 0.6: 0.0 distance = 100%, 0.6 distance = 60%)
        confidence = max(0.0, min(100.0, (1.0 - distance) * 100.0))
        
        return {
            "status": "MATCH" if match else "MISMATCH",
            "confidence": round(confidence, 1),
            "message": f"Biometric verification {'successful' if match else 'mismatch'} (Similarity: {confidence:.1f}%)."
        }
        
    except (ImportError, SystemExit) as e:
        print(f"Face Verification Library Error: {e}")
        return {
            "status": "UNAVAILABLE",
            "confidence": 0.0,
            "message": "Face verification library is not fully installed on this system."
        }
    except Exception as e:
        print(f"Face Verification Error: {e}")
        return {
            "status": "FAILED",
            "confidence": 0.0,
            "message": str(e)
        }
