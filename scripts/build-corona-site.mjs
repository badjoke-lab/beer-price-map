import fs from 'node:fs/promises';
import path from 'node:path';

const out='dist/corona-price-map';
await fs.rm(out,{recursive:true,force:true});
await fs.mkdir(path.join(out,'data'),{recursive:true});
const copies=[
  ['apps/corona-price-map/index-v2.html',`${out}/index.html`],
  ['apps/corona-price-map/styles.css',`${out}/styles.css`],
  ['apps/corona-price-map/app-v2.js',`${out}/app.js`],
  ['data/corona/current.json',`${out}/data/current.json`],
  ['data/fx/current.json',`${out}/data/fx.json`],
  ['data/fx/history-summary.json',`${out}/data/fx-history-summary.json`],
  ['data/corona/history-summary.json',`${out}/data/history-summary.json`],
  ['data/corona/source-health.json',`${out}/data/source-health.json`],
  ['data/corona/markets/current.json',`${out}/data/markets-current.json`],
];
for(const [src,dst] of copies){await fs.copyFile(src,dst)}
const current=JSON.parse(await fs.readFile('data/corona/current.json','utf8'));
const fxHistory=JSON.parse(await fs.readFile('data/fx/history-summary.json','utf8'));
const markets=JSON.parse(await fs.readFile('data/corona/markets/current.json','utf8'));
if(current.productionGate!=='pass'||current.freshCountryCount<50) throw new Error(`production gate failed: ${current.freshCountryCount}`);
if(!Array.isArray(fxHistory.days)||fxHistory.days.length<1) throw new Error('FX history gate failed');
if(markets.marketLayerGate!=='pass'||markets.freshMarketCount<4) throw new Error(`market layer gate failed: ${markets.freshMarketCount}`);
console.log(`SITE BUILD PASS countries=${current.freshCountryCount} markets=${markets.freshMarketCount} fxDays=${fxHistory.days.length} out=${out}`);
