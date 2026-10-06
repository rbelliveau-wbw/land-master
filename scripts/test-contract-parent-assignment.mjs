import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ready,drain,ID} from './test-contract-sdk-v2-foundation.mjs';
const root='90071992547418881',other='90071992547418882',child='90071992547418883';
const draft=type=>({type,name:'New contract',territory:'Waco',parent:root,builder:'10',project:'p',sub:[],lotIds:[],wbw:[],owners:[],acts:[],ppf:{},esc:{},status:'Proposed'});
const records=()=>[
 {ID,Contract_Type:'Issue',Contract_Name:'Fixture child',Status:'New',Parent_Contract:null},
 {ID:root,Contract_Type:'Service Agreement',Contract_Name:'A & B <Master>',Territory:'Waco',Builder:{ID:'10'},Status:'New',Parent_Contract:null},
 {ID:other,Contract_Type:'DA',Contract_Name:'Other',Status:'New',Parent_Contract:null},
 {ID:child,Contract_Type:'CCR',Contract_Name:'Child',Status:'New',Parent_Contract:{ID:root}}
];
const setup=async()=>{const h=await ready({realDOM:true});h.reports[h.c.CFG.reports.contracts]=records();h.c.S.contracts=records();return h;};
{
 const {c}=await setup();
 for(const type of c.TYPES.filter(t=>!c.isLotType(t))){c.S.nc=draft(type);assert.match(c.ncFields(),/Parent .*Optional.*nc_parent_wrap/);assert.equal(c.ncPayload().Parent_Contract,root,type+' persists parent');}
 c.S.projects=[{ID:'p',Territory:'Waco'}];c.S.nc=draft('Lot (Master)');assert.match(c.ncFields(),/Parent .*Optional.*nc_parent_wrap/);assert.equal(c.ncPayload().Parent_Contract,root,'unlinked Lot Master can have a parent');
 assert.match(c.contractMasterBadge(c.findContract(root)),/Master.*<b>1<\/b>/);
 assert.match(c.lotHierarchyLabel(c.findContract(root)),/Master/,'all types display Master role');
 assert.match(c.drillRow(c.findContract(ID)),/Parent Contract.*Assign parent/);
 assert.doesNotMatch(c.contractParentSummary(c.findContract(root)),/contractParentOpen/,'Master assignment locked');
 assert.match(c.contractParentError({...draft('DA'),parent:other},root),/Master/);
 assert.match(c.contractParentError({...draft('DA'),parent:child},ID),/child contract/);
 assert.match(c.contractParentError({...draft('DA'),parent:ID},ID),/own parent/);
 assert.match(c.contractParentError({...draft('DA'),parent:'gone'},ID),/unavailable/);
 assert.deepEqual(Array.from(c.contractParentOptions(draft('DA'),ID),o=>o.v),[root,other]);
 c.S.nc=draft('DA');c.ncTintModal=()=>{};c.ncTypeChange('CCR');assert.equal(c.S.nc.parent,root,'ordinary type switch retains valid parent');
 c.S.contracts.push({ID:'lot',Contract_Type:'Lot (Master)',Builder:{ID:'10'},Project:{ID:'p'},Parent_Contract:null});c.S.subdivisions=[{ID:'phase',Project:{ID:'p'},Territory:'Waco'}];
 const v={...draft('Lot (Amendment)'),sub:['phase'],parent:'lot'};
 assert.equal(c.contractParentError(v,ID),'');assert.match(c.contractParentError({...v,parent:root},ID),/same Project and builder/);
 assert.equal(c.contractParentOptions({...v,builder:'wrong'},ID).length,0,'Amendment restriction retained');
 c.S.contracts.find(row=>row.ID==='lot').Parent_Contract=other;assert.match(c.contractParentError(v,ID),/child contract/);
}
{
 const h=await setup(),c=h.c;
 await c.contractParentOpen(ID);assert.equal(c.S.parentEdit.loading,false);assert.match(c.document.getElementById('overlays').innerHTML,/Save Parent/);
 c.S.parentEdit.parent=root;const before=h.calls.filter(x=>x.method==='update').length;await c.contractParentSave();await drain();
 assert.equal(h.reports[c.CFG.reports.contracts].find(x=>x.ID===ID).Parent_Contract,root);
 assert.equal(c.findContract(ID).Parent_Contract,root,'fresh persisted row merged');
 assert.equal(h.calls.filter(x=>x.method==='update').length,before+1,'one write');
 assert.equal(c.contractChildren(root).length,2);assert.equal(c.S.contractWorkflow,null);
 await c.contractParentOpen(ID);c.S.parentEdit.parent='';await c.contractParentSave();assert.equal(c.findContract(ID).Parent_Contract,null,'clear persists');
}
{
 const h=await setup(),c=h.c;await c.contractParentOpen(ID);c.S.parentEdit.parent=other;
 h.reports[c.CFG.reports.contracts].push({ID:'90071992547419990',Parent_Contract:ID});
 const writes=h.calls.filter(x=>x.method==='update').length;await c.contractParentSave();assert.equal(h.calls.filter(x=>x.method==='update').length,writes,'fresh child assignment blocks nesting');assert.match(c.document.getElementById('parent_error').textContent,/Master/);
}
{
 const h=await setup(),c=h.c;await c.contractParentOpen(ID);c.S.parentEdit.parent=root;
 h.reports[c.CFG.reports.contracts].find(x=>x.ID===root).Parent_Contract=other;
 await c.contractParentSave();assert.equal(h.calls.filter(x=>x.method==='update').length,0,'fresh parent becoming a child blocks save');
}
{
 const h=await setup(),c=h.c;await c.contractParentOpen(ID);c.S.parentEdit.parent=root;
 h.reports[c.CFG.reports.contracts].find(x=>x.ID===ID).Status='Complete';await c.contractParentSave();assert.equal(h.calls.filter(x=>x.method==='update').length,0,'fresh completion prevents edits');
}
{
 const h=await setup(),c=h.c;delete h.reports[c.CFG.reports.contracts][0].Parent_Contract;
 assert.equal(await c.contractParentOpen(ID),false);assert.match(c.S.parentEdit.error,/report fields/);assert.equal(c.document.getElementById('parent_save'),null,'unavailable links cannot authorize writes');
}
{
 const h=await setup(),c=h.c;c.S.nc=draft('Issue');
 await c.contractValidateParent(c.S.nc,'');h.reports[c.CFG.reports.contracts].find(x=>x.ID===root).Parent_Contract=other;
 await assert.rejects(c.contractValidateParent(c.S.nc,''),/child contract/,'create preflight reads fresh links');
}
{
 const h=await setup(),c=h.c;c.S.nc=draft('Issue');
 const add=h.api.addRecords;h.api.addRecords=async config=>{const out=await add(config);if(config.form_name===c.CFG.forms.contract)h.reports[c.CFG.reports.contracts].find(x=>x.ID===out.result[0].data.ID).Subdivision1=[];return out;};
 const result=await c.ncSubmit([],[]);
 assert.equal(result.error,null,'generic parent survives full create and final status verification');
 const created=h.reports[c.CFG.reports.contracts].find(x=>x.Contract_Name==='New contract');
 assert.equal(created.Parent_Contract,root);
 assert.equal(h.calls.filter(x=>x.method==='add'&&x.config.form_name===c.CFG.forms.contract).length,1);
}
{
 const h=await setup(),c=h.c;await c.contractParentOpen(ID);c.S.parentEdit.parent=root;
 h.api.updateRecordById=async()=>({code:3000,data:{ID}});await c.contractParentSave();
 assert.equal(c.findContract(ID).Parent_Contract,null,'unpersisted acknowledgement never becomes success');
 assert.equal(c.S.contractWorkflow.finished,true);assert.ok(c.contractHasReviews(),'uncertain write stays reviewable');
 await c.contractParentSave();assert.equal(c.findContract(ID).Parent_Contract,null,'Check status does not replay');
}

{
 const h=await setup(),c=h.c;c.S.nc={...draft('Issue'),parent:'',territory:'Austin',builder:'before'};
 c.ncSetParent(root);assert.equal(c.S.nc.territory,'Waco');assert.equal(c.S.nc.builder,'10');
 const html=c.ncFields();assert.ok(html.indexOf('nc_parent_wrap')<html.indexOf('Territory'),'Parent precedes inherited Territory');assert.ok(html.indexOf('nc_parent_wrap')<html.indexOf('Builder / Counterparty'));
 assert.doesNotMatch(html,/id="nc_territory"|id="mselb_ncbuilder"|id="nc_status"/,'inherited values are read-only and Status leaves the body');
 assert.match(c.ncStatusPill(),/Proposed/);assert.doesNotMatch(c.ncGeneralParentField(),/nc-f wide/);
 c.ncSetParent('');assert.equal(c.S.nc.territory,'Austin');assert.equal(c.S.nc.builder,'before');
 c.ncSetParent(root);c.S.nc.builder='tampered';assert.throws(()=>c.ncPayload(),/Select the parent again/);
 c.ncSetParent(root);h.reports[c.CFG.reports.contracts].find(row=>row.ID===root).Territory='Houston';
 const result=await c.ncSubmit([],[]);assert.ok(result.error);assert.equal(h.calls.filter(x=>x.method==='add').length,0,'a changed inherited Territory prevents creation');
 c.S.nc={...draft('Lot (Master)'),territory:'Waco'};c.S.projects=[{ID:'p',Territory:'Austin'}];assert.match(c.ncContextError(c.S.nc),/parent's Territory/);
 c.S.nc={...draft('Lot (Amendment)'),parent:'',territory:'Austin',builder:'before'};c.ncSetParent(root);assert.equal(c.S.nc.territory,'Austin');assert.equal(c.S.nc.builder,'before','Amendment matching context is retained');
}

const html=fs.readFileSync('widgets/contract-management/src/app/widget.html','utf8');
assert.match(html,/Assign Parent Contract/);assert.match(html,/parentKind\?'button type="button" aria-pressed=/);assert.match(html,/rows\[.*\]\.focus\(\)/);
const backend=fs.readFileSync('creator/workflows/Field_Validations_Contrac.dg','utf8');assert.match(backend,/childContracts.count\(\) > 0/);assert.match(backend,/parentContract.Parent_Contract != null/);assert.match(backend,/input.Contract_Type == "Lot \(Amendment\)"/);
console.log('PASS all-type Parent Contract creation/edit/clear, Master labels/lock, retained Amendment matching, fresh races, missing fields, readback and no replay.');
