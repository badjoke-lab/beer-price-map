const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

const style=document.createElement('style');
style.dataset.posterMotionR2='1';
style.textContent=`
@keyframes posterMote{0%{translate:0 18px;opacity:0}18%{opacity:.5}70%{opacity:.22}100%{translate:var(--mote-x) -90px;opacity:0}}
@keyframes posterCondense{0%{translate:0 -7px;opacity:0}18%{opacity:.55}62%{opacity:.34}100%{translate:var(--drop-x) 22px;opacity:0}}
@keyframes posterLiquidSweep{0%{translate:-150% 0;opacity:0}18%{opacity:.18}48%{opacity:.42}72%{opacity:.12}100%{translate:170% 0;opacity:0}}
@keyframes posterSunRay{to{rotate:360deg}}
@keyframes posterCountryImpact{0%{box-shadow:0 18px 60px rgba(0,0,0,.34),inset 0 0 0 rgba(255,213,109,0)}42%{box-shadow:0 18px 60px rgba(0,0,0,.34),inset 0 0 42px rgba(255,213,109,.11)}100%{box-shadow:0 18px 60px rgba(0,0,0,.34),inset 0 0 0 rgba(255,213,109,0)}}
@keyframes posterSelectedCountry{0%{stroke-width:1.8;filter:brightness(1.12) drop-shadow(0 0 0 rgba(255,213,109,0))}45%{stroke-width:3.2;filter:brightness(1.34) drop-shadow(0 0 9px rgba(255,213,109,.92))}100%{stroke-width:1.8;filter:brightness(1.2) drop-shadow(0 0 5px rgba(255,213,109,.85))}}
@keyframes posterAxisArrive{from{opacity:0;translate:0 7px}to{opacity:1;translate:0 0}}
@keyframes posterStatPop{0%{opacity:.15;scale:.94}65%{opacity:1;scale:1.035}100%{opacity:1;scale:1}}
@keyframes posterShimmer{0%{background-position:170% 0}100%{background-position:-70% 0}}
.motion-r2 .poster-hero{--glint-x:50%;--glint-y:42%;--scene-rotate:0deg;--glass-scale:1;--sign-x:0px;--sign-y:0px;--sun-scale:1}
.poster-ambient-field{position:absolute;z-index:2;inset:0;pointer-events:none;overflow:hidden}
.poster-mote{position:absolute;width:3px;height:3px;border-radius:50%;background:rgba(255,235,185,.7);box-shadow:0 0 8px rgba(255,205,108,.55);animation:posterMote var(--mote-dur) var(--mote-delay) linear infinite}
.motion-r2 .beer-scene{rotate:var(--scene-rotate);will-change:rotate,scale}
.motion-r2 .beer-glass{scale:var(--glass-scale)}
.motion-r2 .wood-sign{translate:var(--sign-x) var(--sign-y)}
.motion-r2 .sunset-orb{scale:var(--sun-scale)}
.motion-r2 .sunset-orb:after{content:'';position:absolute;inset:-22%;border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(255,220,147,.07) 0 3deg,transparent 3deg 15deg);filter:blur(2px);animation:posterSunRay 38s linear infinite}
.motion-r2 .beer-glass:after{content:'';position:absolute;z-index:6;left:calc(var(--glint-x) - 23%);top:calc(var(--glint-y) - 20%);width:46%;height:40%;border-radius:50%;background:radial-gradient(circle,rgba(255,255,236,.45) 0,rgba(255,244,202,.16) 28%,transparent 68%);filter:blur(5px);mix-blend-mode:screen;pointer-events:none;transition:left .18s ease,top .18s ease}
.motion-r2 .beer-liquid:after{content:'';position:absolute;inset:-10% auto -10% 0;width:24%;background:linear-gradient(90deg,transparent,rgba(255,239,175,.62),transparent);filter:blur(4px);animation:posterLiquidSweep 6.8s 1.4s ease-in-out infinite}
.condensation-field{position:absolute;z-index:5;inset:22px 7px 7px;overflow:hidden;border-radius:31px;pointer-events:none}
.condensation-field i{position:absolute;left:var(--drop-left);top:var(--drop-top);width:var(--drop-size);height:var(--drop-size);border-radius:50%;background:radial-gradient(circle at 34% 30%,rgba(255,255,255,.95) 0 14%,rgba(234,247,240,.46) 22%,rgba(255,255,255,.08) 63%,transparent 70%);box-shadow:inset -1px -1px 2px rgba(0,0,0,.22),0 0 3px rgba(255,255,255,.24);animation:posterCondense var(--drop-dur) var(--drop-delay) ease-in-out infinite}
.motion-r2 .country.selected{animation:posterSelectedCountry 1.25s cubic-bezier(.2,.8,.2,1) 1}
.motion-r2 .country-panel.country-impact{animation:posterCountryImpact .7s cubic-bezier(.2,.8,.2,1) 1}
.motion-r2 #history-chart .chart-axis{animation:posterAxisArrive .42s ease-out both}
.motion-r2 #history-stats>div{animation:posterStatPop .48s cubic-bezier(.2,.8,.2,1) both}
.motion-r2 #history-stats>div:nth-child(2){animation-delay:.05s}.motion-r2 #history-stats>div:nth-child(3){animation-delay:.1s}.motion-r2 #history-stats>div:nth-child(4){animation-delay:.15s}
.motion-r2 .stat-plate.motion-visible:after,.motion-r2 .method-strip.motion-visible:after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(110deg,transparent 22%,rgba(255,231,171,.08) 39%,rgba(255,231,171,.15) 46%,transparent 57%);background-size:230% 100%;animation:posterShimmer 1.15s .16s ease-out 1}
.motion-r2 .stat-plate{position:relative;overflow:hidden}
.motion-r2 .poster-button{translate:var(--mag-x,0px) var(--mag-y,0px);transition:translate .18s ease,transform .16s,background .16s,border-color .16s}
.motion-r2 .spotlight-art{filter:hue-rotate(var(--spot-hue,0deg)) saturate(1.06);transition:filter .58s ease}
.motion-r2 .ranking-panel tbody tr{animation-delay:calc(var(--row-index,0) * 9ms)}
.motion-r2 .map svg[data-region-motion='1']{filter:drop-shadow(0 0 10px rgba(255,213,109,.12))}
@media(max-width:720px){.poster-mote{opacity:.55}.condensation-field i:nth-child(n+9){display:none}.motion-r2 .beer-glass:after{filter:blur(3px)}}
@media(prefers-reduced-motion:reduce){.poster-mote,.condensation-field i,.motion-r2 .sunset-orb:after,.motion-r2 .beer-liquid:after,.motion-r2 .country.selected,.motion-r2 .country-panel.country-impact,.motion-r2 #history-chart .chart-axis,.motion-r2 #history-stats>div,.motion-r2 .stat-plate.motion-visible:after,.motion-r2 .method-strip.motion-visible:after{animation:none!important}.motion-r2 .beer-scene,.motion-r2 .beer-glass,.motion-r2 .wood-sign,.motion-r2 .sunset-orb,.motion-r2 .poster-button{rotate:none!important;scale:none!important;translate:none!important}}
`;
document.head.append(style);

document.documentElement.classList.add('motion-r2');

function addAmbientMotes(){
  const hero=document.querySelector('.poster-hero');
  if(!hero||hero.querySelector('.poster-ambient-field'))return;
  const field=document.createElement('div');field.className='poster-ambient-field';field.setAttribute('aria-hidden','true');
  for(let i=0;i<20;i++){
    const mote=document.createElement('i');mote.className='poster-mote';
    const left=(7+(i*47)%91),top=(18+(i*31)%67),size=2+(i%3),dur=7+(i%7)*1.35,delay=-(i%9)*1.13,x=((i%5)-2)*8;
    mote.style.cssText=`left:${left}%;top:${top}%;width:${size}px;height:${size}px;--mote-dur:${dur}s;--mote-delay:${delay}s;--mote-x:${x}px`;
    field.append(mote);
  }
  hero.append(field);
}

function addCondensation(){
  const glass=document.querySelector('.beer-glass');
  if(!glass||glass.querySelector('.condensation-field'))return;
  const field=document.createElement('div');field.className='condensation-field';field.setAttribute('aria-hidden','true');
  for(let i=0;i<17;i++){
    const drop=document.createElement('i');
    const left=8+(i*37)%84,top=7+(i*53)%83,size=3+(i%5),dur=6.5+(i%6)*1.2,delay=-(i%8)*1.07,x=((i%3)-1)*4;
    drop.style.cssText=`--drop-left:${left}%;--drop-top:${top}%;--drop-size:${size}px;--drop-dur:${dur}s;--drop-delay:${delay}s;--drop-x:${x}px`;
    field.append(drop);
  }
  glass.append(field);
}

function installHeroDepth(){
  if(reduce)return;
  const hero=document.querySelector('.poster-hero');
  if(!hero||!matchMedia('(pointer:fine)').matches)return;
  hero.addEventListener('pointermove',e=>{
    const r=hero.getBoundingClientRect(),nx=(e.clientX-r.left)/r.width-.5,ny=(e.clientY-r.top)/r.height-.5;
    hero.style.setProperty('--scene-rotate',`${nx*2.4}deg`);
    hero.style.setProperty('--glass-scale',`${1+Math.max(-.004,ny*-.012)}`);
    hero.style.setProperty('--sign-x',`${nx*5}px`);hero.style.setProperty('--sign-y',`${ny*3}px`);
    hero.style.setProperty('--sun-scale',`${1+Math.max(-.01,ny*-.025)}`);
    hero.style.setProperty('--glint-x',`${50+nx*43}%`);hero.style.setProperty('--glint-y',`${43+ny*34}%`);
  },{passive:true});
  hero.addEventListener('pointerleave',()=>{
    hero.style.setProperty('--scene-rotate','0deg');hero.style.setProperty('--glass-scale','1');hero.style.setProperty('--sign-x','0px');hero.style.setProperty('--sign-y','0px');hero.style.setProperty('--sun-scale','1');hero.style.setProperty('--glint-x','50%');hero.style.setProperty('--glint-y','43%');
  },{passive:true});
}

function installMagneticButtons(){
  if(reduce||!matchMedia('(pointer:fine)').matches)return;
  document.querySelectorAll('.poster-button').forEach(button=>{
    button.addEventListener('pointermove',e=>{const r=button.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)*.08,y=(e.clientY-r.top-r.height/2)*.12;button.style.setProperty('--mag-x',`${x}px`);button.style.setProperty('--mag-y',`${y}px`)});
    button.addEventListener('pointerleave',()=>{button.style.setProperty('--mag-x','0px');button.style.setProperty('--mag-y','0px')});
  });
}

function installRegionTween(){
  if(reduce)return;
  const saved=new WeakMap();
  const remember=button=>{const svg=document.querySelector('#map svg');if(svg)saved.set(button,svg.getAttribute('viewBox')||'0 0 1200 600')};
  document.querySelectorAll('[data-region]').forEach(button=>{
    button.addEventListener('pointerdown',()=>remember(button),{passive:true});
    button.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')remember(button)});
    button.addEventListener('click',()=>{
      const svg=document.querySelector('#map svg'),from=(saved.get(button)||'').trim().split(/\s+/).map(Number),to=(svg?.getAttribute('viewBox')||'').trim().split(/\s+/).map(Number);
      if(!svg||from.length!==4||to.length!==4||from.some(Number.isNaN)||to.some(Number.isNaN)||from.every((v,i)=>Math.abs(v-to[i])<.01))return;
      const start=performance.now(),duration=520;svg.dataset.regionMotion='1';
      const step=now=>{const p=Math.min(1,(now-start)/duration),e=1-Math.pow(1-p,3),v=from.map((n,i)=>n+(to[i]-n)*e);svg.setAttribute('viewBox',v.join(' '));if(p<1)requestAnimationFrame(step);else{svg.setAttribute('viewBox',to.join(' '));delete svg.dataset.regionMotion}};
      svg.setAttribute('viewBox',from.join(' '));requestAnimationFrame(step);
    });
  });
}

function installCountryImpact(){
  const title=document.querySelector('#country-title'),panel=document.querySelector('.country-panel');if(!title||!panel)return;
  let last='';
  const impact=()=>{const name=title.textContent.trim();if(!name||name==='Select a country'||name===last)return;last=name;let h=0;for(const c of name)h=(h*31+c.charCodeAt(0))%360;panel.style.setProperty('--spot-hue',`${(h%34)-17}deg`);if(!reduce){panel.classList.remove('country-impact');requestAnimationFrame(()=>panel.classList.add('country-impact'))}};
  new MutationObserver(impact).observe(title,{childList:true,subtree:true,characterData:true});impact();
}

function installRankingStagger(){
  const body=document.querySelector('#ranking');if(!body)return;
  const stamp=()=>[...body.querySelectorAll('tr')].forEach((row,i)=>row.style.setProperty('--row-index',String(Math.min(i,28))));
  new MutationObserver(()=>requestAnimationFrame(stamp)).observe(body,{childList:true});stamp();
}

function installScrollAtmosphere(){
  if(reduce)return;
  const hero=document.querySelector('.poster-hero'),footer=document.querySelector('.horizon');if(!hero)return;
  let raf=0;
  const paint=()=>{raf=0;const y=Math.max(0,window.scrollY),p=Math.min(1,y/Math.max(1,hero.offsetHeight));hero.style.setProperty('--sun-scale',String(1+p*.055));if(footer){const r=footer.getBoundingClientRect();const vp=innerHeight;const q=Math.max(-1,Math.min(1,(r.top-vp*.5)/vp));footer.style.translate=`0 ${q*9}px`}};
  addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(paint)},{passive:true});paint();
}

function boot(){addAmbientMotes();addCondensation();installHeroDepth();installMagneticButtons();installRegionTween();installCountryImpact();installRankingStagger();installScrollAtmosphere()}
if(document.readyState==='loading')addEventListener('DOMContentLoaded',boot,{once:true});else boot();
