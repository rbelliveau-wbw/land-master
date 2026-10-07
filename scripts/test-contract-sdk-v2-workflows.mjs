import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ready,drain,deferred,ID,ACTION,SUB,ACCESS,NEW} from './test-contract-sdk-v2-foundation.mjs';
const writes=h=>h.calls.filter(call=>['add','update','delete'].includes(call.method));
function draft(h){
 h.c.S.nc={type:'DA',project:'',parent:'',sub:[SUB],wbw:[],builder:'',name:'Captured Legal45 contract',territory:'Austin',status:'Proposed',acts:[],seedSource:'default',owners:[ACCESS],lotIds:[],ppf:{},totalLots:'',emPerLot:'',initLots:'',initDays:'',contLots:'',contDays:''};
 return h.c.S.nc;
}
{
 const h=await ready({realDOM:true});draft(h);
 const result=await h.c.ncSubmit([{title:'First actual setup action',sort:1},{title:'Second setup action',sort:2}],[{email:'fixture@example.test',seq:1,type:'Legal',days:7}]);
 assert.equal(result.error,null);assert.equal(result.rows.filter(row=>row.state==='verified').length,5);
 assert.equal(writes(h).filter(row=>row.method==='add'&&row.config.form_name==='Contract').length,1);
 const parent=h.reports.All_Contracts1.find(row=>row.ID===NEW);assert.equal(parent.Status,'Proposed');assert.equal(parent.Current_Action,undefined,'creation leaves the native workflow-derived summary to Creator');assert.equal(h.c.currentActionText(NEW),'First actual setup action','verified children provide the displayed current action');
 const actions=h.reports.All_Contract_Actions.filter(row=>row.Contract1===NEW);assert.deepEqual(actions.map(row=>row.Contract_Action),['First actual setup action','Second setup action']);assert.deepEqual(actions.map(row=>row.Current_Action),[true,false]);
 const approvals=h.reports.All_Contract_Approvals.filter(row=>row.Contract1===NEW);assert.equal(approvals[0].Status,'Not Sent');assert.equal(approvals[0].Reminder_Interval_Days,7);assert.equal(approvals[0].Approval_Email,false);
 assert.equal(h.node('contractSaveOverlay').hidden,false);assert.equal(h.c.ContractSetupUI.close(),true);assert.equal(h.c.S.contractWorkflow,null);assert.equal(h.c.S.contractWorkflowHistory[0].entries.filter(row=>row.state==='verified').length,5);assert.equal(await h.c.ncSubmit([],[]),false);
}
console.log('PASS actual Legal45 setup: separate progress dialog, one captured parent, ordered verified actions/approval defaults and final status reset, retained ledger and duplicate guard.');
for(const envelope of [{code:3000},{code:3000,data:{ID:NEW},details:{code:2899}},{code:2899,details:{code:3000,data:{ID:NEW}}}]){
 const h=await ready({realDOM:true}),sourceDraft=draft(h),native=h.api.addRecords;let sent=0;
 h.api.addRecords=async config=>{sent++;await native(config);return envelope;};
 const result=await h.c.ncSubmit([{title:'Never sent child',sort:1}],[]);assert.ok(result.error);assert.equal(sent,1);assert.equal(result.rows[0].state,'unknown');assert.equal(h.c.S.nc,sourceDraft);assert.equal(h.c.S.contractWorkflow.finished,true);assert.equal(h.c.S.contractWorkflow.routine,false);assert.equal(h.node('contractSaveOverlay').hidden,false);assert.equal(await h.c.ncSubmit([],[]),false);assert.equal(h.c.clpCancel(),false);assert.equal(h.c.S.nc,sourceDraft);assert.equal(await h.c.loadData(),false);
 if(envelope.data||envelope.details?.data){assert.equal(await h.c.contractWorkflowRecheck(h.c.S.contractWorkflow),true);assert.equal(sent,1);assert.equal(h.c.S.contractWorkflow.entries[0].state,'verified');}else assert.equal(await h.c.contractWorkflowRecheck(h.c.S.contractWorkflow),false,'no returned ID cannot choose a created parent by guessing fields');
}
{
 const h=await ready({realDOM:true}),sourceDraft=draft(h),native=h.api.addRecords,gate=deferred();let sends=0;
 h.api.addRecords=config=>{sends++;return gate.promise.then(()=>native(config));};const pending=h.c.ncSubmit([{title:'Captured title',sort:1}],[]);await drain();assert.equal(sends,1);assert.equal(h.c.ContractSetupUI.close(),false);assert.equal(h.c.clpCancel(),false);assert.equal(h.c.closeOverlays(),false);h.c.ncSetTitle(0,'Replacement title');sourceDraft.name='Programmatic changed name';assert.equal(await h.c.ncSubmit([],[]),false);gate.resolve();const result=await pending;assert.equal(result.error,null);assert.equal(h.reports.All_Contracts1.find(row=>row.ID===NEW).Contract_Name,'Captured Legal45 contract');assert.equal(h.reports.All_Contract_Actions.find(row=>row.Contract1===NEW).Contract_Action,'Captured title');assert.equal(h.node('contractSaveResults').children.length,3,'creation retains verified results in the collapsed items list');assert.equal(result.rows.length,3);
}
{
 const h=await ready({realDOM:true}),native=h.api.addRecords;draft(h);let sent=0;h.api.addRecords=async config=>{sent++;if(config.form_name==='Contract_Actions'){await native(config);return {code:3000,result:[{code:3000,data:{ID:(BigInt(NEW)+1n).toString()}},{code:2945}]};}return native(config);};
 const result=await h.c.ncSubmit([{title:'Confirmed or uncertain first',sort:1},{title:'No later child',sort:2}],[]);assert.equal(sent,2);assert.equal(result.rows[0].state,'verified');assert.equal(result.rows[1].state,'unknown');assert.equal(result.rows.length,4);assert.equal(result.rows.filter(row=>row.state==='not-sent').length,2);assert.equal(h.c.S.contractWorkflow.cid,NEW);assert.equal(await h.c.ncSubmit([],[]),false);assert.equal(sent,2);assert.equal(await h.c.contractWorkflowRecheck(h.c.S.contractWorkflow),true);assert.equal(sent,2);assert.equal(h.reports.All_Contract_Actions.filter(row=>row.Contract1===NEW).length,1);
}
{
 const h=await ready({realDOM:true}),original=h.reports.All_Contracts1[0];Object.assign(original,{Contract_Type:'Lot (Master)',Lots1:[],Project:{},Parent_Contract:{},Territory:'Austin',Number_of_Lots:20,Initial_Takedown:5,Initial_Takedown_Days:30,Second_Closing_Lots:5,Second_Closing_Days:45,Subsequent_Takedown_Lots:3,Subsequent_Takedown_Days:60});Object.assign(h.c.findContract(ID),structuredClone(original));
 const v=draft(h);v.type='Lot (Master)';v.totalLots='25';h.c.S.clp={cid:ID,lots0:[],ppf0:'{}',terms:{Number_of_Lots:'25',Initial_Takedown:'5',Initial_Takedown_Days:'30',Second_Closing_Lots:'5',Second_Closing_Days:'45',Subsequent_Takedown_Lots:'3',Subsequent_Takedown_Days:'60'}};
 const result=await h.c.clpSave();assert.equal(result.error,null);assert.equal(h.reports.All_Contracts1[0].Number_of_Lots,25);assert.equal(writes(h).length,1);assert.equal(result.rows[0].state,'verified');assert.equal(h.c.S.contractWorkflowHistory[0].clp.terms.Number_of_Lots,'25','verified editor capture remains in the widget ledger');assert.equal(h.c.S.clp,null);assert.equal(h.c.document.getElementById('contractSaveOverlay'),null);
}
console.log('PASS actual setup unknown/partial/one-send/read-only recheck, captured draft/context and terminal controls; actual Legacy45 terms-only Lots/Pricing verified without financial defaults changed.');
{
 const LOT1=(BigInt(NEW)+70n).toString(),LOT2=(BigInt(NEW)+71n).toString(),PRICE1=(BigInt(NEW)+72n).toString(),PRICE2=(BigInt(NEW)+73n).toString();
 const h=await ready({realDOM:true}),c=h.reports.All_Contracts1[0];Object.assign(c,{Contract_Type:'Lot (Master)',Lots1:[{ID:LOT1}],Project:{},Parent_Contract:{},Territory:'Austin',Number_of_Lots:20});Object.assign(h.c.findContract(ID),structuredClone(c));
 const lotRows=[{ID:LOT1,Subdivision:{ID:SUB,zc_display_value:'Fixture phase'},Lot_Size:'40',Contract1:{},Status:'Open',Lot:'1',Block:'A'},{ID:LOT2,Subdivision:{ID:SUB},Lot_Size:'50',Contract1:{},Status:'Open',Lot:'2',Block:'A'}];h.reports.All_Active_Lots_Contracts_View=structuredClone(lotRows);h.c.S.lots=structuredClone(lotRows);h.reports.Contract_Pricing_Report=[{ID:PRICE1,Contract1:{ID},Lot_Size:'40',Price_per_Ft:'100.00',Base_Price:'$4,000.00'},{ID:PRICE2,Contract1:{ID},Lot_Size:'80',Price_per_Ft:'100',Base_Price:'$8,000.00'}];h.c.S.pricing=structuredClone(h.reports.Contract_Pricing_Report);
 const v=draft(h);v.type='Lot (Master)';v.lotIds=[LOT1,LOT2];v.ppf={'40':'125','50':'200'};v.totalLots='20';h.c.S.clp={cid:ID,lots0:[LOT1],ppf0:'{"40":"100"}',terms:{Number_of_Lots:'20',Initial_Takedown:'',Initial_Takedown_Days:'',Subsequent_Takedown_Lots:'',Subsequent_Takedown_Days:''}};
 const native=h.api.updateRecordById;h.api.updateRecordById=async config=>{const out=await native(config);if(config.report_name==='Contract_Pricing_Report'){const row=h.reports.Contract_Pricing_Report.find(row=>row.ID===config.id);row.Price_per_Ft=String(row.Price_per_Ft)+'.00';row.Base_Price='$5,000.00';}return out;};
 const result=await h.c.clpSave();assert.equal(result.error,null);assert.equal(result.rows.filter(row=>row.state==='verified').length,4);assert.equal(writes(h).filter(row=>row.method==='add').length,1);assert.equal(writes(h).filter(row=>row.method==='delete').length,1);assert.deepEqual(h.reports.Contract_Pricing_Report.map(row=>Number(row.Lot_Size)),[40,50]);assert.equal(h.reports.Contract_Pricing_Report.find(row=>Number(row.Lot_Size)===50).Base_Price,10000);assert.deepEqual(h.reports.All_Contracts1[0].Lots1,[LOT1,LOT2]);assert.equal(h.reports.All_Contracts1[0].Number_of_Lots,20,'captured total is preserved separately from two picked lots');
}
console.log('PASS actual CLP native fresh pricing reconciliation: exact captured lots; one update/create/delete; formatted financial readback; total-versus-picked semantics preserved.');
{
 const h=await ready({realDOM:true}),v=draft(h),PROJECT=(BigInt(NEW)+80n).toString();v.type='Lot (Master)';v.project=PROJECT;v.sub=[];v.builder=SUB;v.totalLots='20';v.emPerLot='($9,007,199,254,740,993.123456)';h.c.S.projects=[{ID:PROJECT,Territory:'Austin'}];
 const native=h.api.addRecords;h.api.addRecords=async config=>{const response=await native(config);if(config.form_name==='Contract'){const id=response.result[0].data.ID;Object.assign(h.reports.All_Contracts1.find(row=>row.ID===id),{Subdivision1:[],Earnest_Money_Per_Lot:'−$9,007,199,254,740,993.12345600'});}return response;};
 const result=await h.c.ncSubmit([{title:'Verify exact entered earnest money',sort:1}],[]);assert.equal(result.error,null);const sent=writes(h).find(call=>call.method==='add'&&call.config.form_name==='Contract').config.payload.data;
 assert.equal(sent.Earnest_Money_Per_Lot,'-9007199254740993.123456','Actual Contract create keeps entered money beyond Number precision');assert.equal(sent.Number_of_Lots,20);assert.equal(sent.Builder,SUB);assert.equal(sent.Project,PROJECT);assert.equal(h.c.contractHasReviews(),false);
}
{
 const h=await ready(),entered='$9,007,199,254,740,993.123456';draft(h);h.c.ncSetPpf('40',entered);assert.equal(h.c.S.nc.ppf['40'],'9007199254740993.123456','New/Change Lots & Pricing draft retains raw decimal digits');
 const captured=h.c.contractCapturedPricing(h.c.S.nc,[{size:'40'}],ID)[0];assert.equal(captured.Price_per_Ft,'9007199254740993.123456');assert.equal(captured.Base_Price,40*Number('9007199254740993.123456'));assert.equal(captured.Lot_Size,40);assert.equal(captured.Contract1,ID);
 const response=await h.c.createRecord(h.c.CFG.forms.pricing,captured);assert.equal(h.calls.find(call=>call.method==='add').config.payload.data.Price_per_Ft,'9007199254740993.123456');assert.equal(response.verifiedRow.Price_per_Ft,'9007199254740993.123456');
 const old={ID:(BigInt(NEW)+81n).toString(),Contract1:{ID},Lot_Size:'40',Price_per_Ft:'9007199254740993.123455',Base_Price:captured.Base_Price},operations=h.c.contractWorkflowPricingPlan({captured:{cid:ID,pricing:[captured]}},[old]);assert.equal(operations.length,1,'Pricing reconciliation compares entered decimal digits without Number aliasing');assert.equal(operations[0].data.Price_per_Ft,captured.Price_per_Ft);
 old.Price_per_Ft='$9,007,199,254,740,993.12345600';assert.equal(h.c.contractWorkflowPricingPlan({captured:{cid:ID,pricing:[captured]}},[old]).length,0,'Equivalent native trailing zeros do not trigger a rewrite');
}
console.log('PASS actual Contract creation and pricing-seed payload preserve entered monetary precision; typed counts and calculated base values retain existing behavior; reconciliation distinguishes neighboring decimals.');
