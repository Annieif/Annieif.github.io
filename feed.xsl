<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="html" encoding="UTF-8" doctype-public="-//W3C//DTD XHTML 1.0 Strict//EN" doctype-system="http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"/>
<xsl:template match="/">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="zh-CN" lang="zh-CN">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="description">Annieif — 独立造物者的笔记订阅。"/>
  <meta name="theme-color" content="#0a0a0a"/>
  <title>RSS · Annieif 笔记订阅</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,900;1,9..144,500;1,9..144,700&family=JetBrains+Mono:wght@400;500;600&display=swap"/>
  <style>
    :root{
      --bg:#0a0a0a;
      --ink:#e8e4dd;
      --ink-dim:#c4bfb4;
      --ink-faint:#6e6a62;
      --accent:#f4c2d0;
      --line:rgba(232,228,221,.10);
      --ease:cubic-bezier(.2,.8,.2,1);
    }
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{background:var(--bg);color:var(--ink);-webkit-font-smoothing:antialiased}
    body{
      font-family:Fraunces,serif;
      font-size:16px;line-height:1.75;
      font-weight:400;letter-spacing:.005em;
      min-height:100vh;
      padding:72px 24px 80px;
      position:relative;overflow-x:hidden;
    }
    /* subtle starfield */
    body::before{
      content:"";position:fixed;inset:0;pointer-events:none;z-index:0;
      background:
        radial-gradient(2px 2px at 20% 30%, rgba(244,194,208,.25), transparent 60%),
        radial-gradient(1.5px 1.5px at 60% 70%, rgba(255,255,255,.25), transparent 60%),
        radial-gradient(2px 2px at 80% 20%, rgba(122,180,216,.2), transparent 60%),
        radial-gradient(1.5px 1.5px at 10% 80%, rgba(255,255,255,.2), transparent 60%),
        radial-gradient(1.5px 1.5px at 40% 50%, rgba(244,194,208,.18), transparent 60%),
        radial-gradient(ellipse at 30% 20%, rgba(244,194,208,.06), transparent 60%),
        radial-gradient(ellipse at 80% 80%, rgba(122,180,216,.07), transparent 55%);
      background-size:400px 400px, 500px 500px, 450px 450px, 380px 380px, 550px 550px, 100% 100%, 100% 100%;
    }
    .wrap{position:relative;z-index:1;max-width:720px;margin:0 auto}
    /* header */
    header{
      padding-bottom:28px;border-bottom:1px solid var(--line);margin-bottom:48px;
    }
    .eyebrow{
      font-family:"JetBrains Mono",monospace;font-size:11.5px;
      letter-spacing:.18em;text-transform:uppercase;color:var(--ink-faint);
      margin-bottom:18px;
    }
    h1{
      font-family:"Cormorant Garamond",serif;
      font-style:italic;font-weight:500;
      font-size:56px;line-height:1.05;
      color:var(--ink);letter-spacing:-.015em;margin-bottom:12px;
    }
    h1 em{color:var(--accent);font-style:italic}
    .lede{color:var(--ink-dim);font-size:16.5px;line-height:1.75;max-width:56ch}
    /* meta row */
    .meta{
      display:flex;flex-wrap:wrap;gap:10px 24px;margin-top:26px;
      font-family:"JetBrains Mono",monospace;font-size:12px;
      color:var(--ink-faint);letter-spacing:.05em;
    }
    .meta .field{display:flex;gap:8px;align-items:center}
    .meta .k{color:var(--ink-faint);opacity:.8}
    .meta .v{color:var(--ink-dim)}
    /* subscribe card */
    .subscribe{
      display:flex;gap:16px;align-items:center;
      padding:18px 20px;margin:36px 0 56px;
      background:rgba(244,194,208,.04);
      border:1px solid rgba(244,194,208,.18);
      border-radius:12px;
    }
    .subscribe .ico{
      width:44px;height:44px;flex:0 0 44px;
      background:var(--accent);color:#1a1018;
      border-radius:10px;display:flex;align-items:center;justify-content:center;
      font-family:"Cormorant Garamond",serif;font-weight:700;font-size:22px;
    }
    .subscribe .txt{flex:1}
    .subscribe .title{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:20px;color:var(--ink);margin-bottom:2px}
    .subscribe .desc{color:var(--ink-dim);font-size:13.5px;line-height:1.6}
    .subscribe a.copy{
      font-family:"JetBrains Mono",monospace;font-size:12px;color:var(--accent);
      text-decoration:none;border-bottom:1px dashed rgba(244,194,208,.4);
      padding-bottom:1px;letter-spacing:.03em;
    }
    .subscribe a.copy:hover{border-bottom-color:var(--accent)}
    /* items */
    h2.sec{
      font-family:"JetBrains Mono",monospace;font-size:11.5px;
      letter-spacing:.18em;text-transform:uppercase;color:var(--ink-faint);
      margin:0 0 28px;
    }
    .item{
      padding:28px 0;border-bottom:1px solid var(--line);
      animation:fadeUp .5s var(--ease) backwards;
    }
    @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    .item:nth-child(1){animation-delay:.05s}
    .item:nth-child(2){animation-delay:.12s}
    .item:nth-child(3){animation-delay:.19s}
    .item:nth-child(4){animation-delay:.26s}
    .item:nth-child(5){animation-delay:.33s}
    .item .id{
      font-family:"JetBrains Mono",monospace;font-size:11px;
      letter-spacing:.15em;color:var(--ink-faint);margin-bottom:10px;
    }
    .item h3{
      font-family:"Cormorant Garamond",serif;font-style:italic;font-weight:500;
      font-size:28px;line-height:1.2;color:var(--ink);margin-bottom:8px;
      letter-spacing:-.005em;
    }
    .item h3 a{color:inherit;text-decoration:none;border-bottom:1px solid transparent;transition:all .2s var(--ease)}
    .item h3 a:hover{color:var(--accent);border-bottom-color:rgba(244,194,208,.3)}
    .item .date{
      font-family:"JetBrains Mono",monospace;font-size:11.5px;
      letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint);
      margin-bottom:14px;
    }
    .item p{color:var(--ink-dim);font-size:15.5px;line-height:1.75;margin:0 0 12px}
    .item p:last-child{margin-bottom:0}
    .item h3,h4{color:var(--ink);font-weight:500;font-family:"Cormorant Garamond",serif;font-style:italic;margin:18px 0 8px}
    .item h3{font-size:22px;margin-bottom:6px}
    .item strong{color:var(--ink);font-weight:600}
    .item em{color:var(--accent);font-style:italic}
    .item code{font-family:"JetBrains Mono",monospace;font-size:.82em;background:rgba(244,194,208,.06);color:#f9d6e0;padding:1px 6px;border-radius:4px;border:1px solid rgba(244,194,208,.16)}
    .readmore{
      display:inline-block;margin-top:14px;font-family:"JetBrains Mono",monospace;
      font-size:12px;letter-spacing:.12em;text-transform:uppercase;
      color:var(--accent);text-decoration:none;border-bottom:1px solid rgba(244,194,208,.3);
      padding-bottom:2px;transition:all .2s var(--ease);
    }
    .readmore:hover{border-bottom-color:var(--accent);letter-spacing:.16em}
    /* footer */
    footer{
      margin-top:56px;padding-top:28px;border-top:1px solid var(--line);
      text-align:center;font-family:"JetBrains Mono",monospace;
      font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faint);
    }
    footer a{color:var(--accent);text-decoration:none;border-bottom:1px dashed rgba(244,194,208,.3)}
    footer a:hover{border-bottom-color:var(--accent)}
    @media (max-width:640px){
      body{padding:48px 20px 60px}
      h1{font-size:40px}
      .subscribe{flex-direction:column;align-items:flex-start;gap:12px}
      .item h3{font-size:22px}
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <div class="eyebrow">RSS 2.0 · UTF-8 · FEED.XML</div>
      <h1>独立造物者的 <em>笔记订阅</em>。</h1>
      <p class="lede">
        这里汇集 Annieif 的所有最新笔记。如果你习惯用 RSS 阅读器 — 把下面的链接加进
        Feedly、Reeder、NetNewsWire、Readwise Reader、Vienna 或你常用的任何阅读器即可。
      </p>
      <div class="meta">
        <span class="field"><span class="k">FEED</span><span class="v">/feed.xml</span></span>
        <span class="field"><span class="k">LANG</span><span class="v">zh-cn</span></span>
        <span class="field"><span class="k">UPDATED</span><span class="v"><xsl:value-of select="rss/channel/lastBuildDate"/></span></span>
      </div>
    </header>

    <div class="subscribe">
      <div class="ico">✦</div>
      <div class="txt">
        <div class="title">复制 feed 地址</div>
        <div class="desc">粘贴到你的 RSS 阅读器 — 支持所有主流应用。</div>
      </div>
      <a class="copy" href="feed.xml" title="复制 feed 地址">/feed.xml</a>
    </div>

    <h2 class="sec">—— 笔记列表</h2>

    <xsl:for-each select="rss/channel/item">
      <article class="item">
        <div class="id">· <xsl:value-of select="guid"/> ·</div>
        <h3><a href="{link}"><xsl:value-of select="title"/></a></h3>
        <div class="date"><xsl:value-of select="pubDate"/></div>
        <xsl:value-of select="description" disable-output-escaping="yes"/>
        <p><a class="readmore" href="{link}">阅读全文 →</a></p>
      </article>
    </xsl:for-each>

    <footer>
      Annieif · 纯静态托管 · 无广告 · 无追踪<br/>
      <a href="https://annieif.github.io/">← 返回首页</a>
    </footer>
  </div>
</body>
</html>
</xsl:template>
</xsl:stylesheet>
