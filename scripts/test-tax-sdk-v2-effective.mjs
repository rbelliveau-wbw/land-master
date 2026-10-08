// Actual effective Tax SDK2 functions and native-shaped fixtures. No live writes.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {source,extract,readTaxScript} from './fixtures/tax-source.mjs';
import {harness as actualHarness} from './fixtures/tax-effective-harness.mjs';
const clone=value=>JSON.parse(JSON.stringify(value));
const wait=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
function held(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
const ID='90071992547409941',ID2='90071992547409942',ID3='90071992547409943';
const raw=(id,index=0)=>({ID:id,Tax_Parcel_Year_Code:'Fixture-'+index,Property_ID:'000073',Tax_Year:'2026',Status:'Awaiting Assessment',Market_Value:'100',Assessed_Value:'100',County:'Fixture',Archived:false,Company1:'',Property1:'',Arbitrate1:''});
function harness({rows=[raw(ID)],propertyCount=1,countOverride,readHook,updateHook,createHook,initHook,timeout=5000,ui=false}={}){
  const h=actualHarness(['mapParcelYears','mapRawLand','mapCompanies','mapSubdivisions','mapJurisdictions','mapProjects','pruneBulkSelection','getFilteredRows','getPagedRows','renderLotRow','renderTable','getPropBulkIds','saveModalRecord']);const c=h.context;c.window=c;
  const storage={All_Tax_Parcel_Years:clone(rows),All_Property:Array.from({length:propertyCount},(_,index)=>({ID:(90071992547420000n+BigInt(index)).toString(),Common_Name:'Fixture Property '+index,Property_ID:'000073',Land_Type:'Original',County:'Fixture',Company1:'',Projects:[]})),All_Companies:[],All_Subdivisions:[],All_Taxing_Jurisdictions:[],All_Projects:[]};
  const calls=[],writes=[],progress=[],recoveries=[];let nativeActive=0,maxActive=0,handshakes=0;
  const filtered=config=>{const match=String(config.criteria||'').match(/^\(ID == (\d+)\)$/);return match?(storage[config.report_name]||[]).filter(row=>row.ID===match[1]):storage[config.report_name]||[];};
  async function native(kind,config,invoke){calls.push({kind,config:clone(config)});nativeActive++;maxActive=Math.max(maxActive,nativeActive);try{return await invoke();}finally{nativeActive--;}}
  c.ZOHO={CREATOR:{UTIL:{getInitParams:async()=>{handshakes++;return initHook?initHook(handshakes):{envUrlFragment:'/environment/development',loginUser:'fixture'};}},DATA:{
    getRecordCount:config=>native('count',config,async()=>({code:3000,result:{records_count:String(countOverride?countOverride(config,storage):filtered(config).length)}})),
    getRecords:config=>native('rows',config,async()=>{if(readHook){const override=await readHook(config,storage);if(override!==undefined)return override;}const all=filtered(config),offset=Number(config.record_cursor||0),page=all.slice(offset,offset+200),next=offset+page.length;return{code:3000,data:clone(page),...(next<all.length?{record_cursor:String(next)}:{})};}),
    updateRecordById:config=>native('update',config,async()=>{writes.push(clone(config));const apply=()=>{const row=storage[config.report_name].find(row=>row.ID===config.id);assert.ok(row);Object.assign(row,clone(config.payload.data));};if(updateHook)return updateHook(config,apply,writes.length);apply();return{code:3000,data:{ID:config.id}};}),
    addRecords:config=>native('create',config,async()=>{writes.push(clone(config));const apply=(id='90071992547777777')=>{const report=config.form_name==='Property'?'All_Property':'All_Tax_Parcel_Years';storage[report].push({ID:id,...clone(config.payload.data)});return id;};return createHook?createHook(config,apply,writes.length):{code:3000};})
  }}};
  c.setTimeout=setTimeout;c.clearTimeout=clearTimeout;
  vm.runInContext(readTaxScript('runtime-context.js'),c);
  vm.runInContext(readTaxScript('creator-data.js'),c);
  vm.runInContext(readTaxScript('tax-controller.js'),c);
  const fieldsByReport=Object.fromEntries([['All_Property','Property'],['All_Tax_Parcel_Years','Tax_Parcel_Year']].map(([report,form])=>[report,Object.fromEntries(JSON.parse(fs.readFileSync('creator/generated/fields/'+form+'.json','utf8')).fields.map(field=>[field.link_name,field]))]));
  let TaxUI;
  if(ui){
    const listeners=new Map(),decorate=(value,tag='div')=>{value.tagName=tag.toUpperCase();value.children=[];value.attrs={};value.listeners=new Map();value.isConnected=true;value.appendChild=child=>{child.parentNode=value;value.children.push(child);return child;};value.setAttribute=(name,text)=>{value.attrs[name]=String(text);};value.getAttribute=name=>value.attrs[name];value.addEventListener=(name,callback)=>value.listeners.set(name,callback);value.dispatch=(name,event={})=>value.listeners.get(name)?.(event);value.focus=()=>{c.document.activeElement=value;};value.querySelectorAll=selector=>value.children.flatMap(child=>[...(selector==='button'&&child.tagName==='BUTTON'||selector==='svg'&&child.tagName==='SVG'?[child]:[]),...child.querySelectorAll(selector)]);value.querySelector=selector=>value.querySelectorAll(selector)[0]||null;let text=value.textContent||'';Object.defineProperty(value,'textContent',{get:()=>text,set:next=>{text=String(next);value.children=[];},configurable:true});let id='';Object.defineProperty(value,'id',{get:()=>id,set:next=>{id=next;if(id)h.nodes.set(id,value);},configurable:true});return value;};
    const originalDollar=c.$;c.$=id=>{const value=originalDollar(id);if(value&&!value.children)decorate(value);return value;};
    c.document.getElementById=id=>h.nodes.get(id)||null;c.document.createElement=tag=>decorate({style:{},dataset:{},hidden:false,disabled:false},tag);c.document.createElementNS=(_,tag)=>c.document.createElement(tag);c.document.addEventListener=(name,fn)=>listeners.set(name,fn);c.document.dispatch=(name,event)=>listeners.get(name)?.(event);c.document.body=c.document.createElement('body');c.document.head=c.document.createElement('head');
    for(const id of ['toolbar','toolbarRow2','tableWrap','propPanel','yearSwitcher','topPager','propPager','modalOverlay','propPickOverlay','bulkEditOverlay','addTPYOverlay','addPropOverlay','editPropOverlay','propProjectsPopup','tabParcels','tabProperties','runSearchBtn','bulkApplyBtn','bulkEditApplyBtn','modalSaveBtn']){const element=c.$(id);element.id=id;c.document.body.appendChild(element);}
    c.matchMedia=()=>({matches:true});vm.runInContext(readTaxScript('tax-progress.js'),c);
    TaxUI=c.LMTaxUIPreparation.create({close:id=>c.Tax.closeProgress(id),pending:()=>{const value=c.Tax.snapshot();return value.pending||value.batchActive;},recheck:ledger=>Promise.all(ledger.rows.filter(row=>row.state==='unknown').map(row=>c.Tax.recheck('update:'+ledger.report+':'+row.id)))});
  }else{let epoch=0;TaxUI={controls(){},capture:kind=>({kind,epoch}),owns:request=>request.epoch===epoch,invalidate:()=>{epoch++;}};}
  c.TaxUI=TaxUI;
  Object.assign(c.CONFIG,{forms:{property:'Property',parcelYear:'Tax_Parcel_Year'}});
  c.Tax=c.LMTaxPreparation.create({reports:c.CONFIG.reports,forms:c.CONFIG.forms,maxAutoRows:800,initTimeoutMs:timeout,fieldsByReport,
    onState:snapshot=>{c.state.loading=snapshot.referenceState==='loading'||snapshot.scopeState==='loading';c.state.referenceLoaded=snapshot.referenceState==='ready';c.state.rowsLoaded=snapshot.scopeState==='ready';TaxUI.controls(snapshot);},
    publishReferences:rows=>{c.state.projectsAvailable=Array.isArray(rows.projects);c.state.data.rawLand=c.mapRawLand(rows.rawLand);c.state.data.companies=c.mapCompanies(rows.companies);c.state.data.subdivisions=c.mapSubdivisions(rows.subdivisions);c.state.data.jurisdictions=c.mapJurisdictions(rows.jurisdictions);c.state.data.projects=rows.projects?c.mapProjects(rows.projects):[];},
    publishScope:(rows,expected,criteria)=>{c.state.data.parcelYears=c.mapParcelYears(rows);c.state.searchResultExpectedCount=expected;c.state.lastSearchCriteria=criteria;c.pruneBulkSelection();},
    onSearchProgress:info=>progress.push(clone(info)),onBatchProgress:ledger=>progress.push(clone(ledger)),
    ...(ui?{onBatchOpen:ledger=>TaxUI.open(ledger),onBatchProgress:ledger=>{progress.push(clone(ledger));TaxUI.patch(ledger);},onBatchFinish:ledger=>TaxUI.finish(ledger)}:{}),
    onRecovery:(operation,row)=>{recoveries.push(operation.id);const model=operation.report===c.CONFIG.reports.rawLand?c.state.data.rawLand:c.state.data.parcelYears,newModel=operation.report===c.CONFIG.reports.rawLand?c.mapRawLand([row])[0]:c.mapParcelYears([row])[0],current=model.find(item=>item.id===operation.id);if(current)Object.assign(current,newModel);else model.push(newModel);}
  });
  for(const name of ['taxRunBatch','fetchRecordCount','updateRecord','createRecord','inlineSave','savePropInline','quickTriage','runParcelSearch','loadReferenceDataOnly','applyPropBulkFields','refreshFacetCounts','_refreshProductionCountsNow','facetCount','submitAddProperty','submitAddTPY','openAddProperty','closeAddProperty','closeAddTPY','saveModalRecord','setYear','toggleBulkRow','clearBulkSelection','switchTab','closeModal'])vm.runInContext(extract(source,name),c);
  c.renderAll=()=>c.renderTable();c.toZohoDate=value=>value;c.animateSaveButton=(button,promise)=>promise;
  return{...h,c,storage,calls,writes,progress,recoveries,TaxUI,stats:()=>({nativeActive,maxActive,handshakes})};
}
async function ready(options){const h=harness(options);await h.c.Tax.start();assert.equal((await h.c.loadReferenceDataOnly()).published,true);return h;}

// Missing/duplicate/extra/unsafe identities or a native count mismatch never publish editable parcels.
for(const malformed of ['missing','duplicate','extra','numeric']){
  const rows=Array.from({length:152},(_,index)=>raw((90071992547500000n+BigInt(index)).toString(),index));
  if(malformed==='missing')rows.pop();if(malformed==='duplicate')rows[151].ID=rows[0].ID;if(malformed==='extra')rows.push(raw('90071992547999999'));if(malformed==='numeric')rows[0].ID=7;
  const h=await ready({rows,countOverride:(config,storage)=>config.report_name==='All_Tax_Parcel_Years'&&!String(config.criteria||'').startsWith('(ID ==')?152:storage[config.report_name].length});
  await assert.rejects(h.c.runParcelSearch());assert.equal(h.c.state.rowsLoaded,false);assert.equal(h.c.state.data.parcelYears.length,0);assert.equal(h.c.Tax.canEdit(h.c.CONFIG.reports.parcelYears,String(rows[0].ID)),false);
  await assert.rejects(h.c.inlineSave(String(rows[0].ID),{Market_Value:'999'}));await assert.rejects(h.c.Tax.batch(h.c.CONFIG.reports.parcelYears,[{id:String(rows[0].ID),payload:{Status:'No Protest'}}]));assert.equal(h.writes.length,0);
}
{
  const rows=Array.from({length:152},(_,index)=>raw((90071992547500000n+BigInt(index)).toString(),index)),h=await ready({rows});await h.c.runParcelSearch();assert.equal(h.c.state.data.parcelYears.length,152);assert.equal(h.c.state.rowsLoaded,true);h.c.renderTable();assert.equal((h.nodes.get('tableBody').innerHTML.match(/class="lot-row /g)||[]).length,100);h.c.state.page=2;h.c.renderTable();assert.equal((h.nodes.get('tableBody').innerHTML.match(/class="lot-row /g)||[]).length,52);
  const previous=h.c.state.data.parcelYears;h.storage.All_Tax_Parcel_Years.pop();h.c.ZOHO.CREATOR.DATA.getRecordCount=async config=>({code:3000,result:{records_count:config.report_name==='All_Tax_Parcel_Years'?'152':String(h.storage[config.report_name].length)}});
  await assert.rejects(h.c.runParcelSearch());assert.equal(h.c.state.data.parcelYears,previous);assert.equal(h.c.state.rowsLoaded,false);await assert.rejects(h.c.inlineSave(previous[0].id,{Market_Value:'999'}));assert.equal(h.writes.length,0);
}
// Count authority is inside the cursor read; advisory799 cannot authorize an801-row load.
{
  let count=799;const h=await ready({rows:[],countOverride:(config,storage)=>config.report_name==='All_Tax_Parcel_Years'?count:storage[config.report_name].length});assert.equal(await h.c.fetchRecordCount(h.c.CONFIG.reports.parcelYears,'scope'),799);count=801;const start=h.calls.length;await assert.rejects(h.c.runParcelSearch(),/below 800/);assert.equal(h.calls.slice(start).filter(call=>call.kind==='rows').length,0);
}
{
  const h=await ready({propertyCount:12017,rows:[]});assert.equal(h.c.state.data.rawLand.length,12017);assert.equal(h.calls.filter(call=>call.kind==='rows'&&call.config.report_name==='All_Property').length,61);await h.c.runParcelSearch();assert.equal(h.c.state.rowsLoaded,true);assert.equal(h.c.state.data.parcelYears.length,0);assert.ok(h.stats().maxActive<=3);
}
// Complete800-row scope, native bounded concurrency, immutable per-ID payloads and exact persisted verification.
{
  const rows=Array.from({length:800},(_,index)=>raw((90071992547600000n+BigInt(index)).toString(),index)),h=await ready({rows});await h.c.runParcelSearch();const intents=rows.map(row=>({id:row.ID,payload:{Status:'No Protest',Property_ID:'000073'}}));
  const saving=h.c.Tax.batch(h.c.CONFIG.reports.parcelYears,intents);intents[0].payload.Status='Changed after dispatch';const result=await saving;assert.equal(result.rows.length,800);assert.ok(result.rows.every(row=>row.state==='verified'));assert.equal(new Set(h.writes.map(write=>write.id)).size,800);assert.equal(h.writes.length,800);assert.equal(h.writes[0].payload.data.Status,'No Protest');assert.ok(h.writes.every(write=>write.payload.data.Property_ID==='000073'));assert.ok(h.stats().maxActive<=3);assert.ok(h.calls.filter(call=>call.kind==='rows'&&String(call.config.criteria||'').startsWith('(ID ==')).length>=800);
}
// Duplicate/outside selections and missing requested full fields fail before the first write.
{
  const h=await ready();await h.c.runParcelSearch();for(const ids of [[ID,ID],[ID,'999'],[7]])await assert.rejects(h.c.Tax.batch(h.c.CONFIG.reports.parcelYears,ids.map(id=>({id,payload:{Status:'No Protest'}}))));await assert.rejects(h.c.updateRecord(ID,{NeverLoaded:'value'}));assert.equal(h.writes.length,0);
}
// Known partial failure is retryable only for that destination; lost applied writes settle by read-only recheck.
{
  let rejectSecond=true;const h=await ready({rows:[raw(ID),raw(ID2),raw(ID3)],updateHook:(config,apply)=>{if(config.id===ID2&&rejectSecond)return{code:2899,message:'Denied'};apply();if(config.id===ID3)throw new Error('Applied but reply lost');return{code:3000,data:{ID:config.id}};}});await h.c.runParcelSearch();
  const ledger=await h.c.Tax.batch(h.c.CONFIG.reports.parcelYears,[ID,ID2,ID3].map(id=>({id,payload:{Status:'No Protest'}})));assert.deepEqual(Array.from(ledger.rows,row=>row.state),['verified','rejected','unknown']);await assert.rejects(h.c.Tax.retryBatch(ledger.id));assert.equal(h.writes.length,3);assert.equal(await h.c.Tax.recheck('update:All_Tax_Parcel_Years:'+ID3),true);assert.equal(h.writes.length,3);rejectSecond=false;const retry=await h.c.Tax.retryBatch(ledger.id);assert.ok(retry.rows.every(row=>row.state==='verified'));assert.equal(h.writes.length,4);assert.equal(h.writes[3].id,ID2);
}
// The actual SDK2 Property bulk caller uses All_Property and keeps failed values/selection.
{
  let reject=true;const h=await ready({propertyCount:2,updateHook:(config,apply,n)=>{if(n===2&&reject)return{code:2945,message:'Rejected'};apply();return{code:3000,data:{ID:config.id}};}});const ids=h.storage.All_Property.map(row=>row.ID);h.c.state.propBulkSelectedIds=Object.fromEntries(ids.map(id=>[id,true]));h.c.$('propBulkLandType').value='Raw Land Holdings';h.c.clearPropBulkSelection=()=>{h.c.state.propBulkSelectedIds={};};
  const result=await h.c.applyPropBulkFields();assert.equal(result.rows[0].state,'verified');assert.equal(result.rows[1].state,'rejected');assert.ok(h.writes.every(write=>write.report_name==='All_Property'));assert.deepEqual(Object.keys(h.c.state.propBulkSelectedIds),[ids[1]]);assert.equal(h.c.$('propBulkLandType').value,'Raw Land Holdings');assert.ok(h.messages.some(message=>message.text==='1 properties verified · 1 need review'));reject=false;await h.c.applyPropBulkFields();assert.equal(h.writes.length,3);assert.equal(h.writes[2].id,ids[1]);
}
// Actual modal failure never mutates the confirmed model or claims Saved.
{
  const h=await ready({updateHook:()=>({code:2898,message:'Denied'})});await h.c.runParcelSearch();h.c.state.modalId=ID;h.c.$('mMarketValue').value='999';h.c.$('mStatus').value='Awaiting Assessment';h.c.saveModalRecord();await wait();assert.equal(h.c.state.data.parcelYears[0].marketValue,100);assert.ok(!h.messages.some(message=>message.text==='Saved.'));assert.ok(h.marks.some(mark=>mark.value==='save-error'));
}
// Fresh draft after read start cancels publication; write before search blocks snapshot replacement.
{
  const pause=held();let stalled=true;const h=await ready({readHook:config=>config.report_name==='All_Tax_Parcel_Years'&&!config.criteria&&stalled?pause.promise:undefined});const searching=h.c.Tax.search('');await wait();h.c.Tax.noteDraft();stalled=false;pause.resolve({code:3000,data:[raw(ID)]});assert.equal((await searching).published,false);assert.equal(h.c.state.rowsLoaded,false);assert.equal(h.c.state.loading,false);
}
{
  const pause=held();const h=await ready({updateHook:(config,apply)=>pause.promise.then(()=>{apply();return{code:3000,data:{ID:config.id}};})});await h.c.runParcelSearch();const previous=h.c.state.data.parcelYears,writing=h.c.inlineSave(ID,{Market_Value:'999'});await wait();assert.equal((await h.c.runParcelSearch()).blocked,true);assert.equal(h.c.state.data.parcelYears,previous);pause.resolve();await writing;assert.equal(h.c.state.data.parcelYears[0].marketValue,999);
}
// No demo, malformed actor, timeout/late completion or cached handshake substitution.
for(const params of [{},[],{envUrlFragment:'/environment/development',loginUser:{}},{envUrlFragment:'/environment/development',loginUser:false}]){const h=harness({initHook:()=>params});await assert.rejects(h.c.Tax.start());assert.equal(h.calls.length,0);assert.equal(h.c.Tax.snapshot().connected,false);}
{
  const pause=held(),h=harness({timeout:5,initHook:n=>n===1?pause.promise:{envUrlFragment:'/environment/development',loginUser:'fixture'}});await assert.rejects(h.c.Tax.start(),/timed out/);await h.c.Tax.start();pause.resolve({envUrlFragment:'/environment/production',loginUser:'stale'});await wait();assert.equal(h.stats().handshakes,2);assert.equal(h.c.LMRuntime.current().user,'fixture');assert.equal(h.calls.length,0);
}
// Actual late facet success AND rejection cannot settle or repaint the newer captured criteria.
for(const rejectOld of [false,true]){
  const h=await ready(),c=h.c,pending=[];let paints=0;c.facetClauseFor=()=>'(Status == "Awaiting Assessment")';c.FACET_RENDER.status=()=>{paints++;};c.fetchRecordCount=()=>{const value=held();pending.push(value);return value.promise;};
  c.state.search='old';const old=c.refreshFacetCounts('status',[{key:'one'}]);await wait();c.state.search='new';const newer=c.refreshFacetCounts('status',[{key:'one'}]);await wait();pending[1].resolve(17);await newer;const cache=c.state.facetCounts.status,painted=paints;
  rejectOld?pending[0].reject(new Error('Old denied')):pending[0].resolve(5);await old;assert.equal(c.state.facetCounts.status,cache);assert.equal(cache.key,'new');assert.equal(cache.vals.one,17);assert.equal(c.state.facetCountsLoading.status,false);assert.equal(paints,painted);
}
// A failed facet retains measured values and explicitly unavailable uncounted entries, without repaint retries.
{
  const h=await ready(),c=h.c;let calls=0;c.facetClauseFor=()=>'(Status == "Awaiting Assessment")';c.fetchRecordCount=async()=>{if(++calls===2)throw new Error('Denied');return 7;};c.state.search='scope';await c.refreshFacetCounts('status',[{key:'one'},{key:'two'},{key:'three'}]);const cache=c.state.facetCounts.status;assert.equal(cache.partial,true);assert.equal(cache.settled,true);assert.equal(cache.unavailable,true);assert.equal(cache.counted,1);assert.equal(c.facetCount('status','one'),'7');assert.equal(c.facetCount('status','two'),'—');await c.refreshFacetCounts('status',[{key:'one'},{key:'two'},{key:'three'}]);assert.equal(calls,2);
}
// Actual headline status post-await ownership guards include late errors and criteria changed without token changes.
for(const rejectOld of [false,true]){
  const h=await ready(),c=h.c,pause=held();c.buildParcelCriteria=options=>options?.statusOverride?'status-'+c.state.search:'scope-'+c.state.search;c.state.search='old';c.fetchRecordCount=async(report,criteria)=>criteria==='status-old'?pause.promise:1;
  const old=c._refreshProductionCountsNow();await wait();c.state.search='new';c.state.countToken++;c.state.serverCounts.status={'Awaiting Assessment':99};c.state.countsLoading=true;c.state.loadTitle='new title';rejectOld?pause.reject(new Error('Old denied')):pause.resolve(5);await old;assert.equal(c.state.serverCounts.status['Awaiting Assessment'],99);assert.equal(c.state.countsLoading,true);assert.equal(c.state.loadTitle,'new title');
}
{
  const h=await ready(),c=h.c;c.fetchRecordCount=async()=>1;await c._refreshProductionCountsNow();assert.equal(c.state.serverCounts.untriaged,null);assert.equal(c.state.serverCounts.activeProtests,null);assert.equal(c.state.serverCounts.paid,null,'Absent component counts remain unknown, not zero.');
}
// Metadata-defined decimals/currency/dates/checkbox/lookup collections normalize representation, never text/IDs.
{
  const row={...raw(ID),Notice_Received:'',Protest_Deadline:'',Acres:'1.5',Ag_Exempt:false,Property1:'',Taxing_Jurisdiction1:[],Legal_Description:'old'};
  const h=await ready({rows:[row],updateHook:(config,apply)=>{apply();const saved=h.storage.All_Tax_Parcel_Years[0];saved.Market_Value='$1,234.50';saved.Notice_Received='02-Oct-2026';saved.Acres='1.5000';saved.Ag_Exempt=true;saved.Property1={ID:ID2,zc_display_value:'fixture'};saved.Taxing_Jurisdiction1=[{ID:ID3},{ID:ID2}];saved.Legal_Description=null;return{code:3000,data:{ID:config.id}};}});await h.c.runParcelSearch();
  const response=await h.c.updateRecord(ID,{Market_Value:'1234.500',Notice_Received:'2026-10-02',Acres:'1.50',Ag_Exempt:'true',Property1:ID2,Taxing_Jurisdiction1:[ID2,ID3],Legal_Description:''});assert.equal(response.data.ID,ID);assert.equal(h.c.Tax.snapshot().reviews.length,0);assert.equal(h.writes.length,1);
}
for(const invalid of [{Property1:7},{Taxing_Jurisdiction1:[ID2,ID2]},{Notice_Received:'2026-02-30'},{Market_Value:'$1,2.50'}]){
  const h=await ready({rows:[{...raw(ID),Notice_Received:'',Taxing_Jurisdiction1:[]}]});await h.c.runParcelSearch();await assert.rejects(h.c.updateRecord(ID,invalid));assert.equal(h.writes.length,0);
}
{
  const h=await ready({updateHook:(config,apply)=>{apply();h.storage.All_Tax_Parcel_Years[0].Property_ID='73';return{code:3000,data:{ID:config.id}};}});await h.c.runParcelSearch();await h.c.updateRecord(ID,{Property_ID:'000073'});assert.equal(h.c.Tax.snapshot().reviews.length,0);assert.equal(h.writes.length,1);assert.equal(h.writes[0].payload.data.Property_ID,'000073','entered identifiers retain their leading zeroes in the payload');
}
// Actual Add Property -> actual TPY opener uses the verified new exact ID, despite a same-name old row.
{
  const NEW='90071992547777777',h=await ready({createHook:(config,apply)=>({code:3000,data:{ID:apply(NEW)}})}),c=h.c;h.storage.All_Property[0].Common_Name='Duplicate name';c.state.data.rawLand=c.mapRawLand(h.storage.All_Property);
  c.getSelectedProjects=()=>[];c.populateSubdivSelect=()=>{};c.onAddTPYPropertyChange=()=>{};c.setSelectByText=()=>{};vm.runInContext(extract(source,'openAddTPY'),c);c.reloadAllData=c.loadReferenceDataOnly;c.$('apName').value='Duplicate name';c.$('apCounty').value='Fixture';c.$('apPropId').value='000073';
  const response=await c.submitAddProperty();assert.equal(response.id,NEW);assert.equal(c._addTPYPrefilledPropertyId,NEW);assert.ok(c.$('atProperty').innerHTML.includes('value="'+NEW+'" selected'));assert.equal(c.state.data.rawLand.filter(row=>row.id===NEW).length,1);assert.equal(h.writes.length,1);assert.ok(h.messages.some(message=>message.text==='Property added — fill in the Tax Parcel Year details.'));
}
// Actual uncertain creates retain input, block public submit and reopen, and never guess an ID by name.
for(const acknowledgement of [{code:3000},{code:3000,result:[{code:3000,data:{ID:ID2}},{code:2899}]},{code:3000,data:{ID:ID2},result:[{code:2945}]}]){
  const h=await ready({createHook:()=>acknowledgement}),c=h.c;c.getSelectedProjects=()=>[];c.$('apName').value='Retained name';c.$('apCounty').value='Fixture';await c.submitAddProperty();assert.equal(c.Tax.snapshot().reviews.length,1);assert.equal(c.openAddProperty(),false);assert.equal(c.$('apName').value,'Retained name');assert.equal(c.submitAddProperty(),false);assert.equal(h.writes.length,1);assert.equal(await c.Tax.recheck('create:Property'),false);assert.equal(h.writes.length,1);
}
// All captured batch fields are validated before first write, and a fresh complete ID set gates dispatch.
{
  const h=await ready({rows:[raw(ID),raw(ID2)]});await h.c.runParcelSearch();await assert.rejects(h.c.Tax.batch(h.c.CONFIG.reports.parcelYears,[{id:ID,payload:{Status:'No Protest'}},{id:ID2,payload:{NeverLoaded:'bad'}}]));assert.equal(h.writes.length,0);h.storage.All_Tax_Parcel_Years.pop();const ledger=await h.c.Tax.batch(h.c.CONFIG.reports.parcelYears,[{id:ID,payload:{Status:'No Protest'}}]);assert.equal(ledger.rows[0].state,'not-sent');assert.match(ledger.error,/scope changed/);assert.equal(h.writes.length,0);
}
// Whole UI input areas and callable entrypoints freeze during native capture/write and display settlement.
{
  const pause=held(),h=await ready({ui:true,updateHook:(config,apply)=>pause.promise.then(()=>{apply();return{code:3000,data:{ID:config.id}};})}),c=h.c;await c.runParcelSearch();const input=c.$('runSearchBtn');input.focus();const saving=c.Tax.batch(c.CONFIG.reports.parcelYears,[{id:ID,payload:{Status:'No Protest'}}]);await wait();
  assert.equal(c.document.getElementById('taxSaveOverlay').hidden,false);assert.equal(c.document.getElementById('taxSaveBar').getAttribute('aria-valuenow'),'0');assert.equal(c.document.getElementById('taxSaveClose').disabled,true);assert.equal(c.document.getElementById('toolbar').inert,true);assert.equal(c.document.getElementById('propPanel').inert,true);assert.equal(h.TaxUI.close(),false);
  const oldYear=c.state.yearFilter,oldTab=c.state.activeTab;c.setYear('2024');c.switchTab('properties');c.toggleBulkRow(ID,true);assert.equal(c.state.yearFilter,oldYear);assert.equal(c.state.activeTab,oldTab);assert.deepEqual(Object.keys(c.state.bulkSelectedIds),[]);assert.equal((await c.runParcelSearch()).blocked,true);await assert.rejects(c.Tax.batch(c.CONFIG.reports.parcelYears,[{id:ID,payload:{Status:'No Protest'}}]));assert.equal(h.writes.length,1);
  let prevented=false;c.document.dispatch('keydown',{key:'Escape',preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(h.TaxUI.progress().open,true);const rowNode=c.document.getElementById('taxSaveResults').children[0];pause.resolve();const ledger=await saving;
  assert.equal(ledger.rows[0].state,'verified');assert.equal(c.document.getElementById('taxSaveResults').children[0],rowNode);assert.equal(c.document.getElementById('taxSaveBar').getAttribute('aria-valuenow'),'1');assert.equal(h.TaxUI.progress().displayDone,true);assert.equal(c.Tax.interactionAllowed(),false);assert.equal(c.document.getElementById('taxSaveClose').disabled,false);assert.equal(h.TaxUI.close(),true);assert.equal(c.document.activeElement,input);assert.equal(c.Tax.interactionAllowed(),true);assert.equal(h.writes.length,1);
}
// Preflight rejection has truthful not-sent stages and no fabricated successful send or percentage.
{
  const h=await ready({ui:true}),c=h.c;await c.runParcelSearch();h.storage.All_Tax_Parcel_Years[0].Status='Externally changed';const ledger=await c.Tax.batch(c.CONFIG.reports.parcelYears,[{id:ID,payload:{Status:'No Protest'}}]);assert.equal(h.writes.length,0);assert.equal(ledger.rows[0].state,'not-sent');assert.equal(c.document.getElementById('taxSaveStageChip0').textContent,'Needs review');assert.equal(c.document.getElementById('taxSaveStageChip1').textContent,'Not sent');assert.equal(c.document.getElementById('taxSaveStageChip2').textContent,'Not sent');assert.equal(c.document.getElementById('taxSaveBar').getAttribute('aria-valuenow'),'0');assert.equal(h.TaxUI.close(),true);
}
console.log('PASS actual Tax SDK2 effective source: renderer/modal/Property batch/create and facet/status ownership; complete152/151,12017 references,800 bounded verified destinations, exact ID-set preflight, retained uncertainty, input metadata/date/blank/lookup/text and acknowledged field differences, exact created parent, mounted progress/input locks. No native browser/write claims.');
