import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const base=(process.env.BASE_URL||'https://badjoke-lab.github.io/beer-price-map/').replace(/\/+$/,'')+'/';
const dataUrl=new URL('data/current.json',base).href;
const fxHistoryUrl=new URL('data/fx-history-summary.json',base).href;
const marketsUrl=new URL('data/markets-current.json',base).href;

const response=await fetch(dataUrl,{headers:{'cache-control':'no-cache'}});
if(!response.ok) throw new Error(`current.json HTTP ${response.status}`);
const current=await response.json();
if(current.productionGate!=='pass') throw new Error(`productionGate=${current.productionGate}`);
if(Number(current.freshCountryCount)<50) throw new Error(`freshCountryCount=${current.freshCountryCount}`);
if(!Array.isArray(current.records)||current.records.length<50) throw new Error(`records=${current.records?.length||0}`);
const fxResponse=await fetch(fxHistoryUrl,{headers:{'cache-control':'no-cache'}});
if(!fxResponse.ok) throw new Error(`fx-history-summary.json HTTP ${fxResponse.status}`);
const fxHistory=await fxResponse.json();
if(!Array.isArray(fxHistory.days)||fxHistory.days.length<1) throw new Error('FX history missing');
const marketsResponse=await fetch(marketsUrl,{headers:{'cache-control':'no-cache'}});
if(!marketsResponse.ok) throw new Error(`markets-current.json HTTP ${marketsResponse.status}`);
const markets=await marketsResponse.json();
if(markets.marketLayerGate!=='pass'||Number(markets.freshMarketCount)<4) throw new Error(`marketLayerGate=${markets.marketLayerGate} freshMarketCount=${markets.freshMarketCount}`);

await fs.mkdir('production-smoke-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const errors=[];
try {
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  page.on('console',m=>{if(m.type()==='error') errors.push(`console: ${m.text()}`)});
  page.on('pageerror',e=>errors.push(`page: ${e.message}`));
  const nav=await page.goto(base,{waitUntil:'networkidle',timeout:60000});
  if(!nav||!nav.ok()) throw new Error(`page HTTP ${nav?.status()}`);
  await page.waitForFunction(()=>document.querySelectorAll('#ranking tr').length>=50,{timeout:30000});

  const rows=await page.locator('#ranking tr').count();
  const paths=await page.locator('#map svg path').count();
  const gate=(await page.locator('#gate').innerText()).trim();
  const heading=(await page.locator('h1').innerText()).replace(/\s+/g,' ').trim();
  const currencyOptions=await page.locator('#currency option').count();
  if(rows<50) throw new Error(`ranking rows ${rows}<50`);
  if(paths<150) throw new Error(`map paths ${paths}<150`);
  if(gate!=='PASS') throw new Error(`gate=${gate}`);
  if(!/Beer Price Map/i.test(heading)) throw new Error(`unexpected heading=${heading}`);
  if(currencyOptions<25) throw new Error(`currency options ${currencyOptions}<25`);

  // Production motion proof: the published page must actually animate rather than
  // merely contain the poster styling in source.
  await page.waitForFunction(()=>document.documentElement.classList.contains('motion-on'),{timeout:5000});
  if(await page.locator('style[data-poster-motion="r1"]').count()!==1) throw new Error('production poster motion stylesheet missing');
  const glassAnimation=await page.locator('.beer-glass').evaluate(el=>getComputedStyle(el).animationName);
  if(!/posterFloat/.test(glassAnimation)) throw new Error(`production beer glass motion missing: ${glassAnimation}`);
  await page.waitForFunction(()=>document.querySelectorAll('#map svg path[data-motion-seen="1"]').length>=150,{timeout:5000});
  await page.mouse.move(1320,260);
  await page.waitForTimeout(80);
  const parallax=await page.locator('.poster-hero').evaluate(el=>getComputedStyle(el).getPropertyValue('--poster-px').trim());
  if(!parallax||parallax==='0px') throw new Error(`production hero parallax did not respond: ${parallax}`);

  const sourceHref=await page.locator('#ranking tr').first().locator('a').getAttribute('href');
  if(!sourceHref||!/^https?:\/\//.test(sourceHref)) throw new Error('first ranking source link missing');

  const usd=await page.locator('#ranking tr').first().locator('td').nth(2).innerText();
  await page.selectOption('#currency','JPY');
  await page.waitForTimeout(250);
  const jpy=await page.locator('#ranking tr').first().locator('td').nth(2).innerText();
  if(usd===jpy) throw new Error('currency switch did not change ranking price');

  await page.fill('#country-search','Japan');
  await page.waitForTimeout(100);
  if(await page.locator('#ranking tr').count()!==1) throw new Error('country search failed');
  if((await page.locator('#ranking tr').first().locator('td').nth(1).innerText()).trim()!=='Japan') throw new Error('country search did not return Japan');
  await page.locator('#ranking tr').first().click();
  const title=(await page.locator('#country-title').innerText()).trim();
  if(title!=='Japan') throw new Error(`country detail=${title}`);
  if(await page.locator('#history-stats > div').count()!==4) throw new Error('history stats missing');
  if(await page.locator('#history-chart .price-series').count()<1||await page.locator('#history-chart .fx-series').count()<1) throw new Error('both-mode series missing');
  await page.waitForFunction(()=>document.querySelectorAll('#history-chart .price-series[data-motion-drawn="1"],#history-chart .fx-series[data-motion-drawn="1"]').length>=2,{timeout:5000});
  await page.selectOption('#history-series','fx');
  await page.waitForTimeout(50);
  if(await page.locator('#history-chart .price-series').count()!==0||await page.locator('#history-chart .fx-series').count()<1) throw new Error('FX-only mode failed');
  await page.selectOption('#history-series','both');
  await page.selectOption('#history-scale','indexed');
  await page.waitForTimeout(50);
  const indexedLabel=((await page.locator('#history-chart .chart-label').first().textContent())||'').trim();
  if(!/first visible point = 100/i.test(indexedLabel)) throw new Error(`indexed mode failed: ${indexedLabel}`);

  await page.fill('#country-search','Australia');
  await page.waitForTimeout(100);
  await page.locator('#ranking tr').first().click();
  await page.waitForFunction(()=>!document.querySelector('#market-section')?.hidden&&document.querySelectorAll('#market-ranking tr').length===3,{timeout:5000});
  const auNames=await page.locator('#market-ranking tr td:first-child strong').allInnerTexts();
  if(!['Sydney','Melbourne','Brisbane'].every(x=>auNames.includes(x))) throw new Error(`AU market rows=${auNames.join(',')}`);
  const marketHref=await page.locator('#market-ranking tr').first().locator('a').getAttribute('href');
  if(!marketHref||!/^https?:\/\//.test(marketHref)) throw new Error('market source link missing');

  await page.fill('#country-search','Canada');
  await page.waitForTimeout(100);
  await page.locator('#ranking tr').first().click();
  await page.waitForFunction(()=>!document.querySelector('#market-section')?.hidden&&document.querySelectorAll('#market-ranking tr').length===1,{timeout:5000});
  const caMarket=(await page.locator('#market-ranking tr td:first-child strong').innerText()).trim();
  if(caMarket!=='Ontario') throw new Error(`CA market=${caMarket}`);
  await page.screenshot({path:'production-smoke-artifacts/desktop.png',fullPage:true});

  await page.setViewportSize({width:390,height:844});
  await page.goto(new URL('?country=AU&currency=JPY',base).href,{waitUntil:'networkidle',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#ranking tr').length>=50,{timeout:30000});
  const deepTitle=(await page.locator('#country-title').innerText()).trim();
  if(deepTitle!=='Australia') throw new Error(`deep-link country=${deepTitle}`);
  if(await page.inputValue('#currency')!=='JPY') throw new Error('deep-link currency did not restore');
  await page.waitForFunction(()=>document.querySelectorAll('#market-ranking tr').length===3,{timeout:5000});
  if(await page.locator('#history-series').count()!==1||await page.locator('#history-scale').count()!==1) throw new Error('history controls missing');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  if(overflow>2) throw new Error(`mobile horizontal overflow ${overflow}px`);
  await page.screenshot({path:'production-smoke-artifacts/mobile.png',fullPage:true});

  if(errors.length) throw new Error(errors.join('\n'));
  console.log(`PRODUCTION SMOKE PASS url=${base} fresh=${current.freshCountryCount} rows=${rows} mapPaths=${paths} currencies=${currencyOptions} fxDays=${fxHistory.days.length} markets=${markets.freshMarketCount} AU=3 CA=1 priceFxModes=pass motion=pass parallax=${parallax} mobileOverflow=${overflow}`);
} finally {
  await browser.close();
}
