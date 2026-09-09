import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync('widgets/contract-management/src/app/widget.html', 'utf8');
function fn(name) {
  const start = source.indexOf('function ' + name + '(');
  assert.ok(start >= 0, name);
  const lineEnd = source.indexOf('\n', start);
  if (source.slice(start, lineEnd).trim().endsWith('}')) return source.slice(start, lineEnd);
  return source.slice(start, source.indexOf('\n}', start) + 2);
}
const requests = [];
const ctx = {
  S: {nc: {sub: ['441092600000784111']}, lots: [{ID: '1', Subdivision: {ID: 'other'}}], acc: {}, homeSection: 'contracts'},
  CFG: {reports: {lots: 'All_Active_Lots_Contracts_View', contracts: 'All_Contracts'}, pageSize: 200, maxPages: 25},
  sdkGetAll: async (report, criteria) => { requests.push({report, criteria}); return [{ID: '999999999999999999', Subdivision: {ID: '441092600000784111'}}]; },
  banner: () => {}, errText: e => e.message, canTemplates: () => false,
  lockBlocks: () => false,
  versionsFor: () => [{ID: 'attachment'}], esc: s => String(s), attr: s => String(s)
};
vm.createContext(ctx);
for (const name of ['asList','lookupId','lotSubId','lpAllowedSubs','ncLoadPickerLots','ncApplyAccess','canDeleteArchive','sdkDeleteById','updateRecord','num','contractAttachmentButton','contractTitleExtras']) vm.runInContext(fn(name), ctx);
await ctx.ncLoadPickerLots();
assert.equal(requests[0].criteria, '(Subdivision == 441092600000784111)');
assert.equal(ctx.S.lots.length, 2, 'retain lots from other subdivisions');
assert.equal(ctx.S.lots[1].ID, '999999999999999999', 'preserve string IDs');
ctx.sdkGetAll = async () => { throw Error('permission denied'); };
await ctx.ncLoadPickerLots();
assert.ok(ctx.S.lpLoadError, 'load failure must not appear as empty subdivision');
assert.equal(ctx.S.lots.length, 2, 'failed read preserves existing data');
for (const flags of [null, {}, {found:true,ctEdit:true}, {found:false,ctDeleteArchive:true}]) {
  ctx.ncApplyAccess(flags);
  assert.equal(ctx.canDeleteArchive(), false);
  await assert.rejects(ctx.sdkDeleteById('All_Contracts','123'), e => /permission/.test(e.message));
  await assert.rejects(ctx.updateRecord('123',{Archive:true},'All_Contracts'), e => /permission/.test(e.message));
}
ctx.ncApplyAccess({found:true,ctDeleteArchive:true});
assert.equal(ctx.canDeleteArchive(), true);
let deleteRequest;
ctx.window = {ZOHO:{}};
ctx.ZOHO = {CREATOR:{API:{deleteRecord:async args => { deleteRequest=args; return {code:3000}; }}}};
ctx.isEmptyCode = () => false;
ctx.responseBad = () => false;
await ctx.sdkDeleteById('All_Contracts','999999999999999999');
assert.equal(deleteRequest.criteria, '(ID == 999999999999999999)');
assert.equal(deleteRequest.reportName, 'All_Contracts');
ctx.needs = ok => ok;
ctx.findContract = () => ({ID:'123',Contract_Name:'Test'});
ctx.confirmDialog = () => { throw Error('Unauthorized confirmation must not open'); };
vm.runInContext(fn('deleteContract'),ctx);
ctx.ncApplyAccess({found:true,ctEdit:true});
ctx.deleteContract('123');
const row = ctx.contractTitleExtras({ID:'123',Contract_Name:'Test',Contract_Type:'Lot',Number_of_Lots:40,Initial_Takedown:10,Initial_Takedown_Days:30,Subsequent_Takedown_Lots:5,Subsequent_Takedown_Days:90});
assert.match(row, /40 lots/);
assert.match(row, /10 initial in 30 days/);
assert.match(row, /5 every 90 days/);
assert.match(row, /showAttachmentsModal/);
assert.match(row, /event.stopPropagation/);
assert.doesNotMatch(ctx.contractTitleExtras({ID:'123',Contract_Type:'DA'}), /contract-lot-meta/);
console.log('Contract subdivision queries, load errors, destructive-action permissions, and row metadata checks passed.');
