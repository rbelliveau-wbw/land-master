import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the actual candidate's queries and condition against small record sets.
// This fixture does not compile Deluge or establish that the live workflow matches.
const workflow=fs.readFileSync(new URL('../creator/workflows/Set_Contract_Approved_Con.dg',import.meta.url),'utf8');
const fixtureSource=workflow.replace(/\/\/[^\n]*/g,'').replace(/\b(Contract_Approvals|Contract)\[([^\]]+)\]/g,(_,form,criteria)=>{
 const expression=criteria.replace(/\b(ID|Contract1|Status)\b/g,'row.$1').replace(/input\.row\./g,'input.');
 return 'query('+JSON.stringify(form)+',row=>('+expression+'))';
});
const ID='4410926000005039484',OTHER='4410926000005039485';

function run(status,states,otherStates=[],hasParent=true){
 const parent=hasParent?{ID,Status:status}:null,other={ID:OTHER,Status:'Proposed'};
 const approvals=[...states.map(Status=>({Contract1:ID,Status})),...otherStates.map(Status=>({Contract1:OTHER,Status}))],before=structuredClone(approvals);
 const context={input:{Contract1:hasParent?ID:null},ifnull:(value,fallback)=>value==null?fallback:value,
  query(form,predicate){const rows=(form==='Contract'?[parent,other].filter(Boolean):approvals).filter(predicate);return form==='Contract'?(rows[0]||{ID:null,Status:null}):{count:()=>rows.length};}};
 vm.runInNewContext(fixtureSource,context,{filename:'Set_Contract_Approved_Con.fixture.js'});
 assert.deepEqual(approvals,before,'the parent workflow never edits approval rows');assert.equal(other.Status,'Proposed','another contract is unchanged');
 return parent?.Status;
}

for(const states of [[],['Not Sent'],['Approved'],['Not Sent','Approved'],['Awaiting Approval'],['Rejected']]){
 assert.equal(run('Proposed',states),'Proposed','approval creation/response cannot remove a Proposed parent from Review');
}
for(const status of ['New','Awaiting Approvals','Approved','Feasibility',null]){
 for(const states of [[],['Not Sent'],['Approved'],['Not Sent','Approved']])assert.equal(run(status,states,['Awaiting Approval','Rejected']),'Approved','the existing non-Proposed auto-approval predicate is preserved and scoped to its parent');
 for(const state of ['Awaiting Approval','Rejected',''])assert.equal(run(status,[state]),status,'a blocking approval preserves the existing parent status');
}
assert.equal(run('Proposed',[],[],false),undefined,'a parentless approval template does not write a Contract');
console.log('PASS actual Contract approval workflow candidate: Proposed parent stays in Review; existing non-Proposed completion predicate, exact parent scope, approval rows and parentless templates are preserved. Native Deluge compilation/deployment remains unverified.');
