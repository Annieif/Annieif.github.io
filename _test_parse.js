const text1 = `地球仪与地图 — 空间坐标系的基础语言。从椭球体到经纬网，一张地图是地球的缩影。

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
- **相对位置**：与周边国家、行政区、地形区、交通线等的相对方位关系。`;

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
const out = parseNoteContent(text1);
console.log('OK. Output length:', out.length);
console.log('Contains <h2>:', out.includes('<h2>'));
console.log('Contains <table>:', out.includes('<table>'));
console.log('Contains <strong>:', out.includes('<strong>'));
console.log('Contains <ul>:', out.includes('<ul>'));
console.log('Contains <ol>:', out.includes('<ol>'));
console.log('Contains <li>:', out.includes('<li>'));
