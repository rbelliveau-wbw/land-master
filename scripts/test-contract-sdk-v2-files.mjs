import assert from 'node:assert/strict';
import {ready,drain,deferred,ID,NEW} from './test-contract-sdk-v2-foundation.mjs';
function files(h){
 const calls=[],base=h.api.invokeCustomApi;let seed=BigInt(NEW),fileResponse;
 const response=body=>({code:3000,details:{output:JSON.stringify(body)}});
 h.api.invokeCustomApi=async config=>{const key=Object.entries(h.c.CFG.customApis).find(([,name])=>name===config.api_name)?.[0];if(!['createAttachment','deleteAttachment','attachmentPreview'].includes(key))return base(config);calls.push({method:key,config:structuredClone(config)});
  if(key==='createAttachment'){const id=(seed++).toString();h.reports.All_Contract_Versions.push({ID:id,Contract1:{ID:config.payload.contractId},Email_Attachment:true,File_field1:{},Date_field1:'01-Oct-2026',Added_User:{user_name:'actual-actor'}});return response({ok:true,attachmentId:id});}
  if(key==='deleteAttachment'){h.reports.All_Contract_Versions=h.reports.All_Contract_Versions.filter(row=>row.ID!==config.payload.attachmentId);return response({ok:true,attachmentId:config.payload.attachmentId});}
  return response({ok:true,base64:btoa('%PDF-1.7\nfixture'),filename:'fixture.pdf'});
 };
 h.c.ZOHO.CREATOR.FILE={readFile:async config=>{calls.push({method:'readFile',config:structuredClone(config)});return fileResponse??new Uint8Array([37,80,68,70,45,128,255]);},uploadFile:async config=>{calls.push({method:'uploadFile',config:{...config,file:config.file}});const row=h.reports.All_Contract_Versions.find(row=>row.ID===config.id);const path='native_'+config.file.name;row.File_field1={filepath:path};return {code:3000,data:{filename:config.file.name,filepath:path}};}};
 return {calls,setReadResponse:value=>{fileResponse=value;},nativeCreate:h.api.invokeCustomApi,nativeUpload:h.c.ZOHO.CREATOR.FILE.uploadFile,nativeDelete:h.api.invokeCustomApi};
}
{
 const h=await ready(),f=files(h),id=await h.c.createContractAttachmentRecord(ID);assert.equal(id,NEW);assert.equal(f.calls.filter(call=>call.method==='createAttachment').length,1);assert.equal(h.calls.filter(call=>call.method==='add').length,0,'custom create never replays a direct SDK insert');
 const file={name:'fixture.pdf',size:25};await h.c.sdkUploadVersionFile(id,file);const upload=f.calls.find(call=>call.method==='uploadFile');assert.equal(upload.config.report_name,h.c.CFG.reports.versions);assert.equal(upload.config.id,id);assert.equal(upload.config.field_name,h.c.CFG.fileField);assert.equal(upload.config.file,file);assert.equal(h.c.contractHasReviews(),false);
 const bytes=await h.c.sdkReadVersionFile(id),blob=await h.c.fileResponseToBlob(bytes,'application/pdf');assert.deepEqual(Array.from(new Uint8Array(await blob.arrayBuffer())),[37,80,68,70,45,128,255],'native byte content retains high bytes');
 h.c.S.versions=structuredClone(h.reports.All_Contract_Versions);assert.equal(await h.c.doDeleteVersion(id,ID),true);assert.equal(f.calls.filter(call=>call.method==='deleteAttachment').length,1);assert.equal(h.calls.filter(call=>call.method==='delete').length,0,'custom delete never replays direct SDK delete');assert.equal(h.reports.All_Contract_Versions.length,0);assert.equal(h.c.S.versions.length,0);
}
for(const envelope of [{code:3000},{code:3000,data:{filename:'fixture.pdf',filepath:'native_fixture.pdf',status:'failure'}},{code:3000,data:{filename:'fixture.pdf',filepath:'native_fixture.pdf'},result:[{code:2899}]},{code:3000,data:{filename:'fixture.pdf'}},{code:2898,message:'Denied file'}]){
 const h=await ready(),f=files(h),id=await h.c.createContractAttachmentRecord(ID);let writes=0;h.c.ZOHO.CREATOR.FILE.uploadFile=async()=>{writes++;return envelope;};
 await assert.rejects(h.c.sdkUploadVersionFile(id,{name:'fixture.pdf',size:20}));await assert.rejects(h.c.sdkUploadVersionFile(id,{name:'fixture.pdf',size:20}));assert.equal(writes,1);assert.equal(h.c.contractHasReviews(),true);assert.equal(h.reports.All_Contract_Versions.length,1,'unknown file outcome never deletes its child');assert.equal(f.calls.filter(call=>call.method==='deleteAttachment').length,0);
}
{
 const h=await ready(),f=files(h),id=await h.c.createContractAttachmentRecord(ID);let writes=0;h.c.ZOHO.CREATOR.FILE.uploadFile=async()=>{writes++;h.reports.All_Contract_Versions[0].File_field1={filepath:'native_fixture.pdf'};return {code:3000,data:{filename:'fixture.pdf',filepath:'native_fixture.pdf'}};};
 // A lost verification response retains the acknowledged path for a read-only exact-parent/path recheck.
 const native=h.api.getRecords;h.api.getRecords=config=>config.report_name===h.c.CFG.reports.versions?Promise.reject({code:2898}):native(config);await assert.rejects(h.c.sdkUploadVersionFile(id,{name:'fixture.pdf',size:20}));assert.equal(writes,1);h.api.getRecords=native;
 const key=h.c.contractAttachmentKey('upload',ID,id);assert.equal(await h.c.recheckContractAttachment(key,'upload'),true);assert.equal(writes,1);assert.equal(h.c.contractHasReviews(),false);
}
{
 const h=await ready(),f=files(h),gate=deferred();let creates=0;h.api.invokeCustomApi=config=>config.api_name===h.c.CFG.customApis.createAttachment?(creates++,gate.promise):f.nativeCreate(config);
 const first=h.c.createContractAttachmentRecord(ID);await drain();await assert.rejects(h.c.createContractAttachmentRecord(ID));assert.equal(creates,1);gate.reject(new Error('Applied but response lost'));await assert.rejects(first);await assert.rejects(h.c.createContractAttachmentRecord(ID));assert.equal(creates,1);assert.equal(h.calls.filter(call=>call.method==='add').length,0);assert.equal(await h.c.recheckContractAttachment(h.c.contractAttachmentKey('create',ID),'create'),false,'no-ID create review never guesses a parent child from report rows');
}
{
 const h=await ready(),f=files(h),id=await h.c.createContractAttachmentRecord(ID);h.c.S.versions=structuredClone(h.reports.All_Contract_Versions);let deletes=0;h.api.invokeCustomApi=config=>config.api_name===h.c.CFG.customApis.deleteAttachment?(deletes++,Promise.reject(new Error('Delete applied, response lost'))):f.nativeDelete(config);
 assert.equal(await h.c.doDeleteVersion(id,ID),false);assert.equal(await h.c.doDeleteVersion(id,ID),false);assert.equal(deletes,1);assert.equal(h.calls.filter(call=>call.method==='delete').length,0);assert.equal(h.c.S.versions.length,1,'unconfirmed delete does not remove the retained UI row');
 h.reports.All_Contract_Versions=[];assert.equal(await h.c.recheckContractAttachment(h.c.contractAttachmentKey('delete',ID,id),'delete'),true);assert.equal(deletes,1);
}
{
 const h=await ready(),f=files(h),id=await h.c.createContractAttachmentRecord(ID);h.c.LMRuntime.apply({envUrlFragment:'',loginUser:'other-actor@example.test'});await assert.rejects(h.c.sdkUploadVersionFile(id,{name:'fixture.pdf'}));await assert.rejects(h.c.sdkReadVersionFile(id));await assert.rejects(h.c.updateRecord(ID,{Contract_Name:'No stale-snapshot write'},h.c.CFG.reports.contracts));assert.equal(f.calls.filter(call=>['uploadFile','readFile'].includes(call.method)).length,0);assert.equal(h.calls.filter(call=>call.method==='update').length,0);assert.equal(h.c.canEdit(),false);
}
for(const envelope of [{code:3000,data:{content:'%PDF-1.7',status:'failure'}},{code:3000,data:{content:'%PDF-1.7'},result:[{code:2898}]},{code:2899,data:{content:'%PDF-1.7'}}]){
 const h=await ready(),f=files(h),id=await h.c.createContractAttachmentRecord(ID);f.setReadResponse(envelope);await assert.rejects(h.c.sdkReadVersionFile(id),'failed native FILE envelopes cannot be converted to plausible file bytes');
}
{
 const h=await ready({realDOM:true}),f=files(h),gate=deferred(),native=f.nativeUpload;h.c.ZOHO.CREATOR.FILE.uploadFile=config=>gate.promise.then(()=>native(config));h.c.addVersionFiles(ID,[{name:'from-ui.pdf',size:25}]);await drain();assert.equal(h.c.S.busy,true);h.c.addVersionFiles(ID,[{name:'duplicate.pdf',size:25}]);assert.equal(f.calls.filter(call=>call.method==='createAttachment').length,1,'actual existing UI entry refuses a duplicate while pending');gate.resolve();await drain();assert.equal(h.c.S.busy,false);assert.equal(f.calls.filter(call=>call.method==='uploadFile').length,1);assert.equal(h.c.S.versions.length,1);assert.equal(h.c.contractHasReviews(),false);
}
console.log('PASS whole Contracts native FILE flows: exact persisted parent/ID/path, one custom create/delete, no insert/delete/upload replay or uncertain cleanup, retained read-only rechecks, exact byte preview formats, actor-bound cached child and actual duplicate upload entry guards.');
{
 const h=await ready({realDOM:true}),f=files(h),gate=deferred(),native=f.nativeCreate;h.api.invokeCustomApi=config=>config.api_name===h.c.CFG.customApis.createAttachment?gate.promise.then(()=>native(config)):native(config);
 const pending=h.c.addVersionFiles(ID,[{name:'captured-first.pdf',size:20},{name:'never-sent.pdf',size:20}]);await drain();h.tick(30000);const result=await pending;assert.ok(result.error);assert.equal(result.rows[0].state,'unknown');assert.equal(result.rows.filter(row=>row.state==='not-sent').length,3);assert.equal(h.c.ContractSetupUI.close(),false,'unsettled physical create holds captured UI despite bounded error');assert.equal(await h.c.addVersionFiles(ID,[{name:'second-click.pdf',size:20}]),false);assert.equal(await h.c.contractWorkflowRecheck(h.c.S.contractWorkflow),false);gate.resolve();await drain();assert.equal(f.calls.filter(row=>row.method==='createAttachment').length,1);assert.equal(f.calls.filter(row=>row.method==='uploadFile').length,0,'late create response cannot continue FILE or another file');assert.equal(h.c.ContractSetupUI.close(),true);assert.equal(h.reports.All_Contract_Versions.length,1,'unknown child is retained; never cleanup-delete');
}
{
 const h=await ready({realDOM:true}),f=files(h),gate=deferred(),native=f.nativeCreate;h.api.invokeCustomApi=config=>config.api_name===h.c.CFG.customApis.createAttachment?gate.promise.then(()=>native(config)):native(config);
 const pending=h.c.addVersionFiles(ID,[{name:'actor-bound.pdf',size:20}]);await drain();h.c.LMRuntime.apply({envUrlFragment:'',loginUser:'other-actor@example.test'});gate.resolve();const result=await pending;assert.ok(result.error);assert.equal(f.calls.filter(row=>row.method==='uploadFile').length,0);const retained=Object.values(h.c.S.attachmentReviews)[0];assert.equal(retained.id,NEW,'genuine returned child ID is kept only for read-only review in the original actor scope');assert.equal(await h.c.recheckContractAttachment(retained.key,'create'),false);
}
console.log('PASS actual attachment batch controller: captured files/parent, explicit not-sent later stages, dispatched deadline retains native slot, duplicate/cancel guards, zero FILE after late/changed-actor create and known-child quarantine.');
