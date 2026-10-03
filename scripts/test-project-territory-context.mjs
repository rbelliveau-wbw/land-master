import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createTaxTestDOM} from './fixtures/tax-test-dom.mjs';
const html=fs.readFileSync('widgets/land-master/src/app/widget.html','utf8');
const moduleSource=fs.readFileSync('widgets/land-master/src/app/project-territory.js','utf8');
const clone=value=>JSON.parse(JSON.stringify(value));
function extract(name){const start=html.indexOf('function '+name+'('),brace=html.indexOf('{',start);assert.ok(start>=0);let depth=0;for(let i=brace;i<html.length;i++){if(html[i]==='{')depth++;if(html[i]==='}')depth--;if(!depth)return html.slice(start,i+1);}throw Error(name);}
function held(){let resolve;const promise=new Promise(yes=>{resolve=yes;});return{promise,resolve};}
async function drain(){for(let i=0;i<10;i++)await new Promise(resolve=>setImmediate(resolve));}
const choices=['Waco','Temple/Belton'];
function harness(options={}){
 const {document,node}=createTaxTestDOM(html),calls=[],writes=[],rendered=[];let generation=1,actor={environment:'DEV',user:'fixture',appLinkName:'LandMaster'},exactReads=0;
 const originalCreate=document.createElement;document.createElement=tag=>{const el=originalCreate(tag);el.remove=()=>el.parentNode.removeChild(el);return el;};
 const projects=[{ID:'1',Project_Name:'One',Territory:''},{ID:'2',Project_Name:'Two',Territory:''}],subs=[{ID:'11',Project:{ID:'1'},Territory:'Waco'},{ID:'21',Project:{ID:'2'},Territory:'Waco'}];
 const S={liveSDK:true,demo:false,choicesSource:'live',projects:clone(projects),panelLoading:false,panelDirty:false,panelSaving:false,bulkSaving:false,tableWrites:0,coreRefreshing:false,navigationToken:0};
 let nativeReads=0;
 const c=vm.createContext({document,console,Set,Promise,JSON,Date,Error,setTimeout,clearTimeout,matchMedia:()=>({matches:true}),S,OPTS:{territory:choices},LMRuntime:{current:()=>clone(actor)},LandData:{coreReady:()=>true,generation:()=>generation},$:node,hasTableDrafts:()=>false,setStatus(){},showToast(){},findIn:(rows,id)=>rows.find(row=>String(row.ID)===id),renderTable:()=>rendered.push('render'),auditOnly(){},loadLocationChoices:async()=>{calls.push('choices');if(options.choices)await options.choices();},
  sdkGetAll:async(report,criteria)=>{nativeReads++;calls.push({report,criteria});const match=String(criteria||'').match(/\(ID == (\d+)\)/);if(match){exactReads++;if(options.project)await options.project(match[1],exactReads);return clone(projects.filter(row=>row.ID===match[1]));}if(criteria){if(options.subdivisions)await options.subdivisions();const parent=criteria.match(/\(Project == (\d+)\)/)[1];return clone(subs.filter(row=>row.Project.ID===parent));}if(options.snapshot&&report==='All_Projects')await options.snapshot();return clone(report==='All_Projects'?projects:subs);},
  updateRecord:async(id,data,report)=>{writes.push({id,data:clone(data),report});if(options.write)await options.write(id);Object.assign(projects.find(row=>row.ID===id),data);if(options.lost)throw Error('Applied reply lost');return{code:3000,data:{ID:id}};}
 });c.window=c;
 vm.runInContext(moduleSource,c);
 for(const name of ['projectTerritoryActive','allowTableEdit','withDiscardConfirm','startEditorRequest','loadData'])vm.runInContext(extract(name),c);
 const wiring=html.slice(html.indexOf('var projectTerritoryMigration='),html.indexOf('var lotImport='));vm.runInContext(wiring,c);
 const flow=c.projectTerritoryMigration;
 const dialog=()=>document.querySelector('.pt-overlay');
 const apply=()=>dialog().querySelector('[data-pt-apply]').onclick();
 const close=()=>dialog().querySelector('[data-pt-close]').onclick();
 function assertLocks(){const reads=nativeReads;assert.equal(flow.active(),true);assert.equal(c.allowTableEdit(),false);let edited=false;assert.equal(c.withDiscardConfirm('fixture',()=>{edited=true;}),false);assert.equal(edited,false);return Promise.all([assert.rejects(c.loadData(),/migration/),c.startEditorRequest('project','1',false).then(value=>assert.equal(value,false))]).then(()=>{assert.equal(nativeReads,reads);assert.equal(S.navigationToken,0);});}
 return {c,S,flow,projects,subs,calls,writes,rendered,open:flow.open,apply,close,dialog,assertLocks,change(kind){if(kind==='generation')generation++;else actor={...actor,user:kind==='actor'?'new-fixture':actor.user,environment:kind==='environment'?'PROD':actor.environment};}};
}
// Complete mount handlers and actual widget wiring: stale previews never authorize Apply.
for(const kind of ['actor','environment','generation']){
 const pause=held(),h=harness({snapshot:()=>pause.promise});const opening=h.open();await drain();await h.assertLocks();h.change(kind);pause.resolve();await opening;assert.equal(h.writes.length,0);assert.equal(h.dialog().querySelector('[data-pt-apply]').disabled,true);assert.match(h.dialog().querySelector('[data-pt-message]').textContent,/context changed/);h.close();assert.equal(h.flow.active(),false);assert.equal(h.c.allowTableEdit(),true);
}
for(const kind of ['actor','generation']){
 const h=harness();await h.open();await h.assertLocks();h.change(kind);await h.apply();assert.equal(h.writes.length,0);assert.equal(h.rendered.length,0);assert.match(h.dialog().querySelector('[data-pt-id="1"] [data-pt-status]').textContent,/Needs review/);assert.equal(h.dialog().querySelector('[data-pt-id="2"] [data-pt-status]').textContent,'Ready');await h.assertLocks();h.close();
}
// A context change after each awaited preflight/write/readback stops later targets.
for(const phase of ['choices','project','subdivisions','write','readback'])for(const kind of ['actor','generation']){
 const pause=held();let stalled=true;
 const options={};if(phase==='choices')options.choices=()=>pause.promise;
 if(phase==='project'||phase==='readback')options.project=(id,read)=>id==='1'&&stalled&&read===(phase==='project'?1:2)?pause.promise:undefined;
 if(phase==='subdivisions')options.subdivisions=()=>stalled?pause.promise:undefined;
 if(phase==='write')options.write=()=>stalled?pause.promise:undefined;
 const h=harness(options);let running;
 if(phase==='choices'){running=h.open();await drain();}else{await h.open();running=h.apply();await drain();}
 await h.assertLocks();assert.equal(h.flow.busy(),true);assert.equal(h.dialog().querySelector('[data-pt-close]').disabled,true);h.change(kind);stalled=false;pause.resolve();await running;
 assert.equal(h.writes.length,phase==='write'||phase==='readback'?1:0);assert.equal(h.writes.some(row=>row.id==='2'),false);assert.equal(h.S.projects[0].Territory,'');assert.equal(h.rendered.length,0);assert.equal(h.flow.busy(),false);await h.assertLocks();h.close();
}
// Stable context preserves original fill-only behavior, including lost-ack exact readback.
for(const lost of [false,true]){
 const h=harness({lost});await h.open();await h.apply();assert.equal(h.writes.length,2);assert.deepEqual(h.writes.map(row=>row.report),['All_Projects','All_Projects']);assert.ok(h.writes.every(row=>Object.keys(row.data).join()==='Territory'));assert.deepEqual(h.S.projects.map(row=>row.Territory),['Waco','Waco']);assert.equal(h.rendered.length,1);assert.equal(h.dialog().querySelector('[data-pt-id="1"] [data-pt-status]').textContent,'Verified');h.close();assert.equal(h.c.allowTableEdit(),true);let opened=false;assert.equal(h.c.withDiscardConfirm('fixture',()=>{opened=true;}),true);assert.equal(opened,true);
}
// Existing pending editor reads cannot start a competing migration preview.
{
 const h=harness();h.S.panelLoading=true;await h.open();assert.equal(h.dialog(),null);assert.equal(h.calls.length,0);
}
// Reopening after a safe terminal dismissal gets a fresh capture. A previously
// applied first target stays preserved; only the still-blank second target writes.
{
 const pause=held();let stalled=true;const h=harness({write:id=>id==='1'&&stalled?pause.promise:undefined});await h.open();const first=h.apply();await drain();h.change('generation');stalled=false;pause.resolve();await first;assert.equal(h.writes.length,1);assert.equal(h.S.projects[0].Territory,'');h.close();await h.open();await h.apply();assert.deepEqual(h.writes.map(row=>row.id),['1','2']);assert.equal(h.S.projects[1].Territory,'Waco');h.close();
}
console.log('PASS PRIVATE actual Territory mount/Apply handlers and widget guards: actor/environment/generation changes across snapshot/preflight/write/readback stop later writes and stale publication; active preview/run/result blocks refresh/edit; stable fill-only/lost-ack behavior preserved. No native writes.');
