const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const QUEUE_PATH = path.join(ROOT, 'notes', 'queue.json');
const PUBLISHED_PATH = path.join(ROOT, 'notes', 'auto-published.json');

// Read today's date in YYYY-MM-DD format
const today = new Date().toISOString().slice(0, 10);

// Read queue
const queue = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf-8'));

// Find expired notes
const expired = [];
const remaining = [];

for (const note of queue) {
  if (note.publishDate && note.publishDate <= today) {
    expired.push(note);
  } else {
    remaining.push(note);
  }
}

if (expired.length === 0) {
  console.log('No notes to publish today (' + today + ')');
  process.exit(0);
}

// Read existing auto-published notes
let published = [];
if (fs.existsSync(PUBLISHED_PATH)) {
  published = JSON.parse(fs.readFileSync(PUBLISHED_PATH, 'utf-8'));
}

// Append expired notes to published (newest first)
published = [...expired, ...published];

// Write back
fs.writeFileSync(PUBLISHED_PATH, JSON.stringify(published, null, 2) + '\n');
fs.writeFileSync(QUEUE_PATH, JSON.stringify(remaining, null, 2) + '\n');

console.log('Published ' + expired.length + ' note(s):');
expired.forEach(n => console.log('  - ' + n.title));