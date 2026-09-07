import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
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

const browser=await chromium.launch({headless:true});
const errors=[];
try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  page.on('console',m=>{if(m.type()==='error') errors.push(`console: ${m.text()}`)});
  page.on('pageerror',e=>errors.push(`page: ${e.message}`));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#ranking tr').length>=50,{timeout:30000});

  const rows=await page.locator('#ranking tr').count();
  const paths=await page.locator('#map svg path').count();
  const gate=(await page.locator('#gate').innerText()).trim();
  const currencyOptions=await page.locator('#currency option').count();
  if(rows<50) throw new Error(`ranking rows ${rows}<50`);
  if(paths<150) throw new Error(`map paths ${paths}<150`);
  if(gate!=='PASS') throw new Error(`gate=${gate}`);
  if(currencyOptions<25) throw new Error(`currency options ${currencyOptions}<25`);

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
  await page.fill('#country-search','');

  await page.selectOption('#sort','price-desc');
  const high=(await page.locator('#ranking tr').first().locator('td').nth(2).innerText()).trim();
  await page.selectOption('#sort','price-asc');
  const low=(await page.locator('#ranking tr').first().locator('td').nth(2).innerText()).trim();
  if(high===low) throw new Error('sort did not change first ranking price');

  await page.locator('#ranking tr').first().click();
  const title=(await page.locator('#country-title').innerText()).trim();
  if(!title||title==='Select a country') throw new Error('country detail did not open');
  const historyStats=await page.locator('#history-stats > div').count();
  if(historyStats!==4) throw new Error(`history stats=${historyStats}`);
  const sourceHref=await page.locator('#country-detail a').getAttribute('href');
  if(!sourceHref||!/^https?:\/\//.test(sourceHref)) throw new Error('country source link missing');
  await page.screenshot({path:'smoke-artifacts/desktop.png',fullPage:true});

  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:4173/?country=JP&currency=JPY',{waitUntil:'networkidle',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#ranking tr').length>=50,{timeout:30000});
  const deepTitle=(await page.locator('#country-title').innerText()).trim();
  if(deepTitle!=='Japan') throw new Error(`deep-link country=${deepTitle}`);
  if(await page.inputValue('#currency')!=='JPY') throw new Error('deep-link currency did not restore');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  if(overflow>2) throw new Error(`mobile horizontal overflow ${overflow}px`);
  await page.screenshot({path:'smoke-artifacts/mobile.png',fullPage:true});
  if(errors.length) throw new Error(errors.join('\n'));
  console.log(`UI SMOKE PASS rows=${rows} mapPaths=${paths} currencies=${currencyOptions} detail=${title} deepLink=${deepTitle} mobileOverflow=${overflow}`);
} finally {
  await browser.close();
  await new Promise(r=>server.close(r));
}
