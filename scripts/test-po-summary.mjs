import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('widgets/budget-manager/src/app/po-ui.js','utf8');
const start=source.indexOf('    function summaryReallocation()');
const end=source.indexOf('    function patchBalances()',start);
const context=vm.createContext({});
vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/po-domain.js','utf8'),context);
context.root=context;
context.model={lines:[{budgetItemId:'9007199254740993',costElement:'5',finalAmount:'10.01'},{budgetItemId:'9007199254740993',costElement:'5',finalAmount:'2.02'},{budgetItemId:'9007199254740993',costElement:'1',finalAmount:'3.03'},{budgetItemId:'2',costElement:'5',finalAmount:'1.00'}],reservedLines:[{budgetItemId:'9007199254740993',finalAmount:'10.01'}],balances:[{budgetItemId:'9007199254740993',finalCents:'10000',modCents:'501',availableCents:'5000',pendingModificationCents:'0'}]};
context.options={items:()=>[{ID:'9007199254740993',Item_Name:'Survey',Budget_Code:'SH01-3225'}]};
context.lineCode=line=>'C_SH01-3225-'+line.costElement;
context.allocationRows=()=>context.LMPO.allocations(context.model.lines,context.model.balances,context.model.reservedLines);
vm.runInContext(source.slice(start,end),context);
const rows=context.summaryRows();
const survey=rows.find(row=>row.budgetItemId==='9007199254740993');
const unavailable=rows.find(row=>row.budgetItemId==='2');
assert.equal(rows.length,2,'Each Budget Item has one parent even when several elements and duplicate lines are touched');
assert.equal(rows.filter(row=>row.budgetItemId==='9007199254740993').length,1,'Large string record identity is preserved');
assert.equal(survey.modified,10501n);
assert.equal(survey.allocation.available,6001n,'Own reservation restored once');
assert.equal(survey.allocation.allocated,1506n,'All elements share their item allocation');
assert.equal(survey.allocation.remaining,4495n);
assert.equal(unavailable.allocation.verified,false,'Missing balance remains unavailable');
console.log('PO Summary: grouped item parents, duplicate/multiple elements, exact cents, own reservations and missing balances passed.');

// The user's Valley Gutter example: a $33,320 PO moves funding from Labor
// and Materials into Subcontractor, with a $249 net budget reduction.
vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/po-reallocation.js','utf8'),context);
const id='90071992547409931',contract='po-reallocation-v1';
const native={budgetItemId:id,reallocationContract:contract,componentBaselineAvailable:true,issuedComponentsAllocated:true,unallocatedIssuedCents:'0',unallocatedModificationCents:'0',unallocatedModificationCount:0,finalCents:'3356900',modCents:'0',issuedCents:'0',availableCents:'3356900',pendingModificationCents:'0',subdivisionCode:'WP02',minorCode:'3242',componentBalances:['1399100','1957800','0','0','0'].map((finalCents,i)=>({costElement:String(i+1),finalCents,modCents:'0',issuedCents:'0',availableCents:finalCents,pendingModificationCents:'0',pendingReductionCents:'0'}))};
context.model={id:'90071992547409932',revision:'draft',budgetId:'90071992547409930',status:'Draft',approvalState:'Not Configured',balanceState:'loaded',reallocationContract:contract,amount:'33320.00',reservedLines:[],balances:[native],lines:[{key:'subcontractor',budgetItemId:id,costElement:'4',finalAmount:'33320.00'}],reallocation:null};
context.options={items:()=>[{ID:id,Item_Name:'Valley Gutter',Budget_Code:'WP02-3242'}],canCreate:()=>true,canEdit:()=>true};
context.lineCode=()=> 'C_WP02-3242-4';context.allocationRows=()=>context.LMPO.allocations(context.model.lines,context.model.balances,context.model.reservedLines);
context.esc=value=>String(value??'');context.chevron='';
function helper(name){const start=source.indexOf('    function '+name+'(');assert.ok(start>=0,name);const end=source.indexOf('\n    function ',start+1);return source.slice(start,end);}
vm.runInContext(helper('money'),context);
const opts=()=>({lines:context.model.lines,balances:context.model.balances,reservedLines:context.model.reservedLines,signedPending:true,reallocation:context.model.reallocation});
const plan=()=>context.model.reallocationPlan=context.LMPOReallocation.plan(opts());
const render=()=>context.elementSummaryHtml(context.summaryRows());
plan();assert.equal(context.summaryRows()[0].allocation.modification,3332000n);assert.equal(context.summaryRows()[0].allocation.remaining,3356900n,'Automatic defaults are projected without opting into a custom payload');assert.equal(context.model.reallocation,null);
context.model.reallocation=context.LMPOReallocation.defaults(opts());const reviewed=context.model.reallocation.items[0];reviewed.components['1']='-13991.00';reviewed.components['2']='-19578.00';reviewed.reason='Move this cost code to subcontractor';plan();
const beforeNative=JSON.stringify(native),beforeLines=JSON.stringify(context.model.lines);
let projected=context.summaryRows()[0].allocation;assert.equal(projected.modification,-24900n);assert.equal(projected.remaining,0n);assert.equal(projected.available,3356900n,'The Available column remains the native balance');
let html=render();assert.match(html,/Bud Mod/);assert.match(html,/data-metric="modification"[^>]*>−\$249/);assert.match(html,/data-element="4" data-metric="summary-modification"[^>]*>\+ \$33,320/);assert.match(html,/data-element="4" data-metric="summary-remaining"[^>]*>\$0/);assert.match(html,/data-po-summary-element="[^"\n]+\|1"/);assert.match(html,/data-po-summary-element="[^"\n]+\|2"/,'Offset elements appear even without a PO line');assert.doesNotMatch(html,/Element Shortfall/);
assert.equal(context.allocationRows()[0].remaining,24900n,'Native submission/accounting arithmetic is not mutated by the display projection');assert.equal(JSON.stringify(native),beforeNative);assert.equal(JSON.stringify(context.model.lines),beforeLines);
reviewed.components['2']='-19500.00';plan();projected=context.summaryRows()[0].allocation;assert.equal(projected.modification,-17100n);assert.equal(projected.remaining,7800n,'A later allocation edit updates the item remaining');
reviewed.components['2']='-19329.00';plan();assert.equal(context.model.reallocationPlan.net,'0.00');assert.equal(context.summaryRows()[0].allocation.modification,0n);assert.match(render(),/has-bud-mod/,'Zero-net transfers still expose their changed elements and modification column');
reviewed.components['4']='30000.00';plan();assert.equal(context.model.reallocationPlan.valid,false);assert.match(render(),/Element Shortfall \$3,320/,'An invalid underfunded component cannot look funded');reviewed.components['4']='33320.00';
context.model.reallocation=null;plan();assert.equal(context.summaryRows()[0].allocation.modification,3332000n,'Reset returns all displays to automatic funding defaults');
context.model.reallocation=reviewed;context.model.approvalState='Approved';assert.equal(context.summaryReallocation(),null,'An approved saved modification is already included in native balances and is never applied twice');context.model.reallocation=null;context.model.approvalState='Not Configured';context.model.balanceState='unavailable';assert.equal(context.summaryReallocation(),null,'An old projection is not shown against unavailable balances');context.model.balanceState='loaded';

// Execute the actual mounted-plan callback and Summary/PO renderers on each
// input event. The active allocation control stays mounted and no API is sent.
vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/po-reallocation-ui.js','utf8'),context);
const nodes=new Map(),node=key=>{if(!nodes.has(key))nodes.set(key,{innerHTML:'',textContent:'',scrollTop:0,dataset:{},setAttribute:()=>{},classList:{toggle:()=>{}},querySelectorAll:()=>[],contains:()=>false});return nodes.get(key);};
const preview={hidden:false,querySelector:selector=>node(selector)};
context.card={querySelector:selector=>node(selector),querySelectorAll:()=>[]};context.overlay={querySelector:selector=>selector==='.po-approver-preview'?preview:node(selector)};context.document={activeElement:null};context.progress=false;context.deleteReview=false;context.generation=1;context.previewGeneration=0;context.current=()=>true;let requests=0,timers=0,gates=0;context.setTimeout=()=>{timers++;return 1;};context.clearTimeout=()=>{};context.call=()=>{requests++;};context.patchReallocationGate=()=>gates++;
Object.assign(context.model,{loadState:'loaded',previewState:'loaded',previewRoles:[{role:'VP',name:'VP Reviewer'},{role:'CFO',name:'CFO Reviewer'}],previewKey:'33320.00|true|true'});
for(const name of ['canAmend','canCompose','readOnly','totals','patchSummary','patchContext','approverCount','patchApprovers','reallocationChanged'])vm.runInContext(helper(name),context);
const events={},host={innerHTML:'',hidden:false,addEventListener:(kind,handler)=>events[kind]=handler,querySelector:selector=>node('panel:'+selector)};
const ui=context.LMPOReallocationUI.create({host,model:()=>context.model,locked:()=>false,busy:()=>false,hidden:()=>false,items:()=>[{id,code:'WP02-3242',name:'Valley Gutter'}],money:context.money,error:error=>{throw Error(error);},changed:context.reallocationChanged});ui.update();
const type=(element,value,negative)=>{const target={dataset:{item:id,element,negative:String(negative)},value,selectionStart:value.length,hasAttribute:name=>name==='data-po-rea-amount',closest:()=>null};context.document.activeElement=target;events.input({target});assert.equal(context.document.activeElement,target);assert.equal(target.value,value);assert.equal(target.selectionStart,value.length);};
type('1','13991.00',true);type('2','19578.00',true);
assert.match(node('[data-po-summary]').innerHTML,/data-metric="modification"[^>]*>−\$249/);assert.match(node('[data-po-summary]').innerHTML,/data-element="4" data-metric="summary-remaining"[^>]*>\$0/);assert.match(node('[data-po-context]').innerHTML,/Net Modification[\s\S]*−\$249/);assert.match(node('[data-po-preview-body]').innerHTML,/Net Bud Mod[\s\S]*−\$249[\s\S]*Gross Changes[\s\S]*\$66,889/);assert.equal(node('[data-po-summary-total]').textContent,'$33,320','The bud mod never changes the PO payment total');
type('2','19329.00',true);assert.match(node('[data-po-preview-body]').innerHTML,/Net Bud Mod[\s\S]*\$0[\s\S]*Gross Changes[\s\S]*\$66,640/);assert.equal(gates,4,'Each plan change updates the existing submission gate once, without a render loop');assert.equal(requests,0);assert.equal(timers,0,'Allocation edits with unchanged route conditions never fetch another approval preview');
console.log('PO live reallocation: native Valley Gutter offsets/net/remaining, all changed elements, automatic/reset/invalid/approved guards, actual input-to-Summary/PO/Approvers callback, preserved caret and zero writes/preview requests passed.');
