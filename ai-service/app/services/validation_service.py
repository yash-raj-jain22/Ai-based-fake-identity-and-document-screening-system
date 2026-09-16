from datetime import datetime
import re

def parse_date(date_str):
    if not date_str:
        return None
    
    clean_str = str(date_str).strip()

    # Try MRZ format YYMMDD
    if len(clean_str) == 6 and clean_str.isdigit():
        year = int(clean_str[0:2])
        # standard heuristic for MRZ year
        if year > 50:
            year += 1900
        else:
            year += 2000
        month = int(clean_str[2:4])
        day = int(clean_str[4:6])
        try:
            return datetime(year, month, day)
        except ValueError:
            pass

    # Try DD MMM YYYY (e.g. 14 AUG 1998, 12 MAR 2025)
    try:
        return datetime.strptime(clean_str, "%d %b %Y")
    except ValueError:
        pass

    # Try DD/MM/YYYY or DD-MM-YYYY
    try:
        return datetime.strptime(clean_str.replace("-", "/").replace(".", "/"), "%d/%m/%Y")
    except ValueError:
        pass

    # Try YYYY-MM-DD
    try:
        return datetime.strptime(clean_str.replace("/", "-"), "%Y-%m-%d")
    except ValueError:
        pass

    return None

def validate_document(ocr_fields: dict, mrz_fields: dict = None):
    try:
        findings = []
        
        if not ocr_fields:
            return {
                "status": "REVIEW_REQUIRED",
                "findings": [{"category": "Data", "rule": "Data Extraction", "status": "FAIL", "message": "No data could be extracted.", "severity": "HIGH"}]
            }

        # 1. Required Fields Check
        required = ["documentNumber", "name", "dateOfBirth", "expiryDate"]
        for field in required:
            if not ocr_fields.get(field):
                findings.append({
                    "category": "Completeness",
                    "rule": "Required Fields",
                    "status": "WARNING",
                    "message": f"Missing required field: {field}",
                    "severity": "MEDIUM"
                })

        # 2. Dates Logic & Chronology
        dob = parse_date(ocr_fields.get("dateOfBirth"))
        issue = parse_date(ocr_fields.get("issueDate"))
        expiry = parse_date(ocr_fields.get("expiryDate"))
        now = datetime.now()

        # Date of Birth
        if dob:
            if dob > now:
                findings.append({
                    "category": "Validation",
                    "rule": "Date of Birth",
                    "status": "FAIL",
                    "message": "Date of Birth is in the future.",
                    "severity": "HIGH"
                })
            else:
                findings.append({
                    "category": "Validation",
                    "rule": "Date of Birth",
                    "status": "PASS",
                    "message": f"Valid Date of Birth: {dob.strftime('%d %b %Y')}.",
                    "severity": "LOW"
                })

        # Issue Date Chronology
        if issue and dob and issue < dob:
            findings.append({
                "category": "Validation",
                "rule": "Issue Date Chronology",
                "status": "FAIL",
                "message": f"Issue Date ({issue.strftime('%d %b %Y')}) cannot precede Date of Birth ({dob.strftime('%d %b %Y')}).",
                "severity": "HIGH"
            })

        if issue and expiry and issue >= expiry:
            findings.append({
                "category": "Validation",
                "rule": "Validity Period Chronology",
                "status": "FAIL",
                "message": f"Issue Date ({issue.strftime('%d %b %Y')}) must precede Expiry Date ({expiry.strftime('%d %b %Y')}).",
                "severity": "HIGH"
            })
        elif issue and expiry:
            findings.append({
                "category": "Validation",
                "rule": "Validity Period Chronology",
                "status": "PASS",
                "message": f"Valid document lifecycle: Issued {issue.strftime('%d %b %Y')}, expires {expiry.strftime('%d %b %Y')}.",
                "severity": "LOW"
            })

        # Expiry Check
        if expiry:
            if expiry < now:
                findings.append({
                    "category": "Validation",
                    "rule": "Document Expiry",
                    "status": "FAIL",
                    "message": f"Document expired on {expiry.strftime('%d %b %Y')}.",
                    "severity": "HIGH"
                })
            else:
                findings.append({
                    "category": "Validation",
                    "rule": "Document Expiry",
                    "status": "PASS",
                    "message": f"Document is active and valid until {expiry.strftime('%d %b %Y')}.",
                    "severity": "LOW"
                })

        # 3. OCR vs MRZ Cross-Consistency
        if mrz_fields and mrz_fields.get("fields"):
            mrz = mrz_fields["fields"]
            
            # Alphanumeric normalized document number matching
            mrz_doc = re.sub(r'[^A-Z0-9]', '', str(mrz.get("documentNumber", "")))
            ocr_doc = re.sub(r'[^A-Z0-9]', '', str(ocr_fields.get("documentNumber", "")))
            if mrz_doc and ocr_doc:
                if mrz_doc in ocr_doc or ocr_doc in mrz_doc:
                    findings.append({
                        "category": "Consistency",
                        "rule": "Document Number Match",
                        "status": "PASS",
                        "message": f"Document Number ({ocr_fields.get('documentNumber')}) matches MRZ identifier ({mrz.get('documentNumber')}).",
                        "severity": "LOW"
                    })
                else:
                    findings.append({
                        "category": "Consistency",
                        "rule": "Document Number Match",
                        "status": "FAIL",
                        "message": f"OCR Document Number ({ocr_fields.get('documentNumber')}) conflicts with MRZ ({mrz.get('documentNumber')}).",
                        "severity": "HIGH"
                    })

            # Expiry date cross-validation against MRZ checksum
            mrz_exp = parse_date(mrz.get("expiryDate"))
            if mrz_exp and expiry:
                if mrz_exp.year % 100 == expiry.year % 100 and mrz_exp.month == expiry.month and mrz_exp.day == expiry.day:
                    findings.append({
                        "category": "Consistency",
                        "rule": "MRZ Expiry Match",
                        "status": "PASS",
                        "message": f"Visual expiry date ({expiry.strftime('%d %b %Y')}) matches MRZ checksum.",
                        "severity": "LOW"
                    })
                else:
                    findings.append({
                        "category": "Consistency",
                        "rule": "MRZ Expiry Match",
                        "status": "FAIL",
                        "message": f"Visual expiry ({expiry.strftime('%d %b %Y')}) does not match MRZ expiry ({mrz_exp.strftime('%d %b %Y')}).",
                        "severity": "HIGH"
                    })

            # Date of Birth cross-validation against MRZ
            mrz_dob = parse_date(mrz.get("dateOfBirth"))
            if mrz_dob and dob:
                if mrz_dob.year % 100 == dob.year % 100 and mrz_dob.month == dob.month and mrz_dob.day == dob.day:
                    findings.append({
                        "category": "Consistency",
                        "rule": "MRZ DOB Match",
                        "status": "PASS",
                        "message": f"Visual Date of Birth ({dob.strftime('%d %b %Y')}) matches MRZ checksum.",
                        "severity": "LOW"
                    })
                else:
                    findings.append({
                        "category": "Consistency",
                        "rule": "MRZ DOB Match",
                        "status": "FAIL",
                        "message": f"Visual DOB ({dob.strftime('%d %b %Y')}) does not match MRZ DOB ({mrz_dob.strftime('%d %b %Y')}).",
                        "severity": "HIGH"
                    })

        has_fails = any(f["status"] == "FAIL" for f in findings)
        has_warnings = any(f["status"] == "WARNING" for f in findings)
        
        status = "REVIEW_REQUIRED" if has_fails else ("WARNING" if has_warnings else "PASS")
        
        if len(findings) == 0:
            findings.append({
                "category": "System",
                "rule": "Overall Integrity",
                "status": "PASS",
                "message": "All integrity and consistency checks passed.",
                "severity": "LOW"
            })

        return {
            "status": status,
            "findings": findings
        }
    except Exception as e:
        print(f"Validation Error: {e}")
        return {
            "status": "FAILED",
            "findings": [{"category": "System", "rule": "Internal", "status": "FAIL", "message": str(e), "severity": "HIGH"}]
        }
