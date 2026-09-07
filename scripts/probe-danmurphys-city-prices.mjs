import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const URL='https://www.danmurphys.com.au/beer/brand-corona';
const UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const targets=[
  {code:'SYD',city:'Sydney',searchPostcode:'2000',suburbLabel:'Sydney, NSW, 2000',stores:[{id:'1026',name:'The Cellar Martin Place',postcode:'2000'}]},
  {code:'MEL',city:'Melbourne',searchPostcode:'3000',suburbLabel:'Melbourne, VIC, 3000',stores:[{id:'3419',name:'Melbourne QV',postcode:'3000'}]},
  {code:'BNE',city:'Brisbane',searchPostcode:'4000',suburbLabel:'Brisbane City, QLD, 4000',stores:[
    {id:'2543',name:'Newstead',postcode:'4006'},
    {id:'2424',name:'Woolloongabba',postcode:'4102'},
    {id:'6979',name:'West End',postcode:'4101'},
    {id:'6710',name:'Bulimba',postcode:'4171'},
    {id:'2061',name:'Hamilton',postcode:'4007'},
  ]},
];
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();

async function fetchJson(page,url,init={}){
  const r=await page.evaluate(async({url,init})=>{try{const x=await fetch(url,{credentials:'include',...init});return {status:x.status,body:await x.text()}}catch(e){return {status:0,body:String(e)}}},{url,init});
  let json=null;try{json=JSON.parse(r.body)}catch{}
  return {...r,json};
}

async function probeStore(browser,target,store){
  const context=await browser.newContext({userAgent:UA,locale:'en-AU'});
  const page=await context.newPage();
  let navStatus=null,opened=false,changed=false,inputFound=false,suburbClicked=false,storeClicked=false;
  try{
    const nav=await page.goto(URL,{waitUntil:'domcontentloaded',timeout:35000});navStatus=nav?.status()??null;await page.waitForTimeout(1300);
    const cookie=page.getByRole('button',{name:/accept|agree/i}).first();if(await cookie.count().catch(()=>0))await cookie.click({timeout:1500}).catch(()=>{});
    const current=page.locator('.sm_header__store-info').first();
    if(await current.count().catch(()=>0)){opened=await current.click({timeout:2500}).then(()=>true).catch(()=>false);await page.waitForTimeout(750)}
    const change=page.getByRole('button',{name:/^Change$/i}).first();
    if(await change.count().catch(()=>0)){changed=await change.click({timeout:2500}).then(()=>true).catch(()=>false);await page.waitForTimeout(900)}
    const input=page.locator('input[type="search"][placeholder="Start typing..."]').first();
    if(await input.count().catch(()=>0)){inputFound=true;await input.fill(target.searchPostcode,{timeout:2500});await page.waitForTimeout(1350)}
    const suburb=page.locator('a.search-autocomplete__result-link').filter({hasText:target.suburbLabel}).first();
    if(await suburb.count().catch(()=>0)){
      const label=clean(await suburb.innerText().catch(()=>''));
      if(label===target.suburbLabel){suburbClicked=await suburb.click({timeout:2500}).then(()=>true).catch(()=>false);await page.waitForTimeout(1450)}
    }
    const button=page.getByRole('button').filter({hasText:store.name}).first();
    if(await button.count().catch(()=>0)){storeClicked=await button.click({timeout:3000}).then(()=>true).catch(()=>false);await page.waitForTimeout(1650)}

    const pref=await fetchJson(page,'https://api.danmurphys.com.au/apis/ui/Fulfilment/Preferences?IsCheckoutV2=true');
    const cc=pref.json?.ClickAndCollectDetails||null;
    const browsePayload={department:'beer',filters:[{Key:'brand',Items:[{UrlFriendlyTerm:'corona',Value:'corona',Parent:'brand'}]}],pageNumber:1,pageSize:24,sortType:'Relevance',Location:'ListerFacet',PageUrl:'/beer/brand-corona'};
    const browse=await fetchJson(page,'https://api.danmurphys.com.au/apis/ui/Browse',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(browsePayload)});
    const bundles=Array.isArray(browse.json?.Bundles)?browse.json.Bundles:[];
    const bundle=bundles.find(b=>/corona\s+extra/i.test(clean(b.Name))&&/355\s*ml/i.test(clean(b.Name)))||null;
    const product=bundle?.Products?.find(p=>String(p.Stockcode)==='357480')||null;
    const prices=product?.Prices||null;
    const selectedStore=String(cc?.FulfilmentStoreID||'')===store.id&&String(cc?.AddressPostalCode||'')===store.postcode;
    const exactProduct=/corona\s+extra/i.test(clean(bundle?.Name||''))&&String(product?.Stockcode||'')==='357480'&&(Number(prices?.caseprice?.Value)>0||Number(prices?.singleprice?.Value)>0||Number(prices?.eachprice?.Value)>0||Number(prices?.inStorePrice?.Value)>0);
    const strictPass=navStatus===200&&opened&&changed&&inputFound&&suburbClicked&&storeClicked&&pref.status===200&&selectedStore&&browse.status===200&&exactProduct;
    return {target:{code:target.code,city:target.city,searchPostcode:target.searchPostcode,suburbLabel:target.suburbLabel},store,strictPass,navStatus,interactions:{opened,changed,inputFound,suburbClicked,storeClicked},selected:{storeId:cc?.FulfilmentStoreID||null,storeName:cc?.FulfilmentStoreName||null,suburb:cc?.AddressSuburb||null,postcode:cc?.AddressPostalCode||null},product:{name:clean(bundle?.Name||''),stockCode:product?.Stockcode||null,prices,inventory:product?.Inventory||null},http:{preferences:pref.status,browse:browse.status},browseBundleNames:bundles.slice(0,20).map(b=>clean(b.Name||''))};
  }catch(e){
    return {target:{code:target.code,city:target.city,searchPostcode:target.searchPostcode,suburbLabel:target.suburbLabel},store,strictPass:false,error:String(e.message||e)};
  }finally{await context.close()}
}

const browser=await chromium.launch({headless:true});
const attempts=[];const cityResults=[];
try{
  for(const target of targets){
    let winner=null;
    for(const store of target.stores){
      const row=await probeStore(browser,target,store);attempts.push(row);
      const p=row.product?.prices;
      console.log(`${target.code} STORE PROBE ${row.strictPass?'PASS':'FAIL'} anchor=${target.suburbLabel} targetStore=${store.id} ${store.name} selected=${row.selected?.storeId||'-'} ${row.selected?.storeName||'-'} postcode=${row.selected?.postcode||'-'} case=${p?.caseprice?.Value??'-'} pack=${p?.singleprice?.Value??'-'} stock=${row.product?.stockCode||'-'}`);
      if(row.strictPass){winner=row;break}
    }
    cityResults.push({code:target.code,city:target.city,strictPass:!!winner,winner});
  }
}finally{await browser.close()}
const passed=cityResults.filter(x=>x.strictPass).length;
await fs.mkdir('au-city-price-probe',{recursive:true});
await fs.writeFile('au-city-price-probe/results.json',JSON.stringify({generatedAt:new Date().toISOString(),runner:process.env.GITHUB_ACTIONS?'github-actions':'local',passed,total:targets.length,cityResults,attempts},null,2)+'\n');
for(const c of cityResults){const p=c.winner?.product?.prices;console.log(`${c.code} CITY PRICE ${c.strictPass?'PASS':'FAIL'} store=${c.winner?.selected?.storeId||'-'} ${c.winner?.selected?.storeName||'-'} case=${p?.caseprice?.Value??'-'} pack=${p?.singleprice?.Value??'-'} stock=${c.winner?.product?.stockCode||'-'}`)}
console.log(`AU MULTI-CITY COMPLETE ${passed}/${targets.length}`);
if(passed!==targets.length)process.exitCode=1;
