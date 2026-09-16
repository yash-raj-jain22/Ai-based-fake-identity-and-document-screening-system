import re
import pytesseract
import os
from PIL import Image

# Explicitly set Tesseract path for Windows if it exists
tesseract_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if os.path.exists(tesseract_path):
    pytesseract.pytesseract.tesseract_cmd = tesseract_path

MONTH_MAP = {
    'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
    'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12
}
MONTH_NAMES = {v: k for k, v in MONTH_MAP.items()}

def clean_ocr_text(val):
    if not val:
        return None
    # Strip enclosing parentheses, brackets, underscores, and extra template symbols
    v = re.sub(r'^[(\[{\s_:=,><]+|[)\]}\s_:=,><]+$', '', str(val)).strip()
    v = re.sub(r'[_~*=]', '', v).strip()
    v = re.sub(r'\s+', ' ', v)
    return v if len(v) > 0 else None

def normalize_date_val(raw_val):
    if not raw_val:
        return None
    cleaned = clean_ocr_text(raw_val)
    if not cleaned:
        return None
    
    # 1. Match standard DD MMM YYYY (e.g. 14 AUG 1998, 12 MAR 2025)
    m = re.search(r'(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})', cleaned)
    if m:
        day = int(m.group(1))
        mon_str = m.group(2).upper()
        yr = m.group(3)
        if mon_str in MONTH_MAP:
            return f"{day:02d} {mon_str} {yr}"

    # 2. Check for DD/MM/YYYY or DD-MM-YYYY
    m2 = re.search(r'(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})', cleaned)
    if m2:
        day, mo, yr = int(m2.group(1)), int(m2.group(2)), m2.group(3)
        if 1 <= mo <= 12:
            return f"{day:02d} {MONTH_NAMES[mo]} {yr}"

    # 3. Check for YYYY-MM-DD
    m3 = re.search(r'(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})', cleaned)
    if m3:
        yr, mo, day = m3.group(1), int(m3.group(2)), int(m3.group(3))
        if 1 <= mo <= 12:
            return f"{day:02d} {MONTH_NAMES[mo]} {yr}"

    return cleaned

def extract_ocr(image: Image.Image):
    try:
        # 1. Run image_to_data for spatial position, word confidence, and bounding boxes
        data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
        raw_text = pytesseract.image_to_string(image)

        words = []
        confs = []
        for i in range(len(data['text'])):
            w = data['text'][i].strip()
            c = float(data['conf'][i])
            if w:
                words.append({
                    'text': w,
                    'left': data['left'][i],
                    'top': data['top'][i],
                    'w': data['width'][i],
                    'h': data['height'][i],
                    'conf': c
                })
                if c >= 0:
                    confs.append(c)

        # Calculate genuine average OCR confidence from detected words
        avg_confidence = round(sum(confs) / len(confs), 1) if confs else 0.0

        fields = {
            "documentNumber": None,
            "surname": None,
            "givenNames": None,
            "name": None,
            "dateOfBirth": None,
            "issueDate": None,
            "expiryDate": None,
            "sex": None,
            "nationality": None,
            "placeOfBirth": None,
            "issuingAuthority": None
        }

        # 2. Spatial Layout Extraction (associating labels with horizontal value words)
        labels_config = {
            'surname': ['surname'],
            'givenNames': ['given names', 'given name'],
            'nationality': ['nationality'],
            'dateOfBirth': ['date of birth', 'dob', 'birth date'],
            'sex': ['sex', 'gender'],
            'documentNumber': ['document number', 'doc no', 'passport no', 'documentnumber'],
            'issueDate': ['issue date', 'date of issue'],
            'expiryDate': ['expiry date', 'date of expiry', 'valid until', 'expiry'],
            'placeOfBirth': ['place of birth'],
            'issuingAuthority': ['issuing authority', 'authority']
        }

        ignore_value_words = {'(dd', 'mmm', 'yyyy)', 'signature'}

        for field_name, patterns in labels_config.items():
            for pat in patterns:
                pat_parts = pat.split()
                for idx, w in enumerate(words):
                    if w['text'].lower() == pat_parts[0]:
                        matched = True
                        matched_words = [w]
                        for offset in range(1, len(pat_parts)):
                            if idx + offset < len(words) and words[idx + offset]['text'].lower() == pat_parts[offset]:
                                matched_words.append(words[idx + offset])
                            else:
                                matched = False
                                break
                        if matched:
                            lbl_top = min(mw['top'] for mw in matched_words)
                            lbl_right = max(mw['left'] + mw['w'] for mw in matched_words)
                            lbl_h = max(mw['h'] for mw in matched_words)

                            # Find words located horizontally to the right of the label within vertical tolerance
                            val_words = [
                                vw for vw in words
                                if vw['left'] > lbl_right - 5
                                and abs(vw['top'] - lbl_top) < max(lbl_h * 1.6, 35)
                                and vw['text'].lower() not in ignore_value_words
                            ]
                            val_words.sort(key=lambda x: x['left'])
                            if val_words:
                                val_text = ' '.join(vw['text'] for vw in val_words)
                                cleaned = clean_ocr_text(val_text)
                                if cleaned and len(cleaned) > 0:
                                    fields[field_name] = cleaned
                                    break
                if fields[field_name]:
                    break

        # 3. Line-based regex extraction fallback for non-column or single-column documents
        lines = [l.strip() for l in raw_text.split('\n') if l.strip()]
        for l in lines:
            if not fields['documentNumber']:
                m = re.search(r'(?:document\s*number|documentnumber|doc\s*no)[^\S\r\n]*[:\-=]?[^\S\r\n]*([A-Z0-9\-]+)', l, re.I)
                if m and len(m.group(1)) >= 5:
                    fields['documentNumber'] = clean_ocr_text(m.group(1))
            if not fields['dateOfBirth']:
                m = re.search(r'(?:date\s*of\s*birth|dob|\bob\b)[^\S\r\n]*[:\-=]?[^\S\r\n]*([0-9A-Za-z\/\-\.\s]{6,20})', l, re.I)
                if m:
                    fields['dateOfBirth'] = clean_ocr_text(m.group(1))
            if not fields['issueDate']:
                m = re.search(r'(?:issue\s*date)[^\S\r\n]*[:\-=]?[^\S\r\n]*([0-9A-Za-z\/\-\.\s]{6,20})', l, re.I)
                if m:
                    fields['issueDate'] = clean_ocr_text(m.group(1))
            if not fields['expiryDate']:
                m = re.search(r'(?:expiry\s*date|expiry)[^\S\r\n]*[:\-=]?[^\S\r\n]*([0-9A-Za-z\/\-\.\s]{6,20})', l, re.I)
                if m:
                    fields['expiryDate'] = clean_ocr_text(m.group(1))
            if not fields['sex']:
                m = re.search(r'\b(?:sex|gender)[^\S\r\n]*[:\-=]?[^\S\r\n]*\b([MF])\b', l, re.I)
                if m:
                    fields['sex'] = m.group(1).upper()
            if not fields['nationality']:
                m = re.search(r'(?:nationality)[^\S\r\n]*[:\-=]?[^\S\r\n]*([A-Za-z\s]+)', l, re.I)
                if m:
                    fields['nationality'] = clean_ocr_text(m.group(1))

        # 4. Standalone document number search if still missing
        if not fields['documentNumber']:
            doc_id_match = re.search(r'\b([A-Z0-9]{3,}-[A-Z0-9]{5,})\b', raw_text)
            if doc_id_match:
                fields['documentNumber'] = clean_ocr_text(doc_id_match.group(1))

        # 5. Full name composition from genuine extracted parts
        if fields['givenNames'] and fields['surname']:
            fields['name'] = f"{fields['givenNames']} {fields['surname']}".strip()
        elif fields['givenNames']:
            fields['name'] = fields['givenNames'].strip()
        elif fields['surname']:
            fields['name'] = fields['surname'].strip()

        # 6. Normalize date formats
        if fields['dateOfBirth']:
            fields['dateOfBirth'] = normalize_date_val(fields['dateOfBirth'])
        if fields['issueDate']:
            fields['issueDate'] = normalize_date_val(fields['issueDate'])
        if fields['expiryDate']:
            fields['expiryDate'] = normalize_date_val(fields['expiryDate'])

        # Determine overall completion status
        has_any_data = any(v is not None for v in fields.values())
        status = "COMPLETED" if has_any_data else "FAILED"

        return {
            "status": status,
            "confidence": avg_confidence,
            "fields": fields
        }

    except Exception as e:
        error_msg = str(e)
        print(f"OCR Error: {error_msg}")
        status = "UNAVAILABLE" if "tesseract is not installed" in error_msg.lower() else "FAILED"
        return {
            "status": status,
            "confidence": 0.0,
            "fields": None
        }
