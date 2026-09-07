const state={snapshot:null,fx:null,history:null,target:'USD',byCode:new Map(),world:null,query:'',sort:'price-asc',selected:null,historyRange:'30'};

const numericToAlpha2=new Map(Object.entries({'036':'AU','040':'AT','048':'BH','051':'AM','056':'BE','070':'BA','076':'BR','100':'BG','124':'CA','144':'LK','152':'CL','158':'TW','170':'CO','188':'CR','191':'HR','196':'CY','203':'CZ','208':'DK','214':'DO','218':'EC','233':'EE','246':'FI','250':'FR','268':'GE','276':'DE','288':'GH','300':'GR','320':'GT','344':'HK','348':'HU','352':'IS','360':'ID','372':'IE','376':'IL','380':'IT','388':'JM','392':'JP','398':'KZ','400':'JO','404':'KE','410':'KR','422':'LB','428':'LV','442':'LU','458':'MY','470':'MT','480':'MU','484':'MX','498':'MD','524':'NP','528':'NL','554':'NZ','558':'NI','578':'NO','591':'PA','600':'PY','604':'PE','608':'PH','616':'PL','620':'PT','642':'RO','646':'RW','688':'RS','702':'SG','703':'SK','705':'SI','710':'ZA','724':'ES','752':'SE','756':'CH','764':'TH','780':'TT','784':'AE','800':'UG','826':'GB','840':'US','858':'UY','704':'VN','894':'ZM'}));

const fiatCodes=new Set(`AED AFN ALL AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BGN BHD BIF BMD BND BOB BRL BSD BTN BWP BYN BZD CAD CDF CHF CLP CNY COP CRC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GNF GTQ GYD HKD HNL HTG HUF IDR ILS INR IQD IRR ISK JMD JOD JPY KES KGS KHR KMF KPW KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MYR MZN NAD NGN NIO NOK NPR NZD OMR PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SOS SRD SSP STN SVC SYP SZL THB TJS TMT TND TOP TRY TTD TWD TZS UAH UGX USD UYU UZS VES VND VUV WST XAF XCD XOF XPF YER ZAR ZMW`.split(' '));
const preferredCurrencies=['USD','JPY','EUR','GBP','AUD','CAD','CHF','CNY','HKD','SGD','KRW','TWD','THB','MYR','IDR','INR','AED','ZAR','BRL','MXN','SEK','NOK','DKK','PLN','CZK'];
const fmt=new Intl.NumberFormat(undefined,{maximumFractionDigits:2});
const dateFmt=new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
const currencyNames=typeof Intl.DisplayNames==='function'?new Intl.DisplayNames(['en'],{type:'currency'}):null;

async function j(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.json()}
function esc(s){return String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c))}
function cv(v,from,to){if(from===to)return v;const R=state.fx?.rates||{},a=from==='USD'?1:Number(R[from]),b=to==='USD'?1:Number(R[to]);return Number.isFinite(a)&&a>0&&Number.isFinite(b)&&b>0?(v/a)*b:null}
function dp(r){return cv(r.pricePer330Ml,r.currency,state.target)}
function money(v,c=state.target){if(v==null||!Number.isFinite(v))return 'FX unavailable';try{return new Intl.NumberFormat(undefined,{style:'currency',currency:c,currencyDisplay:'narrowSymbol',maximumFractionDigits:2}).format(v)}catch{return `${c} ${fmt.format(v)}`}}
function localMoney(v,c){return money(v,c)}
function formatVolume(ml){const n=Number(ml);if(!Number.isFinite(n))return '—';return n>=1000?`${fmt.format(n/1000)} L`:`${fmt.format(n)} ml`}
function activeRecords(){return (state.snapshot?.records||[]).filter(r=>!r.stale)}
function median(values){if(!values.length)return null;const s=[...values].sort((a,b)=>a-b),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2}

function populateCurrencies(){
  const select=document.querySelector('#currency');
  const rates=state.fx?.rates||{};
  const local=new Set(activeRecords().map(r=>r.currency));
  const available=new Set(Object.keys(rates).filter(c=>fiatCodes.has(c)));
  available.add('USD');
  for(const c of local)if(rates[c]||c==='USD')available.add(c);
  const ordered=[...preferredCurrencies.filter(c=>available.has(c)),...[...available].filter(c=>!preferredCurrencies.includes(c)).sort()];
  select.textContent='';
  for(const code of ordered){const o=document.createElement('option');o.value=code;let name='';try{name=currencyNames?.of(code)||''}catch{}o.textContent=name?`${code} · ${name}`:code;select.append(o)}
  if(!available.has(state.target))state.target='USD';
  select.value=state.target;
  document.querySelector('#fx-date').textContent=`FX ${state.fx?.date||'—'} · ${ordered.length} display currencies`;
}

function syncUrl(){
  const u=new URL(location.href);
  if(state.target==='USD')u.searchParams.delete('currency');else u.searchParams.set('currency',state.target);
  if(state.selected)u.searchParams.set('country',state.selected);else u.searchParams.delete('country');
  history.replaceState(null,'',u);
}

function summary(records){
  document.querySelector('#fresh-count').textContent=state.snapshot.freshCountryCount;
  const pairs=records.map(r=>[r,dp(r)]).filter(([,v])=>v!=null).sort((a,b)=>a[1]-b[1]);
  document.querySelector('#median').textContent=money(median(pairs.map(([,v])=>v)));
  const low=pairs[0],high=pairs.at(-1);
  document.querySelector('#cheapest').textContent=low?money(low[1]):'—';
  document.querySelector('#cheapest-country').textContent=low?low[0].country:'—';
  document.querySelector('#expensive').textContent=high?money(high[1]):'—';
  document.querySelector('#expensive-country').textContent=high?high[0].country:'—';
  const gate=document.querySelector('#gate');gate.textContent=state.snapshot.productionGate.toUpperCase();gate.className=`status-dot ${state.snapshot.productionGate==='pass'?'pass':'fail'}`;
  document.querySelector('#updated').textContent=`Prices ${dateFmt.format(new Date(state.snapshot.generatedAt))}`;
}

function filteredSorted(records){
  let rows=records.filter(r=>r.country.toLowerCase().includes(state.query.toLowerCase().trim()));
  if(state.sort==='country-asc')rows.sort((a,b)=>a.country.localeCompare(b.country));
  else rows.sort((a,b)=>{const av=dp(a)??Infinity,bv=dp(b)??Infinity;return state.sort==='price-desc'?bv-av:av-bv});
  return rows;
}

function ranking(records){
  const rows=filteredSorted(records),body=document.querySelector('#ranking');body.textContent='';
  document.querySelector('#ranking-count').textContent=`${rows.length} of ${records.length} fresh countries`;
  rows.forEach((r,i)=>{
    const tr=document.createElement('tr');
    if(r.code===state.selected)tr.classList.add('selected');
    tr.innerHTML=`<td>${i+1}</td><td><strong>${esc(r.country)}</strong></td><td>${money(dp(r))}</td><td>${localMoney(r.shelfPrice,r.currency)}</td><td>${formatVolume(r.packageVolumeMl)}</td><td><a class="source-link" href="${esc(r.sourceUrl)}" target="_blank" rel="noopener">retailer ↗</a></td>`;
    tr.addEventListener('click',e=>{if(!e.target.closest('a'))show(r,true)});
    body.append(tr);
  });
}

function historyPoints(r){
  let pts=(state.history?.countries?.[r.code]||[]).filter(p=>p.currency===r.currency).sort((a,b)=>a.date.localeCompare(b.date));
  if(state.historyRange==='all'||!pts.length)return pts;
  const latest=new Date(`${pts.at(-1).date}T00:00:00Z`),days=Number(state.historyRange),cut=new Date(latest);cut.setUTCDate(cut.getUTCDate()-days+1);
  return pts.filter(p=>new Date(`${p.date}T00:00:00Z`)>=cut);
}

function historyChart(r){
  const host=document.querySelector('#history-chart'),stats=document.querySelector('#history-stats');host.textContent='';stats.textContent='';
  const pts=historyPoints(r);
  if(!pts.length){host.innerHTML='<p class="empty-note">No production history for this country yet.</p>';return}
  const ys=pts.map(p=>Number(p.pricePer330Ml)).filter(Number.isFinite),first=ys[0],last=ys.at(-1),min=Math.min(...ys),max=Math.max(...ys),change=first?((last-first)/first)*100:null;
  stats.innerHTML=`<div><span>Observations</span><strong>${pts.length}</strong></div><div><span>Low</span><strong>${localMoney(min,r.currency)}</strong></div><div><span>High</span><strong>${localMoney(max,r.currency)}</strong></div><div><span>First → latest</span><strong>${change==null?'—':`${change>=0?'+':''}${fmt.format(change)}%`}</strong></div>`;
  const W=620,H=260,m={l:58,r:18,t:18,b:34},xs=pts.map(p=>new Date(`${p.date}T00:00:00Z`));
  let xd=d3.extent(xs),yd=d3.extent(ys);
  if(+xd[0]===+xd[1]){xd=[new Date(+xd[0]-86400000),new Date(+xd[1]+86400000)]}
  if(yd[0]===yd[1]){const pad=Math.max(Math.abs(yd[0])*.04,.01);yd=[yd[0]-pad,yd[1]+pad]}
  const x=d3.scaleTime().domain(xd).range([m.l,W-m.r]),y=d3.scaleLinear().domain(yd).nice().range([H-m.b,m.t]);
  const svg=d3.select(host).append('svg').attr('viewBox',`0 0 ${W} ${H}`).attr('aria-label',`${r.country} price history in ${r.currency}`);
  svg.append('g').attr('class','chart-grid').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(W-m.l-m.r)).tickFormat(''));
  svg.append('g').attr('class','chart-axis').attr('transform',`translate(0,${H-m.b})`).call(d3.axisBottom(x).ticks(Math.min(5,Math.max(2,pts.length))).tickSizeOuter(0));
  svg.append('g').attr('class','chart-axis').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSizeOuter(0));
  if(pts.length>1){const line=d3.line().x((d,i)=>x(xs[i])).y(d=>y(Number(d.pricePer330Ml)));svg.append('path').datum(pts).attr('class','history-line').attr('d',line)}
  svg.selectAll('.history-dot').data(pts).join('circle').attr('class','history-dot').attr('cx',(d,i)=>x(xs[i])).attr('cy',d=>y(Number(d.pricePer330Ml))).attr('r',pts.length===1?5:3.5).append('title').text(d=>`${d.date} · ${localMoney(d.pricePer330Ml,r.currency)}`);
  svg.append('text').attr('class','chart-label').attr('x',m.l).attr('y',13).text(`330 ml equivalent · source currency ${r.currency}`);
}

function show(r,updateUrl=false){
  state.selected=r.code;
  if(updateUrl)syncUrl();
  document.querySelector('#country-title').textContent=r.country;
  document.querySelector('#clear-country').hidden=false;
  const st=r.stale?'stale':'fresh',converted=dp(r);
  document.querySelector('#country-detail').innerHTML=`<div class="price-hero"><span>${state.target} / 330 ml</span><strong>${money(converted)}</strong><small>${localMoney(r.pricePer330Ml,r.currency)} normalized locally</small></div><dl><dt>Status</dt><dd><span class="badge ${st}">${st.toUpperCase()}</span></dd><dt>Selected shelf price</dt><dd>${localMoney(r.shelfPrice,r.currency)}</dd><dt>Package total</dt><dd>${formatVolume(r.packageVolumeMl)}</dd><dt>Observed price text</dt><dd>${esc(r.observedPriceText||'—')}</dd><dt>Observed volume text</dt><dd>${esc(r.observedVolumeText||'—')}</dd><dt>Collection</dt><dd>${esc(r.sourceMode)} · HTTP ${esc(r.httpStatus)}</dd><dt>Last fresh</dt><dd>${dateFmt.format(new Date(r.lastFreshAt))}</dd><dt>Market scope</dt><dd>Selected retailer source · not national average</dd><dt>Source</dt><dd><a href="${esc(r.sourceUrl)}" target="_blank" rel="noopener">Open retailer ↗</a></dd></dl>`;
  historyChart(r);
  ranking(activeRecords());
}

function clearCountry(){
  state.selected=null;syncUrl();document.querySelector('#country-title').textContent='Select a country';document.querySelector('#clear-country').hidden=true;
  document.querySelector('#country-detail').innerHTML='<p>Tap a colored country on the map or a row in the ranking. The panel keeps the original package and retailer evidence separate from the normalized comparison price.</p>';
  document.querySelector('#history-stats').textContent='';document.querySelector('#history-chart').textContent='';ranking(activeRecords());
}

function scale(records){
  const vals=records.map(dp).filter(v=>v!=null).sort((a,b)=>a-b),lo=d3.quantile(vals,.08)??0,mid=d3.quantile(vals,.5)??1,hi=d3.quantile(vals,.92)??2,s=d3.scaleLinear().domain([lo,mid,hi]).range(['#4fd1a1','#f2c94c','#ff7a7a']).clamp(true);
  document.querySelector('#legend').innerHTML=`<span>${money(lo)}</span><span class="legend-bar"></span><span>${money(hi)}</span>`;return s;
}

async function map(records){
  if(!state.world)state.world=await j('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
  const host=document.querySelector('#map');host.textContent='';
  const W=1200,H=600,fc=topojson.feature(state.world,state.world.objects.countries),proj=d3.geoNaturalEarth1().fitSize([W,H],fc),path=d3.geoPath(proj),s=scale(records),tip=document.querySelector('#tooltip'),svg=d3.select(host).append('svg').attr('viewBox',`0 0 ${W} ${H}`);
  svg.selectAll('path').data(fc.features).join('path').attr('d',path).attr('class',d=>{const c=numericToAlpha2.get(String(d.id).padStart(3,'0'));return state.byCode.has(c)?`country has-data${c===state.selected?' selected':''}`:'country no-data'}).attr('fill',d=>{const c=numericToAlpha2.get(String(d.id).padStart(3,'0')),r=state.byCode.get(c),v=r?dp(r):null;return v==null?'#192433':s(v)}).on('mousemove',(e,d)=>{const c=numericToAlpha2.get(String(d.id).padStart(3,'0')),r=state.byCode.get(c);if(!r){tip.hidden=true;return}tip.hidden=false;tip.style.left=`${Math.min(e.clientX+14,window.innerWidth-220)}px`;tip.style.top=`${Math.min(e.clientY+14,window.innerHeight-120)}px`;tip.innerHTML=`<strong>${esc(r.country)}</strong><span>${money(dp(r))} / 330 ml</span><small>${localMoney(r.shelfPrice,r.currency)} shelf · ${formatVolume(r.packageVolumeMl)}</small>`}).on('mouseleave',()=>tip.hidden=true).on('click',(_,d)=>{const r=state.byCode.get(numericToAlpha2.get(String(d.id).padStart(3,'0')));if(r)show(r,true)});
}

async function render(){
  const records=activeRecords();state.byCode=new Map(records.map(r=>[r.code,r]));summary(records);ranking(records);await map(records);
  const selected=state.selected&&state.byCode.get(state.selected);if(selected)show(selected,false);
}

function bind(){
  document.querySelector('#currency').addEventListener('change',async e=>{state.target=e.target.value;syncUrl();await render()});
  document.querySelector('#country-search').addEventListener('input',e=>{state.query=e.target.value;ranking(activeRecords())});
  document.querySelector('#sort').addEventListener('change',e=>{state.sort=e.target.value;ranking(activeRecords())});
  document.querySelector('#history-range').addEventListener('change',e=>{state.historyRange=e.target.value;const r=state.selected&&state.byCode.get(state.selected);if(r)historyChart(r)});
  document.querySelector('#clear-country').addEventListener('click',clearCountry);
}

async function init(){
  try{
    [state.snapshot,state.fx,state.history]=await Promise.all([j('./data/current.json'),j('./data/fx.json'),j('./data/history-summary.json')]);
    const params=new URL(location.href).searchParams,requestedCurrency=(params.get('currency')||'USD').toUpperCase(),requestedCountry=(params.get('country')||'').toUpperCase();
    if(requestedCurrency)state.target=requestedCurrency;if(requestedCountry)state.selected=requestedCountry;
    populateCurrencies();bind();await render();
  }catch(e){console.error(e);document.querySelector('#updated').textContent='Data unavailable';document.querySelector('#map').innerHTML='<p class="error-note">Could not load production data.</p>'}
}

init();
