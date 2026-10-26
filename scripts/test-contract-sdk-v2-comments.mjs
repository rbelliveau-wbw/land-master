import assert from 'node:assert/strict';
import {ready,ID,deferred,drain} from './test-contract-sdk-v2-foundation.mjs';
const h=await ready();
const raw={code:3001,error:[{task:'alert',alert_message:['Link the comment to a Project, Budget, Pro Forma, or Contract.']},{task:'cancel_submit',message:'Failed to add data.'}]};
for(const error of [raw,JSON.stringify(raw),{response:raw},{message:JSON.stringify(raw)},{cause:{responseText:JSON.stringify(raw)}}])assert.equal(h.c.contractCommentError(error),'Link the comment to a Project, Budget, Pro Forma, or Contract.');
assert.equal(h.c.contractCommentError(new Error('Fresh read failed.')),'Fresh read failed.');
const nativeAdd=h.api.addRecords;
h.api.addRecords=async config=>{const result=await nativeAdd(config),id=result.result[0].data.ID;h.reports.Comment_Log_Report.find(row=>row.ID===id).Contract1={ID,zc_display_value:'Fixture contract'};return result;};
const ack=await h.c.createRecord('Comment_Log',{Contract1:ID,Comment:'Native Contract comment',Deleted:false});
assert.equal(h.reports.Comment_Log_Report[0].ID,ack.data.ID);
assert.equal(Object.keys(h.c.S.sdkMutationReviews).length,0);
console.log('PASS Legal comment exact Contract1 lookup and readable native validation errors.');

for(const environment of ['development','stage','production'])for(const state of ['not-started','started']){
 const preview=await ready({pageParams:{workMode:'construction'},accessFlags:{constructionSubmit:true,constructionEditAll:true},initialize:()=>({envUrlFragment:environment==='production'?'':'/environment/'+environment,loginUser:'demouser_4@zohocreator.com'})});
 preview.reports.All_Contracts1[0].Work_Module='Construction';preview.c.S.contracts[0].Work_Module='Construction';
 const original=preview.api.invokeCustomApi;let posts=0;
 preview.api.invokeCustomApi=async config=>{
  if(config.api_name.replace(/_DEV|_STAGE/,'')!=='Post_Record_Comment')return original(config);
  posts++;return {code:3000,details:{output:JSON.stringify({contract:'record-comments-v1',ok:false,writeState:state,message:'Construction access is required.'})}};
 };
 const save=()=>preview.c.createRecord('Comment_Log',{Contract1:ID,Comment:'View-as Construction comment'});
 if(environment==='development'&&state==='not-started'){
  const result=await save();assert.equal(result.notificationState,'unavailable','native Development fallback reports that the Custom API owner email did not run');
  assert.equal(preview.reports.Comment_Log_Report.length,1);assert.equal(preview.calls.filter(call=>call.method==='add').length,1);
  assert.equal(preview.c.contractHasReviews(),false);
 }else{
  await assert.rejects(save(),/Construction access is required/);
  assert.equal(preview.reports.Comment_Log_Report.length,0);assert.equal(preview.calls.filter(call=>call.method==='add').length,0,'Production/Stage or a possible prior insert cannot use the native preview fallback');
 }
 assert.equal(posts,1,'the owner-executed API is called once');
}
console.log('PASS Development Construction View-as comments: known prewrite owner rejection uses one native form write; Production/Stage and possible prior writes never fall back; owner email unavailability stays visible.');

{
 const h=await ready({pageParams:{workMode:'construction'},accessFlags:{constructionSubmit:true},initialize:()=>({envUrlFragment:'/environment/development',loginUser:'preview-actor@example.test'})}),gate=deferred();
 h.c.S.contracts[0].Work_Module='Construction';h.reports.All_Contracts1[0].Work_Module='Construction';
 h.api.invokeCustomApi=()=>gate.promise;
 const pending=h.c.createRecord('Comment_Log',{Contract1:ID,Comment:'Captured preview actor'}),rejected=assert.rejects(pending);
 await drain();h.c.LMRuntime.apply({envUrlFragment:'/environment/development',loginUser:'another-actor@example.test'});
 gate.resolve({code:3000,details:{output:JSON.stringify({contract:'record-comments-v1',ok:false,writeState:'not-started',message:'Construction access is required.'})}});
 await rejected;assert.equal(h.calls.filter(call=>call.method==='add').length,0,'a changed actor cannot use the preview fallback');
}
