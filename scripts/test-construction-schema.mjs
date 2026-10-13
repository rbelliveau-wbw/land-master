import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const schema = JSON.parse(read('creator/schema-changes/construction-tasks.json'));
const expectedFields = {
  Contract: ['Work_Module', 'Construction_Plans', 'MUD', 'Priority', 'Date_Needed', 'Description'],
  Contract_Actions: ['Work_Module'],
  User_Access: ['Edit_All_Construction_Requests', 'Submit_Construction_Requests']
};

assert.equal(schema.fields.length, 9, 'Nine additive fields implement classification, request details and the two permissions.');
for (const [form, expected] of Object.entries(expectedFields)) {
  const fields = schema.fields.filter(field => field.form === form);
  assert.deepEqual(fields.map(field => field.link_name).sort(), expected.slice().sort());
  for (const field of fields) {
    assert.equal(field.native_mandatory, false, `${form}.${field.link_name} must remain optional in native Creator.`);
    if (form === 'User_Access') assert.equal(field.default, false, 'New permission flags must default to off.');
  }
}
assert.equal(schema.classification.blank, 'Legal', 'Historical unclassified records retain their Legal meaning.');
const mud = schema.fields.find(field => field.form === 'Contract' && field.link_name === 'MUD');
assert.equal(mud.type, 'checkbox', 'The confirmed native MUD field is a decision box, not a Yes/No picklist.');
assert.equal(mud.default, false);
assert.deepEqual(mud.ui_choices, ['Yes', 'No']);
assert.equal(schema.classification.backfill, 'none');
assert.equal(schema.subdivision_context.construction_selection_count, 1);
assert.deepEqual(schema.subdivision_context.independent_user_context_inputs, []);
assert.equal(schema.review.submission_parent_status, 'Proposed');
assert.equal(schema.review.seed_actions_at_submission, false, 'Submit-only creates a request without mutating template actions.');
assert.equal(schema.review.seed_actions_at_acceptance, true);
assert.equal(schema.review.legal_approval_seed, false);
assert.deepEqual(schema.user_access_response_keys, ['constructionEditAll', 'constructionSubmit']);

const prior = read(schema.source_snapshot);
function sourceForm(form) {
  const start = prior.indexOf(`\t\tform ${form}\n`);
  assert.ok(start >= 0, `The existing ${form} form is present in the authoritative snapshot.`);
  const end = prior.indexOf('\n\t\tform ', start + 1);
  return prior.slice(start, end < 0 ? undefined : end);
}
for (const change of schema.existing_field_changes) {
  assert.equal(change.preserve_existing_choices, true);
  assert.equal(change.native_mandatory_unchanged, true);
  const source = sourceForm(change.form);
  assert.match(source, new RegExp(`\\b${change.link_name}\\s*\\(`));
}
const actionType = schema.existing_field_changes.find(field => field.form === 'Contract_Actions' && field.link_name === 'Type_field');
assert.equal(actionType.native_type, 'picklist', 'The refreshed live action Type_field is a picklist; stale text metadata is not authoritative.');
assert.equal(actionType.schema_choice_extension_required, true);
const legalTypeChoices = ['Lot (Master)', 'Lot (Amendment)', 'Issue', 'CCR', 'Master Services Agreement', 'Service Agreement', 'NSSA', 'DA', 'Amendment', 'Acquisition', 'Commercial Sale'];
for (const choice of legalTypeChoices) assert.ok(sourceForm('Contract').includes(`"${choice}"`), `The ${choice} Legal choice remains in the snapshot.`);

// Execute checked-in full/lean and Development permission bodies, not a copied
// permission implementation. This fixture is not a native Creator compiler.
const names = schema.user_access_functions_requiring_update;
const bodies = names.map(name => translate(read(`creator/functions/${name}.dg`)));
const legalFields = {
  Edit_Contracts: 'ctEdit', Propose_Contract_Changes: 'ctPropose',
  Approve_Contracts: 'ctApprove', Manage_Action_Templates: 'ctTemplates',
  Delete_Archive_Contracts: 'ctDeleteArchive'
};
function access(name, fields = {}, known = true) {
  const records = known ? [{ID: '4410926000004465004', User: 'fixture_requestor', Approver_Email: null, Full_Name: null, ...fields}] : [];
  const fixture = {User_Access: records, Add_Pro_Forma: []};
  const context = vm.createContext({fixtureJSON: JSON.stringify(fixture)});
  vm.runInContext(`
    const tables = JSON.parse(fixtureJSON);
    function ifnull(value, fallback) { return value == null ? fallback : value; }
    function choose(condition, yes, no) { return condition ? yes : no; }
    function List() { return []; }
    function Map() { return {put(key, value) { this[key] = value; }, toString() { return JSON.stringify(this); }}; }
    Array.prototype.add = function(value) { this.push(value); };
    function query(form, predicate) {
      return (tables[form] || []).map(row => new Proxy(row, {get(object, key) { return object[key] ?? null; }})).filter(predicate);
    }
    const zoho = {loginuser: 'fixture_requestor'};
    const thisapp = {};
    ${bodies.map(body => `${body.js};thisapp.${body.name} = ${body.name};`).join('\n')}
    var raw = ${name}('fixture_requestor');
    var afterJSON = JSON.stringify(tables);
  `, context);
  assert.equal(context.afterJSON, JSON.stringify(fixture), 'Permission reads may not modify requestor records.');
  return JSON.parse(context.raw);
}
const scenarios = [
  {label: 'no grants', fields: {}, edit: false, submit: false},
  {label: 'submit only', fields: {Submit_Construction_Requests: true}, edit: false, submit: true},
  {label: 'editor only', fields: {Edit_All_Construction_Requests: true}, edit: true, submit: false},
  {label: 'both grants', fields: {Edit_All_Construction_Requests: true, Submit_Construction_Requests: true}, edit: true, submit: true},
  {label: 'Legal only', fields: Object.fromEntries(Object.keys(legalFields).map(field => [field, true])), edit: false, submit: false},
  {label: 'Legal and Construction', fields: {...Object.fromEntries(Object.keys(legalFields).map(field => [field, true])), Edit_All_Construction_Requests: true, Submit_Construction_Requests: true}, edit: true, submit: true},
  {label: 'unknown identity', fields: {}, edit: false, submit: false, known: false}
];
for (const name of names) {
  for (const scenario of scenarios) {
    const reply = access(name, scenario.fields, scenario.known !== false);
    assert.equal(reply.constructionEditAll, scenario.edit, `${name}: ${scenario.label} edit flag.`);
    assert.equal(reply.constructionSubmit, scenario.submit, `${name}: ${scenario.label} submit flag.`);
    for (const [field, key] of Object.entries(legalFields)) {
      assert.equal(reply[key], scenario.fields[field] === true, `${name}: ${scenario.label} preserves ${key}.`);
    }
  }
}
console.log('PASS Construction schema: nine optional native fields, unchecked access defaults, preserved Legal choices, one inferred Subdivision context, Proposed submission without seeds, acceptance-only Construction checklist setup; all four real permission bodies keep submit/editor/Legal grants independent.');
