import fs from 'node:fs/promises';

const manifest=JSON.parse(await fs.readFile('data/corona-production-countries.json','utf8'));
const allowed=[...manifest.core,...manifest.spare];
if(manifest.core.length!==50) throw new Error(`core=${manifest.core.length}`);
if(new Set(allowed).size!==allowed.length) throw new Error('duplicate country code');
const base=manifest.sourceScopeDefault;
if(!base||base.nationalAverage!==false) throw new Error('sourceScopeDefault must explicitly reject national-average semantics');
for(const code of allowed){
  const scope={...base,...(manifest.sourceScopeOverrides?.[code]||{})};
  if(!scope.level||!scope.label||!scope.classification) throw new Error(`${code}: incomplete scope`);
  if(scope.nationalAverage!==false) throw new Error(`${code}: nationalAverage must be false`);
  if(typeof scope.locationDeterministic!=='boolean') throw new Error(`${code}: locationDeterministic must be boolean`);
}
for(const [code,scope] of Object.entries(manifest.sourceScopeOverrides||{})){
  if(!allowed.includes(code)) throw new Error(`scope override outside production set: ${code}`);
  if(scope.level==='region'&&!scope.jurisdiction) throw new Error(`${code}: region scope requires jurisdiction`);
}
console.log(`MARKET SCOPE CONFIG PASS countries=${allowed.length} classifiedOverrides=${Object.keys(manifest.sourceScopeOverrides||{}).length} default=${base.classification}`);
