// Simulate running notes/data.js in a clean environment
const fs = require('fs');
try {
  eval(fs.readFileSync('notes/data.js', 'utf-8'));
  console.log('NOTES_DATA loaded, items:', NOTES_DATA.length);
  NOTES_DATA.forEach((n, i) => {
    console.log('  Item', i + 1, 'id:', n.id, 'preview:', (n.preview || '').substring(0, 40));
  });
} catch (e) {
  console.log('ERROR:', e.message);
  console.log('Stack:', e.stack);
}
