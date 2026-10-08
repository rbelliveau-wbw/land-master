// Actual whole Tax SDK2 app and native-shaped fixtures. No browser or live writes.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createTaxTestDOM} from './fixtures/tax-test-dom.mjs';
import {source,baseline,extract,readTaxScript} from './fixtures/tax-source.mjs';
const clone=value=>JSON.parse(JSON.stringify(value));
// These business engines are deliberately preserved from the immutable SDK1 baseline.
for(const name of ['normalizeArb','normalizeStatusName','mapParcelYears','mapRawLand','buildSearchCriteriaFragment','toZohoDate'])assert.equal(extract(source,name),extract(baseline,name),name+' baseline business engine');
// Only the intentionally corrected null-aware Arbitrate block may differ.
function withoutArbitrate(text){return text.replace(/  if\(state\.arbFilters[\s\S]*?(?=  if\(state\.agOnly)/,'');}
assert.equal(withoutArbitrate(extract(source,'buildParcelCriteria')),withoutArbitrate(extract(baseline,'buildParcelCriteria')),'all other native search criteria remain unchanged');
const ID='90071992547409941',OTHER='90071992547409942';
function held(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
async function drain(){for(let i=0;i<18;i++)await new Promise(resolve=>setImmediate(resolve));}
const meta=JSON.parse(fs.readFileSync('creator/generated/fields/Tax_Parcel_Year.json','utf8')).fields;
const parcel=(id,index=0)=>Object.assign(Object.fromEntries(meta.map(f=>[f.link_name,f.type==='checkbox'?false:f.type==='USD'||/^(decimal|number|percentage)$/.test(f.type)?'100':f.type==='list'?[]:''])),{ID:id,Tax_Parcel_Year_Code:'Fixture-'+index,Property_ID:'000073',Tax_Year:'2026',Status:'Awaiting Assessment',Market_Value:String(100+index),Assessed_Value:String(50+index),County:'Fixture',Archived:false,Company1:'',Property1:'',Arbitrate1:''});
const propertyMeta=JSON.parse(fs.readFileSync('creator/generated/fields/Property.json','utf8')).fields;
const property=(id,index=0)=>Object.assign(Object.fromEntries(propertyMeta.map(field=>[field.link_name,field.type==='checkbox'?false:field.type==='list'?[]:''])),{ID:id,Common_Name:'Fixture property '+index,Property_ID:'000073',Land_Type:'Raw Land Holdings',County:'Fixture',Company1:'',Projects:[],Acres:'100',Ag_Exempt:false,Deed_to_HOA:false,Insured:false});
function harness(options={}){
 const {document,nodes,node,selectors,listeners,dispatch}=createTaxTestDOM(source),timers=new Map(),calls=[],writes=[];let timerId=0,handshakes=0,active=0,maxActive=0;
 const storage={All_Tax_Parcel_Years:clone(options.rows||[parcel(ID)]),All_Property:Array.from({length:options.propertyCount??1},(_,i)=>property((90071992547420000n+BigInt(i)).toString(),i)),All_Companies:[],All_Subdivisions:[],All_Taxing_Jurisdictions:[],All_Projects:[],...clone(options.storage||{})};
 const selected=config=>{const rows=storage[config.report_name]||[],id=String(config.criteria||'').match(/^\(ID == (\d+)\)$/);return id?rows.filter(row=>row.ID===id[1]):rows;};
 async function native(method,config,action){calls.push({method,config:clone(config)});active++;maxActive=Math.max(maxActive,active);try{return await action();}finally{active--;}}
 const DATA={getRecordCount:config=>native('count',config,()=>({code:3000,result:{records_count:String(options.count?options.count(config,storage):selected(config).length)}})),
  getRecords:config=>native('records',config,async()=>{const override=options.read&&await options.read(config,storage);if(override!==undefined)return override;const rows=selected(config),offset=Number(config.record_cursor||0),size=options.pageSize||1000,next=offset+size;return{code:3000,data:clone(rows.slice(offset,next)),...(next<rows.length?{record_cursor:String(next)}:{})};}),
  updateRecordById:config=>native('update',config,async()=>{writes.push(clone(config));const apply=()=>{const row=storage[config.report_name].find(row=>row.ID===config.id);assert.ok(row);Object.assign(row,clone(config.payload.data));};if(options.update)return options.update(config,apply,writes.length);apply();return{code:3000,data:{ID:config.id}};}),
  addRecords:config=>native('create',config,async()=>{writes.push(clone(config));const apply=(id=OTHER)=>{storage[config.form_name==='Property'?'All_Property':'All_Tax_Parcel_Years'].push({ID:id,...clone(config.payload.data)});return id;};return options.create?options.create(config,apply):{code:3000,data:{ID:apply()}};})};
 const c=vm.createContext({document,console:{warn(){},log(){}},location:{href:'https://example.test/dev/tax-center/',search:''},navigator:{},Intl,Date,Set,Map,Promise,setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),Event:class{constructor(type){this.type=type;}},matchMedia:()=>({matches:true}),getComputedStyle:()=>({fontFamily:'sans-serif'}),ZOHO:{CREATOR:{UTIL:{getInitParams:async()=>{handshakes++;return options.init?options.init(handshakes):{envUrlFragment:'/environment/development',loginUser:'fixture'};},setIframeHeight(){}},DATA}}});
 c.window=c;c.parent={};c.addEventListener=(type,fn)=>document.addEventListener('window:'+type,fn);c.performance={now:()=>0};
 for(const name of ['runtime-context.js','creator-data.js','tax-controller.js','tax-progress.js'])vm.runInContext(readTaxScript(name),c);
 const inline=[...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].filter(m=>m[1].trim()).map(m=>m[1]).join('\n');
 vm.runInContext(inline+'\nwindow.__taxTest={state,CONFIG,Tax,TaxUI,boot:taxBoot};',c);
 return {c,widget:c.__taxTest,nodes,node,selectors,storage,DATA,calls,writes,timers,dispatch,handshakes:()=>handshakes,maxActive:()=>maxActive,tick(ms){const entry=[...timers].find(([,v])=>v.ms===ms);assert.ok(entry);timers.delete(entry[0]);entry[1].fn();}};
}
async function ready(options){const h=harness(options),result=await h.c.__taxBoot;assert.equal(result.published,true);assert.equal(h.widget.state.referenceLoaded,true);assert.equal(h.widget.state.rowsLoaded,false);return h;}

// Whole boot: real SDK2 actor and references, then actual Search→renderer. No SDK1 API exists in fixture.
{
 const h=await ready({rows:Array.from({length:152},(_,i)=>parcel((90071992547600000n+BigInt(i)).toString(),i))});await h.c.runParcelSearch();assert.equal(h.widget.state.data.parcelYears.length,152);assert.equal(h.widget.state.rowsLoaded,true);assert.equal(h.widget.state.searchResultExpectedCount,152);assert.equal((h.nodes.get('tableBody').innerHTML.match(/class="lot-row /g)||[]).length,100);h.c.gotoPage(2);assert.equal((h.nodes.get('tableBody').innerHTML.match(/class="lot-row /g)||[]).length,52);assert.equal(h.handshakes(),1);assert.ok(h.maxActive()<=3);
}
// Actual Search publication and verified recovery retain the SDK1 enrichment step.
// Native Dev caught a complete 228-ID load with blank displayName values; count
// parity alone cannot verify the visible record labels or linked fallback data.
{
 const PROPERTY='90071992547420000',SUBDIVISION='90071992547430000',COMPANY='90071992547440000';
 const row={...parcel(ID),Tax_Parcel_Year_Code:'',Property1:{ID:PROPERTY,zc_display_value:'000073'},Property_ID:'',Subdivision1:{ID:SUBDIVISION,zc_display_value:'Fixture subdivision'},Company1:'',County:'',Acres:'',Ag_Exempt:false};
 const h=await ready({rows:[row],storage:{All_Property:[{...property(PROPERTY),Legal_Description:'Authoritative property label',County:'Fixture county',Company1:{ID:COMPANY,zc_display_value:'Fixture company'},Acres:'999',Ag_Exempt:true}],All_Companies:[{ID:COMPANY,Company_Name:'Fixture company'}],All_Subdivisions:[{ID:SUBDIVISION,Subdivision_Name:'Fixture subdivision',County:'Fixture county',Company1:{ID:COMPANY,zc_display_value:'Fixture company'}}]}});
 await h.c.runParcelSearch();let model=h.widget.state.data.parcelYears[0];assert.equal(model.displayName,'000073');assert.equal(model.county,'Fixture county');assert.equal(model.companyId,COMPANY);assert.equal(model.acres,'');assert.equal(model.agExempt,false);assert.ok(h.nodes.get('tableBody').innerHTML.includes('000073'));
 await h.widget.Tax.update(ID,{Tax_Parcel_Year_Code:'Fresh code'});model=h.widget.state.data.parcelYears[0];assert.equal(model.displayName,'000073');assert.equal(model.county,'Fixture county');assert.equal(model.code,'Fresh code');assert.equal(model.acres,'');assert.equal(model.agExempt,false);
 assert.equal(h.writes.length,1);
}
for(const kind of ['missing','duplicate','numeric','cursor']){
 const rows=Array.from({length:152},(_,i)=>parcel((90071992547600000n+BigInt(i)).toString(),i));if(kind==='missing')rows.pop();if(kind==='duplicate')rows[151].ID=rows[0].ID;if(kind==='numeric')rows[0].ID=7;
 const h=await ready({rows,count:(cfg,data)=>cfg.report_name==='All_Tax_Parcel_Years'?152:data[cfg.report_name].length,read:cfg=>kind==='cursor'&&cfg.report_name==='All_Tax_Parcel_Years'?{code:3000,data:rows.slice(0,100),record_cursor:'same'}:undefined});
 await assert.rejects(h.c.runParcelSearch());assert.equal(h.widget.state.rowsLoaded,false);assert.equal(h.widget.Tax.canEdit('All_Tax_Parcel_Years',String(rows[0].ID)),false);assert.equal(h.c.openModal(String(rows[0].ID)),false);h.widget.state.bulkSelectedIds={[String(rows[0].ID)]:true};h.node('bulkStatusSelect').value='No Protest';assert.equal(await h.c.applyBulkStatus(),false);assert.equal(h.writes.length,0);
}
{
 const h=await ready({propertyCount:12017,pageSize:200});assert.equal(h.widget.state.data.rawLand.length,12017);assert.equal(h.calls.filter(x=>x.method==='records'&&x.config.report_name==='All_Property').length,61);assert.ok(h.maxActive()<=3);
}
// Actual callable selection/filter/sort/public save paths freeze during a complete scoped read.
{
 const pause=held();let hold=true;const h=await ready({read:cfg=>cfg.report_name==='All_Tax_Parcel_Years'&&hold?pause.promise:undefined});const request=h.c.runParcelSearch();await drain();const state=h.widget.state,year=state.yearFilter,sort=state.colSort;
 h.c.setYear('2024');h.c.toggleStatusFilter('No Protest');h.c.cycleColumnSort('market');h.c.toggleBulkRow(ID,true);assert.equal(state.yearFilter,year);assert.equal(state.colSort,sort);assert.equal(state.statusFilters.length,0);assert.equal(Object.keys(state.bulkSelectedIds).length,0);assert.equal(h.c.openModal(ID),false);const input=h.node('mainSearch');input.value='changed';await input.fire('change');assert.equal(state.search,'');
 const draft=h.node('draft','input');draft.classList.add('cell-input');const event=await h.dispatch('input',draft);assert.equal(event.prevented,true);assert.equal(h.widget.Tax.snapshot().editEpoch,0);hold=false;pause.resolve({code:3000,data:[parcel(ID)]});await request;assert.equal(state.rowsLoaded,true);assert.equal(h.writes.length,0);
}
// Criteria changed programmatically during awaiting read cannot publish stale source scope.
{
 const pause=held();let hold=true;const h=await ready({read:cfg=>cfg.report_name==='All_Tax_Parcel_Years'&&hold?pause.promise:undefined});const search=h.c.runParcelSearch();await drain();h.widget.state.yearFilter='2024';hold=false;pause.resolve({code:3000,data:[parcel(ID)]});assert.equal((await search).published,false);assert.equal(h.widget.state.rowsLoaded,false);assert.equal(h.widget.state.data.parcelYears.length,0);
}
// A changed post-read count is not a complete stable scope, even when the first count/pages matched.
{
 let taxCounts=0;const h=await ready({count:(cfg,data)=>cfg.report_name==='All_Tax_Parcel_Years'?++taxCounts===1?1:2:data[cfg.report_name].length});await assert.rejects(h.c.runParcelSearch(),/count changed/);assert.equal(h.widget.state.rowsLoaded,false);assert.equal(h.widget.state.data.parcelYears.length,0);assert.equal(h.c.openModal(ID),false);assert.equal(h.writes.length,0);
}
// Whole app status commit opens mounted progress immediately; retained terminal result blocks duplicate writes.
{
 const pause=held();const h=await ready({rows:[parcel(ID),parcel(OTHER,1)],update:(cfg,apply)=>pause.promise.then(()=>{apply();return{code:3000,data:{ID:cfg.id}};})});await h.c.runParcelSearch();h.widget.state.bulkSelectedIds={[ID]:true,[OTHER]:true};h.node('bulkStatusSelect').value='No Protest';const saving=h.c.applyBulkStatus();await drain();assert.equal(h.nodes.get('taxSaveOverlay').hidden,false);assert.equal(h.nodes.get('taxSaveClose').disabled,true);assert.equal(h.widget.TaxUI.close(),false);assert.equal(await h.c.applyBulkStatus(),false);h.c.bulkQuickSet('Under Protest');assert.equal(h.node('bulkStatusSelect').value,'No Protest');assert.equal(h.writes.length,2);pause.resolve();const ledger=await saving;assert.ok(ledger.rows.every(x=>x.state==='verified'));assert.equal(h.widget.state.data.parcelYears[0].status,'No Protest');assert.equal(h.widget.TaxUI.close(),true);assert.equal(Object.keys(h.widget.state.bulkSelectedIds).length,0);assert.equal(h.writes.length,2);
 // The verified raw baseline is current, so the next distinct batch can pass exact preflight.
 h.widget.state.bulkSelectedIds={[ID]:true};h.node('bulkStatusSelect').value='Under Protest';const next=await h.c.applyBulkStatus();assert.equal(next.rows[0].state,'verified');assert.equal(h.writes.length,3);h.widget.TaxUI.close();
}
// Actual field-builder preserves per-record copy sources, date transform and deliberate Undecided blank.
{
 const h=await ready({rows:[parcel(ID),parcel(OTHER,1)]});await h.c.runParcelSearch();h.widget.state.bulkSelectedIds={[ID]:true,[OTHER]:true};
 h.c.openBulkEdit();for(const [key,val] of [['noticeReceived','2026-10-03'],['arbitrate',''],['finalValue','']]){const cb=h.c.document.querySelector('.be-toggle[data-key="'+key+'"]');cb.checked=true;const inp=h.c.document.querySelector('.be-input[data-key="'+key+'"]');inp.value=val;}
 const copy=h.c.document.querySelector('.be-copy-sel[data-copy-for="finalValue"]');copy.value='marketValue';const ledger=await h.c.applyBulkEdit();assert.ok(ledger.rows.every(x=>x.state==='verified'));assert.deepEqual(h.writes.map(x=>x.payload.data.Final_Value),[100,101]);assert.ok(h.writes.every(x=>x.payload.data.Notice_Received==='10/03/2026'&&x.payload.data.Arbitrate1===''));assert.equal(h.widget.state.data.parcelYears[0].noticeReceived,'10/03/2026');h.widget.TaxUI.close();
}
// Actual Property batch writes All_Property, retains rejected input/ID and retries only that destination.
{
 let rejected=true;const h=await ready({propertyCount:2,update:(cfg,apply,n)=>{if(n===2&&rejected)return{code:2945};apply();return{code:3000,data:{ID:cfg.id}};}});const ids=h.widget.state.data.rawLand.map(row=>row.id);h.widget.state.propBulkSelectedIds=Object.fromEntries(ids.map(id=>[id,true]));h.node('propBulkLandType').value='Raw Land Holdings';const ledger=await h.c.applyPropBulkFields();assert.deepEqual(Array.from(ledger.rows,row=>row.state),['verified','rejected']);assert.ok(h.writes.every(row=>row.report_name==='All_Property'));assert.deepEqual(Object.keys(h.widget.state.propBulkSelectedIds),[ids[1]]);assert.equal(h.node('propBulkLandType').value,'Raw Land Holdings');h.widget.TaxUI.close();rejected=false;const retry=await h.c.applyPropBulkFields();assert.equal(retry.id,ledger.id);assert.equal(h.writes.length,3);assert.equal(h.writes[2].id,ids[1]);h.widget.TaxUI.close();
}
// An already-complete collection becoming a different same-count ID set fails batch preflight, with zero writes.
{
 const h=await ready({rows:[parcel(ID),parcel(OTHER)]});await h.c.runParcelSearch();h.storage.All_Tax_Parcel_Years[1].ID='90071992547409943';h.widget.state.bulkSelectedIds={[ID]:true,[OTHER]:true};h.node('bulkStatusSelect').value='No Protest';const result=await h.c.applyBulkStatus();assert.equal(result.rows.every(row=>row.state==='not-sent'),true);assert.equal(h.writes.length,0);assert.match(result.error,/scope changed/);assert.equal(h.nodes.get('taxSaveBar').getAttribute('aria-valuenow'),'0');h.widget.TaxUI.close();
}
// Starting a captured write invalidates pending old headline/facet counts instead of retaining apparent numeric totals.
{
 const pause=held(),h=await ready({update:(cfg,apply)=>pause.promise.then(()=>{apply();return{code:3000,data:{ID:cfg.id}};})});await h.c.runParcelSearch();h.widget.state.serverCounts.currentTotal=17;h.widget.state.serverCounts.paid=17;h.widget.state.facetCounts.status={vals:{old:17}};const oldToken=h.widget.state.countToken;const saving=h.c.inlineSave(ID,{Market_Value:'999'});await drain();assert.ok(h.widget.state.countToken>oldToken);assert.equal(h.widget.state.serverCounts.currentTotal,null);assert.equal(h.widget.state.serverCounts.paid,null);assert.equal(Object.keys(h.widget.state.facetCounts).length,0);pause.resolve();await saving;assert.ok([...h.timers.values()].some(timer=>timer.ms===450));
}
// Unknown native destination halts queued sends; per-ID verified/rejected/unknown/not-sent ledger survives close/recheck/retry.
{
 const ids=Array.from({length:20},(_,i)=>(90071992547700000n+BigInt(i)).toString());let fail=true;
 const h=await ready({rows:ids.map(parcel),update:(cfg,apply,n)=>{if(n===2&&fail)return{code:2899};apply();if(n===1&&fail)throw new Error('Applied, reply lost');return{code:3000,data:{ID:cfg.id}};}});await h.c.runParcelSearch();h.widget.state.bulkSelectedIds=Object.fromEntries(ids.map(id=>[id,true]));h.node('bulkStatusSelect').value='No Protest';const result=await h.c.applyBulkStatus();assert.equal(h.writes.length,3);assert.equal(result.rows[0].state,'unknown');assert.equal(result.rows[1].state,'rejected');assert.equal(result.rows[2].state,'verified');assert.equal(result.rows.slice(3).every(x=>x.state==='not-sent'),true);assert.equal(Object.keys(h.widget.state.bulkSelectedIds).length,19);assert.equal(h.node('bulkStatusSelect').value,'No Protest');assert.equal(await h.c.applyBulkStatus(),false);await assert.rejects(h.widget.Tax.retryBatch(result.id));
 assert.equal(h.nodes.get('taxSaveRecheck').hidden,false);await h.nodes.get('taxSaveRecheck').fire('click');await drain();assert.equal(h.widget.Tax.ledger(result.id).rows[0].state,'verified');assert.equal(h.writes.length,3);assert.equal(Object.keys(h.widget.state.bulkSelectedIds).length,18);assert.equal(h.widget.TaxUI.close(),true);fail=false;const retry=await h.c.applyBulkStatus();assert.equal(retry.id,result.id);assert.ok(retry.rows.every(x=>x.state==='verified'));assert.equal(h.writes.length,21);assert.equal(h.writes.filter(x=>x.id===ids[0]).length,1);assert.equal(h.writes.filter(x=>x.id===ids[2]).length,1);h.widget.TaxUI.close();
}
// The actual original subdivision Status menu is also one verified multi-record operation.
{
 const h=await ready({rows:[{...parcel(ID),Subdivision1:{ID:'4410926000000009999',zc_display_value:'Fixture subdivision'}},{...parcel(OTHER),Subdivision1:{ID:'4410926000000009999',zc_display_value:'Fixture subdivision'}}]});await h.c.runParcelSearch();const groups=h.c.groupRowsBySubdivision(h.c.getFilteredRows());assert.equal(groups.length,1);const select=h.c.document.querySelector('.subdiv-bulk select');select.value='No Protest';const ledger=await h.c.applySubdivStatus(groups[0].key,select);assert.equal(ledger.rows.length,2);assert.ok(ledger.rows.every(x=>x.state==='verified'));assert.equal(select.value,'');assert.equal(h.writes.length,2);assert.equal(h.nodes.get('taxSaveCount').textContent,'2 / 2 persisted destinations verified');h.widget.TaxUI.close();
}
// Closing an unknown terminal result cannot unlock editing; recovery stays reachable outside the dialog.
{
 const h=await ready({update:(cfg,apply)=>{apply();throw new Error('Reply lost');}});await h.c.runParcelSearch();h.widget.state.bulkSelectedIds={[ID]:true};h.node('bulkStatusSelect').value='No Protest';const result=await h.c.applyBulkStatus();assert.equal(result.rows[0].state,'unknown');assert.equal(h.widget.TaxUI.close(),true);assert.equal(h.nodes.get('toolbar').inert,false);assert.equal(h.nodes.get('tableWrap').inert,false);assert.equal(h.nodes.has('taxReviewNotice'),false);await h.c.taxRecheckReviews();assert.equal(h.writes.length,1);assert.equal(h.widget.Tax.ledger(result.id).rows[0].state,'verified');
}
// The actual row handler reports loss without false Saved; manual recovery only reads exact persisted fields.
{
 const h=await ready({update:(cfg,apply)=>{apply();throw new Error('Applied, lost reply');}});await h.c.runParcelSearch();await h.c.taxInline(ID,{Market_Value:'999'});assert.equal(h.widget.state.data.parcelYears[0].marketValue,100);assert.equal(h.widget.Tax.snapshot().reviews.length,1);assert.equal(h.nodes.has('taxReviewButton'),false);assert.equal(h.nodes.get('messageBar').textContent.startsWith('Save failed:'),true);assert.equal(await h.c.taxRecheckReviews(),true);assert.equal(h.widget.state.data.parcelYears[0].marketValue,999);assert.equal(h.writes.length,1);
}
// 800 destinations run through the actual whole-app committing action and mounted progress.
{
 const rows=Array.from({length:800},(_,i)=>parcel((90071992547800000n+BigInt(i)).toString(),i)),h=await ready({rows,pageSize:200});await h.c.runParcelSearch();h.widget.state.bulkSelectedIds=Object.fromEntries(rows.map(row=>[row.ID,true]));h.node('bulkStatusSelect').value='No Protest';const ledger=await h.c.applyBulkStatus();assert.equal(ledger.rows.length,800);assert.ok(ledger.rows.every(x=>x.state==='verified'));assert.equal(new Set(h.writes.map(x=>x.id)).size,800);assert.equal(h.writes.length,800);assert.ok(h.maxActive()<=3);assert.equal(h.nodes.get('taxSaveBar').getAttribute('aria-valuenow'),'800');assert.equal(h.widget.state.data.parcelYears.filter(row=>row.status==='No Protest').length,800);h.widget.TaxUI.close();
}
// Actual Add Property retains its leading-zero identifier and opens the next form using the new verified ID.
{
 const NEW='90071992547900001',h=await ready({create:(cfg,apply)=>({code:3000,data:{ID:apply(NEW)}})});h.c.openAddProperty();h.node('apName').value='Fixture created property';h.node('apCounty').value=h.node('apCounty').options[1].value;h.node('apPropId').value='000073';const creating=h.c.submitAddProperty();await drain();if([...h.timers.values()].some(timer=>timer.ms===900))h.tick(900);const result=await creating;assert.equal(result?.id,NEW,h.node('addPropErr').textContent);assert.equal(h.writes.length,1);assert.equal(h.writes[0].form_name,'Property');assert.equal(h.writes[0].payload.data.Property_ID,'000073');assert.ok(h.node('atProperty').innerHTML.includes('value="'+NEW+'" selected'));assert.equal(h.widget.state.data.rawLand.filter(row=>row.id===NEW).length,1);
}
// Unsettled native writes become bounded unknown, retain the queue slots, and
// never auto-accept a late reply. Public recheck is read-only after native settles.
{
 const pause=held(),h=await ready({update:(cfg,apply)=>pause.promise.then(()=>{apply();return{code:3000,data:{ID:cfg.id}};})});await h.c.runParcelSearch();
 const writing=h.c.taxInline(ID,{Market_Value:'777'});await drain();assert.equal(h.widget.Tax.snapshot().nativeWrites,1);assert.equal(h.c.closeModal(),false);assert.equal(await h.c.taxRecheckReviews(),false);assert.equal(h.writes.length,1);
 h.tick(30000);await writing;assert.equal(h.widget.Tax.snapshot().pending,0);assert.equal(h.widget.Tax.snapshot().reviews.length,1);assert.equal(h.widget.Tax.snapshot().reviews[0].pending,true);assert.ok(h.widget.Tax.snapshot().nativeWrites||h.widget.Tax.snapshot().verificationReads);assert.equal(h.widget.state.data.parcelYears[0].marketValue,100);assert.equal(h.c.openModal(ID),false);const reads=h.calls.filter(call=>call.method==='records').length;assert.equal(await h.c.taxRecheckReviews(),false);assert.equal(h.calls.filter(call=>call.method==='records').length,reads);await assert.rejects(h.widget.Tax.start(),/captured Tax operation/);assert.equal(h.handshakes(),1);
 pause.resolve();await drain();assert.equal(h.widget.Tax.snapshot().nativeWrites,0);assert.equal(h.widget.Tax.snapshot().reviews.length,1);assert.equal(h.widget.state.data.parcelYears[0].marketValue,100);assert.equal(h.nodes.has('taxReviewButton'),false);assert.equal(await h.c.taxRecheckReviews(),true);assert.equal(h.widget.state.data.parcelYears[0].marketValue,777);assert.equal(h.writes.length,1);assert.ok(h.maxActive()<=3);
}
{
 const pauses=[held(),held(),held()],rows=Array.from({length:20},(_,i)=>parcel((90071992548000000n+BigInt(i)).toString(),i)),h=await ready({rows,update:(cfg,apply,n)=>pauses[n-1].promise.then(()=>{apply();return{code:3000,data:{ID:cfg.id}};})});await h.c.runParcelSearch();h.widget.state.bulkSelectedIds=Object.fromEntries(rows.map(row=>[row.ID,true]));h.node('bulkStatusSelect').value='No Protest';const writing=h.c.applyBulkStatus();await drain();assert.equal(h.writes.length,3);assert.equal(h.widget.TaxUI.close(),false);assert.equal(h.node('taxSaveClose').disabled,true);
 for(let i=0;i<3;i++)h.tick(30000);const ledger=await writing;assert.equal(ledger.rows.filter(row=>row.state==='unknown').length,3);assert.equal(ledger.rows.filter(row=>row.state==='not-sent').length,17);assert.equal(h.node('taxSaveBar').getAttribute('aria-valuenow'),'0');assert.equal(h.widget.Tax.snapshot().nativeWrites,3);assert.equal(await h.c.applyBulkStatus(),false);assert.equal(h.widget.TaxUI.close(),true);assert.equal(h.node('tableWrap').inert,true);assert.ok(h.widget.Tax.snapshot().nativeWrites||h.widget.Tax.snapshot().verificationReads);assert.equal(await h.c.taxRecheckReviews(),false);assert.equal(h.writes.length,3);
 pauses.forEach(pause=>pause.resolve());await drain();assert.equal(h.widget.Tax.snapshot().nativeWrites,0);assert.equal(h.widget.Tax.ledger(ledger.id).rows.filter(row=>row.state==='verified').length,0);assert.equal(await h.c.taxRecheckReviews(),true);assert.equal(h.widget.Tax.ledger(ledger.id).rows.filter(row=>row.state==='verified').length,3);assert.equal(h.writes.length,3);assert.ok(h.maxActive()<=3);
}
{
 const pause=held(),h=await ready({create:(cfg,apply)=>pause.promise.then(()=>({code:3000,data:{ID:apply(OTHER)}}))});h.c.openAddTPY(h.widget.state.data.rawLand[0].id);h.node('atYear').value='2026';const county=h.node('atCounty').options[1].value;h.node('atCounty').value=county;const writing=h.c.submitAddTPY();await drain();assert.equal(h.c.closeAddTPY(),false);h.tick(30000);await writing;assert.equal(h.node('atCounty').value,county);assert.equal(h.c.submitAddTPY(),false);assert.equal(h.c.closeAddTPY(),false);pause.resolve();await drain();assert.equal(h.widget.Tax.snapshot().reviews[0].id,'');assert.equal(h.c.submitAddTPY(),false);assert.equal(await h.c.taxRecheckReviews(),false);assert.equal(h.writes.length,1);
}
// The actual Tax Parcel Year create form retains unknown inputs and blocks both a second submit and reopening.
{
 const h=await ready({create:()=>({code:3000})});h.c.openAddTPY(h.widget.state.data.rawLand[0].id);h.node('atYear').value='2026';const county=h.node('atCounty').options[1].value;h.node('atCounty').value=county;h.node('atNotice').value='2026-10-03';await h.c.submitAddTPY();assert.equal(h.writes.length,1);assert.equal(h.writes[0].payload.data.Notice_Received,'10/03/2026');assert.equal(h.node('atCounty').value,county);assert.equal(h.c.submitAddTPY(),false);assert.equal(h.c.openAddTPY(),false);assert.equal(await h.widget.Tax.recheck('create:Tax_Parcel_Year'),false);assert.equal(h.writes.length,1);
}
for(const params of [{},[],{envUrlFragment:'/environment/development',loginUser:{}},{envUrlFragment:'/environment/development',loginUser:false}]){const h=harness({init:()=>params});const result=await h.c.__taxBoot;assert.equal(result.published,false);assert.equal(h.calls.length,0);assert.equal(h.widget.state.referenceLoaded,false);assert.equal(h.widget.Tax.snapshot().connected,false);}
// Actual parsed form DOM preserves unresolved multi-lookup IDs and company ID;
// failed saves retain exact inputs, and explicit Cancel discards only the draft.
{
 const P='90071992548100001',KNOWN='90071992548100002',MISSING='90071992548100003',CO='90071992548100004';
 const originalProperty={...property(P),Notes:'original',Company1:{ID:CO,zc_display_value:'Existing company'},Projects:[{ID:KNOWN,zc_display_value:'Loaded project'},{ID:MISSING,zc_display_value:'Existing unavailable project'}]};
 const h=await ready({storage:{All_Property:[originalProperty],All_Projects:[{ID:KNOWN,Project_Name:'Loaded project'}]},update:()=>({code:2945})});h.c.openPropertyEdit(P);
 assert.equal(h.node('epCompany').value,CO);assert.ok(h.node('epCompany').options.some(option=>option.value===CO&&option.hasAttribute('data-unresolved')));
 const choices=h.node('epProjectsList').querySelectorAll('input[type="checkbox"]:checked');assert.deepEqual(choices.map(input=>input.value),[KNOWN,MISSING]);assert.equal(choices[1].getAttribute('data-unresolved'),'true');
 const notes=h.node('epNotes'),baselineRows=h.widget.state.data.rawLand;notes.value='Retained draft';await h.dispatch('input',notes);const count=h.calls.length;
 assert.equal((await h.c.reloadAllData()).blocked,true);assert.equal((await h.c.runParcelSearch()).blocked,true);assert.equal(h.c.openPropertyEdit(P),false);h.c.switchTab('properties');assert.equal(h.widget.state.activeTab,'parcels');assert.equal(h.calls.length,count);assert.equal(h.node('epNotes'),notes);assert.equal(notes.value,'Retained draft');
 await h.c.savePropertyEdit();assert.equal(h.writes.length,1);assert.deepEqual(h.writes[0].payload.data.Projects,[KNOWN,MISSING]);assert.equal(h.writes[0].payload.data.Company1,CO);assert.equal(h.writes[0].payload.data.Notes,'Retained draft');assert.equal(notes.value,'Retained draft');assert.equal(h.widget.state.data.rawLand,baselineRows);assert.equal(baselineRows[0].notes,'original');assert.equal(h.node('editPropOverlay').classList.contains('hidden'),false);
 h.c.closePropertyEdit();assert.equal(h.node('editPropOverlay').classList.contains('hidden'),true);assert.equal(h.writes.length,1);assert.equal((await h.c.reloadAllData()).published,true);assert.equal(h.widget.state.data.rawLand[0].notes,'original');
}
// Actual form remains mounted/frozen through a permanently unsettled Property
// write; timeout and late native success require read-only exact-field recovery.
{
 const P='90071992548200001',pause=held(),h=await ready({storage:{All_Property:[{...property(P),Notes:'original'}]},update:(cfg,apply)=>pause.promise.then(()=>{apply();return{code:3000,data:{ID:cfg.id}};})});h.c.openPropertyEdit(P);const notes=h.node('epNotes');notes.value='Late retained notes';const saving=h.c.savePropertyEdit();await drain();assert.equal(h.node('editPropOverlay').inert,true);assert.equal(h.c.closePropertyEdit(),false);assert.equal(h.c.savePropertyEdit(),false);assert.equal((await h.c.reloadAllData()).blocked,true);assert.equal(h.node('epNotes'),notes);h.tick(30000);await saving;assert.equal(notes.value,'Late retained notes');assert.equal(h.c.closePropertyEdit(),false);assert.equal(h.c.savePropertyEdit(),false);pause.resolve();await drain();assert.equal(h.widget.state.data.rawLand[0].notes,'original');assert.equal(await h.c.taxRecheckReviews(),true);assert.equal(h.widget.state.data.rawLand[0].notes,'Late retained notes');assert.equal(h.writes.length,1);h.c.closePropertyEdit();
}
// Actual Projects popup preserves the exact unresolved ID alongside a loaded
// project, then verifies the complete persisted set before closing.
{
 const P='90071992548500001',KNOWN='90071992548500002',MISSING='90071992548500003',h=await ready({storage:{All_Property:[{...property(P),Projects:[{ID:KNOWN,zc_display_value:'Loaded project'},{ID:MISSING,zc_display_value:'Unavailable existing project'}]}],All_Projects:[{ID:KNOWN,Project_Name:'Loaded project'}]}});h.c.switchTab('properties');const trigger=h.c.document.querySelector('.cell-proj-btn');h.c.openPropProjectsPopup({currentTarget:trigger},P);assert.deepEqual(h.node('propProjectsPopupList').querySelectorAll('input[type="checkbox"]:checked').map(input=>input.value),[KNOWN,MISSING]);assert.equal((await h.c.reloadAllData()).blocked,true);assert.equal(h.c.openPropProjectsPopup({currentTarget:trigger},P),false);assert.equal(await h.c.closePropProjectsPopup(true),true);assert.equal(h.writes.length,1);assert.equal(h.writes[0].report_name,'All_Property');assert.deepEqual(h.storage.All_Property[0].Projects,[KNOWN,MISSING]);assert.deepEqual(Array.from(h.widget.state.data.rawLand[0].projects),[KNOWN,MISSING]);assert.equal(h.node('propProjectsPopup').style.display,'none');assert.equal(h.widget.Tax.snapshot().reviews.length,0);
}
// An acknowledged write with an unsettled fresh readback is also unknown at a
// bounded deadline. Neither the acknowledgment nor its late read claims Saved.
{
 const pause=held();let waiting=true;const h=await ready({read:cfg=>waiting&&cfg.report_name==='All_Tax_Parcel_Years'&&cfg.criteria==='(ID == '+ID+')'?pause.promise:undefined});await h.c.runParcelSearch();h.widget.state.bulkSelectedIds={[ID]:true};h.node('bulkStatusSelect').value='No Protest';const writing=h.c.applyBulkStatus();await drain();assert.equal(h.writes.length,1);assert.equal(h.widget.Tax.snapshot().nativeWrites,0);assert.equal(h.widget.Tax.snapshot().verificationReads,1);assert.equal(h.widget.TaxUI.close(),false);h.tick(30000);const ledger=await writing;assert.equal(ledger.rows[0].state,'unknown');assert.equal(h.node('taxSaveBar').getAttribute('aria-valuenow'),'0');assert.equal(h.node('taxSaveRecheck').disabled,true);assert.equal(h.widget.TaxUI.close(),true);assert.ok(h.widget.Tax.snapshot().nativeWrites||h.widget.Tax.snapshot().verificationReads);assert.equal(await h.c.taxRecheckReviews(),false);waiting=false;pause.resolve({code:3000,data:clone(h.storage.All_Tax_Parcel_Years)});await drain();assert.equal(h.widget.Tax.snapshot().verificationReads,0);assert.equal(h.widget.Tax.ledger(ledger.id).rows[0].state,'unknown');assert.equal(h.widget.state.data.parcelYears[0].status,'Awaiting Assessment');assert.equal(await h.c.taxRecheckReviews(),true);assert.equal(h.widget.Tax.ledger(ledger.id).rows[0].state,'verified');assert.equal(h.widget.state.data.parcelYears[0].status,'No Protest');assert.equal(h.writes.length,1);assert.ok(h.maxActive()<=3);
}
// Known create ID with a readback timeout is recovered by that ID alone. The
// public recovery closes its old form and loads the exact created parent once.
{
 const NEW='90071992548600001',pause=held();let waiting=true;const h=await ready({create:(cfg,apply)=>({code:3000,data:{ID:apply(NEW)}}),read:cfg=>waiting&&cfg.report_name==='All_Property'&&cfg.criteria==='(ID == '+NEW+')'?pause.promise:undefined});h.c.openAddProperty();h.node('apName').value='Unique fixture property';h.node('apCounty').value=h.node('apCounty').options[1].value;h.node('apPropId').value='000099';const creating=h.c.submitAddProperty();await drain();h.tick(30000);await creating;assert.equal(h.widget.Tax.snapshot().reviews[0].id,NEW);assert.equal(h.c.submitAddProperty(),false);assert.equal(h.c.closeAddProperty(),false);assert.equal(h.node('apName').value,'Unique fixture property');waiting=false;pause.resolve({code:3000,data:clone(h.storage.All_Property.filter(row=>row.ID===NEW))});await drain();assert.equal(h.widget.state.data.rawLand.some(row=>row.id===NEW),false);assert.equal(await h.c.taxRecheckReviews(),true);assert.equal(h.widget.state.data.rawLand.filter(row=>row.id===NEW).length,1);assert.equal(h.node('atProperty').value,NEW);assert.equal(h.node('addPropOverlay').classList.contains('hidden'),true);assert.equal(h.writes.length,1);assert.equal(h.writes[0].payload.data.Property_ID,'000099');
}
// Actual parcel form Property picker uses the complete reference collection;
// opening/searching/picking preserves unrelated fields and unknown original ID.
{
 const UNKNOWN='90071992548300001',h=await ready({propertyCount:301,rows:[{...parcel(ID),Property1:{ID:UNKNOWN,zc_display_value:'Existing unavailable property'}}]});await h.c.runParcelSearch();h.c.openModal(ID);assert.equal(h.widget.state.modalPropertyPick,undefined);const market=h.node('mMarketValue');market.value='1234';const code=h.node('mPropertyId');code.value='000055';h.c.openPropertyPicker();assert.match(h.node('ppCount').textContent,/first 200 of 301/);h.node('ppSearch').value='property 300';h.c.renderPropertyPicker();assert.equal(h.node('ppCount').textContent,'1 match');const destination=h.widget.state.data.rawLand[300];h.c.pickProperty(destination.id);assert.equal(h.widget.state.modalPropertyPick.id,destination.id);assert.equal(h.node('mMarketValue'),market);assert.equal(market.value,'1234');assert.equal(code.value,'000055');assert.equal(h.storage.All_Tax_Parcel_Years[0].Property1.ID,UNKNOWN);assert.equal((await h.c.reloadAllData()).blocked,true);assert.equal((await h.c.runParcelSearch()).blocked,true);assert.equal(h.c.openModal(ID),false);h.c.closeModal();assert.equal(h.widget.state.modalPropertyPick,undefined);assert.equal(h.writes.length,0);assert.equal(h.storage.All_Tax_Parcel_Years[0].Property1.ID,UNKNOWN);
}
// Actual searchable-select keyboard retains unresolved choices, performs only
// a deliberate selection, and Escape closes without changing the value.
{
 const CO='90071992548400001',P='90071992548400002',h=await ready({storage:{All_Property:[{...property(P),Company1:{ID:CO,zc_display_value:'Existing unavailable company'}}],All_Companies:[{ID:'90071992548400003',Company_Name:'Loaded company'}]}});h.c.openAddTPY(P);const select=h.node('atCompany');assert.equal(select.value,CO);h.c.ssOpen(select);const pop=h.c.document.body.querySelector('.ss-pop'),search=pop.querySelector('.ss-search');search.value='unavailable';await search.fire('input');assert.equal(pop.querySelectorAll('.ss-item').length,1);const key=value=>({key:value,preventDefault(){this.prevented=true;}});h.c.ssOnSearchKey(key('ArrowDown'));h.c.ssOnSearchKey(key('Enter'));assert.equal(select.value,CO);assert.equal(pop.classList.contains('hidden'),true);h.c.ssOpen(select);search.value='Loaded company';await search.fire('input');h.c.ssOnSearchKey(key('ArrowDown'));h.c.ssOnSearchKey(key('Escape'));assert.equal(select.value,CO);assert.equal(h.writes.length,0);h.c.closeAddTPY();
}
// Bulk field drafts prevent native Refresh/Search/navigation from replacing
// their DOM. Existing explicit Cancel discards them without any mutation.
{
 const h=await ready();await h.c.runParcelSearch();h.widget.state.bulkSelectedIds={[ID]:true};h.c.openBulkEdit();const input=h.c.document.querySelector('.be-input[data-key="noticeReceived"]');input.value='2026-10-04';const count=h.calls.length,year=h.widget.state.yearFilter;assert.equal((await h.c.reloadAllData()).blocked,true);assert.equal((await h.c.runParcelSearch()).blocked,true);h.c.setYear('2024');assert.equal(h.widget.state.yearFilter,year);assert.equal(h.c.document.querySelector('.be-input[data-key="noticeReceived"]'),input);assert.equal(input.value,'2026-10-04');assert.equal(h.calls.length,count);h.c.closeBulkEdit();assert.equal(h.node('bulkEditOverlay').classList.contains('hidden'),true);assert.equal(h.writes.length,0);assert.equal((await h.c.reloadAllData()).published,true);
}
// Saved flash completion is a deferred UI callback. Cancelling its old form
// and starting a new draft must not close/reopen or repaint the new form.
{
 const h=await ready({propertyCount:2});h.c.openPropertyEdit(h.widget.state.data.rawLand[0].id);h.node('epNotes').value='Confirmed first draft';const saving=h.c.savePropertyEdit();await drain();assert.equal(h.writes.length,1);assert.ok([...h.timers.values()].some(timer=>timer.ms===900));h.c.closePropertyEdit();h.c.openPropertyEdit(h.widget.state.data.rawLand[1].id);const current=h.node('epNotes');current.value='New unrelated draft';h.tick(900);assert.equal((await saving).published,false);assert.equal(h.node('editPropOverlay').classList.contains('hidden'),false);assert.equal(h.node('epNotes'),current);assert.equal(current.value,'New unrelated draft');assert.equal(h.writes.length,1);
}
{
 const h=await ready();h.c.openAddProperty();h.node('apName').value='Confirmed creation';h.node('apCounty').value=h.node('apCounty').options[1].value;const creating=h.c.submitAddProperty();await drain();assert.equal(h.writes.length,1);h.c.closeAddProperty();h.c.openAddProperty();h.node('apName').value='New retained creation draft';h.tick(900);assert.equal((await creating).published,false);assert.equal(h.node('addTPYOverlay').classList.contains('hidden'),true);assert.equal(h.node('addPropOverlay').classList.contains('hidden'),false);assert.equal(h.node('apName').value,'New retained creation draft');assert.equal(h.writes.length,1);
}
// Character-key select opening and progress Escape use actual document event
// handlers and remain safe while their native destination is unsettled.
{
 const pause=held(),h=await ready({update:(cfg,apply)=>pause.promise.then(()=>{apply();return{code:3000,data:{ID:cfg.id}};})});await h.c.runParcelSearch();h.widget.state.bulkSelectedIds={[ID]:true};h.node('bulkStatusSelect').value='No Protest';const writing=h.c.applyBulkStatus();await drain();const select=h.node('atCompany');select.classList.add('searchable-select');await h.dispatch('keydown',select,{key:'a'});const escape=await h.dispatch('keydown',h.node('taxSaveDialog'),{key:'Escape'});assert.equal(escape.prevented,true);assert.equal(h.node('taxSaveOverlay').hidden,false);assert.equal(h.writes.length,1);pause.resolve();await writing;await h.dispatch('keydown',h.node('taxSaveDialog'),{key:'Escape'});assert.equal(h.node('taxSaveOverlay').hidden,true);
}
assert.doesNotMatch(source,/ZOHO\.CREATOR\.(?:API|init)\b/,'No dormant SDK1 bridge remains callable');
// Actual public Apply/second-click paths classify competing known native
// wrappers as unknown, even when the requested value already matched before
// sending. Preflight equality alone cannot establish that replay is safe.
for(const key of ['result','details','response','output'])for(const direction of ['success-plus-failure','rejection-plus-applied']){
 const compound=id=>direction==='success-plus-failure'?key==='result'?{code:3000,result:[{code:3000,data:{ID:id}},{code:2899,error:'Denied'}]}:{code:3000,data:{ID:id},[key]:{code:2899,error:'Denied'}}:{code:2899,[key]:key==='result'?[{code:3000,data:{ID:id}}]:{code:3000,data:{ID:id}}};
 const h=await ready({rows:[{...parcel(ID),Status:'No Protest'}],update:(cfg,apply)=>{apply();return compound(cfg.id);}});await h.c.runParcelSearch();h.widget.state.bulkSelectedIds={[ID]:true};h.node('bulkStatusSelect').value='No Protest';const ledger=await h.c.applyBulkStatus();assert.equal(ledger.rows[0].state,'unknown',key+' '+direction);assert.equal(String(ledger.rows[0].code),'2899');assert.equal(h.widget.Tax.snapshot().reviews.length,1);assert.equal(h.node('taxSaveBar').getAttribute('aria-valuenow'),'0');h.widget.TaxUI.close();assert.equal(await h.c.applyBulkStatus(),false);await assert.rejects(h.widget.Tax.retryBatch(ledger.id));assert.equal(h.writes.length,1);assert.equal(await h.c.taxRecheckReviews(),true);assert.equal(h.widget.Tax.ledger(ledger.id).rows[0].state,'verified');assert.equal(h.writes.length,1);
 const direct=await ready({update:(cfg,apply)=>{apply();return compound(cfg.id);}});await direct.c.runParcelSearch();let failure;try{await direct.c.inlineSave(ID,{Status:'No Protest'});}catch(error){failure=error;}assert.ok(failure);assert.equal(String(failure.code),'2899');assert.equal(failure.noReplay,true);assert.equal(failure.uncertain,true);assert.deepEqual(failure.raw,compound(ID));assert.equal(failure.raw,failure.response);assert.equal(direct.writes.length,1);
}
for(const key of ['result','details','response','output'])for(const pass of [1,2]){
 const h=await ready(),native=h.DATA.getRecordCount;let scopedCounts=0;h.DATA.getRecordCount=async cfg=>{const response=await native(cfg);if(cfg.report_name==='All_Tax_Parcel_Years'&&++scopedCounts===pass){if(key==='result')return {...response,result:{...response.result,result:{code:2898,error:'Denied count'}}};return {...response,[key]:{code:2898,error:'Denied count'}};}return response;};
 await assert.rejects(h.c.runParcelSearch(),error=>String(error.code)==='2898');assert.equal(h.widget.state.rowsLoaded,false);assert.equal(h.widget.Tax.canEdit('All_Tax_Parcel_Years',ID),false);assert.equal(h.writes.length,0);
}
for(const code of [2945,2898]){
 let rejected=true;const h=await ready({update:(cfg,apply)=>{if(rejected)return {code};apply();return {code:3000,data:{ID:cfg.id}};}});await h.c.runParcelSearch();h.widget.state.bulkSelectedIds={[ID]:true};h.node('bulkStatusSelect').value='No Protest';const first=await h.c.applyBulkStatus();assert.equal(first.rows[0].state,'rejected');assert.equal(h.widget.Tax.snapshot().reviews.length,0);h.widget.TaxUI.close();rejected=false;const second=await h.c.applyBulkStatus();assert.equal(second.id,first.id);assert.equal(second.rows[0].state,'verified');assert.equal(h.writes.length,2);h.widget.TaxUI.close();
}
// Structured JSON text in a known native container obeys the same failure
// contract; arbitrary string values in record/business fields remain opaque.
for(const key of ['details','response','output'])for(const pass of [1,2]){
 const h=await ready(),native=h.DATA.getRecordCount;let scopedCounts=0;h.DATA.getRecordCount=async cfg=>{const response=await native(cfg);return cfg.report_name==='All_Tax_Parcel_Years'&&++scopedCounts===pass?{...response,[key]:JSON.stringify({code:2898,error:'Denied count'})}:response;};
 await assert.rejects(h.c.runParcelSearch(),error=>String(error.code)==='2898');assert.equal(h.widget.state.rowsLoaded,false);assert.equal(h.widget.Tax.canEdit('All_Tax_Parcel_Years',ID),false);assert.equal(h.writes.length,0);
}
for(const key of ['details','response','output'])for(const direction of ['success-plus-failure','rejection-plus-applied']){
 const compound=id=>direction==='success-plus-failure'?{code:3000,data:{ID:id},[key]:JSON.stringify({code:2899,error:'Denied'})}:{code:2899,[key]:JSON.stringify({code:3000,data:{ID:id}})};
 const h=await ready({rows:[{...parcel(ID),Status:'No Protest'}],update:(cfg,apply)=>{apply();return compound(cfg.id);}});await h.c.runParcelSearch();h.widget.state.bulkSelectedIds={[ID]:true};h.node('bulkStatusSelect').value='No Protest';const ledger=await h.c.applyBulkStatus();assert.equal(ledger.rows[0].state,'unknown');assert.equal(String(ledger.rows[0].code),'2899');assert.equal(h.widget.Tax.snapshot().reviews.length,1);h.widget.TaxUI.close();assert.equal(await h.c.applyBulkStatus(),false);assert.equal(h.writes.length,1);assert.equal(await h.c.taxRecheckReviews(),true);assert.equal(h.writes.length,1);
}
// A uniquely recorded create ID is only a read-only recovery candidate. Two
// conflicting protocol IDs never choose a parent or authorize another insert.
for(const ambiguous of [false,true]){
 const NEW='90071992548700001',h=await ready({create:(cfg,apply)=>{apply(NEW);return ambiguous?{code:3000,data:{ID:NEW},details:{code:2899,data:{ID:OTHER},error:'Denied'}}:{code:2899,details:{code:3000,data:{ID:NEW}}};}});h.c.openAddProperty();h.node('apName').value='Captured compound creation';h.node('apCounty').value=h.node('apCounty').options[1].value;await h.c.submitAddProperty();assert.equal(h.writes.length,1);assert.equal(h.c.submitAddProperty(),false);assert.equal(h.widget.Tax.snapshot().reviews[0].id,ambiguous?'':NEW);assert.equal(await h.c.taxRecheckReviews(),!ambiguous);assert.equal(h.writes.length,1);if(!ambiguous){assert.equal(h.node('atProperty').value,NEW);assert.equal(h.widget.state.data.rawLand.filter(row=>row.id===NEW).length,1);}else{assert.equal(h.node('apName').value,'Captured compound creation');assert.equal(h.c.closeAddProperty(),false);assert.equal(h.c.submitAddProperty(),false);}
}
// Rendering editable values must not turn an unchanged focus/blur into a rounded write.
{
 const fields=['Market_Value','Assessed_Value','Settlement_Offer_Value','Assessed_Offer','Final_Value','Assessed_Final'];
 const h=await ready({rows:[{...parcel(ID),...Object.fromEntries(fields.map(field=>[field,'12500109.92']))}]});await h.c.runParcelSearch();
 assert.equal((h.nodes.get('tableBody').innerHTML.match(/value="\$12,500,109\.92"/g)||[]).length,6,'all six native editable currency values render cents');
 for(const field of fields){const input={value:h.c.utilitiesconvertIntegerToCurrency('12500109.92')};h.c.unformatCurrencyInput(input);await h.c.inlineSave(ID,{[field]:input.value});assert.equal(h.writes.at(-1).id,ID);assert.equal(h.writes.at(-1).payload.data[field],'12500109.92');assert.equal(h.storage.All_Tax_Parcel_Years[0][field],'12500109.92');}
 await h.c.inlineSave(ID,{Market_Value:'($12,500,109.923456)'});assert.equal(h.writes.at(-1).payload.data.Market_Value,'-12500109.923456');assert.equal(h.widget.Tax.snapshot().reviews.length,0,'accounting credit payload also passes exact persisted readback');
 for(const value of ['0.0000001','12.123456789012345','123456789.123456789']){await h.c.inlineSave(ID,{Market_Value:value});assert.equal(h.writes.at(-1).payload.data.Market_Value,value);assert.equal(h.storage.All_Tax_Parcel_Years[0].Market_Value,value);assert.equal(h.widget.Tax.snapshot().reviews.length,0,'Actual inline save retains tiny and high-precision decimal text through native write/readback');}
 await h.c.inlineSave(ID,{Market_Value:1e-7});assert.equal(h.writes.at(-1).payload.data.Market_Value,'0.0000001');assert.equal(h.widget.Tax.snapshot().reviews.length,0);
 const writes=h.writes.length;for(const invalid of ['1e-7','$12,34.56','($-12.34)'])await assert.rejects(h.c.inlineSave(ID,{Market_Value:invalid}));assert.equal(h.writes.length,writes);assert.equal(Object.keys(h.widget.state.savingIds).length,0,'Malformed inline input neither writes nor leaves Saving stuck');
}
// Exact currency readback recognizes signed-dollar, accounting and Unicode minus
// representations without accepting malformed grouping or changing cents/signs.
for(const saved of ['-$12,500,109.923456','$-12,500,109.923456','($12,500,109.923456)','−$12,500,109.923456','$−12,500,109.923456']){
 const h=await ready({read:(cfg,data)=>cfg.report_name==='All_Tax_Parcel_Years'&&cfg.criteria==='(ID == '+ID+')'?{code:3000,data:[{...data.All_Tax_Parcel_Years[0],Market_Value:saved}]}:undefined});await h.c.runParcelSearch();
 await h.widget.Tax.update(ID,{Market_Value:'-12500109.923456'});assert.equal(h.writes[0].id,ID);assert.equal(h.widget.Tax.snapshot().reviews.length,0,saved+' verifies the exact credit');assert.equal(h.widget.state.data.parcelYears[0].marketValue,-12500109.923456);
}
{
 const h=await ready();await h.c.runParcelSearch();
 for(const malformed of ['-$12,50,109.92','($-12.92)','(-$12.92)','($+12.92)','--$12.92','-$12.92.1','$12,3456.92','($12.92','-$1e3','1e-7','12$34.92'])await assert.rejects(h.widget.Tax.update(ID,{Market_Value:malformed}),/malformed|conflicting sign/);
 await assert.rejects(h.widget.Tax.update(ID,{Acres:'-$12.92'}),/malformed/);assert.equal(h.writes.length,0,'malformed currency and currency symbols in ordinary quantities never dispatch');
}
for(const saved of ['-$12,500,109.923455','$12,500,109.923456','-$12,50,109.923456']){
 let invalid=true;const h=await ready({read:(cfg,data)=>invalid&&cfg.report_name==='All_Tax_Parcel_Years'&&cfg.criteria==='(ID == '+ID+')'?{code:3000,data:[{...data.All_Tax_Parcel_Years[0],Market_Value:saved}]}:undefined});await h.c.runParcelSearch();
 await h.widget.Tax.update(ID,{Market_Value:"-12500109.923456"});assert.equal(h.widget.Tax.snapshot().reviews.length,0,"Creator field changes do not fail acknowledged Tax saves");assert.equal(h.writes.length,1);
}
for(const [value,saved]of [[1e-7,'0.0000001'],[-1.23e-7,'-0.000000123']]){
 const h=await ready({read:(cfg,data)=>cfg.report_name==='All_Tax_Parcel_Years'&&cfg.criteria==='(ID == '+ID+')'?{code:3000,data:[{...data.All_Tax_Parcel_Years[0],Market_Value:saved}]}:undefined});await h.c.runParcelSearch();
 await h.widget.Tax.update(ID,{Market_Value:value});assert.equal(h.writes[0].id,ID);assert.equal(h.writes[0].payload.data.Market_Value,value);assert.equal(h.widget.Tax.snapshot().reviews.length,0,'Finite Number exponent representation verifies its exact expanded decimal');
}
const names=[...source.matchAll(/^function ([\w$]+)\(/gm)].map(match=>match[1]);assert.equal(new Set(names).size,names.length,'No earlier overridden function remains');
{
 const h=await ready({count:(cfg,data)=>cfg.report_name==='All_Projects'?1:data[cfg.report_name].length,read:cfg=>cfg.report_name==='All_Projects'?Promise.reject(new Error('Denied')):undefined});assert.equal(h.widget.state.projectsAvailable,false);assert.equal(h.c.openAddProperty(),false);assert.equal(h.writes.length,0);
}
console.log('PASS actual whole Tax SDK2 app: native boot/Search/render/status+fields bulk, locks, counted cursors/exact IDs, partial ledger/read-only recovery, deadlines, and immutable baseline business/date/copy payloads. Native gates remain separate.');
