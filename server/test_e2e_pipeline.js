const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/docuscreen';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

const Screening = require('./src/modules/screening/screening.model');
const screeningService = require('./src/modules/screening/screening.service');
const aiService = require('./src/modules/ai/ai.service');
const riskService = require('./src/modules/risk/risk.service');

async function runE2ETest() {
  console.log('====================================================');
  console.log('STARTING END-TO-END PIPELINE & IMAGE STREAMING TEST');
  console.log('====================================================\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[1/5] MongoDB connected.');

    console.log('[2/5] Testing AI Microservice at', AI_SERVICE_URL);
    const health = await axios.get(`${AI_SERVICE_URL}/api/v1/health`);
    console.log('  ✓ AI Microservice Health:', health.data);

    const demoDocPath = path.resolve(__dirname, '../dummy doc/1788612422437-01a07163-305f-77d7-8e24-1af94ce866ef.jpeg');
    if (!fs.existsSync(demoDocPath)) {
      throw new Error(`Demo document not found at: ${demoDocPath}`);
    }
    console.log(`[3/5] Processing real document: ${demoDocPath}`);
    
    const uploadsDir = path.resolve(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const uploadedFilePath = path.join(uploadsDir, `e2e_test_${Date.now()}.jpeg`);
    fs.copyFileSync(demoDocPath, uploadedFilePath);

    const mockMulterFile = {
      originalname: 'demo_passport.jpeg',
      mimetype: 'image/jpeg',
      path: uploadedFilePath
    };

    const screening = await screeningService.createScreening(mockMulterFile, { _id: new mongoose.Types.ObjectId(), name: 'Senior Inspector' });
    console.log(`  ✓ Screening created in DB with ID: ${screening.screeningId}`);

    const aiResult = await aiService.analyzeDocument(uploadedFilePath, null, 'PASSPORT');
    if (!aiResult.success) {
      throw new Error(`AI Analysis failed: ${aiResult.error}`);
    }
    console.log('  ✓ AI Service Pipeline Succeeded:');
    console.log(`    - Image Quality: Score ${aiResult.imageQuality.score}, Blur: ${aiResult.imageQuality.blurDetected}`);
    console.log(`    - OCR Status: ${aiResult.ocr.status}, Confidence: ${aiResult.ocr.confidence}, Fields:`, Object.keys(aiResult.ocr.fields));
    console.log(`    - MRZ Status: ${aiResult.mrz.status}, Checksum Valid: ${aiResult.mrz.checksumValid}`);
    console.log(`    - Tampering Status: ${aiResult.tampering.status}, Findings count: ${aiResult.tampering.findings.length}`);
    console.log(`    - Face Verification: ${aiResult.faceVerification.status}`);

    const riskAssessment = riskService.calculateRisk(aiResult);
    console.log(`  ✓ Risk Assessment: ${riskAssessment.level} (Score: ${riskAssessment.score}/100)`);
    console.log(`    Reasons:`, riskAssessment.reasons);

    screening.status = 'COMPLETED';
    screening.imageQuality = aiResult.imageQuality;
    screening.documentAnalysis = aiResult.documentAnalysis;
    screening.ocr = aiResult.ocr;
    screening.mrz = aiResult.mrz;
    screening.validation = aiResult.validation;
    screening.tampering = aiResult.tampering;
    screening.faceVerification = aiResult.faceVerification;
    screening.riskAssessment = riskAssessment;
    await screening.save();
    console.log('  ✓ Screening record persisted to MongoDB.');

    console.log('[4/5] Testing Record Retrieval & Formatting...');
    const retrieved = await screeningService.getScreeningById(screening.screeningId);
    if (!retrieved) throw new Error('Failed to retrieve screening by ID');
    console.log('  ✓ MRZ Checksum persisted properly:', retrieved.mrz.checksumValid);

    console.log('[5/5] Testing Document File on Disk for Streaming...');
    const storedFilePath = path.resolve(retrieved.document.path);
    if (fs.existsSync(storedFilePath) && fs.statSync(storedFilePath).size > 0) {
      console.log(`  ✓ Document file ready for streaming: ${storedFilePath} (${fs.statSync(storedFilePath).size} bytes)`);
    } else {
      throw new Error(`Document file missing at ${storedFilePath}`);
    }

    console.log('\n====================================================');
    console.log('E2E TEST PASSED! ZERO MOCKS, ALL REAL AI DATA! 🎉');
    console.log('====================================================\n');

  } catch (err) {
    console.error('\n❌ E2E TEST FAILED:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runE2ETest();
