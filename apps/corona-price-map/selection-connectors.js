const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobileMq=matchMedia('(max-width: 720px)');
const numericToAlpha2=new Map(Object.entries({'036':'AU','040':'AT','048':'BH','051':'AM','056':'BE','070':'BA','076':'BR','100':'BG','124':'CA','144':'LK','152':'CL','158':'TW','170':'CO','188':'CR','191':'HR','196':'CY','203':'CZ','208':'DK','214':'DO','218':'EC','233':'EE','246':'FI','250':'FR','268':'GE','276':'DE','288':'GH','300':'GR','320':'GT','344':'HK','348':'HU','352':'IS','360':'ID','372':'IE','376':'IL','380':'IT','388':'JM','392':'JP','398':'KZ','400':'JO','404':'KE','410':'KR','422':'LB','428':'LV','442':'LU','458':'MY','470':'MT','480':'MU','484':'MX','498':'MD','524':'NP','528':'NL','554':'NZ','558':'NI','578':'NO','591':'PA','600':'PY','604':'PE','608':'PH','616':'PL','620':'PT','642':'RO','646':'RW','688':'RS','702':'SG','703':'SK','705':'SI','710':'ZA','724':'ES','752':'SE','756':'CH','764':'TH','780':'TT','784':'AE','800':'UG','826':'GB','840':'US','858':'UY','704':'VN','894':'ZM'}));
const codeToCountry=new Map();
const countryToCode=new Map();
let pendingOrigin=null;
let flowToken=0;
let lastCountry='';

const style=document.createElement('style');
style.dataset.selectionConnectors='r2';
style.textContent=`
.selection-connector-layer{position:absolute;left:0;top:0;z-index:64;pointer-events:none;overflow:visible}
.selection-connector-line{fill:none;stroke:#ffd56d;stroke-width:2.6;stroke-linecap:round;filter:drop-shadow(0 0 3px rgba(255,197,72,.9)) drop-shadow(0 0 9px rgba(255,177,56,.42))}
.selection-connector-head{fill:#fff1ad;filter:drop-shadow(0 0 5px #ffc54f) drop-shadow(0 0 12px rgba(255,183,59,.82))}
.selection-connector-pulse{fill:none;stroke:#ffd56d;stroke-width:2;transform-box:fill-box;transform-origin:center;animation:connectorPulse .62s ease-out forwards}
@keyframes connectorPulse{0%{opacity:.9;scale:.45}100%{opacity:0;scale:2.35}}
@keyframes connectorRowPulse{0%,100%{box-shadow:inset 4px 0 0 rgba(255,213,109,.8),0 0 0 rgba(255,195,65,0)}45%{box-shadow:inset 5px 0 0 #ffd56d,0 0 22px rgba(255,195,65,.28)}}
@keyframes connectorPanelReveal{0%{filter:brightness(.92);transform:translate3d(8px,0,0)}65%{filter:brightness(1.12);transform:translate3d(-2px,0,0)}100%{filter:brightness(1);transform:none}}
.connector-selected-map{stroke:#ffd56d!important;stroke-width:3.1!important;filter:brightness(1.24) drop-shadow(0 0 7px rgba(255,213,109,.92))!important}
#ranking tr.connector-selected-row{position:relative;background:linear-gradient(90deg,rgba(242,183,60,.22),rgba(242,183,60,.05))!important;box-shadow:inset 4px 0 0 #ffd56d}
#ranking tr.connector-row-arrival{animation:connectorRowPulse .9s cubic-bezier(.2,.8,.2,1) 1}
.country-panel.connector-selected-panel{box-shadow:0 18px 60px rgba(0,0,0,.34),0 0 0 1px rgba(255,213,109,.32),0 0 30px rgba(255,188,65,.08)}
.country-panel.connector-reveal{animation:connectorPanelReveal .58s cubic-bezier(.2,.8,.2,1) 1}
.mobile-selection-rail{position:fixed;right:10px;top:26vh;width:18px;height:36vh;z-index:72;pointer-events:none;opacity:0;transition:opacity .18s ease}
.mobile-selection-rail.active{opacity:1}.mobile-selection-rail:before{content:'';position:absolute;left:8px;top:0;bottom:0;width:2px;background:rgba(255,213,109,.18);border-radius:2px}
.mobile-selection-rail .rail-fill{position:absolute;left:8px;top:0;width:2px;height:100%;background:linear-gradient(#fff1ad,#f2b73c);box-shadow:0 0 9px rgba(255,192,61,.7);transform:scaleY(0);transform-origin:top;transition:transform .48s cubic-bezier(.2,.8,.2,1)}
.mobile-selection-rail.to-story .rail-fill{transform:scaleY(1)}
.mobile-selection-rail i{position:absolute;left:4px;width:10px;height:10px;border:2px solid #ffd56d;border-radius:50%;background:#07131c;box-shadow:0 0 8px rgba(255,197,66,.65)}
.mobile-selection-rail i:first-of-type{top:-2px}.mobile-selection-rail i:last-of-type{bottom:-2px}
.mobile-selection-rail.to-story i:last-of-type{background:#ffd56d;box-shadow:0 0 14px rgba(255,197,66,.95)}
@media(max-width:720px){.selection-connector-layer{display:none}#ranking tr.connector-mobile-reveal-row{display:table-row!important}}
@media(min-width:721px){.mobile-selection-rail{display:none}}
@media(prefers-reduced-motion:reduce){.selection-connector-line,.selection-connector-head,.selection-connector-pulse,.mobile-selection-rail{display:none!important}.connector-row-arrival,.connector-reveal{animation:none!important}}
`;
document.head.append(style);
document.documentElement.classList.add('selection-connectors-on');

function pageRect(el){const r=el.getBoundingClientRect();return {left:r.left+scrollX,right:r.right+scrollX,top:r.top+scrollY,bottom:r.bottom+scrollY,width:r.width,height:r.height,x:r.left+scrollX+r.width/2,y:r.top+scrollY+r.height/2}}
function point(rect,side='center'){
  if(side==='left')return {x:rect.left,y:rect.y};
  if(side==='right')return {x:rect.right,y:rect.y};
  if(side==='top')return {x:rect.x,y:rect.top};
  if(side==='bottom')return {x:rect.x,y:rect.bottom};
  return {x:rect.x,y:rect.y};
}
function wait(ms){return new Promise(r=>setTimeout(r,ms))}
function selectedName(){const v=document.querySelector('#country-title')?.textContent?.trim();return v&&v!=='Select a country'?v:''}
function rankingRow(name){return [...document.querySelectorAll('#ranking tr')].find(row=>(row.querySelectorAll('td')[1]?.textContent||'').trim()===name)||null}
function mapPath(name){
  const code=countryToCode.get(name);if(!code)return null;
  return [...document.querySelectorAll('#map path.country')].find(path=>numericToAlpha2.get(String(path.__data__?.id??'').padStart(3,'0'))===code)||null;
}
function countryFromMapPath(path){const code=numericToAlpha2.get(String(path?.__data__?.id??'').padStart(3,'0'));return codeToCountry.get(code)||''}
function setHighlights(name){
  document.querySelectorAll('#map path.connector-selected-map').forEach(el=>el.classList.remove('connector-selected-map'));
  document.querySelectorAll('#ranking tr.connector-selected-row').forEach(el=>el.classList.remove('connector-selected-row'));
  document.querySelectorAll('#ranking tr.connector-mobile-reveal-row').forEach(el=>el.classList.remove('connector-mobile-reveal-row'));
  const mp=mapPath(name),row=rankingRow(name),panel=document.querySelector('.country-panel');
  mp?.classList.add('connector-selected-map');
  row?.classList.add('connector-selected-row');
  if(mobileMq.matches)row?.classList.add('connector-mobile-reveal-row');
  panel?.classList.toggle('connector-selected-panel',Boolean(name));
}
function ensureSpotlightVisible(){
  const panel=document.querySelector('.country-panel'),detail=document.querySelector('#country-detail');
  panel?.classList.remove('connector-awaiting');
  if(panel)panel.hidden=false;
  if(detail)detail.hidden=false;
}
function rememberOrigin(event){
  if(event.target.closest?.('#ranking a'))return;
  const path=event.target.closest?.('#map path.country.has-data');
  if(path){pendingOrigin={source:'map',country:countryFromMapPath(path),rect:pageRect(path),time:performance.now()};return}
  const row=event.target.closest?.('#ranking tr');
  if(row){const country=(row.querySelectorAll('td')[1]?.textContent||'').trim();pendingOrigin={source:event.isTrusted?'ranking':'indirect',country,rect:pageRect(row),time:performance.now()}}
}
document.addEventListener('click',rememberOrigin,true);

function ensureOverlay(){
  let svg=document.querySelector('.selection-connector-layer');
  if(!svg){svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('selection-connector-layer');svg.setAttribute('aria-hidden','true');document.body.append(svg)}
  const w=Math.max(document.documentElement.scrollWidth,innerWidth),h=Math.max(document.documentElement.scrollHeight,innerHeight);svg.setAttribute('width',String(w));svg.setAttribute('height',String(h));svg.setAttribute('viewBox',`0 0 ${w} ${h}`);return svg;
}
function clearLines(){document.querySelector('.selection-connector-layer')?.replaceChildren()}
function curve(a,b){
  const dx=b.x-a.x,dy=b.y-a.y;
  if(Math.abs(dx)>Math.abs(dy)*.75){const bend=Math.max(55,Math.abs(dx)*.42),dir=Math.sign(dx)||1;return `M ${a.x} ${a.y} C ${a.x+dir*bend} ${a.y}, ${b.x-dir*bend} ${b.y}, ${b.x} ${b.y}`}
  const bend=Math.max(60,Math.abs(dy)*.36),dir=Math.sign(dy)||1;return `M ${a.x} ${a.y} C ${a.x} ${a.y+dir*bend}, ${b.x} ${b.y-dir*bend}, ${b.x} ${b.y}`;
}
function pulse(svg,p){const c=document.createElementNS(svg.namespaceURI,'circle');c.classList.add('selection-connector-pulse');c.setAttribute('cx',p.x);c.setAttribute('cy',p.y);c.setAttribute('r','7');svg.append(c);setTimeout(()=>c.remove(),700)}
async function drawLeg(a,b,label,token){
  if(token!==flowToken)return false;if(reduce){await wait(40);return token===flowToken}
  const svg=ensureOverlay(),path=document.createElementNS(svg.namespaceURI,'path'),head=document.createElementNS(svg.namespaceURI,'circle');
  path.classList.add('selection-connector-line');path.dataset.connectorLeg=label;path.setAttribute('d',curve(a,b));head.classList.add('selection-connector-head');head.setAttribute('r','4.2');svg.append(path,head);
  const len=path.getTotalLength();path.style.strokeDasharray=`${len} ${len}`;path.style.strokeDashoffset=String(len);
  const duration=520,start=performance.now();
  const line=path.animate([{strokeDashoffset:len,opacity:.22},{strokeDashoffset:0,opacity:1}],{duration,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});
  await new Promise(resolve=>{const tick=now=>{if(token!==flowToken){resolve();return}const t=Math.min(1,(now-start)/duration),q=1-Math.pow(1-t,3),pos=path.getPointAtLength(len*q);head.setAttribute('cx',pos.x);head.setAttribute('cy',pos.y);if(t<1)requestAnimationFrame(tick);else resolve()};requestAnimationFrame(tick)});
  if(token!==flowToken){line.cancel();return false}pulse(svg,b);head.remove();path.dataset.connectorComplete='1';setTimeout(()=>{if(path.isConnected)path.animate([{opacity:1},{opacity:.12}],{duration:650,fill:'forwards'})},800);return true;
}
function spotlightAnchor(from){const panel=document.querySelector('.country-panel');if(!panel)return null;const r=pageRect(panel);return from==='map'?point(r,'left'):point(r,'bottom')}
function revealSpotlight(panel){
  ensureSpotlightVisible();
  panel.classList.remove('connector-reveal');
  requestAnimationFrame(()=>panel.classList.add('connector-reveal'));
}
function bumpRow(row){if(!row)return;row.classList.remove('connector-row-arrival');requestAnimationFrame(()=>row.classList.add('connector-row-arrival'));setTimeout(()=>row.classList.remove('connector-row-arrival'),1050)}
function markFlow(layer,source,country,complete=false){layer.dataset.lastSource=source;layer.dataset.lastCountry=country;layer.dataset.lastComplete=complete?'1':'0'}

async function desktopFlow(country,origin){
  const token=++flowToken,panel=document.querySelector('.country-panel');if(!panel)return;
  clearLines();ensureSpotlightVisible();setHighlights(country);
  const svg=ensureOverlay();markFlow(svg,origin.source,country,false);
  const spot=spotlightAnchor(origin.source);
  if(spot&&origin.rect){
    const label=origin.source==='map'?'map-spotlight':'ranking-spotlight';
    await drawLeg(point(origin.rect),spot,label,token);
    if(token!==flowToken)return;
  }
  revealSpotlight(panel);
  const row=rankingRow(country);bumpRow(row);
  setHighlights(country);markFlow(svg,origin.source,country,true);
}

function rail(){let el=document.querySelector('.mobile-selection-rail');if(!el){el=document.createElement('div');el.className='mobile-selection-rail';el.setAttribute('aria-hidden','true');el.innerHTML='<span class="rail-fill"></span><i></i><i></i>';document.body.append(el)}return el}
async function mobileScrollToStory(panel){
  if(!panel)return;const r=panel.getBoundingClientRect();if(r.top>innerHeight*.18&&r.bottom<innerHeight*.88)return;
  panel.scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});await wait(reduce?30:520);
}
async function mobileFlow(country,origin){
  const token=++flowToken,panel=document.querySelector('.country-panel'),r=rail();if(!panel)return;
  ensureSpotlightVisible();setHighlights(country);
  r.className='mobile-selection-rail active';r.dataset.lastSource=origin.source;r.dataset.lastCountry=country;r.dataset.lastComplete='0';
  requestAnimationFrame(()=>r.classList.add('to-story'));
  await wait(reduce?20:180);await mobileScrollToStory(panel);if(token!==flowToken)return;
  revealSpotlight(panel);setHighlights(country);bumpRow(rankingRow(country));
  r.dataset.lastComplete='1';setTimeout(()=>{if(r.dataset.lastCountry===country)r.classList.remove('active')},1400);
}

function normalizeOrigin(country){const p=pendingOrigin;pendingOrigin=null;if(p&&performance.now()-p.time<1600&&(!p.country||p.country===country))return p;return {source:'default',country,rect:null,time:performance.now()}}
function onSelection(){
  const country=selectedName();if(!country)return;ensureSpotlightVisible();const origin=normalizeOrigin(country);lastCountry=country;setHighlights(country);
  if(origin.source==='default'||!origin.rect)return;
  if(mobileMq.matches)mobileFlow(country,origin);else desktopFlow(country,origin);
}
function reapply(){const country=selectedName()||lastCountry;if(country){ensureSpotlightVisible();setHighlights(country)}}

async function boot(){
  try{const res=await fetch('./data/current.json',{cache:'no-store'});if(res.ok){const data=await res.json();for(const rec of data.records||[]){codeToCountry.set(rec.code,rec.country);countryToCode.set(rec.country,rec.code)}}}catch{}
  const title=document.querySelector('#country-title'),ranking=document.querySelector('#ranking'),map=document.querySelector('#map');
  if(title)new MutationObserver(()=>queueMicrotask(onSelection)).observe(title,{childList:true,subtree:true,characterData:true});
  if(ranking)new MutationObserver(()=>requestAnimationFrame(reapply)).observe(ranking,{childList:true});
  if(map)new MutationObserver(()=>requestAnimationFrame(reapply)).observe(map,{childList:true,subtree:true});
  reapply();
}
if(document.readyState==='loading')addEventListener('DOMContentLoaded',boot,{once:true});else boot();