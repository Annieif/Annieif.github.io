/* =====================================================
   NOTES DATA — 所有笔记的单一数据源
   新增笔记：只需在数组头部追加一条即可
   必填字段: date, title, desc, content
   id 和 preview 自动生成，无需手动填写
   content 支持纯文本格式（自动转 HTML），规则：
     ## 标题  →  <h2>      ### 标题  →  <h3>
     - 列表   →  <ul><li>  1. 列表  →  <ol><li>
     **粗体** →  <strong>  *斜体* →  <em>
     ==重点== →  <mark>
     `代码`  →  <code>    ```  →  <pre><code>
     > 引用   →  <blockquote>   ---  →  <hr>
     | A | B | → 表格
     空行分隔段落
   ===================================================== */

// 轻量 Markdown → HTML 解析器
// 核心原则：先把内容里所有字面尖括号（<、>）转义为实体，
// 只有解析器自身产出的标签才会作为真实 HTML 渲染。
function parseNoteContent(text) {
  if (!text) return '';
  let html = String(text);

  // Step 1 — 保护代码块 ```...```
  const codeBlocks = [];
  html = html.replace(/```([\w-]*)\n([\s\S]*?)```/g, function(m, lang, code) {
    codeBlocks.push(code.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
    return '\n\n---CODEBLOCK' + (codeBlocks.length - 1) + '---\n\n';
  });

  // Step 2 — 转义字面尖括号
  html = html.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Step 3 — 行内代码 `...`
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

  // Step 4 — 标题
  html = html.replace(/^###[ \t]+(.+?)[ \t]*$/gm, '<h3>$1</h3>');
  html = html.replace(/^##[ \t]+(.+?)[ \t]*$/gm, '<h2>$1</h2>');

  // Step 5 — 水平线 ---
  html = html.replace(/^-{3,}[ \t]*$/gm, '<hr>');

  // Step 6 — 表格：| header | | |:---|:---:| | data |
  // 逐行扫描：找到表头+分隔线+数据行的连续块，合成 HTML table
  const tableBlocks = [];
  const tlines = html.split('\n');
  let tl = 0, tnewLines = [];
  while (tl < tlines.length) {
    // 表头行：以 | 开头，且下一行是分隔线
    if (/^\s*\|.+\|\s*$/.test(tlines[tl]) && tl + 1 < tlines.length && /^\s*\|[\s:\-|]+\|\s*$/.test(tlines[tl + 1])) {
      let tableText = [tlines[tl], tlines[tl + 1]];
      let j = tl + 2;
      while (j < tlines.length && /^\s*\|.+\|\s*$/.test(tlines[j])) {
        tableText.push(tlines[j]);
        j++;
      }
      // 解析每行：用 | 分割，去掉首尾空字符串
      const splitRow = (row) => row.trim().split('|').slice(1, -1).map(c => c.trim());
      let tbl = '<table><thead><tr>';
      const headers = splitRow(tableText[0]);
      headers.forEach(h => tbl += `<th>${h}</th>`);
      tbl += '</tr></thead><tbody>';
      for (let k = 2; k < tableText.length; k++) {
        tbl += '<tr>';
        splitRow(tableText[k]).forEach(c => tbl += `<td>${c}</td>`);
        tbl += '</tr>';
      }
      tbl += '</tbody></table>';
      tableBlocks.push(tbl);
      tnewLines.push(`---TABLE${tableBlocks.length - 1}---`);
      tl = j;
    } else {
      tnewLines.push(tlines[tl]);
      tl++;
    }
  }
  html = tnewLines.join('\n');

  // Step 7 — 引用 > ...（> 已转义为 &gt;）
  html = html.replace(/^&gt;[ \t]?(.+)$/gm, '<blockquote>$1</blockquote>');

  // Step 8 — 列表（允许前导空白用于缩进）
  html = html.replace(/^\s*(\d+)\.[ \t]+(.+)$/gm, '<li data-ol="1">$2</li>');
  html = html.replace(/^\s*[*-][ \t]+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li data-ol="1">[\s\S]*?<\/li>\s*)+)/g, function(m) {
    return '<ol>' + m.replace(/ data-ol="1"/g, '') + '</ol>';
  });
  html = html.replace(/((?:<li>[\s\S]*?<\/li>\s*)+)/g, '<ul>$1</ul>');

  // Step 9 — 恢复代码块 & 表格
  html = html.replace(/---CODEBLOCK(\d+)---/g, function(m, i) {
    return '<pre><code>' + codeBlocks[parseInt(i, 10)] + '</code></pre>';
  });
  html = html.replace(/---TABLE(\d+)---/g, function(m, i) {
    return tableBlocks[parseInt(i, 10)];
  });

  // Step 9b — 保护所有 <code>...</code> 和 <pre><code>...</code></pre> 内容，
  // 避免其中的 ** / * / == 被后续行内标记处理误解析
  const protectedCode = [];
  // 先保护 <pre><code>（大块代码块）
  html = html.replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/g, function(m, inner) {
    protectedCode.push({tag:'pre', content:inner});
    return '---INLINECODE' + (protectedCode.length - 1) + '---';
  });
  // 再保护行内 <code>
  html = html.replace(/<code>([^<]*)<\/code>/g, function(m, inner) {
    protectedCode.push({tag:'code', content:inner});
    return '---INLINECODE' + (protectedCode.length - 1) + '---';
  });

  // Step 10 — 行内：**粗体** / *斜体* / ==重点==
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^*])\*([^*\s][^*]*?)\*(?=[^*]|$)/g, '$1<em>$2</em>');
  html = html.replace(/==([^=\n]+)==/g, '<mark>$1</mark>');

  // Step 10b — 恢复受保护的代码块与行内代码
  html = html.replace(/---INLINECODE(\d+)---/g, function(m, i) {
    const pc = protectedCode[parseInt(i, 10)];
    if (pc.tag === 'pre') {
      return '<pre><code>' + pc.content + '</code></pre>';
    }
    return '<code>' + pc.content + '</code>';
  });

  // Step 11 — 段落：双换行分隔，纯文本块包 <p>
  const BLOCK_TAG_RE = /<(?:h[23]|p|pre|blockquote|hr|ul|ol|li|table|thead|tbody|tr|th|td)\b/i;
  html = html.split(/\n{2,}/).map(function(block) {
    block = block.trim();
    if (!block) return '';
    if (BLOCK_TAG_RE.test(block)) return block;
    return '<p>' + block.replace(/\n/g, ' ') + '</p>';
  }).join('\n');

  return html;
}

// 自动生成 preview：取正文第一段纯文本（遇到句号/感叹号/问号即止）
function autoPreview(content) {
  if (!content) return '';
  const plain = String(content)
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const m = plain.match(/^(.+?[。！？.!?])\s*/);
  if (m) return m[1];
  return plain.length > 80 ? plain.slice(0, 80) + '…' : plain;
}

const NOTES_DATA = [
  {
    date:'2026-06-21',
    title:'地球仪与地图笔记',
    desc:'空间坐标系的基础语言。经纬网、比例尺与方向判断 — 一张地图是地球的缩影。',
    content:'地球仪与地图 — 空间坐标系的基础语言。从椭球体到经纬网，一张地图是地球的缩影。\n\n## 一、地球的形状与大小\n\n**形状**：两极稍扁、赤道略鼓的不规则椭球体。\n\n**大小**：\n\n- 平均半径：约 6371 千米\n- 赤道周长：约 4 万千米\n- 赤道半径：约 6378 千米\n- 极半径：约 6357 千米\n\n## 二、地球仪\n\n**地轴**：地球仪上，地球绕转的轴，其倾斜方向不变，北端始终指向 **北极星**。\n\n**两极**：地轴穿过地心，与地球表面相交的两点。\n\n## 三、经线与纬线\n\n| 特点 | 经线 | 纬线 |\n| :--- | :--- | :--- |\n| **形状** | 半圆 | 圆圈 |\n| **长度** | 都相等，约 2 万千米 | 自赤道向两极递减，赤道最长 |\n| **关系** | 相交于南北两极点 | 相互平行 |\n| **指示方向** | 南北方向 | 东西方向 |\n\n## 四、经度与纬度\n\n| 项目 | 经度 | 纬度 |\n| :--- | :--- | :--- |\n| **划分起点** | 本初子午线（0° 经线） | 赤道（0° 纬线） |\n| **划分方法** | 向东、向西各分 180° | 向南、向北各分 90° |\n| **分布规律** | 东经度向东增大，西经度向西增大 | 北纬度向北增大，南纬度向南增大 |\n| **半球划分** | 20° W 和 160° E 组成的经线圈 | 赤道（0° 纬线） |\n| **特殊经纬线** | ① 本初子午线和 180° 经线为东西经分界线 ② 180° 经线大致与日界线重合 | ① 30° 纬线是中、低纬度界线；60° 纬线是中、高纬度界线 ② 回归线是热带、温带界线；极圈是温带、寒带界线 |\n\n## 五、地图三要素\n\n**1. 比例尺**\n\n- **公式**：比例尺 = 图上距离 / 实地距离\n- **形式**：文字式、数字式、线段式\n- **特点**：图幅相同时，比例尺越大，表示的实地范围越**小**，内容越**详细**，精确度越高。\n\n**2. 方向**\n\n- **一般地图**：上北下南，左西右东。\n- **指向标地图**：指向标箭头一般指示正北方。\n- **经纬网地图**：经线指示南北方向，纬线指示东西方向。\n\n**3. 图例与注记**\n\n- **图例**：地图上表示地理事物的符号。\n- **注记**：地图上的文字说明和数字。\n\n## 六、经纬网的应用\n\n**1. 定对称点位置**\n\n- **关于赤道对称**：经度相同，纬度南北相反，数值相等。\n- **关于地轴对称**：纬度相同，经度相对（和为 180°）。\n- **关于地心对称（对跖点）**：纬度南北相反、数值相等，经度相对（和为 180°）。\n\n**2. 定方向**\n\n- **方格状经纬网**：根据经纬度数值大小判断。\n- **极点俯视图**：根据地球自转方向（北逆南顺）判断东西，离极点远近判断南北。\n\n**3. 算距离**\n\n- **经线距离**：同一条经线上，纬度相差 1°，实际距离约 **111 km**。\n- **纬线距离**：同一条纬线上，经度相差 1°，实际距离约 **111 × cos(φ) km**（φ 为该纬线的纬度）。\n\n**4. 定最短航线**\n\n- **原理**：球面上两点间的最短距离是经过这两点的大圆的劣弧段。\n\n**5. 定范围与比例尺**\n\n- 跨经纬度数相同的地图，纬度越高，表示的实地范围越小，比例尺越大。\n- 图幅相同的两幅图，中心点纬度数相同，则跨经纬度越广，所表示的实地范围越大，比例尺越小。\n\n## 七、地理位置特征描述\n\n- **经纬度位置**：半球位置（东/西半球，南/北半球）、纬度带（低/中/高纬度）、热量带（热带/温带/寒带）。\n- **海陆位置**：位于某大陆的某方位，临某海洋。\n- **相对位置**：与周边国家、行政区、地形区、交通线等的相对方位关系。'
  },
  {
    date:'2026-06-20',
    title:'code_wiki — Annieif 的个人作品集',
    desc:'本站的技术架构与维护要点：HTML / CSS / 原生 JavaScript / GitHub Pages 的静态站点设计。',
    content:'一个零依赖的个人作品集站点 — 核心文件只有根目录的 `index.html`，其它一切内容都由它在浏览器中即时生成。\n\n## 项目文件结构\n\n文件按三类划分：入口文件、作品页、笔记系统。\n\n| 类型 | 文件 | 说明 |\n| :--- | :--- | :--- |\n| **入口** | `index.html` | 主页、CSS、多语言字典、所有渲染逻辑 |\n| **图标** | `icon.png` | 浏览器标签页与手机主屏图标 |\n| **作品** | `works/001.html`、`works/002.html` … | 每一条作品的详情页，可独立访问 |\n| **笔记数据** | `notes/data.js` | 所有笔记的纯文本，以 JS 数组形式维护 |\n| **笔记模板** | `notes/note.html` | 所有笔记共用的渲染模板 |\n\n> GitHub Pages 配置在仓库设置中指向 main 分支根目录 — 没有构建步骤，推送即发布。\n\n## 主题与排版\n\n整站的配色、字体与节奏都集中在 `:root` 的 CSS 变量中：\n\n```\n  --bg:#0a0a0a            深黑底\n  --ink:#e8e4dd           米黄文字（正文基调）\n  --accent:#f4c2d0        粉调强调（高亮、链接悬停）\n  --link:#7ab4d8          链接冷色，与粉调形成冷暖对比\n  --line:rgba(232,228,221,.10)   分隔线\n  --ease:cubic-bezier(.2,.8,.2,1) 统一缓动\n```\n\n字体族三套各司其职：\n\n- **Fraunces** — 正文与常规标题。可变字宽从 regular 到 black，在标题处撑出足够的分量。\n- **Cormorant Garamond** — 斜体、引用、英雄区最显眼的那几行字。它的笔触偏薄、字尾细腻，用作装饰性标题能带来"杂志感"。\n- **JetBrains Mono** — 所有技术性信息（时间戳、编号、代码、导航）。替换了之前的 IBM Plex Mono，JetBrains Mono 的连字和字符间距在窄栏中可读性更强，字符高度一致，便于代码块对齐。\n\n> 关键判断：**只用一套字体族并不够**。三个字体分别覆盖"叙述—装饰—技术"三种语境，读者能从字形变化中感知内容的切换，而无需依赖字号层级。\n\n## 页面骨架\n\n主页 `index.html` 按顺序堆叠以下元素：\n\n1. **星空层 `.stars`** — 5 层静态星点 + 7 颗流星。每层 tile 尺寸不同，产生视差感；呼吸动画通过 `opacity` 与缓慢位移叠加实现。\n2. **自定义指针** — `.cursor-dot` 直接跟随鼠标坐标；`.cursor-ring` 用 `requestAnimationFrame` 做插值延迟跟随，在链接/按钮上放大并着色。\n3. **英雄区 `.hero`** — 占据首屏，内含导航栏、动画大标题、引用文字。\n4. **左侧页面目录 `.page-toc`** — 5 个编号节点，滚动到内容区时才淡入。\n5. **各 section** — `#about`、`#projects`、`#insights`、`#notes`、`#contact`，每个 section 都由一个 `sec-head`（编号 + 大字标题）与一个内容容器组成。\n6. **页脚** — 一句话声明。\n\n## 多语言：零依赖 I18N\n\n不使用任何 i18n 库。多语言由一个手写的 JS 对象驱动：\n\n```\nI18N = {\n  zh: { nav:{...}, sec:{...}, hero:{...}, about:{cards:[...]}, works:{items:[...]}, contact:{...} },\n  en: { ... },\n  ja: { ... },   ko: { ... },   es: { ... },\n  fr: { ... },   ar: { ... },   ru: { ... }\n};\n```\n\n每个语言分支都包含同样的键结构：\n\n| 字段 | 用途 |\n| :--- | :--- |\n| `meta.*` | 页头元信息、document.title |\n| `nav.*` | 导航栏文字 |\n| `sec.*` / `sec.*Sub` | section 编号小标题与大字副标题 |\n| `hero.title.lines` | 英雄区三行标题，每行一个 {text, style} 对象 |\n| `hero.quote` | 英雄区下方引用文字 |\n| `marquee.items` | 走马灯词条数组 |\n| `about.cards` | 三张介绍卡片，每张含 label / title / text |\n| `works.items` | 作品列表，每张含 title / tag / text / href |\n\n## 语言切换流程\n\n用户点击语言切换栏时，`setLang(lang)` 按以下顺序执行：\n\n1. 用 `langMap` 把 `zh` / `en` 等短名映射为浏览器标准标签 `zh-CN`、`en-US`… 写入 `<html lang>`。\n2. 重新设置 `document.title`。\n3. 遍历页面中所有 `[data-i18n]` 与 `[data-i18n-html]` 节点，从字典取值填入。`data-i18n-html` 会用 `innerHTML` 写入以支持内部 `<em>` 等轻量标记。\n4. 重新渲染 hero 的三行标题、about 卡片、works 列表。这些区域由 JS 生成，切换语言时必须重新构建 DOM。\n5. 设置当前按钮为激活态，其它按钮恢复默认。\n6. 把语言写入 `localStorage`。下次访问时 `initLang()` 会直接读取并恢复用户选择。\n\n## 渲染：全部走 DOM API — 不做字符串拼接\n\n为了避免 XSS，全站渲染不使用任何字符串拼接后再写入 innerHTML。核心做法是：\n\n```\n// 正确方式：逐个创建节点，通过 textContent 传入用户内容\nconst card = document.createElement('div');\nconst h    = document.createElement('h3');\nh.textContent = cardData.title;   // 任何尖括号都会被当成普通字符\ncard.appendChild(h);\n```\n\n几个关键渲染函数：\n\n- **`buildTitleHtml(lines)`** — 按 hero.title.lines 数据构建三行 `title-line`，每一行根据 style 字段（`grad` / `ac` / `reg`）渲染不同样式的 span。渐变字通过 `background-image: linear-gradient(...)` + `background-clip: text` + `color: transparent` 实现。\n- **`renderText(str)`** — 极简的 Markdown 解析器。只支持 `<em>…</em>` 标记为斜体；其余内容作为纯文本通过 `createTextNode` 插入。\n- **`renderAbout(dict)`** / **`renderWorks(dict)`** — 构建卡片/作品网格；每张卡片内部也是 `createElement` + `appendChild` 的组合。\n\n> 把渲染逻辑写成"纯函数 + DOM 操作"而非"字符串拼接"的最大好处是：**可以随时替换成更复杂的格式** — 例如把文本解析器换成支持 `{`code`}`、`=emph=`、表格语法的版本，只要输出是 DOM 节点，外部逻辑无需变动。\n\n## 笔记系统\n\n笔记的"数据"与"展示"完全分离。\n\n数据源只在 `notes/data.js` 的 `NOTES_DATA` 数组中维护。每条笔记有四个字段：\n\n| 字段 | 说明 |\n| :--- | :--- |\n| `date` | 写作日期，格式 `YYYY-MM-DD` |\n| `title` | 标题 |\n| `desc` | 一句话描述 — 在主页笔记列表中显示 |\n| `content` | 正文 — 支持轻量 Markdown 语法（见下） |\n\n`id`、`preview`、HTML 化内容都由后处理自动生成，不需要手工填写：\n\n```\nNOTES_DATA.forEach((n, i) => {\n  if (!n.id) n.id = String(i + 1).padStart(3, '0');  // 001, 002, ...\n  if (!n.preview) n.preview = autoPreview(n.content); // 取首句\n  n.content = parseNoteContent(n.content);            // Markdown → HTML\n});\n```\n\n`parseNoteContent` 支持的语法：\n\n| 语法 | 输出 |\n| :--- | :--- |\n| `## 标题` / `### 标题` | 二级 / 三级标题 |\n| `- 条目` | 无序列表 |\n| `1. 条目` | 有序列表 |\n| `**粗体**` / `*斜体*` | `<strong>` / `<em>` |\n| `==高亮==` | `<mark>`（粉色背景 + 光晕） |\n| `` `代码` `` | 行内代码，浅灰框包裹 |\n| ` ``` ... ``` ` | 代码块，深灰框 + 左边粉色竖条 |\n| `> 引用` | `<blockquote>` |\n| `| 表格 | 表格 |` | HTML 表格 |\n| `---` | 水平线 |\n| 空行 | 分段 |\n\n> 代码块保护机制：`parseNoteContent` 在处理行内语法前会先把所有 ``` ``` 块与 ` `` ` 块替换为占位符；处理完 `**`、`*`、`==` 之后再还原。这样代码块内的 `x * y * z` 之类的数学公式不会被误解析为斜体。\n\n主页上的笔记列表由 `initNotesController` 驱动：\n\n- **搜索** — 在标题/描述/preview 中做关键字匹配。\n- **排序** — 最新 / 最早 / 标题（按字母序）。\n- **分页** — 每次渲染 `PER_PAGE`（默认 8）条，超出时显示"load more"。\n- **折叠 preview** — 点击笔记行在列表处展开 `preview`；想阅读完整内容则跳转到 `notes/note.html#001`。\n\n在笔记详情页 `note.html` 中，`IntersectionObserver` 监视每一个 `h2`、`h3`，当某个标题接近视口中心时把它对应的目录条目高亮。这让目录像一根"阅读进度条"一样随滚动自动更新。\n\n## 英雄区：动画标题与自定义指针\n\n大标题的动画分两步：\n\n1. **构建字符节点** — 把 hero 第一行的每个字符包进一个独立的 `<span class="ch">`，opacity 初始为 0。\n2. **`initTypewriter` 逐字激活** — 每 n 毫秒把下一个字符的 opacity 设为 1，轻微放大。节奏用 `cubic-bezier(.2,.8,.2,1)` 缓动，整体感觉"起笔慢、收笔轻"，模仿手写落笔的节奏。\n\n> 数字估算：一行 20 个字符 × 每字 60ms ≈ 1.2 秒。这是阅读一行文字所需的心理时间下限 — 比它快则显得"打字机感"过重；比它慢则让人失去耐心。\n\n指针系统由两部分组成：\n\n- **`.cursor-dot`** — 一个 6px 的白色点，直接跟随鼠标坐标。\n- **`.cursor-ring`** — 一个 32px、带 1px 浅色边框的环，用 `requestAnimationFrame` 做插值跟随（每帧向鼠标坐标靠近 ~18%），创造轻微的延迟感。\n\n在鼠标进入链接、按钮或 `[data-cursor-hover]` 元素时，环会放大到 56px，边框变为粉色，内部有微弱发光。\n\n## 左侧目录：滚动避让\n\n左侧 `.page-toc` 是 5 个编号节点的导航（01 – 05），`position: fixed; top: 50%`。\n\n为了避免它遮挡 hero 的大标题，主页监听 hero 的 IntersectionObserver：**当 hero 仍在视口**，给 `<body>` 加 `is-hero-visible` 类，此时 `.page-toc` opacity 为 0 并禁用指针事件；用户向下滚动到内容区时，目录淡入。\n\n节点高亮也由 IntersectionObserver 驱动：主页面的 `initPageTOC()` 把 5 个 section 注册，滚动到哪一个就激活对应条目，同时施加一个轻微的 `scale(1.1)` 与粉色光晕。\n\n## 数据统计\n\n使用 `busuanzi` 不蒜子作为第三方访问量服务。\n\n直接在 DOM 中显示数字有一个问题：**不蒜子脚本需要时间加载**，用户会先看到原始阿拉伯数字再被替换。解决方法是"**镜像节点 + 隐藏监听**"：\n\n1. HTML 中保留两个 `display: none` 的 `<span>` 作为"镜像"，不蒜子脚本把访问量/访客数写入它们。\n2. 用 `MutationObserver` 监听这两个隐藏节点的文本变化。\n3. 拿到数值后通过 `toRoman()` 转为罗马数字，再用 `runCountUp()` 做缓动动画，从 0 滚动到目标值，把结果写入"可见元素"。\n\n`runCountUp` 是一个通用的缓动计数函数，默认使用 ease-out 曲线，也可以传入自定义的 `fmt` 格式化函数。显示字体与正文不同，使用 Cormorant Garamond 的衬线大写，与标题协调。\n\n## 维护速查\n\n| 要做的事 | 改哪里 |\n| :--- | :--- |\n| **新增作品** | 新建 `works/002.html`；在 `I18N.*.works.items` 中加一条 |\n| **新增笔记** | 在 `notes/data.js` 的 `NOTES_DATA` 头部插入一个对象，填 date/title/desc/content |\n| **新增语言** | 在 `I18N` 中加一个分支，复制现有语言的键结构；在 `langSwitch` 按钮行加入新按钮；在 `langMap` 中登记 `lang → html-lang` 的映射 |\n| **改配色 / 字体** | 修改 `:root` 中的 CSS 变量与顶部 Google Fonts 链接。全站所有颜色/字体都从变量派生，无需逐处查找替换 |\n| **改 section 顺序** | 调整 `index.html` 中 `<section>` 的 DOM 顺序即可；左侧目录会自动按顺序高亮 |\n\n## 调试要点\n\n- **大标题不显示** — 确认当前语言的 `hero.title.lines` 每一条都有值；检查渐变字相关 CSS 是否正确（`background-clip: text` 在部分旧浏览器需要 `-webkit-` 前缀）。\n- **统计数字仍是阿拉伯数字** — 检查隐藏镜像节点是否 `display: none`；确认 `MutationObserver` 的 `childList + characterData + subtree` 三个标志都设置了。\n- **目录与大标题重叠** — 检查 `body.is-hero-visible` 类是否正确添加；调整 `.page-toc` 的 `transition-delay` 与 hero 淡入延迟，错开节奏。\n- **内容变更在主页没显示出来** — 硬刷新 `Ctrl+Shift+R`；`notes/data.js` 是纯 JS，如果浏览器缓存了旧版本就会读到旧笔记。\n\n> 可以在浏览器控制台中临时修改 `I18N` 或 `NOTES_DATA` 快速测试 — 直接赋值后调用 `setLang('zh')` 或重新渲染对应区域，验证好再落回文件。'}
  }
];

// 后处理：自动生成 id 和 preview，转换 content 为 HTML
NOTES_DATA.forEach((n, i) => {
  if (!n.id) n.id = String(i + 1).padStart(3, '0');
  if (!n.preview) n.preview = autoPreview(n.content);
  n.content = parseNoteContent(n.content);
});
