import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the shipped helpers against native Creator field/lookup shapes. The
// element rows are read-only detail; no amount is allocated by this fixture.
const source = fs.readFileSync('widgets/budget-manager/src/app/widget.html', 'utf8').replace(/\r\n/g, '\n');
function extract(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} must be present in the shipped widget`);
  const firstLine = source.indexOf('\n', start);
  const end = source.slice(start, firstLine).trimEnd().endsWith('}') ? firstLine : source.indexOf('\n}', start) + 2;
  assert.ok(end > start, `${name} must have a complete function body`);
  return source.slice(start, end);
}
const definitions = source.match(/var BUDGET_ELEMENTS\s*=\s*(\[[\s\S]*?\]);/);
assert.ok(definitions, 'the native element-to-field map must be explicit');
const BID = '4410926000005159046', OTHER = '4410926000005159047';
const state = {modifications: [], tier: 'final'};
const items = {};
let importsAllowed = true;
const assignmentWrites = [];
const context = vm.createContext({S: state, budgetModsReady: () => true, findItemById: id => items[id] || null,
  canViewImportItems: () => importsAllowed, canEditImportItems: () => true,
  CFG: {forms: {importItem: 'Budget_Import_Item'}, importItemConfig: {budgetItemLookupField: 'Budget_Item'}},
  sdkUpdateRecord: async (form, id, data) => {assignmentWrites.push({form,id,data});},
  toastShow: () => {}, renderImports: () => {}, setMsg: () => {}, auditLog: () => {}, shortErr: error => String(error)
});
vm.runInContext(`var BUDGET_ELEMENTS = ${definitions[1]};\n` + [
  'v', 'cleanVal', 'isObj', 'rawPath', 'firstRaw', 'lookupId', 'lookupMatchesId', 'catDept',
  'modStatusOf', 'modSignedAmount', 'modsForItem', 'budgetElementNumber',
  'budgetElementSnapshot', 'budgetElementDepartmentIndex', 'budgetElementValues', 'budgetPrelimElementSnapshot', 'budgetElementImportedSnapshot', 'budgetElementModAmounts', 'budgetElementKey',
  'budgetLineItemIds', 'budgetElementCell', 'budgetElementRowsHtml',
  'budgetUnitNumber', 'budgetUnitMoney', 'esc', 'escAttr', 'assignImportItem'
].map(extract).join('\n'), context);
const plain = value => JSON.parse(JSON.stringify(value));
const fields = ['Labor_Budget', 'Materials_Budget', 'Equipment_Budget', 'Subcontractor_Budget', 'Other_Budget'];
const parts = values => Object.fromEntries(fields.map((field, index) => [field, values[index]]));
const modification = (values, overrides = {}) => ({
  ID: '4410926000005159100', Budget_Item: {ID: BID, zc_display_value: 'AR05-3100 - Clearing'},
  Status: 'Approved', Modification_Type: 'Increase', Amount: '15.00', ...parts(values), ...overrides
});

assert.deepEqual(plain(context.BUDGET_ELEMENTS).map(({key, label, field}) => ({key, label, field})), [
  {key: '1', label: 'Labor', field: fields[0]},
  {key: '2', label: 'Materials', field: fields[1]},
  {key: '3', label: 'Equipment', field: fields[2]},
  {key: '4', label: 'Subcontractor', field: fields[3]},
  {key: '5', label: 'Other', field: fields[4]}
]);
for (const raw of [null, undefined, '', ' ', '—', 'unavailable', '12x']) {
  assert.equal(context.budgetElementNumber(raw), null, `unknown native value ${String(raw)} stays unknown`);
}
for (const [raw, expected] of [[0, 0], ['0.0000', 0], ['12.3456', 12.3456], ['-4.1256', -4.1256], ['$1,234.5678', 1234.5678], ['($1,234.5678)', -1234.5678]]) {
  assert.equal(context.budgetElementNumber(raw), expected, 'native currency precision and signed values are retained');
}
const snapshot = parts(['100.1234', '200', 0, '-0.1234', '50.0000']);
assert.deepEqual(plain(context.budgetElementSnapshot(snapshot)), [100.1234, 200, 0, -0.1234, 50]);
assert.deepEqual(plain(context.budgetElementSnapshot(parts([0, 0, 0, 0, 0]))), [0, 0, 0, 0, 0], 'complete zero snapshots are known');
for (const missing of fields) {
  const incomplete = {...snapshot}; delete incomplete[missing];
  assert.equal(context.budgetElementSnapshot(incomplete), null, `missing ${missing} cannot fabricate a complete split`);
  incomplete[missing] = '';
  assert.equal(context.budgetElementSnapshot(incomplete), null, `blank ${missing} cannot fabricate zero`);
}
assert.equal(context.budgetElementSnapshot(null), null);

const importTarget = {ID: BID, Unapproved_Final_Budget_Ttl: '25.5000', ...snapshot};
const imported = (ID, assigned, amount, values, overrides = {}) => ({
  ID, Budget_Item: assigned, Data_Source: 'HeavyJob Budget', Cost: amount, ...parts(values), ...overrides
});
state.importItemsLoaded = false;
state.importItems = [imported('4410926000005159200', {ID: BID, zc_display_value: 'Clearing'}, '15.1250', ['1.1250', 2, 3, 4, 5])];
assert.equal(context.budgetElementImportedSnapshot(importTarget), null, 'unloaded/partial Imports cannot supply an authoritative breakdown');
state.importItemsLoaded = true;
state.importItems = [
  ...state.importItems,
  imported('4410926000005159201', {ID: BID}, '10.3750', ['0.3750', 1, 2, 3, 4]),
  imported('4410926000005159202', {ID: OTHER}, '100', [20, 20, 20, 20, 20]),
  imported('4410926000005159203', {ID: BID}, '100', [20, 20, 20, 20, 20], {Data_Source: 'Great Plains'}),
  imported('4410926000005159204', {}, '100', [20, 20, 20, 20, 20], {Cost_Code_Description: 'Clearing'})
];
assert.deepEqual(plain(context.budgetElementImportedSnapshot(importTarget)), [1.5, 3, 5, 7, 9], 'sum only assigned HeavyJob Budget rows, with native 4-decimal precision');
importsAllowed = false;
assert.equal(context.budgetElementImportedSnapshot(importTarget), null, 'cached import values remain unavailable after permission denial');
importsAllowed = true;
assert.deepEqual(plain(context.budgetElementSnapshot(importTarget)), [100.1234, 200, 0, -0.1234, 50], 'current imports never replace frozen Final snapshots');
assert.equal(context.budgetElementImportedSnapshot({...importTarget, Unapproved_Final_Budget_Ttl: '25.51'}), null, 'newer source totals must not impersonate saved Unapproved');
state.importItems = [...state.importItems, imported('4410926000005159205', {ID: BID}, '1', [1, 0, 0, 0, undefined])];
assert.equal(context.budgetElementImportedSnapshot({...importTarget, Unapproved_Final_Budget_Ttl: '26.5'}), null, 'one incomplete assigned source makes the entire split unknown');
state.importItems = [imported('4410926000005159206', {ID: BID}, 0, [0, 0, 0, 0, 0])];
assert.deepEqual(plain(context.budgetElementImportedSnapshot({...importTarget, Unapproved_Final_Budget_Ttl: 0})), [0, 0, 0, 0, 0], 'fresh zero-valued imports replace an older source index');
state.importItems = [];
assert.equal(context.budgetElementImportedSnapshot(importTarget), null, 'no matching import is unavailable, not zero');
state.importItems = [imported('4410926000005159210', {ID: BID}, '15.1250', ['1.1250', 2, 3, 4, 5])];
const assignmentSource = state.importItems;
assert.deepEqual(plain(context.budgetElementImportedSnapshot({...importTarget, Unapproved_Final_Budget_Ttl: '15.125'})), [1.125, 2, 3, 4, 5]);
context.assignImportItem('4410926000005159210', OTHER, null);
await new Promise(resolve => setImmediate(resolve));
assert.equal(assignmentWrites.length, 1, 'the actual assignment handler receives one native save acknowledgement');
assert.equal(state.importItems, assignmentSource, 'assignment mutates the existing Imports snapshot in place');
assert.equal(state.elementImportSource, null, 'successful assignment explicitly invalidates the component lookup cache');
assert.equal(context.budgetElementImportedSnapshot({...importTarget, Unapproved_Final_Budget_Ttl: '15.125'}), null, 'the old assignment cannot retain the source breakdown');
assert.deepEqual(plain(context.budgetElementImportedSnapshot({ID: OTHER, Unapproved_Final_Budget_Ttl: '15.125'})), [1.125, 2, 3, 4, 5], 'the new exact assignment receives the component breakdown');
state.importItems = [];

state.modifications = [
  modification(['1', '2', '3', '4', '5']),
  modification(['0.25', '0.5', '0.75', '1', '1.25'], {Modification_Type: 'Decrease', Amount: '3.75'}),
  modification(['1', '2', '3', '4', '5'], {Status: 'Submitted'}),
  modification(['1', '2', '3', '4', '5'], {Status: 'Rejected'}),
  modification(['1', '2', '3', '4', '5'], {Budget_Item: {ID: OTHER, zc_display_value: 'Another item'}})
];
const allocated = context.budgetElementModAmounts(BID);
assert.deepEqual(plain(allocated.amounts), [0.75, 1.5, 2.25, 3, 3.75], 'only the exact item and approved signed component deltas count');
assert.equal(allocated.unallocated, false);
state.modifications.push(modification([undefined, undefined, undefined, undefined, undefined], {Amount: '500'}));
let legacy = context.budgetElementModAmounts(BID);
assert.equal(legacy.unallocated, true, 'legacy aggregate-only modifications are reported as unallocated');
assert.deepEqual(plain(legacy.amounts), plain(allocated.amounts), 'legacy amounts never default into Other');
state.modifications = [modification(['1', '2', '3', '4', '5'], {Amount: '16'})];
legacy = context.budgetElementModAmounts(BID);
assert.equal(legacy.unallocated, true, 'a component mismatch cannot claim a reconciled detail');
assert.deepEqual(plain(legacy.amounts), [0, 0, 0, 0, 0], 'mismatched components cannot be partially applied');
state.modifications = [];
assert.deepEqual(plain(context.budgetElementModAmounts(BID)), {amounts: [0, 0, 0, 0, 0], unallocated: false});

assert.equal(typeof context.budgetElementKey([BID]), 'string');
assert.equal(context.budgetElementKey([BID]), context.budgetElementKey([BID]), 'stable native IDs retain disclosure identity');
assert.notEqual(context.budgetElementKey([BID]), context.budgetElementKey([OTHER]), 'large string IDs never collapse through Number');
assert.notEqual(context.budgetElementKey([BID]), context.budgetElementKey([BID, OTHER]), 'single-phase and aligned multi-phase detail remain distinct');

items[BID] = {ID: BID, Budget_Ttl: '350', Prelim_Budget_Ttl: '900', ...snapshot};
items[OTHER] = {ID: OTHER, Budget_Ttl: '150', ...parts([1, 2, 3, 4, 5])};
const before = JSON.stringify(items);
const phaseRows = context.budgetElementRowsHtml({dataset: {iid: BID}});
assert.equal((phaseRows.match(/<tr /g) || []).length, 5);
for (const label of ['(1) Labor', '(2) Materials', '(3) Equipment', '(4) Subcontractor', '(5) Other']) assert.ok(phaseRows.includes(label), label);
assert.doesNotMatch(phaseRows, /\birow\b|data-iid=|data-budget-item-ids=|<input|data-id=/, 'child detail cannot enter parent totals, edits or saves');
assert.ok(phaseRows.includes('$100.1234'), 'Final snapshot values retain native four-decimal precision under their element');
assert.ok(phaseRows.includes('Preliminary has no element breakdown'), 'no Preliminary split is inferred from the Final snapshot');
assert.ok(phaseRows.includes('Construction actuals have no element breakdown'), 'no actual split is inferred from a Construction Final snapshot');
const projectRow = {dataset: {budgetItemIds: `${BID},${OTHER}`}, cells: [{dataset:{}}, {dataset:{budgetItemId:BID}}, {dataset:{budgetItemId:OTHER}}, {dataset:{}}]};
const projectRows = context.budgetElementRowsHtml(projectRow);
assert.ok(projectRows.includes('$101.1234'), 'all-phase element totals sum matching native phase values at their saved precision');
state.tier = 'prelim';
const prelimRows = context.budgetElementRowsHtml(projectRow);
assert.doesNotMatch(prelimRows, /\$100\.12|\$101\.12/, 'Preliminary tier cannot display Final amounts as Preliminary');
assert.equal(JSON.stringify(items), before, 'revealing elements cannot mutate parent amounts or native snapshots');

console.log('Budget elements: native mapping, unknown/zero/precision, frozen snapshots, current assigned imports, signed approved modifications, legacy/mismatch safety, string identities, five read-only children and phase-total isolation passed.');
