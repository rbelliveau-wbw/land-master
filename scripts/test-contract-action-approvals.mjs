import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const source = read('widgets/contract-management/src/app/widget.html');
const block = source.slice(source.indexOf('function approvalsFor('), source.indexOf('/* whole days from inputA'));
const parentId = '4410926000001234567';
const actionId = '4410926000001234568';
const otherActionId = '4410926000001234569';
const action = {ID: actionId, Contract1: {ID: parentId}, Requires_Approval: 'true', Sort_Order: 2};
const row = {ID: '4410926000001234570', Contract1: {ID: parentId}, Contract_Action: {ID: actionId},
  Approver: ' reviewer@example.com ', Type1: 'Contract Approval', Status: 'Approved',
  Last_Reminder_Date: '20-Nov-2026', Approval_Date: '20-Nov-2026'};
const state = {actionRows: [action], approvalRows: [row]};
const calls = [];
const context = {
  S: {approvals: []}, CFG: {reports: {actions: 'Actions', approvals: 'Approvals'}},
  lookupId: value => value == null ? '' : String(value.ID ?? value),
  actionWorkModule: action => action.Work_Module === 'Construction' ? 'construction' : 'legal',
  truthy: value => value === true || value === 'true',
  contractId: input => /^\d+$/.test(input) ? input : '',
  contractOwn: (obj, key) => Object.hasOwn(obj, key),
  num: Number,
  sdkGetAll(report, criteria) {
    calls.push({report, criteria});
    return Promise.resolve(report === 'Actions' ? state.actionRows : state.approvalRows);
  },
};
vm.createContext(context);
vm.runInContext(block, context);
const { approvalsFor, actionApprovalBlock, actionApprovalBadge, actionApprovalPreflight } = context;
assert.match(actionApprovalBadge(action), />Approval Required</);
assert.equal(actionApprovalBadge({...action, Requires_Approval: false}), '');
assert.equal(actionApprovalBadge({...action, Work_Module: 'Construction'}), '');
context.S.approvals = [row, {...row, Contract_Action: {ID: otherActionId}}, {...row, Contract_Action: null}];
assert.deepEqual(Array.from(approvalsFor(parentId, actionId)), [row]);
assert.equal(approvalsFor(parentId).length, 1);
assert.match(actionApprovalBlock(action, []), /Add approvers/);
for (const change of [{Status: 'Not Sent'}, {Status: 'Awaiting Approval'}, {Status: 'Rejected'},
  {Last_Reminder_Date: null}, {Approval_Date: null}]) {
  assert.match(actionApprovalBlock(action, [{...row, ...change}]), /wait/);
}
assert.equal(actionApprovalBlock(action, [row]), '');
const retry = {...row, ID: '4410926000001234571', Approver: 'REVIEWER@example.com'};
const rejected = {...row, Status: 'Rejected'};
assert.equal(actionApprovalBlock(action, [retry, rejected]), '');
assert.match(actionApprovalBlock(action, [{...retry, Status: 'Not Sent'}, rejected]), /wait/);
assert.match(actionApprovalBlock(action, [row, {...retry, Approver: 'second@example.com', Status: 'Not Sent'}]), /wait/);

const completion = {kind: 'update', payload: {Status: 'Complete', Complete: true}};
await actionApprovalPreflight(action, completion, {});
assert.equal(calls.at(-1).criteria, '(Contract1 == ' + parentId + ' && Contract_Action == ' + actionId + ')');
state.approvalRows = [{...row, Contract_Action: {ID: otherActionId}}];
await assert.rejects(actionApprovalPreflight(action, completion, {}), /could not be verified/);
state.actionRows = [action, {...action, ID: otherActionId, Sort_Order: 1, Complete: 'false'}];
await assert.rejects(actionApprovalPreflight(action, {kind: 'update', payload: {Current_Action: true}}, {}), /earlier action/);
assert.throws(() => actionApprovalPreflight(action, {kind: 'delete', payload: {}}, {}), /cannot be deleted/);
assert.throws(() => actionApprovalPreflight(action, {kind: 'update', payload: {Requires_Approval: false}}, {}), /cannot be cleared/);
await actionApprovalPreflight({...action, Work_Module: 'Construction'}, completion, {});
console.log('PASS action approval badge, exact action scope, sent and approved evidence, replacement requests and completion guards.');
