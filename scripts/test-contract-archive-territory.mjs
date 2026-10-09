import assert from 'node:assert/strict';
import {ready,drain,ID} from './test-contract-sdk-v2-foundation.mjs';

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
for(const kind of ['ignored','missing','denied']){
  const h=await ready({realDOM:true,accessFlags:{ctDeleteArchive:true}});
  h.api.updateRecordById=async()=>{if(kind==='denied')throw {code:2898,message:'Permission denied'};if(kind==='missing')delete h.reports.All_Contracts1[0].Archive;return {code:3000,data:{ID}};};
  h.c.toggleArchive(ID);h.c.confirmProceed();await drain();
  assert.equal(h.c.findContract(ID).Archive,false,'failed/ignored archive never hides the row');
  assert.match(h.node('banners').innerHTML,/Save failed/);
  assert.doesNotMatch(h.node('banners').innerHTML,/Contract archived/);
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
console.log('PASS Contracts archive/restore persistence, ignored/denied writes retain UI, permission guards, and modern territory filtering with composed search/reset.');
