import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync('widgets/budget-manager/src/app/po-ui.js','utf8');
const body=source.slice(source.indexOf('    function patchContext()'),source.indexOf('    function approverCount()'));
function fixture(){
  const requests=[],node={innerHTML:''};let timer;
  const c=vm.createContext({Object,progress:false,previewTimer:null,previewGeneration:0,generation:1,
    clearTimeout(){},setTimeout(fn){timer=fn;return 1;},current:()=>true,readOnly:()=>false,canCompose:()=>true,canAmend:()=>false,
    card:{querySelector:()=>node},money:value=>value,patchApprovers(){},
    allocationRows:()=>[{budgetItemId:'71',available:0n,shortfall:600000n,remaining:-600000n,pending:0n,verified:true},{budgetItemId:'72',available:2000000n,shortfall:0n,remaining:1500000n,pending:0n,verified:true}],
    call:async request=>{requests.push(JSON.parse(JSON.stringify(request)));return {contract:'po-v1',success:true,approvalPreview:{roles:(Number(request.netBudgetChange)>=10000?['VP','CFO','COO']:['VP','CFO']).map((role,index)=>({role,order:index+1}))}};}});
  c.root=c;vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/po-domain.js','utf8'),c);
  // Mixed native and legacy balance DTOs must contribute once per cost code.
  c.LMPO.elementAllocations=()=>[{budgetItemId:'71',elements:[]},{budgetItemId:'72',elements:[{costElement:'4',shortfall:500000n}]}];
  c.model={amount:'50000.00',balanceState:'loaded',lines:[{budgetItemId:'71',costElement:'4'},{budgetItemId:'72',costElement:'4'}],balances:[{budgetItemId:'71',componentBaselineAvailable:false},{budgetItemId:'72',componentBaselineAvailable:true}]};
  vm.runInContext(body,c);return {c,requests,flush:async()=>{const fn=timer;timer=null;if(fn)await fn();},node};
}
let f=fixture();f.c.patchContext();await f.flush();assert.equal(f.requests[0].netBudgetChange,'11000.00');assert.equal(f.c.model.previewState,'loaded');assert.deepEqual(Array.from(f.c.model.previewRoles,row=>row.role),['VP','CFO','COO']);
f=fixture();f.c.model.reallocation={};f.c.model.reallocationPlan={available:true,gross:'30000.00',net:'9999.00'};f.c.patchContext();await f.flush();assert.equal(f.requests[0].netBudgetChange,'9999.00');assert.deepEqual(Array.from(f.c.model.previewRoles,row=>row.role),['VP','CFO']);
f.c.model.reallocationPlan.net='10000.00';f.c.patchContext();await f.flush();assert.equal(f.requests.length,2,'Changing only the net invalidates the approval preview');assert.equal(f.requests[1].netBudgetChange,'10000.00');assert.deepEqual(Array.from(f.c.model.previewRoles,row=>row.role),['VP','CFO','COO']);
for(const net of ['0.00','-15000.00']){f.c.model.reallocationPlan.net=net;f.c.patchContext();await f.flush();assert.equal(f.requests.at(-1).netBudgetChange,net);assert.deepEqual(Array.from(f.c.model.previewRoles,row=>row.role),['VP','CFO']);}
f=fixture();f.c.call=async()=>({contract:'po-v1',success:true,approvalPreview:{roles:[{role:'CFO',order:1}]}});f.c.patchContext();await f.flush();assert.equal(f.c.model.previewState,'unavailable','An old backend route cannot be presented as a verified new-rule preview');
console.log('PO net preview: mixed cost-code/element totals, signed zero/decreases, inclusive COO threshold, net-only cache invalidation and old-route rejection passed.');
