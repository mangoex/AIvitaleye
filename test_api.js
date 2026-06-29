const fs = require('fs');
const https = require('https');

// We need a tiny valid base64 image (a 1x1 red pixel) to send to the server
const redPixel = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const data = JSON.stringify({
  imageBase64: `data:image/png;base64,${redPixel}`,
  mimeType: "image/png",
  patientName: "Test Patient",
  age: "30",
  gender: "Masculino",
  additionalNotes: "Prueba técnica"
});

const options = {
  hostname: 'aivitaleye-production.up.railway.app',
  port: 443,
  path: '/api/analyze-photo',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', responseData);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();
