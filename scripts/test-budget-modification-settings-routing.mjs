// Executes checked-in Deluge bodies offline; this is not native Creator compilation.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';
const names=['resolveApprovalRoute','snapshotApprovalRoute','applySharedApprovalPolicy','createBudgetModification','submitBudgetModification','modificationAdmin'];
function compile(name){
  let source=fs.readFileSync('creator/functions/'+name+'.dg','utf8');
  source=source.replace(/\{((?:"(?:\\.|[^"\\])*"\s*:[^{}\n]+))\}/g,(_,body)=>'delugeMap('+body.replace(/("(?:\\.|[^"\\])*")\s*:/g,'$1,')+')');
  source=source.replace(/\{("(?:\\.|[^"\\])*")\}/g,'[$1]');
  source=source.replace(/insert into (\w+)\s*\[([^\]]+)\]/g,(_,form,fields)=>'insertRecord("'+form+'",delugeMap('+fields.trim().split('\n').map(line=>{const match=line.trim().match(/^(\w+)=(.*)$/);assert.ok(match,line);return JSON.stringify(match[1])+','+match[2];}).join(',')+'))');
  source=source.replace(/delete from (\w+)\[([^\]]+)\];/g,(_,form,criteria)=>'removeRecords("'+form+'",row=>'+criteria.replace(/\b([A-Za-z_]\w*)\s*(==|!=|>=|<=|>|<)/g,'row.$1 $2')+');');
  return translate(source).js.replace(/catch\((\w+)\)\s*\{/g,'catch($1){diagnostics.push($1.message);')+';thisapp.'+name+'='+name+';';
}
const program=names.map(compile).join('\n');
const steps=[{key:'cfo',order:1,roleId:'1',condition:'Always',threshold:'',enabled:true},{key:'coo',order:2,roleId:'2',condition:'Above',threshold:'10000.00',enabled:true}];
const policy={ID:'41',Workflow:'Budget Modification',Status:'Published',Enabled:true,Adapter_Enabled:false,Territory_Key:'',Department_Key:'',Steps_JSON:JSON.stringify(steps)};
const mod={ID:'51',Budget:'71',Budget_Item:'61',Amount:18750,Status:'Draft',Approval_Track:'Construction',Reference_Number:'',Reason:'Landscape architect'};
function runtime({policies=[policy],modifications=[],approvals=[],people=[],snapshotFailure=false}={}){
  const initial={Approval_Policy:policies,Budget_Modification:modifications,Budget_Approvals:approvals,Approval_Route_Snapshot:[],
    Budget_Item:[{ID:'61',Budget:'71',Budget_Category:'81'}],Add_Budget:[{ID:'71',Subdivision1:'91'}],Subdivision:[{ID:'91',Territory:'North'}],
    Approval_Role:[{ID:'1',Role_Name:'CFO',Active:true},{ID:'2',Role_Name:'COO',Active:true}],
    Approval_Role_Assignment:[{ID:'21',Role:'1',Person:'11',Active:true,Territory_Key:'',Department_Key:''},{ID:'22',Role:'2',Person:'12',Active:true,Territory_Key:'',Department_Key:''}],
    User_Access:[{ID:'19',User:'owner',Edit_All_Budgets:true},...['CFO','COO'].map((role,i)=>({ID:String(11+i),User:role.toLowerCase(),Full_Name:role,Approver_Email:role.toLowerCase()+'@example.test',Approval_Routing_Enabled:true,...people.find(p=>p.ID===String(11+i))}))],
    Territory:[],Settings:[{ID:'1',COO_Approval_Threshold:1}]};
  const c=vm.createContext({initial:structuredClone(initial),snapshotFailure});
  vm.runInContext(`
    var tables=JSON.parse(JSON.stringify(initial)),writes=[],emails=[],diagnostics=[],revision=0,thisapp={permissions:{profileForUser(){return '';}}};
    function map(value){Object.defineProperties(value,{get:{value:function(k){return this[k]??null;}},put:{value:function(k,v){this[k]=v;}}});return value;}
    function Map(){return map({});}function List(){return [];}function ifnull(value,fallback){return value==null?fallback:value;}
    function delugeMap(...pairs){var value={};for(var i=0;i<pairs.length;i+=2)value[pairs[i]]=pairs[i+1];return map(value);}
    Array.prototype.add=function(v){this.push(v);};Array.prototype.get=function(i){return this[i]??null;};Array.prototype.count=Array.prototype.size=function(){return this.length;};Array.prototype.contains=function(v){return this.includes(v);};
    Object.prototype.toString=function(){return JSON.stringify(this);};String.prototype.toLong=function(){return BigInt(this);};Number.prototype.toLong=function(){return BigInt(this);};String.prototype.toDecimal=function(){return Number(this);};String.prototype.toDate=function(){return String(this);};String.prototype.toMap=function(){return map(JSON.parse(this));};String.prototype.toJSONList=function(){return JSON.parse(this).map(JSON.stringify);};String.prototype.matches=function(pattern){return new RegExp('^(?:'+pattern+')$').test(this);};String.prototype.replaceAll=function(pattern,value){return this.replace(new RegExp(pattern,'g'),value);};
    var zoho={loginuser:'owner',currentdate:'2026-10-19',currenttime:{toString(){return '20261019120000'+String(++revision).padStart(3,'0');}}};
    var lookups={Budget:'Add_Budget',Budget_Item:'Budget_Item',Budget_Category:'Budget_Category',Budget_Modification:'Budget_Modification',Role:'Approval_Role',Person:'User_Access',Policy:'Approval_Policy',Subdivision1:'Subdivision'};
    function lookup(form,id){var row=(tables[form]||[]).find(row=>row.ID==id)||{ID:String(id)};return new Proxy(row,{get(o,k){if(k==='valueOf')return ()=>BigInt(o.ID);if(k==='toString')return ()=>String(o.ID);return o[k]??null;}});}
    function record(form,row){return new Proxy(row,{get(o,k){if(k in lookups&&o[k]!=null)return lookup(lookups[k],o[k]);return o[k]??null;},set(o,k,v){writes.push({form,id:o.ID,field:k});o[k]=typeof v==='bigint'?v.toString():v;return true;}});}
    function query(form,predicate,sort){var rows=(tables[form]||[]).map(row=>record(form,row)).filter(predicate);if(sort)rows.sort((a,b)=>a[sort]>b[sort]?1:a[sort]<b[sort]?-1:0);return new Proxy(rows,{get(a,k){return k in a||typeof k==='symbol'?a[k]:a[0]?.[k]??null;},set(a,k,v){if(!a.length)throw Error('Missing record');a[0][k]=v;return true;}});}
    function insertRecord(form,data){data.ID=(tables[form].reduce((n,row)=>BigInt(row.ID)>n?BigInt(row.ID):n,100n)+1n).toString();for(var k of Object.keys(data))if(typeof data[k]==='bigint')data[k]=data[k].toString();tables[form].push(data);writes.push({form,id:data.ID,insert:true});return BigInt(data.ID);}
    function removeRecords(form,predicate){tables[form]=tables[form].filter(row=>!predicate(record(form,row)));writes.push({form,remove:true});}
    thisapp.poCurrencyString=function(value){if(!/^[0-9]+(?:[.][0-9]{1,2})?$/.test(value))return '';var parts=value.split('.');return parts[0]+'.'+(parts[1]||'').padEnd(2,'0');};
    thisapp.sendModificationEmail=function(id){var rows=query('Budget_Approvals',row=>row.Budget_Modification==id&&row.Type1==='Modification','Sort_Order'),first=rows[0];if(!first)throw Error('No approval chain');first.Status='Pending';first.Sent_Date='2026-10-19';emails.push({id:String(id),role:first.Title,email:first.Approver});return 'Modification email sent';};
  `+program,c);
  if(snapshotFailure)vm.runInContext('thisapp.snapshotApprovalRoute=function(){return delugeMap("success",false,"error","Snapshot failed");};',c);
  const run=(name,args)=>vm.runInContext('thisapp.'+name+'('+args.map(arg=>JSON.stringify(arg)).join(',')+')',c);
  return {c,run,create:(amount='18750.00')=>run('createBudgetModification',['61','Increase',amount,'Landscape architect','','2026-10-19','Construction']),submit:()=>run('submitBudgetModification',['51']),repair:()=>run('modificationAdmin',['repair','0','71','','','','','']),snapshot:()=>JSON.parse(JSON.stringify(c.tables)),writes:c.writes,emails:c.emails,diagnostics:c.diagnostics};
}
for(const [amount,wanted] of [['9999.99',['CFO']],['10000.00',['CFO']],['10000.01',['CFO','COO']],['18750.00',['CFO','COO']]]){
  const h=runtime(),result=h.create(amount),state=h.snapshot();
  assert.match(result,/Modification \d+ submitted/,JSON.stringify({result,diagnostics:h.diagnostics}));
  assert.deepEqual(state.Budget_Approvals.map(r=>r.Title),wanted);
  assert.deepEqual(state.Budget_Approvals.map(r=>r.Approver),wanted.map(role=>role.toLowerCase()+'@example.test'));
  assert.equal(state.Budget_Modification[0].Status,'Submitted');assert.equal(h.emails.length,1);assert.equal(h.emails[0].role,'CFO');
  assert.equal(state.Approval_Route_Snapshot.length,1,'false adapter flag still permits a captured Settings route');
}
let h=runtime({policies:[{...policy,Steps_JSON:JSON.stringify(steps.map(s=>s.roleId==='2'?{...s,condition:'At or above'}:s))}]});h.create('10000.00');assert.equal(h.snapshot().Budget_Approvals.length,2);
for(const setup of [{policies:[]},{policies:[{...policy,Enabled:false}]},{policies:[policy,{...policy,ID:'42'}]},{people:[{ID:'12',Approval_Routing_Enabled:false}]}]){
  h=runtime(setup);assert.match(h.create(),/^ERROR: Approval routing unavailable/);assert.equal(h.writes.length,0);assert.equal(h.emails.length,0);
}
h=runtime({snapshotFailure:true});assert.match(h.create(),/Modification \d+ recorded as Draft\. Approval template failed/);assert.equal(h.snapshot().Budget_Modification[0].Status,'Draft');assert.equal(h.emails.length,0);
h=runtime({modifications:[mod]});assert.match(h.submit(),/^OK:/);assert.deepEqual(h.snapshot().Budget_Approvals.map(r=>r.Title),['CFO','COO']);assert.equal(h.emails[0].email,'cfo@example.test');
const oldRows=['VP','CFO','COO'].map((Title,i)=>({ID:String(201+i),Budget:'71',Budget_Modification:'51',Type1:'Modification',Sort_Order:i+1,Title,Approver:'old@example.test',Status:'Not Sent',Sent_Date:null,Responded_Date:null,Approval_Notes:''}));
h=runtime({modifications:[mod],approvals:oldRows});assert.match(h.submit(),/^OK:/);assert.deepEqual(h.snapshot().Budget_Approvals.filter(r=>r.Budget_Modification==='51').map(r=>r.Title),['CFO','COO']);
const pendingRows=oldRows.map((r,i)=>({...r,Status:i?'Not Sent':'Pending',Sent_Date:i?null:'2026-10-18'}));
h=runtime({modifications:[{...mod,Status:'Submitted'}],approvals:pendingRows,policies:[]});const before=h.snapshot();assert.match(h.submit(),/already submitted/);assert.deepEqual(h.snapshot(),before);assert.equal(h.emails.length,0);
h=runtime({policies:[],modifications:[mod]});assert.match(h.submit(),/^ERROR:/);assert.equal(h.writes.length,0);assert.equal(h.emails.length,0);
const orphan={...oldRows[0],ID:'299',Budget_Modification:null,Status:'Approved',Approval_Notes:'Historical orphan'};
h=runtime({modifications:[{...mod,Status:'Submitted'},{...mod,ID:'52'},{...mod,ID:'53',Status:'Submitted',Reference_Number:'PO:fixture'}],approvals:[orphan]});assert.match(h.repair(),/rebuilt=1/);
assert.deepEqual(h.snapshot().Budget_Approvals.find(r=>r.ID==='299'),orphan,'repair never guesses ownership or deletes orphan history');
const repaired=h.snapshot().Budget_Approvals.filter(r=>r.Budget_Modification==='51');assert.deepEqual(repaired.map(r=>r.Title),['CFO','COO']);assert.ok(repaired.every(r=>r.Status==='Not Sent'&&r.Sent_Date==null));assert.equal(h.emails.length,0);
const repairedBefore=h.snapshot();assert.match(h.repair(),/rebuilt=0/);assert.deepEqual(h.snapshot(),repairedBefore,'repeat repair does not rebuild or stamp a chain');
h=runtime({policies:[],modifications:[{...mod,Status:'Submitted'}]});assert.match(h.repair(),/^ERROR: Settings approval routing failed/);assert.equal(h.writes.length,0);assert.equal(h.emails.length,0);
console.log('PASS: actual modification create/submit/repair and native policy/snapshot bodies use published Settings routes without adapter flags; exact threshold boundaries, no placeholder fallback, preflight denial, captured recipients, Draft recovery, existing history, PO isolation and no fake repair email stamps.');

// A recorded Draft is identified and surfaced immediately, rather than entering
// a success poll or inviting a duplicate create after a routing failure.
const widget=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8');
const progressSource=widget.slice(widget.indexOf('function openModificationProgress('),widget.indexOf('\n$("approvalProgressClose")'));
const progress=vm.createContext({Promise,requireBudgetModsReady:()=>true,S:{modifications:[]},$:()=>({}),approvalProgress:null,approvalProgressButtons(){},startApprovalProgressAttempt(){},budgetFunctionResultText:value=>value,auditLog(){},finishApprovalProgress(p,kind,message){p.terminal=kind;p.message=message;},scheduleApprovalProgressCheck(){progress.checks++;},checks:0});
vm.runInContext(progressSource,progress);
progress.openModificationProgress('','71',null,()=>Promise.resolve('OK: Modification 9007199254740993 recorded as Draft. Approval template failed: Snapshot failed'));
await Promise.resolve();await Promise.resolve();
assert.equal(progress.approvalProgress.modificationId,'9007199254740993');assert.equal(progress.approvalProgress.terminal,'error');assert.equal(progress.checks,0);assert.match(progress.approvalProgress.message,/recorded as Draft/);
progress.approvalProgress=null;progress.openModificationProgress('','71',null,()=>Promise.resolve('OK: Modification 9007199254740994 submitted. Modification email sent'));
await Promise.resolve();await Promise.resolve();
assert.equal(progress.approvalProgress.modificationId,'9007199254740994');assert.equal(progress.checks,1,'successful submissions retain targeted native reconciliation');
