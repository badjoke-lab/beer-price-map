const marketState={data:null,fx:null};
const fmt=new Intl.NumberFormat(undefined,{maximumFractionDigits:2});
const currencyNames=new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'});

// The poster home opens with Japan as its neutral reference country without
// forcing the viewport away from the hero. app-v2 reads the query string only
// after its asynchronous data load, so this temporary deep-link seed lets the
// existing state machine select Japan directly. It is removed once selection
// has rendered, keeping the canonical default URL clean.
const initialUrl=new URL(location.href);
const seededDefaultCountry=!initialUrl.searchParams.has('country');
if(seededDefaultCountry){initialUrl.searchParams.set('country','JP');history.replaceState(null,'',initialUrl)}

async function j(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.json()}
function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c))}
function rate(code){if(code==='USD')return 1;const n=Number(marketState.fx?.rates?.[code]);return Number.isFinite(n)&&n>0?n:null}
function convert(value,from,to){if(from===to)return value;const a=rate(from),b=rate(to);return a&&b?(value/a)*b:null}
function money(value,currency){if(value==null||!Number.isFinite(Number(value)))return '—';try{return new Intl.NumberFormat(undefined,{style:'currency',currency,currencyDisplay:'narrowSymbol',maximumFractionDigits:2}).format(Number(value))}catch{return `${currency} ${fmt.format(Number(value))}`}}
function packageLabel(r){
  if(r.packCount&&r.packageVolumeMl)return `${r.packCount} × ${fmt.format(r.packageVolumeMl)} ml`;
  if(r.totalVolumeMl)return r.totalVolumeMl>=1000?`${fmt.format(r.totalVolumeMl/1000)} L total`:`${fmt.format(r.totalVolumeMl)} ml total`;
  return '—';
}
function selectedCurrency(){return document.querySelector('#currency')?.value||'USD'}
function selectedCountry(){const t=document.querySelector('#country-title')?.textContent?.trim();return !t||t==='Select a country'?null:t}

const mobileRegionCountries={
  americas:new Set(['Brazil','Canada','Chile','Colombia','Costa Rica','Dominican Republic','Ecuador','Guatemala','Jamaica','Mexico','Nicaragua','Panama','Paraguay','Peru','Trinidad and Tobago','United States','Uruguay']),
  europe:new Set(['Austria','Belgium','Bosnia and Herzegovina','Bulgaria','Croatia','Cyprus','Czechia','Denmark','Estonia','Finland','France','Germany','Greece','Hungary','Iceland','Ireland','Italy','Latvia','Luxembourg','Malta','Moldova','Netherlands','Norway','Poland','Portugal','Romania','Serbia','Slovakia','Slovenia','Spain','Sweden','Switzerland','United Kingdom']),
  'africa-middle-east':new Set(['Bahrain','Ghana','Israel','Jordan','Kenya','Lebanon','Mauritius','Rwanda','South Africa','Uganda','United Arab Emirates','Zambia']),
  asia:new Set(['Armenia','Georgia','Hong Kong','Indonesia','Japan','Kazakhstan','Malaysia','Nepal','Philippines','Singapore','South Korea','Sri Lanka','Taiwan','Thailand','Vietnam']),
  oceania:new Set(['Australia','New Zealand'])
};
function syncMobileRegion(){
  if(!matchMedia('(max-width: 720px)').matches)return;
  const country=selectedCountry();if(!country)return;
  const region=Object.entries(mobileRegionCountries).find(([,names])=>names.has(country))?.[0];
  if(!region)return;
  const button=document.querySelector(`[data-region="${region}"]`);
  if(button&&!button.classList.contains('active'))button.click();
}
function cleanupSeededDefault(){
  if(!seededDefaultCountry||selectedCountry()!=='Japan')return;
  const u=new URL(location.href);if(u.searchParams.get('country')==='JP'){u.searchParams.delete('country');history.replaceState(null,'',u)}
}
function render(){
  const section=document.querySelector('#market-section'),body=document.querySelector('#market-ranking'),note=document.querySelector('#market-note');
  if(!section||!body||!note||!marketState.data)return;
  const country=selectedCountry();
  const rows=(marketState.data.records||[]).filter(r=>r.country===country&&r.fresh);
  if(!rows.length){section.hidden=true;body.textContent='';note.textContent='';return}
  const target=selectedCurrency();body.textContent='';
  for(const r of rows){
    const tr=document.createElement('tr');
    const converted=convert(Number(r.pricePer330Ml),r.currency,target);
    const store=r.store||r.retailer||'Regional reference';
    tr.innerHTML=`<td><strong>${esc(r.market)}</strong><br><small>${esc(r.level)}</small></td><td><a class="source-link" href="${esc(r.sourceUrl)}" target="_blank" rel="noopener">${esc(store)} ↗</a><br><small>${esc(r.retailer||'')}</small></td><td>${esc(packageLabel(r))}</td><td>${money(r.shelfPrice,r.currency)}</td><td>${money(converted,target)}</td>`;
    body.append(tr);
  }
  section.hidden=false;
  const cities=rows.filter(r=>r.level==='city').length,regions=rows.filter(r=>r.level==='region').length;
  note.textContent=`${rows.length} deterministic market reference${rows.length===1?'':'s'} · ${cities} city · ${regions} region · generated ${marketState.data.generatedAt}. These rows are independent observations, not a national average.`;
}

async function init(){
  try{
    [marketState.data,marketState.fx]=await Promise.all([j('./data/markets-current.json'),j('./data/fx.json')]);
    const title=document.querySelector('#country-title');
    if(title)new MutationObserver(()=>{render();syncMobileRegion();cleanupSeededDefault()}).observe(title,{childList:true,subtree:true,characterData:true});
    document.querySelector('#currency')?.addEventListener('change',render);
    render();syncMobileRegion();cleanupSeededDefault();
  }catch(e){console.error('market layer unavailable',e);const section=document.querySelector('#market-section');if(section)section.hidden=true}
}
init();
