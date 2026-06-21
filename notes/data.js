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
    content:'这是一个单文件驱动的个人作品集站点，核心文件是根目录的 index.html，其它内容都由它动态生成。\n\n## 项目文件结构\n\n根目录只有三类文件：index.html 是一切的入口；icon.png 是浏览器标签图标；works/ 目录存放「作品详情」页，目前只有 works/001.html，它是本站本身的项目介绍；notes/ 目录是笔记系统，notes/data.js 存放所有笔记的纯文本，notes/note.html 是它们共用的渲染模板。\n\nGitHub Pages 配置在仓库设置中指向 main 分支根目录，无需构建工具，推送即发布。\n\n## 主题与配色\n\n整站统一在 CSS 变量中定义配色：背景色为 0a0a0a 的深色底，文字是米黄色调的 ink，强调色是粉调 accent，蓝色的 link 用于超链接，line 用于分隔线与次级边框。字体由三组组成：Fraunces 用于正文和主要标题，体现厚重的印刷感；Cormorant Garamond 用于斜体标题、引用文字和较优雅的大字场景；IBM Plex Mono 用于所有技术性信息（时间戳、编号、代码、导航）。\n\n动画统一使用 cubic-bezier(.2,.8,.2,1) 作为缓动，使整个站点视觉行为保持一致。\n\n## 页面骨架\n\nindex.html 的可见元素按顺序是：星空背景层（3 层静态星点 + 5 颗流星）；自定义指针（一个小圆点跟随鼠标，一个大环做延迟跟随并在遇到交互元素时变色）；英雄区 hero（占据首屏，内含导航栏、大标题、引用文字）；左侧固定页面目录 page-toc（进入内容区才显示）；依次是走马灯 marquee、关于卡片 about、作品列表 projects、数据 insights、笔记 notes、联系 contact，以及结尾页脚。\n\nHTML 结构保持极简：每个 section 都带一个 sec-head，内含编号 01-05，下方是该区域的主容器，内容由 JavaScript 渲染后填入对应的 id（aboutGrid、projList、notesFeed 等）。\n\n## 多语言：I18N 字典\n\n多语言不是用第三方库，而是一个手写的 JavaScript 对象 I18N，按语言分 8 个分支（中/英/日/韩/西/法/阿/俄）。每个语言分支都包含同样的键：meta.* 是页头和元信息，nav.* 是导航栏文字，sec.* 是 section 标题，sec.*Sub 是 section 的大字副标题，hero.title.lines 是英雄区三行标题的数据，hero.quote 是下方引用文字，marquee.items 是走马灯词条数组。\n\n还有两个关键的数组型字段：about.cards 是三张介绍卡片（每张含 label/title/text），works.items 是作品列表（每张含 title/tag/text，会指向 works/数字编号.html 的详情页）。\n\n## 语言切换流程\n\n用户点击语言切换栏中的按钮后，setLang(lang) 被调用：首先用 langMap 将语言短名映射到浏览器 lang 标签；然后把 document.title 设置为对应标题；最后遍历整个页面中带 data-i18n 与 data-i18n-html 的 DOM 节点，从字典中取值填入；同时遍历 hero 区的三行标题、关于卡片和作品列表，重新渲染；最后设置对应按钮为激活状态，并将语言写回 localStorage，下次访问时自动恢复。\n\n## 渲染函数：全部使用 DOM API\n\n全站没有使用任何字符串拼接 HTML 以避免 XSS 风险。buildTitleHtml 根据 hero.title.lines 的数据，一行行构建 title-line，每一行按风格（grad / ac / reg）渲染成不同的 span。renderText 是一个极简的 Markdown 解析器，识别 `<em>…</em>` 为强调文字，其它都作为纯文本插入。renderAbout 与 renderWorks 都是 DOM 节点级别的创建与 appendChild，不会写入任何拼接字符串。这既保证了安全，也方便随时把它改为支持其它格式。\n\n## 笔记系统\n\n笔记的数据只在 notes/data.js 中维护。每条笔记由 date、title、desc、content 四个字段组成；id 由 forEach 遍历时自动生成 001、002…；preview 是从 content 中提取的第一段完整句作为主页面的预览文本；content 会经过 parseNoteContent 自动转成 HTML。规则为：`##` 和 `###` 分别转成 `h2` 和 `h3`；`-` 和数字开头分别转成 `ul` 和 `li`；空行分隔段落；`**…**` / `*…*` 是粗体和斜体；`>…` 是引用；`\\`code\\`` 是行内代码；`\\`\\`\\`…\\`\\`\\`` 是代码块。\n\n主页面的笔记列表由 initNotesController 驱动：搜索框按关键词在标题/描述/预览中匹配；排序支持最新/最早/标题；每次渲染都会根据 PER_PAGE 分页，超过条数会显示 load-more 按钮。点击笔记行可以在列表处折叠展开查看 preview，想要进入完整详情页面，点击链接会跳转到 notes/note.html#ID。\n\nnote.html 模板读取 location.hash，从 NOTES_DATA 中找到匹配的笔记，呈现日期、标题、正文，并根据内容中的 `h2`、`h3` 自动构建右侧目录；目录使用 IntersectionObserver 监视滚动位置并高亮当前章节。\n\n## 英雄区：动画标题与自定义指针\n\n大标题的动画在 initTypewriter 中完成：它会按字符遍历 title-main 中已经渲染好的字符 span，每 n 毫秒激活一个字符；同时 hero 区域自带一个缓慢的向上滚动循环。指针系统由两部分组成：cursor-dot 直接跟随鼠标坐标；cursor-ring 使用 requestAnimationFrame 做插值跟随，创造轻微的延迟感。pointer 元素在鼠标进入带 data-cursor-hover 的元素或原生链接、按钮时会放大并变色。\n\n## 左侧目录的滚动避让\n\n左侧 page-toc 是 position fixed、top 50% 的星节点导航，5 个编号从 01 到 05，对应 about/projects/insights/notes/contact。为了避免和 hero 的大标题重叠，主页面在监听 hero 的 IntersectionObserver，当 hero 仍在视口内时会在 `<body>` 上加 is-hero-visible 类；此时 CSS 会把 page-toc 的 opacity 设为 0 并禁用点击，当用户向下滚动到内容区时目录会重新淡入。\n\n节点自身也是由 IntersectionObserver 控制高亮：主页面的 initPageTOC 把 5 个 section 注册，滚动时激活对应条目并施加缩放与光晕动画。\n\n## 数据统计\n\n使用 busuanzi 不蒜子作为第三方访问量服务。为了避免阿拉伯数字数字在用户界面上闪现再切换成罗马数字，设计了隐藏镜像节点机制：HTML 中保留两个 display:none 的 span，不蒜子脚本会把访问量和访客数填入它们；JavaScript 用 MutationObserver 监听这些隐藏节点的变化，拿到数字后经由 toRoman 函数转成罗马数字，并通过 runCountUp 做数字缓动动画填入可见元素。runCountUp 是通用的缓动计数函数，默认使用 ease-out 缓动曲线，也支持自定义的 fmt 格式化函数。数字显示采用 Cormorant Garamond 字体，与整体排版保持一致。\n\n## 可维护要点\n\n添加新作品：在 works 目录中新建 works/数字.html（例如 002.html），在 index.html 的 I18N 中所有语言的 works.items 里加一条（对应标题/标签/描述）；刷新主页后会自动出现。\n\n添加新笔记：只需在 notes/data.js 的 NOTES_DATA 数组头部加入新对象，填写 date、title、desc、content。content 可以直接写纯文本。\n\n添加新语言：在 index.html 的 I18N 中加一个语言分支，复制任一现有语言的键结构，把 langSwitch 按钮行加入新按钮；在 langMap 中登记对应的语言标签。无需改动 CSS 或其它脚本。\n\n调整配色与字体：只需要改动 `:root` 中的 CSS 变量与顶部 Google Fonts 链接，即可全局更换主题色与字体组合。\n\n要注意的细节是：hero 区域的淡入延迟与目录的淡入延迟要配合好；笔记模板中的滚动 spy 节点 `h2`/`h3` 需要有 scroll-margin-top，防止被目录遮挡。所有 section 都使用 padding 而非 margin 做间距，避免与 IntersectionObserver 的判定边界冲突。\n\n## 调试要点\n\n常见问题排查：如果大标题显示不出，请先确认 hero.title.lines 的每一条都在当前语言下有值；如果统计数字仍然是阿拉伯数字，检查隐藏镜像节点是否正确设置 display:none 并在 MutationObserver 回调中正确处理；如果侧边目录与大标题发生遮挡，检查 is-hero-visible 类是否正确加在 `<body>` 上。\n\n可以在浏览器控制台中直接修改 I18N 字典或 NOTES_DATA 以快速测试，然后再落回文件。'
  }
];

// 后处理：自动生成 id 和 preview，转换 content 为 HTML
NOTES_DATA.forEach((n, i) => {
  if (!n.id) n.id = String(i + 1).padStart(3, '0');
  if (!n.preview) n.preview = autoPreview(n.content);
  n.content = parseNoteContent(n.content);
});
