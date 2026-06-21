# Notes Automation System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local note management panel, scheduled publishing via GitHub Actions, and subscription management via GitHub Issues to the Annieif static site.

**Architecture:** `admin.html` provides a local management UI using File System Access API. `notes/queue.json` stores scheduled notes. A GitHub Action (`publish-notes.yml`) runs every 6 hours, moves expired notes to `notes/auto-published.json`, and pushes. `index.html` loads both `data.js` and `auto-published.json`, merging them for display. A subscription link opens a pre-filled GitHub Issue.

**Tech Stack:** HTML/CSS/JS (admin panel), Node.js (publish script), GitHub Actions (automation), File System Access API (local file I/O)

---

## File Structure

| File | Role |
|:---|:---|
| `admin.html` | Local management panel — create/edit/delete notes, manage queue |
| `notes/queue.json` | Scheduled notes queue (pure JSON, read by admin.html, consumed by Action) |
| `notes/auto-published.json` | Auto-published notes (appended by Action, loaded by index.html) |
| `scripts/publish.js` | Node.js script — reads queue.json, moves expired notes to auto-published.json |
| `.github/workflows/publish-notes.yml` | Scheduled GitHub Action — runs publish.js every 6 hours |
| `index.html` | Modified — add subscription link, load auto-published.json, merge with NOTES_DATA |

---

### Task 1: Create `notes/queue.json`

**Files:**
- Create: `notes/queue.json`

- [ ] **Step 1: Create empty queue file**

```json
[]
```

- [ ] **Step 2: Commit**

```bash
git add notes/queue.json
git commit -m "feat: add notes queue file for scheduled publishing"
```

---

### Task 2: Create `notes/auto-published.json`

**Files:**
- Create: `notes/auto-published.json`

- [ ] **Step 1: Create empty auto-published file**

```json
[]
```

- [ ] **Step 2: Commit**

```bash
git add notes/auto-published.json
git commit -m "feat: add auto-published notes file"
```

---

### Task 3: Create `scripts/publish.js`

**Files:**
- Create: `scripts/publish.js`

- [ ] **Step 1: Create the publish script**

This script reads queue.json, finds notes with `publishDate <= today`, moves them to auto-published.json, and removes from queue.

```javascript
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
```

- [ ] **Step 2: Verify script works**

```bash
cd d:\yyk\静态\page
node scripts/publish.js
```

Expected: "No notes to publish today" (queue is empty)

- [ ] **Step 3: Commit**

```bash
git add scripts/publish.js
git commit -m "feat: add publish script for scheduled notes"
```

---

### Task 4: Create `.github/workflows/publish-notes.yml`

**Files:**
- Create: `.github/workflows/publish-notes.yml`

- [ ] **Step 1: Create the workflow file**

```yaml
name: Publish Scheduled Notes

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:        # Manual trigger

permissions:
  contents: write

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run publish script
        run: node scripts/publish.js

      - name: Check for changes
        id: check
        run: |
          if git diff --quiet; then
            echo "changed=false" >> $GITHUB_OUTPUT
          else
            echo "changed=true" >> $GITHUB_OUTPUT
          fi

      - name: Commit and push
        if: steps.check.outputs.changed == 'true'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add notes/queue.json notes/auto-published.json
          git commit -m "publish: scheduled notes for $(date +%Y-%m-%d)"
          git push
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/publish-notes.yml
git commit -m "feat: add GitHub Action for scheduled note publishing"
```

---

### Task 5: Update `index.html` — load auto-published.json + subscription link

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Find the notes rendering code and add auto-published loading**

First, locate the `initNotesController` function. Currently it reads from `NOTES_DATA`. We need to fetch `auto-published.json` and merge.

Read the current initNotesController function around line 1908:

```javascript
function initNotesController() {
    const arr = [...NOTES_DATA];
    // ... rest of function
}
```

Change to:

```javascript
async function initNotesController() {
    let autoNotes = [];
    try {
      const res = await fetch('notes/auto-published.json');
      if (res.ok) autoNotes = await res.json();
    } catch (e) { /* file may not exist yet */ }
    
    const arr = [...NOTES_DATA, ...autoNotes];
    // sort by date descending
    arr.sort((a, b) => b.date.localeCompare(a.date));
    // ... rest of function continues as before
}
```

- [ ] **Step 2: Update the call site to await**

Find `initNotesController();` call (around line 2217) and the surrounding code. If it's inside an async function, the await will work. If not, wrap it:

```javascript
// If the call site is inside a non-async function:
initNotesController();  // old
// becomes:
(async () => { await initNotesController(); })();  // new
```

Or if the parent function is already async, just add `await`:

```javascript
await initNotesController();
```

- [ ] **Step 3: Add subscription link in Contact section**

Find the contact section in index.html (around line 1080 area). Add a subscription link next to existing contact items. Search for the existing email link and add nearby:

```html
<a href="https://github.com/Annieif/Annieif.github.io/issues/new?title=New+Subscription&labels=subscription&body=Name%3A+%0AEmail%3A+"
   target="_blank" rel="noopener" class="contact-link">
  <span class="contact-icon">@</span>
  <span class="contact-label">Subscribe</span>
</a>
```

Style it to match existing contact items. Add CSS:

```css
.contact-link {
  display: flex; align-items: center; gap: 10px;
  color: var(--ink-dim); text-decoration: none;
  font-family: 'JetBrains Mono', monospace; font-size: 13px;
  transition: color .3s;
}
.contact-link:hover { color: var(--accent); }
.contact-icon { font-size: 16px; }
```

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: load auto-published notes, add subscription link"
```

---

### Task 6: Create `admin.html` — local management panel

**Files:**
- Create: `admin.html`

This is the largest task. The admin panel is a standalone HTML file with embedded CSS and JS.

- [ ] **Step 1: Create HTML structure**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Annieif Notes Admin</title>
<style>
:root {
  --bg: #0a0a0a;
  --ink: #e8e4dd;
  --ink-dim: #b8b0a4;
  --ink-faint: #7d7565;
  --accent: #f4c2d0;
  --line: rgba(232,228,221,.10);
  --card: #13111a;
  --ease: cubic-bezier(.2,.8,.2,1);
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: var(--bg); color: var(--ink);
  font-family: 'Fraunces', 'Noto Serif SC', Georgia, serif;
  min-height: 100vh; line-height: 1.7;
}
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 28px; border-bottom: 1px solid var(--line);
  background: var(--card);
}
.topbar h1 { font-size: 18px; font-weight: 500; }
.topbar h1 em { color: var(--accent); font-style: italic; }
.topbar .actions { display: flex; gap: 10px; align-items: center; }
.btn {
  background: transparent; border: 1px solid var(--line); color: var(--ink);
  padding: 8px 16px; border-radius: 4px; cursor: pointer;
  font-family: 'JetBrains Mono', monospace; font-size: 11px;
  letter-spacing: .08em; text-transform: uppercase;
  transition: all .2s;
}
.btn:hover { border-color: var(--accent); color: var(--accent); }
.btn.primary { background: var(--accent); color: #1a1018; border-color: var(--accent); }
.btn.primary:hover { opacity: .85; }
.status {
  font-family: 'JetBrains Mono', monospace; font-size: 11px;
  color: var(--ink-faint); margin-right: 16px;
}
.main { display: flex; height: calc(100vh - 57px); }
.sidebar {
  width: 240px; border-right: 1px solid var(--line); padding: 20px 0;
  overflow-y: auto; flex-shrink: 0;
}
.tab {
  display: block; width: 100%; text-align: left; padding: 10px 28px;
  background: none; border: none; color: var(--ink-dim); cursor: pointer;
  font-family: 'JetBrains Mono', monospace; font-size: 11px;
  letter-spacing: .08em; transition: all .2s;
}
.tab:hover, .tab.active { color: var(--accent); background: rgba(244,194,208,.04); }
.tab .count { float: right; color: var(--ink-faint); }
.content { flex: 1; overflow-y: auto; padding: 28px; }
.note-list { display: flex; flex-direction: column; gap: 8px; }
.note-item {
  display: flex; align-items: center; gap: 14px;
  padding: 12px 16px; border: 1px solid var(--line); border-radius: 6px;
  cursor: pointer; transition: all .2s;
}
.note-item:hover { border-color: rgba(244,194,208,.3); background: rgba(244,194,208,.02); }
.note-item .date {
  font-family: 'JetBrains Mono', monospace; font-size: 11px;
  color: var(--ink-faint); white-space: nowrap;
}
.note-item .title { flex: 1; font-size: 15px; }
.note-item .actions { display: flex; gap: 6px; }
.icon-btn {
  background: none; border: 1px solid var(--line); color: var(--ink-dim);
  width: 28px; height: 28px; border-radius: 4px; cursor: pointer;
  font-size: 12px; display: flex; align-items: center; justify-content: center;
  transition: all .2s;
}
.icon-btn:hover { border-color: var(--accent); color: var(--accent); }
.icon-btn.danger:hover { border-color: #e06060; color: #e06060; }

/* Editor panel */
.editor {
  display: none; flex-direction: column; gap: 16px;
  height: 100%;
}
.editor.active { display: flex; }
.editor .field { display: flex; flex-direction: column; gap: 4px; }
.editor label {
  font-family: 'JetBrains Mono', monospace; font-size: 10px;
  letter-spacing: .12em; text-transform: uppercase; color: var(--ink-faint);
}
.editor input, .editor textarea {
  background: var(--card); border: 1px solid var(--line); color: var(--ink);
  padding: 10px 14px; border-radius: 4px; font-family: inherit; font-size: 14px;
  transition: border-color .2s;
}
.editor input:focus, .editor textarea:focus {
  outline: none; border-color: var(--accent);
}
.editor textarea { resize: vertical; min-height: 200px; font-family: 'JetBrains Mono', monospace; font-size: 13px; }
.editor .row { display: flex; gap: 12px; }
.editor .row .field { flex: 1; }
.editor .preview {
  background: var(--card); border: 1px solid var(--line); border-radius: 6px;
  padding: 20px; min-height: 100px; overflow-y: auto;
}
.editor .preview h2 { font-size: 22px; margin-bottom: 12px; color: var(--accent); }
.editor .preview h3 { font-size: 17px; margin: 18px 0 10px; }
.editor .preview p { margin-bottom: 10px; }
.editor .preview code {
  font-family: 'JetBrains Mono', monospace; font-size: 13px;
  background: rgba(244,194,208,.06); padding: 2px 6px; border-radius: 3px;
  color: var(--accent);
}
.editor .preview blockquote {
  border-left: 2px solid var(--accent); padding-left: 14px;
  color: var(--ink-dim); font-style: italic; margin: 12px 0;
}
.editor .preview table {
  width: 100%; border-collapse: collapse; margin: 12px 0;
}
.editor .preview th, .editor .preview td {
  padding: 8px 12px; border-bottom: 1px solid var(--line); text-align: left;
}
.editor .preview th { color: var(--ink-faint); font-size: 12px; }
.editor .preview strong { color: var(--accent); }
.editor .preview mark {
  background: rgba(244,194,208,.15); color: var(--accent);
  padding: 1px 4px; border-radius: 2px; font-style: italic;
}
.empty {
  text-align: center; padding: 60px 20px; color: var(--ink-faint);
  font-family: 'JetBrains Mono', monospace; font-size: 12px;
}
</style>
</head>
<body>
<div class="topbar">
  <h1>Annieif <em>Notes Admin</em></h1>
  <div class="actions">
    <span class="status" id="status">No project open</span>
    <button class="btn" id="btnOpen">Open Project</button>
    <button class="btn primary" id="btnNew" disabled>+ New Note</button>
  </div>
</div>
<div class="main">
  <div class="sidebar">
    <button class="tab active" data-view="live">Live Notes <span class="count" id="liveCount">0</span></button>
    <button class="tab" data-view="queue">Queue <span class="count" id="queueCount">0</span></button>
  </div>
  <div class="content" id="content">
    <div id="listView" class="note-list"></div>
    <div id="editorView" class="editor">
      <div class="row">
        <div class="field">
          <label>Title</label>
          <input type="text" id="edTitle" placeholder="笔记标题">
        </div>
      </div>
      <div class="row">
        <div class="field">
          <label>Date (YYYY-MM-DD)</label>
          <input type="text" id="edDate" placeholder="2026-06-21">
        </div>
        <div class="field" id="publishDateGroup">
          <label>Publish Date (YYYY-MM-DD)</label>
          <input type="text" id="edPublishDate" placeholder="2026-07-01">
        </div>
      </div>
      <div class="field">
        <label>Description</label>
        <input type="text" id="edDesc" placeholder="一句话描述">
      </div>
      <div class="field">
        <label>Content (Markdown)</label>
        <textarea id="edContent" rows="12" placeholder="Markdown 正文..."></textarea>
      </div>
      <div class="field">
        <label>Preview</label>
        <div class="preview" id="preview"></div>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button class="btn" id="btnCancel">Cancel</button>
        <button class="btn" id="btnDelete" style="display:none">Delete</button>
        <button class="btn primary" id="btnSave">Save</button>
      </div>
    </div>
  </div>
</div>

<script src="notes/data.js"></script>
<script>
// ============ STATE ============
let dirHandle = null;
let liveNotes = [];
let queueNotes = [];
let currentView = 'live';
let editingIndex = -1;
let isNewNote = false;

// ============ DOM REFS ============
const $ = id => document.getElementById(id);
const status = $('status');
const btnOpen = $('btnOpen');
const btnNew = $('btnNew');
const listView = $('listView');
const editorView = $('editorView');
const liveCount = $('liveCount');
const queueCount = $('queueCount');
const publishDateGroup = $('publishDateGroup');
const preview = $('preview');

// ============ FILE SYSTEM ACCESS ============
btnOpen.addEventListener('click', async () => {
  try {
    dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    status.textContent = 'Project opened';
    btnNew.disabled = false;
    await loadAll();
  } catch (e) {
    if (e.name !== 'AbortError') {
      status.textContent = 'Error: ' + e.message;
    }
  }
});

async function readFile(relativePath) {
  const parts = relativePath.split('/');
  let handle = dirHandle;
  for (const part of parts) {
    handle = await handle.getDirectoryHandle(part);
  }
  // Actually, this is wrong. Let me fix the approach.
  // We need to read a file, not a directory.
  // Correct approach: navigate to parent dir, then get file handle
}

// Simpler approach: navigate to the file directly
async function readJSON(relativePath) {
  const parts = relativePath.split('/');
  const fileName = parts.pop();
  let handle = dirHandle;
  for (const part of parts) {
    handle = await handle.getDirectoryHandle(part);
  }
  const fileHandle = await handle.getFileHandle(fileName);
  const file = await fileHandle.getFile();
  const text = await file.text();
  return JSON.parse(text);
}

async function writeJSON(relativePath, data) {
  const parts = relativePath.split('/');
  const fileName = parts.pop();
  let handle = dirHandle;
  for (const part of parts) {
    handle = await handle.getDirectoryHandle(part);
  }
  const fileHandle = await handle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(data, null, 2) + '\n');
  await writable.close();
}

async function readTextFile(relativePath) {
  const parts = relativePath.split('/');
  const fileName = parts.pop();
  let handle = dirHandle;
  for (const part of parts) {
    handle = await handle.getDirectoryHandle(part);
  }
  const fileHandle = await handle.getFileHandle(fileName);
  const file = await fileHandle.getFile();
  return await file.text();
}

async function writeTextFile(relativePath, text) {
  const parts = relativePath.split('/');
  const fileName = parts.pop();
  let handle = dirHandle;
  for (const part of parts) {
    handle = await handle.getDirectoryHandle(part);
  }
  const fileHandle = await handle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(text);
  await writable.close();
}

// ============ DATA LOADING ============
async function loadAll() {
  try {
    queueNotes = await readJSON('notes/queue.json');
  } catch (e) {
    queueNotes = [];
  }
  // Live notes come from the data.js loaded via script tag
  // But we need the RAW content (before forEach modifies it)
  // So we read the file as text and parse it ourselves
  try {
    const text = await readTextFile('notes/data.js');
    liveNotes = extractNotesData(text);
  } catch (e) {
    liveNotes = [];
  }
  renderList();
  updateCounts();
}

function extractNotesData(text) {
  // Find the NOTES_DATA array by bracket counting
  const start = text.indexOf('const NOTES_DATA = [');
  if (start === -1) return [];
  
  const arrayStart = start + 'const NOTES_DATA = '.length;
  let pos = arrayStart; // at [
  let depth = 1;
  let inTemplate = false;
  let inString = false;
  let stringChar = '';
  let inLineComment = false;
  
  while (pos < text.length && depth > 0) {
    pos++;
    const ch = text[pos];
    const prev = pos > 0 ? text[pos - 1] : '';
    
    if (inTemplate) {
      if (ch === '`' && prev !== '\\\\') inTemplate = false;
      continue;
    }
    if (inString) {
      if (ch === stringChar && prev !== '\\\\') inString = false;
      continue;
    }
    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }
    
    if (ch === '`') { inTemplate = true; continue; }
    if (ch === '"' || ch === "'") { inString = true; stringChar = ch; continue; }
    if (ch === '/' && text[pos + 1] === '/') { inLineComment = true; continue; }
    
    if (ch === '[' || ch === '{') depth++;
    if (ch === ']' || ch === '}') depth--;
  }
  
  if (depth !== 0) return [];
  const arrayText = text.substring(arrayStart, pos + 1);
  try {
    return new Function('return ' + arrayText)();
  } catch (e) {
    console.error('Failed to parse NOTES_DATA:', e);
    return [];
  }
}

// ============ RENDERING ============
function renderList() {
  const notes = currentView === 'live' ? liveNotes : queueNotes;
  if (notes.length === 0) {
    listView.innerHTML = '<div class="empty">No notes yet. Click "+ New Note" to create one.</div>';
    return;
  }
  listView.innerHTML = notes.map((n, i) => `
    <div class="note-item" data-index="${i}">
      <span class="date">${currentView === 'queue' ? '⏳ ' + (n.publishDate || n.date) : n.date}</span>
      <span class="title">${escapeHtml(n.title)}</span>
      <div class="actions">
        <button class="icon-btn" data-action="edit" data-index="${i}" title="Edit">✎</button>
        <button class="icon-btn danger" data-action="delete" data-index="${i}" title="Delete">✕</button>
      </div>
    </div>
  `).join('');
  
  // Bind events
  listView.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', () => editNote(parseInt(btn.dataset.index)));
  });
  listView.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => deleteNote(parseInt(btn.dataset.index)));
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function updateCounts() {
  liveCount.textContent = liveNotes.length;
  queueCount.textContent = queueNotes.length;
}

// ============ VIEW SWITCHING ============
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentView = tab.dataset.view;
    publishDateGroup.style.display = currentView === 'queue' ? 'flex' : 'none';
    hideEditor();
    renderList();
  });
});

// ============ EDITOR ============
btnNew.addEventListener('click', () => {
  isNewNote = true;
  editingIndex = -1;
  $('edTitle').value = '';
  $('edDate').value = new Date().toISOString().slice(0, 10);
  $('edPublishDate').value = '';
  $('edDesc').value = '';
  $('edContent').value = '';
  $('btnDelete').style.display = 'none';
  updatePreview();
  showEditor();
});

function editNote(index) {
  isNewNote = false;
  editingIndex = index;
  const notes = currentView === 'live' ? liveNotes : queueNotes;
  const note = notes[index];
  $('edTitle').value = note.title || '';
  $('edDate').value = note.date || '';
  $('edPublishDate').value = note.publishDate || '';
  $('edDesc').value = note.desc || '';
  $('edContent').value = note.content || '';
  $('btnDelete').style.display = '';
  updatePreview();
  showEditor();
}

function showEditor() {
  listView.style.display = 'none';
  editorView.classList.add('active');
}

function hideEditor() {
  listView.style.display = '';
  editorView.classList.remove('active');
}

$('btnCancel').addEventListener('click', hideEditor);

// ============ PREVIEW ============
$('edContent').addEventListener('input', updatePreview);

function updatePreview() {
  const raw = $('edContent').value;
  if (!raw) { preview.innerHTML = '<span style="color:var(--ink-faint)">Preview will appear here...</span>'; return; }
  try {
    preview.innerHTML = parseNoteContent(raw);
  } catch (e) {
    preview.innerHTML = '<span style="color:#e06060">Preview error: ' + escapeHtml(e.message) + '</span>';
  }
}

// ============ SAVE ============
$('btnSave').addEventListener('click', async () => {
  if (!dirHandle) { alert('Please open the project first.'); return; }
  
  const note = {
    date: $('edDate').value.trim(),
    title: $('edTitle').value.trim(),
    desc: $('edDesc').value.trim(),
    content: $('edContent').value
  };
  
  if (currentView === 'queue') {
    note.publishDate = $('edPublishDate').value.trim() || note.date;
  }
  
  if (!note.title || !note.date || !note.content) {
    alert('Title, date, and content are required.');
    return;
  }
  
  const notes = currentView === 'live' ? liveNotes : queueNotes;
  
  if (isNewNote) {
    notes.unshift(note);
  } else {
    notes[editingIndex] = note;
  }
  
  try {
    if (currentView === 'live') {
      await saveLiveNotes();
    } else {
      await writeJSON('notes/queue.json', queueNotes);
    }
    status.textContent = 'Saved ✓';
    setTimeout(() => { status.textContent = 'Project opened'; }, 2000);
    hideEditor();
    renderList();
    updateCounts();
  } catch (e) {
    alert('Save failed: ' + e.message);
  }
});

async function saveLiveNotes() {
  // Reconstruct data.js with updated NOTES_DATA
  const text = await readTextFile('notes/data.js');
  
  // Find the array boundaries
  const start = text.indexOf('const NOTES_DATA = [');
  const arrayStart = start + 'const NOTES_DATA = '.length;
  let pos = arrayStart;
  let depth = 1;
  let inTemplate = false, inString = false, stringChar = '', inLineComment = false;
  
  while (pos < text.length && depth > 0) {
    pos++;
    const ch = text[pos];
    const prev = pos > 0 ? text[pos - 1] : '';
    if (inTemplate) { if (ch === '`' && prev !== '\\\\') inTemplate = false; continue; }
    if (inString) { if (ch === stringChar && prev !== '\\\\') inString = false; continue; }
    if (inLineComment) { if (ch === '\n') inLineComment = false; continue; }
    if (ch === '`') { inTemplate = true; continue; }
    if (ch === '"' || ch === "'") { inString = true; stringChar = ch; continue; }
    if (ch === '/' && text[pos + 1] === '/') { inLineComment = true; continue; }
    if (ch === '[' || ch === '{') depth++;
    if (ch === ']' || ch === '}') depth--;
  }
  
  const arrayEnd = pos + 1; // after ]
  
  // Serialize NOTES_DATA back to JS
  const newArray = serializeNotes(liveNotes);
  const newText = text.substring(0, arrayStart) + newArray + text.substring(arrayEnd);
  
  await writeTextFile('notes/data.js', newText);
}

function serializeNotes(notes) {
  const items = notes.map(n => {
    const content = n.content.replace(/`/g, '\\`').replace(/\$/g, '\\$');
    return `{
    date:'${n.date}',
    title:'${n.title.replace(/'/g, "\\'")}',
    desc:'${n.desc.replace(/'/g, "\\'")}',
    content:\`${content}\`
  }`;
  });
  return '[\n  ' + items.join(',\n  ') + '\n]';
}

// ============ DELETE ============
$('btnDelete').addEventListener('click', async () => {
  if (!confirm('Delete this note?')) return;
  const notes = currentView === 'live' ? liveNotes : queueNotes;
  notes.splice(editingIndex, 1);
  
  try {
    if (currentView === 'live') {
      await saveLiveNotes();
    } else {
      await writeJSON('notes/queue.json', queueNotes);
    }
    status.textContent = 'Deleted ✓';
    setTimeout(() => { status.textContent = 'Project opened'; }, 2000);
    hideEditor();
    renderList();
    updateCounts();
  } catch (e) {
    alert('Delete failed: ' + e.message);
  }
});

function deleteNote(index) {
  const notes = currentView === 'live' ? liveNotes : queueNotes;
  if (!confirm('Delete "' + notes[index].title + '"?')) return;
  notes.splice(index, 1);
  
  if (currentView === 'live') {
    saveLiveNotes().then(() => {
      renderList(); updateCounts();
    });
  } else {
    writeJSON('notes/queue.json', queueNotes).then(() => {
      renderList(); updateCounts();
    });
  }
}
</script>
</body>
</html>
```

- [ ] **Step 2: Test admin.html**

Open `admin.html` in a browser that supports File System Access API (Chrome/Edge). Click "Open Project", select the repo root. Verify:
- Live Notes tab shows current notes from data.js
- Queue tab is empty
- Can create a new note
- Can edit a note
- Can delete a note
- Preview updates as you type markdown

- [ ] **Step 3: Commit**

```bash
git add admin.html
git commit -m "feat: add local notes admin panel"
```

---

### Task 7: End-to-end test

- [ ] **Step 1: Test the full flow**

1. Open `admin.html`, create a scheduled note with `publishDate` set to today
2. Verify it appears in `notes/queue.json`
3. Run `node scripts/publish.js` locally
4. Verify the note moved to `notes/auto-published.json` and removed from queue
5. Open `index.html` in a local server, verify the note appears in the notes section
6. Test the subscription link opens a pre-filled GitHub Issue

- [ ] **Step 2: Push all changes**

```bash
git push
```

- [ ] **Step 3: Verify GitHub Action**

After pushing, go to GitHub Actions tab and manually trigger "Publish Scheduled Notes" workflow to verify it works.

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: e2e test adjustments"
git push
```