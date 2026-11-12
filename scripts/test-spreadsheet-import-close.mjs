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
  const importer = api.mount({
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
  });
  importer.open();
  const state = importer.state();
  state.step = 2;
  state.fileName = 'sample-lots.csv';
  state.source = spreadsheetRows;
  state.rows = api.stage(spreadsheetRows, mappings, [subdivision]);
  importer.paint();
  return {importer, state, calls, controls, node, document, documentListeners};
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
