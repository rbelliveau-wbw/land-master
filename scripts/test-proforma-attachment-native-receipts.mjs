import assert from 'node:assert/strict';
import {ready,ID,OTHER,held,drain} from './fixtures/proforma-sdk-v2-harness.mjs';

// Runs the whole current widget/controller/progress scripts, not a copied parser.
const bytes=Uint8Array.from([0,255,32,65,10]);
const makeFile=name=>new File([bytes],name,{type:'application/octet-stream'});
const file=makeFile('receipt.bin'),path='native/'+file.name;
const receipt={filename:file.name,filepath:path};
const preview=config=>/^Get_Proforma_Attachment_Preview/.test(config.api_name)?{code:3000,result:JSON.stringify({success:true,base64:Buffer.from(bytes).toString('base64'),fileName:file.name})}:undefined;
const blank=()=>({ID:OTHER,Pro_Forma:{ID},File_field1:''});
for(const rootReceipt of [false,true])for(const persisted of ['object','scalar','url','singleton']){
 const h=await ready({invoke:preview,upload:(config,apply)=>{apply();const value=persisted==='object'?{...receipt}:persisted==='scalar'?path:persisted==='url'?'/api/download?filepath='+encodeURIComponent(path):[{...receipt}];h.storage.All_Contract_Versions[0].File_field1=value;return rootReceipt?{code:3000,...receipt}:{code:3000,data:{...receipt}};}});
 h.storage.All_Contract_Versions=[blank()];await h.widget.pfSdkUploadFile(OTHER,file,ID);
 assert.equal(h.widget.PFTransport.snapshot().ledger.at(-1).state,'verified',JSON.stringify({rootReceipt,persisted}));
 assert.equal(h.calls.filter(call=>call.method==='upload').length,1);
}
for(const raw of [
 {code:3000,...receipt,data:{...receipt}},
 {code:3000,filename:file.name,data:{...receipt}},
 {code:3000,data:[{...receipt}]},
 {code:3000,data:JSON.stringify(receipt)},
 {code:3000,data:{filename:'',filepath:path}},
 {code:3000,...receipt,result:[]},
 {code:3000,...receipt,details:{code:2898,error:'Denied'}},
 {code:3000,data:{...receipt},response:{code:3000,data:{ID:OTHER}}},
 {code:3000,...receipt,success:false},
 {code:3000,...receipt,payload:{code:2898,message:'Denied'}},
 {code:3000,data:{...receipt,body:{code:2898,message:'Denied'}}},
 {code:3000,...receipt,content:{success:false}},
 {code:3002,...receipt},
 {code:3000,...receipt,filepath:17},
]){
 const h=await ready({invoke:preview,upload:(config,apply)=>{apply();return raw;}});h.storage.All_Contract_Versions=[blank()];
 await h.widget.pfSdkUploadFile(OTHER,file,ID);
 assert.equal(h.calls.filter(call=>call.method==='upload').length,1,'read-only reconciliation never replays FILE');
 assert.equal(h.widget.PFTransport.snapshot().reviews.length,0,'fresh exact parent/path/name resolve an unrecognized reply automatically');
 assert.equal(h.widget.PFTransport.snapshot().ledger.at(-1).state,'verified');
}
for(const badField of [
 '/api/download?filepath=wrong',
 '/api/download?filepath='+encodeURIComponent(path)+'&filepath='+encodeURIComponent(path),
 '/api/download?filepath='+encodeURIComponent(path)+'&filename=wrong.bin',
 {filename:file.name,filepath:path,file_path:'wrong'},
 [{...receipt},{...receipt}],
 'https://example.test/download',
]){
 const h=await ready({invoke:preview,upload:(config,apply)=>{apply();h.storage.All_Contract_Versions[0].File_field1=badField;return {code:3000,...receipt};}});h.storage.All_Contract_Versions=[blank()];
 await assert.rejects(h.widget.pfSdkUploadFile(OTHER,file,ID),error=>error.noReplay);
 assert.equal(h.widget.PFTransport.snapshot().reviews.length,1);
}
for(const acknowledged of [false,true])for(const change of ['parent','name']){
 const h=await ready({upload:(config,apply)=>{apply();if(change==='parent')h.storage.All_Contract_Versions[0].Pro_Forma=OTHER;else h.storage.All_Contract_Versions[0].File_field1={filename:'wrong.bin',filepath:path};return acknowledged?{code:3000,...receipt}:{code:3000};}});h.storage.All_Contract_Versions=[blank()];
 await assert.rejects(h.widget.pfSdkUploadFile(OTHER,file,ID),error=>error.noReplay);
 assert.equal(h.widget.PFTransport.snapshot().reviews.length,1,'persisted '+change+' remains unverified');
}
{
 const gate=held(),h=await ready({upload:(config,apply)=>{apply();return gate.promise;}});h.storage.All_Contract_Versions=[blank()];const pending=h.widget.pfSdkUploadFile(OTHER,file,ID);await drain();h.c.LMRuntime.apply({envUrlFragment:'/environment/stage',loginUser:'another@example.test'});gate.resolve({code:3000,...receipt});await assert.rejects(pending,error=>error.noReplay);assert.equal(h.widget.PFTransport.snapshot().reviews.length,1,'changed actor cannot verify a saved attachment');
}

function creator(config,storage,next){const content=preview(config);if(content)return content;if(/^Create_Proforma_Attachment_Record/.test(config.api_name)){const id=String(next());storage.All_Contract_Versions.push({ID:id,Pro_Forma:ID,File_field1:''});return {code:3000,result:JSON.stringify({success:true,attachmentId:id})};}}
{
 const createGate=held(),uploadGate=held();let next=90071992548340000n;
 const h=await ready({invoke:(config,storage)=>{const raw=creator(config,storage,()=>next++);return /^Create_Proforma_Attachment_Record/.test(config.api_name)?createGate.promise.then(()=>raw):raw;},upload:(config,apply)=>{apply();return uploadGate.promise;}});
 h.widget.S.attachmentsByPf[ID]=[];const trigger=h.document.getElementById('listSearch');trigger.focus();assert.equal(h.widget.openPfAttachmentModal(ID,trigger),true);
 const modal=h.document.getElementById('proformaAttachmentModal'),panel=h.document.getElementById('proformaAttachmentModalPanel'),input=h.document.getElementById('proformaAttachmentModalInput');
 const pending=h.widget.uploadPfAttachments([file],h.widget.pfAttachmentActionContext(true));await drain();
 const spinner=h.document.getElementById('pfAttachmentModalSpinner'),status=h.document.getElementById('pfAttachmentModalStatus'),writes=panel.htmlWrites;
 assert.equal(spinner.hidden,false);assert.equal(status.getAttribute('aria-busy'),'true');assert.equal(modal.inert,false);assert.equal(h.document.getElementById('pfNativeProgress').hidden,true);
 assert.equal(h.document.getElementById('proformaAttachmentModalClose').disabled,true);const heldClose=await h.dispatch('click',h.document.getElementById('proformaAttachmentModalClose'),{type:'click'});assert.equal(heldClose.prevented,true,'capture gate blocks pending close');await h.document.getElementById('proformaAttachmentModalClose').fire('click');assert.equal(h.widget.S.attachmentModal.id,ID);
 assert.equal(h.widget.uploadPfAttachments([file],h.widget.pfAttachmentActionContext(true)),false);
 createGate.resolve();await drain();assert.equal(h.document.getElementById('pfAttachmentModalSpinner'),spinner);assert.equal(panel.htmlWrites,writes,'stage updates patch mounted status instead of replacing panel');assert.equal(h.document.getElementById('proformaAttachmentModalInput'),input);
 uploadGate.resolve({code:3000,filename:file.name,filepath:path});await pending;
 assert.equal(h.document.getElementById('proformaAttachmentModal'),modal);assert.equal(h.document.getElementById('proformaAttachmentModalInput'),input);assert.equal(modal.hidden,false);assert.equal(h.widget.PFTransport.workflow(),null);assert.equal(h.widget.S.attachmentUploadResults[0].state,'Added');assert.equal(h.document.getElementById('pfAttachmentModalSpinner').hidden,true);assert.equal(h.document.getElementById('pfNativeProgress').hidden,true);
 await h.document.getElementById('proformaAttachmentModalClose').fire('click');assert.equal(h.document.activeElement,trigger,'close returns original focus');
 const save=h.widget.PFTransport.begin('Save Pro Forma');assert.equal(h.document.getElementById('pfNativeProgress').hidden,false,'ordinary Save keeps its mounted spinner dialog');h.widget.PFTransport.end(save);assert.equal(h.document.getElementById('pfNativeProgress').hidden,true,'ordinary verified Save still auto-closes');
}
{
 let next=90071992548350000n,uploads=0,denyReadback=true;const files=[file,makeFile('second.bin'),makeFile('not-sent.bin')];
 const h=await ready({read:config=>{if(uploads===2&&denyReadback&&config.report_name==='All_Contract_Versions'&&/ID ==/.test(config.criteria||''))throw Error('Record read temporarily unavailable');},invoke:(config,storage)=>{if(/^Get_Proforma_Attachment_Preview/.test(config.api_name)&&uploads===2&&denyReadback)throw Error('Preview temporarily unavailable');return creator(config,storage,()=>next++);},upload:(config,apply)=>{apply();uploads++;const ack={filename:config.file.name,filepath:'native/'+config.file.name};return uploads===2?{code:3000,...ack,data:{...ack}}:{code:3000,...ack};}});
 h.widget.S.attachmentsByPf[ID]=[];assert.equal(h.widget.openPfAttachmentModal(ID),true);await h.widget.uploadPfAttachments(files,h.widget.pfAttachmentActionContext(true));await drain();
 assert.deepEqual(Array.from(h.widget.S.attachmentUploadResults,row=>row.state),['Added','Needs review','Not sent']);assert.equal(uploads,2);assert.equal(h.widget.PFTransport.snapshot().reviews.length,1);assert.equal(h.document.getElementById('pfAttachmentModalRecheck').hidden,false);assert.equal(h.document.getElementById('pfNativeProgress').hidden,true);
 const terminalClose=await h.dispatch('click',h.document.getElementById('proformaAttachmentModalClose'),{type:'click'});assert.notEqual(terminalClose.prevented,true,'capture gate allows terminal inline Close');await h.document.getElementById('proformaAttachmentModalClose').fire('click');
 const paperclip=h.document.createElement('button');paperclip.className='pf-row-attachments';paperclip.setAttribute('data-actid',ID);h.document.body.appendChild(paperclip);assert.notEqual((await h.dispatch('click',paperclip,{type:'click'})).prevented,true,'capture gate permits reopening only captured parent');paperclip.setAttribute('data-actid',OTHER);assert.notEqual((await h.dispatch('click',paperclip,{type:'click'})).prevented,true,'a settled review does not lock navigation to another parent');assert.equal(h.widget.openPfAttachmentModal(ID),true,'same parent review can be reopened without unlocking sends');
 denyReadback=false;
 const check=h.document.getElementById('pfAttachmentModalRecheck'),panel=h.document.getElementById('proformaAttachmentModalPanel');const checkEvent=await h.dispatch('click',check,{type:'click'});assert.notEqual(checkEvent.prevented,true,'capture gate permits read-only status recovery');await panel.fire('click',checkEvent);assert.equal(uploads,2,'recovery only reads saved parent/path');assert.equal(h.widget.PFTransport.snapshot().reviews.length,0);assert.equal(h.widget.S.attachmentUploadResults[1].state,'Verified');assert.equal(h.widget.S.attachmentUploadResults[2].state,'Not sent');
}
console.log('PASS PF actual root/data upload receipts, exact scalar/object persisted path + parent, fail-closed/no replay, mounted inline attachment progress/recovery, and unchanged ordinary Save dialog.');
