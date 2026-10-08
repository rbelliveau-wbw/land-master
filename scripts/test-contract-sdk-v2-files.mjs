import assert from 'node:assert/strict';
import vm from 'node:vm';
import {ready,drain,deferred,ID,NEW} from './test-contract-sdk-v2-foundation.mjs';
function noExtraAttachmentProgress(h){const extra=h.c.document.getElementById('contractSaveOverlay');assert.ok(!extra||extra.hidden,'attachment upload never opens the extra Contract progress dialog');assert.ok(!h.c.ContractSetupUI.progress()?.open);}
function files(h,{fileMetadata='object'}={}){
 const calls=[],base=h.api.invokeCustomApi;let seed=BigInt(NEW),fileResponse;
 const response=body=>({code:3000,details:{output:JSON.stringify(body)}});
 h.api.invokeCustomApi=async config=>{const key=Object.entries(h.c.CFG.customApis).find(([,name])=>name===String(config.api_name).replace(/_(DEV|STAGE)$/i,''))?.[0];if(!['createAttachment','deleteAttachment','attachmentPreview'].includes(key))return base(config);calls.push({method:key,config:structuredClone(config)});
  if(key==='createAttachment'){const id=(seed++).toString();h.reports.All_Contract_Versions.push({ID:id,Contract1:{ID:config.payload.contractId},Email_Attachment:true,File_field1:{},Date_field1:'01-Oct-2026',Added_User:{user_name:'actual-actor'}});return response({ok:true,attachmentId:id});}
  if(key==='deleteAttachment'){h.reports.All_Contract_Versions=h.reports.All_Contract_Versions.filter(row=>row.ID!==config.payload.attachmentId);return response({ok:true,attachmentId:config.payload.attachmentId});}
  return response({ok:true,base64:btoa('%PDF-1.7\nfixture'),filename:'fixture.pdf'});
 };
 h.c.ZOHO.CREATOR.FILE={readFile:async config=>{calls.push({method:'readFile',config:structuredClone(config)});return fileResponse??new Uint8Array([37,80,68,70,45,128,255]);},uploadFile:async config=>{calls.push({method:'uploadFile',config:{...config,file:config.file}});const row=h.reports.All_Contract_Versions.find(row=>row.ID===config.id);const path='native_'+config.file.name;row.File_field1=fileMetadata==='url'?'/download?filepath='+encodeURIComponent(path):{filepath:path};return {code:3000,data:{filename:config.file.name,filepath:path}};}};
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
 const h=await ready({realDOM:true}),f=files(h),gate=deferred(),native=f.nativeUpload;
 h.c.showAttachmentsModal(ID);
 const overlays=h.node('overlays'),modal=overlays.querySelector('.modal'),drop=h.c.document.getElementById('attDrop'),status=h.c.document.getElementById('attStatus'),input=h.c.document.getElementById('attFile'),mounts=overlays.htmlWrites;
 h.c.ZOHO.CREATOR.FILE.uploadFile=config=>gate.promise.then(()=>native(config));
 const nativeCount=h.api.getRecordCount,nativeRead=h.api.getRecords;let broadReads=0;
 for(const [method,original] of [['getRecordCount',nativeCount],['getRecords',nativeRead]])h.api[method]=config=>{if(config.report_name===h.c.CFG.reports.versions&&!config.criteria){broadReads++;return Promise.reject(Error('Verified upload must not depend on a redundant whole-report reload'));}return original(config);};
 const pending=h.c.addVersionFiles(ID,[{name:'from-ui.pdf',size:25}]);await drain();assert.equal(h.c.S.busy,true);
 assert.equal(overlays.querySelector('.modal'),modal);assert.equal(h.c.document.getElementById('attDrop'),drop);assert.equal(h.c.document.getElementById('attStatus'),status);assert.equal(overlays.htmlWrites,mounts,'upload patches the existing attachment modal');
 assert.ok(status.querySelector('.spinner'),'pending upload shows a spinner in the attachment status');assert.equal(status.getAttribute('role'),'status');assert.equal(status.getAttribute('aria-live'),'polite');assert.equal(input.disabled,true);
 noExtraAttachmentProgress(h);
 assert.equal(h.c.closeOverlays(),false,'the prior modal cannot close while native upload is active');assert.equal(overlays.querySelector('.modal'),modal);
 assert.equal(await h.c.addVersionFiles(ID,[{name:'duplicate.pdf',size:25}]),false);assert.equal(f.calls.filter(call=>call.method==='createAttachment').length,1,'actual existing UI entry refuses a duplicate while pending');
 gate.resolve();const result=await pending;await drain();assert.equal(result.error,null);assert.equal(h.c.S.busy,false);assert.equal(f.calls.filter(call=>call.method==='uploadFile').length,1);assert.equal(h.c.S.versions.length,1);assert.equal(h.c.contractHasReviews(),false);
 assert.equal(overlays.querySelector('.modal'),modal);assert.equal(overlays.htmlWrites,mounts,'success retains the mounted modal shell');noExtraAttachmentProgress(h);assert.equal(status.querySelector('.spinner'),null);assert.match(modal.textContent,/from-ui\.pdf/);assert.equal(input.disabled,false);assert.equal(broadReads,0,'exact verified upload ledger completes without a whole-report reload');
}
console.log('PASS whole Contracts native FILE flows: exact persisted parent/ID/path, one custom create/delete, no insert/delete/upload replay or uncertain cleanup, retained read-only rechecks, exact byte preview formats, actor-bound cached child and actual duplicate upload entry guards.');
{
 const h=await ready({realDOM:true}),f=files(h),gate=deferred(),native=f.nativeCreate;h.api.invokeCustomApi=config=>config.api_name===h.c.CFG.customApis.createAttachment?gate.promise.then(()=>native(config)):native(config);
 h.c.showAttachmentsModal(ID);const overlays=h.node('overlays'),modal=overlays.querySelector('.modal'),mounts=overlays.htmlWrites;
 const pending=h.c.addVersionFiles(ID,[{name:'captured-first.pdf',size:20},{name:'never-sent.pdf',size:20}]);await drain();h.tick(30000);const result=await pending;assert.ok(result.error);assert.equal(result.rows[0].state,'unknown');assert.equal(result.rows.filter(row=>row.state==='not-sent').length,3);assert.equal(h.c.closeOverlays(),false,'unsettled physical create holds the prior attachment modal despite bounded error');assert.equal(await h.c.addVersionFiles(ID,[{name:'second-click.pdf',size:20}]),false);assert.equal(await h.c.contractWorkflowRecheck(h.c.S.contractWorkflow),false);noExtraAttachmentProgress(h);assert.equal(overlays.querySelector('.modal'),modal);assert.equal(overlays.htmlWrites,mounts);gate.resolve();await drain();assert.equal(f.calls.filter(row=>row.method==='createAttachment').length,1);assert.equal(f.calls.filter(row=>row.method==='uploadFile').length,0,'late create response cannot continue FILE or another file');assert.equal(h.reports.All_Contract_Versions.length,1,'unknown child is retained; never cleanup-delete');noExtraAttachmentProgress(h);
}
{
 const h=await ready({realDOM:true}),f=files(h),gate=deferred(),native=f.nativeCreate;h.api.invokeCustomApi=config=>config.api_name===h.c.CFG.customApis.createAttachment?gate.promise.then(()=>native(config)):native(config);
 const pending=h.c.addVersionFiles(ID,[{name:'actor-bound.pdf',size:20}]);await drain();h.c.LMRuntime.apply({envUrlFragment:'',loginUser:'other-actor@example.test'});gate.resolve();const result=await pending;assert.ok(result.error);assert.equal(f.calls.filter(row=>row.method==='uploadFile').length,0);const retained=Object.values(h.c.S.attachmentReviews)[0];assert.equal(retained.id,NEW,'genuine returned child ID is kept only for read-only review in the original actor scope');assert.equal(await h.c.recheckContractAttachment(retained.key,'create'),false);
}
console.log('PASS actual attachment batch controller: captured files/parent, explicit not-sent later stages, dispatched deadline retains native slot, duplicate/cancel guards, zero FILE after late/changed-actor create and known-child quarantine.');

{
 const h=await ready({realDOM:true}),f=files(h),nativeRead=h.api.getRecords,nativeUpload=f.nativeUpload;let uploaded=false,denyVerification=true;
 h.c.showAttachmentsModal(ID);
 const overlays=h.node('overlays'),modal=overlays.querySelector('.modal'),status=h.c.document.getElementById('attStatus'),mounts=overlays.htmlWrites;
 h.c.ZOHO.CREATOR.FILE.uploadFile=async config=>{uploaded=true;return nativeUpload(config);};
 h.api.getRecords=config=>config.report_name===h.c.CFG.reports.versions&&uploaded&&denyVerification?Promise.reject({code:2898,message:'Attachment report temporarily unavailable'}):nativeRead(config);
 const result=await h.c.addVersionFiles(ID,[{name:'readback-review.pdf',size:25}]);assert.ok(result.error);
 assert.equal(h.c.contractHasReviews(),true);assert.equal(overlays.querySelector('.modal'),modal);assert.equal(overlays.htmlWrites,mounts);assert.equal(h.c.document.getElementById('attStatus'),status);
 noExtraAttachmentProgress(h);assert.equal(status.querySelector('.spinner'),null);assert.match(status.textContent,/review|check|verify/i,'an unverified file stays visibly unresolved in the prior attachment modal');
 const recheck=status.querySelector('button');assert.ok(recheck,'the prior attachment modal exposes read-only reconciliation');assert.match(recheck.textContent,/Check status/i);assert.equal(recheck.disabled,false);
 assert.equal(await h.c.addVersionFiles(ID,[{name:'never-repeat.pdf',size:25}]),false);
 denyVerification=false;
 const gate=deferred();h.api.getRecords=config=>config.report_name===h.c.CFG.reports.versions?gate.promise.then(()=>nativeRead(config)):nativeRead(config);
 // Execute the exact inline handler rendered by the real UI, as a browser click would.
 const click=()=>vm.runInContext(recheck.getAttribute('onclick').replace(/^\s*return\s+/,''),h.c);
 const checking=click();await drain();assert.ok(status.querySelector('.spinner'));assert.equal(h.c.closeOverlays(),false,'attachment read-only reconciliation cannot close while verification is pending');assert.equal(await click(),false,'repeated Check status cannot start a second verification');
 gate.resolve();assert.equal(await checking,true);await drain();assert.equal(h.c.contractHasReviews(),false);assert.equal(overlays.querySelector('.modal'),modal);assert.equal(overlays.htmlWrites,mounts);assert.equal(status.querySelector('.spinner'),null);assert.match(modal.textContent,/readback-review\.pdf/);
 assert.equal(f.calls.filter(call=>call.method==='createAttachment').length,1);assert.equal(f.calls.filter(call=>call.method==='uploadFile').length,1);assert.equal(f.calls.filter(call=>call.method==='deleteAttachment').length,0,'inline recovery never replays or cleans up an uncertain file');noExtraAttachmentProgress(h);
}

{
 const h=await ready({realDOM:true}),f=files(h),other=(BigInt(ID)+600n).toString();h.c.S.contracts.push({...h.c.findContract(ID),ID:other,Contract_Name:'Another contract'});
 h.c.showAttachmentsModal(ID);h.c.ZOHO.CREATOR.FILE.uploadFile=async()=>({code:3000});
 const result=await h.c.addVersionFiles(ID,[{name:'retained-review.pdf',size:25}]);assert.ok(result.error);const run=h.c.S.contractWorkflow;
 assert.notEqual(h.c.closeOverlays(),false,'a settled unresolved result may be dismissed without clearing its review ledger');assert.equal(h.c.document.getElementById('attStatus'),null);assert.equal(h.c.S.contractWorkflow,run);
 h.c.showAttachmentsModal(ID);const status=h.c.document.getElementById('attStatus');assert.ok(status,'the same contract can reopen its unresolved attachment result');assert.match(status.textContent,/review|check|verify/i);assert.ok(status.querySelector('button'));
 const modal=h.node('overlays').querySelector('.modal'),mounts=h.node('overlays').htmlWrites;h.c.showAttachmentsModal(other);assert.equal(h.node('overlays').querySelector('.modal'),modal);assert.equal(h.node('overlays').htmlWrites,mounts,'review reopening cannot switch to another Contract');
 assert.equal(h.c.S.contractWorkflow,run);assert.equal(await h.c.addVersionFiles(ID,[{name:'cannot-repeat.pdf',size:25}]),false);assert.equal(f.calls.filter(call=>call.method==='createAttachment').length,1);assert.equal(f.calls.filter(call=>call.method==='deleteAttachment').length,0);noExtraAttachmentProgress(h);
}

console.log('PASS attachment upload feedback in the existing modal: mounted shell/status/input, pending spinner and polite status, hidden extra progress dialog, duplicate/close guards, inline unresolved result and read-only Check status without write replay.');

for(const env of ['', 'development', 'stage'])for(const fileMetadata of ['object','url']){
 const h=await ready({realDOM:true,initialize:()=>({envUrlFragment:env?'/environment/'+env:'',loginUser:'actual-actor@example.test'})}),f=files(h,{fileMetadata});
 h.c.document.referrer=h.c.CFG.creatorHost+'/'+h.c.CFG.creatorOwner+'/'+h.c.CFG.creatorApp+(env?'/environment/'+env:'')+'/#Page:Contracts';
 h.c.location.href='https://example.test/'+(env==='development'?'dev':env||'prod')+'/contract-management/';
 h.c.showAttachmentsModal(ID);
 const filename='metadata-'+fileMetadata+'.pdf',result=await h.c.addVersionFiles(ID,[{name:filename,size:25}]);assert.equal(result.error,null);
 const row=h.c.S.versions[0],before=JSON.stringify(row),path='native_'+filename;
 assert.match(h.node('overlays').textContent,new RegExp(filename.replaceAll('.','\\.')),'both native object and scalar URL render a readable verified filename');assert.doesNotMatch(h.node('overlays').textContent,/\[object Object\]/);
 assert.equal(typeof row.File_field1,fileMetadata==='object'?'object':'string','the verified native file field retains its exact representation');
 assert.equal(h.c.versionFilePath(row),path);
 const url=new URL(h.c.versionPreviewUrl(row));
 assert.equal(url.origin,new URL(h.c.CFG.creatorHost).origin);assert.deepEqual(url.pathname.split('/').filter(Boolean).map(decodeURIComponent),[h.c.CFG.creatorOwner,h.c.CFG.creatorApp+(env?'-'+env:''),'report',h.c.CFG.reports.versions,row.ID,h.c.CFG.fileField,'download-file']);assert.equal(url.searchParams.get('filepath'),'/'+path);assert.equal(url.searchParams.get('isPreview'),'true','native preview stays scoped to its actual production/development/stage report');
 h.c.previewVersion(row.ID);await drain();const frame=h.c.document.getElementById('cmPdfFrame');assert.ok(frame,'actual PDF preview recognizes both verified native representations');assert.match(frame.getAttribute('title'),new RegExp(filename.replaceAll('.','\\.')));assert.equal(frame.getAttribute('src'),'pdf-preview.html');
 const preview=f.calls.find(call=>call.method==='attachmentPreview');assert.ok(preview);assert.equal(preview.config.api_name,h.c.CFG.customApis.attachmentPreview+(env==='development'?'_DEV':env==='stage'?'_STAGE':''));assert.equal(preview.config.payload.contractId,ID);assert.equal(preview.config.payload.attachmentId,row.ID);assert.equal(JSON.stringify(row),before,'display/preview never rewrite native file metadata');assert.equal(f.calls.filter(call=>call.method==='uploadFile').length,1);assert.equal(f.calls.filter(call=>call.method==='deleteAttachment').length,0);
}
console.log('PASS verified object/scalar attachment metadata: readable actual modal and PDF preview, exact preserved native field, native preview URL path/record and production/development/stage scope.');

{
 const h=await ready({realDOM:true});
 for(const [metadata,expected] of [
  [{filename:'display-only.pdf'},''],
  [{filepath:'native.pdf',url:'/download?filepath=native.pdf'},'native.pdf'],
  [[{filename:'named.pdf',file_path:'/folder/native.pdf'}],'folder/native.pdf'],
  [{value:'/download?filepath=%2Ffolder%2Fnative.pdf'},'folder/native.pdf'],
  [{filepath:'native.pdf',file_path:'other.pdf'},''],
  [[{filepath:'native.pdf'},{filepath:'other.pdf'}],''],
  [{filepath:{value:'native.pdf'}},''],
  [{url:'/download?filepath=%ZZ'},''],
  [{unknown:'native.pdf'},''],
 ]){
  const row={ID:NEW,Contract1:{ID},File_field1:metadata},before=JSON.stringify(row);assert.equal(h.c.versionFilePath(row),expected,'only one unambiguous recognized native filepath may construct a report preview URL');
  if(!expected)assert.equal(h.c.versionPreviewUrl(row),'','missing/ambiguous native metadata cannot invent a preview route');
  assert.equal(JSON.stringify(row),before);
 }
}
