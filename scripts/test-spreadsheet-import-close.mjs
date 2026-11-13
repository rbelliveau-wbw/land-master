import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('widgets/land-master/src/app/spreadsheet-import.js', 'utf8');
const subdivision = {ID: '90071992547409931', Subdivision_Name: 'Sample Creek — Phase 1', Subdivision_Code: 'SC01', Phase: '1', Project: {ID:'90071992547409930',display_value:'Sample Creek'}, City: 'Seguin', County: 'Guadalupe'};
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return {promise, resolve};
};

// The importer renders HTML strings; these nodes provide only the mounted DOM
// operations required by its real open, create, scan and close lifecycle.
function harness(count = 3, options = {}) {
  const elements = new Map();
  const documentListeners = {};
  const document = {body: {style: {}}, addEventListener(type, fn) { documentListeners[type] = fn; }};
  function node(id) {
    if (!elements.has(id)) {
      const classes = new Set();
      const scroll = {scrollTop: 0};
      const element = {
        id, dataset: {}, style: {}, innerHTML: '', textContent: '', disabled: false,
        listeners: {}, setAttribute(key,value){this[key]=value;},
        classList: {
          toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); },
          contains(name) { return classes.has(name); }
        },
        addEventListener(type, fn) { this.listeners[type] = fn; },
        focus() { document.activeElement = this; },
        querySelector(selector) { if(selector==='#siPairRun')return this.innerHTML.includes('id="siPairRun"')?{}:null;return selector === '.si-review-scroll' && this.innerHTML.includes('si-review-scroll') ? scroll : null; },
        querySelectorAll() { return []; }
      };
      elements.set(id, element);
    }
    return elements.get(id);
  }
  document.getElementById = node;
  const backgroundNode={id:'underlying-app',inert:false,contains(){return false;}},confirmation={id:'piConfirm',inert:false,contains(){return false;}};document.body.children=[backgroundNode,confirmation];
  document.activeElement = node('importTrigger');
  const sandbox = vm.createContext({document, window: {addEventListener() {}}, console});
  vm.runInContext(source, sandbox);
  const api = sandbox.LMSpreadsheetImport;
  const calls = {confirm: [], add: [], properties: [], logs: [], reload: 0};
  const host=fs.readFileSync('widgets/land-master/src/app/widget.html','utf8');
  vm.runInContext(host.slice(host.indexOf('function landCreatedRecordId('),host.indexOf('function refreshLandCreatedCollection(')),sandbox);
  if(options.noProject) subdivision.Project=null;
  const controls = {confirm: options.confirm ?? true};
  const spreadsheetRows = api.sheetRows('Lots', Array.from({length: count}, (_, i) => ['1', String(i + 1), '50']));
  const mappings = spreadsheetRows.map(row => ({sheet: row.sheet, row: row.row, subdivision_id: subdivision.ID, block_column: 0, lot_column: 1, width_column: 2}));
  const hostContext = {
    subdivisions: () => [subdivision], selected: () => [subdivision.ID],
    cities: ['Seguin'], counties: ['Guadalupe'], readLots: async () => {if(options.failRead)throw Error('Lot read denied');return options.existing || [];},
    recordId:sandbox.landCreatedRecordId,scope:()=>controls.scope||'original',
    async invoke(payload) {
      if (payload.mode === 'ping') {
        if (options.scanGate) await options.scanGate.promise;
        return {spreadsheet_schema: 2};
      }
      return {rows: mappings.filter(row => payload.sourceRows.some(input => input.sheet === row.sheet && input.row === row.row)), warnings: []};
    },
    async add(data) {
      calls.add.push(data);
      if (options.addGate) await options.addGate.promise;
      if (data.Lot_Number === options.failLot) throw Error('Lot insert failed');
      if(options.unknownLot)throw Object.assign(Error('Connection lost'),{uncertain:true});
      return options.missingLotId?{code:3000}:{code:3000,result:[{code:3000,data:{ID:String(90071992547409940n+BigInt(calls.add.length))}}]};
    },
    async addProperty(data){calls.properties.push(data);if(options.propertyGate)await options.propertyGate.promise;if(options.unknownProperty)throw Object.assign(Error('Property reply lost'),{uncertain:true});if(options.failProperty&&data.Property_ID.endsWith('L'+String(options.failProperty).padStart(2,'0')))throw Error('Permission denied');return options.missingPropertyId?{code:3000}:{code:3000,result:[{code:3000,data:{ID:String(90071992547410940n+BigInt(calls.properties.length))}}]};},
    async reload() { calls.reload++;if(options.reloadError)throw Error('Refresh unavailable'); },
    log(...args) {calls.logs.push(args);}, error: error => error.message,
    async confirm(config) { calls.confirm.push(config); return controls.confirm; }
  };
  const importer = api.mount(hostContext);
  importer.open();
  const state = importer.state();
  state.step = 2;
  state.fileName = 'sample-lots.csv';
  state.source = spreadsheetRows;
  state.rows = api.stage(spreadsheetRows, mappings, [subdivision]);
  importer.paint();
  return {importer, state, calls, controls, node, document, documentListeners, hostContext, sandbox};
}

// Reproduce the reported 133/134 result through the actual creation path.
{
  const h = harness(134);
  h.state.rows[133].on = false;
  await h.importer.create();
  assert.equal(h.calls.add.length, 133);
  h.calls.add.forEach((data, index) => {
    assert.equal(Object.hasOwn(data, 'Notes'), false, 'AI import must omit Notes entirely, including blank or null values');
    assert.deepEqual(JSON.parse(JSON.stringify(data)), {
      Lot_Code: 'SC01-B01-L' + String(index + 1).padStart(2, '0'),
      Status: 'Open', Subdivision: subdivision.ID, Subdivision_Code: 'SC01',
      Phase: 1, Block: '1', Lot_Number: index + 1,
      City: 'Seguin', County: 'Guadalupe', Archived: false, On_Hold: false,
      Lot_Size: 50
    }, 'omitting Notes must preserve the remaining imported fields and the exact subdivision ID');
  });
  assert.equal(h.calls.reload, 1);
  assert.equal(h.state.run.total, 133);
  assert.equal(h.state.run.created, 133);
  assert.equal(h.state.rows.filter(row => row.created).length, 133);
  assert.equal(h.state.rows[133].created, false);
  assert.equal(h.state.rows[133].on, false);
  const rows = h.state.rows;
  await h.importer.close();
  assert.equal(h.calls.confirm.length, 0, 'an intentionally excluded lot must not prompt after selected lots are created');
  assert.equal(h.state.open, false);
  assert.equal(h.node('platModal').classList.contains('open'), false);
  assert.equal(h.document.body.style.overflow, '');
  assert.equal(h.document.activeElement, h.node('importTrigger'));
  assert.equal(h.state.rows, rows, 'closing must preserve saved and excluded row state');
}

// An absent source width omits Lot_Size as well as Notes, without blocking creation.
{
  const h = harness(1);
  h.state.rows[0].width = '';
  await h.importer.create();
  assert.equal(h.calls.add.length, 1);
  assert.equal(Object.hasOwn(h.calls.add[0], 'Notes'), false);
  assert.equal(Object.hasOwn(h.calls.add[0], 'Lot_Size'), false);
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls.add[0])), {
    Lot_Code: 'SC01-B01-L01', Status: 'Open', Subdivision: subdivision.ID,
    Subdivision_Code: 'SC01', Phase: 1, Block: '1', Lot_Number: 1,
    City: 'Seguin', County: 'Guadalupe', Archived: false, On_Hold: false
  });
  assert.equal(h.state.run.created, 1);
}

// A failed selected lot still represents unfinished work. Cancel retains it;
// confirming later dismisses only the wizard, without another database action.
{
  const h = harness(3, {failLot: 2, confirm: false});
  h.state.rows[2].on = false;
  await h.importer.create();
  assert.equal(h.state.run.created, 1);
  assert.equal(h.state.run.failed, 1);
  assert.equal(h.state.rows[1].on, true);
  assert.equal(h.state.rows[1].error, 'Lot insert failed');
  const rows = h.state.rows;
  const before = JSON.stringify(rows);
  await h.importer.close();
  assert.equal(h.calls.confirm.length, 1, 'a selected failed row must still prompt');
  assert.equal(h.calls.confirm[0].title, 'Discard 2 unsaved lots?', 'the discarded count includes the failed selected lot and the excluded lot');
  assert.equal(h.calls.confirm[0].message, 'Your 1 saved lot is safe.');
  assert.equal(h.calls.confirm[0].okLabel, 'Discard 2 lots');
  assert.equal(h.state.open, true, 'Cancel must leave the wizard open');
  assert.equal(h.state.confirming, false);
  assert.equal(h.state.rows, rows);
  assert.equal(JSON.stringify(rows), before);
  h.controls.confirm = true;
  await h.importer.close();
  assert.equal(h.state.open, false);
  assert.equal(h.calls.add.length, 2, 'discarding staged rows must not modify persisted lots');
  assert.equal(JSON.stringify(rows), before);
}

// The 133 saved + one selected pending result names exactly the unsaved lot.
{
  const h = harness(134, {failLot: 134, confirm: false});
  await h.importer.create();
  assert.equal(h.state.run.created, 133);
  assert.equal(h.state.run.failed, 1);
  assert.equal(h.state.rows[133].on, true);
  await h.importer.close();
  assert.equal(h.calls.confirm.length, 1);
  assert.equal(h.calls.confirm[0].title, 'Discard 1 unsaved lot?');
  assert.equal(h.calls.confirm[0].message, 'Your 133 saved lots are safe.');
  assert.equal(h.calls.confirm[0].okLabel, 'Discard lot');
  assert.equal(h.state.open, true);
}

// Plural counts include every unsaved row, while saved rows are reassured separately.
{
  const h = harness(5, {confirm: false});
  h.state.step = 3;
  h.state.rows.slice(0, 2).forEach(row => { row.created = true; row.on = false; });
  h.state.rows[4].on = false;
  await h.importer.close();
  assert.equal(h.calls.confirm.length, 1);
  assert.equal(h.calls.confirm[0].title, 'Discard 3 unsaved lots?');
  assert.equal(h.calls.confirm[0].message, 'Your 2 saved lots are safe.');
  assert.equal(h.calls.confirm[0].okLabel, 'Discard 3 lots');
  assert.equal(h.state.open, true);
}

// An unprocessed selected row also prompts after a creation attempt.
{
  const h = harness(1, {confirm: false});
  h.state.step = 3;
  await h.importer.close();
  assert.equal(h.calls.confirm.length, 1);
  assert.equal(h.calls.confirm[0].title, 'Discard 1 unsaved lot?');
  assert.equal(h.calls.confirm[0].message, "This lot hasn't been saved yet.");
  assert.equal(h.calls.confirm[0].okLabel, 'Discard lot');
  assert.equal(h.state.open, true);
}

// Preserve the pre-creation draft warning, including a fully unchecked list.
for (const step of [1, 2]) {
  const h = harness(2, {confirm: false});
  h.state.step = step;
  h.state.rows.forEach(row => { row.on = false; });
  await h.importer.close();
  assert.equal(h.calls.confirm.length, 1, `step ${step} must retain its staged-draft warning`);
  assert.equal(h.calls.confirm[0].title, 'Discard 2 unsaved lots?');
  assert.equal(h.calls.confirm[0].message, "These lots haven't been saved yet.");
  assert.equal(h.calls.confirm[0].okLabel, 'Discard 2 lots');
  assert.equal(h.state.open, true);
}

// Creation blocks both ordinary and forced closing while the actual add is held.
{
  const addGate = deferred();
  const h = harness(1, {addGate});
  const creation = h.importer.create();
  assert.equal(h.state.creating, true);
  await h.importer.close();
  await h.importer.close(true);
  assert.equal(h.state.open, true);
  assert.equal(h.calls.confirm.length, 0);
  addGate.resolve();
  await creation;
  await h.importer.close();
  assert.equal(h.state.open, false);
}

// Scanning likewise blocks closing while the real schema check is held.
{
  const scanGate = deferred();
  const h = harness(1, {scanGate});
  h.state.step = 1;
  const scanning = h.importer.scan();
  assert.equal(h.state.scanning, true);
  await h.importer.close();
  await h.importer.close(true);
  assert.equal(h.state.open, true);
  assert.equal(h.calls.confirm.length, 0);
  scanGate.resolve();
  await scanning;
  assert.equal(h.state.scanning, false);
  assert.equal(h.state.step, 2);
}

// A caller-requested forced close bypasses confirmation and keeps row data intact.
{
  const h = harness(2, {confirm: false});
  const rows = h.state.rows;
  const before = JSON.stringify(rows);
  await h.importer.close(true);
  assert.equal(h.calls.confirm.length, 0);
  assert.equal(h.state.open, false);
  assert.equal(h.state.rows, rows);
  assert.equal(JSON.stringify(rows), before);
}

// Escape uses the same corrected close behavior as the footer action.
{
  const h = harness(1);
  h.state.step = 3;
  h.state.rows[0].on = false;
  let prevented = false;
  h.documentListeners.keydown({key: 'Escape', preventDefault() { prevented = true; }});
  assert.equal(prevented, true);
  assert.equal(h.calls.confirm.length, 0);
  assert.equal(h.state.open, false);
}

console.log('Spreadsheet import creation/close: Notes omitted, exact imported fields and optional width, excluded lots after creation, saved/unsaved counts and grammar, failed/unprocessed selections, draft warnings, Cancel, active work, forced close, and Escape passed.');

// Every new Lot has exactly one net new Property; CAD identifiers are not invented.
{
  const h=harness(3);await h.importer.create();
  assert.equal(h.calls.properties.length,3);assert.equal(h.state.run.properties,3);
  h.calls.properties.forEach((data,i)=>assert.deepEqual(JSON.parse(JSON.stringify(data)),{
    Common_Name:'SC01-B01-L0'+(i+1),Property_ID:'SC01-B01-L0'+(i+1),Land_Type:'Residential',Subtype:'L&B Res',
    Projects:['90071992547409930'],Subdivisions:[subdivision.ID],Lots:String(90071992547409941n+BigInt(i)),City:'Seguin',County:'Guadalupe'
  }));
  assert.ok(h.state.rows.every(r=>r.lotState==='Saved'&&r.propertyState==='Saved'));
  assert.match(h.node('siPairOutcome').textContent,/3 Lots And 3 Properties Created/);
  assert.equal(h.node('siPairMeter')['aria-valuenow'],'6');
  await h.importer.create();assert.equal(h.calls.add.length,3);assert.equal(h.calls.properties.length,3,'terminal rerun must not duplicate Properties');
}
// A failed Property does not misreport or recreate its accepted Lot.
{
  const h=harness(3,{failProperty:2});await h.importer.create();
  assert.equal(h.state.run.created,3);assert.equal(h.state.run.properties,2);
  assert.equal(h.state.rows[1].lotState,'Saved');assert.equal(h.state.rows[1].propertyState,'Failed');
  assert.match(h.node('siPairOutcome').textContent,/Needs Review/);assert.equal(h.node('siPairMeter')['aria-valuenow'],'5');
  await h.importer.create();assert.equal(h.calls.properties.length,3);
}
// Pending Property writes block close/Escape and duplicate committing actions.
{
  const gate=deferred(),h=harness(1,{propertyGate:gate});const task=h.importer.create();
  while(!h.calls.properties.length)await Promise.resolve();
  assert.equal(h.state.rows[0].lotState,'Saved');assert.equal(h.state.rows[0].propertyState,'Creating…');
  let trapped=false;h.documentListeners.keydown({key:'Tab',preventDefault(){trapped=true;}});assert.equal(trapped,true);
  await h.importer.close();await h.importer.create();assert.equal(h.state.open,true);assert.equal(h.calls.properties.length,1);
  gate.resolve();await task;assert.equal(h.state.rows[0].propertyState,'Saved');
}
for(const kind of ['unknownLot','unknownProperty']){
  const h=harness(3,{[kind]:true});await h.importer.create();
  assert.equal(h.calls.add.length,1,'lost reply must stop remaining writes');assert.equal(h.state.run.properties,0);
  assert.match(h.state.error,/could not be confirmed/);await h.importer.create();assert.equal(h.calls.add.length,1);
}
{
  const h=harness(1,{missingLotId:true});await h.importer.create();assert.equal(h.state.run.created,1);assert.equal(h.calls.properties.length,0);assert.equal(h.state.rows[0].lotState,'Saved');assert.match(h.state.error,/without a usable ID/);
}
{
  const h=harness(1,{missingPropertyId:true,reloadError:true});await h.importer.create();await Promise.resolve();assert.equal(h.state.run.properties,1,'accepted Property must not require optional returned ID');assert.equal(h.state.error,'');assert.match(h.node('siPairOutcome').textContent,/Properties Created/);
}
{
  const h=harness(1);h.controls.scope='new-session';const gate=deferred();
  // Start under this scope, then change while Lot creation is pending.
  const other=harness(1,{addGate:gate});const task=other.importer.create();await Promise.resolve();other.controls.scope='changed';gate.resolve();await task;assert.equal(other.calls.properties.length,0);assert.match(other.state.error,/session changed/);
}
{
  const h=harness(1,{existing:[{Lot_Code:'SC01-B01-L01'}]});await h.importer.create();assert.equal(h.calls.add.length,0);assert.equal(h.calls.properties.length,0,'existing Lots must not receive a Property backfill');
}
{
  const project=subdivision.Project,h=harness(1,{noProject:true});await h.importer.create();assert.equal(h.calls.add.length,0);assert.match(h.state.error,/parent Project/);subdivision.Project=project;
}
console.log('Paired import: exact Property ID, Residential/L&B Res, native string lookup IDs, matching statuses, partial and unknown results, duplicate guards, session changes, and optional refresh passed.');

// Stopped preflight and unsent rows must retain truthful terminal states.
{
  const h=harness(2,{failRead:true});await h.importer.create();assert.equal(h.state.run.stage,0);assert.equal(h.calls.add.length,0);assert.ok(h.state.rows.every(r=>r.lotState==='Not Created'&&r.propertyState==='Not Created'));assert.match(h.node('siPairStages').innerHTML,/Check Existing Lots<\/strong><span>Needs Review/);
}
{
  const h=harness(3,{unknownProperty:true});await h.importer.create();assert.equal(h.state.rows[1].lotState,'Not Created');assert.equal(h.state.rows[1].propertyState,'Not Created');
}
// The mounted result and cancelled close keep the page inert until actual dismissal.
{
  const h=harness(2,{failLot:2,confirm:false});await h.importer.create();assert.equal(h.document.body.children[0].inert,true);assert.equal(h.document.body.children[1].inert,false,'nested confirmation must remain usable');await h.importer.close();assert.equal(h.document.body.children[0].inert,true);h.controls.confirm=true;await h.importer.close();assert.equal(h.document.body.children[0].inert,false);
}
assert.match(source,/id="siResultScroll" tabindex="0" role="region"/);
const numberRegistry=fs.readFileSync('shared/number-surfaces.js','utf8');assert.match(numberRegistry,/lot-property-import/);for(const selector of ['.si-pair-context>p:last-child','#siPairOutcome','#piFootMeta'])assert.ok(numberRegistry.includes(selector));
console.log('Review regressions: truthful stopped stages, terminal unsent rows, retained inert background, usable nested confirmation, keyboard results, and import-scoped quantity motion passed.');

// Exercise the real mounted importer and shared limiter across a 162-pair import.
{
  const h=harness(162),c=h.sandbox;let now=0,sequence=0;const timers=new Map(),intervals=new Map(),dispatched=[];
  class FakeDate extends Date { constructor(...args){super(...(args.length?args:[now]));}static now(){return now;} }
  c.Date=FakeDate;c.window.setTimeout=(fn,ms)=>{const id=++sequence;timers.set(id,{fn,at:now+ms});return id;};c.window.clearTimeout=id=>timers.delete(id);
  c.window.setInterval=fn=>{const id=++sequence;intervals.set(id,fn);return id;};c.window.clearInterval=id=>intervals.delete(id);
  vm.runInContext(fs.readFileSync('shared/creator-data.js','utf8'),c);c.LMData=c.window.LMData;c.LMPerf=c.window.LMPerf;
  const host=fs.readFileSync('widgets/land-master/src/app/widget.html','utf8'),config=host.match(/<script>(LMData.configure\([^<]+)<\/script>/);assert.ok(config,'host must configure pacing before native initialization');vm.runInContext(config[1],c);
  const native=(task,fn,readOnly=false)=>c.LMData.request(task,()=>{dispatched.push(now);return fn();},{readOnly});
  const add=h.hostContext.add,property=h.hostContext.addProperty,lots=new Map();
  vm.runInContext(fs.readFileSync('widgets/land-master/src/app/property-lots.js','utf8'),c);c.LMPropertyLots=c.window.LMPropertyLots;
  c.S={coreRefreshing:false};c.LandData={generation:()=>1};c.landCreateScope=()=> 'fixture:production';c.lookupId=c.LMPropertyLots.id;
  const dataApi={getRecordCount(){dispatched.push(now);return {code:3000,result:{records_count:1}};},getRecords(config){dispatched.push(now);const id=config.criteria.match(/ID == (\d+)/)[1];return {code:3000,data:[config.report_name==='All_Lots_All_Fields'?lots.get(id):subdivision]};}};
  c.sdkGetAll=(reportName,criteria,progress,options)=>c.LMData.readAll({reportName,criteria,api:dataApi,...options});
  const start=host.indexOf('function propertyLotPreflight(');vm.runInContext(host.slice(start,host.indexOf('\nfunction ',start)),c);
  h.hostContext.add=data=>native('create:Lots',async()=>{const response=await add(data);const id=c.landCreatedRecordId(response);lots.set(id,{...data,ID:id,Subdivision:{ID:data.Subdivision}});return response;});
  h.hostContext.addProperty=async data=>{await c.propertyLotPreflight({},data);return native('create:Property',()=>property(data));};
  h.hostContext.readLots=async()=>{await native('existing:count',()=>true,true);return native('existing:records',()=>[],true);};
  h.hostContext.rate=()=>c.LMPerf.snapshot().rate;h.hostContext.throttled=e=>c.LMData.failureCode(e)==='2955';
  // Include calls already spent loading the widget and reviewing the spreadsheet.
  for(let i=0;i<12;i++)await native('startup',()=>true,true);
  const task=h.importer.create();let waits=0;
  while(h.state.creating){
    for(let i=0;i<30;i++)await new Promise(resolve=>setImmediate(resolve));
    if(!h.state.creating)break;assert.ok(timers.size,'active import must be awaiting its request budget');
    for(const fn of intervals.values())fn();
    assert.match(h.node('siPairOutcome').textContent,/Waiting For Creator — Resuming In/);
    const saved=h.node('siPairMeter')['aria-valuenow'];await h.importer.close();await h.importer.create();assert.equal(h.state.open,true);assert.equal(h.node('siPairMeter')['aria-valuenow'],saved,'waiting cannot fabricate saved records');
    now=Math.min(...Array.from(timers.values(),t=>t.at));for(const [id,t]of [...timers])if(t.at<=now){timers.delete(id);t.fn();}waits++;assert.ok(waits<30);
  }
  await task;assert.equal(h.calls.add.length,162);assert.equal(h.calls.properties.length,162);assert.equal(h.state.run.failed,0);assert.equal(h.node('siPairMeter')['aria-valuenow'],'324');assert.ok(waits>15);assert.equal(intervals.size,0,'progress timer must stop at terminal state');
  for(const at of dispatched)assert.ok(dispatched.filter(t=>t<=at&&at-t<61000).length<=45,'all startup, read and write calls share the rolling budget');
}
// Persistent throttling stops the run instead of creating more orphan Lots or replaying writes.
for(const kind of ['add','addProperty']){
  const h=harness(3);let calls=0;h.hostContext.throttled=e=>e.code===2955;h.hostContext[kind]=async()=>{calls++;throw Object.assign(Error('Minute limit'),{code:2955});};
  await h.importer.create();assert.equal(calls,1);assert.match(h.state.error,/still limiting requests/);assert.equal(h.state.run.properties,0);assert.equal(h.calls.add.length,kind==='add'?0:1);assert.equal(h.state.rows[1].lotState,'Not Created');
  await h.importer.create();assert.equal(calls,1,'a throttled write cannot replay from a terminal run');
}
console.log('162-pair pacing: 324 records, 45 calls per rolling 61 seconds, existing startup usage, countdown, pending locks, timer cleanup and terminal throttle stop passed.');

// Native array payloads through the actual host adapter and mounted importer.
function batchHarness(count=162,options={}){
  const h=harness(count),c=h.sandbox,host=fs.readFileSync('widgets/land-master/src/app/widget.html','utf8');
  const native=[],lots=new Map(),properties=new Map();let next=90071992547419900n,epoch=1;
  lots.set('90071992547419899',{ID:'90071992547419899',Lot_Code:'SC01-B99-L999',Subdivision:{ID:subdivision.ID}});
  c.S={liveSDK:true,demo:false,coreRefreshing:false};c.LandData={generation:()=>epoch};c.LMRuntime={current:()=>({environment:'DEVELOPMENT',user:'fixture',appLinkName:'land-master'})};c.window.LMRuntime=c.LMRuntime;
  c.window.setTimeout=setTimeout;c.window.clearTimeout=clearTimeout;
  for(const file of ['shared/creator-data.js','widgets/land-master/src/app/property-lots.js','widgets/land-master/src/app/property-subtypes.js','widgets/land-master/src/app/lot-import-batch.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
  for(const name of ['LMData','LMPropertyLots','LMPropertySubtypes','LMLotImportBatch'])c[name]=c.window[name];
  function actual(name){const start=host.indexOf('function '+name+'(');assert.ok(start>=0);return host.slice(start,host.indexOf('\nfunction ',start));}
  for(const name of ['extractRecordId','landCreateFreeze','landCreateScope','landCreateKey','landCreateStore','landCreateCandidateId','landCreateFailure','landCreateResponseFailure','requireCreateSuccess','createLotImportBatch'])vm.runInContext(actual(name),c);
  function rows(config){const ids=[...config.criteria.matchAll(/ID == (\d+)/g)].map(m=>m[1]);if(config.report_name==='All_Subdivisions')return options.reparent?[{...subdivision,Project:{ID:'999'}}]:[subdivision];return [...lots.values()].filter(l=>!ids.length||ids.includes(l.ID));}
  c.ZOHO={CREATOR:{DATA:{
    async getRecordCount(config){native.push({method:'count',...config});return {code:3000,result:{records_count:rows(config).length}};},
    async getRecords(config){native.push({method:'records',...config});return {code:3000,data:rows(config)};},
    async addRecords(config){
      native.push({method:'create',...config});assert.ok(Array.isArray(config.payload.data));assert.ok(config.payload.data.length<=50);assert.equal(config.payload.skip_workflow,undefined);assert.equal(config.app_name,undefined);
      if(options.gate)await options.gate.promise;
      if(options.unknown&&config.form_name===options.unknown)throw Error('Lost batch reply');
      const result=config.payload.data.map((data,i)=>{
        if(config.form_name===options.failForm&&i===1)return {code:2899,message:'Native validation failed'};
        const ID=String(++next),row={...data,ID};
        if(config.form_name==='Lots'){lots.set(ID,{...row,Subdivision:{ID:data.Subdivision}});h.calls.add.push(data);}else{properties.set(ID,row);h.calls.properties.push(data);}
        return {code:3000,data:options.missingId?{}:{ID,...(options.noEcho?{}:config.form_name==='Lots'?{Lot_Code:data.Lot_Code}:{Property_ID:data.Property_ID})}};
      });
      if(options.changeScope)epoch++;
      if(options.outerError)return {code:3000,result:{code:2899,message:'Nested native denial'}};
      if(options.incomplete)result.pop();
      if(options.reordered)result.reverse();
      return options.bare||options.bareForm===config.form_name?{code:3000}:{code:3000,result};
    }
  }}};
  c.sdkGetAll=(reportName,criteria,progress,settings)=>c.LMData.readAll({reportName,criteria,api:c.ZOHO.CREATOR.DATA,...settings});
  vm.runInContext(host.match(/<script>(LMData.configure\([^<]+)<\/script>/)[1],c);
  const adapter=c.createLotImportBatch();h.hostContext.batch=adapter.write;h.hostContext.batchSize=adapter.size;h.hostContext.scope=()=>c.landCreateScope()+':'+epoch;
  h.hostContext.readLots=async()=>{const groups=await Promise.all(['All_Lots_All_Fields','All_Active_Lots_List_View'].map(reportName=>c.LMData.readAll({reportName,criteria:'(Subdivision == '+subdivision.ID+')',fresh:true,api:c.ZOHO.CREATOR.DATA})));return groups.flat();};
  return {...h,native,lots,properties,adapter,c};
}
{
  const h=batchHarness();for(let i=0;i<13;i++)await h.c.LMData.request('startup',()=>true,{readOnly:true});await h.importer.create();assert.equal(h.c.window.LMPerf.snapshot().rate.dispatched,41);assert.equal(h.native.length,28,'162 pairs require four duplicate-read calls plus four six-call chunks');
  assert.deepEqual(h.native.filter(c=>c.method==='create').map(c=>[c.form_name,c.payload.data.length]),[['Lots',50],['Property',50],['Lots',50],['Property',50],['Lots',50],['Property',50],['Lots',12],['Property',12]]);
  assert.equal(h.state.run.created,162);assert.equal(h.state.run.properties,162);assert.equal(h.state.run.failed,0);assert.equal(h.node('siPairMeter')['aria-valuenow'],'324');
  for(const property of h.properties.values()){const lot=h.lots.get(property.Lots);assert.equal(lot.Lot_Code,property.Property_ID);assert.equal(property.Subdivisions[0],subdivision.ID);assert.equal(property.Projects[0],subdivision.Project.ID);}
  await h.importer.create();assert.equal(h.native.length,28,'terminal Create cannot replay a batch');assert.equal(Object.keys(h.c.S.createPending).length,0);
}
{
  const h=batchHarness(3,{failForm:'Lots'});await h.importer.create();assert.equal(h.state.run.created,2);assert.equal(h.state.run.properties,2);assert.equal(h.state.rows[1].lotState,'Failed');assert.equal(h.state.rows[1].propertyState,'Not Created');
}
{
  const h=batchHarness(60,{failForm:'Property'});await h.importer.create();assert.equal(h.state.run.created,50);assert.equal(h.state.run.properties,49);assert.equal(h.state.rows[50].lotState,'Not Created','stop before another chunk can create more orphan Lots');
}
for(const unknown of ['Lots','Property']){
  const h=batchHarness(60,{unknown});await h.importer.create();assert.equal(h.native.filter(c=>c.method==='create').length,unknown==='Lots'?1:2);assert.match(h.state.error,/needs review/);assert.equal(h.state.rows[50].lotState,'Not Created');
  await assert.rejects(h.adapter.write(unknown==='Lots'?'lot':'property',[unknown==='Lots'?{Lot_Code:'SC01-B01-L01'}:{Lots:'1'}]),/previous create/);
}
for(const mode of ['missingId','incomplete','reparent','changeScope']){
  const h=batchHarness(3,{[mode]:true});await h.importer.create();assert.equal(h.native.filter(c=>c.method==='create'&&c.form_name==='Property').length,0,mode+' cannot send children to an unverified destination');assert.equal(h.state.run.properties,0);assert.ok(h.state.error);
}
{
  const h=batchHarness(1,{bare:true});await h.importer.create();assert.equal(h.state.run.created,1,'resolved native success remains Saved even without optional ID');assert.equal(h.state.rows[0].lotState,'Saved');assert.equal(h.state.run.properties,0,'dependent writes still need a real Lot ID');
}
{
  const gate=deferred(),h=batchHarness(2,{gate});const task=h.importer.create();while(!h.native.some(c=>c.method==='create'))await new Promise(r=>setImmediate(r));
  await h.importer.close();await h.importer.create();assert.equal(h.state.open,true);assert.equal(h.native.filter(c=>c.method==='create').length,1);gate.resolve();await task;assert.equal(h.state.run.properties,2);
}
console.log('Native batch import: 162 Lots + 162 Properties in 28 calls; 50-row chunks, exact parent identities, partial failures, unknown no-replay, missing IDs, reordered/incomplete results, reparent/session drift and pending locks passed.');

{const h=batchHarness(2,{bareForm:'Property'});await h.importer.create();assert.equal(h.state.run.properties,2,'resolved Property batch success never requires optional returned IDs');assert.equal(h.state.error,'');}
{const h=batchHarness(2);h.c.S.createReviews={property:{key:'property'}};await h.importer.create();assert.equal(h.native.filter(c=>c.method==='create').length,0,'unresolved Property replies must block new Lot batches');}

for(const options of [{reordered:true,noEcho:true},{outerError:true}]){const h=batchHarness(3,options);await h.importer.create();assert.equal(h.native.filter(c=>c.method==='create'&&c.form_name==='Property').length,0);assert.ok(h.state.error);}

{const h=batchHarness(3,{reordered:true});await h.importer.create();assert.equal(h.state.run.created,3);assert.equal(h.state.run.properties,3,'native identity echoes map reordered results to the right rows');}
{const h=batchHarness(2,{reordered:true,failForm:'Property'});await h.importer.create();assert.equal(h.state.rows[0].propertyState,'Saved');assert.equal(h.state.rows[1].propertyState,'Needs Review');assert.equal(h.state.run.properties,1);}

// Duplicate rows are automatically excluded without preventing valid rows.
{
  const h=batchHarness(3);h.lots.set('90071992547419898',{ID:'90071992547419898',Lot_Code:'SC01-B01-L01',Subdivision:{ID:subdivision.ID}});
  await h.importer.create();assert.equal(h.state.run.created,2);assert.equal(h.state.run.properties,2);assert.equal(h.state.run.skipped,1);assert.equal(h.state.rows[0].lotState,'Skipped');assert.equal(h.state.rows[0].propertyState,'Skipped');assert.equal(h.state.error,'');assert.match(h.node('siPairOutcome').textContent,/1 Duplicate Rows Skipped/);assert.equal(h.node('siPairMeter')['aria-valuemax'],'4');await h.importer.close();assert.equal(h.calls.confirm.length,0);
}
{
  const h=batchHarness(3);h.state.rows[1].lot='1';h.state.rows[1].width='77';await h.importer.create();assert.equal(h.state.run.created,1);assert.equal(h.state.run.properties,1);assert.equal(h.state.run.skipped,2);assert.equal(h.state.rows[0].lotState,'Skipped');assert.equal(h.state.rows[1].lotState,'Skipped');assert.equal(h.state.rows[2].lotState,'Saved');assert.equal(h.state.run.failed,0);assert.equal(h.state.error,'');
}
{
  const h=batchHarness(2);h.state.rows[1].lot='1';await h.importer.create();assert.equal(h.native.filter(c=>c.method==='create').length,0);assert.equal(h.state.run.skipped,2);assert.equal(h.state.run.total,0);assert.equal(h.state.error,'');assert.match(h.node('siPairOutcome').textContent,/No New Records Needed/);await h.importer.close();assert.equal(h.calls.confirm.length,0);
}
{
  const h=batchHarness(2);h.state.rows[1].width='bad';await h.importer.create();assert.equal(h.native.length,0,'other invalid rows still require review before any write');assert.match(h.state.error,/Resolve the highlighted/);
}
console.log('Automatic duplicate skipping: existing Lots, all repeated spreadsheet occurrences, differing duplicate widths, valid siblings, all-duplicate no-op, accurate saved totals and ordinary validation preserved.');
