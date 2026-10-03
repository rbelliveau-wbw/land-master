// Execute the checked-in Deluge bodies against explicit fixtures. Creator Save
// and signed-in Custom API comparisons remain the compiler/integration checks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';

const names = ['getUserAccess', 'getUserAccessDev', 'getUserAccessLean', 'getUserAccessLeanDev'];
const bodies = names.map(name => translate(fs.readFileSync(new URL(`../creator/functions/${name}.dg`, import.meta.url), 'utf8')));
const fields = [
  ['Edit_All_Budgets', 'editAll'], ['Edit_Owned_Budgets', 'editOwned'],
  ['Edit_All_Approvals', 'apprAll'], ['Edit_Owned_Approvals', 'apprOwned'],
  ['Send_for_Approvals', 'send'], ['Edit_Budget_Owners', 'editOwners'],
  ['View_Budget_Import_Items', 'viewImports'], ['Edit_Budget_Import_Items', 'editImports'],
  ['Edit_Delete_All_Modifications', 'modAdmin'], ['Delete_Archive_Budgets', 'budgetDeleteArchive'],
  ['Lot_Sales_Dashboard', 'lotSalesDashboard'], ['View_Total_Lot_Revenue', 'viewTotalLotRevenue'],
  ['Edit_All_Proformas', 'pfEditAll'], ['Edit_Owned_Proformas', 'pfEditOwned'],
  ['Edit_Construction_Curve', 'pfEditCurve'], ['VP_Compensation_Tab', 'pfVpCompTab'],
  ['Edit_Probability', 'pfEditProbability'], ['Edit_Proforma_Owner', 'pfEditOwner'],
  ['Delete_Archive_Pro_Formas', 'pfDeleteArchive'], ['Edit_All_Pro_Forma_Approvals', 'pfApprAll'],
  ['Edit_Owned_Pro_Forma_Approvals', 'pfApprOwned'], ['Send_Pro_Formas_for_Approvals', 'pfSendApprovals'],
  ['Send_Costs_to_Budgets', 'pfSendCostsToBudgets'], ['Submit_to_Legal_Module', 'pfSubmitLegal'],
  ['AI_Review', 'pfAiReview'], ['Budgets_Assigned_to_Me', 'budgetAssignedToMe'],
  ['Pro_Forma_Assigned_to_Me', 'proformaAssignedToMe'], ['Legal_Assigned_to_Me', 'legalAssignedToMe'],
  ['Edit_Contracts', 'ctEdit'], ['Propose_Contract_Changes', 'ctPropose'],
  ['Approve_Contracts', 'ctApprove'], ['Manage_Action_Templates', 'ctTemplates'],
  ['Delete_Archive_Contracts', 'ctDeleteArchive']
];
const actor = {ID: '4410926000004465004', User: 'fixture_owner', Approver_Email: ' owner@example.test ', Full_Name: ' Fixture Owner '};
const roster = [actor, {ID: '4410926000004465005', User: 'fixture_other', Approver_Email: null, Full_Name: null}];
const proformas = [
  {ID: '4410926000009999901', Owner: [{ID: actor.ID}, {ID: roster[1].ID}]},
  {ID: '4410926000009999902', Owner: null}
];

function run(name, user, rows = roster, login = 'fixture_owner', forms = proformas) {
  const input = {User_Access: rows, Add_Pro_Forma: forms};
  const context = vm.createContext({fixtureJSON: JSON.stringify(input), user, login, leanCall: name.includes('Lean')});
  vm.runInContext(`
    const tables = JSON.parse(fixtureJSON);
    const queries = [];
    function choose(condition, yes, no) { return condition ? yes : no; }
    function ifnull(value, fallback) { return value == null ? fallback : value; }
    function List() { return []; }
    function Map() { return {put(key, value) { this[key] = value; }, toString() { return JSON.stringify(this); }}; }
    Array.prototype.add = function(value) { this.push(value); };
    function query(form, predicate) {
      queries.push(form);
      if (leanCall && form === 'Add_Pro_Forma') throw new Error('Lean permission reads must never scan Pro Formas.');
      return (tables[form] || []).map(row => new Proxy(row, {get(object, key) { return object[key] ?? null; }})).filter(predicate);
    }
    const zoho = {loginuser: login};
    const thisapp = {};
    ${bodies.map(body => body.js + `;thisapp.${body.name} = ${body.name};`).join('\n')}
    var rawResult = ${name}(user);
    var queryResult = queries.slice();
    var afterJSON = JSON.stringify(tables);
  `, context);
  assert.equal(context.afterJSON, JSON.stringify(input), 'Permission reads must not mutate any fixture record.');
  return {value: JSON.parse(context.rawResult), raw: context.rawResult, queries: [...context.queryResult]};
}

function assertParity(user, rows = roster, login = 'fixture_owner', forms = proformas, dev = false) {
  const full = run(dev ? 'getUserAccessDev' : 'getUserAccess', user, rows, login, forms);
  const lean = run(dev ? 'getUserAccessLeanDev' : 'getUserAccessLean', user, rows, login, forms);
  const expected = {...full.value};
  delete expected.proformaOwners;
  assert.deepEqual(lean.value, expected, 'Lean must preserve every full-endpoint flag, identity, and roster value.');
  assert.equal(Object.hasOwn(lean.value, 'proformaOwners'), false);
  assert.deepEqual(lean.queries, ['User_Access', 'User_Access'], 'Lean query count is independent of Pro Forma inventory.');
  assert.equal(full.queries.filter(form => form === 'Add_Pro_Forma').length, 1);
  return {full, lean};
}

for (const user of ['fixture_owner', 'fixture_other', 'unknown', '', null]) assertParity(user);
const denied = assertParity('unknown').lean.value;
assert.equal(denied.found, false);
assert.equal(denied.hasRow, false);
assert.equal(denied.myId, '');
for (const [, flag] of fields) assert.equal(denied[flag], false, `${flag} stays denied without an access row.`);
const expectedRoster = rows => rows.map(row => ({id: row.ID, label: row.User, email: row.User, userName: row.User, approverEmail: (row.Approver_Email ?? '').trim(), fullName: (row.Full_Name ?? '').trim()}));
assert.deepEqual(denied.users, expectedRoster(roster), 'Author identities and full names are returned even when the requesting actor has no access row.');
assert.deepEqual(denied.users.map(({id, label, email}) => ({id, label, email})), roster.map(row => ({id: row.ID, label: row.User, email: row.User})), 'Existing roster email remains the Creator username; approval behavior must not change.');
assert.deepEqual(Object.keys(denied.users[0]), ['id','label','email','userName','approverEmail','fullName'], 'Exactly three additive roster keys; no permission or owner keys are moved.');
const nameCases = [
  {...actor, Full_Name: ' Élodie O’Connor ', Approver_Email: ' Explicit+Address@Example.test '},
  {...roster[1], Full_Name: '', Approver_Email: '   '},
  {ID:'4410926000004465006',User:'legacy_without_name'},
  {ID:'4410926000004465007',User:'same_login',Full_Name:'First Exact Record',Approver_Email:'same@example.test'},
  {ID:'4410926000004465008',User:'same_login',Full_Name:'Second Exact Record',Approver_Email:'same@example.test'}
];
assert.deepEqual(assertParity('unknown', nameCases).lean.value.users, expectedRoster(nameCases), 'Names retain unicode/case; null/missing/blank become empty; duplicate identities and roster order are preserved for unique-match caller checks.');
assert.deepEqual(assertParity('unknown', []).lean.value.users, []);
assert.equal(assertParity('').lean.value.myId, actor.ID, 'Empty user preserves zoho.loginuser fallback.');
assert.equal(assertParity(null).lean.value.myId, actor.ID, 'Null user preserves zoho.loginuser fallback.');

for (const [field, flag] of fields) {
  const value = assertParity('fixture_owner', [{...actor, [field]: true}, roster[1]]).lean.value;
  assert.equal(value[flag], true, `${field} grants only its existing corresponding flag.`);
  for (const [, other] of fields) if (other !== flag) assert.equal(value[other], false, `${field} must not grant ${other}.`);
}
const nullable = {...actor};
for (const [field] of fields) nullable[field] = null;
for (const [, flag] of fields) assert.equal(assertParity('fixture_owner', [nullable]).lean.value[flag], false);
const duplicate = assertParity('fixture_owner', [actor, {...actor, ID: roster[1].ID, Edit_All_Budgets: true}]).lean.value;
assert.equal(duplicate.myId, actor.ID, 'Preserve the legacy first-matching-row selection.');
assert.equal(duplicate.editAll, false);

const devActor = {...actor, User: 'wbdevelopment', Edit_All_Budgets: true};
for (const user of ['rbelliveau', 'rbelliveau@wbdevelopment.com']) {
  const value = assertParity(user, [devActor], 'unknown', proformas, true).lean.value;
  assert.equal(value.myId, actor.ID);
  assert.equal(value.editAll, true);
  assert.equal(assertParity(user, [devActor], 'unknown').lean.value.hasRow, false, 'Production does not apply the Development alias.');
}
assert.equal(assertParity('fixture_other', [devActor, roster[1]], 'unknown', proformas, true).lean.value.myId, roster[1].ID);
assert.equal(assertParity('', [devActor], 'rbelliveau', proformas, true).lean.value.myId, actor.ID);

const manyForms = Array.from({length: 4000}, (_, i) => ({ID: `fixture-pf-${i}`, Owner: [{ID: actor.ID}]}));
const large = assertParity('fixture_owner', roster, 'fixture_owner', manyForms);
assert.ok(large.lean.raw.length < large.full.raw.length / 10, 'Lean payload excludes the large PF owner inventory.');
assert.deepEqual(large.lean.value, assertParity('fixture_owner').lean.value, 'Unrelated PF inventory cannot affect lean permission results.');
console.log('PASS: lean/full flag and additive username/email/full-name roster parity; preserved legacy roster keys/order/duplicates; missing/null/blank/unicode names; exact DEV alias; string IDs; read-only execution; no PF scan regardless of inventory.');
