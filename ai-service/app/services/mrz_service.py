import pytesseract
import os
import re
from PIL import Image
from mrz.checker.td3 import TD3CodeChecker
from mrz.checker.td1 import TD1CodeChecker
from mrz.checker.td2 import TD2CodeChecker

# Explicitly set Tesseract path for Windows if it exists
tesseract_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if os.path.exists(tesseract_path):
    pytesseract.pytesseract.tesseract_cmd = tesseract_path

MONTH_MAP = {
    'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
    'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12
}
MONTH_NAMES = {v: k for k, v in MONTH_MAP.items()}

def compute_check_digit(chars):
    weights = [7, 3, 1]
    total = 0
    for idx, ch in enumerate(chars):
        if '0' <= ch <= '9':
            val = ord(ch) - ord('0')
        elif 'A' <= ch <= 'Z':
            val = ord(ch) - ord('A') + 10
        else:
            val = 0
        total += val * weights[idx % 3]
    return str(total % 10)

def parse_mrz_algorithmic(lines):
    if len(lines) < 2:
        return {}, {}
    
    line1 = lines[-2].replace(' ', '').upper()
    line2 = lines[-1].replace(' ', '').upper()

    # Extract Surname and Given Names from line 1
    # Standard format: <TYPE<ISSUING_COUNTRY<SURNAME<<GIVEN<NAMES<<<<
    name_m = re.search(r'([A-Z0-9]+)<<([A-Z0-9<]+)', line1)
    surname = None
    given = None
    if name_m:
        surname_parts = name_m.group(1).split('<')
        surname = surname_parts[-1] if surname_parts else None
        given = ' '.join(p for p in name_m.group(2).split('<') if p and len(p) > 0)

    # Line 2 structure: Landmark match for DOB (6 digits) + check digit + Sex + Expiry (6 digits) + check digit
    m2 = re.search(r'([0-9]{6})([0-9])([MFX<])([0-9]{6})([0-9])', line2)
    fields = {}
    checksums = {}

    if m2:
        dob, dob_cd, sex, exp, exp_cd = m2.groups()
        prefix = line2[:m2.start()]

        # Document number from first 9 chars of Line 2 or prefix
        if len(prefix) >= 9:
            doc_num = prefix[:9].replace('<', '')
            doc_cd = prefix[9:10].replace('<', '0') if len(prefix) > 9 else '0'
            nat_raw = prefix[10:].replace('<', '') if len(prefix) > 10 else ''
        else:
            doc_num = prefix.split('<')[0]
            doc_cd = '0'
            nat_raw = ''

        nat = re.sub(r'[^A-Z]', '', nat_raw) if nat_raw else 'DEMO'
        if not nat and len(line1) >= 5:
            nat = line1[2:5].replace('<', '')

        calc_dob_cd = compute_check_digit(dob)
        calc_exp_cd = compute_check_digit(exp)
        calc_doc_cd = compute_check_digit(doc_num)

        # Handle OCR 0 vs O ambiguity
        clean_doc_cd = '0' if doc_cd.upper() == 'O' else doc_cd
        clean_dob_cd = '0' if dob_cd.upper() == 'O' else dob_cd
        clean_exp_cd = '0' if exp_cd.upper() == 'O' else exp_cd

        checksums = {
            'documentNumber': {
                'printed': doc_cd,
                'calculated': calc_doc_cd,
                'valid': (clean_doc_cd == calc_doc_cd)
            },
            'dateOfBirth': {
                'printed': dob_cd,
                'calculated': calc_dob_cd,
                'valid': (clean_dob_cd == calc_dob_cd)
            },
            'expiryDate': {
                'printed': exp_cd,
                'calculated': calc_exp_cd,
                'valid': (clean_exp_cd == calc_exp_cd)
            }
        }

        def format_mrz_date(d_str, is_expiry=False):
            if not d_str or len(d_str) != 6:
                return d_str
            try:
                yy, mm, dd = int(d_str[0:2]), int(d_str[2:4]), int(d_str[4:6])
                full_yr = (2000 + yy) if is_expiry else (1900 + yy if yy >= 30 else 2000 + yy)
                mon = MONTH_NAMES.get(mm, f"{mm:02d}")
                return f"{dd:02d} {mon} {full_yr}"
            except Exception:
                return d_str

        fields = {
            'documentType': 'PASSPORT' if 'P<' in line1 else 'TRAVEL_DOCUMENT',
            'documentNumber': doc_num,
            'surname': surname,
            'givenNames': given,
            'fullName': f"{given} {surname}".strip() if given and surname else None,
            'nationality': nat,
            'dateOfBirth': dob,
            'dateOfBirthFormatted': format_mrz_date(dob, False),
            'sex': sex if sex in ('M', 'F') else None,
            'expiryDate': exp,
            'expiryDateFormatted': format_mrz_date(exp, True)
        }

    return fields, checksums

def compare_mrz_with_ocr(mrz_fields, ocr_fields):
    if not mrz_fields or not ocr_fields:
        return True, {}

    comparisons = {}
    matches_all = True

    # 1. Document Number
    if mrz_fields.get('documentNumber') and ocr_fields.get('documentNumber'):
        m_doc = re.sub(r'[^A-Z0-9]', '', str(mrz_fields['documentNumber']).upper())
        o_doc = re.sub(r'[^A-Z0-9]', '', str(ocr_fields['documentNumber']).upper())
        match = (m_doc in o_doc) or (o_doc in m_doc)
        comparisons['documentNumber'] = {'mrz': mrz_fields['documentNumber'], 'ocr': ocr_fields['documentNumber'], 'match': match}
        if not match:
            matches_all = False

    # 2. Date of Birth
    if mrz_fields.get('dateOfBirth') and ocr_fields.get('dateOfBirth'):
        m_dob = str(mrz_fields['dateOfBirth'])
        if len(m_dob) == 6:
            m_yr = m_dob[0:2]
            m_mo = int(m_dob[2:4])
            m_da = int(m_dob[4:6])

            ocr_dob = str(ocr_fields['dateOfBirth'])
            m = re.search(r'(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})', ocr_dob)
            if m:
                o_da = int(m.group(1))
                o_mo = MONTH_MAP.get(m.group(2).upper(), 0)
                o_yr = m.group(3)[-2:]
                match = (m_da == o_da and m_mo == o_mo and m_yr == o_yr)
                comparisons['dateOfBirth'] = {'mrz': m_dob, 'ocr': ocr_dob, 'match': match}
                if not match:
                    matches_all = False

    # 3. Expiry Date
    if mrz_fields.get('expiryDate') and ocr_fields.get('expiryDate'):
        m_exp = str(mrz_fields['expiryDate'])
        if len(m_exp) == 6:
            m_yr = m_exp[0:2]
            m_mo = int(m_exp[2:4])
            m_da = int(m_exp[4:6])

            ocr_exp = str(ocr_fields['expiryDate'])
            m = re.search(r'(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})', ocr_exp)
            if m:
                o_da = int(m.group(1))
                o_mo = MONTH_MAP.get(m.group(2).upper(), 0)
                o_yr = m.group(3)[-2:]
                match = (m_da == o_da and m_mo == o_mo and m_yr == o_yr)
                comparisons['expiryDate'] = {'mrz': m_exp, 'ocr': ocr_exp, 'match': match}
                if not match:
                    matches_all = False

    # 6. Sex fallback match if MRZ has it and OCR was missing or matched
    if mrz_fields.get('sex') and not ocr_fields.get('sex'):
        comparisons['sex'] = {'mrz': mrz_fields['sex'], 'ocr': 'Not in visual zone', 'match': True}

    comparison_list = [
        {
            "field": k,
            "ocrValue": str(v.get("ocr", "")),
            "mrzValue": str(v.get("mrz", "")),
            "match": bool(v.get("match", False))
        }
        for k, v in comparisons.items()
    ]

    return matches_all, comparison_list

def extract_mrz(image: Image.Image, ocr_fields: dict = None):
    try:
        # 1. OCR scan specifically looking for MRZ lines
        text = pytesseract.image_to_string(image, config='--psm 6')

        # Find lines with typical MRZ syntax (contains '<' and length >= 15)
        raw_lines = [l.strip() for l in text.split('\n') if l.strip()]
        lines = [l for l in raw_lines if '<' in l and len(l) >= 15]

        if len(lines) < 2:
            # Fallback to standard PSM scan if PSM 6 didn't capture both lines
            text_def = pytesseract.image_to_string(image)
            raw_lines_def = [l.strip() for l in text_def.split('\n') if l.strip()]
            lines_def = [l for l in raw_lines_def if '<' in l and len(l) >= 15]
            if len(lines_def) >= 2:
                lines = lines_def
            else:
                # Merge unique lines with '<'
                seen = set()
                combined = []
                for l in (raw_lines + raw_lines_def):
                    if '<' in l and l not in seen:
                        seen.add(l)
                        combined.append(l)
                lines = combined

        if len(lines) < 2:
            return {
                "status": "UNAVAILABLE",
                "matches": None,
                "fields": None,
                "checksumValid": None,
                "checksumDetails": None,
                "comparisonDetails": None
            }

        # Try standard TD3/TD1 checker first
        fields = {}
        checksum_valid = True
        checksum_details = {}

        try:
            mrz_text = "\n".join(lines[-2:])
            checker = TD3CodeChecker(mrz_text)
            f = checker.fields()
            fields = {
                "documentType": f.document_type,
                "documentNumber": f.document_number,
                "surname": f.surname,
                "givenNames": f.names,
                "nationality": f.nationality,
                "dateOfBirth": f.birth_date,
                "sex": f.sex,
                "expiryDate": f.expiry_date
            }
            checksum_valid = checker.status == "SUCCESS"
        except Exception:
            try:
                mrz_text = "\n".join(lines[-3:])
                checker = TD1CodeChecker(mrz_text)
                f = checker.fields()
                fields = {
                    "documentType": f.document_type,
                    "documentNumber": f.document_number,
                    "surname": f.surname,
                    "givenNames": f.names,
                    "nationality": f.nationality,
                    "dateOfBirth": f.birth_date,
                    "sex": f.sex,
                    "expiryDate": f.expiry_date
                }
                checksum_valid = checker.status == "SUCCESS"
            except Exception:
                pass

        # If standard checker failed (e.g. synthetic code like <DEMO< or non-ISO formatting),
        # run algorithmic ICAO 9303 parser
        if not fields:
            fields, checksum_details = parse_mrz_algorithmic(lines)
            if checksum_details:
                checksum_valid = all(v['valid'] if isinstance(v, dict) else v for v in checksum_details.values())

        if not fields:
            return {
                "status": "UNAVAILABLE",
                "matches": None,
                "fields": None,
                "checksumValid": None,
                "checksumDetails": None,
                "comparisonDetails": None
            }

        # Cross-compare with visual OCR fields
        matches_all, comparison_details = compare_mrz_with_ocr(fields, ocr_fields)

        return {
            "status": "COMPLETED",
            "matches": matches_all,
            "rawText": "\n".join(lines),
            "fields": fields,
            "checksumValid": checksum_valid,
            "checksumDetails": checksum_details,
            "comparisonDetails": comparison_details
        }

    except Exception as e:
        error_msg = str(e)
        print(f"MRZ Error: {error_msg}")
        status = "UNAVAILABLE" if "tesseract is not installed" in error_msg.lower() else "FAILED"
        return {
            "status": status,
            "matches": None,
            "fields": None,
            "checksumValid": None,
            "checksumDetails": None,
            "comparisonDetails": None
        }
