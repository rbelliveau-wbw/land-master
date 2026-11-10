import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {compileDelugePO} from './test-po-test-cfo-backend.mjs';

// Execute the checked-in new Deluge bodies against native-shaped lookup and
// record fixtures. No network, Creator mutations or real email sends occur.
const names=['activityEmailClaim','poEmailCanRetry','poEmailCanViewActivity','poEmailCanReadPO','poEmailActivityRow','renderPurchaseOrderOutcomeEmail','buildPurchaseOrderOutcomeEmail','poOutcomeEmailReady','poOutcomeNotificationStatus','sendPurchaseOrderOutcomeEmail','poEmailActivity','sendPurchaseOrderEmail','poActorResponse'];
const sources=Object.fromEntries(names.map(name=>[name,fs.readFileSync(`creator/functions/${name}.dg`,'utf8')]));
function compile(source){
 source=source.replace(/Activity_Log\[([^\]]+)\] sort by ID desc range from 0 to 50/g,(_,criteria)=>{const membership=criteria.replace(/\b([A-Za-z_]\w*)\s+in\s+([A-Za-z_]\w*)/g,'$2.contains(row.$1)');return `query('Activity_Log',row=>${membership.replace(/\b([A-Za-z_]\w*)\s*(==|!=|>=|<=|>|<)/g,'row.$1 $2')},'ID',true,0,50)`;});
 return compileDelugePO(source);
}
const programs=Object.fromEntries(names.map(name=>[name,compile(sources[name])]));
const PO='4410926123456000001',BUDGET='4410926123456000002',SAM='4410926123456000003',PM='4410926123456000004',CONTACT='4410926123456000005',OTHER='4410926123456000006';
function runtime(options={}){
 const tables={
  Payment_Request:[{ID:PO,Budget:BUDGET,Vendor:'4410926123456000010',Request_Type:'Purchase Order',PO_Revision:'submission-one',PO_Approval_State:options.outcome??'Approved',PO_Amount_Exact:'12.35',PO_Line_Count:3,Request_Date:'2026-11-09',Date_Needed:'2026-11-10'}],
  Add_Budget:[{ID:BUDGET,Budget_Name:'Eagle <Prairie> & Phase 01',Budget_Owner:[],Subdivision1:{Territory:'North'}}],
  Vendors:[{ID:'4410926123456000010',Vendor_Name:'A <Vendor> & Company'}],
  User_Access:[{ID:SAM,User:'sam',Full_Name:'Sam Spears',Approver_Email:'sam@example.test',Create_Purchase_Orders:true},{ID:PM,User:'pm',Full_Name:'Construction PM',Approver_Email:options.pmEmail??'pm@example.test'},{ID:CONTACT,User:null,Full_Name:'Sokha Sim',Approver_Email:'ssim@example.test',Approval_Routing_Enabled:false},{ID:OTHER,User:'other',Full_Name:'Unrelated User',Approver_Email:'other@example.test',Create_Purchase_Orders:true}],
  Settings:[{ID:'4410926123456000011',PO_Approved_Recipients:[{ID:SAM},{ID:CONTACT}],PO_Rejected_Recipients:[{ID:SAM}]}],
  Territory:[{ID:'4410926123456000012',Territory_Name:'North',Construction_PM:options.missingPM?null:PM}],
  Budget_Item:[{ID:'4410926123456000021',Budget:BUDGET,Cost_Code:'0012',Item_Name:'Earth <work>',Revised_Final:100},{ID:'4410926123456000022',Budget:BUDGET,Cost_Code:'0020',Item_Name:'Pipe & fittings',Revised_Final:100}],
  PO_Item:[{ID:'4410926123456000031',Purchase_Order:PO,Revision:'submission-one',Line_Order:1,Budget_Item:'4410926123456000021',Cost_Code:'0012',Final_Amount_Exact:'0.10'},{ID:'4410926123456000032',Purchase_Order:PO,Revision:'submission-one',Line_Order:2,Budget_Item:'4410926123456000021',Cost_Code:'0012',Final_Amount_Exact:'0.20'},{ID:'4410926123456000033',Purchase_Order:PO,Revision:'submission-one',Line_Order:3,Budget_Item:'4410926123456000022',Cost_Code:'0020',Final_Amount_Exact:'12.05'}],
  Budget_Approvals:[{ID:'4410926123456000041',Budget:BUDGET,Status:'Pending',Approver:'sam@example.test',Sent_Date:null}],
  PO_Phase_Lock:[],Activity_Log:[]
 };
 const c=vm.createContext({fixtureJSON:JSON.stringify(tables),optionJSON:JSON.stringify(options),console});
 vm.runInContext(`
 var tables=JSON.parse(fixtureJSON),options=JSON.parse(optionJSON),mails=[],scopedBalanceCalls=[],hook=null,nextId=4410926999999999000n;
 function map(v){if(!v||typeof v!=='object'||Object.prototype.hasOwnProperty.call(v,'get')||typeof v.toDate==='function')return v;if(Array.isArray(v))return v.map(map);for(var k of Object.keys(v))v[k]=map(v[k]);Object.defineProperties(v,{get:{value:function(k){return this[k]??null;}},put:{value:function(k,v){this[k]=map(v);}},remove:{value:function(k){delete this[k];}},keys:{value:function(){return Object.keys(this);}},toString:{value:function(){return JSON.stringify(this);}}});return v;}
 function Map(){return map({});}function List(){return [];}function ifnull(v,f){return v==null?f:v;}function choose(c,a,b){return c?a:b;}
 function recordValues(...pairs){var data={};for(var i=0;i<pairs.length;i+=2)data[pairs[i]]=pairs[i+1];return map(data);}
 Array.prototype.add=function(v){this.push(v);};Array.prototype.get=function(i){return this[i]??null;};Array.prototype.size=Array.prototype.count=function(){return this.length;};Array.prototype.contains=function(v){return this.includes(v);};Array.prototype.toString=function(){return JSON.stringify(this);};
 String.prototype.toMap=function(){return map(JSON.parse(this));};String.prototype.toLong=function(){return this.length>15?this.toString():Number(this);};String.prototype.toDecimal=function(){return Number(this);};String.prototype.matches=function(r){return new RegExp('^(?:'+r+')$').test(this);};String.prototype.replaceAll=function(a,b){return this.replace(new RegExp(a,'g'),b);};String.prototype.toFile=function(name){return {name,content:this.toString()};};
 Number.prototype.toLong=function(){return Math.trunc(this);};Number.prototype.toDecimal=function(){return Number(this);};Number.prototype.text=function(){return '$'+this.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});};
 function stamp(){return {toString(){return '2026-11-10T10:30:00-06:00';},toDate(){return '2026-11-10';}};}
 var zoho={loginuser:options.login??'sam',adminuser:'owner',currenttime:stamp(),currentdate:'2026-11-10',encryption:{sha256(value){return 'fixture-'+value;}}};
 var links={Payment_Request:{Budget:'Add_Budget',Vendor:'Vendors'},PO_Item:{Budget_Item:'Budget_Item'},Territory:{Construction_PM:'User_Access'}};
 var recordCache={};function record(form,row,lookup=false){var key=form+'|'+row.ID+'|'+lookup;if(recordCache[key])return recordCache[key];return recordCache[key]=new Proxy(row,{get(o,k){if(k===Symbol.toPrimitive)return ()=>o.ID;if(k==='toString'&&lookup)return ()=>String(o.ID);if(links[form]?.[k]&&o[k]!=null){var target=tables[links[form][k]].find(r=>r.ID==o[k]);return target?record(links[form][k],target,true):null;}return o[k]??null;},set(o,k,v){if(options.failStamp&&k==='Sent_At')throw Error('Stamp failure');o[k]=v;return true;}});}
 function query(form,predicate,sort,desc=false,start,end){let rows=(tables[form]??[]).map(row=>record(form,row)).filter(predicate);if(sort)rows.sort((a,b)=>(a[sort]>b[sort]?1:a[sort]<b[sort]?-1:0)*(desc?-1:1));if(start!=null)rows=rows.slice(start,end+1);return new Proxy(rows,{get(a,k){return k in a||typeof k==='symbol'?a[k]:a[0]?.[k]??null;},set(a,k,v){if(!a.length)throw Error('Missing record');a[0][k]=v;return true;}});}
 function insertRecord(form,data){if(data.Claim_Key&&tables[form].some(row=>row.Claim_Key===data.Claim_Key))throw Error('Duplicate native Claim_Key');data.ID=String(++nextId);tables[form].push(data);if(hook)hook('insert',data);return data.ID;}
 function sendMail(envelope){if(options.failMail)throw Error('Ambiguous email failure');mails.push({...envelope});if(hook)hook('mail',envelope);}
 var thisapp={environment:{type:options.environment??'Production'},permissions:{profileForUser(){return options.profile??'CFO';}},poCurrencyString(v){return /^\\d+(?:\\.\\d{1,2})?$/.test(v)?Number(v).toFixed(2):'';}};
 thisapp.poApprovalBundle=function(id){if(options.bundleFailure)return map({success:false,error:'Invalid captured route'});return map({success:true,bundle:{submitterId:'${SAM}',rows:[{id:'4410926123456000041',userAccessId:'${SAM}',status:'Approved'}],active:tables.Payment_Request[0].PO_Approval_State==='Pending'?{id:'4410926123456000041',userAccessId:'${SAM}',role:'CFO',name:'Sam Spears'}:{},modifications:[]}});};
 thisapp.poSnapshot=function(id){return map({success:true,snapshot:{id,budgetId:'${BUDGET}',revision:tables.Payment_Request[0].PO_Revision,approvalState:tables.Payment_Request[0].PO_Approval_State,commitmentState:'Reserved',approvalBundle:{modifications:options.withModification?[{budgetItemId:'4410926123456000021'}]:[]}}});};
 thisapp.poBudgetBalances=function(){throw Error('Outcome eligibility must never scan the entire phase');};
 thisapp.poBudgetBalancesForItems=function(budgetId,items){scopedBalanceCalls.push({budgetId,items});return map({success:!options.balanceFailure,balances:[{budgetItemId:'4410926123456000021',finalCents:'10000',modCents:'0'}]});};
 thisapp.poExcelWorkbook=function(){return map({success:!options.workbookFailure,content:'fixture-workbook',filename:'PO.xls'});};thisapp.poElementExportRows=function(){return [];};
 `,c);
 for(const name of names){try{vm.runInContext(programs[name]+`;thisapp.${name}=${name};`,c);}catch(error){throw Error(name+': '+error.message+'\n'+programs[name]);}}
 const call=(name,...args)=>{c.args=args;return vm.runInContext(`${name}(...args.map(value=>typeof value==='object'?map(value):value))`,c);};
 const send=activityId=>call('sendPurchaseOrderOutcomeEmail',PO,activityId??'',SAM);
 const activity=(extra={})=>call('poEmailActivity',{action:'Activity',id:PO,budgetId:BUDGET,userAccessId:SAM,...extra});
 return {c,call,send,activity,tables:c.tables,mails:c.mails,eval:code=>vm.runInContext(code,c)};
}

{
 const h=runtime(),prepared=h.call('buildPurchaseOrderOutcomeEmail',PO);assert.equal(prepared.success,true,JSON.stringify(prepared));
 assert.deepEqual(Array.from(prepared.recipients,r=>r.email),['sam@example.test','ssim@example.test','pm@example.test']);
 assert.match(prepared.body,/0012/);assert.match(prepared.body,/\$0\.30/);assert.match(prepared.body,/\$12\.05/);assert.match(prepared.body,/\$12\.35/);assert.equal((prepared.body.match(/<td[^>]*>0012<\/td>/g)||[]).length,1,'one row per exact cost code');
 assert.match(prepared.body,/A &lt;Vendor&gt; &amp; Company/);assert.match(prepared.body,/Eagle &lt;Prairie&gt; &amp; Phase 01/);assert.doesNotMatch(prepared.body,/approval is requested|payment released|work authorized|attached Excel/i);
 const sent=h.send();assert.equal(sent.state,'Sent',JSON.stringify(sent));assert.equal(sent.emailSent,true);assert.equal(sent.sentCount,3);assert.equal(h.mails.length,3);assert.equal(h.tables.Activity_Log.filter(r=>r.Event==='Approved Email').length,3);assert.equal(h.tables.Activity_Log.filter(r=>r.Event==='Approved Email Address Claim').length,3);
 assert.equal(h.c.scopedBalanceCalls.length,0,'an outcome with no modifications performs no financial balance scan');
 assert.equal(JSON.parse(h.tables.Activity_Log.find(r=>r.Event==='Approved Email Plan').Snapshot).body,undefined,'immutable plan stores compact facts rather than repeated markup');
 for(const mail of h.mails){assert.equal(mail.from,'Notifications@wbdevelopment.com');assert.equal(mail.Attachments,undefined,'outcomes contain only compact summary and link');}
 h.send();h.activity();h.call('poEmailActivity',{action:'CheckOutcomeEmail',id:PO,budgetId:BUDGET,userAccessId:SAM,expectedRevision:'submission-one'});assert.equal(h.mails.length,3,'duplicate initial send/check never resends');
 const rows=h.activity().events;assert.equal(rows.length,3);assert.ok(rows.every(r=>r.sentAt&&r.status==='Sent'&&r.recipientKey));assert.ok(rows.every(r=>!r.canRetry));
 const before=h.tables.Activity_Log.length;h.tables.Payment_Request[0].PO_Revision='submission-two';h.tables.PO_Item.forEach(line=>line.Revision='submission-two');h.send();assert.equal(h.mails.length,6,'new submission revision is a legitimate new outcome');assert.ok(h.tables.Activity_Log.length>before);
}
{
 const h=runtime({outcome:'Rejected'});assert.equal(h.send().state,'Sent');assert.deepEqual(Array.from(h.mails,r=>r.to),['sam@example.test','pm@example.test']);assert.ok(h.mails.every(r=>/Purchase Order Rejected/.test(r.subject)));
}
{
 const h=runtime({missingPM:true});const result=h.send();assert.equal(result.state,'Partial');assert.equal(h.mails.length,2);const failed=result.events.find(e=>e.status==='Failed');assert.equal(failed.recipientKey,'construction-pm');assert.equal(failed.canRetry,true);
 h.tables.Territory[0].Construction_PM=PM;const retry=h.send(failed.id);assert.equal(retry.state,'Sent',JSON.stringify(retry));assert.equal(h.mails.length,3);const pmAttempts=h.tables.Activity_Log.filter(r=>r.Event==='Approved Email'&&JSON.parse(r.Snapshot).recipientKey==='construction-pm');assert.deepEqual(Array.from(pmAttempts,r=>r.Attempt_No),[1,2]);assert.equal(pmAttempts[0].Status,'Failed');assert.equal(pmAttempts[1].Status,'Sent');
 h.send(failed.id);assert.equal(h.mails.length,3,'stale failed attempt cannot claim attempt three');
}
{
 const h=runtime({failMail:true});const result=h.send();assert.equal(result.state,'Unknown');assert.equal(result.canRetryEmail,false);assert.equal(h.tables.Activity_Log.filter(r=>r.Event==='Approved Email'&&r.Status==='Unknown').length,3);h.c.options.failMail=false;h.send();for(const e of result.events)h.send(e.id);assert.equal(h.mails.length,0,'unknown native sends never auto-replay');
}
{
 const h=runtime({balanceFailure:true,withModification:true});const result=h.send();assert.equal(result.state,'Failed');assert.equal(h.mails.length,0);assert.deepEqual(JSON.parse(JSON.stringify(h.c.scopedBalanceCalls)),[{budgetId:BUDGET,items:['4410926123456000021']}],'read-only finalization eligibility checks only the PO modification items');h.c.options.balanceFailure=false;const first=result.events[0];assert.equal(h.send(first.id).events.find(r=>r.recipientKey===first.recipientKey).status,'Sent');assert.equal(h.mails.length,1,'only selected confirmed-unsent recipient retries');
}
{
 const h=runtime();h.eval('tables.Settings[0].PO_Approved_Recipients=[];');const failed=h.send();assert.equal(failed.state,'Failed');assert.equal(failed.events[0].recipientKey,'configuration');h.eval(`tables.Settings[0].PO_Approved_Recipients=[{ID:'${SAM}'}];`);const retried=h.send(failed.events[0].id);assert.equal(retried.state,'Sent',JSON.stringify(retried));assert.equal(h.mails.length,2);assert.equal(h.activity().events.find(e=>e.recipientKey==='configuration').canRetry,false,'historical configuration failure stops offering retries once the immutable plan exists');
}
{
 const h=runtime({pmEmail:'sam@example.test'});assert.equal(h.send().recipientCount,2);assert.equal(h.mails.length,2,'PM already in fixed list is deduplicated');
}
{
 const h=runtime();h.tables.User_Access[0].Approver_Email='';h.tables.User_Access[2].Approver_Email='';const result=h.send();assert.equal(result.state,'Partial');const failures=result.events.filter(e=>e.status==='Failed');assert.equal(failures.length,2);
 h.tables.User_Access[0].Approver_Email='corrected@example.test';h.tables.User_Access[2].Approver_Email='corrected@example.test';
 let reentered=false;h.c.otherFailure=failures[1].id;h.eval(`hook=function(kind,row){if(!${'false'}&&kind==='insert'&&row.Event==='Approved Email Address Claim'&&row.Recipient_Email==='corrected@example.test'&&!options.reentered){options.reentered=true;sendPurchaseOrderOutcomeEmail('${PO}',otherFailure,'${SAM}');}};`);
 const done=h.send(failures[0].id);assert.equal(done.state,'Sent',JSON.stringify(done));assert.equal(h.mails.filter(mail=>mail.to==='corrected@example.test').length,1,'native operation+address claim prevents concurrent corrected-contact duplicates');assert.ok(done.events.some(e=>e.status==='Skipped'));
}
{
 const h=runtime(),content=h.call('buildPurchaseOrderOutcomeEmail',PO),planId='4410926999999998999';h.tables.Activity_Log.push({ID:planId,Claim_Key:`plan|fixture-po-outcome|${PO}|submission-one|Approved`,Object_Type:'Purchase Order',Object_ID:PO,Context_Type:'Budget',Context_ID:BUDGET,Process:'PO Approval',Event:'Approved Email Plan',Operation_ID:`po-outcome|${PO}|submission-one|Approved`,Attempt_No:0,Status:'Preparing',Snapshot:content.toString()});const started=h.call('poOutcomeNotificationStatus',PO,SAM);assert.equal(started.state,'Preparing');assert.equal(started.missingCount,3);assert.equal(started.canResumeEmail,true);const result=h.send(started.planId);assert.equal(result.state,'Sent');assert.equal(h.mails.length,3,'explicit resume claims only never-started recipients');
}
{
 const h=runtime();assert.equal(h.call('poEmailCanRetry',PO,CONTACT),false,'email-only contacts have no app powers');h.send();assert.equal(h.activity({id:'',userAccessId:OTHER}).events.length,0,'unrelated Create PO grant is not budgetwide activity read');assert.equal(h.activity({id:PO,userAccessId:OTHER}).success,false);assert.equal(h.activity({userAccessId:CONTACT}).success,false);h.tables.Add_Budget[0].Budget_Owner=[{ID:OTHER}];h.c.zoho.loginuser='other';assert.equal(h.activity({userAccessId:OTHER}).events.length,3,'explicit budget owners can inspect the budget audit');
 const foreign=h.activity({budgetId:'4410926123456999999'});assert.equal(foreign.success,false,'foreign budget/PO relation is never accepted');
 const bad=h.call('poEmailActivity',{action:'RetryOutcomeEmail',id:PO,budgetId:BUDGET,userAccessId:OTHER,expectedRevision:'submission-one',activityId:h.tables.Activity_Log.find(e=>e.Event==='Approved Email').ID});assert.equal(bad.success,false,'budget read does not grant notification replay');
}
{
 const h=runtime({outcome:'Pending',workbookFailure:true});assert.match(h.call('sendPurchaseOrderEmail',PO),/ERROR/);assert.equal(h.tables.Activity_Log[0].Status,'Failed');h.c.options.workbookFailure=false;assert.match(h.call('sendPurchaseOrderEmail',PO),/^OK/);assert.equal(h.mails.length,1);assert.deepEqual(Array.from(h.tables.Activity_Log,e=>e.Attempt_No),[1,2]);assert.equal(h.tables.Activity_Log[1].Status,'Sent');h.call('sendPurchaseOrderEmail',PO);assert.equal(h.mails.length,1,'existing pending approval request guard is preserved');
}
{
 const h=runtime({outcome:'Pending',failMail:true});assert.match(h.call('sendPurchaseOrderEmail',PO),/ERROR/);assert.equal(h.tables.Activity_Log[0].Status,'Unknown');h.c.options.failMail=false;h.call('sendPurchaseOrderEmail',PO);assert.equal(h.mails.length,0,'ambiguous pending approval email cannot be blindly retried');
}
for(const [environment,path] of [['Production','/wbdevelopment/land-master/'],['Development','/environment/development/land-master/'],['Stage','/environment/stage/land-master/']]){const h=runtime({environment}),mail=h.call('buildPurchaseOrderOutcomeEmail',PO);assert.ok(mail.body.includes(path));}
{
 const h=runtime();h.eval(`tables.Payment_Request[0].PO_Line_Count=250;tables.Payment_Request[0].PO_Amount_Exact='250.00';tables.Budget_Item=Array.from({length:250},(_,i)=>({ID:String(4410926123456200000n+BigInt(i)),Budget:'${BUDGET}',Item_Name:'Cost item '+i,Cost_Code:'C_'+String(i).padStart(4,'0')}));tables.PO_Item=Array.from({length:250},(_,i)=>({ID:String(4410926123456100000n+BigInt(i)),Purchase_Order:'${PO}',Revision:'submission-one',Line_Order:i+1,Budget_Item:String(4410926123456200000n+BigInt(i)),Cost_Code:'C_EP01-'+i+'-1',Final_Amount_Exact:'1.00'}));`);const content=h.call('buildPurchaseOrderOutcomeEmail',PO);assert.equal(content.success,true,JSON.stringify(content));assert.equal(content.costCodes.length,250);assert.match(content.body,/C_0249/);assert.equal(h.send().state,'Sent');const plan=h.tables.Activity_Log.find(row=>row.Event==='Approved Email Plan');assert.ok(plan.Snapshot.length<=16000,'250 complete code totals fit compact native snapshot without HTML markup');assert.equal(JSON.parse(plan.Snapshot).costCodes.length,250);
}
{
 const h=runtime();h.tables.PO_Item[0].Cost_Code='C_EP01-0012-1';h.tables.PO_Item[1].Cost_Code='C_EP01-0012-4';const content=h.call('buildPurchaseOrderOutcomeEmail',PO);assert.equal(content.costCodes.length,2);assert.equal(content.costCodes[0].code,'0012');assert.equal(content.costCodes[0].cents,'30','all elements of the same base code combine with exact cents');assert.doesNotMatch(content.body,/C_EP01-0012/);h.tables.Budget_Item[0].Cost_Code=null;const fallback=h.call('buildPurchaseOrderOutcomeEmail',PO);assert.equal(fallback.costCodes.length,3);assert.ok(fallback.costCodes.some(row=>row.code==='C_EP01-0012-1'),'missing base codes retain exact captured fallback rather than guessed suffix stripping');
}
{
 const h=runtime();h.tables.Vendors[0].Vendor_Name='𐐀'.repeat(16001);const content=h.call('buildPurchaseOrderOutcomeEmail',PO);assert.equal(content.success,false);assert.match(content.error,/safe audit size/);assert.equal(h.send().state,'Failed');assert.equal(h.mails.length,0,'oversized Unicode snapshots are never silently truncated or sent');
}
{
 const h=runtime();h.tables.User_Access[0].Edit_All_Budgets=true;h.eval(`for(let i=0;i<60;i++)tables.Activity_Log.push({ID:String(4410926999999999000n+BigInt(i)),Object_Type:'Purchase Order',Object_ID:'${PO}',Context_Type:'Budget',Context_ID:'${BUDGET}',Process:'PO Approval',Event:'Approved Email',Operation_ID:'pagination-fixture',Attempt_No:1,Status:'Sent',Recipient_Email:'sam@example.test',Recipient_Name:'Sam',Started_At:'2026-11-10T10:30:00-06:00',Sent_At:'2026-11-10T10:30:00-06:00',Snapshot:JSON.stringify({revision:'submission-one',recipientKey:'row-'+i})});`);const first=h.activity();assert.equal(first.events.length,50);assert.equal(first.hasMore,true);assert.equal(typeof first.nextCursor,'string');const second=h.activity({cursor:first.nextCursor});assert.equal(second.events.length,10);assert.equal(second.hasMore,false);assert.equal(second.nextCursor,'');assert.equal(new Set([...first.events,...second.events].map(row=>row.id)).size,60,'bounded cursor pages expose older audit rows exactly once');assert.equal(h.activity({cursor:123}).success,false,'numeric cursors cannot round Creator identities');
}
assert.doesNotMatch(sources.sendPurchaseOrderOutcomeEmail,/Attachments\s*:/,'new outcome source sends no workbook');
assert.doesNotMatch(sources.poEmailActivity,/Activity_Log\[[^\]]*\|\|/,'native Event membership must not let the formatter detach the Budget/context scope');
assert.match(sources.poEmailActivity,/Event in emailEvents/);
assert.match(sources.poActorResponse,/if\(canReadEmail && terminalEmailOutcome\)/,'native privacy predicate is one conjunction after the outcome OR is evaluated separately');
{
 const h=runtime();h.send();const first=h.tables.Activity_Log.find(row=>row.Event==='Approved Email');first.Sent_At=null;const checked=h.call('poOutcomeNotificationStatus',PO,SAM);assert.equal(checked.emailSent,false,'Sent without a delivery stamp cannot claim verified notification');assert.equal(checked.sentCount,2);assert.equal(checked.state,'Preparing');
}
{
 const h=runtime({missingPM:true});h.send();h.c.zoho.loginuser='other';assert.equal(h.call('poOutcomeNotificationStatus',PO,OTHER).canRetryEmail,false,'a failed recipient never bypasses retry permission through an OR expression');
}
{
 const h=runtime();h.tables.User_Access[0].Edit_All_Budgets=true;h.send();h.eval(`for(const [i,event]of ['Approval Request Email','Approved Email','Rejected Email'].entries())tables.Activity_Log.push({ID:String(4410926999999999900n+BigInt(i)),Object_Type:'Purchase Order',Object_ID:'${PO}',Context_Type:'Budget',Context_ID:'4410926123456999999',Process:'PO Approval',Event:event,Operation_ID:'foreign-budget-fixture',Attempt_No:1,Status:'Sent',Recipient_Email:'private@example.test',Started_At:'2026-11-10',Sent_At:'2026-11-10',Snapshot:JSON.stringify({revision:'submission-one',recipientKey:'foreign-'+i})});`);const rows=h.activity({id:''}).events;assert.equal(rows.length,3);assert.ok(rows.every(row=>row.budgetId===BUDGET),'all Event alternatives remain under the exact Budget/context query');
}
{
 const h=runtime();h.send();h.c.zoho.loginuser='other';const snapshot={id:PO,budgetId:BUDGET,revision:'submission-one',approvalState:'Approved',status:'Submitted',commitmentState:'Reserved',approvalBundle:{active:{},rows:[]},outcomeNotification:{events:[{recipientEmail:'private@example.test'}]}};for(const approvalState of ['Approved','Rejected']){const denied=h.call('poActorResponse',{success:true,snapshot:{...snapshot,approvalState},outcomeNotification:{events:[{recipientEmail:'private@example.test'}]}},OTHER);assert.equal(denied.snapshot.outcomeNotification,undefined,'legacy arbitrary-ID Get cannot bypass new activity read scope for '+approvalState);assert.equal(denied.outcomeNotification,undefined);}h.c.zoho.loginuser='sam';const allowed=h.call('poActorResponse',{success:true,snapshot:{...snapshot,outcomeNotification:undefined}},SAM);assert.equal(allowed.outcomeNotification.state,'Sent','captured PO participants retain new outcome evidence');assert.equal(allowed.outcomeNotification.events.length,3);
}
assert.doesNotMatch(sources.buildPurchaseOrderOutcomeEmail,/selected\.ID\.toString\(/,'convert the typed User_Access record ID, not the dynamic multi-lookup iterator expression');
for(const [name,source]of Object.entries(sources))assert.doesNotMatch(source,/thisapp\.environment\.type\.\w+\(/,`${name}: bind the environment pseudo-field before calling a string function`);
{
 const h=runtime();h.eval('tables.Settings[0].PO_Approved_Recipients=[{ID:"4410926123456999999"}];');assert.equal(h.call('buildPurchaseOrderOutcomeEmail',PO).success,false,'deleted notification contacts are an explicit preparation failure');assert.equal(h.send().state,'Failed');assert.equal(h.mails.length,0);
}
console.log('PO outcome email backend: contact-only recipients, exact grouped code totals, final-state preflight, per-recipient audit/retries, address-level concurrent deduplication, immutable plans, safe missing-claim resume, unknown no-replay, request-email logs, scoped readers and Dev/Stage/Prod links passed.');
