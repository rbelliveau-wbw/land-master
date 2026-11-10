import assert from 'node:assert/strict';
import vm from 'node:vm';
import {ready,drain,deferred,ID,NEW} from './test-contract-sdk-v2-foundation.mjs';
function noExtraAttachmentProgress(h){const extra=h.c.document.getElementById('contractSaveOverlay');assert.ok(!extra||extra.hidden,'attachment upload never opens the extra Contract progress dialog');assert.ok(!h.c.ContractSetupUI.progress()?.open);}
function files(h,{fileMetadata='object'}={}){
 const calls=[],base=h.api.invokeCustomApi;let seed=BigInt(NEW),fileResponse;
 const response=body=>({code:3000,details:{output:JSON.stringify(body)}});
 h.api.invokeCustomApi=async config=>{const key=Object.entries(h.c.CFG.customApis).find(([,name])=>name===String(config.api_name).replace(/_(DEV|STAGE)$/i,''))?.[0];if(!['createAttachment','deleteAttachment','attachmentPreview'].includes(key))return base(config);calls.push({method:key,config:structuredClone(config)});
  if(key==='createAttachment'){const id=(seed++).toString();h.reports.All_Attachments.push({ID:id,Contract1:{ID:config.payload.contractId},Email_Attachment:true,File_field1:{},Date_field1:'01-Oct-2026',Added_User:{user_name:'actual-actor'}});return response({ok:true,attachmentId:id});}
  if(key==='deleteAttachment'){h.reports.All_Attachments=h.reports.All_Attachments.filter(row=>row.ID!==config.payload.attachmentId);return response({ok:true,attachmentId:config.payload.attachmentId});}
  return response({ok:true,base64:btoa('%PDF-1.7\nfixture'),filename:'fixture.pdf'});
 };
 h.c.ZOHO.CREATOR.FILE={readFile:async config=>{calls.push({method:'readFile',config:structuredClone(config)});return fileResponse??new Uint8Array([37,80,68,70,45,128,255]);},uploadFile:async config=>{calls.push({method:'uploadFile',config:{...config,file:config.file}});const row=h.reports.All_Attachments.find(row=>row.ID===config.id);const path='native_'+config.file.name;row.File_field1=fileMetadata==='url'?'/download?filepath='+encodeURIComponent(path):{filepath:path};return {code:3000,data:{filename:config.file.name,filepath:path}};}};
 return {calls,setReadResponse:value=>{fileResponse=value;},nativeCreate:h.api.invokeCustomApi,nativeUpload:h.c.ZOHO.CREATOR.FILE.uploadFile,nativeDelete:h.api.invokeCustomApi};
}
{
 const h=await ready(),f=files(h);
 assert.equal(h.c.CFG.forms.version,'Attachment');assert.equal(h.c.CFG.reports.versions,'All_Attachments');
 assert.deepEqual(JSON.parse(JSON.stringify(h.c.contractFieldKinds.All_Attachments)),{Contract1:'lookup',Budget:'lookup',Pro_Forma:'lookup',Date_field1:'date',File_field1:'fileupload',Email_Attachment:'bool'});
 let nativeForm;h.c.openParent=url=>{nativeForm=url;};h.c.S.selId=ID;h.c.addFile();assert.equal(nativeForm,'#Form:Attachment?Contract1='+ID,'native attachment form navigation uses the renamed form and existing parent lookup');
 assert.equal(h.c.contractFieldKinds.All_Contracts1.Contract_Versions,'lookup','the existing Contract attachment subform field retains its link name');
 const id=await h.c.createContractAttachmentRecord(ID);assert.equal(id,NEW);assert.equal(f.calls.filter(call=>call.method==='createAttachment').length,1);assert.equal(h.calls.filter(call=>call.method==='add').length,0,'custom create never replays a direct SDK insert');
 const file={name:'fixture.pdf',size:25};await h.c.sdkUploadVersionFile(id,file);const upload=f.calls.find(call=>call.method==='uploadFile');assert.equal(upload.config.report_name,h.c.CFG.reports.versions);assert.equal(upload.config.id,id);assert.equal(upload.config.field_name,h.c.CFG.fileField);assert.equal(upload.config.file,file);assert.equal(h.c.contractHasReviews(),false);
 const bytes=await h.c.sdkReadVersionFile(id),blob=await h.c.fileResponseToBlob(bytes,'application/pdf');assert.deepEqual(Array.from(new Uint8Array(await blob.arrayBuffer())),[37,80,68,70,45,128,255],'native byte content retains high bytes');
 h.c.S.versions=structuredClone(h.reports.All_Attachments);assert.equal(await h.c.doDeleteVersion(id,ID),true);assert.equal(f.calls.filter(call=>call.method==='deleteAttachment').length,1);assert.equal(h.calls.filter(call=>call.method==='delete').length,0,'custom delete never replays direct SDK delete');assert.equal(h.reports.All_Attachments.length,0);assert.equal(h.c.S.versions.length,0);
}
for(const envelope of [{code:3000,data:{filename:'fixture.pdf',filepath:'native_fixture.pdf',status:'failure'}},{code:3000,data:{filename:'fixture.pdf',filepath:'native_fixture.pdf'},result:[{code:2899}]},{code:2898,message:'Denied file'}]){
 const h=await ready(),f=files(h),id=await h.c.createContractAttachmentRecord(ID);let writes=0;h.c.ZOHO.CREATOR.FILE.uploadFile=async()=>{writes++;return envelope;};
 await assert.rejects(h.c.sdkUploadVersionFile(id,{name:'fixture.pdf',size:20}));await assert.rejects(h.c.sdkUploadVersionFile(id,{name:'fixture.pdf',size:20}));assert.equal(writes,1);assert.equal(h.c.contractHasReviews(),true);assert.equal(h.reports.All_Attachments.length,1,'unknown file outcome never deletes its child');assert.equal(f.calls.filter(call=>call.method==='deleteAttachment').length,0);
}
{
 const h=await ready(),f=files(h),id=await h.c.createContractAttachmentRecord(ID);let writes=0;h.c.ZOHO.CREATOR.FILE.uploadFile=async()=>{writes++;h.reports.All_Attachments[0].File_field1={filepath:'native_fixture.pdf'};return {code:3000,data:{filename:'fixture.pdf',filepath:'native_fixture.pdf'}};};
 // A failed display refresh cannot invalidate the completed native FILE request.
 const native=h.api.getRecords;h.api.getRecords=config=>config.report_name===h.c.CFG.reports.versions?Promise.reject({code:2898}):native(config);
 await h.c.sdkUploadVersionFile(id,{name:'fixture.pdf',size:20});assert.equal(writes,1);assert.equal(h.c.contractHasReviews(),false);

}
{
 const h=await ready(),f=files(h),gate=deferred();let creates=0;h.api.invokeCustomApi=config=>config.api_name===h.c.CFG.customApis.createAttachment?(creates++,gate.promise):f.nativeCreate(config);
 const first=h.c.createContractAttachmentRecord(ID);await drain();await assert.rejects(h.c.createContractAttachmentRecord(ID));assert.equal(creates,1);gate.reject(new Error('Applied but response lost'));await assert.rejects(first);await assert.rejects(h.c.createContractAttachmentRecord(ID));assert.equal(creates,1);assert.equal(h.calls.filter(call=>call.method==='add').length,0);assert.equal(await h.c.recheckContractAttachment(h.c.contractAttachmentKey('create',ID),'create'),false,'no-ID create review never guesses a parent child from report rows');
}
{
 const h=await ready(),f=files(h),id=await h.c.createContractAttachmentRecord(ID);h.c.S.versions=structuredClone(h.reports.All_Attachments);let deletes=0;h.api.invokeCustomApi=config=>config.api_name===h.c.CFG.customApis.deleteAttachment?(deletes++,Promise.reject(new Error('Delete applied, response lost'))):f.nativeDelete(config);
 assert.equal(await h.c.doDeleteVersion(id,ID),false);assert.equal(await h.c.doDeleteVersion(id,ID),false);assert.equal(deletes,1);assert.equal(h.calls.filter(call=>call.method==='delete').length,0);assert.equal(h.c.S.versions.length,1,'unconfirmed delete does not remove the retained UI row');
 h.reports.All_Attachments=[];assert.equal(await h.c.recheckContractAttachment(h.c.contractAttachmentKey('delete',ID,id),'delete'),true);assert.equal(deletes,1);
}
{
 const h=await ready(),f=files(h),id=await h.c.createContractAttachmentRecord(ID);h.c.LMRuntime.apply({envUrlFragment:'',loginUser:'other-actor@example.test'});await assert.rejects(h.c.sdkUploadVersionFile(id,{name:'fixture.pdf'}));await assert.rejects(h.c.sdkReadVersionFile(id));await assert.rejects(h.c.updateRecord(ID,{Contract_Name:'No stale-snapshot write'},h.c.CFG.reports.contracts));assert.equal(f.calls.filter(call=>['uploadFile','readFile'].includes(call.method)).length,0);assert.equal(h.calls.filter(call=>call.method==='update').length,0);assert.equal(h.c.canEdit(),false);
}
{
 const h=await ready({realDOM:true}),f=files(h),id=await h.c.createContractAttachmentRecord(ID),content='%PDF-1.7\n'+String.fromCharCode(128,255)+'\nfixture';
 f.setReadResponse(content);
 const response=await h.c.sdkReadVersionFile(id),blob=await h.c.fileResponseToBlob(response,'application/pdf');
 assert.equal(response,content,'the documented native readFile content string is not a record-read envelope');
 assert.deepEqual(Array.from(new Uint8Array(await blob.arrayBuffer())),Array.from(content,x=>x.charCodeAt(0)),'binary string high bytes are retained exactly');
 h.reports.All_Attachments[0].File_field1={filepath:'native_fixture.pdf'};h.c.S.versions=structuredClone(h.reports.All_Attachments);
 const custom=f.nativeCreate;
 h.api.invokeCustomApi=config=>config.api_name===h.c.CFG.customApis.attachmentPreview?Promise.resolve({code:3000,details:{output:JSON.stringify({ok:false,message:'You do not have access to this attachment.'})}}):custom(config);
 h.c.previewVersion(id);await drain();
 assert.ok(h.c.document.getElementById('cmPdfFrame'),'native string fallback opens the actual PDF viewer when the preview API denies access');
}
for(const envelope of [{code:3000,data:{content:'%PDF-1.7',status:'failure'}},{code:3000,data:{content:'%PDF-1.7'},result:[{code:2898}]},{code:2899,data:{content:'%PDF-1.7'}},JSON.stringify({code:2898,message:'Denied read'}),JSON.stringify({code:3000,data:{error:'Denied file'}}),'']){
 const h=await ready(),f=files(h),id=await h.c.createContractAttachmentRecord(ID);f.setReadResponse(envelope);await assert.rejects(h.c.sdkReadVersionFile(id),'failed native FILE envelopes cannot be converted to plausible file bytes');
}
{
 const h=await ready(),bytes=new Uint8Array([37,80,68,70,45,128,255]);
 const foreignBlob={get [Symbol.toStringTag](){return 'Blob';},type:'application/pdf',arrayBuffer:async()=>bytes.buffer};
 const blob=await h.c.fileResponseToBlob(foreignBlob,'application/pdf');
 assert.deepEqual(Array.from(new Uint8Array(await blob.arrayBuffer())),Array.from(bytes),'cross-frame native Blob bytes retain their binary representation');
}
async function devExportFixture(env='development'){
 const h=await ready({realDOM:true,pageParams:{workMode:'construction'},accessFlags:{constructionSubmit:true,constructionEditAll:true},initialize:()=>({envUrlFragment:env?'/environment/'+env:'',loginUser:'preview-actor@example.test'})}),f=files(h);
 h.c.S.contracts[0].Work_Module='Construction';h.reports.All_Contracts1[0].Work_Module='Construction';
 h.c.configurePageReports({constructionReportScope:'construction'});
 h.c.document.referrer='https://creatorapp.zoho.com/wbdevelopment/environment/'+env+'/land-master/#Page:Construction';
 const id=await h.c.createContractAttachmentRecord(ID),row=h.reports.All_Attachments.find(row=>row.ID===id);row.File_field1={filepath:'1794323647620880_saved.pdf'};h.c.S.versions=structuredClone(h.reports.All_Attachments);
 const native=f.nativeCreate;h.api.invokeCustomApi=config=>String(config.api_name).replace(/_(DEV|STAGE)$/,'')===h.c.CFG.customApis.attachmentPreview?Promise.resolve({code:3000,details:{output:JSON.stringify({ok:false,message:'You do not have access to this attachment.'})}}):native(config);
 f.setReadResponse({unsupportedNativeContent:true});
 const requests=[];h.c.fetch=async(url,options)=>{requests.push({url,options});return {ok:true,blob:async()=>new h.c.Blob(['%PDF-1.7\nfixture'],{type:'application/pdf'})};};
 return {h,f,row,requests};
}
{
 const {h,f,row,requests}=await devExportFixture();
 const b64=await h.c.getVersionPdfBase64(row);assert.equal(atob(b64),'%PDF-1.7\nfixture');
 assert.equal(requests.length,1);const request=requests[0],url=new URL(request.url);
 assert.equal(url.origin,'https://creatorexport.zoho.com');assert.equal(url.pathname,'/wbdevelopment/land-master-development/report/Construction_Attachments/'+row.ID+'/File_field1/download-file');
 assert.equal(url.searchParams.get('filepath'),'/1794323647620880_saved.pdf');assert.equal(url.searchParams.get('mediaType'),'1');assert.equal(url.searchParams.has('digestValue'),false);assert.equal(request.options.credentials,'include');assert.equal(request.options.cache,'no-store');
 assert.equal(f.calls.filter(call=>['uploadFile','deleteAttachment'].includes(call.method)).length,0,'file reading cannot replay or delete an upload');
 h.c.fetch=async()=>({ok:true,blob:async()=>new h.c.Blob(['<!doctype html>Sign In'],{type:'text/html'})});
 await assert.rejects(h.c.getVersionPdfBase64(row),error=>/PDF bytes/.test(error.message),'authenticated HTML is never shown as a PDF');
}
for(const env of ['', 'stage']){
 const {h,row,requests}=await devExportFixture(env);await assert.rejects(h.c.getVersionPdfBase64(row));assert.equal(requests.length,0,'export fallback cannot change Production or Stage behavior');
}
{
 const {h,f,row,requests}=await devExportFixture();f.setReadResponse({code:2898,message:'Denied file'});
 await assert.rejects(h.c.getVersionPdfBase64(row));assert.equal(requests.length,0,'an actual native permission denial cannot use the content fallback');
}
{
 const {h,row,requests}=await devExportFixture();h.reports.All_Attachments[0].Contract1={ID:(BigInt(ID)+1n).toString()};
 await assert.rejects(h.c.getVersionPdfBase64(row));assert.equal(requests.length,0,'fresh native parent mismatch prevents any file fetch');
}
{
 const {h,row,requests}=await devExportFixture();h.c.fetch=async()=>{requests.push(true);h.c.LMRuntime.apply({envUrlFragment:'/environment/development',loginUser:'other-actor@example.test'});return {ok:true,blob:async()=>new h.c.Blob(['%PDF-1.7'])};};
 await assert.rejects(h.c.getVersionPdfBase64(row),/session changed/,'a changed actor cannot receive stale attachment bytes');assert.equal(requests.length,1);
}
{
 const h=await ready({realDOM:true}),f=files(h),gate=deferred(),native=f.nativeUpload;
 h.c.showAttachmentsModal(ID);
 const overlays=h.node('overlays'),modal=overlays.querySelector('.modal'),drop=h.c.document.getElementById('attDrop'),status=h.c.document.getElementById('attStatus'),input=h.c.document.getElementById('attFile'),mounts=overlays.htmlWrites;
 assert.equal(input.getAttribute('aria-label'),'Choose Files');assert.equal(input.hidden,false);assert.equal(input.parentNode.tagName,'LABEL','the real native file input receives the user gesture instead of a scripted hidden-input click');
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
 const pending=h.c.addVersionFiles(ID,[{name:'captured-first.pdf',size:20},{name:'never-sent.pdf',size:20}]);await drain();h.tick(30000);const result=await pending;assert.ok(result.error);assert.equal(result.rows[0].state,'unknown');assert.equal(result.rows.filter(row=>row.state==='not-sent').length,3);assert.equal(h.c.closeOverlays(),false,'unsettled physical create holds the prior attachment modal despite bounded error');assert.equal(await h.c.addVersionFiles(ID,[{name:'second-click.pdf',size:20}]),false);assert.equal(await h.c.contractWorkflowRecheck(h.c.S.contractWorkflow),false);noExtraAttachmentProgress(h);assert.equal(overlays.querySelector('.modal'),modal);assert.equal(overlays.htmlWrites,mounts);gate.resolve();await drain();assert.equal(f.calls.filter(row=>row.method==='createAttachment').length,1);assert.equal(f.calls.filter(row=>row.method==='uploadFile').length,0,'late create response cannot continue FILE or another file');assert.equal(h.reports.All_Attachments.length,1,'unknown child is retained; never cleanup-delete');noExtraAttachmentProgress(h);
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
 const result=await h.c.addVersionFiles(ID,[{name:'readback-review.pdf',size:25}]);assert.equal(result.error,null);
 assert.equal(h.c.contractHasReviews(),false);assert.equal(overlays.querySelector('.modal'),modal);assert.equal(overlays.htmlWrites,mounts);assert.equal(h.c.document.getElementById('attStatus'),status);
 noExtraAttachmentProgress(h);assert.equal(status.querySelector('.spinner'),null);assert.match(modal.textContent,/readback-review\.pdf/);
 assert.equal(f.calls.filter(call=>call.method==='createAttachment').length,1);assert.equal(f.calls.filter(call=>call.method==='uploadFile').length,1);assert.equal(f.calls.filter(call=>call.method==='deleteAttachment').length,0);

}

{
 const h=await ready({realDOM:true}),f=files(h),other=(BigInt(ID)+600n).toString();h.c.S.contracts.push({...h.c.findContract(ID),ID:other,Contract_Name:'Another contract'});
 h.c.showAttachmentsModal(ID);h.c.ZOHO.CREATOR.FILE.uploadFile=async()=>{throw new Error('Upload acknowledgement lost');};
 const result=await h.c.addVersionFiles(ID,[{name:'retained-review.pdf',size:25}]);assert.ok(result.error);const run=h.c.S.contractWorkflowHistory[0];
 assert.notEqual(h.c.closeOverlays(),false,'a settled unresolved result may be dismissed without clearing its review ledger');assert.equal(h.c.document.getElementById('attStatus'),null);assert.equal(h.c.S.contractWorkflow,null);
 h.c.showAttachmentsModal(ID);const status=h.c.document.getElementById('attStatus');assert.ok(status,'the same contract can reopen its unresolved attachment result');assert.match(status.textContent,/review|check|verify/i);assert.ok(status.querySelector('button'));
 const modal=h.node('overlays').querySelector('.modal'),mounts=h.node('overlays').htmlWrites;h.c.showAttachmentsModal(other);assert.notEqual(h.node('overlays').querySelector('.modal'),modal,'terminal review permits navigation to another Contract');
 assert.equal(h.c.S.contractWorkflow,null);assert.equal(await h.c.addVersionFiles(ID,[{name:'cannot-repeat.pdf',size:25}]),false);assert.equal(f.calls.filter(call=>call.method==='createAttachment').length,1);assert.equal(f.calls.filter(call=>call.method==='deleteAttachment').length,0);noExtraAttachmentProgress(h);
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
