import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const cases=[
  {code:'AU',market:'Sydney',postal:'2000',url:'https://www.danmurphys.com.au/beer/brand-corona',locale:'en-AU'},
  {code:'BR',market:'São Paulo',postal:'01001000',url:'https://mercado.carrefour.com.br/produto/cerveja-corona-extra-pilsen-330ml-long-neck-18487',locale:'pt-BR'}
];
const browser=await chromium.launch({headless:true});
const out=[];
try{
  for(const c of cases){
    const context=await browser.newContext({userAgent:UA,locale:c.locale});
    const page=await context.newPage();
    const requests=[];
    page.on('request',r=>{
      const u=r.url(),pd=r.postData()||'';
      if(/store|location|postal|postcode|zip|cep|delivery|fulfill|pickup|address/i.test(`${u} ${pd}`)||pd.includes(c.postal))requests.push({method:r.method(),url:u.slice(0,1000),postData:pd.slice(0,1600),type:r.resourceType()});
    });
    const responses=[];
    page.on('response',async r=>{
      const req=r.request(),u=r.url(),pd=req.postData()||'';
      if(/store|location|postal|postcode|zip|cep|delivery|fulfill|pickup|address/i.test(`${u} ${pd}`)||pd.includes(c.postal))responses.push({status:r.status(),url:u.slice(0,1000)});
    });
    const nav=await page.goto(c.url,{waitUntil:'domcontentloaded',timeout:35000});await page.waitForTimeout(1800);
    const cookieButtons=page.locator('button,[role="button"],a');
    for(let i=0,n=Math.min(await cookieButtons.count(),120);i<n;i++){const b=cookieButtons.nth(i),t=(await b.innerText().catch(()=>'' )).trim();if(/accept all|aceite todos|prosseguir com todos/i.test(t)){await b.click().catch(()=>{});await page.waitForTimeout(500);break}}

    const textHits=[];
    for(const phrase of c.code==='AU'?[/pick up/i,/delivery/i,/store/i]:[/cep/i,/entrega/i,/loja/i]){
      const loc=page.getByText(phrase);const n=Math.min(await loc.count().catch(()=>0),25);
      for(let i=0;i<n;i++){const e=loc.nth(i);textHits.push({text:(await e.innerText().catch(()=>'' )).trim().slice(0,300),tag:await e.evaluate(el=>el.tagName).catch(()=>''),outer:(await e.evaluate(el=>el.outerHTML).catch(()=>'' )).slice(0,1400)});}
    }
    const controlsBefore=await page.locator('button,a,[role="button"],input').evaluateAll(els=>els.map((e,i)=>({i,tag:e.tagName,text:(e.innerText||'').trim().slice(0,180),placeholder:e.getAttribute('placeholder')||'',aria:e.getAttribute('aria-label')||'',name:e.getAttribute('name')||'',id:e.id||'',cls:(e.className||'').toString().slice(0,220)})).filter(x=>/pick|deliver|store|postcode|suburb|cep|entrega|loja|location/i.test(`${x.text} ${x.placeholder} ${x.aria} ${x.name} ${x.id} ${x.cls}`)).slice(0,80));

    let opener=null;
    if(c.code==='AU'){
      const candidates=page.locator('button,a,[role="button"]');const n=Math.min(await candidates.count(),220);
      for(let i=0;i<n;i++){const e=candidates.nth(i);const t=(await e.innerText().catch(()=>'' )).trim();if(/pick up|delivery|store/i.test(t)){if(await e.click({timeout:2000}).then(()=>true).catch(()=>false)){opener=t;break}}}
    }else{
      const e=page.getByText(/Insira seu CEP|CEP/i).first();if(await e.count().catch(()=>0)){opener=(await e.innerText().catch(()=>'' )).trim();await e.click({timeout:2000}).catch(()=>{});}
    }
    await page.waitForTimeout(1000);
    const inputs=await page.locator('input').evaluateAll(els=>els.map((e,i)=>({i,value:e.value,placeholder:e.getAttribute('placeholder')||'',aria:e.getAttribute('aria-label')||'',name:e.getAttribute('name')||'',id:e.id||'',visible:!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length),outer:e.outerHTML.slice(0,900)})));
    const idx=inputs.find(x=>x.visible&&/postcode|suburb|cep|postal|zip|address|location/i.test(`${x.placeholder} ${x.aria} ${x.name} ${x.id}`));
    let afterFill=null;
    if(idx){const input=page.locator('input').nth(idx.i);await input.fill(c.postal).catch(()=>{});await page.waitForTimeout(1200);afterFill={value:await input.inputValue().catch(()=>''),suggestions:await page.locator('button,[role="option"],li').evaluateAll(els=>els.map(e=>(e.innerText||'').trim()).filter(Boolean).filter(t=>/Sydney|2000|São Paulo|01001|confirm|selecion|usar|use|set/i.test(t)).slice(0,40)).catch(()=>[])};await input.press('Enter').catch(()=>{});await page.waitForTimeout(1200);}
    const controlsAfter=await page.locator('button,a,[role="button"],input').evaluateAll(els=>els.map((e,i)=>({i,tag:e.tagName,text:(e.innerText||'').trim().slice(0,180),value:e.value||'',placeholder:e.getAttribute('placeholder')||'',aria:e.getAttribute('aria-label')||'',name:e.getAttribute('name')||'',id:e.id||'',cls:(e.className||'').toString().slice(0,220)})).filter(x=>/pick|deliver|store|postcode|suburb|cep|entrega|loja|location|2000|01001|sydney|são paulo/i.test(`${x.text} ${x.value} ${x.placeholder} ${x.aria} ${x.name} ${x.id} ${x.cls}`)).slice(0,100));
    const body=(await page.locator('body').innerText()).replace(/\s+/g,' ');
    out.push({code:c.code,market:c.market,postal:c.postal,httpStatus:nav?.status(),opener,textHits,controlsBefore,inputs,afterFill,controlsAfter,requests:requests.slice(0,80),responses:responses.slice(0,80),bodyAroundLocation:body.match(c.code==='AU'?/.{0,300}(?:Pick up|Delivery|Store).{0,900}/i:/.{0,300}(?:CEP|entrega|São Paulo).{0,900}/i)?.[0]||body.slice(0,1200)});
    await context.close();
  }
}finally{await browser.close();}
await fs.mkdir('market-control-diagnostics',{recursive:true});
await fs.writeFile('market-control-diagnostics/controls.json',JSON.stringify(out,null,2)+'\n');
console.log('CONTROL DIAGNOSTICS PASS',out.map(x=>`${x.code}: opener=${x.opener||'-'} input=${x.inputs.find(i=>i.visible&&/postcode|suburb|cep|postal|zip|address|location/i.test(`${i.placeholder} ${i.aria} ${i.name} ${i.id}`))?.placeholder||'-'} requests=${x.requests.length}`).join(' | '));
