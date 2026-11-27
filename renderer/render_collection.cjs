const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
const katex=require(path.join(root,'assets/katex.min.js'));
const {metadata,questions}=JSON.parse(fs.readFileSync(path.join(root,'题目数据.json'),'utf8'));
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const errors=[];let formulaCount=0;
function mathHtml(text,id){
  const re=/\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g;
  let result='',last=0,m;
  while((m=re.exec(text))!==null){
    result+=escape(text.slice(last,m.index)).replaceAll('\n','<br>');
    try{result+=katex.renderToString(m[1]??m[2],{displayMode:m[1]!==undefined,throwOnError:true,strict:'ignore',output:'htmlAndMathml'});formulaCount++;}
    catch(e){errors.push({id,formula:m[1]??m[2],error:e.message});result+=escape(m[0]);}
    last=re.lastIndex;
  }
  return result+escape(text.slice(last)).replaceAll('\n','<br>');
}
const firstNew=questions.find(q=>q.is_new);
const addedCount=questions.filter(q=>q.is_new).length;
const sections=[...new Set(questions.map(q=>q.section))];
const css=fs.readFileSync(path.join(root,'assets/katex.offline.css'),'utf8');
const remainingFontUrls=[...css.matchAll(/url\(([^)]+)\)/g)].map(m=>m[1]).filter(u=>!u.startsWith('data:'));
if(remainingFontUrls.length)throw Error('Unembedded fonts: '+remainingFontUrls.join(', '));
const chunks=[];
let currentSection=null,chapterIndex=-1;
const chapterEntries=[];
const {createHash}=require('node:crypto');
const reviewKeys=new Map();
function reviewKey(q){
    const identity=JSON.stringify([q.section,q.original_label,q.text]);
    const index=reviewKeys.get(identity)||0;
    reviewKeys.set(identity,index+1);
    return createHash('sha256').update(identity+'#'+index).digest('hex').slice(0,24);
}
for(const q of questions){
    if(q.section!==currentSection){
      if(currentSection!==null)chunks.push('</section>');
      currentSection=q.section;chapterIndex++;
      chapterEntries.push({title:currentSection,index:chapterIndex});
      chunks.push(`<section class="chapter" id="chapter-${chapterIndex}"><h2>${escape(currentSection)}</h2>`);
    }
    const pageLinks=q.pages.map(n=>`<a href="${metadata.source_url}#page-${n}" target="_blank" rel="noopener">第 ${n} 页</a>`).join('<span class="sep"> / </span>');
    const sourceImages=q.pages.map(n=>`<figure><figcaption>原笔记第 ${n} 页</figcaption><a href="pages/page-${String(n).padStart(3,'0')}.png" target="_blank"><img loading="lazy" src="pages/page-${String(n).padStart(3,'0')}.png" alt="笔记第 ${n} 页，含原题及解答"></a></figure>`).join('');
    const search=escape([String(q.id).padStart(3,'0'),q.section,q.original_label,q.text,q.proof||'',q.answer||'',q.pages.join(' '),q.note].join(' ').toLowerCase());
    const proof=q.proof?`<details class="proof"><summary>展开定理／性质证明</summary><div class="proof-body">${mathHtml(q.proof,q.id)}</div></details>`:'';
    const answer=q.answer?`<details class="solution"><summary>展开手写答案与回代核对</summary><div class="proof-body">${mathHtml(q.answer,q.id)}</div></details>`:'';
    chunks.push(`<article class="question${q.note.includes('需核对')?' review':''}" id="q-${q.id}" data-review-key="${reviewKey(q)}" data-section="${escape(q.section)}" data-kind="${q.kind}" data-page="${Math.min(...q.pages)}" data-pages="${q.pages.join(' ')}" data-new="${q.is_new?'true':'false'}" data-search="${search}"><div class="question-head"><h3><span class="number">${String(q.id).padStart(3,'0')}</span>${escape(q.original_label)}${q.is_new?'<span class="new-badge">新增</span>':''}</h3><div class="pages">${q.proof?'定理／性质证明':'例题／练习'} · 笔记 ${pageLinks}</div></div><div class="prompt">${mathHtml(q.text,q.id)}</div>${proof}${answer}${q.note?`<aside class="note">${escape(q.note)}</aside>`:''}<details class="source"><summary>展开原笔记截图（含解答）</summary>${sourceImages}</details><div class="review-buttons" role="group" aria-label="第 ${q.id} 题复习结果"><button type="button" data-mark="retry" aria-pressed="false">没做出来</button><button type="button" data-mark="done" aria-pressed="false">做出来了</button></div></article>`);
}
chunks.push('</section>');
if(errors.length){fs.writeFileSync(path.join(root,'formula-check.json'),JSON.stringify(errors,null,2));throw Error(`${errors.length} formula render errors`);}
const options=sections.map(s=>`<option value="${escape(s)}">${escape(s)}</option>`).join('');
const toc=sections.map(s=>`<a href="#chapter-${chapterEntries.find(c=>c.title===s).index}">${escape(s)}</a>`).join('');
const review=questions.filter(q=>q.note.includes('需核对')).map(q=>`<a href="#q-${q.id}">第 ${String(q.id).padStart(3,'0')} 题</a>`).join('、');
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>工科数学分析 · 例题与定理证明</title><style>${css}
:root{color-scheme:light;--ink:#202622;--muted:#687169;--line:#dce3db;--accent:#245b42}*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:90px}body{margin:0;background:#f4f6f1;color:var(--ink);font-family:"Microsoft YaHei","PingFang SC",system-ui,sans-serif;font-size:16px;line-height:1.85}a{color:var(--accent);text-underline-offset:3px}main{max-width:1056px;margin:0 auto;padding:52px 38px 80px}header{padding-bottom:26px;border-bottom:1px solid var(--line)}.eyebrow{margin:0;color:var(--muted);font-size:13px;letter-spacing:.06em}h1{font-size:34px;line-height:1.35;font-weight:650;margin:10px 0 12px}.intro{max-width:830px;color:#4e5b50;margin:0}.meta{margin:15px 0 0;color:var(--muted);font-size:14px}.review-link{margin:8px 0 0;font-size:14px;color:#825b22}.toolbar{flex-wrap:wrap;position:sticky;top:0;z-index:3;display:flex;gap:10px;align-items:center;padding:14px 0;background:rgba(244,246,241,.97);border-bottom:1px solid var(--line)}input,select,button{font:inherit;color:inherit;border:1px solid #c9d3c8;border-radius:5px;background:white;padding:9px 12px;font-size:14px}input{flex:1;min-width:100px}select{max-width:220px}button{cursor:pointer;white-space:nowrap}.counter{font-size:13px;color:var(--muted);min-width:70px;text-align:right}.toc{display:flex;flex-wrap:wrap;gap:6px 17px;padding:20px 0 10px;font-size:13px}.toc a{text-decoration:none}.chapter{margin-top:42px}.chapter h2{font-size:23px;font-weight:620;padding-bottom:10px;border-bottom:2px solid var(--accent);margin:0 0 22px}.question{background:white;padding:24px 28px 18px;margin:0 0 18px;border:1px solid var(--line);border-radius:6px;scroll-margin-top:16px}.question-head{display:flex;gap:12px;justify-content:space-between;align-items:baseline;flex-wrap:wrap;margin-bottom:15px}h3{font-size:16px;font-weight:600;margin:0;line-height:1.7}.number{font-variant-numeric:tabular-nums;color:var(--accent);margin-right:13px;font-weight:700}.pages{font-size:13px;color:var(--muted)}.pages a{text-decoration:none;white-space:nowrap}.sep{color:#a4aea3}.prompt{font-size:17px;line-height:1.95;overflow-wrap:anywhere}.katex{font-size:1.08em}.katex-display{overflow-x:auto;overflow-y:hidden;padding:5px 0;margin:12px 0}.note{margin-top:16px;padding:10px 13px;background:#fff7e8;border-left:3px solid #bd8c3e;font-size:13px;line-height:1.75;color:#71521e}.proof{margin-top:20px;border-top:1px solid #dce3db;padding-top:12px}.proof summary,.solution summary{cursor:pointer;color:var(--accent);font-weight:600;font-size:14px}.proof-body{padding-top:15px;line-height:1.95;overflow-wrap:anywhere}.source{margin-top:17px;border-top:1px solid #edf0eb;padding-top:10px}.source summary{cursor:pointer;font-size:12px;color:#71806f;user-select:none}.source figure{margin:18px 0 8px}.source figcaption{font-size:13px;color:var(--muted);margin-bottom:7px}.source img{display:block;max-width:100%;height:auto;border:1px solid var(--line)}footer{margin-top:44px;padding-top:16px;border-top:1px solid var(--line);font-size:13px;color:var(--muted)}.empty{display:none;text-align:center;padding:44px;color:var(--muted)}[hidden]{display:none!important}
.new-badge{font-size:11px;background:#eaf3e9;color:#245b42;padding:2px 6px;margin-left:10px;font-weight:500;vertical-align:middle}.actions{display:flex;flex-wrap:wrap;align-items:center;gap:10px 20px;margin:18px 0 0;font-size:14px}.actions button{padding:5px 10px}.new-filter{display:inline-flex;align-items:center;gap:6px;font-size:13px;white-space:nowrap}.toolbar #new-only{width:16px;min-width:16px;height:16px;flex:0 0 16px;margin:0}.toolbar #page-filter{width:95px;flex:0 0 95px;min-width:0}
@media(max-width:650px){html{scroll-padding-top:190px}main{padding:27px 15px 50px}h1{font-size:27px}.question{padding:19px 17px 14px}.prompt{font-size:16px}.toolbar{flex-wrap:wrap}.toolbar input{width:100%;flex-basis:100%}.toolbar select{flex:1;max-width:none}.counter{margin-left:auto}.toc{gap:6px 13px}.chapter h2{font-size:21px}}
@media print{@page{size:A4;margin:16mm 15mm}body{background:white;font-size:11pt}main{max-width:none;margin:0;padding:0}h1{font-size:22pt}.toolbar,.toc,.source,.review-link,.actions{display:none!important}header{padding-bottom:12pt}.intro,.meta{font-size:9pt}.chapter{margin-top:22pt}.chapter h2{font-size:16pt;break-after:avoid}.proof:not([open]){display:none}.proof-body{font-size:10.5pt}.question{border:0;border-bottom:1px solid #ccc;border-radius:0;padding:13pt 0;margin:0;break-inside:avoid-page}.prompt{font-size:11.5pt;line-height:1.8}.question-head{margin-bottom:8pt}h3{font-size:11pt}.pages{font-size:8.5pt}.note{font-size:8.5pt}a{color:#333;text-decoration:none}.katex-display{overflow:visible}.katex{font-size:1.05em}}
 .review-buttons{display:flex;gap:8px;margin-top:16px}.review-buttons button{font-size:14px;min-height:42px}.review-buttons button[aria-pressed=true]{background:#245b42;color:white;border-color:#245b42}.review-buttons [data-mark=retry][aria-pressed=true]{background:#844c26;border-color:#844c26}.toolbar select{min-width:0}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}#storage-notice{color:#844c26;font-size:14px}@media print{.review-buttons,#storage-notice{display:none}}
</style></head><body><main id="top"><header><p class="eyebrow">GOODNOTES / 手写笔记题库</p><h1>工科数学分析 · 例题与定理证明</h1><p class="intro">按笔记页序穿插例题与定理证明，已补入最新内容至第${metadata.last_content_page}页。先练习，再展开排版后的证明或手写原页核对。证明依原笔记思路整理，并补齐省略步骤。</p><p class="meta">${metadata.snapshot_date} 整理 · 已查看全部 ${metadata.source_page_count} 页 · ${questions.length} 组（${metadata.exercise_count} 组例题练习 · ${metadata.theorem_proof_count} 组证明） · 页码含封面，与共享笔记一致</p><p class="review-link">原笔记需核对：${review}，已保留核对备注。</p><div class="actions"><a href="#q-${firstNew.id}" id="new-jump">本次新增 ${addedCount} 组</a><a href="工科数学分析_题目摘抄.md" download>下载 LaTeX 文稿</a><button id="print" type="button">打印当前内容</button></div></header><div class="toolbar"><select id="review-mode" aria-label="复习范围"><option value="review">待复习</option><option value="solved">已做出来</option><option value="all">全部题目</option></select><input id="search" type="search" placeholder="搜索题干、公式名称、题号或笔记页码" aria-label="搜索题目"><select id="section" aria-label="选择章节"><option value="">全部章节</option>${options}</select><select id="kind" aria-label="选择题型"><option value="">全部题型</option><option value="exercise">例题／练习</option><option value="theorem">定理／性质证明</option></select><input id="page-filter" type="number" min="1" max="${metadata.source_page_count}" placeholder="笔记页码" aria-label="按笔记页码筛选"><label class="new-filter"><input id="new-only" type="checkbox">只看本次新增</label><span id="counter" class="counter">${questions.length} 组</span></div><nav class="toc" aria-label="章节目录">${toc}</nav><span class="sr-only" id="review-feedback" role="status"></span><p id="storage-notice" hidden>浏览器未允许保存记录，本次标记仅在当前页面有效。</p><p class="empty" id="empty">没有找到符合条件的题目。</p><section id="priority" class="chapter" hidden><h2>优先复习 · 上次没做出来</h2></section>${chunks.join('')}<footer>来源：<a href="${metadata.source_url}" target="_blank" rel="noopener">Goodnotes《工科数学分析》</a> · 内容已更新至第${metadata.last_content_page}页，共${metadata.source_page_count}页。<br>更新笔记后，可在原聊天中要求沿用链接增补；插页或调整顺序后需同步核对页码。<a href="#top">回到顶部</a></footer></main><script>
const cards=[...document.querySelectorAll('.question')],chapters=[...document.querySelectorAll('.chapter')],search=document.getElementById('search'),section=document.getElementById('section'),kind=document.getElementById('kind'),pageFilter=document.getElementById('page-filter'),newOnly=document.getElementById('new-only');
function filter(){
 const terms=search.value.trim().toLowerCase().normalize('NFKC').split(/ +/).filter(Boolean),s=section.value,k=kind.value,p=pageFilter.value;
 let visible=0;
 for(const card of cards){
  const hay=card.dataset.search.normalize('NFKC');
  card.hidden=!!(!reviewMatches(card)||(s&&card.dataset.section!==s)||(k&&card.dataset.kind!==k)||(p&&!card.dataset.pages.split(' ').includes(String(Number(p))))||(newOnly.checked&&card.dataset.new!=='true')||terms.some(t=>!hay.includes(t)));
  if(!card.hidden)visible++;
 }
 for(const chapter of chapters)chapter.hidden=![...chapter.querySelectorAll('.question')].some(q=>!q.hidden);
 document.getElementById('counter').textContent=visible+' / '+cards.length+' 组';document.getElementById('empty').style.display=visible?'none':'block';
}
function resetFilters(){search.value='';section.value='';kind.value='';pageFilter.value='';newOnly.checked=false;filter();}
search.addEventListener('input',filter);section.addEventListener('change',filter);kind.addEventListener('change',filter);pageFilter.addEventListener('input',filter);newOnly.addEventListener('change',filter);
document.querySelectorAll('.toc a').forEach(link=>link.addEventListener('click',event=>{
 resetFilters();
 const target=document.getElementById(link.hash.slice(1));
 if(target.hidden){
   event.preventDefault();
   section.value=target.querySelector('h2').textContent;
   filter();
   (prioritySection.hidden?document.getElementById('empty'):prioritySection).scrollIntoView();
 }
}));
document.getElementById('new-jump').addEventListener('click',event=>{
 resetFilters();
 newOnly.checked=true;
 filter();
 const first=document.querySelector('.question[data-new="true"]:not([hidden])');
 event.preventDefault();
 (first||document.getElementById('empty')).scrollIntoView();
});
document.getElementById('print').addEventListener('click',()=>window.print());
${fs.readFileSync(path.join(root,'review.js'),'utf8')}
</script></body></html>`;
fs.writeFileSync(path.join(root,'工科数学分析_练习版.html'),html,'utf8');
fs.writeFileSync(path.join(root,'formula-check.json'),JSON.stringify({groups:questions.length,formulas:formulaCount,errors,offline_fonts:20},null,2));
console.log(`Rendered ${questions.length} groups and ${formulaCount} formulas; zero parse errors.`);
