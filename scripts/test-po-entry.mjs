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
const save=source.slice(source.indexOf('    async function save(action)'),source.indexOf('    async function savedList()'));
vm.runInContext(save,ctx);
await ctx.save('Save');assert.equal(ctx.savedPayload.amount,'3.03','Saved PO total calculated from exact line cents, ignoring old header');
ctx.model.lines[1].finalAmount='3.04';await ctx.save('Save');assert.equal(ctx.savedPayload.amount,'4.05','Editing a saved draft recalculates its header');
vm.runInContext(source.slice(source.indexOf('    function lineNew()'),source.indexOf('    function render()')),ctx);assert.equal(ctx.lineNew().costElement,'5');
// Render the real ledger with edited descriptions. Item names resolve from
// the selected Budget Item rather than from the editable description.
const nodes=new Map();ctx.card={querySelector:selector=>{if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',insertAdjacentHTML(){}});return nodes.get(selector);}};ctx.overlay={querySelector:()=>({})};ctx.closePopover=()=>{};ctx.itemRows=()=>[{id:'2001',label:'CB01-3225 · Survey & inspection',name:'Survey & inspection'}];ctx.esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('"','&quot;');ctx.dateField=()=>'';ctx.patchBalances=()=>{};ctx.patchTotal=()=>{};ctx.chevron='';ctx.duplicateIcon='';ctx.x='';ctx.model.phase='Bluebonnet Phase 01';ctx.model.status='Draft';
vm.runInContext(source.slice(source.indexOf('    function picker('),source.indexOf('    function money(')),ctx);
vm.runInContext(source.slice(source.indexOf('    function canDelete()'),source.indexOf('    function picker(')),ctx);
vm.runInContext(source.slice(source.indexOf('    function render()'),source.indexOf('    function bundleHtml()')),ctx);ctx.render();
assert.match(nodes.get('.po-body').innerHTML,/2 \/ 250/);assert.match(nodes.get('.po-body').innerHTML,/<span>Item name<\/span>/);assert.match(nodes.get('.po-body').innerHTML,/<span>ELEM<\/span>/);assert.equal((nodes.get('.po-body').innerHTML.match(/aria-label="Item name">Survey &amp; inspection/g)||[]).length,2);ctx.model.lines[0].description='Changed PO description';ctx.render();assert.match(nodes.get('.po-body').innerHTML,/Changed PO description/);assert.equal((nodes.get('.po-body').innerHTML.match(/aria-label="Item name">Survey &amp; inspection/g)||[]).length,2);
console.log('PO entry: calculated save amount, exact cents, ELEM, 250-line display and fixed item names after description edits passed.');

ctx.model.editable=true;ctx.model.loadState='loaded';ctx.model.id='5001';for(const status of ['Draft','Submitted']){ctx.model.status=status;assert.equal(ctx.canDelete(),true);}ctx.model.approvalState='Approved';assert.equal(ctx.canDelete(),true);ctx.model.editable=false;assert.equal(ctx.canDelete(),false);ctx.model.editable=true;ctx.model.loadState='unavailable';assert.equal(ctx.canDelete(),false);
