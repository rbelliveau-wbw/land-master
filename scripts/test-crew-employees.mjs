import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({window:{},Date,Intl,Map,Set,console});
for(const path of ['crew-employees-model.js','crew-model.js'])vm.runInContext(fs.readFileSync('widgets/crew-locations/src/app/'+path,'utf8'),context);
const {CrewModel:M,CrewEmployeesModel:E}=context.window,day=M.date('2026-10-29');
const employees=[{ID:'900719925474099301',BU_Employee_ID:'FOREMAN-A',EmployeeName:'John Doe',IsActive:true,Labor_Type:'Foreman',Crew:{ID:'900719925474099311'}},{ID:'900719925474099302',BU_Employee_ID:'FOREMAN-B',EmployeeName:'Other Foreman',IsActive:true,Labor_Type:'Foreman',Crew:{ID:'900719925474099312'}}];
const crews=[{ID:'900719925474099311',Crew_Code:'U1',Crew_Name:'Utility Crew 1',Active:true,Badge_Color:'#49688c'},{ID:'900719925474099312',Crew_Code:'RC1',Crew_Name:'Rough Cut 1',Active:'true',Badge_Color:'#8054c7'}];
const card=(id,foreman,date,phase='900719925474099321',extra={})=>({Timecard_ID:id,Foreman_ID:foreman,Work_Date:date,Subdivision1:{ID:phase},IsDeleted:false,...extra});
function model(cards,staff=employees){const model=M.normalize({subdivisions:[{ID:'900719925474099321',Subdivision_Name:'Cameron Ranch'},{ID:'900719925474099322',Subdivision_Name:'Other Ranch'}],crews,employees:staff,timecards:cards,foremanTimecards:true,assignments:[{Crew:{ID:crews[0].ID},Subdivision1:{ID:'900719925474099322'},Assignment_Date:'10/29/2026'}]});M.assignments(model,day);return model;}
{
 const m=model([card('1','foreman-a','10/29/2026'),card('2','FOREMAN-B','2026-10-23'),card('3','FOREMAN-A','2026-10-28','900719925474099322')]);
 assert.deepEqual(Array.from(m.phases[0].crews,c=>c.label),['RC1','U1']);assert.equal(m.phases[1].crews[0].label,'U1');assert.equal(m.phases[0].crews[1].inactive,false);
}
{
 const m=model([card('old','FOREMAN-A','2026-10-22'),card('future','FOREMAN-A','2026-10-30'),card('deleted','FOREMAN-A','2026-10-29',undefined,{IsDeleted:'true'}),card('code-only','WRONG','2026-10-29',undefined,{Foreman_Code:'1696',Foreman_Name:'John Doe'})]);
 assert.equal(m.phases.flatMap(p=>p.crews).length,0,'Exactly seven dates; no future/deleted/name/code-only or manual assignment inference');
}
{
 const m=model([card('1','FOREMAN-A','2026-10-29')],[{...employees[0],IsActive:false}]);assert.equal(m.phases[0].crews[0].inactive,true);assert.match(m.phases[0].crews[0].detail,/Inactive employee/);
 const withoutForeman=model([card('1','FOREMAN-A','2026-10-29')],[{...employees[0],Labor_Type:'Skilled'}]);assert.equal(withoutForeman.phases[0].crews.length,0);
 const duplicate=model([card('1','FOREMAN-A','2026-10-29')],[employees[0],{...employees[0],ID:'other'}]);assert.equal(duplicate.phases[0].crews.length,0);assert.match(duplicate.issues[0],/Ambiguous/);
 const unmapped=model([card('1','FOREMAN-A','2026-10-29','999')]);assert.equal(unmapped.phases[0].crews.length,0);assert.match(unmapped.issues[0],/Unmapped/);
}
assert.equal(E.label({name:'Dry 1',code:'dry-one'}),'Dry1');assert.equal(E.label({name:'Finish 4',code:'Finish4'}),'F4');
for(const [file,source] of [['employee','creator/functions/crewSyncEmployees.dg'],['timecard','creator/functions/crewSyncTimecardsRun.dg']]){
 const s=fs.readFileSync(source,'utf8');assert.ok(s.indexOf('normalized.add')<s.indexOf('insert into'));assert.match(s,/thisapp\.analyticsExportRows\(/);assert.match(s,/"counts":\{/);assert.match(s,/return result;\s*}\s*$/);assert.doesNotMatch(s,/containsKey|\bwhile\s*\(/);
 if(file==='employee'){assert.doesNotMatch(s,/delete from Employees|existing\.(Territory|Labor_Type|Crew)\s*=/);assert.match(s,/existing\.IsActive = employee.get\("active"\)/);}
 else{assert.match(s,/subMonth\(3\)/);assert.ok(s.indexOf('delete from Crew_Timecards')>s.indexOf('update existing'));assert.match(s,/if\(!dryRun\) \{ if\(expiredCandidates > 0\) \{ attempted = true; \} delete from Crew_Timecards\[Work_Date < cutoff\]; \}/);}
}
console.log('PASS: foreman BU identity joins, seven calendar dates, multiple crews/phases, inactive flags, manual/name/code exclusion, unmapped/duplicate guards, native IDs, sync preservation and retention ordering.');

{
 const member={ID:'900719925474099350',BU_Employee_ID:'EMPLOYEE-M',EmployeeName:'Member',IsActive:true,Crew:''};
 const membership=(id,date,foreman='FOREMAN-A',extra={})=>card(id,foreman,date,undefined,{Multi_Line:JSON.stringify({members:['EMPLOYEE-M','EMPLOYEE-M','FOREMAN-A']}),Job_Code:'C_CAM01',...extra});
 const grouped=E.foremanGroups([...employees,member],[membership('1','2026-10-29'),membership('2','2026-10-16'),membership('3','2026-10-15'),membership('4','2026-10-30'),membership('5','2026-10-29','FOREMAN-B'),membership('6','2026-10-29','FOREMAN-A',{IsDeleted:true})],day);
 assert.equal(grouped.length,2);assert.equal(grouped[0].members.size,1);assert.equal(grouped[0].members.get('EMPLOYEE-M').dates.size,2);assert.equal(grouped[1].members.get('EMPLOYEE-M').dates.size,1);assert.equal(member.Crew,'','Review grouping never assigns a crew');
 assert.equal(E.foremanGroups([employees[0]], [membership('1','2026-10-29')],day)[0].members.size,0,'Caller-scoped hidden employees are not exposed');
 assert.throws(()=>E.foremanGroups([...employees,member],[membership('bad','2026-10-29','FOREMAN-A',{Multi_Line:'broken'})],day),/successful sync/);
}
