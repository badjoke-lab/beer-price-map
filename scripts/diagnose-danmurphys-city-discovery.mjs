import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const URL='https://www.danmurphys.com.au/beer/brand-corona';
const UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const targets=[
  {code:'MEL',postcode:'3000',cityRe:/\bMelbourne\b/i},
  {code:'BNE',postcode:'4000',cityRe:/\bBrisbane(?: City)?\b/i},
];
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();

const browser=await chromium.launch({headless:true});
const results=[];
try{
  for(const target of targets){
    const context=await browser.newContext({userAgent:UA,locale:'en-AU'});
    const page=await context.newPage();
    const api=[];
    page.on('response',async res=>{
      const u=res.url();
      if(!/api\.danmurphys\.com\.au\/apis\/ui\/(?:StoreLocator|Fulfilment)/i.test(u))return;
      let body='';try{body=(await res.text()).slice(0,24000)}catch{}
      api.push({status:res.status(),method:res.request().method(),url:u,body});
    });
    let status=null,storeOpen=false,changeOpen=false,inputFound=false,suburbLabel=null,suburbClick=false;
    let autocomplete=[],controls=[],body='';
    try{
      const nav=await page.goto(URL,{waitUntil:'domcontentloaded',timeout:35000});status=nav?.status()??null;await page.waitForTimeout(1600);
      const cookie=page.getByRole('button',{name:/accept|agree/i}).first();if(await cookie.count().catch(()=>0))await cookie.click({timeout:1500}).catch(()=>{});
      const store=page.locator('.sm_header__store-info').first();
      if(await store.count().catch(()=>0)){storeOpen=await store.click({timeout:2500}).then(()=>true).catch(()=>false);await page.waitForTimeout(900)}
      const change=page.getByRole('button',{name:/^Change$/i}).first();
      if(await change.count().catch(()=>0)){changeOpen=await change.click({timeout:2500}).then(()=>true).catch(()=>false);await page.waitForTimeout(1100)}
      const input=page.locator('input[type="search"][placeholder="Start typing..."]').first();
      if(await input.count().catch(()=>0)){inputFound=true;await input.fill(target.postcode,{timeout:2500});await page.waitForTimeout(1700)}
      const links=page.locator('a.search-autocomplete__result-link');
      const n=Math.min(await links.count().catch(()=>0),30);
      for(let i=0;i<n;i++){const txt=clean(await links.nth(i).innerText().catch(()=>''));if(txt)autocomplete.push(txt)}
      suburbLabel=autocomplete.find(x=>x.includes(target.postcode)&&target.cityRe.test(x))||autocomplete.find(x=>x.includes(target.postcode))||null;
      if(suburbLabel){
        const exact=page.locator('a.search-autocomplete__result-link').filter({hasText:suburbLabel}).first();
        suburbClick=await exact.click({timeout:2500}).then(()=>true).catch(()=>false);await page.waitForTimeout(1800);
      }
      controls=await page.locator('button,[role="button"],a').evaluateAll(els=>els.filter(e=>!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length)).map(e=>({text:(e.innerText||'').replace(/\s+/g,' ').trim().slice(0,700),outer:e.outerHTML.slice(0,1100)})).filter(x=>x.text)).catch(()=>[]);
      body=clean(await page.locator('body').innerText().catch(()=>''));
    }catch(e){body=`ERROR ${e.message||e} ${body}`}
    const storeApi=api.filter(x=>/StoreLocator\/Stores/i.test(x.url));
    results.push({target,status,storeOpen,changeOpen,inputFound,autocomplete,suburbLabel,suburbClick,storeApi,controls:controls.slice(0,220),body:body.slice(0,22000)});
    console.log(`${target.code} DISCOVERY http=${status} input=${inputFound} suburb=${suburbLabel||'-'} clicked=${suburbClick} storeApi=${storeApi.length}`);
    for(const call of storeApi){
      try{
        const j=JSON.parse(call.body);const stores=(j.Stores||j.stores||j.Result||j.result||j||[]);if(Array.isArray(stores)){
          for(const s of stores.slice(0,8))console.log(`${target.code} STORE ${s.Id||s.id||s.StoreId||'-'} | ${s.Name||s.name||s.StoreName||'-'} | ${s.Suburb||s.suburb||s.AddressSuburb||'-'} | ${s.Postcode||s.postcode||s.AddressPostalCode||'-'}`)
        }
      }catch{}
    }
    await context.close();
  }
}finally{await browser.close()}
await fs.mkdir('au-city-discovery',{recursive:true});
await fs.writeFile('au-city-discovery/discovery.json',JSON.stringify({generatedAt:new Date().toISOString(),runner:process.env.GITHUB_ACTIONS?'github-actions':'local',results},null,2)+'\n');
