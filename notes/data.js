/* =====================================================
   NOTES_DATA — 所有笔记的单一数据源
   content 使用模板字面量（反引号），内容中的反引号用 \` 转义
   ===================================================== */

function parseNoteContent(text) {
  if (!text) return '';
  let html = String(text);
  const codeBlocks = [];
  html = html.replace(/```([\w-]*)\n([\s\S]*?)```/g, function(m, lang, code) {
    codeBlocks.push(code.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
    return '\n\n---CODEBLOCK' + (codeBlocks.length - 1) + '---\n\n';
  });
  html = html.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
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

function autoPreview(content) {
  if (!content) return '';
  const plain = String(content)
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const m = plain.match(/^(.+?)[。！？.!?]\s*/);
  if (m) return m[1];
  return plain.length > 80 ? plain.slice(0, 80) + '…' : plain;
}

const NOTES_DATA = [
  {
    date:'2026-06-22',
    title:'边狱巴士第四章 · 梦、镜与花海',
    desc:'从九人会到东柏、东朗、李箱，第四章讲的不是绝望，而是废墟上的嫩芽。',
    content:`*Limbus Company* 第四章是一段关于"从梦想到现实，再到现实的理想"的循环。它短暂，却浪漫得出奇。

九人会因不切实际的梦想聚在一起，又在 T 公司觊觎玻璃窗技术时化作废墟。但 Project Moon 要写的从来不是绝望——跨过前人尸骨，尽头是花海。

## 东柏 · 山茶花

东柏的原型不是人，而是金裕贞笔下的一株山茶。韩语中，山茶树别名"东柏"。

她组建技术解放联盟，摧毁技术——但这只是一个幌子。她的真正目的，是让所有现存技术消失，使后人探索的空间变大，让世界之翼对底层的压制力减弱。果实已然枯萎，埋下未来的嫩芽，让过去与现实的一切都成为养料，最终开出一片比如今更美丽的花田。

她知道自己不是好人。但在都市，不直面实现理想所必经的残酷，是永远无法成功的。她从未扭曲——因为要走的路，从九人会覆灭之时就已经确定了。

## 东朗 · 天才中的凡人

东朗是九人会里最格格不入的人。别人做研究是为了玩，他做研究是为了用。他想治愈全都市的苦难，却始终被才能所困。

当从小一起长大的同乡把他的努力称作"笨手笨脚的尝试"时，东朗内心的某个部分就已经死去了。看到 K 公司近乎起死回生的技术后，他终于崩溃了——自己一直以来的努力，真的一文不值。

加入 K 公司后，阿方索的话里话外都在告诉他：我们要你，不是因为你的能力，而是因为你是九人会的前成员。那座奖杯里空无一物，他永远无法用自己的能力去填满它。

于是他扭曲了。扭曲形态的后缀是**否定一切者**——他否定九人会，否定过去的自己，杀死了心中那头小黄牛，舍弃了最后的善良，试图用都市的做法去守护最初的梦想。

但当他被李箱击败，破碎的翅膀在九人会旧房间里重新凝结，他才意识到：九人会不是敌人，而是永远包容他的家。

## 李箱 · 镜子与可能性

李箱的笔名真的来自一个箱子——画家好友送他的礼物。他爱不释手，便把"箱"作为名。至于姓李，是因为箱子是木头做的，木姓中，李最符合他的气质。

作为一号罪人，他是第一个完成自我拯救的。九人会对他的意义和别人不同：东柏看重的是意义，东朗看重的是技术，而李箱看重的是**家**本身。他的钱、技术、权利，一切都是为了九人会而存在。

所以在东柏引爆办公室炸药后，他失魂落魄。终日与镜中自己对话，羡慕镜中拥有翅膀的自己——他认为自己的翅膀已折断，只能在无尽平行世界里，注视唯一有翅膀的那个自己。

直到已死去的东柏通过金枝的力量告诉他：镜中展示的不是平行世界，而是**可能性**。

一瞬间，绝望变成了希望。镜中翅膀属于李箱本人——不是某个遥不可及的世界，而是他自己拥有的无限可能性。他挥动翅膀，在九人会旧日指引下，为走入歧途的东朗写下结局，将巴士视作新家。

> 拥抱过去，才能创造未来。`

  },
  {
    date:'2026-06-21',
    title:'地球仪与地图笔记',
    desc:'空间坐标系的基础语言。经纬网、比例尺与方向判断 — 一张地图是地球的缩影。',
    content:`地球仪与地图 — 空间坐标系的基础语言。从椭球体到经纬网，一张地图是地球的缩影。

## 一、地球的形状与大小

**形状**：两极稍扁、赤道略鼓的不规则椭球体。

**大小**：

- 平均半径：约 6371 千米
- 赤道周长：约 4 万千米
- 赤道半径：约 6378 千米
- 极半径：约 6357 千米

## 二、地球仪

**地轴**：地球仪上，地球绕转的轴，其倾斜方向不变，北端始终指向 **北极星**。

**两极**：地轴穿过地心，与地球表面相交的两点。

## 三、经线与纬线

| 特点 | 经线 | 纬线 |
| :--- | :--- | :--- |
| **形状** | 半圆 | 圆圈 |
| **长度** | 都相等，约 2 万千米 | 自赤道向两极递减，赤道最长 |
| **关系** | 相交于南北两极点 | 相互平行 |
| **指示方向** | 南北方向 | 东西方向 |

## 四、经度与纬度

| 项目 | 经度 | 纬度 |
| :--- | :--- | :--- |
| **划分起点** | 本初子午线（0° 经线） | 赤道（0° 纬线） |
| **划分方法** | 向东、向西各分 180° | 向南、向北各分 90° |
| **分布规律** | 东经度向东增大，西经度向西增大 | 北纬度向北增大，南纬度向南增大 |
| **半球划分** | 20° W 和 160° E 组成的经线圈 | 赤道（0° 纬线） |
| **特殊经纬线** | ① 本初子午线和 180° 经线为东西经分界线 ② 180° 经线大致与日界线重合 | ① 30° 纬线是中、低纬度界线；60° 纬线是中、高纬度界线 ② 回归线是热带、温带界线；极圈是温带、寒带界线 |

## 五、地图三要素

**1. 比例尺**

- **公式**：比例尺 = 图上距离 / 实地距离
- **形式**：文字式、数字式、线段式
- **特点**：图幅相同时，比例尺越大，表示的实地范围越**小**，内容越**详细**，精确度越高。

**2. 方向**

- **一般地图**：上北下南，左西右东。
- **指向标地图**：指向标箭头一般指示正北方。
- **经纬网地图**：经线指示南北方向，纬线指示东西方向。

**3. 图例与注记**

- **图例**：地图上表示地理事物的符号。
- **注记**：地图上的文字说明和数字。

## 六、经纬网的应用

**1. 定对称点位置**

- **关于赤道对称**：经度相同，纬度南北相反，数值相等。
- **关于地轴对称**：纬度相同，经度相对（和为 180°）。
- **关于地心对称（对跖点）**：纬度南北相反、数值相等，经度相对（和为 180°）。

**2. 定方向**

- **方格状经纬网**：根据经纬度数值大小判断。
- **极点俯视图**：根据地球自转方向（北逆南顺）判断东西，离极点远近判断南北。

**3. 算距离**

- **经线距离**：同一条经线上，纬度相差 1°，实际距离约 **111 km**。
- **纬线距离**：同一条纬线上，经度相差 1°，实际距离约 **111 × cos(φ) km**（φ 为该纬线的纬度）。

**4. 定最短航线**

- **原理**：球面上两点间的最短距离是经过这两点的大圆的劣弧段。

**5. 定范围与比例尺**

- 跨经纬度数相同的地图，纬度越高，表示的实地范围越小，比例尺越大。
- 图幅相同的两幅图，中心点纬度数相同，则跨经纬度越广，所表示的实地范围越大，比例尺越小。

## 七、地理位置特征描述

- **经纬度位置**：半球位置（东/西半球，南/北半球）、纬度带（低/中/高纬度）、热量带（热带/温带/寒带）。
- **海陆位置**：位于某大陆的某方位，临某海洋。
- **相对位置**：与周边国家、行政区、地形区、交通线等的相对方位关系。`
  },
  {
    date:'2026-06-20',
    title:'code_wiki — Annieif 的个人作品集',
    desc:'本站的技术架构与维护要点：HTML / CSS / 原生 JavaScript / GitHub Pages 的静态站点设计。',
    content:`一个零依赖的个人作品集站点 — 核心文件只有根目录的 \`index.html\`，其它一切内容都由它在浏览器中即时生成。

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
| \`sec.*\` / \`sec.*Sub\` | section 编号小标题与大字副标题 |
| \`hero.title.lines\` | 英雄区三行标题，每行一个 {text, style} 对象 |
| \`hero.quote\` | 英雄区下方引用文字 |
| \`marquee.items\` | 走马灯词条数组 |
| \`about.cards\` | 三张介绍卡片，每张含 label / title / text |
| \`works.items\` | 作品列表，每张含 title / tag / text / href |

> 设计决策：**所有语言共享同一套 HTML 骨架**，而我只在 DOM 文本层面做替换。这样，任何语言都能使用同一套样式系统，无需单独维护。

## 笔记系统：数据驱动

笔记的"数据"与"展示"完全分离。数据源只在 \`notes/data.js\` 的 \`NOTES_DATA\` 数组中维护。每条笔记有四个字段：

| 字段 | 说明 |
| :--- | :--- |
| \`date\` | 写作日期，格式 YYYY-MM-DD |
| \`title\` | 标题 |
| \`desc\` | 一句话描述 — 在主页笔记列表中显示 |
| \`content\` | 正文 — 支持轻量 Markdown 语法 |

id、preview、HTML 化内容都由后处理自动生成，不需要手工填写：

\`\`\`
NOTES_DATA.forEach((n, i) => {
  if (!n.id) n.id = String(i + 1).padStart(3, '0');     // 001, 002, ...
  if (!n.preview) n.preview = autoPreview(n.content);    // 取首句
  n.content = parseNoteContent(n.content);               // Markdown -> HTML
});
\`\`\`

\`parseNoteContent\` 支持的语法：

| 语法 | 输出 |
| :--- | :--- |
| \`## 标题\` / \`### 标题\` | 二级 / 三级标题 |
| \`- 条目\` | 无序列表 |
| \`1. 条目\` | 有序列表 |
| \`**粗体**\` / \`*斜体*\` | strong / em |
| \`==高亮==\` | mark（粉色背景 + 光晕） |
| \`\`代码\`\` | 行内代码，浅灰框包裹 |
| \`\`\` ... \`\`\` | 代码块，深灰框 + 左边粉色竖条 |
| \`> 引用\` | blockquote |
| \`| 表格 | 表格 |\` | HTML 表格 |
| \`---\` | 水平线 |
| 空行 | 分段 |

主页上的笔记列表由 \`initNotesController\` 驱动：搜索（标题/描述/preview 中关键字匹配）、排序（最新 / 最早 / 标题）、分页（每次渲染 PER_PAGE 条）、折叠 preview。

在笔记详情页 \`note.html\` 中，\`IntersectionObserver\` 监视每一个 h2、h3，当某个标题接近视口中心时把它对应的目录条目高亮。这让目录像一根"阅读进度条"一样随滚动自动更新。

## 性能考量

- **零依赖**：不加载任何第三方 JS 库或 CSS 框架。
- **静态输出**：GitHub Pages 提供静态文件，无构建步骤。
- **Canvas 星空**：约 150 个星点在单个 Canvas 上绘制，只在 resize 时重绘。
- **光标跟随**：throttle 到约 30fps，ring 用 lerp 做缓动跟随。
- **列表条目**：使用原生 DOM 操作而非 innerHTML，避免重排与潜在 XSS。
- **Markdown 解析**：手写轻量子集 parser，约 100 行，覆盖常见格式。

## 维护速查

| 要做的事 | 改哪里 |
| :--- | :--- |
| **新增作品** | 新建 \`works/002.html\`；在 \`I18N.*.works.items\` 中加一条 |
| **新增笔记** | 在 \`notes/data.js\` 的 \`NOTES_DATA\` 头部插入一个对象，填 date/title/desc/content |
| **新增语言** | 在 \`I18N\` 中加一个分支，复制现有语言的键结构；在 \`langSwitch\` 按钮行加入新按钮；在 \`langMap\` 中登记映射 |
| **改配色 / 字体** | 修改 \`:root\` 中的 CSS 变量与顶部 Google Fonts 链接。全站所有颜色/字体都从变量派生，无需逐处查找替换 |
| **改 section 顺序** | 调整 \`index.html\` 中 \`<section>\` 的 DOM 顺序即可；左侧目录会自动按顺序高亮 |`
  }
];

NOTES_DATA.forEach((n, i) => {
  if (!n.id) n.id = String(i + 1).padStart(3, '0');
  if (!n.preview) n.preview = autoPreview(n.content);
  n.content = parseNoteContent(n.content);
});
