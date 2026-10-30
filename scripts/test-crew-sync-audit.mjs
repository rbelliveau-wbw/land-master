// Execute the actual Deluge sync bodies with native record/transport fixtures.
// Creator Save/Execute separately verifies native syntax and real audit writes.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
function compile(source){
 const strings=[];
 let s=source.replace(/"(?:\\.|[^"\\])*"/g,x=>'STRINGTOKEN'+(strings.push(x)-1)+'END').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g,'');
 const head=s.match(/^\s*map\s+(\w+)\(bool (\w+)(?:,\s*string (\w+))?\)\s*\{/);
 s=s.replace(head[0],'function '+head[1]+'('+head[2]+(head[3]?','+head[3]:'')+'){');
 const payload=body=>body.trim().split('\n').map(x=>x.trim()).filter(Boolean).map(x=>x.replace(/^(\w+)\s*=\s*(.*)$/,'$1:$2')).join(',');
 s=s.replace(/(\w+)\s*=\s*insert into (\w+)\s*\[([\s\S]*?)\];/g,(_,v,form,body)=>v+'=insertRecord("'+form+'",{'+payload(body)+'});');
 s=s.replace(/update (\w+)\s*\[([\s\S]*?)\];/g,(_,v,body)=>'updateRecord('+v+',{'+payload(body)+'});');
 const criteria=c=>c.replace(/\b(ID|BU_Employee_ID|Timecard_ID|Work_Date|IsDeleted|Multi_Line|External_System|External_Code)\b/g,'row.$1');
 s=s.replace(/delete from (\w+)\[([^\]]+)\];/g,(_,form,c)=>'deleteRecords("'+form+'",row=>'+criteria(c)+');');
 s=s.replace(/\b(Employees|Crew_Timecards|External_System_Mapping|Workflow_Run_Log)\[([^\]]+)\]/g,(_,form,c)=>'queryRecords("'+form+'",row=>'+criteria(c)+')');
 s=s.replace(/\{\s*((?:(?:STRINGTOKEN\d+END|\d+)\s*,\s*)+(?:STRINGTOKEN\d+END|\d+))\s*\}/g,'[$1]');
 s=s.replace(/\.distinct\((\w+)\)/g,'.distinct("$1")');
 s=s.replace(/for each\s+(\w+) in ([^\n{]+)/g,'for ($1 of $2)');
 const vars=[...new Set([...s.matchAll(/(?<![.\w])([A-Za-z_]\w*)\s*=(?!=)/g)].map(m=>m[1]).concat([...s.matchAll(/for \((\w+) of/g)].map(m=>m[1])))].filter(x=>x!==head[2]&&x!==head[3]);
 s=s.replace(/\.length\(\)/g,'.length');
 s=s.replace('{','{var '+vars.join(',')+';').replace(/STRINGTOKEN(\d+)END/g,(_,i)=>strings[+i]);
 s=s.replace('card.get("date") != detailDate','+card.get("date") != +detailDate');
 return {name:head[1],source:s};
}
function bootstrap(){
 function ifnull(x,f){return x==null?f:x;}
 function Map(){return {};}
 function List(){return [];}
 Object.defineProperties(Object.prototype,{toString:{value:function(){return JSON.stringify(this);}},get:{value:function(k){return this[k]??null;}},put:{value:function(k,v){this[k]=v;}},keys:{value:function(){return Object.keys(this);}}});
 Array.prototype.size=function(){return this.length+(this.fixtureSource&&options.wrongSourceCount?1:0);};Array.prototype.contains=function(x){return this.includes(x);};Array.prototype.add=function(x){this.push(x);};
 String.prototype.toMap=function(){return JSON.parse(this);};String.prototype.toLong=function(){return String(this);};String.prototype.matches=function(p){return new RegExp('^(?:'+p+')$').test(this);};String.prototype.left=function(n){return this.slice(0,n);};
 class NativeDate{constructor(s){this.ms=Date.parse(s+'T00:00:00Z');}valueOf(){return this.ms;}toString(){return new Date(this.ms).toISOString().slice(0,10);}subMonth(n){const d=new Date(this.ms);d.setUTCMonth(d.getUTCMonth()-n);return new NativeDate(d.toISOString().slice(0,10));}addDay(n){return new NativeDate(new Date(this.ms+n*86400000).toISOString().slice(0,10));}}
 String.prototype.toDate=function(format){const x=format==='MM/dd/yyyy'?this.slice(6,10)+'-'+this.slice(0,2)+'-'+this.slice(3,5):this;return new NativeDate(x);};
 var options=JSON.parse(optionsJson),tables=JSON.parse(tablesJson),sourceRows=JSON.parse(rowsJson),writes=0;
 sourceRows.fixtureSource=true;
 for(const row of tables.Crew_Timecards||[])row.Work_Date=new NativeDate(row.Work_Date);
 var zoho={loginuser:'fixture@example.test',currentdate:new NativeDate('2026-10-29'),currenttime:'fixture-current-time'};
 function mutate(){writes++;if(options.failWrite===writes)throw 'Fixture native write failure';}
 function queryRecords(form,predicate){const rows=(tables[form]||[]).filter(predicate);return new Proxy(rows,{get(a,k){if(k==='count')return ()=>a.length;if(k==='distinct')return f=>[...new Set(a.map(r=>r[f]))];if(k in a)return a[k];return a[0]?.[k]??null;},set(a,k,v){mutate();a[0][k]=v;return true;}});}
 function insertRecord(form,patch){mutate();const id=String(900000000000001000n+BigInt(writes));(tables[form]??=[]).push({...patch,ID:id});return id;}
 function updateRecord(rows,patch){mutate();for(const row of rows)Object.assign(row,patch);}
 function deleteRecords(form,predicate){deletions.push(form);if(options.failDelete)throw 'Fixture native retention failure';tables[form]=tables[form].filter(r=>!predicate(r));}
 var thisapp={workflowPreparedExportRows(...args){return this.analyticsExportRows(...args);},workflowRunLog(event){events.push(JSON.parse(JSON.stringify(event)));if(options.failStart&&event.action==='start')throw 'Audit start unavailable';if(event.action==='start')return {id:options.badAuditId?'invalid':'441092600000000001'};if(options.failFinish&&event.action==='finish')throw 'Ambiguous audit finish';return {id:event.id};},analyticsExportRows(view,config,auditId,allowEmpty){if(options.exportFailure||!sourceRows.length)throw 'Fixture Analytics export failure';if(view==='2107789000036057124'&&config.selectedColumns.length===2)return options.directory||[{zzz_BUEmployeeID_Guid:'00000000-0000-4000-8000-000000000001',zzz_MasterEmployeeID_Guid:'00000000-0000-4000-8000-000000001001'}];if(view==='2107789000025629150'){if(!allowEmpty)throw 'Labor must allow empty';return options.labor||[];}return sourceRows;}};
 return {ifnull,Map,List,zoho,thisapp,queryRecords,insertRecord,updateRecord,deleteRecords,tables};
}
function run(kind,rows,tables={},options={},dryRun=false){
 if(options.laborMode){tables=structuredClone(tables);tables.Workflow_Run_Log=[{ID:'441092600000000001',Run_Status:'Running',Export_State:JSON.stringify({workflow:'Daily_Crew_Labor',phase:'processing'})}];tables.Crew_Timecards??=rows.map(r=>({ID:r.zzz_TimecardID_Guid,Timecard_ID:r.zzz_TimecardID_Guid,Work_Date:r.Date,Foreman_ID:r.ForemanID,Job_Code:r.JobCode,IsDeleted:r.IsDeleted,Multi_Line:''}));}
 const events=[],deletions=[],c=vm.createContext({rowsJson:JSON.stringify(rows),tablesJson:JSON.stringify(tables),optionsJson:JSON.stringify(options),events,deletions});
 const native=vm.runInContext('('+bootstrap.toString()+')()',c);Object.assign(c,native);
 const body=compile(fs.readFileSync('creator/functions/crewSync'+kind+(kind==='Timecards'?'Run':'')+'.dg','utf8'));vm.runInContext(body.source,c);
 let result,error;try{result=c[body.name](dryRun,options.laborMode?'441092600000000001':'');}catch(e){error=String(e);}
 const eventCopy=JSON.parse(JSON.stringify(events));
 return {result:result?JSON.parse(JSON.stringify(result)):null,error,events:eventCopy,deletions,tables:JSON.parse(JSON.stringify(native.tables)),finish:eventCopy.filter(e=>e.action==='finish')};
}
const guid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const employee=(n,active=true,extra={})=>({zzz_BUEmployeeID_Guid:guid(n),EmployeeName:'Fixture '+n,EmployeeCode:'00'+n,IsActive:active,IsDeleted:false,...extra});
const card=(n,extra={})=>({zzz_TimecardID_Guid:guid(n),Date:'2026-10-29',ForemanID:guid(50),ForemanCode:'0050',ForemanName:'Fixture Foreman',JobCode:'JOB',JobDescription:'Fixture job',IsDeleted:false,...extra});
{
 const rows=[employee(1),employee(2,false,{EmployeeName:''}),employee(3,false)];
 const existing={ID:'900000000000000002',BU_Employee_ID:guid(2),EmployeeName:'Retained name',IsActive:true,Territory:'Fixture territory',Labor_Type:'Foreman',Crew:'900000000000000050'};
 const h=run('Employees',rows,{Employees:[existing]});assert.equal(h.error,undefined);assert.deepEqual(h.finish[0].counts,{received:3,processed:3,created:1,updated:1,skipped:1,failed:0});assert.equal(h.finish[0].status,'Success');
 const saved=h.tables.Employees.find(r=>r.BU_Employee_ID===guid(2));for(const field of ['EmployeeName','Territory','Labor_Type','Crew'])assert.equal(saved[field],existing[field]);assert.equal(saved.IsActive,false);
 const dry=run('Employees',rows,{Employees:[existing]}, {},true);assert.equal(dry.error,undefined);assert.equal(dry.events.length,0);assert.equal(dry.tables.Employees.length,1);assert.equal(dry.tables.Employees[0].IsActive,true);
}
for(const [options,rows,status] of [[{exportFailure:true},[employee(1)],'Failed'],[{},[employee(1),employee(1)],'Failed'],[{failWrite:2},[employee(1),employee(2)],'Partial']]){
 const h=run('Employees',rows,{},options);assert.ok(h.error);assert.equal(h.finish[0].status,status);assert.match(h.finish[0].details,/may roll them back/);if(status==='Partial'){assert.equal(h.finish[0].counts.created,1);assert.equal(h.finish[0].counts.processed,2);}else assert.equal(h.tables.Employees?.length||0,0);
}
{
 const row=employee(1);delete row.EmployeeName;const h=run('Employees',[row]);assert.match(h.error,/missing column/);assert.equal(h.finish[0].status,'Failed');assert.equal(h.finish[0].counts.processed,0);
}
for(const kind of ['Employees','Timecards']){
 const rows=kind==='Employees'?[employee(1)]:[card(1)];
 for(const options of [{failStart:true},{badAuditId:true}]){const h=run(kind,rows,{},options);assert.ok(h.error);assert.equal(h.finish.length,0);assert.equal(h.tables.Employees?.length||h.tables.Crew_Timecards?.length||0,0);}
 const lost=run(kind,rows,{}, {failFinish:true});assert.match(lost.error,/Ambiguous audit finish/);assert.deepEqual(lost.finish.map(e=>e.status),['Success','Partial'],'A separate failure outcome replaces a lost success acknowledgement, matching the other Analytics syncs');assert.equal((lost.tables.Employees||lost.tables.Crew_Timecards).length,1,'Business writes are never replayed');
}
const tables={External_System_Mapping:[{External_System:'HeavyJob',External_Code:'JOB',Subdivision1:'900000000000000050'}],Crew_Timecards:[{ID:'1',Timecard_ID:guid(1),Work_Date:'2026-10-28',IsDeleted:false},{ID:'2',Timecard_ID:guid(20),Work_Date:'2026-10-20',IsDeleted:false},{ID:'3',Timecard_ID:guid(21),Work_Date:'2026-07-28',IsDeleted:false},{ID:'4',Timecard_ID:guid(22),Work_Date:'2026-07-29',IsDeleted:true}]};
{
 const h=run('Timecards',[card(1),card(2,{JobCode:'UNMAPPED'})],tables);assert.equal(h.error,undefined);assert.deepEqual(h.finish[0].counts,{received:2,processed:2,created:1,updated:1,skipped:0,failed:0});assert.equal(h.result.unmapped,1);assert.equal(h.result.tombstoned,1);assert.equal(h.result.expired,1);assert.equal(h.tables.Crew_Timecards.length,4);assert.equal(h.tables.Crew_Timecards.find(r=>r.Timecard_ID===guid(20)).IsDeleted,true);assert.ok(h.tables.Crew_Timecards.some(r=>r.Timecard_ID===guid(22)));assert.match(h.finish[0].details,/unmapped: 1; tombstoned: 1; expired: 1/);
 const dry=run('Timecards',[card(1)],tables,{},true);assert.equal(dry.events.length,0);assert.equal(dry.deletions.length,0);assert.equal(dry.tables.Crew_Timecards.length,4);
}
for(const options of [{failWrite:2},{wrongSourceCount:true},{failDelete:true}]){
 const h=run('Timecards',[card(1),card(2)],{Crew_Timecards:[tables.Crew_Timecards[2]]},options);assert.ok(h.error);assert.equal(h.finish[0].status,'Partial');if(!options.failDelete)assert.equal(h.deletions.length,0,'No retention after a failed import/count reconciliation');else assert.equal(h.result,null);assert.ok(h.tables.Crew_Timecards.some(r=>r.Timecard_ID===guid(21)),'Expired data retained on failure');
}
{
 const h=run('Timecards',[card(1),card(2,{Date:'2026-06-01'})],tables);assert.ok(h.error);assert.equal(h.finish[0].status,'Failed');assert.equal(h.deletions.length,0);assert.equal(h.tables.Crew_Timecards.length,4);
}
// Native-shape labor identities and exact HeavyJob destinations.
{
 const detail=(n,extra={})=>({zzz_TimecardLaborDetailID_Guid:guid(100+n),zzz_TimecardID_Guid:guid(1),zzz_MasterEmployeeID_Guid:guid(1001),ForemanID:guid(50),JobCode:'JOB',Date:'2026-10-29',IsDeleted:false,...extra});
 const roster={Employees:[{ID:'900000000000000001',BU_Employee_ID:guid(1)}],External_System_Mapping:[{External_System:'HeavyJob',External_Code:' job ',Subdivision1:'900000000000000050'},{External_System:'HeavyJob',External_Code:'JOB',Subdivision1:'900000000000000050'},{External_System:'Great Plains',External_Code:'JOB',Subdivision1:'900000000000000099'}]};
 const h=run('Timecards',[card(1)],roster,{laborMode:true,labor:[detail(1),detail(2)]});assert.equal(h.error,undefined);assert.equal(h.result.received,2);assert.equal(h.result.processed,2);assert.equal(h.result.memberships,1);assert.deepEqual(JSON.parse(h.tables.Crew_Timecards[0].Multi_Line),{members:[guid(1)]});
 const conflict=run('Timecards',[card(1)],{...roster,External_System_Mapping:[...roster.External_System_Mapping,{External_System:'HeavyJob',External_Code:'JOB',Subdivision1:'900000000000000051'}]});assert.equal(conflict.result.unmapped,1);assert.deepEqual(conflict.result.ambiguousJobs,['JOB']);assert.equal(conflict.tables.Crew_Timecards[0].Subdivision1,null);
 const stale=run('Timecards',[card(1,{Date:'2026-10-15'})],{...roster,Crew_Timecards:[{ID:'1',Timecard_ID:guid(1),Work_Date:'2026-10-15',IsDeleted:false,Multi_Line:JSON.stringify({members:[guid(1)]})}]},{laborMode:true});assert.equal(stale.error,undefined);assert.deepEqual(JSON.parse(stale.tables.Crew_Timecards[0].Multi_Line),{members:[]});
 for(const labor of [[detail(1,{zzz_TimecardID_Guid:'bad'})],[detail(1,{IsDeleted:'bad'})]]){const bad=run('Timecards',[card(1)],roster,{laborMode:true,labor});assert.ok(bad.error);assert.equal(bad.finish[0].status,'Failed');assert.equal(bad.tables.Crew_Timecards[0].Multi_Line,'');assert.equal(bad.deletions.length,0);}
 const duplicateMaster=run('Timecards',[card(1)],{...roster,Employees:[...roster.Employees,{ID:'900000000000000002',BU_Employee_ID:guid(2)}]},{laborMode:true,labor:[detail(1)],directory:[{zzz_BUEmployeeID_Guid:guid(1),zzz_MasterEmployeeID_Guid:guid(1001)},{zzz_BUEmployeeID_Guid:guid(2),zzz_MasterEmployeeID_Guid:guid(1001)}]});assert.equal(duplicateMaster.result.unmatched,1);assert.deepEqual(JSON.parse(duplicateMaster.tables.Crew_Timecards[0].Multi_Line),{members:[]});
}
console.log('PASS: actual crew sync audit bodies reconcile every source row, preserve staffing/inactive employees, distinguish Failed/Partial, stop without an audit ID, never replay business writes after audit failure, and record unmapped/tombstone/expiry details with retention gates.');


// A planned workflow must also be accepted by the live continuation guard.
const tick=fs.readFileSync('creator/functions/workflowExportTick.dg','utf8'),plan=fs.readFileSync('creator/functions/workflowExportPlan.dg','utf8'),enqueue=fs.readFileSync('creator/functions/workflowExportEnqueue.dg','utf8'),worker=fs.readFileSync('creator/functions/workflowExportRun.dg','utf8');
const allowed=tick.match(/allowed = \{([^}]+)\}/)[1];
for(const key of ['Daily_Crew_Timecards','Daily_Crew_Labor']){assert.ok(allowed.includes('"'+key+'"'));assert.ok(plan.includes('workflow == "'+key+'"'));assert.ok(enqueue.includes('"'+key+'":'));assert.ok(worker.includes('runKey == "'+key+'"'));}
