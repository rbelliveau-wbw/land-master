import fs from 'node:fs';import vm from 'node:vm';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {source,ready,ID,ACCESS,clone} from './fixtures/proforma-sdk-v2-harness.mjs';
import './test-proforma-settings-routing.mjs';
function fn(text,name){text=text.replace(/\r\n/g,'\n');const start=text.indexOf('function '+name+'(');assert.ok(start>=0,name);const line=text.slice(start,text.indexOf('\n',start));try{new vm.Script(line);return line;}catch{}const end=text.indexOf('\n}',start)+2,block=text.slice(start,end);new vm.Script(block);return block;}
const baseline=JSON.parse(fs.readFileSync(new URL('./fixtures/proforma-sdk-v1-business-baseline.json',import.meta.url),'utf8'));
// These three option loaders now stage their complete results for atomic lazy
// publication. test-proforma-lazy-startup exercises that intentional change.
const stagedLoaders=new Set(['loadCompanies','loadProperties','loadBuilders']);
for(const [name,expected]of Object.entries(baseline.functions))if(!stagedLoaders.has(name)){
 let actual=fn(source,name);
 // Authorized currency fix: keep construction base cents. The full save test
 // verifies the new result; normalize only this expression for the old guard.
 if(name==='buildHeaderData')actual=actual.replace('d.Construction_Cost_Base=round2(T.Construction_Cost_Base);','d.Construction_Cost_Base=round0(T.Construction_Cost_Base);');
 // Authorized Settings routing: missing approval-row reads must not make a
 // Pending Approval parent or retained note/date history look like a new draft.
 // Normalize only that added history guard and its lifecycle declaration order
 // for the frozen SDK migration baseline. The actual-function behavior above
 // is covered by test-proforma-settings-routing; all other clauses stay hashed.
 if(name==='proformaApprovalState'){
  const added=[
   '  var lifecycle=approvalText(pfOrId&&typeof pfOrId==="object"&&pfOrId.Status).toLowerCase();',
   '  var started=lifecycle==="pending approval"||statuses.some(function(s){return s&&s!=="not sent";})||rows.some(function(row){return !!approvalText(row.Sent_Date)||!!approvalText(row.Responded_Date)||!!approvalNote(row);});',
   '  var pending=statuses.some(function(s){return s==="pending";});'
  ].join('\n');
  const original=[
   '  var started=statuses.some(function(s){return s&&s!=="not sent";});',
   '  var pending=statuses.some(function(s){return s==="pending";});',
   '  var lifecycle=approvalText(pfOrId&&typeof pfOrId==="object"&&pfOrId.Status).toLowerCase();'
  ].join('\n');
  assert.ok(actual.includes(added),'Settings routing history guard must match its reviewed change');
  actual=actual.replace(added,original);
 }
 assert.equal(crypto.createHash('sha256').update(actual).digest('hex'),expected,name+' unrelated business/label behavior must remain the original65 function');
}
{
 const h=await ready();assert.equal(h.widget.S.proformas[0].Name,'Fixture Pro Forma 0');assert.deepEqual(clone(h.widget.pfOwnerIds(h.widget.S.proformas[0])),[ACCESS]);const row=h.document.querySelector('tr[data-pf-id="'+ID+'"]')||h.document.getElementById('listBody');assert.ok(row);assert.match(row.textContent,/Fixture Pro Forma 0/);assert.match(row.textContent,/Fixture Owner|fixture/);
}
console.log('PASS PF SDK2 preserved financial/phase/payload/send-permission and author/label functions, narrowly authorized Settings history guard, actual loaded list name+owner rendering.');
