import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

let server=null;
let base=process.env.BASE_URL;
let artifactDir='smoke-artifacts';
if(!base){
  const root=path.resolve('dist/corona-price-map');
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
  server=http.createServer((req,res)=>{
    const u=new URL(req.url,'http://localhost');
    const rel=decodeURIComponent(u.pathname).replace(/^\/+/, '')||'index.html';
    const file=path.resolve(root,rel);
    if(!file.startsWith(root)){res.writeHead(403);res.end('forbidden');return}
    fs.readFile(file,(err,buf)=>{if(err){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(buf)});
  });
  await new Promise(r=>server.listen(4175,'127.0.0.1',r));
  base='http://127.0.0.1:4175/';
}else artifactDir='production-smoke-artifacts';
base=base.replace(/\/+$/,'')+'/';
await fsp.mkdir(artifactDir,{recursive:true});

const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  await page.goto(base,{waitUntil:'networkidle',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#ranking tr').length>=50,{timeout:30000});
  await page.waitForFunction(()=>document.querySelector('#country-story')?.dataset.spotlightPinned==='1',{timeout:5000});

  const layout=await page.evaluate(()=>{
    const map=document.querySelector('#map-section > .map-panel');
    const panel=document.querySelector('#country-story');
    const explore=document.querySelector('#map-section');
    const mr=map?.getBoundingClientRect(),pr=panel?.getBoundingClientRect();
    const ps=panel?getComputedStyle(panel):null,es=explore?getComputedStyle(explore):null;
    return {map:mr&&{left:mr.left,right:mr.right,top:mr.top,bottom:mr.bottom,width:mr.width,height:mr.height},panel:pr&&{left:pr.left,right:pr.right,top:pr.top,bottom:pr.bottom,width:pr.width,height:pr.height},display:ps?.display,visibility:ps?.visibility,opacity:ps?.opacity,grid:es?.gridTemplateColumns,parent:panel?.parentElement?.id||''};
  });
  if(layout.parent!=='map-section')throw new Error(`spotlight parent=${layout.parent}`);
  if(layout.display==='none'||layout.visibility==='hidden'||Number(layout.opacity)<.95)throw new Error(`spotlight hidden display=${layout.display} visibility=${layout.visibility} opacity=${layout.opacity}`);
  if(!layout.panel||layout.panel.width<300||layout.panel.height<500)throw new Error(`spotlight geometry invalid ${JSON.stringify(layout.panel)}`);
  if(!layout.map||layout.panel.left<layout.map.right+8)throw new Error(`spotlight not right of map mapRight=${layout.map?.right} panelLeft=${layout.panel?.left} grid=${layout.grid}`);
  if(layout.panel.right>1442)throw new Error(`spotlight outside viewport right=${layout.panel.right}`);

  await page.locator('#map path.country').evaluateAll(paths=>{
    const p=paths.find(x=>String(x.__data__?.id).padStart(3,'0')==='124');
    if(!p)throw new Error('Canada path missing');
    p.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:700,clientY:400}));
  });
  await page.waitForFunction(()=>document.querySelector('#country-title')?.textContent.trim()==='Canada',{timeout:5000});
  await page.waitForFunction(()=>document.querySelector('#country-detail')?.textContent.trim().length>40,{timeout:5000});
  await page.waitForFunction(()=>document.querySelector('#country-story')?.dataset.spotlightPhase==='travel',{timeout:1000});

  const travelling=await page.evaluate(()=>{
    const panel=document.querySelector('#country-story'),detail=document.querySelector('#country-detail'),layer=document.querySelector('.selection-connector-layer');
    return {pending:panel?.classList.contains('spotlight-timing-pending')||false,phase:panel?.dataset.spotlightPhase||'',clip:getComputedStyle(detail).clipPath,lastComplete:layer?.dataset.lastComplete||'',started:Number(panel?.dataset.spotlightStartedAt||0)};
  });
  if(!travelling.pending||travelling.phase!=='travel')throw new Error(`spotlight did not wait for connector ${JSON.stringify(travelling)}`);
  if(!travelling.clip.includes('100%'))throw new Error(`spotlight payload not staged during connector travel clip=${travelling.clip}`);
  if(travelling.lastComplete==='1')throw new Error(`connector already complete before staged-state assertion ${JSON.stringify(travelling)}`);

  await page.waitForFunction(()=>{
    const panel=document.querySelector('#country-story'),layer=document.querySelector('.selection-connector-layer');
    return panel?.dataset.spotlightArrival==='connector'&&layer?.dataset.lastComplete==='1'&&(panel.dataset.spotlightPhase==='reveal'||panel.dataset.spotlightPhase==='ready');
  },{timeout:5000});
  await page.waitForFunction(()=>document.querySelector('#country-story')?.dataset.spotlightPhase==='ready',{timeout:2000});

  const selected=await page.evaluate(()=>{
    const panel=document.querySelector('#country-story'),detail=document.querySelector('#country-detail'),pr=panel?.getBoundingClientRect(),ps=panel&&getComputedStyle(panel),ds=detail&&getComputedStyle(detail);
    const started=Number(panel?.dataset.spotlightStartedAt||0),arrived=Number(panel?.dataset.spotlightArrivedAt||0);
    return {title:document.querySelector('#country-title')?.textContent.trim(),detail:(detail?.textContent||'').trim(),width:pr?.width||0,height:pr?.height||0,left:pr?.left||0,display:ps?.display,visibility:ps?.visibility,opacity:ps?.opacity,detailVisibility:ds?.visibility,detailOpacity:ds?.opacity,clip:ds?.clipPath,phase:panel?.dataset.spotlightPhase||'',arrival:panel?.dataset.spotlightArrival||'',travelMs:arrived&&started?arrived-started:0};
  });
  if(selected.title!=='Canada'||selected.detail.length<40)throw new Error('Canada spotlight data missing');
  if(selected.display==='none'||selected.visibility==='hidden'||Number(selected.opacity)<.95||selected.detailVisibility==='hidden'||Number(selected.detailOpacity)<.8)throw new Error(`selected spotlight invisible ${JSON.stringify(selected)}`);
  if(selected.width<300||selected.height<500)throw new Error(`selected spotlight collapsed ${JSON.stringify(selected)}`);
  if(selected.phase!=='ready'||selected.arrival!=='connector')throw new Error(`spotlight reveal not connector-driven ${JSON.stringify(selected)}`);
  if(selected.travelMs<350||selected.travelMs>1400)throw new Error(`spotlight timing drift travelMs=${selected.travelMs}`);
  if(selected.clip!=='none'&&!selected.clip.includes('0px'))throw new Error(`spotlight remained clipped after arrival clip=${selected.clip}`);

  await page.screenshot({path:path.join(artifactDir,'spotlight-right-pane.png'),fullPage:false});
  console.log(`SPOTLIGHT LAYOUT PASS rightPane=${Math.round(layout.panel.width)}x${Math.round(layout.panel.height)} mapRight=${Math.round(layout.map.right)} panelLeft=${Math.round(layout.panel.left)} selected=${selected.title} timing=${Math.round(selected.travelMs)}ms`);
} finally {
  await browser.close();
  if(server)await new Promise(r=>server.close(r));
}
