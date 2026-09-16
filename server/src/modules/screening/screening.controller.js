const screeningService = require('./screening.service');
const aiService = require('../ai/ai.service');
const riskService = require('../risk/risk.service');
const Screening = require('./screening.model');

const uploadDocument = async (req, res, next) => {
  try {
    if (!req.files || !req.files['document']) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No document file uploaded' }
      });
    }

    const documentFile = req.files['document'][0];
    const liveFaceFile = req.files['liveFace'] ? req.files['liveFace'][0] : null;

    let screening = await screeningService.createScreening(documentFile, req.user);
    if (liveFaceFile) {
        screening.liveFace = {
            originalName: liveFaceFile.originalname,
            path: liveFaceFile.path
        };
        await screening.save();
    }

    try {
      // Update status to PROCESSING
      screening.status = 'PROCESSING';
      await screening.save();

      // Call Python AI Service
      const documentType = req.body.documentType || 'UNKNOWN';
      const aiResult = await aiService.analyzeDocument(documentFile.path, liveFaceFile ? liveFaceFile.path : null, documentType);
      
      if (!aiResult.success) {
         screening.status = 'FAILED';
         screening.error = {
            code: 'AI_SERVICE_ERROR',
            message: aiResult.error || 'Unknown AI Service error'
         };
         await screening.save();
         return res.status(200).json({
             success: true,
             data: screening
         });
      }

      // Calculate Risk
      const riskAssessment = riskService.calculateRisk(aiResult);

      // Update Database Record
      screening.imageQuality = aiResult.imageQuality;
      screening.documentAnalysis = aiResult.documentAnalysis;
      screening.ocr = aiResult.ocr;
      screening.mrz = aiResult.mrz;
      screening.validation = aiResult.validation;
      screening.tampering = aiResult.tampering;
      screening.faceVerification = aiResult.faceVerification;
      screening.riskAssessment = riskAssessment;
      
      // Determine final status
      const hasFailure = Object.values(aiResult).some(res => res && res.status === 'FAILED');
      screening.status = hasFailure ? 'PARTIAL_RESULT' : 'COMPLETED';

      await screening.save();
    } catch (processError) {
      console.error('Screening processing failed:', processError);
      screening.status = 'FAILED';
      screening.error = {
        code: 'PROCESSING_ERROR',
        message: processError.message
      };
      await screening.save();
    }

    res.status(201).json({
      success: true,
      data: formatScreening(screening)
    });
  } catch (error) {
    next(error);
  }
};

const path = require('path');
const fs = require('fs');

const formatScreening = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  // Attach reliable streaming URLs
  if (obj.document) {
    obj.document.url = `/api/v1/screenings/${obj.screeningId}/document`;
  }
  if (obj.liveFace && obj.liveFace.path) {
    obj.liveFace.url = `/api/v1/screenings/${obj.screeningId}/live-face`;
  }
  return obj;
};

const getDocumentFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const screening = await screeningService.getScreeningById(id);
    if (!screening || !screening.document?.path) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document image not found for this screening' }
      });
    }

    const filePath = path.resolve(screening.document.path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: { code: 'FILE_MISSING', message: 'Document image file is missing from server storage' }
      });
    }

    if (screening.document.mimetype) {
      res.setHeader('Content-Type', screening.document.mimetype);
    }
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};

const getLiveFaceFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const screening = await screeningService.getScreeningById(id);
    if (!screening || !screening.liveFace?.path) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Live face image not found for this screening' }
      });
    }

    const filePath = path.resolve(screening.liveFace.path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: { code: 'FILE_MISSING', message: 'Live face image file is missing from server storage' }
      });
    }

    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};

const getScreening = async (req, res, next) => {
  try {
    const { id } = req.params;
    const screening = await screeningService.getScreeningById(id);

    if (!screening) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Screening not found' }
      });
    }

    res.status(200).json({
      success: true,
      data: formatScreening(screening)
    });
  } catch (error) {
    next(error);
  }
};

const getScreenings = async (req, res, next) => {
  try {
    const screenings = await Screening.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: screenings.map(formatScreening)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadDocument,
  getScreening,
  getScreenings,
  getDocumentFile,
  getLiveFaceFile
};
