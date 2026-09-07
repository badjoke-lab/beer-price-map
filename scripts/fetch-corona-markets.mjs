import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const SOURCE_URL='https://www.danmurphys.com.au/beer/brand-corona';
const UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const AU_TARGETS=[
  {marketId:'AU-SYD',market:'Sydney',anchorPostcode:'2000',storeId:'1026',storeName:'The Cellar Martin Place',storePostcode:'2000'},
  {marketId:'AU-MEL',market:'Melbourne',anchorPostcode:'3000',storeId:'3419',storeName:'Melbourne QV',storePostcode:'3000'},
  {marketId:'AU-BNE',market:'Brisbane',anchorPostcode:'4000',storeId:'2543',storeName:'Newstead',storePostcode:'4006'},
];
const browsePayload={department:'beer',filters:[{Key:'brand',Items:[{UrlFriendlyTerm:'corona',Value:'corona',Parent:'brand'}]}],pageNumber:1,pageSize:24,sortType:'Relevance',Location:'ListerFacet',PageUrl:'/beer/brand-corona'};
const clean=s=>String(s||'').replace(/<br\s*\/?>/gi,' ').replace(/\s+/g,' ').trim();

async function readJson(path){return JSON.parse(await fs.readFile(path,'utf8'))}
async function writeJson(path,payload){await fs.mkdir(path.split('/').slice(0,-1).join('/'),{recursive:true});await fs.writeFile(path,JSON.stringify(payload,null,2)+'\n')}
async function fetchJson(page,url,init={}){
  const r=await page.evaluate(async({url,init})=>{try{const x=await fetch(url,{credentials:'include',...init});return {status:x.status,body:await x.text()}}catch(e){return {status:0,body:String(e)}}},{url,init});
  let json=null;try{json=JSON.parse(r.body)}catch{}
  return {...r,json};
}
function volumeMl(bundle,product){
  const fields=[product?.PackageSize,bundle?.Name,product?.Description];
  for(const field of fields){const m=clean(field).match(/\b(\d{2,4})\s*ml\b/i);if(m)return Number(m[1])}
  return null;
}
function exactCorona(bundle){return /^Corona Extra\b/i.test(clean(bundle?.Name))&&!/\b(?:Cero|Light|Familiar|Coronita)\b/i.test(clean(bundle?.Name))}
function packCount(price){
  const msg=clean(price?.Message);
  const m=msg.match(/\((\d+)\)/);if(m)return Number(m[1]);
  if(/each/i.test(msg))return 1;
  return null;
}
function candidates(bundle){
  const out=[];
  if(!exactCorona(bundle))return out;
  for(const product of bundle.Products||[]){
    const ml=volumeMl(bundle,product);if(!ml)continue;
    const inv=product.Inventory||{};
    const available=Math.max(Number(inv.findinstoreinventoryqty||0),Number(inv.clickandcollect2hrsinventoryqty||0),Number(inv.availableinventoryqty||0));
    for(const key of ['caseprice','singleprice','inanysixprice','eachprice','inStorePrice']){
      const p=product.Prices?.[key],price=Number(p?.Value),count=packCount(p);
      if(!(price>0)||!(count>0))continue;
      const totalVolumeMl=ml*count;
      out.push({
        bundleName:clean(bundle.Name),stockCode:String(product.Stockcode||''),packageVolumeMl:ml,packCount:count,totalVolumeMl,
        shelfPrice:price,priceType:key,priceMessage:clean(p.Message),pricePer330Ml:Number((price/totalVolumeMl*330).toFixed(4)),
        available,sourceUrl:product.Stockcode?`https://www.danmurphys.com.au/product/DM_${product.Stockcode}`:SOURCE_URL
      });
    }
  }
  return out;
}
function chooseOffering(rows){
  const available=rows.filter(r=>r.available>0);
  const pool=available.length?available:rows;
  return [...pool].sort((a,b)=>b.packCount-a.packCount||Math.abs(a.packageVolumeMl-330)-Math.abs(b.packageVolumeMl-330)||a.shelfPrice-b.shelfPrice)[0]||null;
}

const country=await readJson('data/corona/current.json');
const ca=country.records.find(r=>r.code==='CA'&&!r.stale);
if(!ca)throw new Error('CA Ontario reference is not fresh in current country snapshot');
const generatedAt=new Date().toISOString();
const day=generatedAt.slice(0,10);
const records=[{
  marketId:'CA-ON-LCBO',countryCode:'CA',country:'Canada',level:'region',market:'Ontario',store:null,storeId:null,postcode:null,
  retailer:'LCBO',product:'Corona Extra',currency:ca.currency,shelfPrice:ca.shelfPrice,totalVolumeMl:ca.packageVolumeMl,
  packageVolumeMl:null,packCount:null,pricePer330Ml:ca.pricePer330Ml,sourceUrl:ca.sourceUrl,sourceMode:ca.sourceMode,
  exactProduct:true,locationDeterministic:true,nationalAverage:false,fresh:true,observedAt:generatedAt,
  evidence:'Fixed Ontario provincial-retailer reference; not a Canada-wide average.'
}];

const browser=await chromium.launch({headless:true});
try{
  for(const target of AU_TARGETS){
    const context=await browser.newContext({userAgent:UA,locale:'en-AU'});const page=await context.newPage();
    try{
      const nav=await page.goto(SOURCE_URL,{waitUntil:'domcontentloaded',timeout:35000});
      if(nav?.status()!==200)throw new Error(`navigation HTTP ${nav?.status()}`);
      await page.waitForTimeout(800);
      const pickup=await fetchJson(page,'https://api.danmurphys.com.au/apis/ui/Fulfilment/Pickup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({StoreNo:Number(target.storeId),PickupOption:true})});
      const pref=await fetchJson(page,'https://api.danmurphys.com.au/apis/ui/Fulfilment/Preferences?IsCheckoutV2=true');
      const cc=pref.json?.ClickAndCollectDetails||{};
      if(pickup.status!==200||pref.status!==200||String(cc.FulfilmentStoreID||'')!==target.storeId||String(cc.AddressPostalCode||'')!==target.storePostcode)throw new Error(`store selection failed ${target.market}`);
      const browse=await fetchJson(page,'https://api.danmurphys.com.au/apis/ui/Browse',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(browsePayload)});
      if(browse.status!==200)throw new Error(`browse HTTP ${browse.status}`);
      const offering=chooseOffering((browse.json?.Bundles||[]).flatMap(candidates));
      if(!offering)throw new Error(`no exact Corona Extra priced offering for ${target.market}`);
      records.push({
        marketId:target.marketId,countryCode:'AU',country:'Australia',level:'city',market:target.market,store:cc.FulfilmentStoreName||target.storeName,
        storeId:target.storeId,postcode:target.storePostcode,retailer:"Dan Murphy's",product:'Corona Extra',currency:'AUD',
        shelfPrice:offering.shelfPrice,totalVolumeMl:offering.totalVolumeMl,packageVolumeMl:offering.packageVolumeMl,packCount:offering.packCount,
        pricePer330Ml:offering.pricePer330Ml,sourceUrl:offering.sourceUrl,sourceMode:'danmurphys-store-api',exactProduct:true,
        locationDeterministic:true,nationalAverage:false,fresh:true,observedAt:generatedAt,priceType:offering.priceType,priceMessage:offering.priceMessage,
        stockCode:offering.stockCode,availability:offering.available,evidence:`Fixed store ${target.storeId} verified by Fulfilment Preferences.`
      });
      console.log(`MARKET PASS ${target.market} store=${target.storeId} package=${offering.packCount}x${offering.packageVolumeMl}ml price=AUD${offering.shelfPrice} per330=${offering.pricePer330Ml}`);
    }finally{await context.close()}
  }
}finally{await browser.close()}

const au=records.filter(r=>r.countryCode==='AU');
if(au.length!==3||new Set(au.map(r=>r.marketId)).size!==3)throw new Error(`AU market gate failed ${au.length}/3`);
if(records.some(r=>r.nationalAverage||!r.locationDeterministic||!r.exactProduct))throw new Error('market semantic gate failed');
const payload={schemaVersion:1,product:'Corona Extra',generatedAt,marketLayerGate:'pass',freshMarketCount:records.length,countriesWithMarketLayer:2,records};
const history={schemaVersion:1,product:'Corona Extra',date:day,generatedAt,records};
await writeJson('data/corona/markets/current.json',payload);
await writeJson(`data/corona/markets/history/${day}.json`,history);
console.log(`MARKET LAYER PASS records=${records.length} AU=${au.length} CA=1`);
