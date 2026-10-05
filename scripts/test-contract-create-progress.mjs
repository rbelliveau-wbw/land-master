import assert from 'node:assert/strict';
import {ready,drain,deferred,SUB,ACCESS,NEW} from './test-contract-sdk-v2-foundation.mjs';

function draft(h){
 h.c.S.nc={type:'DA',project:'',parent:'',sub:[SUB],wbw:[],builder:'',name:'Compact create fixture',territory:'Austin',status:'Proposed',acts:[],seedSource:'default',owners:[ACCESS],lotIds:[],ppf:{},totalLots:'',emPerLot:'',initLots:'',initDays:'',contLots:'',contDays:''};
 return h.c.S.nc;
}
const writes=h=>h.calls.filter(call=>['add','update','delete'].includes(call.method));

{
 const h=await ready({realDOM:true}),send=deferred(),refresh=deferred(),nativeAdd=h.api.addRecords,nativeRefresh=h.c.ncRefresh;
 draft(h);h.c.matchMedia=()=>({matches:false});
 const trigger=h.c.document.createElement('button');h.c.document.body.appendChild(trigger);trigger.focus();
 h.api.addRecords=config=>send.promise.then(()=>nativeAdd(config));h.c.ncRefresh=run=>refresh.promise.then(()=>nativeRefresh(run));
 const resultPromise=h.c.ncSubmit([],[]),dialog=h.node('contractSaveDialog'),message=h.node('contractSaveMessage');
 assert.equal(h.node('contractSaveOverlay').hidden,false,'dialog opens before the write');
 assert.equal(dialog.getAttribute('aria-describedby'),'contractSaveMessage');assert.equal(dialog.getAttribute('role'),'dialog');assert.equal(h.c.document.activeElement,dialog);assert.ok(h.c.document.body.children.filter(node=>node.id!=='contractSaveOverlay').every(node=>node.inert),'the complete background is inert');
 assert.equal(h.node('contractSaveContext').hidden,true);assert.equal(h.node('contractSaveCount').hidden,true);assert.equal(h.node('contractSaveResults').hidden,true);assert.equal(h.node('contractSaveResults').children.length,0);
 assert.ok([0,1,2].every(i=>h.node('contractSaveStage'+i).hidden));assert.equal(h.node('contractSaveStatus').hidden,true);assert.equal(message.getAttribute('aria-live'),'polite');assert.equal(h.node('contractSaveFooter').hidden,true);assert.equal(h.node('contractSaveX').hidden,true);assert.equal(h.c.ContractSetupUI.close(),false);assert.equal(await h.c.ncSubmit([],[]),false);
 await drain();assert.equal(message.textContent,'Saving contract…');assert.equal(h.node('contractSaveBar').getAttribute('aria-valuenow'),'0');
 send.resolve();await drain();assert.equal(h.c.S.contractWorkflow.entries.filter(row=>row.state==='verified').length,2);assert.equal(message.textContent,'Checking saved contract…');assert.ok(Number(h.node('contractSaveBar').getAttribute('aria-valuenow'))<100,'the final fresh verification must finish before 100%');assert.equal(h.c.ContractSetupUI.close(),false);
 refresh.resolve();await drain();assert.equal(h.c.ContractSetupUI.progress().displayDone,false,'display settlement retains the close lock');h.tick(560);
 const result=await resultPromise;assert.equal(result.kind,'create');assert.equal(result.error,null);assert.equal(result.rows.length,2);assert.equal(writes(h).length,2);assert.equal(h.node('contractSaveDialog'),dialog);assert.equal(h.node('contractSaveMessage'),message);assert.equal(dialog.htmlWrites,0,'updates patch mounted nodes');
 assert.equal(h.node('contractSaveTitle').textContent,'Contract created');assert.equal(message.textContent,'Saved and ready.');assert.equal(h.node('contractSaveBar').getAttribute('aria-valuenow'),'100');assert.equal(h.node('contractSaveClose').textContent,'Done');assert.equal(h.node('contractSaveRecheck').hidden,true);assert.equal(h.node('contractSaveOverlay').hidden,false,'verified success remains visible until dismissed');assert.equal(h.c.ContractSetupUI.close(),true);assert.equal(h.c.document.activeElement,trigger);assert.equal(h.node('view').inert,false);
}

{
 const h=await ready({realDOM:true}),native=h.api.addRecords;draft(h);
 h.api.addRecords=async config=>{const result=await native(config);return config.form_name==='Contract_Actions'?{code:3000,data:{ID:result.result[0].data.ID},details:{code:2899}}:result;};
 const result=await h.c.ncSubmit([{title:'Saved action',sort:1},{title:'Unsent action',sort:2}],[]),run=h.c.S.contractWorkflow,sendCount=writes(h).length;
 assert.ok(result.error);assert.equal(run.cid,NEW);assert.equal(result.rows[0].state,'verified');assert.equal(result.rows[1].state,'unknown');assert.equal(result.rows[2].state,'not-sent');assert.equal(h.node('contractSaveTitle').textContent,'Contract created');assert.equal(h.node('contractSaveMessage').textContent,'Setup needs review.');assert.equal(h.node('contractSaveRecheck').textContent,'Check status');assert.equal(h.node('contractSaveResults').children.length,0);
 const check=deferred(),nativeCheck=h.c.contractWorkflowRecheck;h.c.contractWorkflowRecheck=run=>check.promise.then(()=>nativeCheck(run));
 await h.node('contractSaveRecheck').fire('click');await drain();assert.equal(h.node('contractSaveMessage').textContent,'Checking saved contract…');assert.equal(h.node('contractSaveRecheck').disabled,true);assert.equal(h.node('contractSaveClose').disabled,true);assert.equal(h.c.ContractSetupUI.close(),false);
 check.resolve();await drain();assert.equal(writes(h).length,sendCount,'Check status never replays the create or sends an unfinished child');assert.equal(run.entries[1].state,'verified');assert.equal(run.entries[2].state,'not-sent');assert.equal(h.node('contractSaveMessage').textContent,'Setup needs review.');assert.equal(h.node('contractSaveTitle').textContent,'Contract created');assert.ok(Number(h.node('contractSaveBar').getAttribute('aria-valuenow'))<100);assert.equal(h.node('contractSaveClose').disabled,false);assert.equal(h.node('contractSaveRecheck').hidden,true);
}

{
 const h=await ready({realDOM:true});draft(h);h.api.addRecords=async()=>({code:3000});
 await h.c.ncSubmit([],[]);assert.equal(h.node('contractSaveTitle').textContent,'Contract needs review');assert.match(h.node('contractSaveMessage').textContent,/may have been saved/);assert.equal(h.node('contractSaveBar').getAttribute('aria-valuenow'),'0');
}

{
 const h=await ready({realDOM:true});
 const ledger={id:'pricing-fixture',kind:'pricing',report:'Change captured Lots and Pricing',stage:'sending',finished:false,error:null,rows:[{id:'pricing-0',state:'verified',phase:'verified',payload:{Base_Price:100}}]};
 h.c.ContractSetupUI.open(ledger);assert.equal(h.node('contractSaveContext').hidden,false);assert.equal(h.node('contractSaveCount').hidden,false);assert.equal(h.node('contractSaveStage0').hidden,false);assert.equal(h.node('contractSaveResults').hidden,false);assert.equal(h.node('contractSaveResults').children.length,1);assert.equal(h.node('contractSaveResults').textContent.includes('Base_Price'),true,'batch editing retains detailed verified destination results');
}

console.log('PASS compact actual Contract creation: one plain status, no technical destination/field copy, truthful final verification, stable mounted nodes, retained terminal result, focus/close/duplicate guards, partial created outcome, read-only recheck and unchanged batch detail.');
