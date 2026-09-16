const os = require('os');
const axios = require('axios');
const mongoose = require('mongoose');
const User = require('../auth/user.model');
const Screening = require('../screening/screening.model');

const listUsers = async () => {
  return await User.find().sort({ createdAt: -1 });
};

const createUser = async (userData) => {
  const existing = await User.findOne({ email: userData.email.toLowerCase() });
  if (existing) {
    const error = new Error('An officer with this email address already exists.');
    error.statusCode = 400;
    error.code = 'EMAIL_EXISTS';
    throw error;
  }

  const user = new User(userData);
  await user.save();
  return user;
};

const deleteUser = async (targetUserId, requesterId) => {
  if (targetUserId.toString() === requesterId.toString()) {
    const error = new Error('You cannot delete your own active administrator account.');
    error.statusCode = 400;
    error.code = 'CANNOT_DELETE_SELF';
    throw error;
  }

  const user = await User.findByIdAndDelete(targetUserId);
  if (!user) {
    const error = new Error('Officer account not found.');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  return { message: 'Officer account deleted successfully.' };
};

const getSystemHealth = async () => {
  // 1. MongoDB Status
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = { 0: 'DISCONNECTED', 1: 'CONNECTED', 2: 'CONNECTING', 3: 'DISCONNECTING' };
  const databaseStatus = dbStatusMap[dbState] || 'UNKNOWN';

  // 2. Screening Metrics
  const totalScreenings = await Screening.countDocuments();
  const highRiskCount = await Screening.countDocuments({ 'riskAssessment.level': 'HIGH' });
  const completedCount = await Screening.countDocuments({ status: 'COMPLETED' });
  const failedCount = await Screening.countDocuments({ status: 'FAILED' });

  // 3. AI Service Health Ping
  const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  let aiServiceStatus = 'UNAVAILABLE';
  let aiLatencyMs = null;

  try {
    const start = Date.now();
    const aiRes = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 3000 });
    aiLatencyMs = Date.now() - start;
    if (aiRes.data && aiRes.data.status === 'ok') {
      aiServiceStatus = 'HEALTHY';
    }
  } catch (err) {
    aiServiceStatus = 'OFFLINE';
  }

  // 4. Host telemetry
  const memoryUsage = process.memoryUsage();
  const systemInfo = {
    platform: os.platform(),
    release: os.release(),
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version,
    memory: {
      heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
    },
  };

  return {
    database: {
      status: databaseStatus,
      connection: 'mongodb://localhost:27017/docuscreen',
    },
    aiService: {
      url: AI_SERVICE_URL,
      status: aiServiceStatus,
      latencyMs: aiLatencyMs,
    },
    server: systemInfo,
    metrics: {
      totalScreenings,
      highRiskCount,
      completedCount,
      failedCount,
    },
  };
};

module.exports = {
  listUsers,
  createUser,
  deleteUser,
  getSystemHealth,
};
