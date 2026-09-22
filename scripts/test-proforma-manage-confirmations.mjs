import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('widgets/proforma-manager/src/app/widget.html','utf8');
function extract(name){
  const start=source.indexOf('function '+name+'(');
  assert.ok(start>=0,name+' exists');
  const end=source.indexOf('\nfunction ',start+1);
  return source.slice(start,end<0?undefined:end);
}
const code=['setProFormaArchived','showLoiDeleteBlocked','deleteProForma'].map(extract).join('\n');
const events=[];
let loi=null,confirmed=false,readError=false;
const ctx={
  S:{proformas:[{ID:'42',Name:'Corsicana Trails (ORIGINAL)'}],myAccessId:'7',detail:{},loiByPf:{}},
  perms:()=>({deleteArchive:true}),
  fetchLoiWorksheetRow:()=>readError?Promise.reject(new Error('read failed')):Promise.resolve(loi),
  uiConfirm:opts=>{events.push({kind:'modal',opts});return Promise.resolve(confirmed);},
  invokeSaveApiOp:payload=>{events.push({kind:'save',payload});return Promise.resolve({success:true});},
  loadProformas:()=>Promise.resolve(),
  overlay:()=>{},auditLog:()=>{},errMeta:err=>({message:err.message}),toast:(message)=>events.push({kind:'toast',message}),
  buildFilters:()=>{},renderList:()=>{}
};
vm.runInNewContext(code,ctx);
const settle=()=>new Promise(resolve=>setImmediate(resolve));

ctx.setProFormaArchived('42',true);
await settle();
assert.match(events[0].opts.message,/Corsicana Trails \(ORIGINAL\)/,'archive modal identifies the Pro Forma');
events.length=0;

ctx.deleteProForma('42');
await settle();
assert.match(events[0].opts.message,/Corsicana Trails \(ORIGINAL\)/,'delete modal identifies the Pro Forma');
assert.match(events[0].opts.message,/comments/,'delete disclosure includes child comments');
assert.equal(events.some(e=>e.kind==='save'),false,'cancel does not delete');
events.length=0;

loi={ID:'99'};
ctx.deleteProForma('42');
await settle();
assert.match(events[0].opts.title,/can't be deleted/,'an LOI shows a distinct blocked-delete modal');
assert.equal(events[0].opts.okLabel,'Archive instead');
assert.equal(events.some(e=>e.kind==='save'),false,'LOI pre-check blocks delete');
events.length=0;

confirmed=true;
ctx.deleteProForma('42');
await settle();
assert.equal(events.filter(e=>e.kind==='modal').length,1,'archive choice needs no second confirmation');
assert.equal(events.find(e=>e.kind==='save')?.payload.op,'archive_proforma');
events.length=0;

readError=true;
ctx.deleteProForma('42');
await settle();
assert.equal(events.some(e=>e.kind==='save'),false,'unknown LOI state cannot proceed to delete');
assert.ok(events.some(e=>e.kind==='toast'&&e.message.includes('Could not check')));

const backend=fs.readFileSync('creator/functions/proforma_save.dg','utf8');
const protectedAt=backend.indexOf('LOI_DELETE_BLOCKED'),commentsAt=backend.indexOf('deleteStage = "proforma_comments"'),parentAt=backend.indexOf('deleteStage = "parent_proforma"');
assert.ok(protectedAt>=0&&protectedAt<commentsAt&&commentsAt<parentAt,'LOI protection precedes scoped comment cleanup and parent deletion');
assert.match(backend,/Comment_Log\[Pro_Forma == pfKey\]/,'only the selected Pro Forma\'s comments are deleted');
assert.match(backend,/deleted\.put\("Comment_Log",deleteIds\.size\(\)\)/,'deleted child count includes comments');
console.log('Pro Forma delete/archive confirmation, LOI block, and comment cleanup checks passed.');
