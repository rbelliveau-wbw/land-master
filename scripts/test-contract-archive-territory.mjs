import assert from 'node:assert/strict';
import {ready,drain,ID,ACTION} from './test-contract-sdk-v2-foundation.mjs';

for(const archived of [false,true]){
  const h=await ready({realDOM:true,accessFlags:{ctDeleteArchive:true}});
  h.reports.All_Contracts1[0].Archive=archived;h.c.findContract(ID).Archive=archived;
  const native=h.api.updateRecordById;
  h.api.updateRecordById=async config=>{
    assert.equal(config.payload.data.Archive,archived?'false':'true','decision box uses Creator string values');
    return native(config);
  };
  h.c.toggleArchive(ID);h.c.confirmProceed();await drain();
  assert.equal(h.c.truthy(h.reports.All_Contracts1[0].Archive),!archived);
  assert.equal(h.c.truthy(h.c.findContract(ID).Archive),!archived);
  assert.match(h.node('banners').innerHTML,archived?/Contract unarchived/:/Contract archived/);
  assert.equal(h.calls.filter(v=>v.method==='update').length,1);
}
for(const status of ['New','Complete'])for(const kind of ['ignored','missing','denied']){
  const h=await ready({realDOM:true,accessFlags:{ctDeleteArchive:true}});
  h.reports.All_Contracts1[0].Status=status;h.c.findContract(ID).Status=status;
  h.api.updateRecordById=async()=>{if(kind==='denied')throw {code:2898,message:'Permission denied'};if(kind==='missing')delete h.reports.All_Contracts1[0].Archive;return {code:3000,data:{ID}};};
  h.c.toggleArchive(ID);h.c.confirmProceed();await drain();
  assert.equal(h.c.findContract(ID).Archive,false,'failed/ignored archive never hides the row');
  assert.match(h.node('banners').innerHTML,/Save failed/);
  assert.doesNotMatch(h.node('banners').innerHTML,/Contract archived/);
}
for(const archived of [false,true]){
  const h=await ready({realDOM:true,accessFlags:{ctEdit:false,ctDeleteArchive:true}});
  Object.assign(h.reports.All_Contracts1[0],{Status:'Complete',Archive:archived});
  Object.assign(h.c.findContract(ID),{Status:'Complete',Archive:archived});
  h.c.kebabMenu({stopPropagation(){},currentTarget:h.node('mselb_type')},ID);
  const menu=h.c.document.querySelector('.kmenu');
  assert.match(menu.textContent,archived?/Unarchive/:/Archive/,'completed contract keeps its authorized Archive action');
  assert.doesNotMatch(menu.textContent,/Delete/,'completed contract cannot be deleted');menu.remove();
  assert.equal(h.c.mayEdit(ID),false);
  h.c.toggleArchive(ID);h.c.confirmProceed();await drain();
  assert.equal(h.c.truthy(h.reports.All_Contracts1[0].Archive),!archived);
  assert.equal(h.reports.All_Contracts1[0].Status,'Complete');
  assert.equal(h.calls.filter(v=>v.method==='update').length,1);
  assert.deepEqual(h.calls.find(v=>v.method==='update').config.payload.data,{Archive:archived?'false':'true'});
  await assert.rejects(h.c.updateRecord(ID,{Status:'New'}),/complete and read-only/);
  await assert.rejects(h.c.updateRecord(ID,{Archive:'false',Contract_Name:'Changed'}),/complete and read-only/);
  await assert.rejects(h.c.updateRecord(ACTION,{Dev_Notes:'Changed'},h.c.CFG.reports.actions),/complete and read-only/);
  await assert.rejects(h.c.sdkDeleteById(h.c.CFG.reports.contracts,ID),/complete and read-only/);
  assert.equal(h.calls.filter(v=>['update','delete','add'].includes(v.method)).length,1,'archive exception never unlocks other writes');
}
{
  const h=await ready({realDOM:true,accessFlags:{ctDeleteArchive:true}});
  h.reports.All_Contracts1[0].Status='Complete'; // Native status changed since the loaded list.
  await h.c.updateRecord(ID,{Archive:'true'});
  assert.equal(h.reports.All_Contracts1[0].Status,'Complete','fresh preflight permits only archiving after completion');
  await assert.rejects(h.c.updateRecord(ID,{Archive:'false',Status:'New'}),/complete and read-only/);
  assert.equal(h.calls.filter(v=>v.method==='update').length,1);
}
for(const accessFlags of [{ctDeleteArchive:false},{ctDeleteArchive:true,found:false,hasRow:false}]){
  const h=await ready({realDOM:true,accessFlags});
  h.reports.All_Contracts1[0].Status='Complete';h.c.findContract(ID).Status='Complete';
  h.c.kebabMenu({stopPropagation(){},currentTarget:h.node('mselb_type')},ID);
  assert.doesNotMatch(h.c.document.querySelector('.kmenu').textContent,/Archive|Unarchive|Delete/);
  await assert.rejects(h.c.updateRecord(ID,{Archive:'true'}),/permission to archive/);
  await assert.rejects(h.c.contractNativeMutation('update',h.c.CFG.reports.contracts,ID,{Archive:'true'}),/permission to archive/);
  assert.equal(h.calls.filter(v=>v.method==='update').length,0);
}
{
  const h=await ready({realDOM:true,pageParams:{workMode:'construction'},accessFlags:{constructionEditAll:true}});
  const row={...h.reports.All_Contracts1[0],Work_Module:'Construction',Status:'Complete'};
  h.reports.All_Contracts1=[row];h.c.S.contracts=[{...row}];
  h.c.kebabMenu({stopPropagation(){},currentTarget:h.node('mselb_type')},ID);
  assert.doesNotMatch(h.c.document.querySelector('.kmenu').textContent,/Archive|Unarchive|Delete/,'Construction completed behavior is unchanged');
  await assert.rejects(h.c.updateRecord(ID,{Archive:'true'}),/complete and read-only/);
  await assert.rejects(h.c.contractNativeMutation('update',h.c.CFG.reports.contracts,ID,{Archive:'true'}),/complete and read-only/);
  assert.equal(h.calls.filter(v=>v.method==='update').length,0);
}
{
  const h=await ready({realDOM:true});h.c.toggleArchive(ID);h.c.confirmProceed();await drain();
  assert.equal(h.calls.filter(v=>v.method==='update').length,0,'archive still requires its separate permission');
}
{
  const h=await ready();h.c.S.contracts=[
    {ID:'1',Contract_Name:'North',Territory:'Waco',Status:'New'},
    {ID:'2',Contract_Name:'South',Territory:'Austin',Status:'New'},
    {ID:'3',Contract_Name:'Blank',Territory:'',Status:'New'}];
  assert.deepEqual(Array.from(h.c.MSEL.fterritory.opts(),v=>v.v),['Austin','Waco']);
  h.c.S.fTerritories=['Waco'];assert.deepEqual(Array.from(h.c.filteredContracts(),v=>v.ID),['1']);
  h.c.S.fTerritories.push('Austin');assert.equal(h.c.filteredContracts().length,2);
  h.c.S.search='South';assert.deepEqual(Array.from(h.c.filteredContracts(),v=>v.ID),['2']);
  assert.equal(h.c.anyFilterOn(),true);h.c.clearAllFilters();assert.equal(h.c.S.fTerritories.length,0);
  assert.equal(h.c.S.search,'South','clearing dropdowns preserves main search');
  h.c.S.search='';h.c.renderHome();assert.match(h.node('view').innerHTML,/All territories/);
}
console.log('PASS Contracts open/completed archive/restore, unchanged completed edit/delete/child locks, fresh status checks, ignored/denied writes retain UI, separate permission guards, and territory filtering.');
