import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('widgets/budget-manager/src/app/po-ui.js','utf8');
const start=source.indexOf('    function itemRows(selectable)');
const end=source.indexOf('    function closePopover()',start);
assert.ok(start>=0&&end>start,'Exercise the actual PO picker implementation');
const context=vm.createContext({});
vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/po-domain.js','utf8'),context);
context.root=context;
context.model={balanceState:'loaded',reservedLines:[],balances:[
  {budgetItemId:'9007199254740993',finalCents:'10000',modCents:'500',issuedCents:'7500',availableCents:'3000'},
  {budgetItemId:'2',finalCents:'10000',modCents:'-10000',issuedCents:'0',availableCents:'0'},
  {budgetItemId:'3',finalCents:'0',modCents:'1',issuedCents:'0',availableCents:'1'},
  {budgetItemId:'4',finalCents:'-10000',modCents:'0',issuedCents:'0',availableCents:'-10000'},
  {budgetItemId:'5',finalCents:'10000',modCents:'0',issuedCents:'10000',availableCents:'0'}
]};
context.options={items:()=>[
  {ID:'9007199254740993',Item_Name:'Survey',Budget_Code:'CB01-3225'},
  {ID:'2',Item_Name:'Zero revised'},
  {ID:'3',Item_Name:'Approved modification only'},
  {ID:'4',Item_Name:'Credit'},
  {ID:'5',Item_Name:'Exhausted'},
  {ID:'6',Item_Name:'Missing balance'}
]};
vm.runInContext(source.slice(start,end),context);
const choices=context.itemRows(true);
assert.deepEqual(Array.from(choices,row=>row.id),['3','4','5','9007199254740993']);
const survey=choices.find(row=>row.id==='9007199254740993');
assert.equal(survey.modified,10500n,'Final plus approved signed modifications');
assert.equal(survey.available,3000n,'Other POs deducted once, before this draft');
assert.equal(choices.find(row=>row.id==='5').available,0n,'Zero availability remains eligible when modified total is nonzero');
assert.equal(choices.find(row=>row.id==='4').modified,-10000n,'Nonzero credits are preserved');
assert.ok(context.itemRows().some(row=>row.id==='2'),'Saved zero-total selections still render');
context.model.reservedLines=[{budgetItemId:'9007199254740993',finalAmount:'5.01'},{budgetItemId:'9007199254740993',finalAmount:'2.00'}];
assert.equal(context.itemRows(true).find(row=>row.id==='9007199254740993').available,3701n,'Editing restores only this saved PO reservation, including repeated lines');
context.model.balanceState='loading';
assert.equal(context.itemRows(true).length,0,'Loading balances never become fabricated zero values');
context.model.balanceState='unavailable';
assert.equal(context.itemRows(true).length,0,'Failed balances do not authorize item choices');
assert.equal(context.itemRows().length,6,'Existing selections retain their readable labels');
console.log('PO item picker: signed modified totals, other PO reservations, saved selections, exact IDs and unavailable reads passed.');

context.model.balanceState='loaded';
const originals=context.options.items();
const codes=['4000','4010','4099','4100','4500','4999','7999','8000','8500','8999','9000','9999'];
context.options.items=()=>originals.concat(codes.map(code=>({ID:'code-'+code,Item_Name:code,Cost_Code:code})));
context.model.balances.push(...codes.map(code=>({budgetItemId:'code-'+code,finalCents:'100',modCents:'0',availableCents:'100',minorCode:code})));
const included=new Set(context.itemRows(true).map(row=>row.id));
for(const code of ['4000','4010','4099','8000','8500','8999','9000','9999']) assert.equal(included.has('code-'+code),false,code+' excluded');
for(const code of ['4100','4500','4999','7999']) assert.equal(included.has('code-'+code),true,code+' retained');
assert.equal(context.itemRows().length,18,'Excluded existing selections remain readable');
console.log('PO dropdown exclusions: land 4000–4099, classes 8000/9000; other 4000 items retained.');
