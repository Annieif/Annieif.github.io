/* =====================================================
   NOTES DATA — 所有笔记的单一数据源
   新增笔记：只需在数组头部追加一条即可
   必填字段: date, title, desc, content
   id 和 preview 自动生成，无需手动填写
   content 支持纯文本格式（自动转 HTML），规则：
     ## 标题  →  <h2>      ### 标题  →  <h3>
     - 列表   →  <ul><li>  1. 列表  →  <ol><li>
     **粗体** →  <strong>  *斜体* →  <em>
     `代码`  →  <code>    ```  →  <pre><code>
     > 引用   →  <blockquote>   ---  →  <hr>
     空行分隔段落
   ===================================================== */

// 轻量 Markdown → HTML 解析器
function parseNoteContent(text) {
  if (!text) return '';
  // 如果已经是 HTML，直接返回
  if (/<[a-z][\s\S]*>/i.test(text)) return text;

  let html = text;

  // 代码块 ```...```
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

  // 行内代码 `...`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 粗体 / 斜体
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // 水平线 ---
  html = html.replace(/^---\s*$/gm, '<hr>');

  // 引用 > ...
  html = html.replace(/^&gt;\s?(.+)$/gm, '<blockquote>$1</blockquote>');

  // 标题 h3 / h2
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');

  // 无序列表 - ...
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>[\s\S]*?<\/li>\s*)+)/g, '<ul>$1</ul>');

  // 有序列表 1. ...
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // 段落：双换行分隔
  html = html.replace(/\n\n+/g, '</p><p>');
  html = '<p>' + html + '</p>';

  // 清理
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<p>(<h[23])/g, '$1');
  html = html.replace(/(<\/h[23]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<hr>)<\/p>/g, '$1');
  html = html.replace(/<p>(<blockquote>[\s\S]*?<\/blockquote>)<\/p>/g, '$1');
  html = html.replace(/<p>(<pre>[\s\S]*?<\/pre>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ul>[\s\S]*?<\/ul>)<\/p>/g, '$1');

  return html;
}

// 自动生成 preview：取正文第一段纯文本
function autoPreview(content) {
  if (!content) return '';
  const plain = content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const match = plain.match(/^(.+?[。！？.!?])\s*/);
  if (match) return match[1];
  return plain.slice(0, 80);
}

const NOTES_DATA = [
  {
    date:'2026-06-20',
    title:'笔记标题 01',
    desc:'简短的描述 — 显示在首页列表中',
    content:'这是笔记正文的第一句话，会在折叠展开时预览。\n\n这是正文的第二段。支持 Markdown 风格的简单排版。\n\n## 第一章节\n\n当你使用 `## 标题` 时，左侧目录会自动生成对应条目。\n\n### 小节\n\n`### 标题` 也会被目录收录，以缩进形式显示。\n\n## 代码示例\n\n```\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n```\n\n行内代码：`console.log("hello")`。\n\n## 引用与列表\n\n> 一段引用文字\n\n- 列表项 1\n- 列表项 2\n- 列表项 3\n\n1. 有序列表 1\n2. 有序列表 2\n\n---\n\n## 结尾\n\n笔记结尾。**粗体**和*斜体*也支持。'
  },
  {
    date:'2026-06-18',
    title:'笔记标题 02',
    desc:'另一篇笔记的简短描述',
    content:'另一篇笔记的开头第一句话。\n\n## 第一节\n\n内容待补充。\n\n## 第二节\n\n更多内容。'
  },
  {
    date:'2026-06-15',
    title:'笔记标题 03',
    desc:'第三篇笔记的简短描述',
    content:'第三篇笔记正文。\n\n## 概述\n\n正文内容。'
  },
  {
    date:'2026-06-12',
    title:'笔记标题 04',
    desc:'第四篇笔记的简短描述',
    content:'第四篇笔记正文。'
  },
  {
    date:'2026-06-10',
    title:'笔记标题 05',
    desc:'第五篇笔记的简短描述',
    content:'第五篇笔记正文。'
  },
  {
    date:'2026-06-07',
    title:'笔记标题 06',
    desc:'第六篇笔记的简短描述',
    content:'第六篇笔记正文。'
  },
  {
    date:'2026-06-05',
    title:'笔记标题 07',
    desc:'第七篇笔记的简短描述',
    content:'第七篇笔记正文。'
  },
  {
    date:'2026-06-02',
    title:'笔记标题 08',
    desc:'第八篇笔记的简短描述',
    content:'第八篇笔记正文。'
  },
  {
    date:'2026-05-28',
    title:'笔记标题 09',
    desc:'第九篇笔记的简短描述',
    content:'第九篇笔记正文。'
  },
  {
    date:'2026-05-25',
    title:'笔记标题 10',
    desc:'第十篇笔记的简短描述',
    content:'第十篇，示范大量笔记的分页效果。'
  },
  {
    date:'2026-05-20',
    title:'笔记标题 11',
    desc:'第十一篇笔记的简短描述',
    content:'第十一篇笔记正文。'
  },
  {
    date:'2026-05-15',
    title:'笔记标题 12',
    desc:'第十二篇笔记的简短描述',
    content:'第十二篇笔记正文。'
  }
];

// 后处理：自动生成 id 和 preview，转换 content 为 HTML
NOTES_DATA.forEach((n, i) => {
  if (!n.id) n.id = String(i + 1).padStart(3, '0');
  if (!n.preview) n.preview = autoPreview(n.content);
  n.content = parseNoteContent(n.content);
});