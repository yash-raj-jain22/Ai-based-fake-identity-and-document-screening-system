const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testUpload() {
  try {
    const filePath = '../clean.jpg';
    
    console.log(`Uploading ${filePath}...`);
    
    const formData = new FormData();
    formData.append('document', fs.createReadStream(filePath));
    formData.append('documentType', 'PASSPORT');
    
    const response = await axios.post('http://localhost:5000/api/v1/screenings', formData, {
      headers: formData.getHeaders()
    });
    
    console.log('--- SCREENING RESULT ---');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('Upload failed!');
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

testUpload();
