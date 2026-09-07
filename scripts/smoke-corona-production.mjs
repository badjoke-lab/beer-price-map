import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const base=(process.env.BASE_URL||'https://badjoke-lab.github.io/beer-price-map/').replace(/\/+$/,'')+'/';
const dataUrl=new URL('data/current.json',base).href;

const response=await fetch(dataUrl,{headers:{'cache-control':'no-cache'}});
if(!response.ok) throw new Error(`current.json HTTP ${response.status}`);
const current=await response.json();
if(current.productionGate!=='pass') throw new Error(`productionGate=${current.productionGate}`);
if(Number(current.freshCountryCount)<50) throw new Error(`freshCountryCount=${current.freshCountryCount}`);
if(!Array.isArray(current.records)||current.records.length<50) throw new Error(`records=${current.records?.length||0}`);

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
  const heading=(await page.locator('h1').innerText()).trim();
  const currencyOptions=await page.locator('#currency option').count();
  if(rows<50) throw new Error(`ranking rows ${rows}<50`);
  if(paths<150) throw new Error(`map paths ${paths}<150`);
  if(gate!=='PASS') throw new Error(`gate=${gate}`);
  if(!/Beer Price Map/i.test(heading)) throw new Error(`unexpected heading=${heading}`);
  if(currencyOptions<25) throw new Error(`currency options ${currencyOptions}<25`);

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
  await page.fill('#country-search','');

  await page.selectOption('#sort','price-desc');
  const high=await page.locator('#ranking tr').first().locator('td').nth(2).innerText();
  await page.selectOption('#sort','price-asc');
  const low=await page.locator('#ranking tr').first().locator('td').nth(2).innerText();
  if(high===low) throw new Error('ranking sort did not change order');

  await page.locator('#ranking tr').first().click();
  const title=(await page.locator('#country-title').innerText()).trim();
  if(!title||title==='Select a country') throw new Error('country detail did not open');
  if(await page.locator('#history-stats > div').count()!==4) throw new Error('history stats missing');
  await page.screenshot({path:'production-smoke-artifacts/desktop.png',fullPage:true});

  await page.setViewportSize({width:390,height:844});
  await page.goto(new URL('?country=JP&currency=JPY',base).href,{waitUntil:'networkidle',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#ranking tr').length>=50,{timeout:30000});
  const deepTitle=(await page.locator('#country-title').innerText()).trim();
  if(deepTitle!=='Japan') throw new Error(`deep-link country=${deepTitle}`);
  if(await page.inputValue('#currency')!=='JPY') throw new Error('deep-link currency did not restore');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  if(overflow>2) throw new Error(`mobile horizontal overflow ${overflow}px`);
  await page.screenshot({path:'production-smoke-artifacts/mobile.png',fullPage:true});

  if(errors.length) throw new Error(errors.join('\n'));
  console.log(`PRODUCTION SMOKE PASS url=${base} fresh=${current.freshCountryCount} rows=${rows} mapPaths=${paths} currencies=${currencyOptions} detail=${title} deepLink=${deepTitle} mobileOverflow=${overflow}`);
} finally {
  await browser.close();
}
