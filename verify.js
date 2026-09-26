const { app, isValidPayload } = require('./index.js');

const result = isValidPayload({
  date: 'September 2026',
  name: 'PixelNova9001',
  attendance: 'Present',
  additionalNotes: 'Optional note',
});

console.log(JSON.stringify({
  loadedApp: !!app,
  validPayload: result.valid,
  message: result.message || 'valid',
}));
