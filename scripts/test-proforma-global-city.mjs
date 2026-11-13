import assert from 'node:assert/strict';
import fs from 'node:fs';
import {harness} from './fixtures/proforma-sdk-v2-harness.mjs';
import {saveFixture} from './fixtures/proforma-sdk-v2-save-fixture.mjs';
const source=fs.readFileSync('widgets/proforma-manager/src/app/widget.html','utf8').replace('window.__PFW_TEST__={','window.__PFW_TEST__={loiChoiceList,loiComboSource,CFG,');
let cities=[' Temple ','College Station','Temple','','Future City'],fail=false;
const h=harness({source,invoke:config=>{
 if(/^Get_Land_Master_Choices/.test(config.api_name))return fail?{code:2898,message:'Denied'}:{code:3000,details:{output:JSON.stringify({...JSON.parse(fs.readFileSync('creator/app-variables/location-choices.json','utf8')),City:cities})}};
}});
await h.c.__pfBoot;await h.widget.ensurePFReferences();
assert.deepEqual(Array.from(h.widget.CFG.choices.cities),['College Station','Future City','Temple']);
assert.deepEqual(Array.from(h.widget.loiChoiceList('City')),['College Station','Future City','Temple']);
assert.deepEqual(Array.from(h.widget.loiComboSource({getAttribute:()=> 'city'})),['College Station','Future City','Temple']);
assert.equal(h.writes.length,0,'City API must be treated as read-only');
const choiceCalls=()=>h.calls.filter(call=>/^Get_Land_Master_Choices/.test(call.config.api_name||'')).length;
const loaded=choiceCalls();await h.widget.ensurePFLocationChoices();assert.equal(choiceCalls(),loaded,'financial editing and Offer references reuse one actor-bound global read');
for(const value of [null,'College Station']){
 h.widget.S.referenceContext='';h.widget.S.locationContext='';cities=value;
 await assert.rejects(h.widget.ensurePFReferences(),/City options/);
 assert.equal(h.widget.pfReferencesReady(),false);
}
h.widget.S.referenceContext='';h.widget.S.locationContext='';fail=true;
await assert.rejects(h.widget.ensurePFReferences());
assert.equal(h.widget.pfReferencesReady(),false);
fail=false;cities=['New Global City','College Station'];
await h.widget.ensurePFReferences();
assert.deepEqual(Array.from(h.widget.loiChoiceList('City')),['College Station','New Global City']);
assert.equal(h.writes.length,0);

for(const missing of ['County','Territory']){
 const cold=harness({invoke:config=>/^Get_Land_Master_Choices/.test(config.api_name)?{code:3000,result:JSON.stringify({...JSON.parse(fs.readFileSync('creator/app-variables/location-choices.json','utf8')),[missing]:null})}:undefined});
 await cold.c.__pfBoot;
 assert.equal(await cold.widget.openEdit(cold.storage.All_Pro_Formas_All_Fields[0].ID),false,'missing '+missing+' globals block editing, not the first screen');
 assert.equal(cold.widget.S.coreReady,true);assert.equal(cold.widget.S.ed.model,null);assert.equal(cold.writes.length,0);
}

// Reproduce the save that used to reject a City offered by the global picker.
for(const edited of [false,true]){
 const saved=[],city='College Station',seller='90071992547410111',company='90071992547410222',property='90071992547410333';
 const fixture=await saveFixture({invoke:(config,storage,body)=>{
  if(/^Get_Land_Master_Choices/.test(config.api_name))return {code:3000,result:JSON.stringify({City:[city,'Temple','Future City'],County:['Bell','Burleson','Future County'],Territory:['North Austin','Future Territory']})};
  if(body.op!=='save_loi')return undefined;
  saved.push(body.loi);
  return {code:3000,result:JSON.stringify({success:true,loiWorksheetId:'90071992547410444',propertyMap:edited?[]:[{tempId:'parcel',id:property}]})};
 }});
 const s=fixture.widget.S;
 s.companies=[{ID:company,Company_Name:'Fixture Company'}];
 s.builders=[{ID:seller,Builder_Name:'Fixture Seller'}];
 const row={Common_Name:'Caldwell Tract',Property_ID:'CAD-123',County:'Burleson',City:city,Acres:'100',TerraVault_URL:'https://example.com/parcel'};
 const offer={Buyer_Broker:'None',Seller_Broker:'None',Company:company,sellerIds:[seller],propertyIds:[],companyIds:[company],propertyAssignments:{},newSellers:[],newProperties:[],_editedSellers:{},_editedProperties:{}};
 if(edited){s.properties=[{ID:property,...row}];offer.propertyIds=[property];offer.propertyAssignments[property]={sellerId:seller,companyId:company};offer._editedProperties[property]=true;}
 else offer.newProperties=[{tempId:'parcel',sellerRef:seller,...row}];
 s.ed.loi=offer;s.ed.loiDirty=true;
 const draft=edited?s.properties[0]:offer.newProperties[0];
 for(const accepted of [city,'Temple','Future City','']){
  draft.City=accepted;
  assert.equal(fixture.widget.validateLOISubformDraft(offer).length,0,'global City and optional blank accepted for '+(edited?'edited':'new')+' Property');
 }
 for(const rejected of ['Killeen','Not A Global City']){
  draft.City=rejected;
  const before=fixture.calls.length;
  await fixture.widget.saveProforma();
  assert.match(JSON.stringify(s.ed.errors),/City: choose a supported value/);
  assert.equal(fixture.calls.slice(before).filter(c=>['custom','update','create','delete','upload'].includes(c.method)).length,0,'City outside the global list is rejected before writes, even if exported metadata includes it');
 }
 draft.City=city;draft.County='Invalid County';
 assert.match(fixture.widget.validateLOISubformDraft(offer).join('\n'),/County: choose a supported value/,'County keeps its own validation');
 draft.County='Future County';fixture.model.Territory='Future Territory';
 await fixture.widget.saveProforma();
 assert.equal(saved.length,1,'valid global City reaches the Offer save');
 assert.equal((edited?saved[0].editedProperties:saved[0].newProperties)[0].City,city,'global City is sent unchanged');
 assert.equal((edited?saved[0].editedProperties:saved[0].newProperties)[0].County,'Future County','global County saves');
 assert.equal(fixture.storage.All_Pro_Formas_All_Fields[0].Territory,'Future Territory','global Territory saves');
 assert.equal(s.ed.loiDirty,false,'Offer save completes');
 assert.equal(s.ed.dirty,false,'Pro Forma save completes');
}
console.log('PASS global City: picker loading, new/edited Property saves, global-only validation, optional blank, County validation, denied/malformed reads and retry.');
