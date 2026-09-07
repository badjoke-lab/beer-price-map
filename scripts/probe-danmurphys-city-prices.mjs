import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const URL='https://www.danmurphys.com.au/beer/brand-corona';
const UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const targets=[
  {code:'SYD',city:'Sydney',anchorPostcode:'2000',storeId:'1026',storeName:'The Cellar Martin Place',storePostcode:'2000'},
  {code:'MEL',city:'Melbourne',anchorPostcode:'3000',storeId:'3419',storeName:'Melbourne QV',storePostcode:'3000'},
  {code:'BNE',city:'Brisbane',anchorPostcode:'4000',storeId:'2543',storeName:'Newstead',storePostcode:'4006'},
];
const clean=s=>String(s||'').replace(/<br\s*\/?>/gi,' ').replace(/\s+/g,' ').trim();

async function fetchJson(page,url,init={}){
  const r=await page.evaluate(async({url,init})=>{
    try{const x=await fetch(url,{credentials:'include',...init});return {status:x.status,body:await x.text()}}
    catch(e){return {status:0,body:String(e)}}
  },{url,init});
  let json=null;try{json=JSON.parse(r.body)}catch{}
  return {...r,json};
}
function parseVolumeMl(name){
  const m=clean(name).match(/\b(\d{2,4})\s*ml\b/i);
  return m?Number(m[1]):null;
}
function priceCandidates(prices={}){
  return [
    ['caseprice',prices.caseprice?.Value],
    ['singleprice',prices.singleprice?.Value],
    ['eachprice',prices.eachprice?.Value],
    ['inStorePrice',prices.inStorePrice?.Value],
  ].filter(([,v])=>Number(v)>0).map(([type,v])=>({type,value:Number(v)}));
}
function exactCoronaExtraBundles(bundles){
  return bundles.filter(b=>/^Corona Extra\b/i.test(clean(b.Name)) && !/\b(?:Cero|Light|Familiar|Coronita)\b/i.test(clean(b.Name)));
}

const browsePayload={department:'beer',filters:[{Key:'brand',Items:[{UrlFriendlyTerm:'corona',Value:'corona',Parent:'brand'}]}],pageNumber:1,pageSize:24,sortType:'Relevance',Location:'ListerFacet',PageUrl:'/beer/brand-corona'};
const browser=await chromium.launch({headless:true});
const results=[];
try{
  for(const target of targets){
    const context=await browser.newContext({userAgent:UA,locale:'en-AU'});
    const page=await context.newPage();
    try{
      const nav=await page.goto(URL,{waitUntil:'domcontentloaded',timeout:35000});
      const navStatus=nav?.status()??null;
      await page.waitForTimeout(1000);

      const pickup=await fetchJson(page,'https://api.danmurphys.com.au/apis/ui/Fulfilment/Pickup',{
        method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({StoreNo:Number(target.storeId),PickupOption:true})
      });
      const pref=await fetchJson(page,'https://api.danmurphys.com.au/apis/ui/Fulfilment/Preferences?IsCheckoutV2=true');
      const cc=pref.json?.ClickAndCollectDetails||null;
      const selectedStore=String(cc?.FulfilmentStoreID||'')===target.storeId && String(cc?.AddressPostalCode||'')===target.storePostcode;

      const browse=await fetchJson(page,'https://api.danmurphys.com.au/apis/ui/Browse',{
        method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(browsePayload)
      });
      const bundles=Array.isArray(browse.json?.Bundles)?browse.json.Bundles:[];
      const exactBundles=exactCoronaExtraBundles(bundles);
      const offerings=[];
      for(const bundle of exactBundles){
        const bundleName=clean(bundle.Name);
        const volumeMl=parseVolumeMl(bundleName);
        for(const product of bundle.Products||[]){
          const prices=priceCandidates(product.Prices||{});
          if(!volumeMl||prices.length===0)continue;
          offerings.push({
            bundleName,volumeMl,stockCode:String(product.Stockcode||''),prices,
            packDefaultStockCode:String(bundle.PackDefaultStockCode||''),inventory:product.Inventory||null
          });
        }
      }
      const preferred=offerings.sort((a,b)=>{
        const av=Math.abs(a.volumeMl-330),bv=Math.abs(b.volumeMl-330);
        if(av!==bv)return av-bv;
        const ap=Math.min(...a.prices.map(p=>p.value)),bp=Math.min(...b.prices.map(p=>p.value));
        return ap-bp;
      })[0]||null;
      const strictPass=navStatus===200 && pickup.status===200 && pref.status===200 && selectedStore && browse.status===200 && !!preferred;
      const row={
        target,strictPass,http:{navigation:navStatus,pickup:pickup.status,preferences:pref.status,browse:browse.status},
        selected:{storeId:String(cc?.FulfilmentStoreID||''),storeName:cc?.FulfilmentStoreName||null,suburb:cc?.AddressSuburb||null,postcode:String(cc?.AddressPostalCode||'')},
        exactOfferings:offerings,preferred
      };
      results.push(row);
      const p=preferred?.prices?.[0];
      console.log(`${target.code} CITY PRICE ${strictPass?'PASS':'FAIL'} anchor=${target.city} ${target.anchorPostcode} store=${row.selected.storeId||'-'} ${row.selected.storeName||'-'} postcode=${row.selected.postcode||'-'} product=${preferred?.bundleName||'-'} volume=${preferred?.volumeMl||'-'}ml stock=${preferred?.stockCode||'-'} price=${p?`${p.type}:${p.value}`:'-'}`);
    }catch(e){
      results.push({target,strictPass:false,error:String(e.message||e)});
      console.log(`${target.code} CITY PRICE ERROR ${e.message||e}`);
    }finally{await context.close()}
  }
}finally{await browser.close()}

const passed=results.filter(x=>x.strictPass).length;
await fs.mkdir('au-city-price-probe',{recursive:true});
await fs.writeFile('au-city-price-probe/results.json',JSON.stringify({generatedAt:new Date().toISOString(),runner:process.env.GITHUB_ACTIONS?'github-actions':'local',passed,total:targets.length,results},null,2)+'\n');
console.log(`AU MULTI-CITY COMPLETE ${passed}/${targets.length}`);
if(passed!==targets.length)process.exitCode=1;
