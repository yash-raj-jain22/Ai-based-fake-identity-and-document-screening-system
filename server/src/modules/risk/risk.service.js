const calculateRisk = (aiResult) => {
  let score = 0;
  const reasons = [];
  
  if (!aiResult) return { level: "PENDING", score: 0, reasons: [] };

  // 1. Image Quality
  if (aiResult.imageQuality) {
    if (aiResult.imageQuality.status === 'UNUSABLE') {
      score += 40;
      reasons.push('Image quality is unusable for reliable automated screening');
    } else if (aiResult.imageQuality.status === 'POOR') {
      score += 15;
      reasons.push('Poor image quality detected; visual manual review advised');
    }
  }

  // 2. Document Structure
  if (aiResult.documentAnalysis) {
    if (aiResult.documentAnalysis.missingRegions?.includes('portrait')) {
      score += 20;
      reasons.push('Missing expected portrait region on identity document');
    }
  }

  // 3. OCR Confidence
  if (aiResult.ocr?.confidence !== undefined && aiResult.ocr.confidence > 0 && aiResult.ocr.confidence < 70) {
    score += 15;
    reasons.push(`Low OCR optical confidence (${aiResult.ocr.confidence}%)`);
  }

  // 4. MRZ Verification & Checksums
  if (aiResult.mrz) {
    if (aiResult.mrz.matches === false) {
      score += 35;
      reasons.push('MRZ field mismatch detected against visual document data');
    }
    if (aiResult.mrz.checksumValid === false) {
      score += 20;
      reasons.push('MRZ checksum validation failed (check digits do not match ICAO formula)');
    }
  }

  // 5. Tampering Analysis
  if (aiResult.tampering) {
    if (aiResult.tampering.status === 'POSSIBLE_ANOMALY') {
      score += 40;
      const detail = aiResult.tampering.findings?.[0]?.message || 'Forensic compression or noise anomaly detected';
      reasons.push(`Tampering Flag: ${detail}`);
    } else if (aiResult.tampering.status === 'REVIEW_REQUIRED') {
      score += 20;
      reasons.push('Image forensics indicate subtle compression variances; secondary review recommended');
    }
  }

  // 6. Face Biometric Verification
  if (aiResult.faceVerification) {
    if (aiResult.faceVerification.status === 'MISMATCH') {
      score += 45;
      reasons.push('Biometric facial verification mismatch between document portrait and live subject');
    }
  }

  // 7. Document Lifecycle & Chronology Validation Findings
  if (aiResult.validation?.findings?.length > 0) {
    aiResult.validation.findings.forEach(finding => {
      if (finding.status === 'FAIL') {
        score += 25;
        reasons.push(`Validation Failure: ${finding.message}`);
      } else if (finding.status === 'WARNING') {
        score += 10;
        reasons.push(`Validation Warning: ${finding.message}`);
      }
    });
  }

  // Determine Level: LOW, MEDIUM, HIGH, REVIEW_REQUIRED
  let level = 'LOW';
  if (score >= 60) {
    level = 'HIGH';
  } else if (score >= 35) {
    level = 'MEDIUM';
  } else if (
    aiResult.validation?.status === 'REVIEW_REQUIRED' ||
    aiResult.imageQuality?.status === 'POOR' ||
    aiResult.imageQuality?.status === 'UNUSABLE' ||
    aiResult.tampering?.status === 'REVIEW_REQUIRED'
  ) {
    level = 'REVIEW_REQUIRED';
  }

  if (level === 'LOW' && reasons.length === 0) {
    reasons.push('All security, MRZ checksum, and authenticity checks cleared successfully.');
  }

  return {
    level,
    score: Math.min(score, 100),
    reasons
  };
};

module.exports = {
  calculateRisk
};
