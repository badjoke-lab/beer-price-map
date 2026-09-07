import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const URL='https://www.danmurphys.com.au/beer/brand-corona';
const TARGET_POSTCODE='2000';
const TARGET_CITY='Sydney';
const UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const apiRe=/api\.danmurphys\.com\.au|\/apis\/ui\//i;

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({userAgent:UA,locale:'en-AU'});
const page=await context.newPage();
const traffic=[];
page.on('response',async res=>{
  const req=res.request(),url=res.url();
  if(!apiRe.test(url))return;
  let body='';
  try{body=(await res.text()).slice(0,12000)}catch{}
  traffic.push({status:res.status(),url,method:req.method(),postData:req.postData()||'',body});
});

async function snapshot(label){
  const inputs=await page.locator('input').evaluateAll(els=>els.map((e,i)=>({i,visible:!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length),placeholder:e.getAttribute('placeholder')||'',aria:e.getAttribute('aria-label')||'',name:e.getAttribute('name')||'',id:e.id||'',type:e.getAttribute('type')||'',value:e.value||'',outer:e.outerHTML.slice(0,900)}))).catch(()=>[]);
  const buttons=await page.locator('button,[role="button"],[role="option"],li').evaluateAll(els=>els.slice(0,250).map((e,i)=>({i,visible:!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length),text:(e.innerText||'').replace(/\s+/g,' ').trim().slice(0,500),role:e.getAttribute('role')||'',cls:e.className||'',outer:e.outerHTML.slice(0,900)}))).catch(()=>[]);
  const body=clean(await page.locator('body').innerText().catch(()=>''));
  return {label,inputs,buttons:buttons.filter(x=>x.visible&&x.text).slice(0,180),body:body.slice(0,18000)};
}

let navStatus=null,storeClick=false,changeClick=false,inputMeta=null,suggestionClick=null,confirmClick=null;
const stages=[];
try{
  const nav=await page.goto(URL,{waitUntil:'domcontentloaded',timeout:35000});navStatus=nav?.status()??null;await page.waitForTimeout(1800);
  const cookie=page.getByRole('button',{name:/accept|agree/i}).first();if(await cookie.count().catch(()=>0))await cookie.click({timeout:1500}).catch(()=>{});

  const store=page.locator('.sm_header__store-info').first();
  if(await store.count().catch(()=>0)){storeClick=await store.click({timeout:2500}).then(()=>true).catch(()=>false);await page.waitForTimeout(1000)}
  stages.push(await snapshot('cart-open'));

  const change=page.getByRole('button',{name:/^Change$/i}).first();
  if(await change.count().catch(()=>0)){changeClick=await change.click({timeout:2500}).then(()=>true).catch(()=>false);await page.waitForTimeout(1300)}
  stages.push(await snapshot('store-change-open'));

  const candidates=await page.locator('input').evaluateAll(els=>els.map((e,i)=>({i,visible:!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length),placeholder:e.getAttribute('placeholder')||'',aria:e.getAttribute('aria-label')||'',name:e.getAttribute('name')||'',id:e.id||'',type:e.getAttribute('type')||''}))).catch(()=>[]);
  inputMeta=candidates.find(x=>x.visible&&/(post|suburb|address|location|store)/i.test(`${x.placeholder} ${x.aria} ${x.name} ${x.id}`))||null;
  if(inputMeta){
    const input=page.locator('input').nth(inputMeta.i);
    await input.fill(TARGET_POSTCODE,{timeout:3000});
    await input.press('Enter').catch(()=>{});
    await page.waitForTimeout(1800);
  }
  stages.push(await snapshot('postcode-entered'));

  const clickables=page.locator('[role="option"],button,[role="button"],li,a');
  const n=Math.min(await clickables.count().catch(()=>0),260);
  for(let i=0;i<n;i++){
    const el=clickables.nth(i),txt=clean(await el.innerText().catch(()=>''));
    if(!txt||/change|cart|login|checkout|search/i.test(txt))continue;
    if(new RegExp(`${TARGET_POSTCODE}|${TARGET_CITY}`,'i').test(txt)){
      const ok=await el.click({timeout:2200}).then(()=>true).catch(()=>false);
      if(ok){suggestionClick=txt.slice(0,500);await page.waitForTimeout(1400);break}
    }
  }

  const confirms=page.locator('button,[role="button"]');
  const cn=Math.min(await confirms.count().catch(()=>0),120);
  for(let i=0;i<cn;i++){
    const el=confirms.nth(i),txt=clean(await el.innerText().catch(()=>''));
    if(!txt||!/select|choose|use this|pick up|confirm|save/i.test(txt))continue;
    const ok=await el.click({timeout:1800}).then(()=>true).catch(()=>false);
    if(ok){confirmClick=txt.slice(0,300);await page.waitForTimeout(1600);break}
  }
  stages.push(await snapshot('selection-attempted'));

  const preferences=await page.evaluate(async()=>{
    try{const r=await fetch('https://api.danmurphys.com.au/apis/ui/Fulfilment/Preferences?IsCheckoutV2=true',{credentials:'include'});return {status:r.status,body:await r.text()}}catch(e){return {status:0,body:String(e)}}
  });
  let parsed=null;try{parsed=JSON.parse(preferences.body)}catch{}
  const cc=parsed?.ClickAndCollectDetails||null;
  const writeTraffic=traffic.filter(x=>!['GET','HEAD','OPTIONS'].includes(x.method));
  const storeTraffic=traffic.filter(x=>/fulfil|store|address|location|suburb|post/i.test(`${x.url} ${x.postData}`));
  const result={generatedAt:new Date().toISOString(),runner:process.env.GITHUB_ACTIONS?'github-actions':'local',navStatus,target:{city:TARGET_CITY,postcode:TARGET_POSTCODE},storeClick,changeClick,inputMeta,suggestionClick,confirmClick,preferences:{status:preferences.status,storeId:cc?.FulfilmentStoreID||null,storeName:cc?.FulfilmentStoreName||null,suburb:cc?.AddressSuburb||null,postcode:cc?.AddressPostalCode||null,raw:preferences.body.slice(0,12000)},writeTraffic,storeTraffic,stages};
  await fs.mkdir('au-store-switch-diagnostic',{recursive:true});
  await fs.writeFile('au-store-switch-diagnostic/diagnostic.json',JSON.stringify(result,null,2)+'\n');
  console.log(`AU STORE SWITCH DIAGNOSTIC status=${preferences.status} store=${cc?.FulfilmentStoreID||'-'} ${cc?.FulfilmentStoreName||'-'} postcode=${cc?.AddressPostalCode||'-'} input=${inputMeta?inputMeta.placeholder||inputMeta.aria||inputMeta.name||inputMeta.id:'-'} suggestion=${suggestionClick||'-'} writes=${writeTraffic.length}`);
}finally{
  await context.close();await browser.close();
}
