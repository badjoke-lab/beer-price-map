import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const registry=JSON.parse(await fs.readFile('data/market-probes/corona-major-markets.json','utf8'));
const UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const challengeRe=/captcha|access denied|verify (?:that )?you are human|press\s*(?:&|and)\s*hold|unusual traffic|request blocked|cloudflare ray id|security verification|mant[eé]n presionado|no eres un robot|verifica tu identidad/i;
const brandRe=/\bcorona\s+extra\b/i;
const volumeRe=/(?:\b\d{1,2}\s*[x×*]\s*)?\b\d{1,4}(?:[.,]\d+)?\s*(?:ml|cl|l|litre|liter|oz|cc)\b/i;
const priceRe={
  US:/(?:\$|USD\s*)\s*\d[\d.,]*/i,CA:/(?:C\$|CAD\s*\$?|\$)\s*\d[\d.,]*/i,
  AU:/(?:A\$|AUD\s*|\$)\s*\d[\d.,]*/i,BR:/R\$\s*\d[\d.,]*/i,MX:/\$\s*\d[\d.,]*/i,JP:/¥\s*\d[\d,]*/i
};
const locationWords=/postcode|postal|zip|cep|suburb|location|your store|set store|select store|delivery|pickup|pick up|address|ubicaci[oó]n|c[oó]digo postal|loja|entrega/i;
const submitWords=/search|find|apply|set|use|confirm|save|continue|select|delivery|pickup|pick up|buscar|continuar|confirmar|selecionar|usar/i;
const cookieWords=/accept all|accept cookies|agree|aceite todos|prosseguir com todos|aceptar todas|aceptar|concordo/i;

function clean(s){return String(s||'').replace(/\s+/g,' ').trim()}
function textMatch(re,s){const m=clean(s).match(re);return m?.[0]||null}
function token(s){return clean(s).toLowerCase().replace(/[^a-z0-9áéíóúãõç]/gi,'')}
function nearProduct(re,s){const text=clean(s),m=text.match(brandRe);if(!m)return null;const i=m.index??0;return textMatch(re,text.slice(Math.max(0,i-180),i+900))}
function volumeFromUrl(url){const m=String(url).match(/(\d{2,4})[-_ ]?ml/i);return m?`${m[1]} ml`:null}
function hasPostal(s,postal){const h=token(s),p=token(postal);return !!p&&h.includes(p)}
function locationRequestRe(s){return /set-regionalization|fulfilment|fulfillment|store|location|postal|postcode|zip|cep|delivery|pickup|address/i.test(s)}

async function getBody(page){return clean(await page.locator('body').innerText({timeout:7000}).catch(()=>''))}
async function acceptCookies(page){
  const nodes=page.locator('button,[role="button"],a'); const n=Math.min(await nodes.count().catch(()=>0),140);
  for(let i=0;i<n;i++){const el=nodes.nth(i),t=clean(await el.innerText().catch(()=>''));if(t&&cookieWords.test(t)){await el.click({timeout:1800}).catch(()=>{});await page.waitForTimeout(500);return t}}
  return null;
}
async function inputCandidates(page){
  return await page.locator('input').evaluateAll(els=>els.map((e,i)=>({i,placeholder:e.getAttribute('placeholder')||'',aria:e.getAttribute('aria-label')||'',name:e.getAttribute('name')||'',id:e.id||'',type:e.getAttribute('type')||'',visible:!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length)}))).catch(()=>[]);
}
async function clickLocationOpener(page,target){
  if(target.code==='AU'){
    const setStore=page.locator('#set-store').first();
    if(await setStore.count().catch(()=>0)){if(await setStore.click({timeout:3000,force:true}).then(()=>true).catch(()=>false)){await page.waitForTimeout(900);return '#set-store'}}
    const special=page.getByText(/^(?:Pick up:|Delivery:)/i).first();
    if(await special.count().catch(()=>0)){const t=clean(await special.innerText().catch(()=>''));if(await special.click({timeout:2500,force:true}).then(()=>true).catch(()=>false)){await page.waitForTimeout(900);return t}}
  }
  if(target.code==='BR'){
    const regional=page.locator('button[aria-label*="regionaliza"]').first();
    if(await regional.count().catch(()=>0)){const t=clean(await regional.innerText().catch(()=>''));if(await regional.click({timeout:2500}).then(()=>true).catch(()=>false)){await page.waitForTimeout(700);return t||'regionalization-button'}}
  }
  const nodes=page.locator('button,a,[role="button"],[id*="store"],[class*="store"]'); const n=Math.min(await nodes.count().catch(()=>0),220);
  for(let i=0;i<n;i++){
    const el=nodes.nth(i); const t=clean(await el.innerText().catch(()=>'')); const meta=await el.evaluate(e=>`${e.id||''} ${e.className||''} ${e.getAttribute('aria-label')||''}`).catch(()=>'');
    if(locationWords.test(`${t} ${meta}`)){if(await el.click({timeout:2500,force:true}).then(()=>true).catch(()=>false)){await page.waitForTimeout(900);return t||meta}}
  }
  return null;
}
async function selectLocation(page,target,market,events){
  if(market.referenceOnly)return {attempted:false,selected:true,strongSelected:true,evidence:'fixed regional reference',inputs:[]};
  let opened=await clickLocationOpener(page,target),inputs=await inputCandidates(page);
  let candidate=inputs.find(x=>x.visible&&locationWords.test(`${x.placeholder} ${x.aria} ${x.name} ${x.id}`));
  if(!candidate){inputs=await inputCandidates(page);candidate=inputs.find(x=>x.visible&&locationWords.test(`${x.placeholder} ${x.aria} ${x.name} ${x.id}`));}
  if(!candidate)return {attempted:true,selected:false,strongSelected:false,evidence:opened?`opened:${opened}; no location input`:'no location input/opener',opened,inputs:inputs.slice(0,30)};
  const input=page.locator('input').nth(candidate.i);
  await input.fill(market.postalCode,{timeout:4000}).catch(()=>{});
  await page.waitForTimeout(900);

  let chosen=null;
  if(target.code==='BR'){
    const choose=page.getByText(/^Selecionar uma loja$/i).first();
    if(await choose.count().catch(()=>0)){if(await choose.click({timeout:2500}).then(()=>true).catch(()=>false)){chosen='Selecionar uma loja';await page.waitForTimeout(1200)}}
    const storeChoices=page.locator('button,[role="option"],li,a'); const sn=Math.min(await storeChoices.count().catch(()=>0),220);
    for(let i=0;i<sn;i++){
      const o=storeChoices.nth(i),raw=clean(await o.innerText().catch(()=>''));
      if(/Carrefour|Hipermercado|Market|Loja/i.test(raw)&&raw.length<240){if(await o.click({timeout:1800}).then(()=>true).catch(()=>false)){chosen=`${chosen||''} -> ${raw}`;await page.waitForTimeout(1200);break}}
    }
  } else {
    await input.press('Enter').catch(()=>{});await page.waitForTimeout(1100);
    const marketWords=market.market.split(/[,.·]/).map(token).filter(x=>x.length>=4);
    const options=page.locator('button,[role="option"],li,a'); const on=Math.min(await options.count().catch(()=>0),240);
    for(let i=0;i<on;i++){
      const o=options.nth(i),raw=clean(await o.innerText().catch(()=>'')),t=token(raw);
      if((token(market.postalCode)&&t.includes(token(market.postalCode)))||marketWords.some(w=>t.includes(w))){if(await o.click({timeout:1800}).then(()=>true).catch(()=>false)){chosen=raw;await page.waitForTimeout(1300);break}}
    }
  }
  if(!chosen){
    const buttons=page.locator('button,[role="button"]'); const n=Math.min(await buttons.count().catch(()=>0),140);
    for(let i=0;i<n;i++){const b=buttons.nth(i),t=clean(await b.innerText().catch(()=>''));if(t&&submitWords.test(t)){if(await b.click({timeout:1800}).then(()=>true).catch(()=>false)){chosen=t;await page.waitForTimeout(1100);break}}}
  }

  const body=await getBody(page);
  const storage=await page.evaluate(()=>({local:Object.fromEntries(Object.entries(localStorage).filter(([k,v])=>/store|location|fulfill|delivery|pickup|post|zip|cep/i.test(`${k} ${v}`)).slice(0,30)),session:Object.fromEntries(Object.entries(sessionStorage).filter(([k,v])=>/store|location|fulfill|delivery|pickup|post|zip|cep/i.test(`${k} ${v}`)).slice(0,30))})).catch(()=>({}));
  const cookies=(await page.context().cookies().catch(()=>[])).filter(c=>/store|location|fulfill|delivery|pickup|post|zip|cep/i.test(`${c.name} ${c.value}`)).slice(0,30);
  const persisted=hasPostal(`${body} ${JSON.stringify(storage)} ${JSON.stringify(cookies)}`,market.postalCode);
  const successfulLocationRequest=events.some(e=>e.status&&e.status<400&&hasPostal(`${e.url} ${e.postData||''}`,market.postalCode));
  const strongSelected=persisted||successfulLocationRequest;
  return {attempted:true,selected:strongSelected,strongSelected,evidence:strongSelected?(persisted?'exact postal persisted':'successful request carried exact postal'):'no exact postal/store proof',opened,chosen,input:candidate,inputs:inputs.slice(0,30),storage,cookies,successfulLocationRequest};
}

const browser=await chromium.launch({headless:true});
const results=[];
try{
  for(const target of registry.targets){
    if(!target.probeMarkets?.length){results.push({code:target.code,country:target.country,status:'not-probed',reason:target.automationStatus,productionEligible:false});continue;}
    for(const market of target.probeMarkets){
      const context=await browser.newContext({userAgent:UA,locale:target.code==='BR'?'pt-BR':target.code==='MX'?'es-MX':target.code==='AU'?'en-AU':'en-US'});
      const page=await context.newPage();
      const events=[];const productSignals=[];
      page.on('request',r=>{const u=r.url(),postData=r.postData()||'';if(locationRequestRe(`${u} ${postData}`))events.push({method:r.method(),url:u.slice(0,900),postData:postData.slice(0,1800),status:null});if(/corona|18487|7891149108718|preco=|price=/i.test(`${u} ${postData}`))productSignals.push(`${u} ${postData}`.slice(0,1100));});
      page.on('response',r=>{const req=r.request(),u=r.url(),postData=req.postData()||'';if(locationRequestRe(`${u} ${postData}`)){for(let i=events.length-1;i>=0;i--){const e=events[i];if(e.status==null&&e.url===u.slice(0,900)&&e.method===req.method()){e.status=r.status();break}}}});
      let status=null,finalUrl=target.url,location={attempted:false,selected:false,strongSelected:false,evidence:'navigation failed'},body='',html='';
      try{
        const nav=await page.goto(target.url,{waitUntil:'domcontentloaded',timeout:35000});status=nav?.status()??null;finalUrl=page.url();await page.waitForTimeout(1500);await acceptCookies(page);
        location=await selectLocation(page,target,market,events);await page.waitForTimeout(1300);body=await getBody(page);html=await page.content().catch(()=>'');
      }catch(e){body=await getBody(page);html=await page.content().catch(()=>'');location={...location,error:String(e.message||e).slice(0,350)};}
      const combined=`${body} ${html}`;
      const challenge=challengeRe.test(body);
      const urlExact=/corona[-_/ ]?extra/i.test(target.url);
      const exactProduct=brandRe.test(combined)||urlExact||productSignals.some(u=>/corona[-_% ]?extra/i.test(u));
      let volume=nearProduct(volumeRe,body)||textMatch(volumeRe,html)||volumeFromUrl(target.url);
      let price=nearProduct(priceRe[target.code]||/[$€£¥]\s*\d[\d.,]*/,body)||textMatch(priceRe[target.code]||/[$€£¥]\s*\d[\d.,]*/,html);
      let evidenceSource='page';
      if(target.code==='BR'){
        const signal=productSignals.find(u=>/[?&]preco=([0-9.]+)/i.test(u));
        if(signal&&!price){const m=signal.match(/[?&]preco=([0-9.]+)/i);price=`R$ ${m[1]}`;evidenceSource='network-signal'}
        if(!volume&&/330ml/i.test(target.url)){volume='330 ml';evidenceSource=evidenceSource==='page'?'source-url':`${evidenceSource}+source-url`}
      }
      const passed=!challenge&&location.strongSelected&&exactProduct&&!!volume&&!!price;
      results.push({
        code:target.code,country:target.country,market:market.market,postalCode:market.postalCode,referenceOnly:!!market.referenceOnly,
        httpStatus:status,finalUrl,challenge,locationSelected:location.strongSelected,locationEvidence:location.evidence,locationDebug:location,
        exactProduct,volume,price,evidenceSource,locationEvents:events.slice(-30),productSignals:[...new Set(productSignals)].slice(0,20),passed,productionEligible:false,
        bodySample:body.slice(0,1400)
      });
      console.log(`${target.code} ${market.market} ${passed?'CANDIDATE-PASS':'FAIL'} http=${status} location=${location.strongSelected} product=${exactProduct} volume=${volume||'-'} price=${price||'-'} evidence=${evidenceSource} challenge=${challenge}`);
      await context.close();
    }
  }
}finally{await browser.close();}

const grouped={};for(const r of results)(grouped[r.code]??=[]).push(r);
const summary=Object.fromEntries(Object.entries(grouped).map(([code,rows])=>[code,{probes:rows.length,passed:rows.filter(r=>r.passed).length,allPassed:rows.length>0&&rows.every(r=>r.passed)}]));
const out={schemaVersion:3,product:registry.product,runner:process.env.GITHUB_ACTIONS?'github-actions':'local',generatedAt:new Date().toISOString(),results,summary};
await fs.mkdir('market-probe-artifacts',{recursive:true});
await fs.writeFile('market-probe-artifacts/major-market-probe.json',JSON.stringify(out,null,2)+'\n');
await fs.writeFile('market-probe-artifacts/summary.txt',Object.entries(summary).map(([c,s])=>`${c}: ${s.passed}/${s.probes} candidate-pass`).join('\n')+'\n');
console.log('MARKET PROBE COMPLETE',JSON.stringify(summary));
