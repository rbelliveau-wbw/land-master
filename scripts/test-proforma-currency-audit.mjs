import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {saveFixture} from './fixtures/proforma-sdk-v2-save-fixture.mjs';
import {ID,clone} from './fixtures/proforma-sdk-v2-harness.mjs';
const source=fs.readFileSync('widgets/proforma-manager/src/app/widget.html','utf8');
const marker='fieldsByReport:',at=source.indexOf(marker)+marker.length;
let depth=0,end=at;for(;end<source.length;end++){if(source[end]==='{')depth++;if(source[end]==='}'&&!--depth)break;}
const metadata=JSON.parse(source.slice(at,end+1));
const handoff=JSON.parse(fs.readFileSync('creator/handoffs/proforma-currency-capacity-1.80.79.json','utf8'));
const reports=['All_Pro_Formas_All_Fields','All_Land_Installments','Proforma_Item_Report','All_Construction_Cost_Curves','All_Lot_Mix_Rows','All_Proforma_Months','All_Proforma_Phases'];
for(const report of reports)for(const [field,meta]of Object.entries(metadata[report]))if(/^(USD|decimal|percentage)$/.test(meta.type)&&!(report==='All_Proforma_Phases'&&field==='Total_Lots')){
 const row=handoff.fields.find(row=>row.report===report&&row.field===field);assert.ok(row,report+'.'+field+' must be in the complete schema handoff');assert.equal(row.minimum_max_digits,16);assert.ok(row.minimum_decimal_points>=2);
}
assert.ok(!source.includes('repairFractionalMonths'),'no save path may rewrite monthly currency as whole dollars');
function model(m){
 m.Total_Acres='236.44';m.Land_Cost_Acre='52868';m.Const_Cost_FF='300.123456';
 m.Land_Sale='13456789.876543';m.Earnest_Money='123456.123456';m.Amount_per_Extension='2000.123456';
 m.purchaseInstallments=[{Installment:'1',Month1:'1',Percent1:'100',Cost:'12500109.92',Date1:''}];
 m.saleInstallments=[{Installment:'1',Month1:'2',Percent1:'100',Cost:m.Land_Sale,Date1:''}];
 m.pidMud=[{Installment:'1',Month1:'3',Cost:'15678901.123456',Percent1:'0',Date1:''}];
 m.items=[{Item_Name:'Large cost',Department:'Development',Category:'Misc',Add_l_Cost:'12345678.123456',Cost_Application:'Across Phases',Start_Phase:'1',End_Phase:'1'},
 {Item_Name:'Precise unit rate',Department:'Construction',Category:'Misc',Unit:'Lot',_perUnit:true,Per_Unit:'12.345678',Add_l_Cost:'1234.5678',Cost_Application:'Across Phases',Start_Phase:'1',End_Phase:'1'}];
 m.lotMix[0].Price_LF='1500.123456';
}
function formatted(value,currency){const text=String(value);const [whole,fraction='']=text.split('.');return (currency?'$ ':'')+whole.replace(/\B(?=(\d{3})+(?!\d))/g,',')+'.'+fraction.padEnd(6,'0');}
for(const env of ['DEVELOPMENT','PRODUCTION']){
 const h=await saveFixture({env,model,read:(cfg,storage)=>{if(!reports.includes(cfg.report_name))return;let rows=clone(storage[cfg.report_name]||[]);if(cfg.criteria&&cfg.criteria.includes('ID =='))rows=rows.filter(row=>cfg.criteria.includes(row.ID));for(const row of rows)for(const [field,meta]of Object.entries(metadata[cfg.report_name]))if(row[field]!=null&&row[field]!==''&&/^(USD|decimal|percentage)$/.test(meta.type))row[field]=formatted(row[field],meta.type==='USD');return {code:3000,data:rows};}});
 assert.deepEqual(clone(h.widget.validateModel(h.model)),[]);await h.widget.saveProforma();
 assert.equal(h.widget.S.ed.dirty,false,JSON.stringify(h.widget.PFTransport.snapshot()));assert.equal(h.document.getElementById('pfNativeProgress').hidden,true);assert.equal(h.storage.All_Land_Installments[0].Cost,'12500109.92');assert.equal(h.storage.All_Land_Installments[1].Cost,'13456789.876543');assert.equal(h.storage.All_Land_Installments[2].Cost,'15678901.123456');
}
let mismatches=0;
for(const field of Object.keys(metadata.All_Pro_Formas_All_Fields).filter(field=>metadata.All_Pro_Formas_All_Fields[field].type==='USD')){
 let sends=0;const h=await saveFixture({model,invoke:(cfg,storage,body,apply)=>{if(!body.op&&body.header){sends++;const result=apply();const row=storage.All_Pro_Formas_All_Fields.find(row=>row.ID===ID);assert.ok(Object.hasOwn(row,field),field+' has a captured value');row[field]=String(Number(body.header[field])+0.01);return result;}}});
 await h.widget.saveProforma();assert.equal(h.widget.S.ed.dirty,true,field);assert.equal(h.document.getElementById('pfNativeProgress').hidden,false);assert.match(h.document.getElementById('pfNativeError').textContent,/expected .*saved/);assert.equal(sends,1);assert.equal(h.widget.saveProforma(),false);mismatches++;
}
for(const [collection,field,index]of [['All_Land_Installments','Cost',0],['All_Land_Installments','Cost',1],['All_Land_Installments','Cost',2],['Proforma_Item_Report','Add_l_Cost',0],['Proforma_Item_Report','Per_Unit',1]]){
 let sends=0;const h=await saveFixture({model,invoke:(cfg,storage,body,apply)=>{if(!body.op&&body.header){sends++;const result=apply();storage[collection][index][field]=String(Number(storage[collection][index][field])+0.01);return result;}}});await h.widget.saveProforma();assert.equal(h.widget.S.ed.dirty,true);assert.match(h.document.getElementById('pfNativeError').textContent,new RegExp(field+' \\(expected .*saved'));assert.equal(sends,1);assert.equal(h.widget.saveProforma(),false);mismatches++;
}
// All monthly currency payload fields preserve fractions, including credits,
// cumulative totals and fields absent from an individual schedule fixture.
const h=await saveFixture();for(const [field,meta]of Object.entries(metadata.All_Proforma_Months))if(meta.type==='USD'){
 const month={Month1:1,date:{y:2027,m:1},[field]:-12345678.125};assert.equal(h.widget.monthData(month,ID)[field],-12345678.12,field+' preserves computed cents');
}
const formatContext=vm.createContext({});vm.runInContext(source.slice(source.indexOf('function fmt$('),source.indexOf('function fmtN(')),formatContext);
assert.equal(formatContext.fmt$(12500109.92),'$12,500,109.92');
assert.equal(formatContext.fmt$(-12500109.92),'($12,500,109.92)');
console.log('PASS complete currency audit: '+handoff.fields.length+' schema fields, formatted high-precision full saves in both environments, '+mismatches+' distinct persisted-loss cases, all monthly currency payloads, no whole-dollar repair/no replay.');
