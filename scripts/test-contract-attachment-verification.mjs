import assert from 'node:assert/strict';
import {ready,ID,NEW} from './test-contract-sdk-v2-foundation.mjs';

const PATH='1690000000000_fixture.pdf',OTHER=(BigInt(NEW)+200n).toString();
function install(h,{email=true,uploadEnvelope,afterUpload}={}){
 const native=h.api.invokeCustomApi,calls={create:0,upload:0};
 h.api.invokeCustomApi=async config=>{
  if(config.api_name!==h.c.CFG.customApis.createAttachment)return native(config);
  calls.create++;
  const row={ID:NEW,Contract1:{ID:config.payload.contractId},File_field1:''};
  if(email!==undefined)row.Email_Attachment=email;
  h.reports.All_Contract_Versions.push(row);
  return {code:3000,details:{output:JSON.stringify({ok:true,attachmentId:NEW})}};
 };
 h.c.ZOHO.CREATOR.FILE={uploadFile:async()=>{
  calls.upload++;
  const row=h.reports.All_Contract_Versions.find(row=>row.ID===NEW);
  row.File_field1='/download?filepath='+encodeURIComponent(PATH);
  if(afterUpload)afterUpload(row);
  return uploadEnvelope||{code:3000,data:{filename:'fixture.pdf',filepath:PATH}};
 }};
 return calls;
}

for(const envelope of [
 {code:3000,data:{filename:'fixture.pdf',filepath:PATH,message:'success'}},
 {code:3000,filename:'fixture.pdf',filepath:PATH,message:'File uploaded successfully !'}
]){
 const h=await ready(),calls=install(h,{uploadEnvelope:envelope}),id=await h.c.createContractAttachmentRecord(ID);
 await h.c.sdkUploadVersionFile(id,{name:'fixture.pdf',size:20});
 assert.equal(calls.create,1);assert.equal(calls.upload,1);assert.equal(h.c.contractHasReviews(),false);
 assert.equal(h.calls.filter(call=>['add','update','delete'].includes(call.method)).length,0,'documented envelope support introduces no CRUD fallback');
}

for(const envelope of [
 {code:3000,filename:'fixture.pdf',filepath:PATH,data:{filename:'fixture.pdf',filepath:PATH}},
 {code:3000,filename:'fixture.pdf',filepath:PATH,data:{}},
 {code:3000,filename:'fixture.pdf',filepath:PATH,status:'failure'},
 {code:3000,data:{filename:'fixture.pdf',filepath:PATH,status:'failure'}},
 {code:3000,filename:'fixture.pdf',filepath:PATH,result:[{code:2898}]},
 {code:3000,data:{filename:'fixture.pdf',filepath:PATH},details:{output:{code:2898}}},
 {code:3000,filename:'fixture.pdf',filepath:PATH,payload:{code:2898}},
 {code:3000,filename:'fixture.pdf'},
 {code:3000,data:{filepath:PATH}},
 {code:2898,filename:'fixture.pdf',filepath:PATH},
 {code:3000,filename:'',filepath:PATH}
]){
 const h=await ready(),calls=install(h,{uploadEnvelope:envelope,afterUpload:row=>{row.File_field1='';}}),id=await h.c.createContractAttachmentRecord(ID);
 await assert.rejects(h.c.sdkUploadVersionFile(id,{name:'fixture.pdf',size:20}),error=>error.noReplay===true);
 await assert.rejects(h.c.sdkUploadVersionFile(id,{name:'fixture.pdf',size:20}));
 assert.equal(calls.upload,1,'ambiguous or failed upload replies never replay');
 assert.equal(h.c.contractHasReviews(),true);assert.equal(h.reports.All_Contract_Versions.length,1,'unknown files retain their child');
}

for(const change of [row=>{row.Contract1={ID:OTHER};},row=>{row.File_field1='/download?filepath=another.pdf';}]){
 const h=await ready(),calls=install(h,{uploadEnvelope:{code:3000,filename:'fixture.pdf',filepath:PATH},afterUpload:change}),id=await h.c.createContractAttachmentRecord(ID);
 await assert.rejects(h.c.sdkUploadVersionFile(id,{name:'fixture.pdf',size:20}),/verification/);
 const key=h.c.contractAttachmentKey('upload',ID,id);
 assert.equal(await h.c.recheckContractAttachment(key,'upload'),false,'root acknowledgement still requires exact persisted parent and path');
 Object.assign(h.reports.All_Contract_Versions[0],{Contract1:{ID},File_field1:{filepath:PATH}});
 assert.equal(await h.c.recheckContractAttachment(key,'upload'),true);assert.equal(calls.upload,1,'recheck is read-only');
}

for(const receipt of [{code:3000},{code:3000,result:{message:'File saved'}},{code:3000,filename:'fixture.pdf',filepath:PATH,data:{filename:'fixture.pdf',filepath:PATH}}]){
 for(const wrongBytes of [false,true]){
  const h=await ready(),calls=install(h,{uploadEnvelope:receipt}),id=await h.c.createContractAttachmentRecord(ID),bytes=Uint8Array.from([37,80,68,70,45,128,255]);
  h.c.ZOHO.CREATOR.FILE.readFile=async()=>wrongBytes?Uint8Array.from([37,80,68,70,45,127,255]):bytes;
  const file={name:'fixture.pdf',size:bytes.length,arrayBuffer:async()=>bytes.buffer};
  if(wrongBytes){await h.c.sdkUploadVersionFile(id,file);assert.equal(h.c.contractHasReviews(),false,'saved metadata verifies uploads without a separate preview/readFile gate');}
  else{await h.c.sdkUploadVersionFile(id,file);assert.equal(h.c.contractHasReviews(),false,'exact saved filename/parent/path resolve an unrecognized reply automatically');}
  assert.equal(calls.upload,1,'verification never repeats the FILE write');assert.equal(calls.create,1);
 }
}

for(const email of [undefined,false,'false']){
 const h=await ready(),calls=install(h,{email}),key=h.c.contractAttachmentKey('create',ID);
 if(email===undefined){
  const native=h.api.invokeCustomApi;
  h.api.invokeCustomApi=async config=>{const response=await native(config);if(config.api_name===h.c.CFG.customApis.createAttachment)delete h.reports.All_Contract_Versions[0].Email_Attachment;return response;};
 }
 assert.equal(await h.c.createContractAttachmentRecord(ID),NEW,'an off or omitted Email switch does not prevent attachment creation');
 assert.equal(h.c.contractHasReviews(),false);
 assert.equal(h.c.S.contractAttachmentParents[NEW].cid,ID);assert.equal(h.c.S.contractAttachmentParents[NEW].scope,h.c.contractMutationScope());
 await h.c.sdkUploadVersionFile(NEW,{name:'fixture.pdf',size:20});
 assert.equal(calls.create,1);assert.equal(calls.upload,1,'FILE upload proceeds after exact child and Contract parent verification');
 assert.equal(h.reports.All_Contract_Versions[0].Email_Attachment,email===undefined?undefined:email,'upload preserves the persisted email setting');
}

{
 const h=await ready(),calls=install(h),native=h.api.getRecords;
 h.api.getRecords=config=>config.report_name===h.c.CFG.reports.versions?Promise.reject({code:2898,message:'Permission denied ?tokenId=private-token&next=1'}):native(config);
 await assert.rejects(h.c.createContractAttachmentRecord(ID),error=>error.code==='2898'&&error.attachmentPhase==='verification'&&/Permission denied/.test(error.message)&&!error.message.includes('private-token'));
 assert.equal(calls.create,1);assert.equal(calls.upload,0);assert.equal(h.c.contractHasReviews(),true);
}

{
 const h=await ready(),native=h.api.invokeCustomApi;let calls=0;
 h.api.invokeCustomApi=async config=>{
  if(config.api_name!==h.c.CFG.customApis.createAttachment)return native(config);
  calls++;
  return {code:3000,details:{output:JSON.stringify({ok:false,message:'Attachment record creation failed: specific native validation fault ?tokenId=private-token&next=1'})}};
 };
 await assert.rejects(h.c.createContractAttachmentRecord(ID),error=>error.noReplay===true&&error.attachmentPhase==='native'&&/specific native validation fault/.test(error.message)&&!error.message.includes('private-token'));
 await assert.rejects(h.c.createContractAttachmentRecord(ID));
 assert.equal(calls,1,'decoded native failure details preserve cause without a second create');
 assert.equal(h.c.contractHasReviews(),true);assert.equal(h.reports.All_Contract_Versions.length,0);
 assert.equal(h.calls.filter(call=>['add','update','delete'].includes(call.method)).length,0,'a native create failure never falls back to CRUD or cleanup');
}

console.log('PASS Contract attachment verification: documented root/data upload replies, strict ambiguous/failure rejection, exact parent/path readback, Email-off creation/upload, automatic saved-record recovery, captured parent restoration, decoded native failure and safe cause/phase/code diagnostics, no replay or uncertain cleanup.');
