/* =====================================================
   core.js — 共享的笔记渲染工具 (notes/ 模块核心)
   提供 parseNoteContent / autoPreview 两个工具函数
   在浏览器中暴露为全局变量 window.NoteCore
   ===================================================== */

(function () {

  /** Parse a note body string into HTML. Supports:
   * ## / ### for headings, --- for horizontal rules,
   * blockquotes (> text), ordered and unordered lists,
   * tables (|h|h| |---|---| |d|d|), paragraphs,
   * inline `code`, **bold**, *italic*, ==highlight==,
   * and fenced code blocks: ```lang\ncode\n```. */
  function parseNoteContent(text) {
    if (!text) return '';
    let html = String(text);

    // 1) Fenced code blocks → protect and convert to <pre><code>
    const preBlocks = [];
    html = html.replace(/```([\w-]*)\n([\s\S]*?)```/g, function (m, lang, code) {
      preBlocks.push({ lang: lang || '', body: code });
      return '\n\n---PREBLOCK' + (preBlocks.length - 1) + '---\n\n';
    });

    // 2) escape < and > so raw HTML chars in text don't break rendering
    html = html.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // 3) inline code via `…`
    html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

    // 4) headings
    html = html.replace(/^###[ \t]+(.+?)[ \t]*$/gm, '<h3>$1</h3>');
    html = html.replace(/^##[ \t]+(.+?)[ \t]*$/gm, '<h2>$1</h2>');
    html = html.replace(/^-{3,}[ \t]*$/gm, '<hr>');

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

    // 6) blockquotes: lines starting with "> "
    html = html.replace(/^&gt;[ \t]?(.+)$/gm, '<blockquote>$1</blockquote>');

    // 7) lists — parse list item lines
    html = html.replace(/^\s*(\d+)\.[ \t]+(.+)$/gm, '<li data-ol="1">$2</li>');
    html = html.replace(/^\s*[*\-][ \t]+(.+)$/gm, '<li>$1</li>');

    // wrap consecutive <li data-ol="1">...</li> in <ol>
    html = html.replace(/((?:<li data-ol="1">[\s\S]*?<\/li>\s*)+)/g,
      function (m) { return '<ol>' + m.replace(/ data-ol="1"/g, '') + '</ol>'; });

    // wrap consecutive plain <li>...</li> in <ul>
    html = html.replace(/((?:<li>[\s\S]*?<\/li>\s*)+)/g, '<ul>$1</ul>');

    // 8) restore placeholders for fenced code & tables
    html = html.replace(/---PREBLOCK(\d+)---/g, function (m, idx) {
      const b = preBlocks[parseInt(idx, 10)];
      return '<pre><code' + (b.lang ? ' class="lang-' + b.lang + '"' : '')
           + '>' + b.body.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</code></pre>';
    });
    html = html.replace(/---TABLE(\d+)---/g, function (m, idx) { return tableBlocks[parseInt(idx, 10)]; });

    // 9) protect <pre><code> and inline <code> from further processing
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

    // 10) links: [text](url) — parse before bold/italic/highlight so they don't interfere
    html = html.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, function (m, text, url) {
      const safeUrl = url.replace(/"/g, '&quot;');
      const isExternal = /^https?:\/\//i.test(url);
      return '<a href="' + safeUrl + '"' + (isExternal ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + text + '</a>';
    });

    // 11) bold / italic / highlight
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(^|[^*])\*([^*\s][^*]*?)\*(?=[^*]|$)/g, '$1<em>$2</em>');
    html = html.replace(/==([^=\n]+)==/g, '<mark>$1</mark>');

    // 12) restore protected code blocks
    html = html.replace(/---INLINECODE(\d+)---/g, function (m, idx) {
      const p = protectedCode[parseInt(idx, 10)];
      if (p.tag === 'pre') return '<pre><code>' + p.body + '</code></pre>';
      return '<code>' + p.body + '</code>';
    });

    // 13) paragraph wrap for remaining double-newline-separated blocks
    const BLOCK_TAG_RE = /<(?:h[23]|p|pre|blockquote|hr|ul|ol|li|table|thead|tbody|tr|th|td)\b/i;
    html = html.split(/\n{2,}/).map(function (block) {
      block = block.trim();
      if (!block) return '';
      if (BLOCK_TAG_RE.test(block)) return block;
      return '<p>' + block.replace(/\n/g, ' ') + '</p>';
    }).join('\n');

    return html;
  }

  /** Build a short preview (plain text) from a note body. */
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

  /** Derive a filesystem-safe slug from a note title. */
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

  window.NoteCore = {
    parseNoteContent: parseNoteContent,
    autoPreview: autoPreview,
    slugify: slugify
  };

})();
