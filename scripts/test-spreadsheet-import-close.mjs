import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('widgets/land-master/src/app/spreadsheet-import.js', 'utf8');
const subdivision = {ID: '90071992547409931', Subdivision_Name: 'Sample Creek — Phase 1', Subdivision_Code: 'SC01', Phase: '1', City: 'Seguin', County: 'Guadalupe'};
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
        listeners: {},
        classList: {
          toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); },
          contains(name) { return classes.has(name); }
        },
        addEventListener(type, fn) { this.listeners[type] = fn; },
        focus() { document.activeElement = this; },
        querySelector(selector) { return selector === '.si-review-scroll' && this.innerHTML.includes('si-review-scroll') ? scroll : null; },
        querySelectorAll() { return []; }
      };
      elements.set(id, element);
    }
    return elements.get(id);
  }
  document.getElementById = node;
  document.activeElement = node('importTrigger');
  const sandbox = vm.createContext({document, window: {addEventListener() {}}, console});
  vm.runInContext(source, sandbox);
  const api = sandbox.LMSpreadsheetImport;
  const calls = {confirm: [], add: [], reload: 0};
  const controls = {confirm: options.confirm ?? true};
  const spreadsheetRows = api.sheetRows('Lots', Array.from({length: count}, (_, i) => ['1', String(i + 1), '50']));
  const mappings = spreadsheetRows.map(row => ({sheet: row.sheet, row: row.row, subdivision_id: subdivision.ID, block_column: 0, lot_column: 1, width_column: 2}));
  const importer = api.mount({
    subdivisions: () => [subdivision], selected: () => [subdivision.ID],
    cities: ['Seguin'], counties: ['Guadalupe'], readLots: async () => [],
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
    },
    async reload() { calls.reload++; },
    log() {}, error: error => error.message,
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

console.log('Spreadsheet import close: excluded lots after creation, saved/unsaved counts and grammar, failed/unprocessed selections, draft warnings, Cancel, active work, forced close, and Escape passed.');
