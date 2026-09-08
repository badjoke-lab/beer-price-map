import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

let server=null;
let base=process.env.BASE_URL;
if(!base){
  const root=path.resolve('dist/corona-price-map');
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
  server=http.createServer((req,res)=>{
    const u=new URL(req.url,'http://localhost');let rel=decodeURIComponent(u.pathname).replace(/^\/+/, '')||'index.html';
    const file=path.resolve(root,rel);if(!file.startsWith(root)){res.writeHead(403);res.end('forbidden');return}
    fs.readFile(file,(err,buf)=>{if(err){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(buf)});
  });
  await new Promise(r=>server.listen(4174,'127.0.0.1',r));base='http://127.0.0.1:4174/';
}
base=base.replace(/\/+$/,'')+'/';

async function assertSpotlightVisible(page,country){
  await page.waitForFunction(expected=>{
    const title=document.querySelector('#country-title'),detail=document.querySelector('#country-detail'),panel=document.querySelector('.country-panel');
    if(!title||!detail||!panel||title.textContent.trim()!==expected||detail.textContent.trim().length<30)return false;
    const ds=getComputedStyle(detail),ps=getComputedStyle(panel);
    return ds.display!=='none'&&ds.visibility!=='hidden'&&Number(ds.opacity)>.8&&ps.display!=='none'&&ps.visibility!=='hidden';
  },country,{timeout:5000});
}

const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  await page.goto(base,{waitUntil:'networkidle',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#ranking tr').length>=50,{timeout:30000});
  await page.waitForFunction(()=>document.documentElement.classList.contains('selection-connectors-on'),{timeout:5000});
  if(await page.locator('style[data-selection-connectors="r2"]').count()!==1)throw new Error('selection connector r2 stylesheet missing');

  const beforeRankingScroll=await page.locator('#ranking').evaluate(el=>el.closest('.table-wrap')?.scrollTop||0);
  await page.locator('#map path.country').evaluateAll(paths=>{const p=paths.find(x=>String(x.__data__?.id).padStart(3,'0')==='392');if(!p)throw new Error('Japan path missing');p.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:700,clientY:400}))});
  await page.waitForFunction(()=>{const l=document.querySelector('.selection-connector-layer');return l?.dataset.lastCountry==='Japan'&&l?.dataset.lastSource==='map'&&l?.dataset.lastComplete==='1'},{timeout:8000});
  if(await page.locator('.selection-connector-layer path[data-connector-leg="map-spotlight"][data-connector-complete="1"]').count()!==1)throw new Error('map → spotlight connector missing');
  if(await page.locator('.selection-connector-layer path[data-connector-leg="spotlight-ranking"]').count()!==0)throw new Error('obsolete spotlight → ranking connector still rendered');
  if(await page.locator('.selection-connector-layer path[data-connector-leg="spotlight-map"]').count()!==0)throw new Error('obsolete spotlight → map connector still rendered');
  await assertSpotlightVisible(page,'Japan');
  if(await page.locator('#ranking tr.connector-selected-row').filter({hasText:'Japan'}).count()!==1)throw new Error('Japan ranking highlight missing');
  if(await page.locator('#map path.connector-selected-map').count()!==1)throw new Error('Japan map highlight missing');
  const afterRankingScroll=await page.locator('#ranking').evaluate(el=>el.closest('.table-wrap')?.scrollTop||0);
  if(afterRankingScroll!==beforeRankingScroll)throw new Error(`map selection moved ranking scroller ${beforeRankingScroll} → ${afterRankingScroll}`);

  const canada=page.locator('#ranking tr').filter({hasText:'Canada'}).first();await canada.click();
  await page.waitForFunction(()=>{const l=document.querySelector('.selection-connector-layer');return l?.dataset.lastCountry==='Canada'&&l?.dataset.lastSource==='ranking'&&l?.dataset.lastComplete==='1'},{timeout:8000});
  if(await page.locator('.selection-connector-layer path[data-connector-leg="ranking-spotlight"][data-connector-complete="1"]').count()!==1)throw new Error('ranking → spotlight connector missing');
  if(await page.locator('.selection-connector-layer path[data-connector-leg="spotlight-map"]').count()!==0)throw new Error('ranking selection rendered a second map connector');
  await assertSpotlightVisible(page,'Canada');
  if(await page.locator('#map path.connector-selected-map').count()!==1)throw new Error('Canada map highlight missing');

  await page.setViewportSize({width:390,height:844});
  await page.goto(new URL('?country=AU',base).href,{waitUntil:'networkidle',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#ranking tr').length>=50,{timeout:30000});
  await page.locator('#map path.country').evaluateAll(paths=>{const p=paths.find(x=>String(x.__data__?.id).padStart(3,'0')==='036');if(!p)throw new Error('Australia path missing');p.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:200,clientY:300}))});
  await page.waitForFunction(()=>{const r=document.querySelector('.mobile-selection-rail');return r?.dataset.lastCountry==='Australia'&&r?.dataset.lastSource==='map'&&r?.dataset.lastComplete==='1'},{timeout:10000});
  if(await page.locator('.mobile-selection-rail.to-story').count()!==1)throw new Error('mobile rail did not reach Country Story');
  if(await page.locator('.mobile-selection-rail.to-ranking').count()!==0)throw new Error('obsolete mobile ranking rail stage still active');
  await assertSpotlightVisible(page,'Australia');
  if(await page.locator('#ranking tr.connector-selected-row.connector-mobile-reveal-row').filter({hasText:'Australia'}).count()!==1)throw new Error('mobile selected ranking highlight missing');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);if(overflow>2)throw new Error(`mobile connector overflow ${overflow}px`);

  console.log(`SELECTION CONNECTOR SMOKE PASS desktop=origin→spotlight+counterpart-highlight mobile=story-rail+ranking-highlight info=visible overflow=${overflow}`);
} finally {
  await browser.close();if(server)await new Promise(r=>server.close(r));
}
