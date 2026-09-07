import fs from 'node:fs/promises';
import path from 'node:path';

const dir=path.join('data','fx','history');
let files=[];
try{files=(await fs.readdir(dir)).filter(f=>/^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort()}catch{}
if(!files.length) throw new Error('no FX history snapshots');

const days=[];
for(const file of files){
  const payload=JSON.parse(await fs.readFile(path.join(dir,file),'utf8'));
  if(payload.base!=='USD'||!payload.date||!payload.rates) continue;
  days.push({date:payload.date,fetchedAt:payload.fetchedAt||null,source:payload.source||null,rates:payload.rates});
}
if(!days.length) throw new Error('no valid FX history snapshots');

const out={schemaVersion:1,base:'USD',generatedAt:new Date().toISOString(),days};
await fs.mkdir('data/fx',{recursive:true});
await fs.writeFile('data/fx/history-summary.json',JSON.stringify(out,null,2)+'\n');
console.log(`FX HISTORY PASS days=${days.length} first=${days[0].date} last=${days.at(-1).date}`);
