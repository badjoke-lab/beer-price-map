import fs from 'node:fs/promises';
import path from 'node:path';

const urls = [
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
  'https://latest.currency-api.pages.dev/v1/currencies/usd.json'
];

let data=null,lastError=null,source=null;
for (const url of urls) {
  try {
    const r=await fetch(url,{headers:{'user-agent':'badjoke-lab-beer-price-map/1.0'}});
    if(!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    data=await r.json();
    if(data?.usd){source=url;break;}
  } catch (e) { lastError=e; }
}
if(!data?.usd) throw lastError||new Error('FX unavailable');

const rates={USD:1};
for(const [code,value] of Object.entries(data.usd)) {
  const n=Number(value);
  if(Number.isFinite(n)&&n>0) rates[code.toUpperCase()]=n;
}
for(const required of ['EUR','JPY','GBP','CAD','AUD','BRL']) {
  if(!rates[required]) throw new Error(`missing required FX rate: ${required}`);
}

const fetchedAt=new Date().toISOString();
const date=data.date||fetchedAt.slice(0,10);
const out={schemaVersion:2,base:'USD',date,fetchedAt,source,rates};

await fs.mkdir('data/corona',{recursive:true});
await fs.mkdir(path.join('data','fx','history'),{recursive:true});
await fs.writeFile('data/corona/fx.json',JSON.stringify(out,null,2)+'\n');
await fs.writeFile('data/fx/current.json',JSON.stringify(out,null,2)+'\n');
await fs.writeFile(path.join('data','fx','history',`${date}.json`),JSON.stringify(out,null,2)+'\n');
console.log(`FX PASS ${Object.keys(rates).length} currencies date=${date} history=data/fx/history/${date}.json source=${source}`);
