import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('widgets/proforma-manager/src/app/widget.html','utf8');
function fn(name){const start=html.indexOf('function '+name+'(');assert.ok(start>=0);const end=html.indexOf('\nfunction ',start+1);return html.slice(start,end<0?undefined:end).split('\ndocument.addEventListener')[0];}
let payload,error;
const fields={Entity_Template:'',Facility_ID:''};
const save={textContent:'Create & Add',classList:{toggle(){},remove(){}},setAttribute(){},removeAttribute(){}};
const input={value:''},template={value:''},preview={textContent:'',classList:{remove(){}}};
const context=vm.createContext({S:{quickCreateKind:'company',ed:{id:'1234567890123456789',loi:{}}},document:{querySelector:q=>q.includes('Entity_Template')?template:input,getElementById:id=>id==='qcNamePreview'?preview:save},canEditLOI:()=>true,quickCreateValues:()=>fields,showQuickCreateError:m=>error=m,compactRecordData:x=>x,auditLog(){},invokeSaveApiOp:p=>{payload=p;return new Promise(()=>{});}});
vm.runInContext(html.match(/var QC_ENTITY_TEMPLATES=([^;]+);/)[0]+'\n'+['qcCompanyFacilityId','qcCompanyName','loiQuickCompanySync','submitLOIQuickCreate'].map(fn).join('\n'),context);
for(const [index,prefix] of [[0,'5'],[1,'4']])for(const suffix of ['123','007','000','999']){
 fields.Entity_Template=context.QC_ENTITY_TEMPLATES[index];fields.Facility_ID=suffix;
 template.value=fields.Entity_Template;input.value=suffix;save.textContent='Create & Add';context.loiQuickCompanySync();
 assert.ok(preview.textContent.endsWith('Series '+suffix));
 payload=undefined;error=undefined;context.submitLOIQuickCreate();
 assert.equal(error,undefined);assert.equal(payload.op,'quick_create_company');assert.equal(payload.company.Facility_ID,prefix+suffix);assert.ok(payload.company.Company_Name.endsWith('Series '+suffix));assert.equal(payload.id,'1234567890123456789');
}
for(const suffix of ['','12','1234','1a3','-12']){
 fields.Entity_Template=context.QC_ENTITY_TEMPLATES[0];fields.Facility_ID=suffix;payload=undefined;error=undefined;context.submitLOIQuickCreate();assert.equal(payload,undefined);assert.ok(error);
}
for(const entity of ['','Unknown']){fields.Entity_Template=entity;fields.Facility_ID='123';payload=undefined;error=undefined;context.submitLOIQuickCreate();assert.equal(payload,undefined);assert.ok(error);}
assert.match(html,/Facility ID \(Last 3 Digits\)/);
assert.match(html,/data-qc-k="Facility_ID" type="text" inputmode="numeric" maxlength="3"/);
console.log('Offer company suffix: both prefixes, leading zeroes, entity switches, preview, native payload and invalid inputs passed.');
