import fs from 'node:fs';
import assert from 'node:assert/strict';
const widgets=['budget-manager','manage-lots','contract-management','tax-center','land-master','milestone-gantt','settings-manager'];
for(const widget of widgets){
 const folder='widgets/'+widget+'/src/app/',html=fs.readFileSync(folder+'widget.html','utf8');
 for(const file of ['number-transitions.js','number-transitions.css','number-surfaces.js']){
  assert.equal(fs.readFileSync(folder+file,'utf8'),fs.readFileSync('shared/'+file,'utf8'),widget+' uses canonical '+file);
  assert.ok(html.includes(file),widget+' loads '+file);
 }
 assert.ok(html.includes('LMNumberSurfaces.install("'+widget+'"'),widget+' installs its own scoped adoption map');
}
console.log('PASS: seven module adoption maps are installed; standalone widget assets match the canonical motion, styles and explicit quantity registry. Browser checks verify behavior separately.');

for(const widget of [...widgets,'lot-sales-explorer','proforma-manager','forecast-manager']){const folder='widgets/'+widget+'/src/app/';assert.equal(fs.readFileSync(folder+'number-edit-commit.js','utf8'),fs.readFileSync('shared/number-edit-commit.js','utf8'));assert.ok(fs.readFileSync(folder+'widget.html','utf8').includes('number-edit-commit.js'));}
