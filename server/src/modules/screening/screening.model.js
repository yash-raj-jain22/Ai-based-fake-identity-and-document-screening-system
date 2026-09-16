const mongoose = require('mongoose');

const screeningSchema = new mongoose.Schema({
  screeningId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: [
      'CREATED', 'UPLOADING', 'PROCESSING', 'OCR_PROCESSING', 
      'VALIDATING', 'TAMPERING_ANALYSIS', 'FACE_VERIFICATION', 
      'RISK_ASSESSMENT', 'COMPLETED', 'PARTIAL_RESULT', 'FAILED'
    ],
    default: 'CREATED'
  },
  document: {
    originalName: String,
    mimetype: String,
    path: String, // Path to local storage or cloud
    documentType: String,
  },
  liveFace: {
    originalName: String,
    path: String,
  },
  imageQuality: {
    status: String,
    score: Number,
    resolution: String,
    blurDetected: Boolean,
    brightnessStatus: String,
    warnings: [String]
  },
  documentAnalysis: {
    detectedType: String,
    confidence: Number,
    requiredRegions: [String],
    missingRegions: [String],
    portraitRegion: { x: Number, y: Number, width: Number, height: Number },
    warnings: [String]
  },
  ocr: {
    status: { type: String },
    confidence: { type: Number },
    fields: { type: Object }
  },
  mrz: {
    status: { type: String },
    matches: { type: Boolean },
    rawText: { type: String },
    checksumValid: { type: Boolean },
    checksumDetails: { type: Object },
    comparisonDetails: [{
      field: String,
      ocrValue: String,
      mrzValue: String,
      match: Boolean
    }],
    fields: { type: Object }
  },
  validation: {
    status: { type: String },
    findings: [{
      category: String,
      rule: String,
      status: String,
      severity: String,
      message: String
    }]
  },
  tampering: {
    status: { type: String },
    confidence: { type: Number },
    findings: [{
      type: { type: String }, // 'PHOTO_REGION', etc.
      severity: String,
      message: String
    }],
    details: { type: Object }
  },
  faceVerification: {
    status: { type: String },
    confidence: { type: Number },
    message: String,
    details: { type: Object }
  },
  riskAssessment: {
    level: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'REVIEW_REQUIRED', 'PENDING'], default: 'PENDING' },
    score: { type: Number },
    reasons: [String]
  },
  error: {
    code: String,
    message: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdByName: {
    type: String,
    default: 'Officer John Doe'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Screening', screeningSchema);
