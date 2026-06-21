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
    date:'2026-06-21',
    title:'React 初探 · 从原生到框架',
    desc:'写了大半年原生 JS，终于还是被推着来学 React 了。',
    content:`写了大半年原生 JS，终于还是被推着来学 React 了。

说实话，一开始是抗拒的。零依赖，不编译，写完 \`Ctrl+S\` 刷新浏览器 — 这种自由一旦尝过，就很难接受框架的条条框框。但周围的声音太响了："你真的该学个框架了。" 那就来吧。反正 ==美中不足，好事多磨==。

## 为什么是 React

三个框架摆在一起，Angular 太重，Vue 太甜。React 刚好卡在中间。

它概念少。JSX、组件、props、state、hooks — 一只手数得过来。它离原生近。JSX 本质就是 JavaScript，不用学新的模板语法。对于习惯了 \`document.createElement\` 的人来说，这是一种尊重。

更重要的是，它的生态大到你几乎不可能踩到无人回答过的坑。

## JSX：把 HTML 写进 JS 里

第一眼：这什么鬼。

\`\`\`
// 原生 — 我写了半年
const div = document.createElement('div');
div.className = 'card';
div.innerHTML = '<h2>' + title + '</h2>';
div.addEventListener('click', handleClick);
\`\`\`

\`\`\`jsx
// React — 一行抵四行
function Card({ title, onClick }) {
  return (
    <div className="card" onClick={onClick}>
      <h2>{title}</h2>
    </div>
  );
}
\`\`\`

视图结构、样式、事件绑定 — 全在一个地方。当组件从十行变成一百行，原生 JS 里你要在 \`createElement\` 和 \`innerHTML\` 之间来回跳。React 里，你只需要看一个函数的返回值。

> JSX 是 \`React.createElement()\` 的语法糖。Babel 编译时把标签转成函数调用。拆开来看，并不神秘。

## 组件：把页面拆成积木

原生 JS 开发时，我经常写一个巨大的 \`index.html\`，所有逻辑混在一起。改一个按钮的状态，要先 \`querySelector\` 找到它，再手动改 \`textContent\`。改完刷新，发现忘了改另一个地方的联动。

React 强制你把页面拆成小组件，每个只做一件事。

| 概念 | 原生 JS | React |
| :--- | :--- | :--- |
| 组件 | 一个函数 + 一段 HTML 模板 | \`function X() { return <JSX /> }\` |
| Props | 函数参数 | \`<Comp name="value" />\` |
| State | 全局变量 + 手动 \`textContent\` | \`useState()\` |
| 事件 | \`addEventListener\` | \`onClick={fn}\` |

改一个按钮的逻辑，只需要在对应的组件文件里找。不用在几千行的 HTML 里翻。==这种局部性，是框架给我最大的礼物==。

## Hooks：函数组件的灵魂

class 组件我跳过了。**函数组件 + Hooks 是 React 的未来**，没必要走弯路。

### \`useState\`

\`\`\`jsx
const [count, setCount] = useState(0);
\`\`\`

原生里改了变量，还要手动更新 DOM。React 里改了 state，组件自动重渲染。这就是声明式 UI — 你只管描述"状态是什么"，框架负责把状态变成 DOM。

### \`useEffect\`

\`\`\`jsx
useEffect(() => {
  document.title = '你点击了 ' + count + ' 次';
}, [count]);
\`\`\`

定时器、数据请求、手动 DOM 操作 — 这些不属于渲染逻辑的事情，都丢进 useEffect。第二个参数控制什么时候执行，不用再写一堆 \`if\` 判断。

### \`useRef\`

\`\`\`jsx
const inputRef = useRef(null);
// <input ref={inputRef} />
// inputRef.current.focus();
\`\`\`

原生里我整天 \`document.querySelector\`，React 里用 ref。区别是 ref 不触发重渲染。它是"逃逸舱口" — 当声明式管不到的时候，用它直接操作 DOM。

## 状态提升：数据往上传

React 的数据流是单向的。父传子用 props，子传父不能直接改 props — 只能调用父组件传下来的函数。

\`\`\`jsx
function Parent() {
  const [value, setValue] = useState('');
  return <Child value={value} onChange={setValue} />;
}
function Child({ value, onChange }) {
  return <input value={value} onChange={e => onChange(e.target.value)} />;
}
\`\`\`

这叫"状态提升"。刚开始觉得绕 — 明明子组件可以直接改，为什么要传函数上去再传下来？习惯了之后才明白，==数据流单向，bug 的来源就少了一半==。

## 原生 vs React

写了大半年原生，突然切换到 React，几个最直接的感受：

1. **心智模型变了**。原生是"我要做什么"（命令式），React 是"我要什么"（声明式）。刚开始不习惯，习惯了回不去。
2. **不用手动 DOM 了**。\`createElement\`、\`appendChild\`、\`innerHTML\` — 这些全部消失。虚拟 DOM 帮你 diff，只更新变化的部分。
3. **但失去了直接控制**。原生里你想改哪个元素就改哪个。React 里要通过 state 和 props 间接操作。大多数时候是好事，偶尔会觉得 =="绕了一圈"==。
4. **构建工具是必须的**。原生写完直接刷新。React 需要 Babel 编译 JSX，需要 Vite 打包。多了一步，但换来模块化、热更新、代码分割。

## 还没想通的事

- **性能优化**：\`useMemo\`、\`useCallback\`、\`React.memo\` — 什么时候用？社区说法不一。有人说"默认不需要，遇到性能问题再加"，有人说"从一开始就写好"。我选择前者。先写对，再写快。
- **状态管理**：Context 够用吗？什么时候该上 Redux / Zustand？目前感觉够用，但不确定项目变大后会不会失控。
- **Next.js**：概念太多了。先放一放。把 React 本身搞熟再说。

## 接下来

1. 用 React 重写一个小项目，在实践中理解概念
2. React Router — 理解 SPA 路由
3. TanStack Query — 处理服务端数据
4. 最后再碰 Next.js

> 原生 JS 教会我理解底层。React 教会我组织代码。两者不冲突，是互补的。就像 ==美中不足，好事多磨== — 框架不是完美的，但值得学。`
  },
  {
    date:'2026-06-21',
    title:'边狱巴士第四章 · 梦、镜与花海',
    desc:'从九人会到东柏、东朗、李箱，第四章讲的不是绝望，而是废墟上的嫩芽。',
    content:`*Limbus Company* 第四章完结后，我很久没有缓过来。Project Moon 从脑叶公司时期就在写一种东西——让你在废墟里找花。第四章把这件事做到了极致。

## 一个循环

整个第四章的主旨，一句话就能说清楚：从梦想到现实，再到现实的理想。

卡门梦想拯救都市，创造了与都市格格不入的研究所。然后首脑来了，一切被摧毁。艾因从断壁残垣中拾起卡门梦想的残余，用首脑的大脑理解现实的全貌，将飘渺的梦想化作可行的理想，再用最现实的方式去实现它。这就是脑叶公司。

而当这句话从世界之翼的尺度缩小到都市间的渺小众生时，它的缩影就是九人会。

东朗想在不伤害任何人的前提下，治愈全都市的苦难。东柏想让每一个研究者都能自由地享受探索的乐趣。李箱想让技术远离现实的污秽，永远进行纯粹的、为了研究而进行的研究。三个人，三种梦想，同样不切实际。

他们因梦想聚在一起，又在不同的时间点被迫向现实屈膝。有人的梦想消失在亲手把技术扔进焚化炉的那一天，有人的梦想在 T 公司日益频繁的搜查中逐渐腐烂，有人的梦想则在办公室地下的炸药引爆后灰飞烟灭。

但最终，他们都找到了自己的路。

这是我第一次觉得，"从梦想到现实"后面接的不一定是"破灭"。它可以是"再到现实的理想"——一个更残酷、也更清醒的循环。

## 东柏 · 山茶

东柏的原型不是人。她是九人会成员金裕贞笔下的一株山茶花。韩语中，山茶树别名就是"东柏"。山茶花的花语是谦让、高洁、可爱、美丽，以及——理想的爱。

她组建技术解放联盟，口号是摧毁一切技术。但作为把纯粹研究当作理念的九人会核心成员，她怎么可能真心想要技术消失？这只是幌子。

真正的原因很冷硬：在都市，几乎所有值得一提的技术都会被申请专利。而拥有专利的技术，就相当于被持有者垄断，在首脑的保护下合法地牟取暴利。九人会之所以分崩离析，始于 T 公司对会长杨吉所发明的玻璃窗技术的觊觎。当某个公司拥有的专利太多，它就会限制普通人研究的自由，最终让类似九人会这样为纯粹研究而存在的团体，永远失去诞生的土壤。

所以东柏要让现存技术消失。一方面，让后人能够探索的空间变大；另一方面，让世界之翼对底层的压制力变小。果实已然枯萎，埋下未来的嫩芽。让过去与现实的一切都成为养料，最终开出一片比现在更美丽的花田。

她在实现理想的过程中杀死了很多人。她自己知道，自己不是好人。但她从未扭曲——因为要走的路，从九人会覆灭那天就已经确定了。

在都市，不直面实现理想所必经的残酷，是永远无法成功的。世界之翼都是如此，何况个人呢。从梦想的尸骨中诞生的理想，无论荒谬与否，都是唯一且必将践行的选择。

## 东朗 · 天才中的凡人

东朗是第四章我最喜欢的角色。如果用一句话形容他，就是"一群天才中的凡人"。

他的原型可能是现实九人会成员柳志珍，但经历更接近韩国生物科学家黄玉熹——出身赤贫，自幼丧父，母亲靠老黄牛耕田养活全家。黄玉熹从小喜欢牛，立志成为兽医，治愈全世界的病牛。东朗的梦想比这更宏大：他想终结整个都市的苦难。

可惜，他的才能撑不起他的梦想。

九人会是天才的聚集地。启迪者大会的每一样小东西，流到外界都可能成为重大发明。所以他们对自己发明的要求极高——除非能改变整个都市，否则就是"玩具"。绝大多数成员也确实以创造玩具的心态做研究。所以在得知自己的技术可能被 T 公司利用时，他们用概念焚化炉摧毁它们，纵使不舍，也没过多挣扎。

只有东朗不同。别人做研究是为了玩，只有他是认真的。他想治愈全都市，这不只是一句口号，而是从小支撑他到现在的信念。小黄牛、三桥、他的科员——这些都是东朗良善的象征。

但他第一次动摇，来自同乡的一句嘲弄。那句评价是：你做的东西就是一堆玩具，根本派不上用场。所有人都在做玩具，只有他觉得自己做的可以真正应用。当他把自己的技术扔进概念焚化炉的那一刻，内心的某个部分就已经死去了。

后来他看到 K 公司推出的治愈安瓿——有人做出了能让人近乎起死回生的起点技术。他终于崩溃了。自己一直以来的努力，真的如同东柏所说，是一个玩具，完完全全的一文不值。

所以当 T 公司明里暗里威胁他时，他把九人会地下室的秘密出卖了。

但噩梦还没结束。加入 K 公司后，阿方索的话里话外都在暗示：我们要你，不是因为你的能力，而是因为你是九人会的前成员。比起期待你，我们更希望你能帮我们找到杨吉。九人会纵使毁灭，它的阴影也笼罩在东朗的生活之上。

他仿造了阳极的玻璃窗。从此再也无法摆脱九人会。那一刻他清楚地意识到——自己拥有的一切都属于九人会。那些奖杯里空无一物。他永远无法用自己的能力去填满它。

于是他扭曲了。扭曲形态的后缀是**否定一切者**。他否定九人会的一切，否定曾经的自己，杀死心中那头小黄牛，舍弃最后的善良。背景中的金色麦田被工厂包围——他决心用一己之力，用都市的做法，去守护自己最初的梦想。

但当他被李箱击败，破碎的翅膀在九人会的旧房间里重新凝结，他才意识到：九人会不是敌人，而是那个永远包容他的家。

## 李箱 · 镜中花海

李箱的笔名，真的来自一个箱子。

韩国的画家好友为了庆祝他考上大学，送了他一幅画。李箱本身也非常喜欢画画，对这个箱子爱不释手。正好那时还没有笔名——为了纪念他们的友谊，就把"箱"作为名。至于姓李，是因为箱子是木头做的，木姓之中，李最符合他的气质。他的原名是金海清。

作为一号罪人，李箱是监狱里第一个完成自我拯救的角色。也是在第四章，我们才知道，原来 3.5 章里那个对着烧焦土豆吟诗的厨子诗人，并不是 Project Moon 在 OOC——那就是李箱的本性。

九人会对李箱的意义，和东柏、东朗有本质区别。东柏看重的是九人会所代表的意义，东朗看重的是技术能否被应用。但对李箱来说，九人会是他的**家**。他的钱、技术、权利，一切都是为了九人会而存在。他不在乎自己废寝忘食创造的镜子是否得到应用，也不在乎当建筑师时赚取的巨额财产。

所以，当东柏为了保护玻璃窗技术而引爆办公室地下的炸药后，李箱的世界崩塌了。他失去了家，失去了生存的意义。

被囚夫带走后，他终日与镜中的自己对话。他羡慕镜中那个拥有翅膀的自己——无数平行世界有无数的李箱，但只有一个李箱能拥有飞向高空的翅膀。他始终认为，自己的翅膀已被折断。只能在无尽的平行世界里，用镜子注视唯一拥有翅膀的那个自己，来排解那无边的孤独。

失败早已注定。无论怎么挣扎，似乎都无济于事。

然后，第四章最精彩的一幕来了。

李箱站在无数画面之前，看着无数平行宇宙中没有翅膀的自己。他闭上眼睛，回忆起在启迪者大会第一次向九人会展示镜子的场景。画面消散。已经死去的东柏，通过金枝的力量，在镜中的花海之前，告诉了他最后一件事。

她其实在那时就已经发现：镜中展示的，并不是平行世界的李箱，而是**可能性**。

一瞬间，无数画面带来的绝望，全都变成了希望。那不是李箱遥不可及的其他世界。那是李箱本人拥有的可能性。无限的可能性。镜中李箱所拥有的翅膀，既是他的，也是李箱自己的。因为镜中映照的是自己的模样——这是常识。

随后，李箱挥动翅膀。在九人会的旧日指引下，为走入歧途的老友东朗写下结局。也就此正式走出了过去的九人会，将巴士视作自己的新家。

一个关于把绝望变成希望的故事，用一面镜子，一片花海，就这样讲完了。

## 写在最后

都市的故事看起来是绝望的：它毁灭一个又一个梦想，催生一个又一个悲剧。放眼望去，似乎只有无垠黑暗。

但第四章让我觉得，Project Moon 想写的从来不是绝望。跨过无尽的苦难，前人的尸骨会滋养后世的土壤。在一切的尽头，是梦想中的无边花海。从萌芽到毁灭，从毁灭到新生。脑叶公司如是，废墟图书馆如是，边狱巴士亦如是。

> 拥抱过去，才能创造未来。`

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
