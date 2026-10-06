import assert from 'node:assert/strict';
import {ready,drain,deferred,ID,SUB,ACCESS,NEW} from './test-contract-sdk-v2-foundation.mjs';

function draft(h){
 h.c.S.nc={type:'DA',project:'',parent:'',sub:[SUB],wbw:[],builder:'',name:'Routine save fixture',territory:'Austin',status:'Proposed',acts:[],seedSource:'default',owners:[ACCESS],lotIds:[],ppf:{},totalLots:'',emPerLot:'',initLots:'',initDays:'',contLots:'',contDays:''};
 const button=h.c.document.createElement('button');button.id='nc_submit';button.textContent='Create Contract';h.c.document.body.appendChild(button);return button;
}
const writes=h=>h.calls.filter(call=>['add','update','delete'].includes(call.method));
const noPopup=h=>{assert.equal(h.c.document.getElementById('contractSaveOverlay'),null,'routine saves never mount a progress or result overlay');assert.ok(h.c.document.body.children.every(node=>!node.inert),'routine saves do not make the background inert');};

{
 const h=await ready({realDOM:true}),send=deferred(),refresh=deferred(),nativeAdd=h.api.addRecords,nativeRefresh=h.c.ncRefresh,button=draft(h);
 h.api.addRecords=config=>send.promise.then(()=>nativeAdd(config));h.c.ncRefresh=run=>refresh.promise.then(()=>nativeRefresh(run));
 const pending=h.c.ncSubmit([],[]);noPopup(h);assert.equal(button.textContent,'Saving…');assert.equal(button.disabled,true);assert.equal(h.c.ContractSetupUI.close(),false);assert.equal(await h.c.ncSubmit([],[]),false);assert.doesNotMatch(h.node('banners').innerHTML,/contract-created-banner/,'pending writes never announce success');
 await drain();send.resolve();await drain();assert.equal(h.c.S.contractWorkflow.entries.filter(row=>row.state==='verified').length,2);assert.equal(button.textContent,'Saving…');assert.equal(button.disabled,true,'saving remains locked until the final fresh snapshot');assert.equal(h.c.clpCancel(),false);
 refresh.resolve();const result=await pending;assert.equal(result.error,null);assert.equal(result.rows.length,2);assert.equal(writes(h).length,2);assert.equal(h.c.S.contractWorkflow,null);assert.equal(h.c.S.nc,null);assert.equal(button.textContent,'Create Contract');assert.equal(h.c.S.contractWorkflowHistory[0].entries.length,2,'full captured verification ledger remains available in the widget');assert.ok(h.c.S.audit.some(entry=>entry.message==='Contract created'));noPopup(h);
 assert.match(h.node('banners').innerHTML,/contract-created-banner.*role="status"/);
 assert.match(h.node('banners').innerHTML,/Contract created and sent to Legal for review/);
 assert.ok([...h.timers.values()].some(timer=>timer.ms===5000),'verified creation stays visible for five seconds');
 h.tick(5000);assert.equal(h.node('banners').innerHTML,'');
}

{
 const h=await ready({realDOM:true,fakeTime:true});
 h.c.banner('ok','Earlier success');await h.advance(3000);
 h.c.S.contracts.push({ID:NEW,Contract_Name:'Created fixture',Status:'Proposed'});
 h.c.contractCreatedBanner(NEW);await h.advance(4999);
 assert.match(h.node('banners').innerHTML,/sent to Legal for review/,'an older toast timer cannot dismiss the new creation confirmation');
 await h.advance(1);assert.equal(h.node('banners').innerHTML,'');
 h.c.findContract(NEW).Status='New';h.c.contractCreatedBanner(NEW);
 assert.match(h.node('banners').innerHTML,/Contract created successfully/);assert.doesNotMatch(h.node('banners').innerHTML,/Legal/,'routing copy requires a verified Proposed record');
 h.c.banner('ok','Earlier success');await h.advance(3000);h.c.banner('err','Needs review');await h.advance(1000);
 assert.match(h.node('banners').innerHTML,/Needs review/,'an older success timer cannot clear a newer failure');
}

{
 const h=await ready({realDOM:true}),native=h.api.updateRecordById;draft(h);
 h.api.updateRecordById=async config=>{await native(config);return {code:3000,data:{ID:config.id},details:{code:2899}};};
 const result=await h.c.ncSubmit([],[]);assert.ok(result.error);assert.doesNotMatch(h.node('banners').innerHTML,/contract-created-banner|sent to Legal/,'uncertain setup never announces routing success');
 const count=writes(h).length;assert.equal(await h.c.ncConfirm(),true,'exact read-only reconciliation may verify the complete setup');
 assert.equal(writes(h).length,count);assert.match(h.node('banners').innerHTML,/Contract created and sent to Legal for review/);
 assert.ok([...h.timers.values()].some(timer=>timer.ms===5000));noPopup(h);
}

{
 const h=await ready({realDOM:true}),native=h.api.addRecords,button=draft(h),source=h.c.S.nc;
 h.api.addRecords=async config=>{const result=await native(config);return config.form_name==='Contract_Actions'?{code:3000,data:{ID:result.result[0].data.ID},details:{code:2899}}:result;};
 const result=await h.c.ncSubmit([{title:'Saved action',sort:1},{title:'Unsent action',sort:2}],[]),run=h.c.S.contractWorkflow,count=writes(h).length;
 assert.ok(result.error);assert.equal(run.cid,NEW);assert.equal(result.rows[0].state,'verified');assert.equal(result.rows[1].state,'unknown');assert.equal(result.rows[2].state,'not-sent');assert.equal(h.c.S.nc,source);assert.equal(button.textContent,'Check status');assert.equal(button.disabled,false);assert.equal(h.c.clpCancel(),false);noPopup(h);
 const check=deferred(),nativeCheck=h.c.contractWorkflowRecheck;h.c.contractWorkflowRecheck=run=>check.promise.then(()=>nativeCheck(run));
 const checking=h.c.ncConfirm();assert.equal(button.textContent,'Checking…');assert.equal(button.disabled,true);assert.equal(await h.c.ncSubmit([],[]),false);check.resolve();assert.equal(await checking,false,'unsent setup stays incomplete');
 assert.equal(writes(h).length,count,'Check status never replays creation or sends unfinished children');assert.equal(run.entries[1].state,'verified');assert.equal(run.entries[2].state,'not-sent');assert.equal(h.c.S.contractWorkflow,null);assert.equal(h.c.S.nc,null,'confirmed parent opens instead of offering to create it again');assert.equal(h.c.S.selId,NEW);assert.equal(h.c.S.contractWorkflowHistory[0],run);noPopup(h);
}

{
 const h=await ready({realDOM:true}),gate=deferred(),native=h.api.addRecords,button=draft(h),source=h.c.S.nc;h.api.addRecords=config=>gate.promise.then(()=>native(config));
 const pending=h.c.ncSubmit([],[]);await drain();h.tick(30000);const result=await pending;assert.ok(result.error);assert.equal(button.textContent,'Check status');assert.equal(button.disabled,true,'a deadline does not unlock a still-pending native request');assert.equal(await h.c.ncConfirm(),false);assert.equal(h.c.S.nc,source);assert.equal(h.c.closeOverlays(),false);noPopup(h);
 gate.resolve();await drain();assert.equal(button.disabled,false);assert.equal(await h.c.ncConfirm(),false,'a create without a retained returned ID remains unknown');assert.equal(writes(h).length,1,'status checking never creates a duplicate');assert.ok(h.c.S.contractWorkflow);assert.equal(h.c.S.nc,source);noPopup(h);
}

{
 const h=await ready({realDOM:true}),button=draft(h),nativeRecords=h.api.getRecords,nativeUpdate=h.api.updateRecordById;let parentReads=0;
 h.api.getRecords=config=>{if(config.report_name==='All_Contracts1'&&config.criteria==='(ID == '+NEW+')'&&++parentReads===2)h.reports.All_Contracts1.find(row=>row.ID===NEW).Subdivision1=[];return nativeRecords(config);};
 h.api.updateRecordById=async config=>{await nativeUpdate(config);return {code:3000,data:{ID:config.id},details:{code:2899}};};
 const result=await h.c.ncSubmit([],[]),run=h.c.S.contractWorkflow;assert.ok(result.error);assert.equal(run.entries.find(entry=>entry.key==='parent-subdivisions').state,'unknown','conditional subdivision repair shares the captured recovery ledger');const count=writes(h).length;
 assert.equal(await h.c.ncConfirm(),false,'later setup remains unsent');assert.equal(h.c.contractHasReviews(),false);assert.equal(run.entries.find(entry=>entry.key==='parent-subdivisions').state,'verified');assert.equal(writes(h).length,count,'repair recovery is read-only');assert.equal(h.c.S.selId,NEW);assert.equal(h.c.S.contractWorkflow,null);noPopup(h);
}

{
 const h=await ready({realDOM:true,criticalReporter:true}),button=draft(h),source=h.c.S.nc,mails=[],gate=deferred(),paced=[],shared=h.c.LMData;
 h.c.LMData={...shared,request(key,send,options){if(key==='contracts:critical-error'){paced.push({key,options});return gate.promise.then(()=>shared.request(key,send,options));}return shared.request(key,send,options);}};
 h.api.invokeCustomApi=async config=>{mails.push(config);return {code:3000,details:{output:JSON.stringify({success:true})}};};h.api.addRecords=async()=>({code:3000});
 const result=await h.c.ncSubmit([],[]),run=h.c.S.contractWorkflow;assert.ok(result.error);assert.equal(button.textContent,'Check status');assert.equal(h.c.S.nc,source);assert.equal(h.c.S.audit.filter(entry=>entry.message==='Contract creation failed').length,1);assert.equal(await h.c.ncConfirm(),false,'no returned ID is never guessed');assert.equal(await h.c.ncSubmit([],[]),false);assert.equal(h.c.ContractSetupUI.close(),false);noPopup(h);
 h.tick(1200);await drain();assert.equal(paced.length,1);assert.equal(paced[0].options,undefined,'failure email is a paced write without read-only/retry options');assert.equal(mails.length,0,'mail waits for the shared request budget');gate.resolve();await drain();assert.equal(mails.length,1);assert.equal(mails[0].api_name,'Report_Proforma_Widget_Error');const report=JSON.parse(mails[0].payload.payload);assert.equal(report.recipient,'rbelliveau@wbdevelopment.com');assert.match(report.body,/Contract creation failed/);assert.match(report.body,/RECENT AUDIT TRAIL/);assert.match(report.body,/unknown/);assert.doesNotMatch(report.body,/Routine save fixture/,'diagnostic email does not include raw captured business payloads');assert.ok(!h.logs.some(row=>String(row[0]).includes('Critical error email could not be verified')),'SDK2 details.output success is recognized');
 await h.c.contractWorkflowFinish(run,run.error);assert.equal(h.c.S.audit.filter(entry=>entry.message==='Contract creation failed').length,1);assert.equal(mails.length,1,'the same failed run is reported once');
}

{
 const h=await ready({realDOM:true,criticalReporter:true}),c=h.reports.All_Contracts1[0],mails=[],nativeUpdate=h.api.updateRecordById;
 Object.assign(c,{Contract_Type:'Lot (Master)',Lots1:[],Project:{},Parent_Contract:{},Territory:'Austin',Number_of_Lots:20,Initial_Takedown:5,Initial_Takedown_Days:30,Second_Closing_Lots:5,Second_Closing_Days:45,Subsequent_Takedown_Lots:3,Subsequent_Takedown_Days:60});Object.assign(h.c.findContract(ID),structuredClone(c));draft(h);h.c.S.nc.type='Lot (Master)';
 h.c.S.clp={cid:ID,lots0:[],ppf0:'{}',terms:{Number_of_Lots:'25',Initial_Takedown:'5',Initial_Takedown_Days:'30',Second_Closing_Lots:'5',Second_Closing_Days:'45',Subsequent_Takedown_Lots:'3',Subsequent_Takedown_Days:'60'}};
 const button=h.c.document.createElement('button');button.id='clp_save';button.textContent='Save';h.c.document.body.appendChild(button);
 h.api.updateRecordById=async config=>{await nativeUpdate(config);return {code:3000,data:{ID:config.id},details:{code:2899}};};h.api.invokeCustomApi=async config=>{mails.push(config);return {code:3000,details:{output:JSON.stringify({success:true})}};};
 const result=await h.c.clpSave();assert.ok(result.error);assert.equal(button.textContent,'Check status');assert.equal(button.disabled,false);assert.ok(h.c.S.clp,'unknown save retains its captured editor');noPopup(h);const count=writes(h).length;
 assert.equal(await h.c.clpSave(),true,'the same Save button performs exact read-only recovery');assert.equal(writes(h).length,count);assert.equal(h.c.S.clp,null);assert.equal(h.c.S.contractWorkflow,null);assert.equal(c.Number_of_Lots,25);noPopup(h);
 h.tick(1200);await drain();assert.equal(mails.length,1);assert.match(JSON.parse(mails[0].payload.payload).body,/Contract save failed/);assert.equal(h.c.S.audit.filter(entry=>entry.message==='Contract save failed').length,1);
}

{
 const h=await ready({realDOM:true,criticalReporter:true}),mails=[];draft(h);h.api.invokeCustomApi=async config=>{mails.push(config);throw Error('ambiguous email reply');};h.c.LMCriticalErrors.configure({widget:'Contract Management',version:h.c.CFG.version,code:'CMW',apiCandidates:['Report_Proforma_Widget_Error','reportProformaWidgetError']});
 h.api.addRecords=async()=>({code:2945,message:'Rejected routine fixture'});const result=await h.c.ncSubmit([],[]);assert.ok(result.error);assert.equal(h.c.S.contractWorkflow,null,'definite rejection does not quarantine unsent data');assert.ok(h.c.S.nc,'the rejected draft remains editable');h.tick(1200);await drain();assert.equal(mails.length,1,'uncertain sendmail delivery is never retried through a fallback API');assert.equal(h.c.contractHasReviews(),false);noPopup(h);
}

{
 const h=await ready({realDOM:true,criticalReporter:true});draft(h);h.c.S.nc.type='Lot (Master)';assert.equal(await h.c.ncSubmit([],[]),false);assert.equal(writes(h).length,0);assert.equal(h.c.S.audit.filter(entry=>entry.message==='Contract creation failed').length,0,'ordinary required-field validation is not a failed save email');assert.ok(![...h.timers.values()].some(timer=>timer.ms===1200));noPopup(h);
 const ledger={id:'link-fixture',kind:'lots-pricing',report:'Lots and pricing',stage:'sending',finished:false,error:null,rows:[{id:'property-links',state:'verified',phase:'verified',payload:{Contract1:NEW}}]};
 h.c.ContractSetupUI.open(ledger);assert.equal(h.node('contractSaveOverlay').hidden,false);assert.equal(h.node('contractSaveContext').hidden,false);assert.equal(h.node('contractSaveResults').hidden,false);assert.equal(h.node('contractSaveResults').children.length,1,'multi-Lot transfer dialogs keep their verified destination detail');
}

console.log('PASS actual routine Contract saves: no progress/result popup, Saving button through fresh verification, retained full ledger/audit, one-send and close guards, unknown read-only Check status, late native settlement, captured subdivision repair, precise failure email once through existing recipient/API, no email retry or local-validation report, unchanged multi-Lot dialog.');
