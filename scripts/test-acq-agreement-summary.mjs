import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ready as contractReady,ID,ACTION} from './test-contract-sdk-v2-foundation.mjs';
import {ready as pfReady,ID as PFID} from './fixtures/proforma-sdk-v2-harness.mjs';

const h=await contractReady({realDOM:true}),c=h.c;
assert.equal(c.TYPES.includes('Acquisition'),false);
for(const type of ['ACQ (PSA)','ACQ (LOI)'])assert.ok(c.TYPES.includes(type));
const templates=[{ID:'11',Template_Action:true,Type_field:'Acquisition',Contract1:'',Sort_Order:1,Contract_Action:'Legacy LOI task'},
 {ID:'12',Template_Action:true,Type_field:'ACQ (LOI)',Contract1:'',Sort_Order:2,Contract_Action:'LOI task'},
 {ID:'13',Template_Action:true,Type_field:'ACQ (PSA)',Contract1:'',Sort_Order:1,Contract_Action:'PSA task'}];
assert.deepEqual(Array.from(c.templatesFor('ACQ (LOI)',templates),v=>v.ID),['11','12']);
assert.deepEqual(Array.from(c.templatesFor('ACQ (PSA)',templates),v=>v.ID),['13']);
for(const mode of ['legal','construction']){
 c.S.workMode=mode;const row=c.S.contracts[0];row.Work_Module=mode==='construction'?'Construction':'Legal';row.Status='Hold';
 const a=c.findAction(ACTION);Object.assign(a,{Work_Module:row.Work_Module,Contract_Action:'Review revised plans',Status:'Awaiting Counterparty',Current_Action:true,Complete:false,Dev_Mgr:'Fixture owner',Due_Date:'20-Oct-2026'});
 assert.ok(c.allContractStatuses().includes('Hold'));
 assert.ok(c.pickableContractStatuses('New').includes('Hold'));
 const html=c.renderTable([row]);
 assert.match(html,/Current Action Status/);assert.doesNotMatch(html,/>Approvals<|>Progress</);
 assert.match(html,/Review revised plans/);assert.match(html,/Due /);assert.match(html,/Current action status — read only/);
 assert.doesNotMatch(html,/class="action-summary-status"[^]*?onclick=/);
 assert.equal((html.match(/<col(?:\s|\/)/g)||[]).length,7);
 assert.match(html,/width:11\.9%/);assert.match(c.statusCell(row),/#a21c63/);
 const cells=c.currentActionSummaryCells(row);assert.match(cells,/Awaiting Counterparty/);assert.doesNotMatch(cells,/<button|<input|<select|onclick=/);
 a.Current_Action=false;assert.doesNotMatch(c.currentActionSummaryCells(row),/Awaiting Counterparty|Due /,'no invented status from a non-current action');
}
const pfSource=fs.readFileSync("widgets/proforma-manager/src/app/widget.html","utf8").replace("window.__PFW_TEST__={","window.__PFW_TEST__={newLOIWorksheetModel:newLOIWorksheetModel,buildLOIWorksheetPayload:buildLOIWorksheetPayload,loiContractType:loiContractType,");
const p=await pfReady({source:pfSource}),pf=p.widget;
assert.equal(pf.newLOIWorksheetModel({ID:PFID}).Agreement_Type,'PSA');
for(const value of [undefined,'','PSA','LOI']){
 const model=pf.recordToLOIWorksheet({ID:'90071992547419991',Agreement_Type:value},{ID:PFID});
 assert.equal(model.Agreement_Type,value==='LOI'?'LOI':'PSA');
 pf.S.ed={id:PFID,model:{ID:PFID},loi:model};
 assert.equal(pf.buildLOIWorksheetPayload(model).Agreement_Type,model.Agreement_Type);
 assert.equal(pf.loiContractType(value),value==='LOI'?'ACQ (LOI)':'ACQ (PSA)');
}
const backend=fs.readFileSync('creator/functions/Create_LOI_Contract.dg','utf8');
assert.match(backend,/ifnull\(loiRec\.Agreement_Type,"PSA"\)/);
assert.match(backend,/contractName = contractType \+ " - "/);
assert.match(backend,/Contract_Type=contractType/);
assert.match(backend,/Type_field == contractType/);
assert.doesNotMatch(backend,/Contract_Type="Acquisition"/);
assert.match(backend,/templateActions\.count\(\) == 0 && agreementType == "LOI"/);
assert.match(fs.readFileSync('creator/functions/proforma_save.dg','utf8'),/loiRec\.Agreement_Type=agreementType/);
console.log('PSA/LOI defaults, persistence, template separation, both module reports and Hold passed.');

