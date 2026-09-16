const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/docuscreen';
    await mongoose.connect(mongoURI, {
      // Modern mongoose defaults are fine, options no longer strictly required
    });
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Let the server handle the exit if needed
    throw error;
  }
};

module.exports = connectDB;
