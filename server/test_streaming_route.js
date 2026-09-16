const app = require('./src/app');
const http = require('http');
const axios = require('axios');
const mongoose = require('mongoose');
const Screening = require('./src/modules/screening/screening.model');

async function testHttpStreaming() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/docuscreen');
  
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log('Temporary test server listening on port:', port);

  try {
    const latestScreening = await Screening.findOne({ status: 'COMPLETED' }).sort({ createdAt: -1 });
    if (!latestScreening) {
      throw new Error('No completed screening found');
    }

    console.log('Testing streaming for screening ID:', latestScreening.screeningId);
    
    // 1. Test image endpoint
    const imgRes = await axios.get(`http://localhost:${port}/api/v1/screenings/${latestScreening.screeningId}/document`, {
      responseType: 'arraybuffer'
    });

    console.log('Image HTTP Status:', imgRes.status);
    console.log('Content-Type:', imgRes.headers['content-type']);
    console.log('Content-Length:', imgRes.headers['content-length']);

    if (imgRes.status === 200 && imgRes.headers['content-type'].includes('image')) {
      console.log('✓ Document streaming HTTP route verified successfully!');
    } else {
      throw new Error('Document streaming route failed validation');
    }

    // 2. Test JSON retrieval
    const jsonRes = await axios.get(`http://localhost:${port}/api/v1/screenings/${latestScreening.screeningId}`);
    console.log('JSON fetch status:', jsonRes.status);
    console.log('Attached document.url:', jsonRes.data.data.document.url);
    console.log('MRZ checksumValid:', jsonRes.data.data.mrz.checksumValid);
    console.log('Risk Level:', jsonRes.data.data.riskAssessment.level);

    console.log('\n✓ ALL HTTP STREAMING & RETRIEVAL TESTS PASSED! 🎉');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

testHttpStreaming().catch(err => {
  console.error(err);
  process.exit(1);
});
