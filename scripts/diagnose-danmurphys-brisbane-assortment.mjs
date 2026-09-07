import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const URL='https://www.danmurphys.com.au/beer/brand-corona';
const stores=[
  {id:2543,name:'Newstead',postcode:'4006'},
  {id:2424,name:'Woolloongabba',postcode:'4102'},
  {id:6979,name:'West End',postcode:'4101'},
  {id:6710,name:'Bulimba',postcode:'4171'},
  {id:2061,name:'Hamilton',postcode:'4007'},
];
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
async function api(page,url,init={}){
  const r=await page.evaluate(async({url,init})=>{try{const x=await fetch(url,{credentials:'include',...init});return {status:x.status,body:await x.text()}}catch(e){return {status:0,body:String(e)}}},{url,init});
  let json=null;try{json=JSON.parse(r.body)}catch{}
  return {...r,json};
}
const browsePayload={department:'beer',filters:[{Key:'brand',Items:[{UrlFriendlyTerm:'corona',Value:'corona',Parent:'brand'}]}],pageNumber:1,pageSize:24,sortType:'Relevance',Location:'ListerFacet',PageUrl:'/beer/brand-corona'};
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({locale:'en-AU'});
const page=await context.newPage();
const out=[];
try{
  const nav=await page.goto(URL,{waitUntil:'domcontentloaded',timeout:35000});await page.waitForTimeout(1400);
  console.log(`BNE ASSORTMENT NAV ${nav?.status()??'-'}`);
  for(const store of stores){
    const pickup=await api(page,'https://api.danmurphys.com.au/apis/ui/Fulfilment/Pickup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({StoreNo:Number(store.id),PickupOption:true})});
    await page.waitForTimeout(500);
    const pref=await api(page,'https://api.danmurphys.com.au/apis/ui/Fulfilment/Preferences?IsCheckoutV2=true');
    const cc=pref.json?.ClickAndCollectDetails||null;
    const browse=await api(page,'https://api.danmurphys.com.au/apis/ui/Browse',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(browsePayload)});
    const bundles=Array.isArray(browse.json?.Bundles)?browse.json.Bundles:[];
    const parsed=bundles.map(b=>({name:clean(b.Name),packDefaultStockCode:b.PackDefaultStockCode||null,products:(b.Products||[]).map(p=>({stockCode:p.Stockcode||null,prices:p.Prices||null,inventory:p.Inventory||null}))}));
    const exact=parsed.filter(b=>/\bcorona\s+extra\b/i.test(b.name));
    out.push({store,pickupStatus:pickup.status,preferencesStatus:pref.status,selected:{storeId:cc?.FulfilmentStoreID||null,storeName:cc?.FulfilmentStoreName||null,postcode:cc?.AddressPostalCode||null},browseStatus:browse.status,bundles:parsed,exact});
    console.log(`BNE STORE ${store.id} ${store.name} pickup=${pickup.status} selected=${cc?.FulfilmentStoreID||'-'} browse=${browse.status} bundles=${parsed.length} exact=${exact.length}`);
    for(const b of parsed){
      const products=b.products.map(p=>`${p.stockCode||'-'} case=${p.prices?.caseprice?.Value??'-'} pack=${p.prices?.singleprice?.Value??'-'} each=${p.prices?.eachprice?.Value??p.prices?.inStorePrice?.Value??'-'}`).join(' ; ');
      console.log(`BNE PRODUCT ${store.id} | ${b.name} | ${products}`);
    }
  }
}finally{await context.close();await browser.close()}
await fs.mkdir('au-brisbane-assortment',{recursive:true});
await fs.writeFile('au-brisbane-assortment/results.json',JSON.stringify({generatedAt:new Date().toISOString(),runner:process.env.GITHUB_ACTIONS?'github-actions':'local',stores:out},null,2)+'\n');
