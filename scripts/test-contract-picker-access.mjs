import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {ready} from './test-contract-sdk-v2-foundation.mjs';

const source = fs.readFileSync('widgets/contract-management/src/app/widget.html', 'utf8');
assert.match(source, /\.dt-in\{[^}]*pointer-events:none/, 'native date carrier must not receive pointer input');
assert.doesNotMatch(source, /onmousedown="qdOpen\(event,this\)"/, 'native date input must not open beside quick date');
assert.match(source, /window\.addEventListener\("scroll",function\(e\)\{[\s\S]*?cboQueuePosition\(\);[\s\S]*?\},true\);/, 'combo follows its trigger while the Contracts view scrolls');
assert.match(source, /\.cname-line\{display:flex;flex-wrap:wrap/, 'counterparty pill and attachment count sit right after the title and wrap instead of clipping');
assert.doesNotMatch(source, /\.bldr-pill\{[^}]*text-overflow:ellipsis/, 'counterparty pill must always show the full name');
assert.match(source, /\.wtable td\.own-cell\{white-space:normal/, 'owner pills wrap so every owner is visible');
function fn(name) {
  const start = source.indexOf('function ' + name + '(');
  assert.ok(start >= 0, name);
  const lineEnd = source.indexOf('\n', start);
  if (source.slice(start, lineEnd).trim().endsWith('}')) return source.slice(start, lineEnd);
  return source.slice(start, source.indexOf('\n}', start) + 2);
}
const lotStateForStatus = new Function('lpIsOn','lpClaimedBy','truthy', `return (${fn('lotState')})`)(() => false, () => null, Boolean);
assert.equal(lotStateForStatus({ID:'1',Status:'Scheduled'}), 'scheduled', 'scheduled lots must be visibly locked in the contract picker');
const requests = [];
const h=await ready({realDOM:true}),ctx=h.c;
Object.assign(ctx.S,{nc:{sub:['441092600000784111'],lotIds:[]},lots:[{ID:'1',Subdivision:{ID:'other'}}],homeSection:'contracts'});
h.reports[ctx.CFG.reports.lots]=[{ID:'999999999999999999',Subdivision:{ID:'441092600000784111'}}];
const nativeRecords=h.api.getRecords;h.api.getRecords=config=>{requests.push(config);return nativeRecords(config);};
await ctx.ncLoadPickerLots();
assert.equal(requests[0].criteria, '(Subdivision == 441092600000784111)');
assert.equal(ctx.S.lots.length, 2, 'retain lots from other subdivisions');
assert.equal(ctx.S.lots[1].ID, '999999999999999999', 'preserve string IDs');
const nativeCount=h.api.getRecordCount;h.api.getRecordCount=async()=>{throw Error('permission denied');};
await ctx.ncLoadPickerLots();
assert.ok(ctx.S.lpLoadError, 'load failure must not appear as empty subdivision');
assert.equal(ctx.S.lots.length, 2, 'failed read preserves existing data');
h.api.getRecordCount=nativeCount;
for (const flags of [null, {}, {found:true,ctEdit:true}, {found:false,ctDeleteArchive:true}]) {
  ctx.ncApplyAccess(flags);
  assert.equal(ctx.canDeleteArchive(), false);
  await assert.rejects(ctx.sdkDeleteById(ctx.CFG.reports.contracts,'123'), e => /permission/.test(e.message));
  await assert.rejects(ctx.updateRecord('123',{Archive:true},ctx.CFG.reports.contracts), e => /permission/.test(e.message));
}
ctx.ncApplyAccess({found:true,ctDeleteArchive:true});
assert.equal(ctx.canDeleteArchive(), true);
ctx.ncApplyAccess({found:true,legalAssignedToMe:'true'});
assert.equal(ctx.S.loiMine, true, 'saved Legal preference accepts the normalized custom API value');
ctx.ncApplyAccess({found:true,Legal_Assigned_to_Me:'true'});
assert.equal(ctx.S.loiMine, true, 'saved Legal preference accepts the Creator field-name fallback');
ctx.ncApplyAccess({found:true,legalAssignedToMe:'false',Legal_Assigned_to_Me:'true'});
assert.equal(ctx.S.loiMine, false, 'normalized custom API key takes precedence over the field-name fallback');
ctx.ncApplyAccess({found:true,ctDeleteArchive:true});
let deleteRequest;const nativeDelete=h.api.deleteRecords;
h.reports[ctx.CFG.reports.contracts]=[{ID:'999999999999999999'}];
h.api.deleteRecords=async args=>{deleteRequest=args;return nativeDelete(args);};
await ctx.sdkDeleteById(ctx.CFG.reports.contracts,'999999999999999999');
assert.equal(deleteRequest.payload.criteria, '(ID == 999999999999999999)');
assert.equal(deleteRequest.report_name,ctx.CFG.reports.contracts);
assert.equal(h.reports[ctx.CFG.reports.contracts].length,0,'native delete confirms the captured string ID then verifies absence');
ctx.findContract = () => ({ID:'123',Contract_Name:'Test'});
ctx.confirmDialog = () => { throw Error('Unauthorized confirmation must not open'); };
ctx.ncApplyAccess({found:true,ctEdit:true});
ctx.deleteContract('123');
const row = ctx.contractTitleExtras({ID:'123',Contract_Name:'Test',Contract_Type:'Lot',Number_of_Lots:40,Initial_Takedown:10,Initial_Takedown_Days:30,Subsequent_Takedown_Lots:5,Subsequent_Takedown_Days:90});
assert.match(row, /40 lots/);
assert.match(row, /10 initial within 30 days/);
assert.match(row, /5 subsequent every 90 days/);
assert.match(row, /showAttachmentsModal/);
assert.match(row, /event.stopPropagation/);
assert.doesNotMatch(ctx.contractTitleExtras({ID:'123',Contract_Type:'DA'}), /contract-lot-meta/);
assert.match(row, /0 selected \/ 40 total lots/);
assert.match(row, /title="Attachments"/);
assert.equal(ctx.lotCountWarning(2,[{ID:'1'},{ID:'2'},{ID:'2'}]), '');
assert.equal(ctx.lotCountWarning(3,[{ID:'1'},{ID:'2'}]), '2 selected / 3 total lots');
const ownedLot={ID:'123',Contract_Type:'Lot',Status:'New',Owner:[{ID:'42'},{ID:'99'}]};
ctx.findContract=()=>ownedLot;
ctx.S.myAccessId='42';
ctx.ncApplyAccess({found:true,ctEdit:false});
assert.equal(ctx.mayChangeLotsPricing('123'),true,'a contract owner can change lots without general edit access');
ctx.S.myAccessId='77';
assert.equal(ctx.mayChangeLotsPricing('123'),false,'another user cannot change lots');
ctx.S.myAccessId='';
assert.equal(ctx.mayChangeLotsPricing('123'),false,'an unresolved user cannot claim ownership');
ctx.ncApplyAccess({found:true,ctEdit:true});
assert.equal(ctx.mayChangeLotsPricing('123'),true,'general editors retain access');
ownedLot.Status='Complete';
assert.equal(ctx.mayChangeLotsPricing('123'),false,'completed contracts remain locked');
ctx.S.myAccessId='42';
assert.equal(ctx.mayChangeLotsPricing('123'),true,'completed Lot contracts allow owners to backfill');
ownedLot.Status='New';
assert.throws(() => ctx.clpTermChanges({}, {Number_of_Lots:'1.5'}), /whole numbers/);
assert.throws(() => ctx.clpTermChanges({}, {Number_of_Lots:'-1'}), /whole numbers/);
assert.throws(()=>ctx.clpTermChanges({Number_of_Lots:20,Initial_Takedown:10}, {Number_of_Lots:'30',Initial_Takedown:'',Second_Closing_Lots:'5',Second_Closing_Days:'45',Subsequent_Takedown_Lots:'5',Subsequent_Takedown_Days:'30'}),/Initial Closing lots/,'converted cadence must have its initial inputs');
const changes=ctx.clpTermChanges({Number_of_Lots:20,Initial_Takedown:10}, {Number_of_Lots:'30',Initial_Takedown:'10',Initial_Takedown_Days:'30',Second_Closing_Lots:'20',Second_Closing_Days:'45',Subsequent_Takedown_Lots:'',Subsequent_Takedown_Days:''});
assert.equal(changes.Number_of_Lots,30);
assert.equal(changes.Second_Closing_Lots,20,'second terms exhaust the obligation so blank recurrence remains valid');
// A terms-only edit must work with zero selected lots and must not delete pricing.
const contract={ID:'123',Contract_Type:'Lot (Master)',Number_of_Lots:40,Lots1:[]};
ctx.S.nc={type:'Lot (Master)',parent:'',sub:[],lotIds:[],ppf:{}};
ctx.S.clp={cid:'123',lots0:[],ppf0:'{}',terms:{Number_of_Lots:'45',Initial_Takedown:'10',Initial_Takedown_Days:'30',Second_Closing_Lots:'5',Second_Closing_Days:'45',Subsequent_Takedown_Lots:'5',Subsequent_Takedown_Days:'90'}};
ctx.S.pricing=[{ID:'44',Contract1:{ID:'123'},Lot_Size:50,Price_per_Ft:1000,Base_Price:50000}];
ctx.findContract=()=>contract;
h.reports[ctx.CFG.reports.contracts]=[contract];h.reports[ctx.CFG.reports.pricing]=structuredClone(ctx.S.pricing);
let saved;const nativeUpdate=h.api.updateRecordById;
h.api.updateRecordById=async config=>{saved={id:config.id,payload:config.payload.data};return nativeUpdate(config);};
h.api.deleteRecords=()=>{throw Error('Terms-only edit must not delete rows');};
ctx.ncLotSizes=()=>{ throw Error('Terms-only edit must not depend on loaded lots'); };
const completed=await ctx.clpSave();assert.equal(completed.error,null);assert.equal(ctx.S.contractWorkflow,null);
assert.equal(saved.payload.Number_of_Lots,45);
assert.equal(saved.payload.Subsequent_Takedown_Days,90);
assert.equal(saved.payload.Lots1,undefined);
assert.equal(contract.Number_of_Lots,45);
assert.equal(ctx.S.pricing[0].ID,'44');
// A combined edit persists the declared total independently of selected IDs.
Object.assign(contract,{Subdivision1:[{ID:'20'}],Project:{ID:'4410926000001234567'},Territory:'Waco',Builder:{ID:'10'}});
ctx.S.projects=[{ID:'4410926000001234567',Territory:'Waco'}];ctx.S.subdivisions=[{ID:'20',Project:{ID:'4410926000001234567'},Territory:'Waco'}];
ctx.S.nc={type:'Lot (Master)',project:'4410926000001234567',builder:'10',parent:'',sub:['20'],lotIds:['1'],ppf:{50:1000}};
ctx.S.clp={cid:'123',lots0:[],ppf0:'{"50":1000}',terms:{Number_of_Lots:'50',Initial_Takedown:'10',Initial_Takedown_Days:'30',Second_Closing_Lots:'5',Second_Closing_Days:'45',Subsequent_Takedown_Lots:'5',Subsequent_Takedown_Days:'90'}};
ctx.S.lpLoading=false; ctx.S.lpLoadError='';
ctx.ncLotSizes=()=>[{size:50,count:1}];
h.reports[ctx.CFG.reports.lots]=[{ID:'1',Subdivision:{ID:'20'},Lot_Size:50,Status:'Open',Contract1:{}}];ctx.S.lots=structuredClone(h.reports[ctx.CFG.reports.lots]);
const combined=await ctx.clpSave();assert.equal(combined.error,null);assert.equal(ctx.S.contractWorkflow,null);
assert.equal(saved.payload.Number_of_Lots,50);
assert.equal(saved.payload.Lots1[0],'1');
assert.equal(contract.Number_of_Lots,50);
assert.equal(ctx.lotCountWarning(contract.Number_of_Lots,contract.Lots1),'1 selected / 50 total lots');

// Converting type without changing selected lots or pricing must only write type.
contract.Subdivision1=[{ID:'20'}];
contract.Project={ID:'4410926000001234567'};contract.Territory='Waco';
ctx.S.nc={type:'Lot (Amendment)',project:'4410926000001234567',territory:'Waco',builder:'10',parent:'',sub:['20'],lotIds:['1'],ppf:{50:1000}};
ctx.S.clp={cid:'123',lots0:['1'],ppf0:'{"50":1000}',terms:{Number_of_Lots:'50',Initial_Takedown:'10',Initial_Takedown_Days:'30',Second_Closing_Lots:'5',Second_Closing_Days:'45',Subsequent_Takedown_Lots:'5',Subsequent_Takedown_Days:'90'}};
ctx.ncLotSizes=()=>{throw Error('Type-only conversion must not reconcile pricing');};
const converted=await ctx.clpSave();assert.equal(converted.error,null);assert.equal(ctx.S.contractWorkflow,null);
assert.deepEqual(JSON.parse(JSON.stringify(saved.payload)),{Contract_Type:'Lot (Amendment)'});
assert.equal(contract.Contract_Type,'Lot (Amendment)');
assert.equal(ctx.S.pricing[0].ID,'44');

// The Legal Review "Assigned to me" pill spans each existing assignment shape.
ctx.ncLoginUser=()=>ctx.S.currentUser;
ctx.daysSinceDate=()=>null;
ctx.S.currentUser='rbelliveau@wbdevelopment.com';
ctx.S.myAccessId='42';
ctx.S.loiMine=true;
ctx.S.loiSearch='';
Object.assign(ctx.S,{loiDataStatus:'ready',loiDataGeneration:ctx.S.contractDataGeneration,loiDataScope:ctx.contractMutationScope()});
ctx.S.loiReviews=[
  {ID:'loi-mine',LOI_Legal_Status:'Pending Approval',Acquisition_Email:'rbelliveau@wbdevelopment.com'},
  {ID:'loi-other',LOI_Legal_Status:'Pending Approval',Acquisition_Email:'tparks@wbdevelopment.com'}
];
ctx.S.contracts=[
  {ID:'contract-mine',Status:'Proposed',Owner:[{ID:'42'}],Contract_Name:'Mine'},
  {ID:'contract-other',Status:'Proposed',Owner:[{ID:'99'}],Contract_Name:'Other'}
];
ctx.findContract=id=>ctx.S.contracts.find(c=>String(c.ID)===String(id));
ctx.S.actions=[
  {ID:'action-mine',Status:'Proposed',Dev_Mgr:'RB',Contract1:{ID:'contract-mine'},Sort_Order:1},
  {ID:'action-other',Status:'Proposed',Dev_Mgr:'TP',Contract1:{ID:'contract-other'},Sort_Order:2}
];
ctx.S.approvals=[
  {ID:'approval-mine',Status:'Awaiting Approval',Approver:'rbelliveau@wbdevelopment.com',Contract1:{ID:'contract-mine'}},
  {ID:'approval-other',Status:'Awaiting Approval',Approver:'tparks@wbdevelopment.com',Contract1:{ID:'contract-other'}}
];
assert.deepEqual(Array.from(ctx.filteredLOIs(),r=>r.ID),['loi-mine']);
assert.deepEqual(Array.from(ctx.proposedContracts(),r=>r.ID),['contract-mine']);
assert.deepEqual(Array.from(ctx.proposedActions(),r=>r.ID),['action-mine']);
assert.deepEqual(Array.from(ctx.waitingApprovals(),r=>r.a.ID),['approval-mine']);
/* 2 LOIs + 2 proposed contracts; both actions were proposed with a still-Proposed
   contract, so they nest under it and are not their own queue items */
assert.equal(ctx.reviewCount(),4,'Review tab badge stays global while the pill is active and counts a contract with its actions as one');
ctx.S.contracts.push({ID:'contract-live',Status:'New',Owner:[{ID:'42'}],Contract_Name:'Live'});
ctx.S.actions.push({ID:'action-loose',Status:'Proposed',Dev_Mgr:'RB',Contract1:{ID:'contract-live'},Sort_Order:3});
assert.equal(ctx.reviewCount(),5,'an action proposed onto an existing contract counts on its own');
assert.deepEqual(Array.from(ctx.looseProposedActions(),r=>r.ID),['action-loose'],'only standalone proposed actions are loose');
console.log('Contract picker, popup, Legal assignment, permissions, and row metadata checks passed.');
