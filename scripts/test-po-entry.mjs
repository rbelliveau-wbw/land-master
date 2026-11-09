import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('widgets/budget-manager/src/app/po-ui.js','utf8');
const ctx=vm.createContext({vendorDialog:null});
vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/po-domain.js','utf8'),ctx);ctx.root=ctx;
ctx.model={budgetId:'1001',vendorId:'9001',amount:'999.99',requestDate:'2026-10-09',dateNeeded:'2026-10-20',vendors:[{ID:'9001'}],lines:[{key:'one',budgetItemId:'2001',description:'Survey',uom:'EA',costElement:'5',pricingMode:'Calculated',quantity:'1',unitPrice:'1.01',finalAmount:'1.01'},{key:'two',budgetItemId:'2001',description:'Testing',uom:'EA',costElement:'5',pricingMode:'Manual',quantity:null,unitPrice:null,finalAmount:'2.02'}]};
let deleteAllowed=true;ctx.options={userAccessId:()=> '8001',canDelete:()=>deleteAllowed};ctx.lineCode=()=> 'C_SH01-3225-5';ctx.uid=()=> 'new-key';ctx.progress=false;ctx.visualBusy=false;ctx.current=()=>true;ctx.readOnly=()=>false;ctx.dateValid=()=>true;ctx.mountProgress=()=>{};ctx.error=message=>{throw new Error(message);};ctx.controller={begin:async payload=>{ctx.savedPayload=payload;}};
const totals=source.slice(source.indexOf('    function totals()'),source.indexOf('    function itemRows('));
vm.runInContext(totals,ctx);
vm.runInContext(source.slice(source.indexOf('    function canAmend('),source.indexOf('    function readOnly(')),ctx);
const save=source.slice(source.indexOf('    async function save(action)'),source.indexOf('    async function get('));
vm.runInContext(save,ctx);
await ctx.save('Save');assert.equal(ctx.savedPayload.amount,'3.03','Saved PO total calculated from exact line cents, ignoring old header');
ctx.model.lines[1].finalAmount='3.04';await ctx.save('Save');assert.equal(ctx.savedPayload.amount,'4.05','Editing a saved draft recalculates its header');
vm.runInContext(source.slice(source.indexOf('    function lineNew()'),source.indexOf('    function render()')),ctx);assert.equal(ctx.lineNew().costElement,'','new lines require an explicit element selection');assert.equal(ctx.lineNew().description,'');
for(const submit of [false,true])assert.throws(()=>ctx.LMPO.validate({...ctx.model,amount:'4.05',lines:ctx.model.lines.map((line,index)=>index?line:{...line,costElement:''})},submit),/Cost Element/,'a blank element cannot be saved or submitted as Other');
assert.equal(ctx.LMPO.validate({...ctx.model,amount:'4.05'},true).lines[0].costElement,'5','an explicitly selected or saved Other remains valid');
// Render the real ledger with edited descriptions. Item names resolve from
// the selected Budget Item rather than from the editable description.
const nodes=new Map();ctx.card={querySelector:selector=>{if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',dataset:{},focus(){this.focused=true;},insertAdjacentHTML(position,html){this.innerHTML=position==='afterbegin'?html+this.innerHTML:this.innerHTML+html;}});return nodes.get(selector);}};ctx.overlay={querySelector:()=>({})};ctx.deleteReview=false;ctx.gridBinding=null;ctx.setDeleteReview=()=>{};ctx.trash='';ctx.closePopover=()=>{};ctx.itemRows=()=>[{id:'2001',label:'CB01-3225 · Survey & inspection',name:'Survey & inspection'}];ctx.esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('"','&quot;');ctx.dateField=()=>'';ctx.patchBalances=()=>{};ctx.patchTotal=()=>{};ctx.chevron='';ctx.duplicateIcon='';ctx.x='';ctx.model.phase='Bluebonnet Phase 01';ctx.model.status='Draft';
vm.runInContext(source.slice(source.indexOf('    function picker('),source.indexOf('    function money(')),ctx);
vm.runInContext(source.slice(source.indexOf('    function canDelete()'),source.indexOf('    function picker(')),ctx);
vm.runInContext(source.slice(source.indexOf('    function render()'),source.indexOf('    function bundleHtml()')),ctx);ctx.render();
assert.doesNotMatch(nodes.get('.po-body').innerHTML,/\d+ \/ 250/);assert.match(nodes.get('.po-body').innerHTML,/<span>Item name<\/span>/);assert.match(nodes.get('.po-body').innerHTML,/<span>ELEM<\/span>/);assert.equal((nodes.get('.po-body').innerHTML.match(/aria-label="Item name">Survey &amp; inspection/g)||[]).length,2);ctx.model.lines[0].description='Changed PO description';ctx.render();assert.match(nodes.get('.po-body').innerHTML,/Changed PO description/);assert.equal((nodes.get('.po-body').innerHTML.match(/aria-label="Item name">Survey &amp; inspection/g)||[]).length,2);
console.log('PO entry: calculated save amount, exact cents, ELEM, compact ledger and fixed item names after description edits passed.');

// The actual saved-PO renderer has no draft fields or fabricated totals while waiting.
const loadingSummary={hidden:false};ctx.overlay.querySelector=()=>loadingSummary;ctx.model.loadState='loading';ctx.render();assert.match(nodes.get('.po-body').innerHTML,/Loading purchase order/);assert.match(nodes.get('.po-body').innerHTML,/aria-busy="true"/);assert.doesNotMatch(nodes.get('.po-body').innerHTML,/data-po-field|data-po-total|po-ledger/);assert.equal(loadingSummary.hidden,true);assert.equal(nodes.get('[data-po-title-vendor]').hidden,true);assert.doesNotMatch(nodes.get('footer').innerHTML,/data-po-save|data-po-reload/);
ctx.model.loadState='unavailable';ctx.model.error='Saved PO denied';ctx.render();assert.match(nodes.get('.po-body').innerHTML,/Purchase order unavailable/);assert.match(nodes.get('.po-body').innerHTML,/Saved PO denied/);assert.match(nodes.get('footer').innerHTML,/data-po-reload/);assert.doesNotMatch(nodes.get('.po-body').innerHTML,/data-po-field|data-po-total/);
ctx.model.loadState='loaded';ctx.render();assert.equal(loadingSummary.hidden,false);assert.equal(nodes.get('[data-po-title-vendor]').hidden,false);assert.match(nodes.get('.po-body').innerHTML,/data-po-field/);ctx.model.error='';
console.log('Saved PO loading: explicit busy state, hidden zero/draft fields and Summary, recoverable failure, then atomic saved data reveal passed.');

ctx.model.editable=true;ctx.model.loadState='loaded';ctx.model.id='5001';for(const status of ['Draft','Submitted']){ctx.model.status=status;assert.equal(ctx.canDelete(),true);}ctx.model.approvalState='Approved';assert.equal(ctx.canDelete(),true);deleteAllowed=false;assert.equal(ctx.canDelete(),false);deleteAllowed=true;ctx.model.loadState='unavailable';assert.equal(ctx.canDelete(),false);

// Real confirmation preflight captures child counts; Escape/Cancel retains the
// original PO and never sends Delete. No live records are mutated by this test.
function surface(){return {classes:new Set(),attrs:{},classList:{toggle(name,on){if(on)this.owner.classes.add(name);else this.owner.classes.delete(name);}},setAttribute(name,value){this.attrs[name]=value;}};}
Object.assign(ctx.card,surface());ctx.card.classList.owner=ctx.card;
ctx.overlay=surface();ctx.overlay.classList.owner=ctx.overlay;
const workspace=surface();workspace.classList.owner=workspace;const summary={};ctx.overlay.querySelector=selector=>selector==='.po-workspace'?workspace:summary;
ctx.generation=1;ctx.deleteReview=false;ctx.progress=false;ctx.visualBusy=false;ctx.popover=null;
ctx.model.loadState='loaded';ctx.model.revision='rev1';ctx.model.vendors=[{ID:'9001',Vendor_Name:'Site services'}];
vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/po-controller.js','utf8'),ctx);
vm.runInContext(source.slice(source.indexOf('  var trash='),source.indexOf('  function esc(')),ctx);
vm.runInContext(source.slice(source.indexOf('    function money('),source.indexOf('    function totals(')),ctx);
vm.runInContext(source.slice(source.indexOf('    function setDeleteReview('),source.indexOf('    async function removePO(')),ctx);
const requests=[];ctx.call=async request=>{requests.push(request);assert.equal(request.action,'PreviewDelete');return {contract:'po-v1',success:true,deletePlan:{id:'5001',budgetId:'1001',revision:'rev1',proof:'native-proof',rollupItems:[],items:['6001','6002'],operations:['7001'],snapshots:[],approvals:[],modifications:[]}};};
await ctx.previewDelete();assert.equal(ctx.deleteReview,true);assert.equal(workspace.attrs['aria-labelledby'],'po-delete-title');assert.match(nodes.get('.po-body').innerHTML,/Site services/);assert.match(nodes.get('.po-body').innerHTML,/PO line items \(all revisions\).*<strong>2<\/strong>/);assert.match(nodes.get('.po-body').innerHTML,/budget-delete-list/);assert.equal(nodes.get('[data-po-delete-cancel]').focused,true);
let closed=0;ctx.close=()=>closed++;
vm.runInContext(source.slice(source.indexOf('    function keydown('),source.indexOf('    function error(')),ctx);
ctx.keydown({key:'Escape',target:{dataset:{}},preventDefault(){},stopPropagation(){}});
assert.equal(closed,0);assert.equal(ctx.deleteReview,false);assert.equal(ctx.model.id,'5001');assert.equal(ctx.model.deletePlan,null);assert.equal(requests.length,1);assert.equal(workspace.attrs['aria-labelledby'],'po-title');
assert.doesNotMatch(nodes.get('footer').innerHTML,/Saved POs|Refresh balances/);assert.match(nodes.get('footer').innerHTML,/attachment-action delete po-delete/);assert.match(nodes.get('footer').innerHTML,/aria-label="Delete PO"/);
vm.runInContext(source.slice(source.indexOf('    function bundleHtml('),source.indexOf('    async function decide(')),ctx);ctx.model.approvalBundle={rows:[{order:1,role:'CFO',status:'Approved',notes:'Verified'}],modifications:[],canApprove:false};assert.match(ctx.bundleHtml(),/data-po-chain-state="Approved"/);assert.match(ctx.bundleHtml(),/po-chain-status/);
console.log('PO review: captured child counts, compact confirmation, Cancel/Escape restores PO without Delete, removed shortcuts and status-specific approval markup passed.');

// Reproduce the critical report: Review PO receives a new $100 modification
// while the cached balance still has zero pending modifications, before Submit.
const review=vm.createContext({vendorDialog:null});vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/po-domain.js','utf8'),review);review.root=review;
const oldBalance={budgetItemId:'2001',finalCents:'5000000',modCents:'0',issuedCents:'3500',availableCents:'4996500',pendingModificationCents:'0'};
const newBalance={...oldBalance,issuedCents:'5010000',availableCents:'-10000',pendingModificationCents:'10000'};
const submitted={id:'5001',budgetId:'1001',status:'Submitted',commitmentState:'Reserved',approvalState:'Pending',amount:'50065.00',lines:[{key:'one',budgetItemId:'2001',finalAmount:'50065.00'}],approvalBundle:{modifications:[{budgetItemId:'2001',amount:'100.00',status:'Submitted'}]}};
review.model={budgetId:'1001',lines:submitted.lines,reservedLines:[],balances:[oldBalance],balanceState:'loaded'};review.generation=1;review.balanceGeneration=0;review.current=()=>true;review.progress=true;review.popover=null;review.deleteReview=false;
review.controller={state:()=>({snapshot:submitted})};review.error=message=>{review.model.error=message;};
vm.runInContext(source.slice(source.indexOf('    function allocationRows()'),source.indexOf('    function summaryRows()')),review);
vm.runInContext(source.slice(source.indexOf('    async function readBalances()'),source.indexOf('    function setDeleteReview(')),review);
vm.runInContext(source.slice(source.indexOf('    function click(event)'),source.indexOf('    async function open(')),review);
const rendered=[];review.render=()=>{if(!review.progress)rendered.push({state:review.model.balanceState,allocation:review.allocationRows()[0]});};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
let pending=deferred();const reads=[];review.call=p=>{reads.push(p.action);assert.equal(p.action,'Balances','Review performs only a read');return pending.promise;};
const stale=pending;const earlierBalance=review.refresh();
pending=deferred();review.click({target:{closest:selector=>selector==='button,input[data-po-date]'?{hasAttribute:name=>name==='data-po-done'}:null}});
assert.equal(review.progress,false);assert.equal(review.model.id,'5001');assert.equal(review.model.amount,'50065.00');assert.equal(rendered[0].state,'loading');assert.equal(rendered[0].allocation.verified,false,'First review render cannot combine a saved mod with pre-submit balances');
pending.resolve({contract:'po-v1',success:true,balances:[newBalance]});await new Promise(resolve=>setImmediate(resolve));
assert.equal(review.model.balanceState,'loaded');assert.equal(rendered.at(-1).allocation.available,4996500n);assert.equal(rendered.at(-1).allocation.remaining,-10000n);assert.equal(rendered.at(-1).allocation.pending,0n);assert.equal(rendered.at(-1).allocation.shortfall,10000n);
stale.resolve({contract:'po-v1',success:true,balances:[oldBalance]});await earlierBalance;assert.equal(review.model.balances[0].pendingModificationCents,'10000','A late pre-submit balance cannot overwrite the refreshed balance');
pending=deferred();const failedRefresh=review.refresh();pending.reject(new Error('Balance read denied'));await failedRefresh;assert.equal(review.model.balanceState,'unavailable');assert.equal(rendered.at(-1).allocation.verified,false,'Failed refresh cannot reuse cached amounts');
assert.throws(()=>review.LMPO.allocations(submitted.lines,[oldBalance],submitted.lines,submitted.approvalBundle.modifications),/does not reconcile/,'Strict reconciliation still rejects genuinely inconsistent loaded balances');
const beforeWarm=reads.length;review.progress=true;review.controller={state:()=>({snapshot:submitted,reviewBalances:{state:'loaded',balances:[newBalance]}})};review.click({target:{closest:selector=>selector==='button,input[data-po-date]'?{hasAttribute:name=>name==='data-po-done'}:null}});assert.equal(reads.length,beforeWarm,'Review reuses balances freshly loaded after the acknowledged mutation');assert.equal(review.model.loadState,'loaded');assert.equal(rendered.at(-1).allocation.available,4996500n,'Warm Review reveals its Summary immediately');
assert.deepEqual(reads,['Balances','Balances','Balances']);
console.log('PO Review after Submit: saved $50,065 PO and $100 mod, unknown-then-fresh budget, late read exclusion, failed read and strict reconciliation passed without writes.');

// Manual totals deliberately store null pricing inputs, but those inputs must
// remain usable to return to Quantity × Price without a separate reset action.
const entry=vm.createContext({vendorDialog:null,progress:false});
vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/po-domain.js','utf8'),entry);entry.root=entry;
let editable=true,active=true,summaryUpdates=0,totalUpdates=0;
entry.current=()=>active;entry.readOnly=()=>!editable;
entry.patchBalances=()=>summaryUpdates++;entry.patchTotal=()=>totalUpdates++;
entry.model={gridMode:'row',description:'PO header',lines:[{key:'one',budgetItemId:'2001',description:'First line',uom:'EA',costElement:'5',pricingMode:'Calculated',quantity:'5',unitPrice:'150.00',finalAmount:'750.00'},{key:'two',budgetItemId:'2002',description:'Second line',uom:'EA',costElement:'1',pricingMode:'Calculated',quantity:'10',unitPrice:'250.00',finalAmount:'2500.00'}]};
const first=entry.model.lines[0],untouched=JSON.stringify(entry.model.lines[1]),mode={textContent:''},reset={hidden:true},fields={};
const row={querySelector(selector){if(selector==='[data-po-mode]')return mode;if(selector==='[data-po-calculated]')return reset;const name=selector.match(/data-po-field="([^"]+)"/)?.[1];assert.ok(name&&fields[name],'actual handler asks for a known pricing field');return fields[name];}};
for(const name of ['quantity','unitPrice','finalAmount','description']){
  let value=first[name]??'';
  fields[name]={dataset:{poField:name,key:'one'},readOnly:false,writes:0,selectionStart:0,selectionEnd:0,hasAttribute:()=>false,closest:selector=>selector==='.po-line'?row:null,get value(){return value;},set value(next){this.writes++;value=next;}};
}
vm.runInContext(source.slice(source.indexOf('    function numericField('),source.indexOf('    function money(')),entry);
vm.runInContext(source.slice(source.indexOf('    function numericFocus(event)'),source.indexOf('    async function readBalances()')),entry);
function type(name,text){const target=fields[name];target.value=text;target.selectionStart=target.selectionEnd=text.length;target.writes=0;entry.input({target});assert.equal(target.value,text,'the edited native text stays mounted');assert.equal(target.writes,0,'the handler never rewrites the active input/caret');assert.equal(target.selectionStart,text.length);assert.equal(target.selectionEnd,text.length);assert.equal(JSON.stringify(entry.model.lines[1]),untouched,'pricing edits stay scoped to the exact line key');}
for(const gridMode of ['row','excel']){
  entry.model.gridMode=gridMode;
  type('finalAmount','500000');
  assert.equal(first.pricingMode,'Manual');assert.equal(first.quantity,null);assert.equal(first.unitPrice,null);assert.equal(first.finalAmount,'500000');
  for(const name of ['quantity','unitPrice']){assert.equal(fields[name].value,'');assert.equal(fields[name].readOnly,false,'manual blank inputs are immediately editable in '+gridMode+' mode');}
  assert.equal(mode.textContent,'Manual amount');assert.equal(reset.hidden,false);
  type('quantity','10');assert.equal(first.pricingMode,'Calculated');assert.equal(first.finalAmount,null,'incomplete pricing never retains a stale manual total');assert.equal(fields.finalAmount.value,'');assert.equal(mode.textContent,'');assert.equal(reset.hidden,true);
  type('unitPrice','250.00');assert.equal(first.finalAmount,'2500.00');assert.equal(fields.finalAmount.value,'2,500.00');
  type('finalAmount','99.99');assert.equal(first.quantity,null);assert.equal(first.unitPrice,null);
  type('unitPrice','12.30');assert.equal(first.pricingMode,'Calculated');assert.equal(first.finalAmount,null,'price-first return also awaits its quantity');
  for(const value of ['1','1.','1.5','1.50'])type('quantity',value);
  assert.equal(first.quantity,'1.50');assert.equal(first.finalAmount,'18.45','decimal typing retains exact arithmetic');
  type('description','Updated text');assert.equal(first.pricingMode,'Calculated');assert.equal(first.finalAmount,'18.45');
}
type('finalAmount','77.77');
entry.LMPO.validate({budgetId:'1001',vendorId:'9001',amount:'2577.77',lines:entry.model.lines},true);
const prior=JSON.stringify(entry.model),updates=summaryUpdates+totalUpdates;
editable=false;fields.quantity.value='20';entry.input({target:fields.quantity});assert.equal(JSON.stringify(entry.model),prior,'readonly native input events cannot switch pricing mode');
editable=true;entry.progress=true;entry.input({target:fields.quantity});assert.equal(JSON.stringify(entry.model),prior,'pending writes prohibit pricing changes');
entry.progress=false;active=false;entry.input({target:fields.quantity});assert.equal(JSON.stringify(entry.model),prior,'stale session events cannot edit pricing');
active=true;fields.description.dataset.key='removed-line';fields.description.value='Detached text';entry.input({target:fields.description});assert.equal(entry.model.description,'PO header','a removed line event never overwrites the PO description');assert.equal(JSON.stringify(entry.model),prior);assert.equal(summaryUpdates+totalUpdates,updates);
// The real renderer keeps manual inputs editable while its normal read-only
// gate still controls saved previews and restricted actors.
ctx.model.loadState='loaded';ctx.model.status='Draft';ctx.model.preview=false;ctx.model.lines[1].pricingMode='Manual';ctx.model.lines[1].quantity=null;ctx.model.lines[1].unitPrice=null;ctx.render();
for(const name of ['quantity','unitPrice']){const tag=nodes.get('.po-body').innerHTML.match(new RegExp('<input[^>]*data-po-field="'+name+'"[^>]*data-key="two"[^>]*>'))?.[0];assert.ok(tag);assert.doesNotMatch(tag,/readonly/);}
console.log('PO native input handler: row/spreadsheet Manual-to-Calculated parity, exact decimal edits, no active-input/caret rewrite, true-null manual payload, scoped lines and readonly/pending/stale guards passed.');

// Grouping is presentation only: never round through Number or rewrite an
// actively edited value. Valid pasted grouping is normalized in the model;
// malformed separators remain invalid and cannot reach the exact API contract.
for(const value of ['1234.500000','9999999999999.99','1000000000.000001','0','12.00'])assert.equal(entry.LMPO.editDecimal(entry.LMPO.formatDecimal(value)),value);
assert.equal(entry.LMPO.formatDecimal('1234567.123456'),'1,234,567.123456');
assert.equal(entry.LMPO.formatDecimal(null),'');
assert.equal(entry.LMPO.editDecimal('1,25'),'1,25');
assert.throws(()=>entry.LMPO.money(entry.LMPO.editDecimal('1,25')),/exact decimal/);
type('finalAmount','1,234,567.89');assert.equal(first.finalAmount,'1234567.89');
entry.numericBlur({target:fields.finalAmount});assert.equal(fields.finalAmount.value,'1,234,567.89');
fields.finalAmount.selectionStart=4;fields.finalAmount.selectionEnd=8;
fields.finalAmount.setSelectionRange=function(start,end){this.selectionStart=start;this.selectionEnd=end;};
entry.numericFocus({target:fields.finalAmount});assert.equal(fields.finalAmount.value,'1234567.89');assert.equal(fields.finalAmount.selectionStart,3);assert.equal(fields.finalAmount.selectionEnd,6);
for(const gridMode of ['row','excel']){
  entry.model.gridMode=gridMode;
  type('quantity','1,234.500000');type('unitPrice','1,000.01');
  assert.equal(first.quantity,'1234.500000');assert.equal(first.unitPrice,'1000.01');assert.equal(first.finalAmount,'1234512.35');assert.equal(fields.finalAmount.value,'1,234,512.35');
  entry.numericBlur({target:fields.quantity});assert.equal(fields.quantity.value,'1,234.500000');
  entry.numericFocus({target:fields.quantity});assert.equal(fields.quantity.value,'1234.500000');
}
type('unitPrice','1,25');assert.equal(first.finalAmount,null);entry.numericBlur({target:fields.unitPrice});assert.equal(fields.unitPrice.value,'1,25');
ctx.model.lines[0].quantity='1234.500000';ctx.model.lines[0].unitPrice='1000.01';ctx.model.lines[0].finalAmount='1234512.35';ctx.render();
for(const [name,value] of [['quantity','1,234.500000'],['unitPrice','1,000.01'],['finalAmount','1,234,512.35']])assert.match(nodes.get('.po-body').innerHTML,new RegExp('data-po-field="'+name+'"[^>]*value="'+value.replaceAll('.','\\.')+'"'));

// Exercise the real picker handler, including selecting another Budget Item
// after custom text was entered. The separate Item Name remains derived.
const selection=vm.createContext({vendorDialog:null,deleteReview:false,popover:null,progress:false,visualBusy:false,current:()=>true,readOnly:()=>false,closePopover(){},render(){}});
selection.model={lines:[{key:'blank',budgetItemId:'',description:'',costElement:''},{key:'custom',budgetItemId:'2001',description:'User-entered scope',costElement:'4'}]};
vm.runInContext(source.slice(source.indexOf('    function click(event)'),source.indexOf('    async function open(')),selection);
for(const key of ['blank','custom']){const target={dataset:{poPick:'budgetItemId',key,value:'2002'},hasAttribute:()=>false};selection.click({target:{closest:selector=>selector==='button,input[data-po-date]'?target:null}});}
assert.equal(selection.model.lines[0].description,'');assert.equal(selection.model.lines[0].costElement,'');assert.equal(selection.model.lines[1].description,'User-entered scope');assert.equal(selection.model.lines[1].costElement,'4');
console.log('PO explicit entry: blank element guards, preserved saved selections, no picker Description autofill, exact grouped render/blur/paste, raw focus/caret and malformed-group rejection passed.');
