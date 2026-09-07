const marketState={data:null,fx:null};
const fmt=new Intl.NumberFormat(undefined,{maximumFractionDigits:2});
const currencyNames=new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'});

// The poster home opens with Japan as its neutral reference country without
// forcing the viewport away from the hero. app-v2 reads the query string only
// after its asynchronous data load, so this temporary deep-link seed lets the
// existing state machine select Japan directly. It is removed once selection
// has rendered, keeping the canonical default URL clean.
const initialUrl=new URL(location.href);
const seededDefaultCountry=!initialUrl.searchParams.has('country');
if(seededDefaultCountry){initialUrl.searchParams.set('country','JP');history.replaceState(null,'',initialUrl)}

// Keep the keyboard skip link available on focus without letting full-page
// screenshot stitching paint an intentionally off-screen fixed element.
const skipLink=document.querySelector('.skip-link');
if(skipLink){skipLink.style.visibility='hidden';skipLink.addEventListener('focus',()=>skipLink.style.visibility='visible');skipLink.addEventListener('blur',()=>skipLink.style.visibility='hidden')}

// Poster motion layer. This deliberately lives in an already-published module so
// the production build keeps one canonical HTML/CSS surface while motion remains
// progressive enhancement. prefers-reduced-motion disables all non-essential motion.
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const motionCss=`
@keyframes posterRise{0%{opacity:0;transform:translate3d(0,28px,0)}100%{opacity:1;transform:translate3d(0,0,0)}}
@keyframes posterSlideLeft{0%{opacity:0;transform:translate3d(-34px,0,0)}100%{opacity:1;transform:translate3d(0,0,0)}}
@keyframes posterSlideRight{0%{opacity:0;transform:translate3d(34px,0,0)}100%{opacity:1;transform:translate3d(0,0,0)}}
@keyframes posterPop{0%{opacity:0;transform:scale(.92)}70%{opacity:1;transform:scale(1.035)}100%{opacity:1;transform:scale(1)}}
@keyframes posterFloat{0%,100%{transform:translate3d(0,0,0) rotate(1deg)}50%{transform:translate3d(0,-10px,0) rotate(.2deg)}}
@keyframes posterSign{0%,100%{transform:rotate(5deg) translateY(0)}50%{transform:rotate(3.7deg) translateY(-5px)}}
@keyframes posterGlow{0%,100%{filter:brightness(1);opacity:.82}50%{filter:brightness(1.12);opacity:1}}
@keyframes posterMapReveal{0%{opacity:0;filter:brightness(.55)}100%{opacity:1;filter:brightness(1)}}
@keyframes posterPulse{0%,100%{box-shadow:0 0 0 0 rgba(98,200,137,.15),0 0 10px rgba(98,200,137,.55)}50%{box-shadow:0 0 0 8px rgba(98,200,137,0),0 0 16px rgba(98,200,137,.8)}}
.motion-on .site-header{animation:posterRise .58s cubic-bezier(.2,.8,.2,1) both}
.motion-on .tracking-now{animation:posterSlideLeft .5s .12s cubic-bezier(.2,.8,.2,1) both}
.motion-on .hero-copy h1{animation:posterSlideLeft .72s .2s cubic-bezier(.16,.85,.2,1) both}
.motion-on .hero-copy .marker-copy{animation:posterPop .62s .42s cubic-bezier(.2,.85,.2,1) both}
.motion-on .hero-copy .lede{animation:posterRise .55s .54s cubic-bezier(.2,.8,.2,1) both}
.motion-on .hero-actions-row{animation:posterRise .55s .64s cubic-bezier(.2,.8,.2,1) both}
.motion-on .hero-meta{animation:posterSlideRight .58s .72s cubic-bezier(.2,.8,.2,1) both}
.motion-on .beer-scene{animation:posterSlideRight .85s .22s cubic-bezier(.16,.85,.2,1) both;will-change:transform}
.motion-on .beer-glass{animation:posterFloat 5.8s 1.1s ease-in-out infinite}
.motion-on .wood-sign{animation:posterSign 7.5s 1.1s ease-in-out infinite}
.motion-on .sunset-orb{animation:sunBreath 12s ease-in-out infinite,posterGlow 9s ease-in-out infinite}
.motion-on .live-beacon i{animation:posterPulse 2.1s ease-out infinite}
.motion-reveal{opacity:0;transform:translate3d(0,24px,0)}
.motion-reveal.motion-visible{animation:posterRise .62s cubic-bezier(.2,.8,.2,1) both}
.motion-map-path{opacity:0;animation:posterMapReveal .5s cubic-bezier(.2,.8,.2,1) both}
.motion-row{animation:posterRise .3s cubic-bezier(.2,.8,.2,1) both}
.motion-country-change{animation:posterSlideRight .48s cubic-bezier(.2,.8,.2,1) both}
.motion-chart-line{filter:drop-shadow(0 0 3px rgba(255,213,109,.2))}
.poster-hero{--poster-px:0px;--poster-py:0px}
.poster-hero .beer-scene{translate:var(--poster-px) var(--poster-py)}
.poster-hero .hero-copy{translate:calc(var(--poster-px) * -.16) calc(var(--poster-py) * -.11)}
@media(max-width:720px){.motion-on .beer-glass{animation:posterFloat 5.8s 1.1s ease-in-out infinite}.poster-hero .beer-scene,.poster-hero .hero-copy{translate:none}}
@media(prefers-reduced-motion:reduce){.motion-on *,.motion-reveal,.motion-reveal.motion-visible,.motion-map-path,.motion-row,.motion-country-change{animation:none!important;transition:none!important;transform:none!important;opacity:1!important;translate:none!important}}
`;
const motionStyle=document.createElement('style');motionStyle.dataset.posterMotion='r1';motionStyle.textContent=motionCss;document.head.append(motionStyle);

function bootMotion(){
  if(reduceMotion)return;
  document.documentElement.classList.add('motion-on');
  const revealTargets=[...document.querySelectorAll('.stat-plate,.map-panel,.country-panel,.ranking-panel,.history-panel,.market-section,.method-strip,.insights-teaser')];
  revealTargets.forEach(el=>el.classList.add('motion-reveal'));
  const io=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add('motion-visible');io.unobserve(entry.target)}}},{threshold:.12,rootMargin:'0px 0px -7%'});
  revealTargets.forEach(el=>io.observe(el));

  const hero=document.querySelector('.poster-hero');
  if(hero&&matchMedia('(pointer:fine)').matches){
    let rx=0,ry=0,raf=0;
    const paint=()=>{raf=0;hero.style.setProperty('--poster-px',`${rx}px`);hero.style.setProperty('--poster-py',`${ry}px`)};
    hero.addEventListener('pointermove',e=>{const r=hero.getBoundingClientRect();rx=((e.clientX-r.left)/r.width-.5)*13;ry=((e.clientY-r.top)/r.height-.5)*9;if(!raf)raf=requestAnimationFrame(paint)},{passive:true});
    hero.addEventListener('pointerleave',()=>{rx=0;ry=0;if(!raf)raf=requestAnimationFrame(paint)},{passive:true});
  }
  animateKpisWhenReady();
  installDynamicMotion();
}

function animateKpisWhenReady(){
  const ids=['fresh-count','median','cheapest','expensive'];let tries=0;
  const timer=setInterval(()=>{
    tries++;
    let waiting=false;
    for(const id of ids){const el=document.getElementById(id);if(!el||el.dataset.motionNumber==='1')continue;const raw=el.textContent.trim();if(!/\d/.test(raw)){waiting=true;continue}el.dataset.motionNumber='1';countText(el,raw)}
    if(!waiting||tries>80)clearInterval(timer);
  },80);
}
function countText(el,targetText){
  if(reduceMotion)return;
  const m=targetText.match(/^(.*?)(-?[\d,.]+)(.*)$/);if(!m)return;
  const target=Number(m[2].replace(/,/g,''));if(!Number.isFinite(target))return;
  const decimals=(m[2].split('.')[1]||'').length,start=performance.now(),duration=720;
  const tick=now=>{const p=Math.min(1,(now-start)/duration),e=1-Math.pow(1-p,3),value=target*e;el.textContent=`${m[1]}${value.toLocaleString(undefined,{minimumFractionDigits:decimals,maximumFractionDigits:decimals})}${m[3]}`;if(p<1)requestAnimationFrame(tick);else el.textContent=targetText};requestAnimationFrame(tick);
}

function installDynamicMotion(){
  const map=document.querySelector('#map');
  if(map)new MutationObserver(()=>animateMapPaths()).observe(map,{childList:true,subtree:true});
  animateMapPaths();
  const ranking=document.querySelector('#ranking');
  if(ranking)new MutationObserver(muts=>{for(const m of muts)for(const node of m.addedNodes){if(node.nodeType===1&&node.matches?.('tr'))animateRow(node)}}).observe(ranking,{childList:true});
  const country=document.querySelector('#country-detail');
  if(country)new MutationObserver(()=>{country.classList.remove('motion-country-change');requestAnimationFrame(()=>country.classList.add('motion-country-change'))}).observe(country,{childList:true,subtree:false});
  const chart=document.querySelector('#history-chart');
  if(chart)new MutationObserver(()=>requestAnimationFrame(animateChartLines)).observe(chart,{childList:true,subtree:true});
  animateChartLines();
}
function animateMapPaths(){
  if(reduceMotion)return;
  const paths=[...document.querySelectorAll('#map svg path:not([data-motion-seen])')];
  paths.forEach((p,i)=>{p.dataset.motionSeen='1';p.classList.add('motion-map-path');p.style.animationDelay=`${Math.min(i*4,520)}ms`});
}
function animateRow(row){
  if(reduceMotion)return;row.classList.add('motion-row');row.addEventListener('animationend',()=>row.classList.remove('motion-row'),{once:true});
}
function animateChartLines(){
  if(reduceMotion)return;
  for(const path of document.querySelectorAll('#history-chart .price-series,#history-chart .fx-series')){
    if(path.dataset.motionDrawn==='1')continue;path.dataset.motionDrawn='1';path.classList.add('motion-chart-line');
    let len=0;try{len=path.getTotalLength()}catch{}if(!Number.isFinite(len)||len<=0)continue;
    path.animate([{strokeDasharray:`${len} ${len}`,strokeDashoffset:len,opacity:.2},{strokeDasharray:`${len} ${len}`,strokeDashoffset:0,opacity:1}],{duration:760,easing:'cubic-bezier(.2,.8,.2,1)',fill:'both'});
  }
}

async function j(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.json()}
function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c))}
function rate(code){if(code==='USD')return 1;const n=Number(marketState.fx?.rates?.[code]);return Number.isFinite(n)&&n>0?n:null}
function convert(value,from,to){if(from===to)return value;const a=rate(from),b=rate(to);return a&&b?(value/a)*b:null}
function money(value,currency){if(value==null||!Number.isFinite(Number(value)))return '—';try{return new Intl.NumberFormat(undefined,{style:'currency',currency,currencyDisplay:'narrowSymbol',maximumFractionDigits:2}).format(Number(value))}catch{return `${currency} ${fmt.format(Number(value))}`}}
function packageLabel(r){
  if(r.packCount&&r.packageVolumeMl)return `${r.packCount} × ${fmt.format(r.packageVolumeMl)} ml`;
  if(r.totalVolumeMl)return r.totalVolumeMl>=1000?`${fmt.format(r.totalVolumeMl/1000)} L total`:`${fmt.format(r.totalVolumeMl)} ml total`;
  return '—';
}
function selectedCurrency(){return document.querySelector('#currency')?.value||'USD'}
function selectedCountry(){const t=document.querySelector('#country-title')?.textContent?.trim();return !t||t==='Select a country'?null:t}

const mobileRegionCountries={
  americas:new Set(['Brazil','Canada','Chile','Colombia','Costa Rica','Dominican Republic','Ecuador','Guatemala','Jamaica','Mexico','Nicaragua','Panama','Paraguay','Peru','Trinidad and Tobago','United States','Uruguay']),
  europe:new Set(['Austria','Belgium','Bosnia and Herzegovina','Bulgaria','Croatia','Cyprus','Czechia','Denmark','Estonia','Finland','France','Germany','Greece','Hungary','Iceland','Ireland','Italy','Latvia','Luxembourg','Malta','Moldova','Netherlands','Norway','Poland','Portugal','Romania','Serbia','Slovakia','Slovenia','Spain','Sweden','Switzerland','United Kingdom']),
  'africa-middle-east':new Set(['Bahrain','Ghana','Israel','Jordan','Kenya','Lebanon','Mauritius','Rwanda','South Africa','Uganda','United Arab Emirates','Zambia']),
  asia:new Set(['Armenia','Georgia','Hong Kong','Indonesia','Japan','Kazakhstan','Malaysia','Nepal','Philippines','Singapore','South Korea','Sri Lanka','Taiwan','Thailand','Vietnam']),
  oceania:new Set(['Australia','New Zealand'])
};
function syncMobileRegion(){
  if(!matchMedia('(max-width: 720px)').matches)return;
  const country=selectedCountry();if(!country)return;
  const region=Object.entries(mobileRegionCountries).find(([,names])=>names.has(country))?.[0];
  if(!region)return;
  const button=document.querySelector(`[data-region="${region}"]`);
  if(button&&!button.classList.contains('active'))button.click();
}
function cleanupSeededDefault(){
  if(!seededDefaultCountry||selectedCountry()!=='Japan')return;
  const u=new URL(location.href);if(u.searchParams.get('country')==='JP'){u.searchParams.delete('country');history.replaceState(null,'',u)}
}
function render(){
  const section=document.querySelector('#market-section'),body=document.querySelector('#market-ranking'),note=document.querySelector('#market-note');
  if(!section||!body||!note||!marketState.data)return;
  const country=selectedCountry();
  const rows=(marketState.data.records||[]).filter(r=>r.country===country&&r.fresh);
  if(!rows.length){section.hidden=true;body.textContent='';note.textContent='';return}
  const target=selectedCurrency();body.textContent='';
  for(const r of rows){
    const tr=document.createElement('tr');
    const converted=convert(Number(r.pricePer330Ml),r.currency,target);
    const store=r.store||r.retailer||'Regional reference';
    tr.innerHTML=`<td><strong>${esc(r.market)}</strong><br><small>${esc(r.level)}</small></td><td><a class="source-link" href="${esc(r.sourceUrl)}" target="_blank" rel="noopener">${esc(store)} ↗</a><br><small>${esc(r.retailer||'')}</small></td><td>${esc(packageLabel(r))}</td><td>${money(r.shelfPrice,r.currency)}</td><td>${money(converted,target)}</td>`;
    body.append(tr);
  }
  section.hidden=false;
  const cities=rows.filter(r=>r.level==='city').length,regions=rows.filter(r=>r.level==='region').length;
  note.textContent=`${rows.length} deterministic market reference${rows.length===1?'':'s'} · ${cities} city · ${regions} region · generated ${marketState.data.generatedAt}. These rows are independent observations, not a national average.`;
}

async function init(){
  try{
    bootMotion();
    [marketState.data,marketState.fx]=await Promise.all([j('./data/markets-current.json'),j('./data/fx.json')]);
    const title=document.querySelector('#country-title');
    if(title)new MutationObserver(()=>{render();syncMobileRegion();cleanupSeededDefault()}).observe(title,{childList:true,subtree:true,characterData:true});
    document.querySelector('#currency')?.addEventListener('change',render);
    render();syncMobileRegion();cleanupSeededDefault();
  }catch(e){console.error('market layer unavailable',e);const section=document.querySelector('#market-section');if(section)section.hidden=true}
}
init();
