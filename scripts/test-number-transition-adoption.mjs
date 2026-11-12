import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
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

// Exercise the real adoption collector and token matcher: both destination
// quantities must be registered even when Property has a different noun prefix.
{
 const messages=new Map([
  ['.si-pair-context>p:last-child',{textContent:'Residential / L&B Res · 3 Lots + 3 New Properties'}],
  ['#siPairOutcome',{textContent:'3 Lots And 3 Properties Created'}],
  ['#piFootMeta',{textContent:'6 Of 6 Records Saved'}]
 ]),registered=[];
 let collect;
 const sandbox=vm.createContext({window:{LMNumbers:{start(options){collect=options.collect;}}},document:{getElementById(){return {dataset:{importKey:'import-1'}};},querySelector(){return null;}}});
 vm.runInContext(fs.readFileSync('shared/number-surfaces.js','utf8'),sandbox);
 sandbox.window.LMNumberSurfaces.install('land-master',{state:()=>({scope:'subs'})});
 collect({key:(...parts)=>JSON.stringify(parts),identity:()=>'',id(){},readonly(){},each(selector,callback){if(messages.has(selector))callback(messages.get(selector),0);},text(node,key,mode){registered.push({text:node.textContent,key,mode});}});
 assert.equal(registered.length,3);
 const runtime=fs.readFileSync('shared/number-transitions.js','utf8');
 vm.runInContext(runtime.slice(runtime.indexOf('  const pattern='),runtime.indexOf('  function decorate(')),sandbox);
 for(const message of registered){
  sandbox.message=message;
  assert.equal(vm.runInContext('matches(message.text,message.mode).length',sandbox),2,'both Lot and Property quantities use the real token matcher');
 }
 assert.equal(new Set(registered.map(message=>JSON.stringify(message.key))).size,3,'review, outcome and saved-record quantities retain distinct keys');
 console.log('PASS: paired import animates both Lots and New Properties/Properties through the real scoped collector and numeric matcher.');
}

for(const widget of [...widgets,'lot-sales-explorer','proforma-manager','forecast-manager']){const folder='widgets/'+widget+'/src/app/';assert.equal(fs.readFileSync(folder+'number-edit-commit.js','utf8'),fs.readFileSync('shared/number-edit-commit.js','utf8'));assert.ok(fs.readFileSync(folder+'widget.html','utf8').includes('number-edit-commit.js'));}
