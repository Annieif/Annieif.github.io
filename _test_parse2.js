const text2 = `一个零依赖的个人作品集站点 — 核心文件只有根目录的 \`index.html\`，其它一切内容都由它在浏览器中即时生成。

## 项目文件结构

文件按三类划分：入口文件、作品页、笔记系统。

| 类型 | 文件 | 说明 |
| :--- | :--- | :--- |
| **入口** | \`index.html\` | 主页、CSS、多语言字典、所有渲染逻辑 |
| **图标** | \`icon.png\` | 浏览器标签页与手机主屏图标 |
| **作品** | \`works/001.html\`、\`works/002.html\` … | 每一条作品的详情页，可独立访问 |
| **笔记数据** | \`notes/data.js\` | 所有笔记的纯文本，以 JS 数组形式维护 |
| **笔记模板** | \`notes/note.html\` | 所有笔记共用的渲染模板 |

> GitHub Pages 配置在仓库设置中指向 main 分支根目录 — 没有构建步骤，推送即发布。

## 主题与排版

整站的配色、字体与节奏都集中在 \`:root\` 的 CSS 变量中：

\`\`\`
  --bg:#0a0a0a            深黑底
  --ink:#e8e4dd           米黄文字（正文基调）
  --accent:#f4c2d0        粉调强调（高亮、链接悬停）
  --link:#7ab4d8          链接冷色，与粉调形成冷暖对比
  --line:rgba(232,228,221,.10)   分隔线
  --ease:cubic-bezier(.2,.8,.2,1)  统一缓动
\`\`\`

字体族三套各司其职：

- **Fraunces** — 正文与常规标题。可变字宽从 regular 到 black，在标题处撑出足够的分量。
- **Cormorant Garamond** — 斜体、引用、英雄区最显眼的那几行字。它的笔触偏薄、字尾细腻，用作装饰性标题能带来"杂志感"。
- **JetBrains Mono** — 所有技术性信息（时间戳、编号、代码、导航）。替换了之前的 IBM Plex Mono，JetBrains Mono 的连字和字符间距在窄栏中可读性更强，字符高度一致，便于代码块对齐。

> 关键判断：**只用一套字体族并不够**。三个字体分别覆盖"叙述—装饰—技术"三种语境，读者能从字形变化中感知内容的切换，而无需依赖字号层级。

## 页面骨架

主页 \`index.html\` 按顺序堆叠以下元素：

1. **星空层 \`.stars\`** — 5 层静态星点 + 7 颗流星。每层 tile 尺寸不同，产生视差感；呼吸动画通过 \`opacity\` 与缓慢位移叠加实现。
2. **自定义指针** — \`.cursor-dot\` 直接跟随鼠标坐标；\`.cursor-ring\` 用 \`requestAnimationFrame\` 做插值延迟跟随，在链接/按钮上放大并着色。
3. **英雄区 \`.hero\`** — 占据首屏，内含导航栏、动画大标题、引用文字。
4. **左侧页面目录 \`.page-toc\`** — 5 个编号节点，滚动到内容区时才淡入。
5. **各 section** — \`#about\`、\`#projects\`、\`#insights\`、\`#notes\`、\`#contact\`，每个 section 都由一个 \`sec-head\`（编号 + 大字标题）与一个内容容器组成。
6. **页脚** — 一句话声明。

## 多语言：零依赖 I18N

不使用任何 i18n 库。多语言由一个手写的 JS 对象驱动：

\`\`\`
I18N = {
  zh: { nav:{...}, sec:{...}, hero:{...}, about:{cards:[...]}, works:{items:[...]}, contact:{...} },
  en: { ... },
  ja: { ... },   ko: { ... },   es: { ... },
  fr: { ... },   ar: { ... },   ru: { ... }
};
\`\`\`

每个语言分支都包含同样的键结构：

| 字段 | 用途 |
| :--- | :--- |
| \`meta.*\` | 页头元信息、document.title |
| \`nav.*\` | 导航栏文字 |
| \`sec.*\` / \`sec.*Sub\` | 各 section 标题与副标题 |
| \`hero.*\` | 英雄区大标题（分行、分段）、引用文字 |
| \`about.cards\` | About 区 3 张卡片，含 label 与正文 |
| \`works.items\` | 作品列表，每条含 title、desc、tag、href |
| \`contact.*\` | 联系方式与 RSS 订阅说明 |
| \`marquee.items\` | 顶栏滚动标签，循环显示 |

> 设计决策：**所有语言共享同一套 HTML 骨架**，而我只在 DOM 文本层面做替换。这样，任何语言都能使用同一套样式系统，无需单独维护。

## 笔记系统：数据驱动

笔记数据独立于多语言字典，存在 \`notes/data.js\`。它是一个普通 JS 数组：

\`\`\`
[
  { date:'2026-06-20', title:'...', desc:'...', content:'纯文本，支持 Markdown 语法子集' },
  { ... }
]
\`\`\`

渲染流程：

1. **解析** — \`parseNoteContent()\` 把 Markdown 文本转化为 HTML 字符串。
2. **生成预览** — 取正文第一段，截断到合理长度。
3. **生成 ID** — 按顺序自动编号为 \`001\`、\`002\`、\`003\`。
4. **列表渲染** — \`renderNotesFeed()\` 在笔记区生成可折叠条目列表。
5. **详情页渲染** — 当用户点击 "阅读全文" 或点击列表条目时，\`renderNotePage()\` 动态构建文章详情页，包含目录、标题、日期标签、正文渲染结果、返回按钮。
6. **路由** — \`location.hash\` 决定当前是主页视图 (\`#/\`) 还是某条笔记 (\`#/notes/001\`)。

## 性能考量

- **零依赖**：不加载任何第三方 JS 库或 CSS 框架。
- **静态输出**：GitHub Pages 提供静态文件，无构建步骤。
- **Canvas 星空**：约 150 个星点在单个 Canvas 上绘制，只在 resize 时重绘。
- **光标跟随**：throttle 到约 30fps，ring 用 lerp 做缓动跟随。
- **列表条目**：使用原生 DOM 操作 (\`createElement\`) 而非 \`innerHTML\`，避免重排与潜在 XSS。
- **Markdown 解析**：手写轻量子集 parser，约 100 行，覆盖常见格式。

## 维护速查

| 操作 | 位置 |
| :--- | :--- |
| **新增笔记** | \`notes/data.js\`：在 NOTES_DATA 数组头部追加一个对象即可 |
| **新增语言** | \`index.html\`：\`I18N\` 中加一个分支，\`langSwitch\` 按钮行中加按钮，\`langMap\` 中登记映射 |
| **改配色** | \`index.html\`：\`:root\` 里的 CSS 变量 |
| **改字体** | \`index.html\`：顶部 \`<link>\` 中的 Google Fonts URL，以及全局 \`font-family\` 设置 |
| **改作品列表** | \`I18N[lang]['works.items']\` |
| **改联系信息** | \`I18N[lang]['contact.*']\` |
`;

function parseNoteContent(text) {
  if (!text) return '';
  let html = String(text);
  const codeBlocks = [];
  html = html.replace(/\`\`\`([\w-]*)\n([\s\S]*?)\`\`\`/g, function(m, lang, code) {
    codeBlocks.push(code.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
    return '\n\n---CODEBLOCK' + (codeBlocks.length - 1) + '---\n\n';
  });
  html = html.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/\`([^\`\n]+)\`/g, '<code>$1</code>');
  html = html.replace(/^###[ \t]+(.+?)[ \t]*$/gm, '<h3>$1</h3>');
  html = html.replace(/^##[ \t]+(.+?)[ \t]*$/gm, '<h2>$1</h2>');
  html = html.replace(/^-{3,}[ \t]*$/gm, '<hr>');
  const tableBlocks = [];
  const tlines = html.split('\n');
  let tl = 0, tnewLines = [];
  while (tl < tlines.length) {
    if (/^\s*\|.+\|\s*$/.test(tlines[tl]) && tl + 1 < tlines.length && /^\s*\|[\s:\-|]+\|\s*$/.test(tlines[tl + 1])) {
      let tableText = [tlines[tl], tlines[tl + 1]];
      let j = tl + 2;
      while (j < tlines.length && /^\s*\|.+\|\s*$/.test(tlines[j])) {
        tableText.push(tlines[j]);
        j++;
      }
      const splitRow = (row) => row.trim().split('|').slice(1, -1).map(c => c.trim());
      let tbl = '<table><thead><tr>';
      const headers = splitRow(tableText[0]);
      headers.forEach(h => tbl += '<th>' + h + '</th>');
      tbl += '</tr></thead><tbody>';
      for (let k = 2; k < tableText.length; k++) {
        tbl += '<tr>';
        splitRow(tableText[k]).forEach(c => tbl += '<td>' + c + '</td>');
        tbl += '</tr>';
      }
      tbl += '</tbody></table>';
      tableBlocks.push(tbl);
      tnewLines.push('---TABLE' + (tableBlocks.length - 1) + '---');
      tl = j;
    } else {
      tnewLines.push(tlines[tl]);
      tl++;
    }
  }
  html = tnewLines.join('\n');
  html = html.replace(/^&gt;[ \t]?(.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/^\s*(\d+)\.[ \t]+(.+)$/gm, '<li data-ol="1">$2</li>');
  html = html.replace(/^\s*[*-][ \t]+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li data-ol="1">[\s\S]*?<\/li>\s*)+)/g, function(m) {
    return '<ol>' + m.replace(/ data-ol="1"/g, '') + '</ol>';
  });
  html = html.replace(/((?:<li>[\s\S]*?<\/li>\s*)+)/g, '<ul>$1</ul>');
  html = html.replace(/---CODEBLOCK(\d+)---/g, function(m, i) {
    return '<pre><code>' + codeBlocks[parseInt(i, 10)] + '</code></pre>';
  });
  html = html.replace(/---TABLE(\d+)---/g, function(m, i) {
    return tableBlocks[parseInt(i, 10)];
  });
  const protectedCode = [];
  html = html.replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/g, function(m, inner) {
    protectedCode.push({tag:'pre', content:inner});
    return '---INLINECODE' + (protectedCode.length - 1) + '---';
  });
  html = html.replace(/<code>([^<]*)<\/code>/g, function(m, inner) {
    protectedCode.push({tag:'code', content:inner});
    return '---INLINECODE' + (protectedCode.length - 1) + '---';
  });
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^*])\*([^*\s][^*]*?)\*(?=[^*]|$)/g, '$1<em>$2</em>');
  html = html.replace(/==([^=\n]+)==/g, '<mark>$1</mark>');
  html = html.replace(/---INLINECODE(\d+)---/g, function(m, i) {
    const pc = protectedCode[parseInt(i, 10)];
    if (pc.tag === 'pre') return '<pre><code>' + pc.content + '</code></pre>';
    return '<code>' + pc.content + '</code>';
  });
  const BLOCK_TAG_RE = /<(?:h[23]|p|pre|blockquote|hr|ul|ol|li|table|thead|tbody|tr|th|td)\b/i;
  html = html.split(/\n{2,}/).map(function(block) {
    block = block.trim();
    if (!block) return '';
    if (BLOCK_TAG_RE.test(block)) return block;
    return '<p>' + block.replace(/\n/g, ' ') + '</p>';
  }).join('\n');
  return html;
}
const out = parseNoteContent(text2);
console.log('OK. Output length:', out.length);
console.log('Contains <h2>:', out.includes('<h2>'));
console.log('Contains <table>:', out.includes('<table>'));
console.log('Contains <pre><code>:', out.includes('<pre><code>'));
console.log('Contains <code>:', out.includes('<code>'));
console.log('Contains <blockquote>:', out.includes('<blockquote>'));
console.log('Contains <ol>:', out.includes('<ol>'));
console.log('Contains <ul>:', out.includes('<ul>'));
console.log('Contains <strong>:', out.includes('<strong>'));
