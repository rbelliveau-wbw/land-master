import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('widgets/budget-manager/src/app/po-ui.js','utf8');
const ctx=vm.createContext({});
vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/po-domain.js','utf8'),ctx);ctx.root=ctx;
ctx.model={budgetId:'1001',vendorId:'9001',amount:'999.99',requestDate:'2026-10-09',dateNeeded:'2026-10-20',vendors:[{ID:'9001'}],lines:[{key:'one',budgetItemId:'2001',description:'Survey',uom:'EA',costElement:'5',pricingMode:'Calculated',quantity:'1',unitPrice:'1.01',finalAmount:'1.01'},{key:'two',budgetItemId:'2001',description:'Testing',uom:'EA',costElement:'5',pricingMode:'Manual',quantity:null,unitPrice:null,finalAmount:'2.02'}]};
ctx.options={userAccessId:()=> '8001'};ctx.lineCode=()=> 'C_SH01-3225-5';ctx.uid=()=> 'new-key';ctx.progress=false;ctx.visualBusy=false;ctx.current=()=>true;ctx.readOnly=()=>false;ctx.dateValid=()=>true;ctx.mountProgress=()=>{};ctx.error=message=>{throw new Error(message);};ctx.controller={begin:async payload=>{ctx.savedPayload=payload;}};
const totals=source.slice(source.indexOf('    function totals()'),source.indexOf('    function itemRows('));
vm.runInContext(totals,ctx);
const save=source.slice(source.indexOf('    async function save(action)'),source.indexOf('    async function get('));
vm.runInContext(save,ctx);
await ctx.save('Save');assert.equal(ctx.savedPayload.amount,'3.03','Saved PO total calculated from exact line cents, ignoring old header');
ctx.model.lines[1].finalAmount='3.04';await ctx.save('Save');assert.equal(ctx.savedPayload.amount,'4.05','Editing a saved draft recalculates its header');
vm.runInContext(source.slice(source.indexOf('    function lineNew()'),source.indexOf('    function render()')),ctx);assert.equal(ctx.lineNew().costElement,'5');
// Render the real ledger with edited descriptions. Item names resolve from
// the selected Budget Item rather than from the editable description.
const nodes=new Map();ctx.card={querySelector:selector=>{if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',dataset:{},focus(){this.focused=true;},insertAdjacentHTML(position,html){this.innerHTML=position==='afterbegin'?html+this.innerHTML:this.innerHTML+html;}});return nodes.get(selector);}};ctx.overlay={querySelector:()=>({})};ctx.setDeleteReview=()=>{};ctx.trash='';ctx.closePopover=()=>{};ctx.itemRows=()=>[{id:'2001',label:'CB01-3225 · Survey & inspection',name:'Survey & inspection'}];ctx.esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('"','&quot;');ctx.dateField=()=>'';ctx.patchBalances=()=>{};ctx.patchTotal=()=>{};ctx.chevron='';ctx.duplicateIcon='';ctx.x='';ctx.model.phase='Bluebonnet Phase 01';ctx.model.status='Draft';
vm.runInContext(source.slice(source.indexOf('    function picker('),source.indexOf('    function money(')),ctx);
vm.runInContext(source.slice(source.indexOf('    function canDelete()'),source.indexOf('    function picker(')),ctx);
vm.runInContext(source.slice(source.indexOf('    function render()'),source.indexOf('    function bundleHtml()')),ctx);ctx.render();
assert.doesNotMatch(nodes.get('.po-body').innerHTML,/\d+ \/ 250/);assert.match(nodes.get('.po-body').innerHTML,/<span>Item name<\/span>/);assert.match(nodes.get('.po-body').innerHTML,/<span>ELEM<\/span>/);assert.equal((nodes.get('.po-body').innerHTML.match(/aria-label="Item name">Survey &amp; inspection/g)||[]).length,2);ctx.model.lines[0].description='Changed PO description';ctx.render();assert.match(nodes.get('.po-body').innerHTML,/Changed PO description/);assert.equal((nodes.get('.po-body').innerHTML.match(/aria-label="Item name">Survey &amp; inspection/g)||[]).length,2);
console.log('PO entry: calculated save amount, exact cents, ELEM, compact ledger and fixed item names after description edits passed.');

ctx.model.editable=true;ctx.model.loadState='loaded';ctx.model.id='5001';for(const status of ['Draft','Submitted']){ctx.model.status=status;assert.equal(ctx.canDelete(),true);}ctx.model.approvalState='Approved';assert.equal(ctx.canDelete(),true);ctx.model.editable=false;assert.equal(ctx.canDelete(),false);ctx.model.editable=true;ctx.model.loadState='unavailable';assert.equal(ctx.canDelete(),false);

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
