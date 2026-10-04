import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app='widgets/land-master/src/app/';
const source=fs.readFileSync(app+'widget.html','utf8').replace(/\r\n/g,'\n');
function actual(name){const a=source.indexOf('function '+name+'('),b=source.indexOf('\nfunction ',a+1);assert.ok(a>=0&&b>a,name);return source.slice(a,b);}
const clone=value=>JSON.parse(JSON.stringify(value));
async function settle(){for(let i=0;i<90;i++)await Promise.resolve();}
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
const ID='90071992547409931', ID2='90071992547409932', PARENT='90071992547409933';
function harness({create,read}={}){
  const nodes=new Map(),writes=[],reads=[],statuses=[],toasts=[],server={},inputs=[];let generation=0,renders=0;
  function node(id){if(!nodes.has(id))nodes.set(id,{textContent:'',innerHTML:'',disabled:false,value:'',style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},insertAdjacentText(where,text){this.textContent+=text;}});return nodes.get(id);}
  function input(field,value,original=''){const el={value,disabled:false,getAttribute:key=>({'data-field':field,'data-ftype':'text','data-original':original}[key]||'')};inputs.push(el);return el;}
  const c=vm.createContext({document:{querySelectorAll:selector=>selector.includes('data-req')?[]:inputs,getElementById:node},CFG:{reportCandidates:{}},
    S:{demo:false,liveSDK:true,coreRefreshing:false,panelLoading:false,panelSaving:false,editorNew:true,editorType:'property',editorId:null,editorDraft:{},panelDirty:true,modalOpen:true,modalTab:'details',navigationToken:0,properties:[],projects:[],subdivisions:[],companies:[],externalMappings:[],lots:[]},
    LandData:{coreReady:()=>true,generation:()=>generation},$ :node,diag(){},setStatus:(kind,message)=>statuses.push(message),renderCounts(){},renderPanel(){renders++;c.updatePanelActionState();},closeRecordModal(){c.S.modalOpen=false;},showToast:message=>toasts.push(message),lookupLabel:()=>'',defaultSubName:seq=>'Fixture phase '+seq,
    currentEditor(){return c.S.editorNew?c.S.editorDraft:c.listForType(c.S.editorType).find(row=>row.ID===c.S.editorId);},
    ZOHO:{CREATOR:{DATA:{
      addRecords:async config=>{writes.push(clone(config));return create?create(config,writes.length,server):{code:3000,data:{ID}};},
      updateRecordById:async config=>{writes.push(clone(config));return{code:3000,data:{ID:config.id,status:' FAILURE ',error:'Denied'}};},
      getRecordCount:async config=>{reads.push({kind:'count',...clone(config)});const rows=read?await read(config,server):server[config.report_name]||[];return{code:3000,result:{records_count:String(rows.length)}};},
      getRecords:async config=>{reads.push({kind:'records',...clone(config)});return{code:3000,data:clone(read?await read(config,server):server[config.report_name]||[])};}
    }}}});c.window=c;
  vm.runInContext(fs.readFileSync(app+'runtime-context.js','utf8'),c);c.LMRuntime.apply({envUrlFragment:'/environment/development',loginUser:'fixture'});
  vm.runInContext(fs.readFileSync(app+'creator-data.js','utf8'),c);
  vm.runInContext(fs.readFileSync(app+'land-data.js','utf8'),c);
  for(const name of ['errMeta','errorResponseCode','responseBad','isEmptyCode','candidates','sdkGetAll','isSuccess','requireMutationSuccess','updateRecord','formForType','extractRecordId','landCreateFreeze','landCreateScope','landCreateGeneration','landCreateKey','landCreateStore','landCreateReviewForEditor','landCreateCandidateId','landCreateFailure','landCreatedRow','landCreateComparable','landCreatePayloadMatches','showLandCreateReview','recheckLandCreate','createRecord','reportForType','listForType','inputRaw','normalizedRaw','panelHasChanges','updatePanelActionState','payloadValue','applyLocalField','externalMappingDraftHasChanges','performExternalMappingOperation','finishExternalMappingSave','saveExternalMappings','projectFieldValue','subdivisionDraftHasRows','subdivisionPayloadFromRow','createStagedSubdivisions','allowTableEdit','savePanel','addExternalMappingRow','syncExternalMappingInput','addSubdivisionRow','syncSubdivisionInput'])vm.runInContext(actual(name),c);
  c.esc=value=>String(value).replace(/[<>&"]/g,'');
  return{c,nodes,node,input,inputs,writes,reads,statuses,toasts,server,advance:()=>generation++,renders:()=>renders};
}

// Actual generic editor/native add path: immutable payload, input locks, no unknown retry.
{
  const held=deferred(),h=harness({create:()=>held.promise}),c=h.c,field=h.input('Common_Name','Fixture property');
  c.savePanel();await settle();assert.equal(h.writes.length,1);assert.equal(field.disabled,true);assert.equal(c.S.panelSaving,true);
  assert.equal(c.addExternalMappingRow(),false);assert.equal(c.addSubdivisionRow(),false);assert.equal(c.syncExternalMappingInput({}),false);assert.equal(c.syncSubdivisionInput({}),false,'Public draft mutation callbacks cannot change captured work during the native create');
  assert.equal(c.savePanel(),undefined);assert.equal(h.writes.length,1);held.resolve({code:3000});await settle();
  assert.equal(c.S.editorNew,true);assert.equal(field.value,'Fixture property');assert.equal(field.disabled,true);assert.equal(h.node('btnPanelSave').disabled,true);assert.equal(c.savePanel(),false);assert.equal(h.writes.length,1);assert.equal(h.toasts.length,0);
  h.server.All_Property=[{ID,Common_Name:'Fixture property'}];assert.equal(await c.recheckLandCreate('property'),false,'A matching name cannot identify an unknown created record ID');
  assert.equal(h.writes.length,1);assert.ok(c.S.createReviews.property);assert.ok(h.reads.every(call=>!call.criteria&&(!call.field_config||call.field_config==='all')));assert.equal(field.value,'Fixture property');
}
// Late verification cannot repaint a newer panel, and a core generation/session change cannot clear a quarantine.
for(const change of ['navigation','generation','actor']){
  const h=harness({create:(config,n,server)=>{server.All_Property=[{ID,...clone(config.payload.data)}];return{code:3000,data:{ID,success:false}};}}),c=h.c;h.input('Common_Name','Captured property');c.savePanel();await settle();
  const held=deferred(),native=c.ZOHO.CREATOR.DATA.getRecords;c.ZOHO.CREATOR.DATA.getRecords=config=>held.promise.then(()=>native(config));const checking=c.recheckLandCreate('property');await settle();
  if(change==='navigation'){c.S.navigationToken++;c.S.editorType='company';c.S.editorNew=true;c.S.editorDraft={};h.inputs.splice(0);h.input('Company_Name','Later company draft');}
  if(change==='generation')h.advance();if(change==='actor')c.LMRuntime.apply({envUrlFragment:'',loginUser:'another actor'});
  const renders=h.renders();held.resolve();const result=await checking;assert.equal(h.writes.length,1);
  if(change==='navigation'){assert.equal(result,true);assert.equal(c.S.editorType,'company');assert.equal(h.inputs[0].value,'Later company draft');assert.equal(h.renders(),renders,'An old verification must not rerender the new editor');}
  else{assert.equal(result,false);assert.ok(c.S.createReviews.property);assert.equal(c.S.properties.length,0);assert.equal(c.S.editorNew,true);}
}
// Known acknowledged ID requires exact fresh fields. Read-only recovery converts this same draft into the saved record.
for(const response of [{code:3000,data:{ID},result:[{code:3000,data:{ID}}]},{code:3000,result:[{code:3000,data:{ID}},{code:3000,data:{ID}}]},{code:3000,result:[{code:3000,data:{ID},result:[{code:3000,data:{ID:ID2}}]}]}]){
  const h=harness({create:()=>response}),c=h.c;h.input('Common_Name','Ambiguous property');c.savePanel();await settle();assert.equal(c.S.createReviews.property.id,'','Competing/duplicate/nested envelopes cannot select a candidate record ID');assert.equal(c.savePanel(),false);assert.equal(h.writes.length,1);assert.equal(h.toasts.length,0);
}
{
  const h=harness({create:(config,n,server)=>{server.All_Property=[{ID,...clone(config.payload.data)}];return{code:3000,data:{ID,status:'failure'}};}}),c=h.c;h.input('Common_Name','Fixture property');
  c.savePanel();await settle();assert.equal(h.writes.length,1);assert.equal(c.S.editorNew,true);assert.equal(c.S.createReviews.property.id,ID);
  h.server.All_Property[0].Common_Name='Different';assert.equal(await c.recheckLandCreate('property'),false);assert.equal(c.S.editorNew,true);assert.ok(c.S.createReviews.property);
  h.server.All_Property[0].Common_Name='Fixture property';assert.equal(await c.recheckLandCreate('property'),true);assert.equal(h.writes.length,1);assert.equal(c.S.editorNew,false);assert.equal(c.S.editorId,ID);assert.equal(c.S.properties.length,1);assert.equal(c.S.properties[0].ID,ID);assert.equal(c.S.createReviews.property,undefined);assert.ok(h.reads.filter(call=>call.kind==='records').every(call=>call.criteria==='(ID == '+ID+')'&&call.field_config==='all'));
}
// Fresh readback compares native lookup objects/multi-ID sets against the immutable write payload.
{
  const h=harness({create:(config,n,server)=>{server.All_Property=[{ID,Website:{url:'https://different.test/',metadata:{label:'Different',options:['one']}}}];return{code:3000,data:{ID,success:false}};}}),c=h.c;
  await assert.rejects(c.createRecord('property',{Website:{metadata:{options:['one'],label:'Captured'},url:'https://captured.test/'}}));
  assert.equal(await c.recheckLandCreate('property'),false,'Distinct nested URL/value objects cannot collapse to the same object string');assert.ok(c.S.createReviews.property);assert.equal(c.S.properties.length,0);assert.equal(h.writes.length,1);
  h.server.All_Property[0].Website={url:'https://captured.test/',metadata:{label:'Captured',options:['one']}};assert.equal(await c.recheckLandCreate('property'),true,'Equivalent recursive objects compare independent of key order');assert.equal(h.writes.length,1);assert.equal(c.S.properties.length,1);
  assert.notEqual(JSON.stringify(c.landCreateComparable({ID:'invalid',url:'one'})),JSON.stringify(c.landCreateComparable({ID:'invalid',url:'two'})),'Invalid lookup IDs cannot erase the remaining object fields');
}
{
  const h=harness({create:(config,n,server)=>{server.All_Property=[{ID,Common_Name:'Fixture lookup',Company1:{ID:PARENT,display_value:'Company'},Projects:[{ID:ID2,display_value:'B'},{ID,display_value:'A'}]}];return{code:3000,data:{ID,success:false}};}}),c=h.c,data={Common_Name:'Fixture lookup',Company1:PARENT,Projects:[ID,ID2]};
  await assert.rejects(c.createRecord('property',data));data.Projects.push('90071992547409935');assert.equal(c.S.createReviews.property.payload.Projects.length,2);assert.equal(Object.isFrozen(c.S.createReviews.property.payload.Projects),true);assert.equal(await c.recheckLandCreate('property'),true);assert.equal(h.writes.length,1);assert.equal(c.S.properties.length,1);
}
{
  const h=harness(),c=h.c;h.input('Common_Name','Fixture property');c.savePanel();await settle();assert.equal(h.writes.length,1);assert.equal(c.S.properties.length,1);assert.equal(c.S.properties[0].ID,ID);assert.equal(c.S.editorNew,false);assert.equal(h.toasts.length,1);assert.equal(h.writes[0].skip_workflow,undefined);assert.equal(h.writes[0].payload.skip_workflow,undefined);
}
// Default workflows and known rejection behavior remain; workflow/server errors never prove absence.
for(const code of [2899,2945,3001,3002])for(const singleResult of [false,true]){
  const rejected={code,message:'Fixture native error'},response=singleResult?{code:3000,result:[rejected]}:rejected;
  const h=harness({create:()=>response}),c=h.c;h.input('Common_Name','Fixture property');c.savePanel();await settle();
  if(code===2899||code===2945){assert.equal(c.S.createReviews.property,undefined);assert.equal(h.node('btnPanelSave').disabled,false);c.savePanel();await settle();assert.equal(h.writes.length,2);}else{assert.ok(c.S.createReviews.property);assert.equal(c.savePanel(),false);assert.equal(h.writes.length,1);}
}
// Preserve the entire native envelope: an inner rejection cannot authorize another public create when a sibling/competing leaf looks applied.
for(const code of [2899,2945])for(const response of [
  {code:3000,result:[{code:3000,data:{ID}},{code,message:'Later record failed'}]},
  {code:3000,data:{ID},result:[{code,message:'Competing record failed'}]},
  {code:3000,data:{ID},result:[{code,data:{ID},message:'Matching competing record failed'}]},
  {code:3000,data:{ID},result:[{code,data:{ID:ID2},message:'Conflicting competing record failed'}]},
  {code:3000,result:[{code,result:[{code:3000,data:{ID}}],message:'Nested record failed'}]}
]){
  const property=harness({create:()=>response}),pc=property.c;property.input('Common_Name','Retained compound property');pc.savePanel();await settle();
  const propertyReview=pc.S.createReviews.property;assert.ok(propertyReview);assert.equal(propertyReview.id,'');assert.equal(String(propertyReview.error.code),String(code));assert.equal(propertyReview.error.raw,response);assert.equal(propertyReview.error.response,response);assert.equal(propertyReview.error.noReplay,true);
  assert.equal(pc.savePanel(),false);assert.equal(property.writes.length,1);assert.equal(property.inputs[0].value,'Retained compound property');assert.equal(pc.S.properties.length,0);assert.equal(property.toasts.length,0);
  const mapping=harness({create:()=>response}),mc=mapping.c;mc.S.editorNew=false;mc.S.editorType='subdivision';mc.S.editorId=PARENT;mc.S.modalTab='externalMappings';
  const mappingRow={key:'compound',id:'',system:'GP',code:'000073',isNew:true};mc.S.mappingDraft={subdivisionId:PARENT,rows:[mappingRow]};mc.saveExternalMappings();await settle();
  const mappingReview=mc.S.createReviews.externalMapping;assert.ok(mappingReview);assert.equal(mappingReview.id,'');assert.equal(String(mappingReview.error.code),String(code));assert.equal(mappingReview.error.raw,response);assert.equal(mc.saveExternalMappings(),false);assert.equal(mapping.writes.length,1);assert.equal(mappingRow.code,'000073');assert.equal(mappingRow.isNew,true);assert.equal(mc.S.externalMappings.length,0);
  const staged=harness({create:()=>response}),sc=staged.c;sc.S.editorNew=false;sc.S.editorType='project';sc.S.editorId=PARENT;sc.S.subdivisionDraft={key:PARENT,rows:['a','b'].map((key,index)=>({key,name:'Retained '+key,code:key,phase:String(index+1),status:'Active',generateForecasts:false,seq:index+1}))};
  const outcome=await sc.createStagedSubdivisions(PARENT),phaseReview=sc.S.createReviews.subdivision;assert.equal(outcome.unknown,true);assert.equal(outcome.created,0);assert.ok(phaseReview);assert.equal(phaseReview.id,'');assert.equal(String(phaseReview.error.code),String(code));assert.equal(phaseReview.error.raw,response);await sc.createStagedSubdivisions(PARENT);assert.equal(staged.writes.length,1);assert.deepEqual(Array.from(sc.S.subdivisionDraft.rows,row=>row.key),['a','b']);assert.equal(sc.S.subdivisions.length,0);
}
// Actual editor rejects failure flags inside native data and never applies a local-only Saved change.
{
  const h=harness(),c=h.c;c.S.editorNew=false;c.S.editorId=ID;c.S.properties=[{ID,Notes:'persisted'}];h.input('Notes','unsaved','persisted');c.savePanel();await settle();assert.equal(c.S.properties[0].Notes,'persisted');assert.equal(h.toasts.length,0);assert.equal(c.S.modalOpen,true);assert.ok(!h.statuses.includes('Saved'));
}
// Actual external mapping batch preserves confirmed rows and quarantines the unknown row before another insert.
{
  const h=harness({create:(config,n,server)=>{if(n===1)return{code:3000,data:{ID}};server.All_External_System_Mappings=[{ID:ID2,...clone(config.payload.data)}];return{code:3000,data:{ID:ID2,success:false}};}}),c=h.c;
  c.S.editorNew=false;c.S.editorType='subdivision';c.S.editorId=PARENT;c.S.modalTab='externalMappings';const rows=[{key:'a',id:'',system:'GP',code:'one',isNew:true},{key:'b',id:'',system:'HCSS',code:'two',isNew:true}];c.S.mappingDraft={subdivisionId:PARENT,rows};
  c.saveExternalMappings();await settle();assert.equal(h.writes.length,2);assert.equal(rows[0].id,ID);assert.equal(rows[0].isNew,false);assert.equal(rows[1].isNew,true);assert.equal(c.S.externalMappings.length,1);assert.equal(c.saveExternalMappings(),false);assert.equal(h.writes.length,2);
  assert.equal(await c.recheckLandCreate('externalMapping'),true);assert.equal(rows[1].id,ID2);assert.equal(rows[1].isNew,false);assert.equal(c.S.externalMappings.length,2);c.saveExternalMappings();await settle();assert.equal(h.writes.length,2,'Recovered and confirmed mapping creates are never resent');
}
// Actual staged phases retain unsent drafts and stop at an unknown child; recovering the exact child leaves only unsent work.
{
  const h=harness({create:(config,n,server)=>{if(n===1)return{code:3000,data:{ID}};if(n===2){server.All_Subdivisions=[{ID:ID2,...clone(config.payload.data),Project:{ID:PARENT}}];return{code:3000,data:{ID:ID2,error:'Unconfirmed'}};}return{code:3000,data:{ID:'90071992547409934'}};}}),c=h.c;
  c.S.editorNew=false;c.S.editorType='project';c.S.editorId=PARENT;c.S.subdivisionDraft={key:PARENT,rows:['a','b','c'].map((key,index)=>({key,name:'Fixture '+key,code:key,phase:String(index+1),status:'Active',generateForecasts:false,seq:index+1}))};
  const result=await c.createStagedSubdivisions(PARENT);assert.equal(result.created,1);assert.equal(result.unknown,true);assert.equal(h.writes.length,2);assert.deepEqual(Array.from(c.S.subdivisionDraft.rows,row=>row.key),['b','c']);await c.createStagedSubdivisions(PARENT);assert.equal(h.writes.length,2);
  assert.equal(await c.recheckLandCreate('subdivision'),true);assert.deepEqual(Array.from(c.S.subdivisionDraft.rows,row=>row.key),['c']);assert.equal(c.S.subdivisions.length,2);await c.createStagedSubdivisions(PARENT);assert.equal(h.writes.length,3);assert.equal(c.S.subdivisions.length,3);assert.equal(c.S.subdivisionDraft.rows.length,0);
}
// Import's uniqueness scope remains per Lot_Code: another code is distinct work, the unknown code is never replayed.
{
  const h=harness({create:()=>({code:3000})}),c=h.c;await assert.rejects(c.createRecord('lot',{Lot_Code:'AA-B01-L001'}));await assert.rejects(c.createRecord('lot',{Lot_Code:'AA-B01-L001'}));assert.equal(h.writes.length,1);await assert.rejects(c.createRecord('lot',{Lot_Code:'AA-B01-L002'}));assert.equal(h.writes.length,2);assert.equal(h.writes[0].payload.data.Lot_Code,'AA-B01-L001');
}
assert.ok(source.includes("createCheck.getAttribute('data-recheck-land-create')"),'Mounted panel action invokes the same read-only controller');
console.log('PASS: Land actual panel/mapping/staged native create flows retain unknown drafts, block manual replay, preserve confirmed partial IDs, require exact read-only recovery, and reject native data failures.');
