import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "widgets/manage-lots/src/app/widget.html"), "utf8");
const countsSource = fs.readFileSync(path.join(root, "widgets/manage-lots/src/app/subdivision-counts.js"), "utf8");
const counts = new Function("module", `${countsSource}\nreturn module.exports;`)({ exports: {} });

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const brace = source.indexOf("{", start);
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not parse ${name}`);
}

const scalar = (value) => {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(scalar).filter(Boolean).join(", ");
  if (typeof value === "object") return String(value.display_value || value.zc_display_value || value.Subdivision_Name || value.Builder_Name || value.Name || value.value || value.ID || value.id || "");
  return String(value);
};
const natural = (a, b) => scalar(a).localeCompare(scalar(b), undefined, { numeric: true, sensitivity: "base" });
const lotBlock = new Function("str", `return (${extractFunction("lotBlock")})`)(scalar);
const lotDetailParts = new Function("str", `return (${extractFunction("lotDetailParts")})`)(scalar);
const eligible = new Function("str", "truthy", "inTakedown", `return (${extractFunction("eligible")})`)(scalar, Boolean, () => false);

assert.equal(lotBlock({ Block: "A" }), "A", "letter blocks must remain visible");
assert.equal(lotBlock({ Block: { display_value: "B2" } }), "B2", "Creator display objects must remain visible");
assert.equal(lotBlock({ Lot_Code: "AAA-B01-L012" }), "1", "missing report Block values must fall back to Lot_Code");
assert.equal(lotBlock({ Lot_Code: "AAA-BC-L12" }), "C", "letter blocks must be derived from Lot_Code");
assert.equal(lotBlock({ Lot_Code: "NO-BLOCK-DATA" }), "Unassigned", "unknown codes must use the explicit fallback group");
assert.deepEqual(lotDetailParts([{ display_value: "AAA01-B01-L15 - Sold" }, { display_value: "AAA01-B01-L16 - Open" }]), [
  { code: "AAA01-B01-L15", status: "Sold" },
  { code: "AAA01-B01-L16", status: "Open" },
], "lot relationship details must split into readable code and status values");
assert.deepEqual(lotDetailParts("AAA01-B01-L17 - Scheduled"), [{ code: "AAA01-B01-L17", status: "Scheduled" }]);
assert.equal(eligible({ Status: "Open" }), true);
assert.equal(eligible({ Status: "Scheduled" }), false, "scheduled lots cannot enter another takedown");
assert.equal(eligible({ Status: "Contracted" }), true, "contracted lots are selectable at the user’s request");

assert.match(source, /takedowns:\s*"All_Builder_Takedowns"/, "Builder Takedowns report must be loaded");
assert.match(source, /View only/, "Builder Takedowns view must remain read-only");
assert.match(source, /aria-multiselectable="true"/, "subdivision filtering must expose an accessible multi-select");
assert.match(source, /Search subdivisions/, "subdivision filtering must be searchable");
assert.match(source, /class="subdivision-row"/, "Builder Takedowns must include subdivision grouping rows");
assert.match(source, /class="lot-detail-chip"/, "lot details must render as scannable chips");
assert.match(source, /A takedown can include lots from one subdivision/, "cross-subdivision takedown selection must be prevented");
assert.match(source, /pointerdown/, "drag selection must start with pointer input");
assert.match(source, /pointermove/, "drag selection must cover lots crossed while holding");
assert.match(source, /\.lot\.chosen::after/, "selected lots must have a prominent selected marker");
assert.doesNotMatch(source, /ZOHO\.CREATOR\.API\.(updateRecord|deleteRecord)/, "the Builder Takedowns view must not expose editing APIs");

/* Cached counts, refreshed data, string IDs and Legal status tints. */
const fixture = { lots: [], subdivisions: [{ ID: "90071992547409931", Subdivision_Name: "Phase 1" }], takedowns: [], contracts: [], takedownLotIds: new Set() };
const helpers = new Function("S", "str", "natural", `
  var dataIndex=null,emptyStats={total:0,available:0,sold:0,scheduled:0};
  ${["truthy", "idOf", "relationEmpty", "relationIds", "lotSubdivisionId", "inTakedown", "eligible", "indexes", "subdivisionStats", "lotById", "lotState"].map(extractFunction).join("\n")}
  return {indexes,subdivisionStats,lotById,lotState,eligible};
`)(fixture, scalar, natural);
const sid = "90071992547409931";
const countLotStats=new Function('eligible','lotSubdivisionId','str',`return (${extractFunction('countLotStats')})`)(eligible,l=>String(l.Subdivision.ID),scalar);
const beforeSelection=countLotStats([
  {ID:'1',Subdivision:{ID:sid},Status:'Open'},
  {ID:'2',Subdivision:{ID:sid},Status:'Scheduled'},
  {ID:'3',Subdivision:{ID:sid},Status:' scheduled '},
  {ID:'4',Subdivision:{ID:sid},Status:'Sold'},
]);
assert.deepEqual(beforeSelection.get(sid),{total:4,available:1,sold:1,scheduled:2},'counts must include Scheduled lots before subdivision selection');
const readyScopes=new Set(),freshCounts={total:3,available:1,sold:2,scheduled:0};
const pickStats=new Function('S','subdivisionReady','subdivisionCounts','indexes','emptyStats',`return (${extractFunction('subdivisionStats')})`)({live:true},readyScopes,beforeSelection,()=>({stats:new Map([[sid,freshCounts]])}),{total:0,available:0,sold:0,scheduled:0});
assert.equal(pickStats(sid),beforeSelection.get(sid),'unselected subdivisions use independently loaded counts');
readyScopes.add(sid);assert.equal(pickStats(sid),freshCounts,'fresh scoped records supersede background counts after selection');
fixture.lots = [
  { ID: "90071992547409941", Subdivision: { ID: sid }, Status: "Open", Archived: "false" },
  { ID: "90071992547409942", Subdivision: { ID: sid }, Status: "Open", On_Hold: "true" },
  { ID: "90071992547409943", Subdivision: { ID: sid }, Status: "Contracted" },
  { ID: "90071992547409944", Subdivision: { ID: sid }, Status: "Sold" },
  { ID: "90071992547409945", Subdivision: { ID: sid }, Status: "Open", Archived: "true" },
  { ID: "90071992547409946", Subdivision: { ID: sid }, Status: "Open", Add_Builder_Takedown_Name: { ID: "90071992547409951" } },
];
assert.deepEqual(helpers.subdivisionStats(sid), { total: 6, available: 3, sold: 1, scheduled: 0 });
const cached = helpers.indexes();
for (let i = 0; i < 500; i += 1) assert.equal(helpers.indexes(), cached, "filter clicks must reuse the existing index");
assert.equal(helpers.lotById("90071992547409941"), fixture.lots[0], "IDs larger than safe integers must remain exact");
assert.deepEqual(fixture.lots.map(helpers.lotState), ["open", "hold", "contracted", "sold", "other", "takedown"]);
assert.equal(helpers.lotState({ ID: "90071992547409947", Status: "Scheduled" }), "scheduled", "Scheduled must retain Legal's amber tint");
assert.equal(helpers.eligible(fixture.lots[1]), true, "On Hold is a visual flag, not a new eligibility rule");
fixture.contracts = [{ ID: "90071992547409961", Status: "Draft", Lots1: [{ ID: fixture.lots[0].ID }] }];
assert.equal(helpers.lotState(fixture.lots[0]), "claim", "in-flight contracts must get Legal's orange tint");
assert.equal(helpers.eligible(fixture.lots[0]), true, "Legal context must not change the takedown business rules");
fixture.contracts = [{ ID: "90071992547409961", Status: "Approval Rejected", Lots1: [{ ID: fixture.lots[0].ID }] }];
assert.equal(helpers.lotState(fixture.lots[0]), "open", "rejected contracts release the visual claim");
fixture.contracts = [{ ID: "90071992547409961", Archive: "true", Lots1: [{ ID: fixture.lots[0].ID }] }];
assert.equal(helpers.lotState(fixture.lots[0]), "open", "archived contracts release the visual claim");
fixture.lots = fixture.lots.map(l => ({ ...l, Status: "Sold" }));
assert.notEqual(helpers.indexes(), cached, "refresh must invalidate cached counts");
assert.deepEqual(helpers.subdivisionStats(sid), { total: 6, available: 0, sold: 6, scheduled: 0 });
assert.match(extractFunction("latestSelected"), /readSubdivisionLots\(sid\)/, "submission must still reread lots");
assert.match(extractFunction("latestSelected"), /!eligible\(map.get\(id\)\)/, "submission must reject stale eligibility");
assert.doesNotMatch(extractFunction("applySubdivisionFilter"), /renderSubdivisionOptions/, "selection must preserve picker nodes and focus");
let detailCalls = 0;
const detailReader = new Function("S", "CFG", "getAll", "auditLog", "lotById", `
  var lotDetails=new Map(),lotDetailLoads=new Map(),hoverId="",hoverX=0,hoverY=0;
  var $=()=>null;
  ${extractFunction("loadLotDetails")}
  return {loadLotDetails,lotDetails};
`)({ live: true }, { reports: { lotDetails: "All_Active_Lots_Contracts_View" } }, async (report, criteria) => {
  detailCalls++;
  assert.equal(report, "All_Active_Lots_Contracts_View");
  assert.equal(criteria, `(Subdivision == ${sid})`);
  return [{ ID: fixture.lots[0].ID, Lot_Size: 45 }];
}, () => {}, () => null);
await Promise.all([detailReader.loadLotDetails(sid), detailReader.loadLotDetails(sid)]);
assert.equal(detailCalls, 1, "hover enrichment must share one fetch per subdivision");
assert.equal(detailReader.lotDetails.get(fixture.lots[0].ID).Lot_Size, 45);
await detailReader.loadLotDetails("invalid-subdivision");
assert.equal(detailCalls, 1, "unverified lookup IDs must never enter Creator criteria");
// Sold records from the full list report supplement the all-fields report within the selected scope.
const scopeCalls=[];
const scopeReader=new Function('CFG','getAll','auditLog','subdivisionName','str',`return (${extractFunction('readSubdivisionLots')})`)({reports:{lots:'All_Lots_All_Fields',lotsList:'All_Active_Lots_List_View'}},async(report,criteria)=>{
  scopeCalls.push({report,criteria});
  if(report==='All_Lots_All_Fields')return [{ID:'501',Subdivision:{ID:sid},Status:'Open',Archived:true}];
  return Array.from({length:42},(_,i)=>({ID:String(501+i),Subdivision:{ID:sid},Status:i?'Sold':'Open',Block:'7',Lot_Number:i+1}));
},()=>{},()=> 'Fixture subdivision',scalar);
const scoped=await scopeReader(sid);assert.equal(scoped.length,42);assert.equal(scoped.filter(l=>l.Status==='Sold').length,41);assert.equal(scoped[0].Archived,true,'list enrichment must preserve fields missing from that report');assert.ok(scopeCalls.every(c=>c.criteria===`(Subdivision == ${sid})`));
await assert.rejects(()=>scopeReader('untrusted-id'),/invalid/);
let pages=0;
const paged=new Function('CFG','ZOHO','emptyResponse','responseBad','sdkResponseInfo','auditLog','safeStringify',`return (${extractFunction('getAll')})`)({pageSize:2,maxPages:2},{CREATOR:{API:{getAllRecords:async()=>{pages++;return {data:[{ID:'1'},{ID:'2'}]};}}}},()=>false,()=>false,()=>({}),()=>{},JSON.stringify);
await assert.rejects(()=>paged('Lots',`(Subdivision == ${sid})`),/incomplete/);assert.equal(pages,2,'a full last page must fail, never silently truncate');
const sdkResponseInfo=new Function(`return (${extractFunction('sdkResponseInfo')})`)();
const emptyResponse=new Function('sdkResponseInfo',`return (${extractFunction('emptyResponse')})`)(sdkResponseInfo);
const reportAudit=[];
const getAllFor=(request)=>new Function('CFG','ZOHO','emptyResponse','responseBad','sdkResponseInfo','auditLog','safeStringify',`return (${extractFunction('getAll')})`)({version:'test',pageSize:2,maxPages:5},{CREATOR:{API:{getAllRecords:request}}},emptyResponse,()=>false,sdkResponseInfo,(level,msg,meta)=>reportAudit.push({level,msg,meta}),JSON.stringify);
assert.deepEqual(await getAllFor(async()=>{throw {code:3100,message:'No records found for the given criteria.'};})('Lots'),[],'Creator rejects its promise for an empty scope; this is not a loading error');
for(const response of ['{"code":3100,"message":"No records found for the given criteria."}',{responseText:'{"code":3100}'},{result:'{"code":3100}'},{message:'{"code":3100}'}])assert.deepEqual(await getAllFor(async()=>{throw response;})('Lots','(Subdivision == 101)'),[],'wrapped/string Creator empty responses must be decoded');
assert.ok(reportAudit.some(e=>e.meta.codePath==='root.json.code'&&e.meta.criteria==='(Subdivision == 101)'&&e.meta.report==='Lots'),'audit must identify exact report, criteria, and the code location in the response');
assert.deepEqual(await getAllFor(async a=>{if(a.page===1)return {data:[{ID:'1'},{ID:'2'}]};throw {code:'3100'};})('Lots'),[{ID:'1'},{ID:'2'}],'an empty rejected last page must preserve already-loaded lots');
await assert.rejects(()=>getAllFor(async()=>{throw {code:1030,message:'Permission denied'};})('Lots'),e=>e.code===1030,'permission errors must remain blocking');
const takedownState={subdivisionIds:['lot-view-sub'],takedownSubdivisionIds:[],takedowns:[{ID:'10',Name:'Older',Subdivision1:{ID:'a'},Added_Time:'01-Jan-2025 10:00:00'},{ID:'11',Name:'Latest',Subdivision1:{ID:'b'},Added_Time:'30-Sep-2026 10:00:00'}]};
const newest=new Function('str',`return (${extractFunction('takedownNewest')})`)(scalar);
const visibleTakedowns=new Function('S','$','idOf','str','takedownNewest',`return (${extractFunction('visibleTakedowns')})`)(takedownState,()=>({value:''}),v=>v.ID,scalar,newest);
assert.deepEqual(visibleTakedowns().map(t=>t.Name),['Latest','Older'],'the takedown tab must show latest records without inheriting the Lots filter');
takedownState.takedownSubdivisionIds=['a'];assert.deepEqual(visibleTakedowns().map(t=>t.Name),['Older'],'a chosen takedown subdivision filters the list');
takedownState.takedownSubdivisionIds=[];assert.equal(visibleTakedowns().length,2,'clearing the optional filter restores all takedowns');

// Aggregate count envelopes must distinguish a real zero from a failed/malformed read.
for (const response of [{code:3000,result:{records_count:'0'}},{result:{records_count:'17'}},{records_count:5},{record_count:'6'},{count:7}]) {
  assert.equal(counts.extractCount(response), Number(response.result?.records_count ?? response.records_count ?? response.record_count ?? response.count));
}
for (const response of [null,{}, {code:1030,result:{records_count:'0'}},{result:{code:3330,records_count:0}}, {code:3000,error:'denied',count:0},{code:3000,result:{error:'denied',records_count:0}},
  ...[null,false,{},[], '', ' ', -1,1.5, 'abc', Number.MAX_SAFE_INTEGER+1].map(records_count=>({code:3000,result:{records_count}}))]) {
  assert.equal(counts.extractCount(response),null,'invalid counts must remain unknown, never display a false zero');
}

const claims = {takedownLotIds:new Set(['90071992547409999','90071992547410000'])};
const criteriaFor = new Function('S',`return (${extractFunction('subdivisionCountCriteria')})`)(claims);
const scope = `(Subdivision == ${sid})`;
assert.equal(criteriaFor(sid,'sold'),`${scope} && (Status == "Sold")`);
assert.equal(criteriaFor(sid,'scheduled'),`${scope} && (Status == "Scheduled")`);
assert.equal(criteriaFor(sid,'available'),`${scope} && ((Status == "Open") || (Status == "Contracted")) && (Archived == false) && (Add_Builder_Takedown_Name == null) && (ID != 90071992547409999) && (ID != 90071992547410000)`, 'every reverse takedown claim must be excluded without converting IDs to numbers');
assert.throws(()=>criteriaFor('untrusted-id','available'),/invalid/);
assert.throws(()=>criteriaFor(sid,'unknown'),/Unknown/);
claims.takedownLotIds.add('untrusted-id');assert.throws(()=>criteriaFor(sid,'available'),/invalid/);
claims.takedownLotIds=new Set(Array.from({length:100},(_,i)=>String(100000+i)));
assert.equal(criteriaFor(sid,'available'),null,'oversized exclusions must use scoped rows rather than omit claims');
let aggregateReads=0,scopedReads=0;
const largeScopeReader=new Function('ZOHO','subdivisionCountCriteria','fallbackSubdivisionCount','LMSubdivisionCounts','sdkResponseInfo','auditLog','errText','CFG',`
  var loadGeneration=1,availableCountsUseRows=false;
  return (${extractFunction('readSubdivisionCount')});
`)({CREATOR:{API:{getRecordCount:async()=>{aggregateReads++;return {code:3000,result:{records_count:999}};}}}},criteriaFor,async(id,field)=>{
  scopedReads++;assert.equal(id,sid);assert.equal(field,'available');return 4;
},counts,sdkResponseInfo,()=>{},String,{reports:{lotsList:'All_Active_Lots_List_View'}});
assert.equal(await largeScopeReader(sid,'available'),4);
assert.equal(aggregateReads,0,'large exclusion sets must never send a truncated aggregate criterion');
assert.equal(scopedReads,1);

// Fallback rows retain server-side relationship filtering even when the quick
// view omits the lookup field. Reverse claims still use the local eligibility rule.
const fallbackCalls=[];
fixture.takedownLotIds.add('90071992547409999');
const fallbackStats=new Function('eligible','lotSubdivisionId','str',`return (${extractFunction('countLotStats')})`)(helpers.eligible,l=>String(l.Subdivision.ID),scalar);
function makeFallback(read){return new Function('CFG','getAll','countLotStats','subdivisionCountCriteria','emptyStats',`
  var subdivisionCountFallbacks=new Map();return (${extractFunction('fallbackSubdivisionCount')});
`)({reports:{lotsList:'All_Active_Lots_List_View'}},read,fallbackStats,criteriaFor,{total:0,available:0,scheduled:0,sold:0});}
const fallback=makeFallback(async(report,criteria)=>{
  fallbackCalls.push({report,criteria});
  assert.equal(report,'All_Active_Lots_List_View');assert.ok(criteria.includes(scope),'fallback must never download all subdivisions');
  if(criteria.includes('"Contracted"')){
    assert.ok(criteria.includes('(Archived == false)'));
    assert.ok(criteria.includes('(Add_Builder_Takedown_Name == null)'),'missing lookup values cannot silently count as empty');
    return [{ID:'1',Subdivision:{ID:sid},Status:'Contracted'},{ID:'90071992547409999',Subdivision:{ID:sid},Status:'Open'}];
  }
  return [{ID:'2',Subdivision:{ID:sid},Status:criteria.includes('"Scheduled"')?'Scheduled':'Sold'}];
});
assert.equal(await fallback(sid,'available'),1,'reverse claims remain unavailable in the scoped fallback');
assert.equal(await fallback(sid,'available'),1);assert.equal(fallbackCalls.length,1,'fallback reads are shared');
assert.equal(await fallback(sid,'scheduled'),1);assert.equal(await fallback(sid,'sold'),1);
await assert.rejects(()=>makeFallback(async()=>{throw {code:1030};})(sid,'available'),error=>error.code===1030,'a failed fallback cannot publish zero');

// Controlled responses reproduce the minute-long global barrier without sleeping.
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const jobs=new Map(),started=[],changed=[];
let active=0,maxActive=0;
const queue=counts.create({concurrency:2,read(id,field){
  const key=`${id}:${field}`;assert.ok(!jobs.has(key),`duplicate count request ${key}`);
  active++;maxActive=Math.max(maxActive,active);started.push(key);
  return new Promise((resolve,reject)=>jobs.set(key,{resolve,reject})).finally(()=>{active--;});
},changed(id){changed.push(id);}});
const fields=['available','scheduled','sold'];
queue.request(['a','b'],fields);await flush();
assert.deepEqual(started,['a:available','a:scheduled']);
jobs.get('a:scheduled').resolve(2);await flush();
assert.equal(queue.values.get('a').scheduled,2,'fast badges must publish while another response is still pending');
assert.equal(queue.values.get('a').available,null,'pending available counts must remain unknown');
assert.equal(started.at(-1),'a:sold');
queue.request(['c','c'],fields);queue.request(['a'],fields);
jobs.get('a:sold').resolve(1);await flush();
assert.equal(started.at(-1),'c:available','newly visible subdivisions must jump ahead of queued offscreen reads');
jobs.get('c:available').resolve(5);await flush();
assert.equal(started.at(-1),'c:scheduled');
jobs.get('c:scheduled').reject(new Error('Permission denied'));await flush();
assert.equal(queue.values.get('c').scheduled,null);
assert.match(queue.error('c','scheduled').message,/Permission/);
queue.request(['c'],fields);await flush();
assert.equal(started.filter(key=>key==='c:scheduled').length,1,'scroll/search must not retry failed reads repeatedly');
assert.equal(started.filter(key=>key==='c:available').length,1,'scroll/search must reuse completed reads');
assert.equal(started.filter(key=>key==='c:sold').length,1,'scroll/search must share in-flight reads');
jobs.get('c:sold').resolve(3);await flush();
assert.equal(started.at(-1),'b:available');
assert.equal(maxActive,2,'the scheduler must bound simultaneous Creator requests');
const changesBeforeStop=changed.length,startsBeforeStop=started.length;
queue.stop();jobs.get('a:available').resolve(99);jobs.get('b:available').resolve(88);await flush();
queue.request(['d'],fields);await flush();
assert.equal(changed.length,changesBeforeStop,'a refresh must discard stale count completions');
assert.equal(queue.values.get('a').available,null);
assert.equal(queue.values.has('b'),false);
assert.equal(started.length,startsBeforeStop,'stopping must cancel queued work and prevent new requests');
console.log("Manage Lots bounded/incremental counts, criteria safety, cache invalidation, Legal tints, eligibility, string IDs, selection, and read-only takedown checks passed.");
