import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ready,drain,deferred,ID,SUB,ACCESS} from './test-contract-sdk-v2-foundation.mjs';

const P1='90071992547419101',P2='90071992547419102',PF1='90071992547419103',PF2='90071992547419104',SUB2='90071992547419105',LOT='90071992547419106',CHILD='90071992547419107',BUILDER='90071992547419108';
const copy=value=>JSON.parse(JSON.stringify(value));
async function setup(overrides={}){
  const h=await ready({realDOM:true}),c=h.c;
  c.document.documentElement.contains=node=>c.document.body.contains(node);
  c.Event=class {constructor(type,options={}){this.type=type;this.bubbles=options.bubbles;}};
  h.reports.All_Projects=[{ID:P1,Project_Name:'Eastern Wells',Territory:'Waco'},{ID:P2,Project_Name:'Other Project',Territory:'Austin'}];
  h.reports.Contract_Proforma_Choices=[{ID:PF1,Name:'Eastern Wells Pro Forma',Territory:'Waco',LOI_Contract:{ID}},{ID:PF2,Name:'Acquisition <A & B> $1',Territory:'Austin',LOI_Contract:null}];
  h.reports.All_Subdivisions=[{ID:SUB,Subdivision_Name:'Eastern Wells - Phase 01',Subdivision_Code:'EW01',Project:{ID:P1,zc_display_value:'Eastern Wells'},Territory:'Waco'},
    {ID:SUB2,Subdivision_Name:'Eastern Wells - Phase 04',Subdivision_Code:'EW04',Project:{ID:P1,zc_display_value:'Eastern Wells'},Territory:'Waco'}];
  h.reports.All_Contracts1=[{ID,Contract_Name:'Column Fixture',Contract_Type:'DA',Status:'New',Owner:[{ID:ACCESS}],Project:{ID:P1,zc_display_value:'Eastern Wells'},Proforma:null,Subdivision1:[],Lots1:[],Parent_Contract:null,Builder:{ID:BUILDER},Territory:'Waco',...overrides}];
  c.S.contracts=c.contractNativeLabels(copy(h.reports.All_Contracts1));c.S.projects=copy(h.reports.All_Projects);c.S.projectsLoaded=true;
  c.S.subdivisions=c.contractNativeLabels(copy(h.reports.All_Subdivisions));c.S.subdivisionsAll=c.S.subdivisions.slice();
  c.contractLocationReferences();c.S.contractProformas=c.contractNativeLabels(copy(h.reports.Contract_Proforma_Choices));c.S.contractProformasLoaded=true;
  c.renderAll();return h;
}
const writes=h=>h.calls.filter(call=>call.method==='update');
const trigger=c=>c.document.getElementById('contract_location_'+ID);
const note=c=>trigger(c).parentNode.querySelector('.contract-location-message').textContent;
{
  const {c}=await setup(),row=c.findContract(ID);
  assert.match(c.renderTable([row]),/Pro Forma \/ Project/);
  assert.equal(c.contractLocationText(row),'Eastern Wells');
  assert.match(c.contractLocationCell(row),/contractLocationOpen/);
  for(const type of ['Lot','Lot (Master)','Lot (Amendment)']){
    row.Contract_Type=type;row.Subdivision1=[{ID:SUB,display_value:'A misleading phase label'},{ID:SUB2,display_value:'Another label'}];
    assert.equal(c.contractLocationText(row),'Eastern Wells — EW01, EW04',type);
    assert.match(c.contractLocationCell(row),/Eastern Wells — EW01, EW04/);
    row.Subdivision1=[{ID:SUB}];assert.equal(c.contractLocationText(row),'Eastern Wells — EW01','single phase uses record code too');
  }
  row.Contract_Type='Amendment';assert.equal(c.contractLocationText(row),'Eastern Wells','ordinary amendment shows Project only');
  row.Contract_Type='ACQ (LOI)';row.Proforma={ID:PF2,display_value:'old name'};
  assert.equal(c.contractLocationText(row),'Acquisition <A & B> $1','Acquisition shows Pro Forma instead of Project or phases');
  assert.match(c.contractLocationCell(row),/Acquisition &lt;A &amp; B&gt; \$1/,'lookup names are safely rendered');
  row.Contract_Type='ACQ (PSA)';assert.equal(c.contractLocationField(row),'Proforma');
}
{
  const {c}=await setup({Contract_Type:'ACQ (LOI)',Proforma:null}),row=c.findContract(ID);delete row.Proforma;
  assert.equal(c.contractLocationRef(row).fallback,true);assert.equal(c.contractLocationText(row),'Eastern Wells Pro Forma');
  assert.match(c.contractLocationTitle(row),/Contract Lookup Pending/);assert.equal(Object.hasOwn(row,'Proforma'),false,'reverse relation never pretends the lookup was persisted');
  c.S.contractProformas.push({ID:'90071992547419999',Name:'Ambiguous',LOI_Contract:{ID}});
  assert.equal(c.contractLocationText(row),'—','ambiguous reverse links never guess a source');
  row.Proforma={ID:PF2,display_value:'Saved lookup'};assert.equal(c.contractLocationRef(row).id,PF2,'direct persisted link takes precedence');
  row.Proforma=null;assert.equal(c.contractLocationRef(row).fallback,false,'an explicitly cleared native lookup stays clear');
}
{
  const h=await setup(),c=h.c,el=trigger(c);
  assert.equal(await c.contractLocationOpen({stopPropagation(){},preventDefault(){}},el,ID),true);
  assert.equal(c.document.getElementById('cboPop').querySelector('.cbo-search').style.display,'','lookup is searchable even with two choices');
  c.cboClose();assert.equal(await c.contractLocationSave(el,ID,P2),true);
  assert.equal(writes(h).length,1);assert.equal(writes(h)[0].config.payload.data.Project,P2);assert.equal(typeof writes(h)[0].config.id,'string');
  assert.equal(c.contractLocationText(c.findContract(ID)),'Other Project');assert.equal(el.classList.contains('saved-ok'),true);
  assert.equal(note(c),'');assert.equal(trigger(c),el,'save retains the mounted report control');
}
for(const type of ['ACQ (PSA)','ACQ (LOI)','Acquisition']){
  const h=await setup({Contract_Type:type,Proforma:{ID:PF1,zc_display_value:'Eastern Wells Pro Forma'}}),c=h.c;
  assert.equal(await c.contractLocationSave(trigger(c),ID,PF2),true);
  assert.deepEqual(writes(h).at(-1).config.payload.data,{Proforma:PF2});
  assert.equal(c.lookupId(c.findContract(ID).Proforma),PF2);assert.equal(c.contractLocationText(c.findContract(ID)),'Acquisition <A & B> $1');
}
{
  const h=await setup({Contract_Type:'ACQ (PSA)'}),c=h.c;delete h.reports.All_Contracts1[0].Proforma;delete c.findContract(ID).Proforma;
  assert.equal(await c.contractLocationSave(trigger(c),ID,PF2),false);assert.equal(writes(h).length,0);
  assert.match(note(c),/lookup is unavailable/);assert.equal(c.contractLocationRef(c.findContract(ID)).fallback,true);
}
{
  const h=await setup({Contract_Type:'ACQ (PSA)',Proforma:{ID:PF1,display_value:'Saved Pro Forma'}}),c=h.c;
  c.S.contractProformas=[];c.S.contractProformasLoaded=false;h.reports.Contract_Proforma_Choices=[{ID:PF1}];
  assert.equal(await c.contractLocationOpen({stopPropagation(){},preventDefault(){}},trigger(c),ID),false);
  assert.match(note(c),/report.*permissions/i);assert.equal(c.contractLocationText(c.findContract(ID)),'Saved Pro Forma','failed choices do not erase the persisted display');
}
{
  const h=await setup({Contract_Type:'Lot (Master)',Subdivision1:[{ID:SUB}],Lots1:[{ID:LOT}]}),c=h.c;
  h.reports.All_Active_Lots_Contracts_View=[{ID:LOT,Subdivision:{ID:SUB}}];
  assert.equal(await c.contractLocationSave(trigger(c),ID,P2),false);assert.equal(writes(h).length,0);
  assert.match(note(c),/selected Project/);assert.equal(c.lookupId(c.findContract(ID).Lots1),LOT,'incompatible project never prunes selected lots');
  assert.equal(c.lookupId(c.findContract(ID).Subdivision1),SUB,'incompatible project never prunes subdivisions');
}
{
  const h=await setup({Contract_Type:'Lot (Master)',Project:null,Subdivision1:[{ID:SUB}],Lots1:[{ID:LOT}]}),c=h.c;
  assert.equal(c.contractLocationText(c.findContract(ID)),'Eastern Wells — EW01','legacy Lot display derives a unique Project from its subdivisions');
  assert.match(c.contractLocationTitle(c.findContract(ID)),/Project From Selected Subdivisions/);
  assert.equal(c.findContract(ID).Project,null,'derived display never pretends the Project lookup was persisted');
  h.reports.All_Active_Lots_Contracts_View=[{ID:LOT,Subdivision:{ID:SUB}}];
  assert.equal(await c.contractLocationSave(trigger(c),ID,P1),true);assert.equal(writes(h).length,1);
  assert.equal(c.contractLocationText(c.findContract(ID)),'Eastern Wells — EW01');
  assert.ok(h.calls.some(call=>call.method==='records'&&call.config.report_name===c.CFG.reports.lots&&call.config.criteria.includes(LOT)),'reuses bounded exact-lot reads');
}
{
  const h=await setup({Contract_Type:'Lot (Master)',Project:null,Subdivision1:[{ID:SUB}],Lots1:[{ID:LOT}]}),c=h.c;
  h.reports.All_Active_Lots_Contracts_View=[{ID:LOT,Subdivision:{ID:SUB2}}];
  assert.equal(await c.contractLocationSave(trigger(c),ID,P1),false);assert.equal(writes(h).length,0);
  assert.match(note(c),/lot does not belong/);
}
{
  const h=await setup({Contract_Type:'Lot (Amendment)',Subdivision1:[{ID:SUB}],Lots1:[]}),c=h.c;
  assert.equal(await c.contractLocationSave(trigger(c),ID,P2),false);assert.equal(writes(h).length,0);
  assert.match(note(c),/subdivisions belong to another Project/,'amendment retains subdivision-derived Project');
}
{
  const h=await setup({Contract_Type:'Lot (Master)'}),c=h.c;
  const child={ID:CHILD,Contract_Type:'Lot (Amendment)',Parent_Contract:{ID},Project:{ID:P1},Subdivision1:[{ID:SUB}],Builder:{ID:BUILDER},Status:'New'};
  h.reports.All_Contracts1.push(child);c.S.contracts.push(copy(child));
  assert.equal(await c.contractLocationSave(trigger(c),ID,P2),false);assert.equal(writes(h).length,0);
  assert.match(note(c),/linked Lot Amendment/,'Master cannot invalidate linked amendment scope');
}
{
  const h=await setup(),c=h.c;c.findContract(ID).Status='Complete';c.renderAll();
  assert.doesNotMatch(c.contractLocationCell(c.findContract(ID)),/contractLocationOpen/);
  assert.equal(await c.contractLocationSave(trigger(c)||h.node('detached-location'),ID,P2),false);assert.equal(writes(h).length,0);
  c.findContract(ID).Status='New';c.S.acc.edit=false;c.S.acc.propose=false;
  assert.doesNotMatch(c.contractLocationCell(c.findContract(ID)),/contractLocationOpen/,'read-only actor has no inline editor');
}
{
  const h=await setup(),c=h.c,held=deferred(),native=h.api.updateRecordById;let sends=0;
  h.api.updateRecordById=config=>{sends++;return held.promise.then(()=>native(config));};
  const first=c.contractLocationSave(trigger(c),ID,P2);await drain();
  assert.equal(await c.contractLocationSave(trigger(c),ID,P2),false);assert.equal(sends,1);assert.equal(trigger(c).getAttribute('data-state'),'pending');
  held.resolve();assert.equal(await first,true);assert.equal(sends,1);
}
{
  const h=await setup(),c=h.c;h.api.updateRecordById=async()=>({code:2899,message:'Native permission denied'});
  assert.equal(await c.contractLocationSave(trigger(c),ID,P2),false);assert.equal(c.lookupId(c.findContract(ID).Project),P1);
  assert.match(note(c),/denied/i);assert.equal(trigger(c).classList.contains('saved-ok'),false);
}
{
  const h=await setup({Contract_Type:'Lot (Master)',Subdivision1:[{ID:SUB}],Lots1:[{ID:LOT}]}),c=h.c;
  h.reports.All_Active_Lots_Contracts_View=[{ID:LOT,Subdivision:{ID:SUB}}];
  await c.contractLocationOpen({stopPropagation(){},preventDefault(){}},trigger(c),ID);
  const index=Array.from(c.CBO.view).findIndex(option=>option.v===P2);c.cboPick(index);await drain();
  assert.equal(writes(h).length,0);assert.match(note(c),/selected Project/);
  assert.equal(trigger(c).querySelector('.cbo-txt').textContent,'Eastern Wells — EW01','actual native combo hook restores the saved label after rejected selection');
}
{
  const h=await setup(),c=h.c;
  await c.contractLocationOpen({stopPropagation(){},preventDefault(){}},trigger(c),ID);
  c.cboPick(Array.from(c.CBO.view).findIndex(option=>option.v===P2));await drain();
  assert.equal(writes(h).length,1);assert.equal(c.lookupId(c.findContract(ID).Project),P2,'actual native combo input/change/hook performs one native save');
}
{
  const h=await setup(),c=h.c;
  assert.equal(await c.contractLocationSave(trigger(c),ID,'invalid'),false);assert.equal(writes(h).length,0);assert.match(note(c),/Choose an available Project/);
  assert.equal(await c.contractLocationSave(trigger(c),ID,'90071992547419998'),false);assert.equal(writes(h).length,0);assert.match(note(c),/Project is unavailable/);
  assert.equal(await c.contractLocationSave(trigger(c),ID,''),true);assert.equal(c.findContract(ID).Project,null,'ordinary Project can be cleared');
}
{
  const h=await setup({Contract_Type:'ACQ (PSA)',Proforma:{ID:PF1,display_value:'Linked'}}),c=h.c;
  assert.equal(await c.contractLocationSave(trigger(c),ID,''),true);assert.equal(c.findContract(ID).Proforma,null);assert.equal(c.contractLocationText(c.findContract(ID)),'—','explicit acquisition clear is not replaced by reverse fallback');
}
{
  const h=await setup(),c=h.c,held=deferred(),native=h.api.getRecords;
  const second={...copy(h.reports.All_Contracts1[0]),ID:CHILD,Contract_Name:'Second Row'};h.reports.All_Contracts1.push(second);c.S.contracts.push(c.contractNativeLabels(copy(second)));c.renderAll();
  h.api.getRecords=config=>config.report_name===c.CFG.reports.projects?held.promise.then(()=>native(config)):native(config);
  c.S.projectsLoaded=false;
  const firstEl=trigger(c),secondEl=c.document.getElementById('contract_location_'+CHILD),event=()=>({stopPropagation(){},preventDefault(){}});
  const first=c.contractLocationOpen(event(),firstEl,ID),firstLoad=c.S.projectsLoading;
  assert.equal(await c.contractLocationOpen(event(),firstEl,ID),false,'a disabled loading trigger cannot start a duplicate opening');
  const secondOpen=c.contractLocationOpen(event(),secondEl,CHILD);assert.equal(c.S.projectsLoading,firstLoad,'both cells share one in-flight Project read');
  held.resolve();assert.equal(await first,false);assert.equal(await secondOpen,true);assert.equal(c.CBO.btn,secondEl,'latest clicked cell owns the popup');
  assert.equal(firstEl.getAttribute('data-state'),'ready');assert.equal(firstEl.disabled,false);
}
{
  const h=await setup(),c=h.c,held=deferred(),native=h.api.getRecords;c.S.contractProformasLoaded=false;
  h.api.getRecords=config=>config.report_name===c.CFG.reports.proformaChoices?held.promise.then(()=>native(config)):native(config);
  const pending=c.ensureContractProformas();await drain();c.LMRuntime.apply({envUrlFragment:'',loginUser:'next-actor@example.test'});c.contractLocationReferences();held.resolve();
  await assert.rejects(pending);assert.equal(c.S.contractProformas.length,0,'late former-actor Pro Forma choices cannot repopulate the new actor scope');
}
const source=fs.readFileSync('widgets/contract-management/src/app/widget.html','utf8');
assert.match(source,/proformaChoices: "Contract_Proforma_Choices"/);assert.match(source,/All_Contracts1\.Proforma='lookup'/);
console.log('PASS Pro Forma / Project column: native lookup shapes, acquisition types, subdivision codes, searchable inline saves, preserved lot scope/amendment linkage, report permissions, failures and duplicate protection.');
