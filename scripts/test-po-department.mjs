import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {poTestRuntime,compileDelugePO,amendmentRuntime,amendmentPayload,amendCall} from './test-po-test-cfo-backend.mjs';

const c=vm.createContext({});
vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/po-domain.js','utf8'),c);
const {LMPO:po}=c;
for(const [type,allowed] of [['Construction',['Construction']],['Development',['Development','Engineering']],['',[]],['Engineering',[]]]){
  for(const department of ['Construction','Development','Engineering','Surveying','',undefined]) assert.equal(po.departmentAllows(type,department),allowed.includes(department));
}
const payload={department:'Construction',budgetId:'61',vendorId:'91',amount:'1.00',lines:[{key:'one',budgetItemId:'71',description:'Work',uom:'EA',costElement:'5',pricingMode:'Manual',quantity:null,unitPrice:null,finalAmount:'1.00'}]};
for(const department of [undefined,null,'','Engineering','construction',{},['Construction']])for(const submit of [false,true])assert.throws(()=>po.validate({...payload,department},submit),/PO type/);
assert.equal(po.validate(payload,true).amount,'1.00');
assert.equal(po.validate({...payload,department:''},true,true).amount,'1.00','Existing blank-type records stay readable for review');

// The real picker uses the item department and retains all display labels.
const ui=fs.readFileSync('widgets/budget-manager/src/app/po-ui.js','utf8');
c.root=c;c.model={department:'',balanceState:'loaded',reservedLines:[],balances:['71','72','73','74'].map(budgetItemId=>({budgetItemId,finalCents:'100',modCents:'0',availableCents:'100'}))};
c.options={items:()=>['Construction','Development','Engineering','Surveying'].map((Department,i)=>({ID:String(71+i),Department,Item_Name:Department,Cost_Code:'320'+i}))};
vm.runInContext(ui.slice(ui.indexOf('    function itemRows(selectable)'),ui.indexOf('    function closePopover()')),c);
assert.equal(c.itemRows(true).length,0);
c.model.department='Construction';assert.deepEqual(Array.from(c.itemRows(true),i=>i.id),['71']);
c.model.department='Development';assert.deepEqual(Array.from(c.itemRows(true),i=>i.id),['72','73']);
assert.equal(c.itemRows().length,4,'Saved incompatible lines remain identifiable for review');

// Execute the native validator, including missing type rejection before any records.
const native=poTestRuntime();
const validatePayload={...payload,action:'Save',requestDate:'2026-11-11',dateNeeded:'2026-11-12',token:'department-test-0000000001'};
function validate(department){native.c.typeJSON=JSON.stringify({...validatePayload,department});return JSON.parse(vm.runInContext('poValidatePayload(typeJSON).toString()',native.c));}
assert.equal(validate('Construction').success,true);
for(const department of [null,'','Engineering','construction',{},['Construction']]){const result=validate(department);assert.equal(result.success,false);assert.match(result.error,/PO type/);}
for(const [itemDepartment,headerType,allowed] of [['Construction','Construction',true],['Development','Development',true],['Engineering','Development',true],['Construction','Development',false],['Development','Construction',false],['Engineering','Construction',false],['Surveying','Development',false]]){
  const runtime=amendmentRuntime();runtime.c.tables.Budget_Item[0].Department=itemDepartment;
  const before=runtime.tables();const result=amendCall(runtime,{...amendmentPayload,department:headerType});
  assert.equal(result.success,allowed,JSON.stringify({itemDepartment,headerType,result}));
  if(allowed){assert.equal(runtime.tables().Payment_Request[0].Department,headerType);assert.equal(result.snapshot.department,headerType);}
  else for(const name of ['Payment_Request','PO_Item','Budget_Modification','Budget_Approvals'])assert.deepEqual(runtime.tables()[name],before[name],name+' unchanged after forged item');
}
const zero=amendmentRuntime();zero.c.tables.Budget_Item.push({ID:72,Budget:61,Budget_Category:81,Department:'Engineering',Template_Item:false,Cost_Code:4140});
const zeroResult=amendCall(zero,{...amendmentPayload,lines:[...amendmentPayload.lines,{...amendmentPayload.lines[0],key:'zero-mismatch',budgetItemId:'72',costCode:'C_CB01-4140-5',finalAmount:'0.00'}]});
assert.equal(zeroResult.success,false);assert.match(zeroResult.error,/selected PO type/);

// Backfill executes the actual Deluge against native-shaped data. Only the
// explicit record range syntax needs an adapter for the local interpreter.
let migration=fs.readFileSync('creator/functions/backfillPurchaseOrderDepartments.dg','utf8');
migration=migration.replace(' sort by ID range from 0 to 99',' sort by ID');
vm.runInContext('Array.prototype.distinct=function(){return [...new Set(this)];}; zoho.loginuser=zoho.adminuser;',native.c);
vm.runInContext(compileDelugePO(migration),native.c);
vm.runInContext(`tables.Payment_Request=[
 {ID:100,Budget:61,Request_Type:'Purchase Order',Department:null,PO_Revision:'r1',PO_Line_Count:2},
 {ID:101,Budget:61,Request_Type:'Purchase Order',Department:'Construction',PO_Revision:'r2',PO_Line_Count:1},
 {ID:102,Budget:61,Request_Type:'Purchase Order',Department:null,Budget_Item:71},
 {ID:103,Budget:61,Request_Type:'Purchase Order',Department:null,PO_Revision:'r3',PO_Line_Count:2},
 {ID:104,Budget:61,Request_Type:'Purchase Order',Department:null,Budget_Item:74},
 {ID:105,Budget:61,Request_Type:'Purchase Order',Department:null},
 {ID:106,Budget:61,Request_Type:'Purchase Order',Department:null,PO_Revision:'r4',PO_Line_Count:2}];
 tables.PO_Item=[{ID:1,Purchase_Order:100,Revision:'r1',Budget_Item:72},{ID:2,Purchase_Order:100,Revision:'r1',Budget_Item:73},{ID:3,Purchase_Order:100,Revision:'old',Budget_Item:71},
 {ID:4,Purchase_Order:103,Revision:'r3',Budget_Item:71},{ID:5,Purchase_Order:103,Revision:'r3',Budget_Item:72},{ID:6,Purchase_Order:106,Revision:'r4',Budget_Item:72}];
 tables.Budget_Item=[{ID:71,Budget:61,Department:'Construction'},{ID:72,Budget:61,Department:'Development'},{ID:73,Budget:61,Department:'Engineering'},{ID:74,Budget:61,Department:'Surveying'}];tables.PO_Phase_Lock=[];`,native.c);
const run=apply=>JSON.parse(vm.runInContext(`backfillPurchaseOrderDepartments('0',${apply}).toString()`,native.c));
const before=native.tables();const preview=run(false);
assert.equal(preview.success,true,JSON.stringify(preview));assert.equal(preview.eligible,2);assert.equal(preview.needsReview,4);assert.equal(preview.alreadySet,1);assert.deepEqual(native.tables(),before,'Preview never mutates records');
const applied=run(true);assert.equal(applied.updated,2);assert.equal(native.tables().Payment_Request.find(p=>p.ID===100).Department,'Development');assert.equal(native.tables().Payment_Request.find(p=>p.ID===102).Department,'Construction');assert.equal(native.tables().Payment_Request.find(p=>p.ID===103).Department,null);
for(const name of ['PO_Item','Budget_Item','Budget_Approvals','PO_Operation'])assert.deepEqual(native.tables()[name],before[name],name+' unchanged');
assert.equal(run(true).updated,0,'Backfill is repeatable without overwriting existing types');
console.log('PO departments: required types, exact department mapping, both picker states, native validation, active-revision/legacy backfill, mixed/unsupported/incomplete exceptions, preview and idempotence passed.');
