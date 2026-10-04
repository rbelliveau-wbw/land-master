import assert from 'node:assert/strict';
import {harness,ready,drain,deferred,ID,ACCESS,SUB,NEW} from './test-contract-sdk-v2-foundation.mjs';
{
 const h=await ready({realDOM:true}),raw=h.reports.All_Contracts1[0];raw.Owner=[{ID:ACCESS,zc_display_value:'Recorded Native Owner'}];raw.WBW_Point_Person={ID:ACCESS,zc_display_value:'Native Point Person'};raw.Subdivision1=[{ID:SUB,zc_display_value:'Native phase'}];await h.c.loadData();
 assert.equal(h.c.ownerNames(h.c.findContract(ID))[0],'Recorded Native Owner');assert.equal(h.c.displayValue(h.c.findContract(ID).Subdivision1),'Native phase');assert.equal(h.c.listDisplay(h.c.findContract(ID).WBW_Point_Person),'Native Point Person');assert.equal(raw.Owner[0].display_value,undefined,'native source objects are not mutated during alias enrichment');assert.ok(h.node('view').textContent.includes('Recorded Native Owner'),'actual mounted list owner survives SDK2 label shape');
}
{
 const h=await ready({realDOM:true});assert.equal(h.c.S.commentSummaryLoaded,true,'actual boot retained background summaries');assert.equal(h.c.contractCommentBadge(ID).count,0);
 h.c.S.commentSummaryLoaded=false;h.c.S.commentRowsByContract={};h.c.S.commentSummaryStatus='loading';const markup=h.c.contractCommentButton(h.c.findContract(ID));assert.ok(markup.includes('…'));assert.ok(!markup.includes('null comment'));
 const native=h.api.getRecords,gate=deferred();h.reports.Comment_Log_Report=[{ID:NEW,Contract1:{ID},Added_Time:'10/03/2026 10:00:00',Deleted:false}];h.api.getRecords=config=>config.report_name==='Comment_Log_Report'?gate.promise.then(()=>native(config)):native(config);
 const node=h.node('overlays'),writes=node.htmlWrites,summary=h.c.loadContractCommentSummaries();await drain();h.c.S.nc={name:'Mounted typed draft'};gate.resolve();assert.equal(await summary,true);assert.equal(h.c.contractCommentBadge(ID).count,1);assert.equal(node.htmlWrites,writes,'summary patches mounted count only without modal/draft replacement');assert.equal(h.c.S.nc.name,'Mounted typed draft');
}
{
 const h=await ready({realDOM:true});h.c.S.commentSummaryLoaded=false;h.c.S.commentRowsByContract={};const native=h.api.getRecordCount;h.api.getRecordCount=config=>config.report_name==='Comment_Log_Report'?Promise.resolve({code:3000,result:{code:2898,records_count:'0'}}):native(config);assert.equal(await h.c.loadContractCommentSummaries(),false);assert.equal(h.c.contractCommentBadge(ID).known,false);assert.equal(h.c.contractCommentBadge(ID).count,null);assert.ok(h.c.contractCommentButton(h.c.findContract(ID)).includes('>?</span>'));
}
{
 const gate=deferred(),h=harness({realDOM:true,initialize:()=>gate.promise});h.c.ZOHO.CREATOR.UTIL.getQueryParams=async()=>({contractId:ID});gate.resolve({envUrlFragment:'',loginUser:'actual-actor@example.test'});await drain();assert.equal(h.c.S.coreReady,true);assert.equal(h.c.S.selId,ID,'actual boot retains contract deep-link opening after complete scopes');
}
console.log('PASS actual post-load native lookup enrichment, raw immutability, mounted owner label, counted background comment badges/unknown denial/targeted DOM patch and contract deep-link entry.');
