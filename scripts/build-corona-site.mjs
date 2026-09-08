import fs from 'node:fs/promises';
import path from 'node:path';

const out='dist/corona-price-map';
await fs.rm(out,{recursive:true,force:true});
await fs.mkdir(path.join(out,'data'),{recursive:true});
const copies=[
  ['apps/corona-price-map/index-v2.html',`${out}/index.html`],
  ['apps/corona-price-map/styles.css',`${out}/styles.css`],
  ['apps/corona-price-map/spotlight-fix-r3.css',`${out}/spotlight-fix-r3.css`],
  ['apps/corona-price-map/app-v2.js',`${out}/app.js`],
  ['apps/corona-price-map/markets-v1.js',`${out}/markets.js`],
  ['apps/corona-price-map/motion-r2.js',`${out}/motion-r2.js`],
  ['apps/corona-price-map/selection-connectors.js',`${out}/selection-connectors.js`],
  ['apps/corona-price-map/spotlight-guard-r3.js',`${out}/spotlight-guard-r3.js`],
  ['apps/corona-price-map/spotlight-timing-r5.js',`${out}/spotlight-timing-r5.js`],
  ['data/corona/current.json',`${out}/data/current.json`],
  ['data/fx/current.json',`${out}/data/fx.json`],
  ['data/fx/history-summary.json',`${out}/data/fx-history-summary.json`],
  ['data/corona/history-summary.json',`${out}/data/history-summary.json`],
  ['data/corona/source-health.json',`${out}/data/source-health.json`],
  ['data/corona/markets/current.json',`${out}/data/markets-current.json`],
];
for(const [src,dst] of copies){await fs.copyFile(src,dst)}

const indexPath=`${out}/index.html`;
let indexHtml=await fs.readFile(indexPath,'utf8');
if(!indexHtml.includes('./spotlight-fix-r3.css'))indexHtml=indexHtml.replace('</head>','  <link rel="stylesheet" href="./spotlight-fix-r3.css?v=r4" />\n</head>');
if(!indexHtml.includes('./motion-r2.js'))indexHtml=indexHtml.replace('</body>','  <script src="./motion-r2.js?v=r2" type="module"></script>\n</body>');
if(!indexHtml.includes('./selection-connectors.js'))indexHtml=indexHtml.replace('</body>','  <script src="./selection-connectors.js?v=r2b" type="module"></script>\n</body>');
if(!indexHtml.includes('./spotlight-guard-r3.js'))indexHtml=indexHtml.replace('</body>','  <script src="./spotlight-guard-r3.js?v=r3" type="module"></script>\n</body>');
if(!indexHtml.includes('./spotlight-timing-r5.js'))indexHtml=indexHtml.replace('</body>','  <script src="./spotlight-timing-r5.js?v=r5" type="module"></script>\n</body>');
await fs.writeFile(indexPath,indexHtml);

const current=JSON.parse(await fs.readFile('data/corona/current.json','utf8'));
const fxHistory=JSON.parse(await fs.readFile('data/fx/history-summary.json','utf8'));
const markets=JSON.parse(await fs.readFile('data/corona/markets/current.json','utf8'));
if(current.productionGate!=='pass'||current.freshCountryCount<50) throw new Error(`production gate failed: ${current.freshCountryCount}`);
if(!Array.isArray(fxHistory.days)||fxHistory.days.length<1) throw new Error('FX history gate failed');
if(markets.marketLayerGate!=='pass'||markets.freshMarketCount<4) throw new Error(`market layer gate failed: ${markets.freshMarketCount}`);
console.log(`SITE BUILD PASS countries=${current.freshCountryCount} markets=${markets.freshMarketCount} fxDays=${fxHistory.days.length} motion=r2 connectors=r2 spotlight=r4 timing=r5 out=${out}`);