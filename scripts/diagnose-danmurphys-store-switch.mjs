import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const URL='https://www.danmurphys.com.au/beer/brand-corona';
const TARGET_POSTCODE='2000';
const TARGET_SUBURB='Sydney';
const TARGET_STORE_NAME='The Cellar Martin Place';
const TARGET_STORE_ID='1026';
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
  try{body=(await res.text()).slice(0,16000)}catch{}
  traffic.push({status:res.status(),url,method:req.method(),postData:req.postData()||'',body});
});

async function snapshot(label){
  const inputs=await page.locator('input').evaluateAll(els=>els.map((e,i)=>({i,visible:!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length),placeholder:e.getAttribute('placeholder')||'',aria:e.getAttribute('aria-label')||'',name:e.getAttribute('name')||'',id:e.id||'',type:e.getAttribute('type')||'',value:e.value||'',outer:e.outerHTML.slice(0,900)}))).catch(()=>[]);
  const controls=await page.locator('button,[role="button"],[role="option"],li,a').evaluateAll(els=>els.slice(0,320).map((e,i)=>({i,visible:!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length),text:(e.innerText||'').replace(/\s+/g,' ').trim().slice(0,800),role:e.getAttribute('role')||'',cls:e.className||'',outer:e.outerHTML.slice(0,1100)}))).catch(()=>[]);
  const body=clean(await page.locator('body').innerText().catch(()=>''));
  return {label,inputs,controls:controls.filter(x=>x.visible&&x.text).slice(0,240),body:body.slice(0,22000)};
}

async function apiFetch(path,init){
  return await page.evaluate(async({path,init})=>{
    try{
      const r=await fetch(path,{credentials:'include',...init});
      return {status:r.status,body:await r.text()};
    }catch(e){return {status:0,body:String(e)}}
  },{path,init});
}

let navStatus=null,storeClick=false,changeClick=false,inputMeta=null,suburbClick=false,storeChoiceClick=false;
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
  inputMeta=candidates.find(x=>x.visible&&x.type==='search'&&/start typing/i.test(x.placeholder))||candidates.find(x=>x.visible&&/(post|suburb|address|location|store)/i.test(`${x.placeholder} ${x.aria} ${x.name} ${x.id}`))||null;
  if(inputMeta){
    const input=page.locator('input').nth(inputMeta.i);
    await input.fill(TARGET_POSTCODE,{timeout:3000});
    await page.waitForTimeout(1700);
  }
  stages.push(await snapshot('postcode-entered'));

  const suburb=page.locator('a.search-autocomplete__result-link').filter({hasText:`${TARGET_SUBURB}, NSW, ${TARGET_POSTCODE}`}).first();
  if(await suburb.count().catch(()=>0)){
    const txt=clean(await suburb.innerText().catch(()=>''));
    if(txt===`${TARGET_SUBURB}, NSW, ${TARGET_POSTCODE}`){suburbClick=await suburb.click({timeout:2500}).then(()=>true).catch(()=>false);await page.waitForTimeout(1800)}
  }
  stages.push(await snapshot('suburb-selected'));

  const storeButton=page.getByRole('button').filter({hasText:TARGET_STORE_NAME}).first();
  if(await storeButton.count().catch(()=>0)){
    storeChoiceClick=await storeButton.click({timeout:3000}).then(()=>true).catch(()=>false);
    await page.waitForTimeout(2200);
  }
  stages.push(await snapshot('store-selected'));

  const preferences=await apiFetch('https://api.danmurphys.com.au/apis/ui/Fulfilment/Preferences?IsCheckoutV2=true');
  let pref=null;try{pref=JSON.parse(preferences.body)}catch{}
  const cc=pref?.ClickAndCollectDetails||null;

  const browsePayload={department:'beer',filters:[{Key:'brand',Items:[{UrlFriendlyTerm:'corona',Value:'corona',Parent:'brand'}]}],pageNumber:1,pageSize:24,sortType:'Relevance',Location:'ListerFacet',PageUrl:'/beer/brand-corona'};
  const browse=await apiFetch('https://api.danmurphys.com.au/apis/ui/Browse',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(browsePayload)});
  let browseJson=null;try{browseJson=JSON.parse(browse.body)}catch{}
  const bundles=Array.isArray(browseJson?.Bundles)?browseJson.Bundles:[];
  const exactBundle=bundles.find(b=>/corona\s+extra/i.test(clean(b.Name))&&/355\s*ml/i.test(clean(b.Name)))||null;
  const product=exactBundle?.Products?.find(p=>p.Stockcode==='357480')||exactBundle?.Products?.[0]||null;
  const prices=product?.Prices||null;
  const inventory=product?.Inventory||null;

  const writeTraffic=traffic.filter(x=>!['GET','HEAD','OPTIONS'].includes(x.method));
  const storeTraffic=traffic.filter(x=>/fulfil|store|address|location|suburb|post/i.test(`${x.url} ${x.postData}`));
  const exactStore=String(cc?.FulfilmentStoreID||'')===TARGET_STORE_ID&&String(cc?.AddressPostalCode||'')===TARGET_POSTCODE;
  const exactProduct=!!exactBundle&&!!product&&Number(prices?.caseprice?.Value)>0;
  const strictPass=navStatus===200&&storeClick&&changeClick&&!!inputMeta&&suburbClick&&storeChoiceClick&&preferences.status===200&&exactStore&&browse.status===200&&exactProduct;
  const result={
    generatedAt:new Date().toISOString(),runner:process.env.GITHUB_ACTIONS?'github-actions':'local',strictPass,navStatus,
    target:{suburb:TARGET_SUBURB,postcode:TARGET_POSTCODE,storeName:TARGET_STORE_NAME,storeId:TARGET_STORE_ID},
    interactions:{storeClick,changeClick,inputMeta,suburbClick,storeChoiceClick},
    preferences:{status:preferences.status,storeId:cc?.FulfilmentStoreID||null,storeName:cc?.FulfilmentStoreName||null,suburb:cc?.AddressSuburb||null,postcode:cc?.AddressPostalCode||null,raw:preferences.body.slice(0,14000)},
    corona:{status:browse.status,bundleName:clean(exactBundle?.Name||''),stockCode:product?.Stockcode||null,prices,inventory},
    writeTraffic,storeTraffic,stages
  };
  await fs.mkdir('au-store-switch-diagnostic',{recursive:true});
  await fs.writeFile('au-store-switch-diagnostic/diagnostic.json',JSON.stringify(result,null,2)+'\n');
  console.log(`AU CITY PRICE ${strictPass?'PASS':'FAIL'} store=${cc?.FulfilmentStoreID||'-'} ${cc?.FulfilmentStoreName||'-'} postcode=${cc?.AddressPostalCode||'-'} case=${prices?.caseprice?.Value??'-'} pack=${prices?.singleprice?.Value??'-'} stock=${product?.Stockcode||'-'} suburbClick=${suburbClick} storeClick=${storeChoiceClick}`);
}finally{
  await context.close();await browser.close();
}
