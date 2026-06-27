/* ================================================================
   build.js — 笔记构建脚本
   1) 扫描 notes/_scheduled/，把 publishDate <= today 的草稿移到 notes/
   2) 扫描 notes/*.json（排除 _index.json），生成 notes/_index.json
   3) 生成根目录 feed.xml（RSS 2.0）
   4) 生成根目录 feed.html（静态订阅页，自包含无外部 JS）
   ================================================================ */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const NOTES_DIR = path.join(ROOT, 'notes');
const SCHEDULED_DIR = path.join(NOTES_DIR, '_scheduled');
const INDEX_PATH = path.join(NOTES_DIR, '_index.json');
const FEED_XML_PATH = path.join(ROOT, 'feed.xml');
const FEED_HTML_PATH = path.join(ROOT, 'feed.html');

const SITE_URL = 'https://annieif.github.io/';
const FEED_URL = 'https://annieif.github.io/feed.xml';
const NOTE_BASE_URL = 'https://annieif.github.io/notes/note.html?slug=';

// ===================================================================
// 工具函数 — parseNoteContent / autoPreview 从 core.js 内联
// ===================================================================
function parseNoteContent(text) {
  if (!text) return '';
  let html = String(text);

  // 1) Fenced code blocks → protect
  const preBlocks = [];
  html = html.replace(/```([\w-]*)\n([\s\S]*?)```/g, function (m, lang, code) {
    preBlocks.push({ lang: lang || '', body: code });
    return '\n\n---PREBLOCK' + (preBlocks.length - 1) + '---\n\n';
  });

  // 2) escape < and >
  html = html.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // 3) inline code via `…`
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

  // 4) headings & hr
  html = html.replace(/^###[ \t]+(.+?)[ \t]*$/gm, '<h3>$1</h3>');
  html = html.replace(/^##[ \t]+(.+?)[ \t]*$/gm, '<h2>$1</h2>');
  html = html.replace(/-{3,}[ \t]*$/gm, '<hr>');

  // 5) tables
  const tableBlocks = [];
  const tlines = html.split('\n');
  const tnewLines = [];
  for (let i = 0; i < tlines.length; i++) {
    if (/^\s*\|.+\|\s*$/.test(tlines[i])
        && i + 1 < tlines.length
        && /^\s*\|[\s:\-|]+\|\s*$/.test(tlines[i + 1])) {
      const rows = [tlines[i], tlines[i + 1]];
      let j = i + 2;
      while (j < tlines.length && /^\s*\|.+\|\s*$/.test(tlines[j])) {
        rows.push(tlines[j]);
        j++;
      }
      const splitRow = (row) => row.trim().split('|').slice(1, -1).map((c) => c.trim());
      const headers = splitRow(rows[0]);
      let tbl = '<table><thead><tr>';
      headers.forEach((h) => (tbl += '<th>' + h + '</th>'));
      tbl += '</tr></thead><tbody>';
      for (let k = 2; k < rows.length; k++) {
        tbl += '<tr>';
        splitRow(rows[k]).forEach((c) => (tbl += '<td>' + c + '</td>'));
        tbl += '</tr>';
      }
      tbl += '</tbody></table>';
      tableBlocks.push(tbl);
      tnewLines.push('---TABLE' + (tableBlocks.length - 1) + '---');
      i = j - 1;
    } else {
      tnewLines.push(tlines[i]);
    }
  }
  html = tnewLines.join('\n');

  // 6) blockquotes
  html = html.replace(/^&gt;[ \t]?(.+)$/gm, '<blockquote>$1</blockquote>');

  // 7) lists
  html = html.replace(/^\s*(\d+)\.[ \t]+(.+)$/gm, '<li data-ol="1">$2</li>');
  html = html.replace(/^\s*[*\-][ \t]+(.+)$/gm, '<li>$1</li>');

  html = html.replace(/((?:<li data-ol="1">[\s\S]*?<\/li>\s*)+)/g,
    function (m) { return '<ol>' + m.replace(/ data-ol="1"/g, '') + '</ol>'; });

  html = html.replace(/((?:<li>[\s\S]*?<\/li>\s*)+)/g, '<ul>$1</ul>');

  // 8) restore fenced code & tables
  html = html.replace(/---PREBLOCK(\d+)---/g, function (m, idx) {
    const b = preBlocks[parseInt(idx, 10)];
    return '<pre><code' + (b.lang ? ' class="lang-' + b.lang + '"' : '')
         + '>' + b.body.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</code></pre>';
  });
  html = html.replace(/---TABLE(\d+)---/g, function (m, idx) { return tableBlocks[parseInt(idx, 10)]; });

  // 9) protect <pre><code> and inline <code>
  const protectedCode = [];
  html = html.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g,
    function (m, inner) {
      protectedCode.push({ tag: 'pre', body: inner });
      return '---INLINECODE' + (protectedCode.length - 1) + '---';
    });
  html = html.replace(/<code>([^<]*)<\/code>/g, function (m, inner) {
    protectedCode.push({ tag: 'code', body: inner });
    return '---INLINECODE' + (protectedCode.length - 1) + '---';
  });

  // 10) bold / italic / highlight
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^*])\*([^*\s][^*]*?)\*(?=[^*]|$)/g, '$1<em>$2</em>');
  html = html.replace(/==([^=\n]+)==/g, '<mark>$1</mark>');

  // 11) restore protected code
  html = html.replace(/---INLINECODE(\d+)---/g, function (m, idx) {
    const p = protectedCode[parseInt(idx, 10)];
    if (p.tag === 'pre') return '<pre><code>' + p.body + '</code></pre>';
    return '<code>' + p.body + '</code>';
  });

  // 12) paragraph wrap
  const BLOCK_TAG_RE = /<(?:h[23]|p|pre|blockquote|hr|ul|ol|li|table|thead|tbody|tr|th|td)\b/i;
  html = html.split(/\n{2,}/).map(function (block) {
    block = block.trim();
    if (!block) return '';
    if (BLOCK_TAG_RE.test(block)) return block;
    return '<p>' + block.replace(/\n/g, ' ') + '</p>';
  }).join('\n');

  return html;
}

function autoPreview(content) {
  if (!content) return '';
  const plain = String(content)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[#>*=_\-`|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const m = plain.match(/^(.+?)[。！？.!?]\s*/);
  if (m) return m[1];
  return plain.length > 120 ? plain.slice(0, 120) + '…' : plain;
}

function pad(n) { return n < 10 ? '0' + n : '' + n; }
function toRFC822(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return days[d.getUTCDay()] + ', '
       + pad(d.getUTCDate()) + ' ' + months[d.getUTCMonth()] + ' ' + d.getUTCFullYear()
       + ' 12:00:00 GMT';
}
function todayISO() {
  const d = new Date();
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
}

// ===================================================================
// 阶段 1：从 notes/_scheduled/ 移动到期草稿
// ===================================================================
function moveScheduledToPublished() {
  if (!fs.existsSync(SCHEDULED_DIR)) {
    fs.mkdirSync(SCHEDULED_DIR, { recursive: true });
    console.log('[scheduled] 目录不存在，已创建：' + SCHEDULED_DIR);
    return 0;
  }

  const today = todayISO();
  const files = fs.readdirSync(SCHEDULED_DIR).filter(f => f.endsWith('.json'));
  let moved = 0;

  for (const file of files) {
    const filePath = path.join(SCHEDULED_DIR, file);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      console.log('[scheduled] 解析失败，跳过：' + file);
      continue;
    }

    // 支持两种形式：
    // ① publishDate 字段
    // ② 文件名形如 2026-06-21-my-slug.json → 从文件名第一段日期推断
    let publishDate = data.publishDate || null;
    if (!publishDate) {
      const m = file.match(/^(\d{4}-\d{2}-\d{2})-/);
      if (m) publishDate = m[1];
    }
    if (!publishDate || publishDate > today) continue;

    // 从 data 中移除 publishDate（只用于调度，不进入正文）
    delete data.publishDate;

    // 生成目标文件名：从原文件名中去除 publishDate 相关前缀，
    // 保留 date-title slug 模式（date 取 data.date，否则用 publishDate）
    const date = data.date || publishDate;
    // 尝试从原文件名抽取 slug（去掉日期前缀与 .json）
    let slugPart = file.replace(/\.json$/, '');
    const prefixMatch = slugPart.match(/^\d{4}-\d{2}-\d{2}-(.*)$/);
    if (prefixMatch && prefixMatch[1]) {
      slugPart = prefixMatch[1];
    } else {
      // 兜底：用标题 slugify
      slugPart = slugify(data.title || 'untitled');
    }
    const targetName = date + '-' + slugPart + '.json';
    const targetPath = path.join(NOTES_DIR, targetName);

    if (!data.date) data.date = date;

    fs.writeFileSync(targetPath, JSON.stringify(data, null, 2) + '\n');
    fs.unlinkSync(filePath);
    console.log('[scheduled] → notes/' + targetName);
    moved++;
  }

  return moved;
}

function slugify(title) {
  if (!title) return 'untitled';
  const safe = String(title)
    .trim()
    .toLowerCase()
    .replace(/[·\s—–_/\\]+/g, '-')
    .replace(/[^a-z0-9\-\u4e00-\u9fff]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return safe || 'untitled';
}

// ===================================================================
// 阶段 2：读取 notes/ 中所有 .json → 生成 _index.json
// ===================================================================
function readPublishedNotes() {
  if (!fs.existsSync(NOTES_DIR)) return [];
  const files = fs.readdirSync(NOTES_DIR).filter(f => f.endsWith('.json') && f !== '_index.json');
  const notes = [];

  for (const file of files) {
    const slug = file.replace(/\.json$/, '');
    const filePath = path.join(NOTES_DIR, file);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      console.log('[warn] 解析失败：' + file);
      continue;
    }

    // 只收录有合法 date 的笔记文件，忽略 queue/auto-published 等数据文件
    if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) continue;

    notes.push({
      slug: slug,
      date: data.date,
      title: data.title || '',
      desc: data.desc || autoPreview(data.content || ''),
      preview: autoPreview(data.content || ''),
    });
  }

  notes.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return notes;
}

// ===================================================================
// 阶段 3：生成 feed.xml (RSS 2.0)
// ===================================================================
function buildFeedXML(notes) {
  const now = toRFC822(todayISO());
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
          + '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n'
          + '  <channel>\n'
          + '    <title>Annieif · 笔记订阅</title>\n'
          + '    <link>' + SITE_URL + '</link>\n'
          + '    <atom:link href="' + FEED_URL + '" rel="self" type="application/rss+xml"/>\n'
          + '    <description>独立造物者的笔记 — 美中不足，好事多磨。</description>\n'
          + '    <language>zh-CN</language>\n'
          + '    <lastBuildDate>' + now + '</lastBuildDate>\n';

  for (const note of notes) {
    const link = NOTE_BASE_URL + note.slug;
    const pubDate = note.date ? toRFC822(note.date) : now;
    // 读取完整 content 渲染为 HTML 放入 CDATA
    const contentPath = path.join(NOTES_DIR, note.slug + '.json');
    let htmlDesc = '';
    try {
      const full = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
      htmlDesc = parseNoteContent(full.content || '');
    } catch (e) {}
    xml += '\n'
         + '    <item>\n'
         + '      <title>' + escapeXML(note.title) + '</title>\n'
         + '      <link>' + link + '</link>\n'
         + '      <pubDate>' + pubDate + '</pubDate>\n'
         + '      <guid isPermaLink="false">' + escapeXML(note.slug) + '</guid>\n'
         + '      <description><![CDATA[' + htmlDesc + ']]></description>\n'
         + '    </item>\n';
  }

  xml += '\n  </channel>\n</rss>\n';
  return xml;
}

function escapeXML(s) {
  return String(s).replace(/[<>&'"]/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
  }[c]));
}

// ===================================================================
// 阶段 4：生成 feed.html（自包含静态页）
// ===================================================================
function buildFeedHTML(notes) {
  // 生成每一条笔记块
  let itemsHTML = '';
  for (const note of notes) {
    const contentPath = path.join(NOTES_DIR, note.slug + '.json');
    let htmlContent = '';
    try {
      const full = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
      htmlContent = parseNoteContent(full.content || '');
    } catch (e) {}
    const parts = note.date.split('-');
    const dateText = parts[1] + '.' + parts[2] + ' · ' + parts[0];
    const url = NOTE_BASE_URL + note.slug;
    itemsHTML += `
  <article class="item">
    <div class="meta">
      <span class="dot">◆</span><span>${dateText}</span><span>·</span><span>note</span>
    </div>
    <h2><a href="${url}">${note.title}</a></h2>
    <p style="color:var(--ink-dim);font-size:16px;margin-bottom:18px">${note.desc || ''}</p>
    ${htmlContent}
    <a class="read-more" href="${url}">在主站阅读全文 →</a>
  </article>`;
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RSS · Annieif 笔记订阅</title>
<style>
:root{
  --bg:#0a0a0a;
  --ink:#e8e4dd;
  --ink-dim:#b8b0a4;
  --ink-faint:#7d7565;
  --accent:#f4c2d0;
  --line:rgba(232,228,221,.10);
  --card:#13111a;
  --card-hover:rgba(244,194,208,.04);
}
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:var(--bg);color:var(--ink);font-family:'Fraunces','Noto Serif SC',Georgia,serif}
body{
  min-height:100vh;
  line-height:1.7;
  font-size:16px;
  background:
    radial-gradient(1200px 600px at 80% -10%, rgba(244,194,208,.08), transparent 60%),
    radial-gradient(800px 400px at 10% 110%, rgba(122,180,216,.06), transparent 60%),
    var(--bg);
}
body::before{
  content:"";
  position:fixed;inset:0;
  background-image:
    radial-gradient(1px 1px at 15% 20%, rgba(232,228,221,.5) 50%, transparent 100%),
    radial-gradient(1px 1px at 45% 35%, rgba(244,194,208,.4) 50%, transparent 100%),
    radial-gradient(1px 1px at 70% 15%, rgba(232,228,221,.35) 50%, transparent 100%),
    radial-gradient(1px 1px at 25% 60%, rgba(232,228,221,.3) 50%, transparent 100%),
    radial-gradient(1px 1px at 85% 55%, rgba(122,180,216,.35) 50%, transparent 100%),
    radial-gradient(1px 1px at 55% 80%, rgba(244,194,208,.3) 50%, transparent 100%),
    radial-gradient(1px 1px at 10% 85%, rgba(232,228,221,.25) 50%, transparent 100%),
    radial-gradient(1px 1px at 90% 90%, rgba(232,228,221,.3) 50%, transparent 100%),
    radial-gradient(1px 1px at 65% 50%, rgba(232,228,221,.2) 50%, transparent 100%),
    radial-gradient(1px 1px at 35% 45%, rgba(244,194,208,.2) 50%, transparent 100%);
  pointer-events:none;
  z-index:0;
}
.wrap{
  position:relative;z-index:1;
  max-width:860px;margin:0 auto;padding:80px 40px 60px;
}
.breadcrumb{
  font-family:'JetBrains Mono',monospace;
  font-size:12px;letter-spacing:.1em;text-transform:uppercase;
  color:var(--ink-faint);margin-bottom:30px;
}
.breadcrumb a{color:var(--ink-dim);text-decoration:none}
.breadcrumb a:hover{color:var(--accent)}
.breadcrumb span{margin:0 10px;color:var(--ink-faint)}
.head{
  border-bottom:1px solid var(--line);
  padding-bottom:40px;margin-bottom:50px;
  position:relative;
}
.badge{
  display:inline-block;
  font-family:'JetBrains Mono',monospace;
  font-size:11px;letter-spacing:.15em;text-transform:uppercase;
  color:var(--accent);padding:6px 14px;border:1px solid var(--line);border-radius:2px;
  margin-bottom:24px;
}
.head h1{
  font-size:48px;font-weight:500;line-height:1.2;letter-spacing:-.01em;margin-bottom:20px;
}
.head h1 em{color:var(--accent);font-style:italic;font-weight:400}
.head p{
  font-size:17px;color:var(--ink-dim);max-width:620px;
}
.subscribe{
  margin-top:32px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;
}
.sub-code{
  flex:1;min-width:280px;
  background:var(--card);border:1px solid var(--line);border-radius:6px;
  padding:14px 18px;
  font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--ink-dim);
  word-break:break-all;
}
.sub-copy{
  background:transparent;border:1px solid var(--line);color:var(--ink);
  padding:14px 22px;border-radius:6px;font-family:'JetBrains Mono',monospace;
  font-size:12px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;
  transition:all .2s;
}
.sub-copy:hover{border-color:var(--accent);color:var(--accent)}
.options{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:18px}
.opt{
  display:flex;gap:14px;align-items:center;
  background:var(--card);border:1px solid var(--line);border-radius:8px;
  padding:14px 16px;text-decoration:none;color:inherit;
  transition:all .2s;
}
.opt:hover{border-color:var(--accent);background:var(--card-hover);transform:translateY(-1px)}
.opt .ico{
  width:36px;height:36px;flex:0 0 36px;
  background:var(--accent);color:#1a1018;border-radius:6px;
  display:flex;align-items:center;justify-content:center;
  font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;
}
.opt .t{font-size:14px;font-weight:500;color:var(--ink)}
.opt .m{font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--ink-faint);margin-top:2px;letter-spacing:.02em}

.item{
  padding:34px 0;border-bottom:1px solid var(--line);
}
.item:last-child{border-bottom:none}
.meta{
  font-family:'JetBrains Mono',monospace;
  font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;
  color:var(--ink-faint);margin-bottom:14px;
  display:flex;gap:18px;align-items:center;
}
.meta .dot{color:var(--accent)}
.item h2{
  font-size:30px;font-weight:500;line-height:1.25;margin-bottom:16px;
  letter-spacing:-.01em;
}
.item h2 a{color:var(--ink);text-decoration:none;transition:color .2s}
.item h2 a:hover{color:var(--accent)}
.item h3{
  font-size:20px;font-weight:500;margin:28px 0 14px;color:var(--ink);
}
.item p{margin-bottom:14px}
.item code{
  font-family:'JetBrains Mono',monospace;font-size:13.5px;
  background:rgba(244,194,208,.06);padding:2px 6px;border-radius:3px;
  color:var(--accent);border:1px solid rgba(244,194,208,.12);
}
.item pre{
  background:#0d0b12;border:1px solid var(--line);padding:18px 20px;border-radius:6px;
  margin:18px 0;overflow-x:auto;font-family:'JetBrains Mono',monospace;font-size:12.5px;line-height:1.7;color:var(--ink-dim);
}
.item pre code{background:none;border:none;padding:0;color:inherit}
.item table{
  width:100%;border-collapse:collapse;margin:18px 0;font-size:14px;
}
.item table th,.item table td{
  padding:10px 14px;border-bottom:1px solid var(--line);text-align:left;
}
.item table th{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--ink-faint);letter-spacing:.08em;text-transform:uppercase;font-weight:500;border-bottom:1px solid var(--line);background:rgba(244,194,208,.02)}
.read-more{
  margin-top:24px;display:inline-flex;align-items:center;gap:8px;
  font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.1em;text-transform:uppercase;
  color:var(--accent);text-decoration:none;border-bottom:1px solid rgba(244,194,208,.3);padding-bottom:2px;
  transition:all .2s;
}
.read-more:hover{border-bottom-color:var(--accent)}

footer{
  margin-top:60px;padding-top:30px;border-top:1px solid var(--line);
  font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;
  color:var(--ink-faint);text-align:center;
}
footer a{color:var(--ink-dim);text-decoration:none}
footer a:hover{color:var(--accent)}

@media (max-width:640px){
  .wrap{padding:48px 22px 40px}
  .head h1{font-size:32px}
  .options{grid-template-columns:1fr}
  .item h2{font-size:22px}
}
</style>
</head>
<body>
<div class="wrap">
  <div class="breadcrumb">
    <a href="https://annieif.github.io">← annieif</a>
    <span>/</span>
    <a href="feed.xml">feed.xml</a>
    <span>/</span>
    <span style="color:var(--ink-dim)">notes</span>
  </div>

  <div class="head">
    <span class="badge">RSS 2.0 · UTF-8 · feed.xml</span>
    <h1>独立造物者的 <em>笔记订阅</em></h1>
    <p>选择你喜欢的方式关注更新 —— 所有内容都来自本站 <em>notes</em> 区。无广告、无追踪、纯静态托管。</p>

    <div class="subscribe">
      <div class="sub-code">https://annieif.github.io/feed.xml</div>
      <button class="sub-copy" onclick="copyLink(this)">复制</button>
    </div>

    <div class="options">
      <a class="opt" href="feed.xml">
        <div class="ico">✦</div>
        <div>
          <div class="t">RSS 2.0 · feed.xml</div>
          <div class="m">Feedly · Inoreader · NetNewsWire</div>
        </div>
      </a>
      <a class="opt" href="mailto:Qianlovean@outlook.com?subject=%E8%AE%A2%E9%98%85%20Annieif%20%E7%AC%94%E8%AE%B0%E6%9B%B4%E6%96%B0">
        <div class="ico">✉</div>
        <div>
          <div class="t">邮件订阅</div>
          <div class="m">Qianlovean@outlook.com</div>
        </div>
      </a>
    </div>
  </div>

  ${itemsHTML}

  <footer>
    annieif.github.io · <a href="feed.xml">feed.xml</a> · no ads · no tracking · statically hosted
  </footer>
</div>

<script>
function copyLink(btn){
  const txt = 'https://annieif.github.io/feed.xml';
  if(navigator.clipboard){
    navigator.clipboard.writeText(txt).then(()=>{
      const orig = btn.textContent; btn.textContent = '已复制 ✓'; btn.style.borderColor = 'var(--accent)'; btn.style.color = 'var(--accent)';
      setTimeout(()=>{btn.textContent=orig;btn.style.borderColor='';btn.style.color=''},1500);
    });
  } else {
    const ta = document.createElement('textarea'); ta.value=txt; document.body.appendChild(ta); ta.select();
    try{document.execCommand('copy');btn.textContent='已复制 ✓'}catch(e){alert(txt)}
    document.body.removeChild(ta);
  }
}
</script>
</body>
</html>`;
}

// ===================================================================
// 主流程
// ===================================================================
function main() {
  console.log('────────── build.js ──────────');
  console.log('项目根目录：' + ROOT);
  console.log('今天：' + todayISO());

  const moved = moveScheduledToPublished();
  console.log('[scheduled] 发布 ' + moved + ' 篇草稿');

  const notes = readPublishedNotes();
  console.log('[notes] 发现 ' + notes.length + ' 篇笔记');

  fs.writeFileSync(INDEX_PATH, JSON.stringify(notes, null, 2) + '\n');
  console.log('[index] 已写入 notes/_index.json');

  fs.writeFileSync(FEED_XML_PATH, buildFeedXML(notes));
  console.log('[xml] 已写入 feed.xml');

  fs.writeFileSync(FEED_HTML_PATH, buildFeedHTML(notes));
  console.log('[html] 已写入 feed.html');

  console.log('────────── 完成 ──────────');
}

main();
