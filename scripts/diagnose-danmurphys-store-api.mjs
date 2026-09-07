import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const url='https://www.danmurphys.com.au/beer/brand-corona';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({locale:'en-AU',userAgent:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'});
const page=await context.newPage();
const captures=[];
page.on('response',async r=>{
  const u=r.url();
  if(!/(Fulfilment\/Preferences|allcitiesaddresses\.json|\/apis\/ui\/Browse|store|location|address)/i.test(u))return;
  let body='';
  try{body=(await r.text()).slice(0,30000)}catch{}
  captures.push({status:r.status(),url:u,request:{method:r.request().method(),postData:(r.request().postData()||'').slice(0,5000),headers:r.request().headers()},responseHeaders:r.headers(),body});
});
const nav=await page.goto(url,{waitUntil:'networkidle',timeout:60000});
const store=page.locator('.sm_header__store-info').first();
const chain=await store.evaluate(el=>{const a=[];let n=el;for(let i=0;n&&i<7;i++,n=n.parentElement)a.push({tag:n.tagName,id:n.id||'',cls:(n.className||'').toString(),role:n.getAttribute('role'),tabindex:n.getAttribute('tabindex'),aria:n.getAttribute('aria-label'),onclick:n.getAttribute('onclick'),outer:n.outerHTML.slice(0,6000)});return a}).catch(()=>[]);
const before={body:(await page.locator('body').innerText()).replace(/\s+/g,' ').slice(0,6000),inputs:await page.locator('input').evaluateAll(els=>els.map((e,i)=>({i,placeholder:e.placeholder,aria:e.getAttribute('aria-label'),name:e.name,id:e.id,visible:!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length)})))};
let clicked=null;
for(let depth=0;depth<chain.length;depth++){
  const target=store.locator('xpath='+('../'.repeat(depth)||'.'));
  if(await target.count().catch(()=>0)){
    const ok=await target.click({force:true,timeout:2500}).then(()=>true).catch(()=>false);
    if(ok){clicked={depth,tag:chain[depth]?.tag,id:chain[depth]?.id,cls:chain[depth]?.cls};await page.waitForTimeout(1200);const visible=await page.locator('input').evaluateAll(els=>els.map((e,i)=>({i,placeholder:e.placeholder,aria:e.getAttribute('aria-label'),name:e.name,id:e.id,visible:!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length)})).filter(x=>x.visible));if(visible.some(x=>/post|suburb|address|location|store/i.test(`${x.placeholder} ${x.aria} ${x.name} ${x.id}`)))break;}
  }
}
const after={inputs:await page.locator('input').evaluateAll(els=>els.map((e,i)=>({i,placeholder:e.placeholder,aria:e.getAttribute('aria-label'),name:e.name,id:e.id,visible:!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length),outer:e.outerHTML.slice(0,1200)}))),dialogs:await page.locator('[role="dialog"],dialog,.modal,[class*="modal"],[class*="dialog"]').evaluateAll(els=>els.filter(e=>e.offsetWidth||e.offsetHeight||e.getClientRects().length).map(e=>({text:(e.innerText||'').trim().slice(0,5000),outer:e.outerHTML.slice(0,8000)})).slice(0,20)),body:(await page.locator('body').innerText()).replace(/\s+/g,' ').slice(0,9000)};
await page.waitForTimeout(1200);
await fs.mkdir('au-store-api-diagnostic',{recursive:true});
await fs.writeFile('au-store-api-diagnostic/diagnostic.json',JSON.stringify({httpStatus:nav?.status(),chain,before,clicked,after,captures},null,2)+'\n');
console.log(`AU STORE API DIAGNOSTIC PASS status=${nav?.status()} chain=${chain.length} clicked=${JSON.stringify(clicked)} captures=${captures.length} visibleInputs=${after.inputs.filter(x=>x.visible).length}`);
await browser.close();
