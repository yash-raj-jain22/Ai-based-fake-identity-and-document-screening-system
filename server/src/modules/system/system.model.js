const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'global_config',
  },
  aiServiceUrl: {
    type: String,
    default: 'http://localhost:8000',
  },
  blurThreshold: {
    type: Number,
    default: 100, // Laplacian variance cutoff
  },
  faceMatchThreshold: {
    type: Number,
    default: 60, // Confidence % match threshold
  },
  tamperingSensitivity: {
    type: String,
    enum: ['LOW', 'STANDARD', 'HIGH', 'MAXIMUM'],
    default: 'HIGH',
  },
  autoEscalateHighRisk: {
    type: Boolean,
    default: true,
  },
  workstationName: {
    type: String,
    default: 'Terminal 01 - Primary Inspection Booth',
  },
  audioAlerts: {
    type: Boolean,
    default: true,
  },
  enforceStrictDates: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
