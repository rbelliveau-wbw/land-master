import fs from 'node:fs';
import assert from 'node:assert/strict';
const names=['budget-manager','manage-lots','contract-management','tax-center','land-master','milestone-gantt','settings-manager','proforma-manager','lot-sales-explorer','forecast-manager'];
for(const name of names){
 const root='widgets/'+name+'/src/app/',html=fs.readFileSync(root+'widget.html','utf8'),version=JSON.parse(fs.readFileSync('widgets/'+name+'/widget.config.json','utf8')).version;
 for(const file of ['interaction-motion.js','interaction-motion.css','interaction-surfaces.js']){
  assert.equal(fs.readFileSync(root+file,'utf8'),fs.readFileSync('shared/'+file,'utf8'),name+' synchronized '+file);
  assert.ok(html.includes(file+'?v='+version),name+' loads current '+file);
 }
 const source=html+fs.readdirSync(root).filter(file=>file.endsWith('-app.js')).map(file=>fs.readFileSync(root+file,'utf8')).join('');
 assert.ok(source.includes('LMInteractionSurfaces.install("'+name+'"'),name+' installs its explicit registry');
}
assert.ok(fs.readFileSync('knowledge/design/README.md','utf8').includes('interaction-motion.md'));
assert.ok(fs.readFileSync('AGENTS.md','utf8').includes('knowledge/design/interaction-motion.md'));
console.log('PASS: all ten widgets load matching versioned interaction assets and scoped registries; the new-feature design rule is discoverable.');
