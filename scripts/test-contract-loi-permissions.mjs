import assert from 'node:assert/strict';
import {harness,ready,drain,deferred,ID,ACTION,NEW} from './test-contract-sdk-v2-foundation.mjs';
const report='All_Pro_Formas_All_Fields',LOI=(BigInt(NEW)+80n).toString();
const loi=()=>({ID:LOI,Name:'Permission fixture LOI',LOI_Legal_Status:'Pending Approval',LOI_Approval_Token:'fixture-current-token',LOI_Legal_Note:'',Acquisition_Email:'owner@example.test'});
const reads=h=>h.calls.filter(call=>['count','records'].includes(call.method)&&call.config.report_name===report);

{
 const h=harness({realDOM:true}),nativeCount=h.api.getRecordCount;let permitted=false,attempts=0;
 h.api.getRecordCount=config=>{if(config.report_name===report){attempts++;if(!permitted)return Promise.reject({code:2898,message:'Permission denied to view record(s)'});}return nativeCount(config);};
 await drain();assert.equal(h.c.S.coreReady,true);assert.equal(h.c.S.liveSDK,true);assert.equal(h.c.S.locked,false);assert.equal(attempts,1,'startup begins one pending-only LOI read for the Review badge');assert.equal(h.c.S.loiDataStatus,'error');assert.equal(h.c.canEdit(),true);assert.ok(h.node('view').textContent.includes('Fixture contract'));
 h.c.findContract(ID).Status='Proposed';const contracts=h.c.S.contracts;
 assert.equal(await h.c.showLOIReviews(),false);assert.equal(attempts,2,'explicit Review retries the pending-only read without a full-report fallback');assert.equal(h.c.S.loiDataStatus,'error');assert.equal(h.c.S.coreReady,true);assert.equal(h.c.S.contracts,contracts);assert.equal(h.c.S.locked,false);assert.equal(h.c.canEdit(),true);assert.match(h.node('view').textContent,/LOI reviews unavailable/);assert.doesNotMatch(h.node('view').textContent,/Nothing waiting on Legal|You do not have access to the contract records/);assert.equal(h.c.reviewCount(),1);assert.match(h.c.homeSwitch('loi'),/>1\+<\/span>/,'the badge does not claim a complete LOI count');
 h.c.S.loiReviews=[loi()];assert.equal(h.c.findLOI(LOI),null);assert.equal(h.c.filteredLOIs().length,0,'denied scope cannot display stale LOI data');
 const before=h.calls.length;h.c.runLOIReview('APPROVE',h.c.S.loiReviews[0],'',null);assert.equal(h.calls.length,before,'an unavailable LOI cannot support a decision');
 await h.c.updateRecord(ACTION,{Dev_Notes:'Contracts work with LOI permission denied'},h.c.CFG.reports.actions);assert.equal(h.reports.All_Contract_Actions[0].Dev_Notes,'Contracts work with LOI permission denied');assert.equal(attempts,2);
 permitted=true;h.reports[report]=[loi()];assert.equal(await h.c.ensureLOIReviews(true),true);assert.equal(h.c.S.loiDataStatus,'ready');assert.equal(h.c.findLOI(LOI).ID,LOI);assert.equal(h.c.reviewCount(),2);assert.ok(reads(h).every(call=>call.config.criteria==='LOI_Legal_Status == "Pending Approval"'));
 await h.c.openLOIReview(LOI,'fixture-link-token');assert.equal(h.c.S.loiToken,'fixture-link-token');assert.equal(h.c.S.loiSelId,LOI);assert.match(h.node('view').textContent,/does not match the current request/,'token mismatch protection is preserved');
 h.c.showContracts();const beforeRefresh=attempts;assert.equal(await h.c.loadData(),true);await drain();assert.equal(attempts,beforeRefresh+1,'refresh starts one fresh pending-only read for the badge');assert.equal(h.c.S.loiDataStatus,'ready');assert.equal(h.c.S.loiDataGeneration,h.c.S.contractDataGeneration,'the LOI snapshot is bound to the new core generation');assert.equal(h.c.findLOI(LOI).ID,LOI);
}

{
 const h=harness({realDOM:true}),nativeCount=h.api.getRecordCount;
 h.c.ZOHO.CREATOR.UTIL.getQueryParams=async()=>({loiReviewId:LOI,tokenId:'fixture-current-token'});h.reports[report]=[loi()];
 await drain();assert.equal(h.c.S.coreReady,true);assert.equal(h.c.S.loiDataStatus,'ready');assert.equal(h.c.S.view,'loiReview');assert.equal(h.c.S.loiSelId,LOI);assert.equal(h.c.S.loiToken,'fixture-current-token');assert.equal(h.c.findLOI(LOI).LOI_Approval_Token,'fixture-current-token');assert.ok(reads(h).length>0,'LOI deep links fetch their pending review data after core startup');
 h.api.getRecordCount=config=>config.report_name===report?Promise.reject({code:2898,message:'Permission denied to view record(s)'}):nativeCount(config);
 assert.equal(await h.c.ensureLOIReviews(true),false);assert.equal(h.c.S.coreReady,true);assert.equal(h.c.S.liveSDK,true);assert.equal(h.c.findLOI(LOI),null);assert.match(h.node('view').textContent,/LOI reviews unavailable/);
}

{
 const h=harness({realDOM:true}),nativeCount=h.api.getRecordCount;
 h.c.ZOHO.CREATOR.UTIL.getQueryParams=async()=>({loiReviewId:LOI,tokenId:'fixture-current-token'});
 h.api.getRecordCount=config=>config.report_name===report?Promise.reject({code:2898,message:'Permission denied to view record(s)'}):nativeCount(config);
 await drain();assert.equal(h.c.S.coreReady,true);assert.equal(h.c.S.liveSDK,true);assert.equal(h.c.S.locked,false);assert.equal(h.c.S.loiDataStatus,'error');assert.equal(h.c.S.view,'loiReview');assert.match(h.node('view').textContent,/LOI reviews unavailable/,'denied LOI deep link remains local to its review');
}

{
 const h=await ready({realDOM:true}),gate=deferred(),nativeCount=h.api.getRecordCount;let attempts=0;
 h.reports[report]=[loi()];h.api.getRecordCount=config=>config.report_name===report?(attempts++,gate.promise.then(()=>nativeCount(config))):nativeCount(config);
 const first=h.c.ensureLOIReviews(true),second=h.c.ensureLOIReviews();assert.equal(first,second);assert.equal(h.c.S.loiDataStatus,'loading');await drain();assert.equal(attempts,1,'concurrent Review requests share one read');
 h.c.LMRuntime.apply({envUrlFragment:'',loginUser:'another-actor@example.test'});gate.resolve();assert.equal(await first,false);assert.equal(h.c.contractLOIReady(),false);assert.equal(h.c.findLOI(LOI),null);assert.equal(h.c.S.loiReviews.length,0);assert.equal(await h.c.ensureLOIReviews(),false,'a changed actor cannot read LOIs against stale core permissions');
}

{
 const h=await ready({realDOM:true});h.reports[report]=[{ID:LOI,Name:'Missing status field'}];assert.equal(await h.c.ensureLOIReviews(true),false);assert.equal(h.c.S.loiDataStatus,'error');assert.equal(h.c.contractLOIReady(),false,'an omitted report status cannot become an empty verified LOI list');
}

{
 const h=harness({realDOM:true,actionsCount:4}),gate=deferred(),nativeCount=h.api.getRecordCount;
 h.reports.All_Contracts1[0].Status='Proposed';h.reports.All_Contract_Actions.forEach(row=>row.Status='Proposed');
 const live=(BigInt(NEW)+100n).toString();h.reports.All_Contracts1.push({ID:live,Contract_Name:'Existing live contract',Status:'New'});
 for(let i=0;i<2;i++)h.reports.All_Contract_Actions.push({ID:(BigInt(NEW)+101n+BigInt(i)).toString(),Contract1:live,Contract_Action:'Separate proposal '+i,Status:'Proposed',Complete:false});
 h.reports[report]=[loi()];h.api.getRecordCount=config=>config.report_name===report?gate.promise.then(()=>nativeCount(config)):nativeCount(config);
 await drain();assert.equal(h.c.S.coreReady,true,'slow review data never delays the usable Contracts snapshot');assert.equal(h.c.S.homeSection,'contracts');assert.equal(h.c.S.loiDataStatus,'loading');
 assert.equal(h.c.reviewCount(),3,'one contract with four actions plus two standalone proposed actions');
 assert.equal(h.c.document.querySelector('.review-n').textContent,'3+');const writes=h.node('view').htmlWrites;
 gate.resolve();await drain();assert.equal(h.c.S.loiDataStatus,'ready');assert.equal(h.c.reviewCount(),4,'one pending LOI is another review item');
 assert.equal(h.c.document.querySelector('.review-n').textContent,'4','the mounted badge updates without clicking Review');assert.ok(!h.c.document.querySelector('.review-n').getAttribute('title'));
 assert.equal(h.node('view').htmlWrites,writes,'background badge loading does not rebuild the current page');
 h.c.S.loiMine=true;h.c.S.loiSearch='no matching record';assert.equal(h.c.reviewCount(),4,'page filters never change the global review count');
 assert.equal(reads(h).filter(call=>call.method==='count').length,1);assert.ok(reads(h).every(call=>call.config.criteria==='LOI_Legal_Status == "Pending Approval"'));
 assert.equal(h.calls.filter(call=>['add','update','delete'].includes(call.method)).length,0);
}

console.log('PASS actual Legal Review badge: automatic nonblocking pending-only startup/refresh, mounted count patch, grouped contract/actions, standalone proposals, global filter-independent count, local denied/read-only scope, exact IDs/tokens, stale actor/generation exclusion and missing-field failure.');
