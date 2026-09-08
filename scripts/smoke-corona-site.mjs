import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve('dist/corona-price-map');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost');
  let rel=decodeURIComponent(u.pathname).replace(/^\/+/, '')||'index.html';
  const file=path.resolve(root,rel);
  if(!file.startsWith(root)){res.writeHead(403);res.end('forbidden');return;}
  fs.readFile(file,(err,buf)=>{if(err){res.writeHead(404);res.end('not found');return;}res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(buf)});
});
await new Promise(r=>server.listen(4173,'127.0.0.1',r));
await fsp.mkdir('smoke-artifacts',{recursive:true});

const browser=await chromium.launch({headless:true});
const errors=[];
try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  page.on('console',m=>{if(m.type()==='error') errors.push(`console: ${m.text()}`)});
  page.on('pageerror',e=>errors.push(`page: ${e.message}`));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#ranking tr').length>=50,{timeout:30000});

  const current=await (await page.request.get('http://127.0.0.1:4173/data/current.json')).json();
  const fxHistory=await (await page.request.get('http://127.0.0.1:4173/data/fx-history-summary.json')).json();
  const markets=await (await page.request.get('http://127.0.0.1:4173/data/markets-current.json')).json();
  if(!Array.isArray(fxHistory.days)||fxHistory.days.length<1) throw new Error('FX history missing');
  if(markets.marketLayerGate!=='pass'||markets.freshMarketCount<4) throw new Error(`market layer missing ${markets.freshMarketCount}`);
  const freshCodes=new Set((current.records||[]).filter(r=>!r.stale).map(r=>r.code));
  const auMarketRecords=(markets.records||[]).filter(r=>r.countryCode==='AU'&&r.fresh);
  const caMarketRecords=(markets.records||[]).filter(r=>r.countryCode==='CA'&&r.fresh);
  if(auMarketRecords.length!==3||!['Sydney','Melbourne','Brisbane'].every(x=>auMarketRecords.some(r=>r.market===x))) throw new Error('AU market snapshot invalid');
  if(caMarketRecords.length!==1||caMarketRecords[0].market!=='Ontario') throw new Error('CA market snapshot invalid');

  const rows=await page.locator('#ranking tr').count();
  const paths=await page.locator('#map svg path').count();
  const gate=(await page.locator('#gate').innerText()).trim();
  const currencyOptions=await page.locator('#currency option').count();
  if(rows<50) throw new Error(`ranking rows ${rows}<50`);
  if(paths<150) throw new Error(`map paths ${paths}<150`);
  if(gate!=='PASS') throw new Error(`gate=${gate}`);
  if(currencyOptions<25) throw new Error(`currency options ${currencyOptions}<25`);

  await page.waitForFunction(()=>document.documentElement.classList.contains('motion-on'),{timeout:5000});
  await page.waitForFunction(()=>document.documentElement.classList.contains('motion-r2'),{timeout:5000});
  if(await page.locator('style[data-poster-motion="r1"]').count()!==1) throw new Error('poster motion r1 stylesheet missing');
  if(await page.locator('style[data-poster-motion-r2="1"]').count()!==1) throw new Error('poster motion r2 stylesheet missing');
  if(await page.locator('.poster-ambient-field .poster-mote').count()<15) throw new Error('ambient poster particles missing');
  if(await page.locator('.condensation-field i').count()<12) throw new Error('condensation motion layer missing');
  const glassAnimation=await page.locator('.beer-glass').evaluate(el=>getComputedStyle(el).animationName);
  if(!/posterFloat/.test(glassAnimation)) throw new Error(`beer glass motion missing: ${glassAnimation}`);
  const sunAfterAnimation=await page.locator('.sunset-orb').evaluate(el=>getComputedStyle(el,'::after').animationName);
  if(!/posterSunRay/.test(sunAfterAnimation)) throw new Error(`sun ray motion missing: ${sunAfterAnimation}`);
  await page.waitForFunction(()=>document.querySelectorAll('#map svg path[data-motion-seen="1"]').length>=150,{timeout:5000});
  await page.waitForFunction(()=>['fresh-count','median','cheapest','expensive'].every(id=>document.getElementById(id)?.dataset.motionNumber==='1'),{timeout:5000});
  await page.mouse.move(1320,260);
  await page.waitForTimeout(120);
  const parallax=await page.locator('.poster-hero').evaluate(el=>getComputedStyle(el).getPropertyValue('--poster-px').trim());
  const sceneRotate=await page.locator('.poster-hero').evaluate(el=>getComputedStyle(el).getPropertyValue('--scene-rotate').trim());
  const glintX=await page.locator('.poster-hero').evaluate(el=>getComputedStyle(el).getPropertyValue('--glint-x').trim());
  if(!parallax||parallax==='0px') throw new Error(`hero parallax did not respond: ${parallax}`);
  if(!sceneRotate||sceneRotate==='0deg') throw new Error(`hero depth rotation did not respond: ${sceneRotate}`);
  if(!glintX||glintX==='50%') throw new Error(`glass highlight did not track pointer: ${glintX}`);

  const usd=await page.locator('#ranking tr').first().locator('td').nth(2).innerText();
  await page.selectOption('#currency','JPY');
  await page.waitForTimeout(250);
  const jpy=await page.locator('#ranking tr').first().locator('td').nth(2).innerText();
  if(usd===jpy) throw new Error('currency switch did not change ranking price');

  await page.fill('#country-search','Japan');
  await page.waitForTimeout(100);
  const filtered=await page.locator('#ranking tr').count();
  if(filtered!==1) throw new Error(`country search expected 1 row, got ${filtered}`);
  const filteredCountry=(await page.locator('#ranking tr').first().locator('td').nth(1).innerText()).trim();
  if(filteredCountry!=='Japan') throw new Error(`country search returned ${filteredCountry}`);
  await page.locator('#ranking tr').first().click();
  const title=(await page.locator('#country-title').innerText()).trim();
  if(title!=='Japan') throw new Error(`country detail=${title}`);
  if(!await page.locator('.country-panel').evaluate(el=>el.classList.contains('country-impact'))) throw new Error('country impact motion missing');
  const historyStats=await page.locator('#history-stats > div').count();
  if(historyStats!==4) throw new Error(`history stats=${historyStats}`);
  if(await page.locator('#history-chart .price-series').count()<1) throw new Error('price series missing');
  if(await page.locator('#history-chart .fx-series').count()<1) throw new Error('FX series missing');
  await page.waitForFunction(()=>document.querySelectorAll('#history-chart .price-series[data-motion-drawn="1"],#history-chart .fx-series[data-motion-drawn="1"]').length>=2,{timeout:5000});
  if(!await page.locator('#country-detail').evaluate(el=>el.classList.contains('motion-country-change'))) throw new Error('country spotlight transition missing');

  await page.selectOption('#history-series','fx');
  await page.waitForTimeout(50);
  if(await page.locator('#history-chart .price-series').count()!==0) throw new Error('price series remained in FX-only mode');
  if(await page.locator('#history-chart .fx-series').count()<1) throw new Error('FX-only series missing');
  await page.selectOption('#history-series','both');
  await page.selectOption('#history-scale','indexed');
  await page.waitForTimeout(50);
  if(await page.locator('#history-chart .price-series').count()<1||await page.locator('#history-chart .fx-series').count()<1) throw new Error('indexed both-mode missing series');
  const indexedLabel=((await page.locator('#history-chart .chart-label').first().textContent())||'').trim();
  if(!/first visible point = 100/i.test(indexedLabel)) throw new Error(`indexed label missing: ${indexedLabel}`);

  const sourceHref=await page.locator('#country-detail a').getAttribute('href');
  if(!sourceHref||!/^https?:\/\//.test(sourceHref)) throw new Error('country source link missing');

  const activeMarketCountry=(markets.records||[]).find(r=>r.fresh&&freshCodes.has(r.countryCode));
  let uiMarketCount=0,uiMarketCountry='none';
  if(activeMarketCountry){
    uiMarketCountry=activeMarketCountry.country;
    const expected=(markets.records||[]).filter(r=>r.fresh&&r.countryCode===activeMarketCountry.countryCode).length;
    await page.fill('#country-search',activeMarketCountry.country);
    await page.waitForTimeout(100);
    await page.locator('#ranking tr').first().click();
    await page.waitForFunction(n=>!document.querySelector('#market-section')?.hidden&&document.querySelectorAll('#market-ranking tr').length===n,expected,{timeout:5000});
    uiMarketCount=await page.locator('#market-ranking tr').count();
    const marketHref=await page.locator('#market-ranking tr').first().locator('a').getAttribute('href');
    if(!marketHref||!/^https?:\/\//.test(marketHref)) throw new Error('market source link missing');
  }

  await page.fill('#country-search','');
  await page.selectOption('#sort','price-desc');
  const high=(await page.locator('#ranking tr').first().locator('td').nth(2).innerText()).trim();
  await page.selectOption('#sort','price-asc');
  const low=(await page.locator('#ranking tr').first().locator('td').nth(2).innerText()).trim();
  if(high===low) throw new Error('sort did not change first ranking price');
  await page.screenshot({path:'smoke-artifacts/desktop.png',fullPage:true});

  const mobileRecord=(current.records||[]).find(r=>!r.stale&&r.code==='CA')||(current.records||[]).find(r=>!r.stale&&r.code==='JP')||(current.records||[]).find(r=>!r.stale);
  if(!mobileRecord)throw new Error('no fresh country available for mobile deep link');
  await page.setViewportSize({width:390,height:844});
  await page.goto(`http://127.0.0.1:4173/?country=${encodeURIComponent(mobileRecord.code)}&currency=JPY`,{waitUntil:'networkidle',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#ranking tr').length>=50,{timeout:30000});
  const deepTitle=(await page.locator('#country-title').innerText()).trim();
  if(deepTitle!==mobileRecord.country) throw new Error(`deep-link country=${deepTitle}, expected=${mobileRecord.country}`);
  if(await page.inputValue('#currency')!=='JPY') throw new Error('deep-link currency did not restore');
  if(await page.locator('#history-series').count()!==1||await page.locator('#history-scale').count()!==1) throw new Error('history controls missing on mobile');
  if(await page.locator('.poster-ambient-field .poster-mote').count()<15) throw new Error('mobile ambient layer missing');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  if(overflow>2) throw new Error(`mobile horizontal overflow ${overflow}px`);
  const mobileParallax=await page.locator('.poster-hero').evaluate(el=>getComputedStyle(el).getPropertyValue('--poster-px').trim());
  if(mobileParallax!=='0px') throw new Error(`mobile parallax should stay disabled: ${mobileParallax}`);
  await page.screenshot({path:'smoke-artifacts/mobile.png',fullPage:true});

  if(errors.length) throw new Error(errors.join('\n'));
  console.log(`UI SMOKE PASS rows=${rows} mapPaths=${paths} currencies=${currencyOptions} fxDays=${fxHistory.days.length} markets=${markets.freshMarketCount} AUraw=${auMarketRecords.length} CAraw=${caMarketRecords.length} marketUI=${uiMarketCountry}:${uiMarketCount} priceFxModes=pass motion=r2 parallax=${parallax} depth=${sceneRotate} glint=${glintX} mobile=${mobileRecord.code} mobileOverflow=${overflow}`);
} finally {
  await browser.close();
  await new Promise(r=>server.close(r));
}
