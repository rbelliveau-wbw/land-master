import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// Presentation switches must retain the actual mounted date editor and model.
const nodes=new Map(),tabs=['timeline','editor'].map(name=>({dataset:{scheduleView:name},setAttribute(key,value){this[key]=value;}}));
const node=id=>{if(!nodes.has(id))nodes.set(id,{id,dataset:{},hidden:false,firstElementChild:{style:{}},scrollWidth:4321,setAttribute(key,value){this[key]=value;}});return nodes.get(id);};
const document={getElementById:node,querySelectorAll:()=>tabs};
const context=vm.createContext({document,requestAnimationFrame:fn=>fn(),console,Date,Intl,Map,Set,Object,String,Number,Math});context.window=context;
vm.runInContext(fs.readFileSync('widgets/crew-locations/src/app/crew-model.js','utf8'),context);
vm.runInContext(fs.readFileSync('widgets/crew-locations/src/app/crew-app.js','utf8'),context);
const app=context.CrewApp,state=app.state,filters=state.filters,editor=node('schedule'),timeline=node('timeline');node('app').dataset.workspace='schedule';
const dateInput={value:'11/02/2026'};editor.dateInput=dateInput;state.operation={unknown:true,operationId:'retained-request'};
app.scheduleView('editor');assert.equal(editor.hidden,false);assert.equal(timeline.hidden,true);assert.equal(tabs[1]['aria-selected'],'true');assert.equal(node('tableTopScroll').firstElementChild.style.width,'4321px');
app.scheduleView('timeline');assert.equal(editor.hidden,true);assert.equal(timeline.hidden,false);assert.equal(tabs[0]['aria-selected'],'true');assert.equal(editor.dateInput,dateInput);assert.equal(editor.dateInput.value,'11/02/2026');assert.equal(state.filters,filters);assert.equal(state.operation.operationId,'retained-request');
app.scheduleView('invalid');assert.equal(node('app').dataset.scheduleView,'timeline');
node('app').dataset.workspace='employees';app.scheduleView('editor');assert.equal(editor['aria-hidden'],'true');assert.equal(timeline['aria-hidden'],'true');
console.log('PASS: compact schedule switches keep the mounted editor, source values, filters, unknown-save state and real horizontal width; inaccessible workspaces retain ARIA state.');
