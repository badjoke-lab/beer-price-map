const state={snapshot:null,fx:null,fxHistory:null,history:null,target:'USD',byCode:new Map(),world:null,query:'',sort:'price-asc',selected:null,historyRange:'30',historySeries:'both',historyScale:'actual'};

const numericToAlpha2=new Map(Object.entries({'036':'AU','040':'AT','048':'BH','051':'AM','056':'BE','070':'BA','076':'BR','100':'BG','124':'CA','144':'LK','152':'CL','158':'TW','170':'CO','188':'CR','191':'HR','196':'CY','203':'CZ','208':'DK','214':'DO','218':'EC','233':'EE','246':'FI','250':'FR','268':'GE','276':'DE','288':'GH','300':'GR','320':'GT','344':'HK','348':'HU','352':'IS','360':'ID','372':'IE','376':'IL','380':'IT','388':'JM','392':'JP','398':'KZ','400':'JO','404':'KE','410':'KR','422':'LB','428':'LV','442':'LU','458':'MY','470':'MT','480':'MU','484':'MX','498':'MD','524':'NP','528':'NL','554':'NZ','558':'NI','578':'NO','591':'PA','600':'PY','604':'PE','608':'PH','616':'PL','620':'PT','642':'RO','646':'RW','688':'RS','702':'SG','703':'SK','705':'SI','710':'ZA','724':'ES','752':'SE','756':'CH','764':'TH','780':'TT','784':'AE','800':'UG','826':'GB','840':'US','858':'UY','704':'VN','894':'ZM'}));

const fiatCodes=new Set(`AED AFN ALL AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BGN BHD BIF BMD BND BOB BRL BSD BTN BWP BYN BZD CAD CDF CHF CLP CNY COP CRC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GNF GTQ GYD HKD HNL HTG HUF IDR ILS INR IQD IRR ISK JMD JOD JPY KES KGS KHR KMF KPW KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MYR MZN NAD NGN NIO NOK NPR NZD OMR PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SOS SRD SSP STN SVC SYP SZL THB TJS TMT TND TOP TRY TTD TWD TZS UAH UGX USD UYU UZS VES VND VUV WST XAF XCD XOF XPF YER ZAR ZMW`.split(' '));
const preferredCurrencies=['USD','JPY','EUR','GBP','AUD','CAD','CHF','CNY','HKD','SGD','KRW','TWD','THB','MYR','IDR','INR','AED','ZAR','BRL','MXN','SEK','NOK','DKK','PLN','CZK'];
const fmt=new Intl.NumberFormat(undefined,{maximumFractionDigits:2});
const dateFmt=new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
const dayFmt=new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric'});
const currencyNames=typeof Intl.DisplayNames==='function'?new Intl.DisplayNames(['en'],{type:'currency'}):null;

async function j(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.json()}
function esc(s){return String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c))}
function rateOf(rates,code){if(code==='USD')return 1;const n=Number(rates?.[code]);return Number.isFinite(n)&&n>0?n:null}
function cv(v,from,to,rates=state.fx?.rates){if(from===to)return v;const a=rateOf(rates,from),b=rateOf(rates,to);return a&&b?(v/a)*b:null}
function dp(r){return cv(r.pricePer330Ml,r.currency,state.target)}
function money(v,c=state.target){if(v==null||!Number.isFinite(v))return 'FX unavailable';try{return new Intl.NumberFormat(undefined,{style:'currency',currency:c,currencyDisplay:'narrowSymbol',maximumFractionDigits:2}).format(v)}catch{return `${c} ${fmt.format(v)}`}}
function localMoney(v,c){return money(v,c)}
function formatVolume(ml){const n=Number(ml);if(!Number.isFinite(n))return '—';return n>=1000?`${fmt.format(n/1000)} L`:`${fmt.format(n)} ml`}
function activeRecords(){return (state.snapshot?.records||[]).filter(r=>!r.stale)}
function median(values){if(!values.length)return null;const s=[...values].sort((a,b)=>a-b),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2}
function pct(first,last){return first&&Number.isFinite(first)&&Number.isFinite(last)?((last-first)/first)*100:null}
function dayDate(s){return new Date(`${s}T00:00:00Z`)}

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
  const fxDays=state.fxHistory?.days?.length||0;
  document.querySelector('#fx-date').textContent=`FX ${state.fx?.date||'—'} · ${fxDays} preserved day${fxDays===1?'':'s'} · ${ordered.length} currencies`;
}

function syncUrl(){
  const u=new URL(location.href);
  if(state.target==='USD')u.searchParams.delete('currency');else u.searchParams.set('currency',state.target);
  if(state.selected)u.searchParams.set('country',state.selected);else u.searchParams.delete('country');
  window.history.replaceState(null,'',u);
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

function allPricePoints(r){return (state.history?.countries?.[r.code]||[]).filter(p=>p.currency===r.currency).sort((a,b)=>a.date.localeCompare(b.date))}
function allFxDays(){return [...(state.fxHistory?.days||[])].sort((a,b)=>a.date.localeCompare(b.date))}
function rangeStart(pricePts,fxDays){
  if(state.historyRange==='all')return null;
  const latest=[pricePts.at(-1)?.date,fxDays.at(-1)?.date].filter(Boolean).sort().at(-1);
  if(!latest)return null;
  const cut=dayDate(latest);cut.setUTCDate(cut.getUTCDate()-Number(state.historyRange)+1);return cut;
}
function filterRange(items,cut){return !cut?items:items.filter(p=>dayDate(p.date)>=cut)}
function fxDayAtOrBefore(date){
  const days=allFxDays();
  for(let i=days.length-1;i>=0;i--)if(days[i].date<=date)return {day:days[i],carried:days[i].date!==date};
  return null;
}
function pairRate(day,local,target){
  if(local===target)return 1;
  const a=rateOf(day?.rates,local),b=rateOf(day?.rates,target);return a&&b?a/b:null;
}
function convertHistorical(value,local,target,date){
  const hit=fxDayAtOrBefore(date);if(!hit)return {value:null,fx:null,fxDate:null,carried:false};
  const pair=pairRate(hit.day,local,target);return {value:pair?value/pair:null,fx:pair,fxDate:hit.day.date,carried:hit.carried};
}

function historyStats(r,pricePts,fxDays){
  const host=document.querySelector('#history-stats');host.textContent='';
  const pVals=pricePts.map(p=>Number(p.pricePer330Ml)).filter(Number.isFinite);
  const fxVals=fxDays.map(d=>pairRate(d,r.currency,state.target)).filter(v=>Number.isFinite(v));
  const latestPrice=pricePts.at(-1),converted=latestPrice?convertHistorical(Number(latestPrice.pricePer330Ml),r.currency,state.target,latestPrice.date):null;
  const pChange=pct(pVals[0],pVals.at(-1)),fxChange=pct(fxVals[0],fxVals.at(-1));
  host.innerHTML=`<div><span>Price observations</span><strong>${pricePts.length}</strong></div><div><span>Price change</span><strong>${pChange==null?'—':`${pChange>=0?'+':''}${fmt.format(pChange)}%`}</strong></div><div><span>FX change</span><strong>${fxChange==null?'—':`${fxChange>=0?'+':''}${fmt.format(fxChange)}%`}</strong></div><div><span>Latest historical ${state.target}</span><strong>${converted?.value==null?'—':money(converted.value,state.target)}</strong></div>`;
}

function historyChart(r){
  const host=document.querySelector('#history-chart'),note=document.querySelector('#history-note');host.textContent='';note.textContent='';
  const allPrices=allPricePoints(r),allFx=allFxDays(),cut=rangeStart(allPrices,allFx),pricePts=filterRange(allPrices,cut),fxDays=filterRange(allFx,cut);
  historyStats(r,pricePts,fxDays);
  const wantsPrice=state.historySeries!=='fx',wantsFx=state.historySeries!=='price';
  if((wantsPrice&&!pricePts.length)||(wantsFx&&!fxDays.length)){
    host.innerHTML='<p class="empty-note">Not enough preserved production history for this view yet.</p>';
    note.textContent='History begins with real production snapshots only; no backfill is fabricated.';return;
  }

  const fxSeries=fxDays.map(d=>({date:d.date,value:pairRate(d,r.currency,state.target),day:d})).filter(p=>Number.isFinite(p.value));
  const priceSeries=pricePts.map(p=>({date:p.date,value:Number(p.pricePer330Ml),point:p})).filter(p=>Number.isFinite(p.value));
  const dateStrings=[...(wantsPrice?priceSeries:[]),...(wantsFx?fxSeries:[])].map(p=>p.date).sort();
  if(!dateStrings.length){host.innerHTML='<p class="empty-note">No chartable history yet.</p>';return}

  const W=650,H=300,m={l:62,r:wantsFx&&state.historyScale==='actual'?70:20,t:30,b:36};
  let xd=[dayDate(dateStrings[0]),dayDate(dateStrings.at(-1))];
  if(+xd[0]===+xd[1])xd=[new Date(+xd[0]-86400000),new Date(+xd[1]+86400000)];
  const x=d3.scaleTime().domain(xd).range([m.l,W-m.r]);
  const svg=d3.select(host).append('svg').attr('viewBox',`0 0 ${W} ${H}`).attr('aria-label',`${r.country} beer price and FX history`);
  svg.append('g').attr('class','chart-axis').attr('transform',`translate(0,${H-m.b})`).call(d3.axisBottom(x).ticks(Math.min(6,Math.max(2,dateStrings.length))).tickSizeOuter(0));

  let pricePlot=priceSeries,fxPlot=fxSeries,yPrice=null,yFx=null;
  if(state.historyScale==='indexed'){
    const p0=priceSeries[0]?.value,fx0=fxSeries[0]?.value;
    pricePlot=priceSeries.map(p=>({...p,plot:p0?p.value/p0*100:null})).filter(p=>Number.isFinite(p.plot));
    fxPlot=fxSeries.map(p=>({...p,plot:fx0?p.value/fx0*100:null})).filter(p=>Number.isFinite(p.plot));
    const vals=[...(wantsPrice?pricePlot:[]),...(wantsFx?fxPlot:[])].map(p=>p.plot);
    let yd=d3.extent(vals);if(yd[0]===yd[1])yd=[yd[0]-2,yd[1]+2];
    const y=d3.scaleLinear().domain(yd).nice().range([H-m.b,m.t]);yPrice=y;yFx=y;
    svg.append('g').attr('class','chart-grid').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(W-m.l-m.r)).tickFormat(''));
    svg.append('g').attr('class','chart-axis').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(v=>`${fmt.format(v)}`));
    svg.append('text').attr('class','chart-label').attr('x',m.l).attr('y',13).text('Indexed movement · first visible point = 100');
  }else{
    if(wantsPrice){const vals=priceSeries.map(p=>p.value);let yd=d3.extent(vals);if(yd[0]===yd[1]){const pad=Math.max(Math.abs(yd[0])*.04,.01);yd=[yd[0]-pad,yd[1]+pad]}yPrice=d3.scaleLinear().domain(yd).nice().range([H-m.b,m.t]);svg.append('g').attr('class','chart-grid').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(yPrice).ticks(5).tickSize(-(W-m.l-m.r)).tickFormat(''));svg.append('g').attr('class','chart-axis price-axis').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(yPrice).ticks(5));svg.append('text').attr('class','chart-label price-label').attr('x',m.l).attr('y',13).text(`Beer / 330 ml · ${r.currency}`)}
    if(wantsFx){const vals=fxSeries.map(p=>p.value);let yd=d3.extent(vals);if(yd[0]===yd[1]){const pad=Math.max(Math.abs(yd[0])*.01,.0001);yd=[yd[0]-pad,yd[1]+pad]}yFx=d3.scaleLinear().domain(yd).nice().range([H-m.b,m.t]);svg.append('g').attr('class','chart-axis fx-axis').attr('transform',`translate(${W-m.r},0)`).call(d3.axisRight(yFx).ticks(5));svg.append('text').attr('class','chart-label fx-label').attr('text-anchor','end').attr('x',W-m.r).attr('y',13).text(`${state.target}/${r.currency} · ${r.currency} per ${state.target}`)}
  }

  const draw=(series,y,cls)=>{
    const val=p=>state.historyScale==='indexed'?p.plot:p.value;
    if(series.length>1){svg.append('path').datum(series).attr('class',`history-line ${cls}`).attr('d',d3.line().defined(p=>Number.isFinite(val(p))).x(p=>x(dayDate(p.date))).y(p=>y(val(p))))}
    svg.selectAll(`circle.${cls}`).data(series).join('circle').attr('class',`history-dot ${cls}`).attr('cx',p=>x(dayDate(p.date))).attr('cy',p=>y(val(p))).attr('r',series.length===1?5:3.2);
  };
  if(wantsPrice)draw(pricePlot,yPrice,'price-series');
  if(wantsFx)draw(fxPlot,yFx,'fx-series');

  const tooltip=document.createElement('div');tooltip.className='history-tooltip';tooltip.hidden=true;host.append(tooltip);
  const union=[...new Set(dateStrings)].sort();
  const overlay=svg.append('rect').attr('class','chart-overlay').attr('x',m.l).attr('y',m.t).attr('width',W-m.l-m.r).attr('height',H-m.t-m.b).attr('fill','transparent').style('pointer-events','all');
  const cursor=svg.append('line').attr('class','chart-cursor').attr('y1',m.t).attr('y2',H-m.b).style('display','none');
  overlay.on('mousemove',function(event){
    const [mx]=d3.pointer(event,this),date=x.invert(mx),targetMs=+date;
    let chosen=union[0],dist=Infinity;for(const ds of union){const d=Math.abs(+dayDate(ds)-targetMs);if(d<dist){dist=d;chosen=ds}}
    const p=priceSeries.find(v=>v.date===chosen),fxExact=fxSeries.find(v=>v.date===chosen),hist=p?convertHistorical(p.value,r.currency,state.target,p.date):null,fxShown=fxExact?.value??(hist?.fx??null),fxDate=fxExact?.date??hist?.fxDate;
    const rows=[`<strong>${esc(dayFmt.format(dayDate(chosen)))}</strong>`];
    rows.push(`<span>Beer / 330 ml</span><b>${p?localMoney(p.value,r.currency):'—'}</b>`);
    rows.push(`<span>FX ${esc(`${state.target}/${r.currency}`)}</span><b>${fxShown==null?'—':fmt.format(fxShown)}</b>`);
    rows.push(`<span>${esc(state.target)} equivalent</span><b>${hist?.value==null?'—':money(hist.value,state.target)}</b>`);
    if(hist?.carried)rows.push(`<small>FX carried from ${esc(hist.fxDate)} (nearest prior preserved date)</small>`);else if(fxDate)rows.push(`<small>FX snapshot ${esc(fxDate)}</small>`);
    tooltip.innerHTML=rows.join('');tooltip.hidden=false;
    const rect=host.getBoundingClientRect(),px=x(dayDate(chosen))/W*rect.width;tooltip.style.left=`${Math.min(Math.max(px+10,6),Math.max(6,rect.width-230))}px`;tooltip.style.top='44px';cursor.attr('x1',x(dayDate(chosen))).attr('x2',x(dayDate(chosen))).style('display',null);
  }).on('mouseleave',()=>{tooltip.hidden=true;cursor.style('display','none')});

  const latestHist=priceSeries.at(-1)?convertHistorical(priceSeries.at(-1).value,r.currency,state.target,priceSeries.at(-1).date):null;
  note.textContent=`FX pair ${state.target}/${r.currency} means ${r.currency} units per 1 ${state.target}. ${latestHist?.carried?'Latest beer point uses the nearest prior preserved FX date.':'Same-date FX is used when preserved.'} No historical price is converted with today’s FX retroactively.`;
}

function show(r,updateUrl=false){
  state.selected=r.code;if(updateUrl)syncUrl();
  document.querySelector('#country-title').textContent=r.country;document.querySelector('#clear-country').hidden=false;
  const st=r.stale?'stale':'fresh',converted=dp(r);
  document.querySelector('#country-detail').innerHTML=`<div class="price-hero"><span>${state.target} / 330 ml</span><strong>${money(converted)}</strong><small>${localMoney(r.pricePer330Ml,r.currency)} normalized locally</small></div><dl><dt>Status</dt><dd><span class="badge ${st}">${st.toUpperCase()}</span></dd><dt>Selected shelf price</dt><dd>${localMoney(r.shelfPrice,r.currency)}</dd><dt>Package total</dt><dd>${formatVolume(r.packageVolumeMl)}</dd><dt>Observed price text</dt><dd>${esc(r.observedPriceText||'—')}</dd><dt>Observed volume text</dt><dd>${esc(r.observedVolumeText||'—')}</dd><dt>Collection</dt><dd>${esc(r.sourceMode)} · HTTP ${esc(r.httpStatus)}</dd><dt>Last fresh</dt><dd>${dateFmt.format(new Date(r.lastFreshAt))}</dd><dt>Market scope</dt><dd>Selected retailer source · not national average</dd><dt>Source</dt><dd><a href="${esc(r.sourceUrl)}" target="_blank" rel="noopener">Open retailer ↗</a></dd></dl>`;
  historyChart(r);ranking(activeRecords());
}

function clearCountry(){
  state.selected=null;syncUrl();document.querySelector('#country-title').textContent='Select a country';document.querySelector('#clear-country').hidden=true;
  document.querySelector('#country-detail').innerHTML='<p>Tap a colored country on the map or a row in the ranking. The panel keeps the original package and retailer evidence separate from the normalized comparison price.</p>';
  document.querySelector('#history-stats').textContent='';document.querySelector('#history-chart').textContent='';document.querySelector('#history-note').textContent='';ranking(activeRecords());
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
  document.querySelector('#history-series').addEventListener('change',e=>{state.historySeries=e.target.value;const r=state.selected&&state.byCode.get(state.selected);if(r)historyChart(r)});
  document.querySelector('#history-scale').addEventListener('change',e=>{state.historyScale=e.target.value;const r=state.selected&&state.byCode.get(state.selected);if(r)historyChart(r)});
  document.querySelector('#clear-country').addEventListener('click',clearCountry);
}

async function init(){
  try{
    [state.snapshot,state.fx,state.fxHistory,state.history]=await Promise.all([j('./data/current.json'),j('./data/fx.json'),j('./data/fx-history-summary.json'),j('./data/history-summary.json')]);
    const params=new URL(location.href).searchParams,requestedCurrency=(params.get('currency')||'USD').toUpperCase(),requestedCountry=(params.get('country')||'').toUpperCase();
    if(requestedCurrency)state.target=requestedCurrency;if(requestedCountry)state.selected=requestedCountry;
    populateCurrencies();bind();await render();
  }catch(e){console.error(e);document.querySelector('#updated').textContent='Data unavailable';document.querySelector('#map').innerHTML='<p class="error-note">Could not load production data.</p>'}
}

init();
