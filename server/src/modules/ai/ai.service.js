const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const analyzeDocument = async (filePath, liveFacePath, documentType) => {
  try {
    const formData = new FormData();
    formData.append('document', fs.createReadStream(filePath));
    
    if (liveFacePath) {
      formData.append('liveFace', fs.createReadStream(liveFacePath));
    }
    
    formData.append('documentType', documentType || 'UNKNOWN');

    const response = await axios.post(`${AI_SERVICE_URL}/api/v1/screen`, formData, {
      headers: {
        ...formData.getHeaders()
      },
      timeout: 30000 // 30 second timeout for AI processing
    });

    return response.data;
  } catch (error) {
    console.error('AI Service Error:', error.message);
    if (error.response) {
      console.error('AI Service Response:', error.response.data);
      throw new Error(`AI Service failed: ${JSON.stringify(error.response.data)}`);
    }
    throw new Error(`Failed to communicate with AI Service: ${error.message}`);
  }
};

module.exports = {
  analyzeDocument
};
