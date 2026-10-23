// Executes the actual additive Deluge block with native-style map/date fixtures.
// Native Creator Save independently verifies vendor syntax and field availability.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const action=fs.readFileSync('creator/integration-audit/overrides/Sync_Final_Acceptance_Due.action-1.dg','utf8');
const start=action.indexOf('// Construction dates are independent');
const end=action.indexOf('\n\tauditCounts = ',start);
const extension=action.slice(start,end);
function translate(source){
  const strings=[];
  let code=source.replace(/"(?:\\.|[^"\\])*"/g,value=>'STRINGTOKEN'+(strings.push(value)-1)+'END');
  code=code.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g,'').replace(/^\s*info [^\n]*;\s*$/gm,'');
  code=code.replace(/update scheduleSubdivision\s*\[([\s\S]*?)\];/g,(_,fields)=>'{ nativeUpdates++; '+fields.trim().split('\n').map(line=>'scheduleSubdivision.'+line.trim()+';').join('\n')+' }');
  code=code.replace(/([,(=])\s*if\(/g,'$1delugeIf(');
  code=code.replace(/Subdivision\[Subdivision_Code in scheduleCandidateCodes\]/g,'findSubdivisions(scheduleCandidateCodes)');
  code=code.replace(/\{\s*((?:STRINGTOKEN\d+END\s*,\s*)+STRINGTOKEN\d+END)\s*\}/g,'[$1]');
  code=code.replace(/for each\s+(\w+) in ([^\n{]+)/g,'for ($1 of $2)');
  const variables=[...new Set([...code.matchAll(/(?<![.\w])([A-Za-z_]\w*)\s*=(?!=)/g)].map(m=>m[1]).concat([...code.matchAll(/for \((\w+) of/g)].map(m=>m[1])))];
  code='var '+variables.join(',')+';\n'+code;
  return code.replace(/STRINGTOKEN(\d+)END/g,(_,index)=>strings[Number(index)]);
}
const compiled=translate(extension);
const scopeBuilder=translate(action.slice(action.indexOf('syncScopeCodes = Subdivision['),action.indexOf('\n\t\tprojectConfig = Map();'))
  .replace('Subdivision[ID != 0].distinct(Subdivision_Code)','fixtureScopeCodes'));
{
  const c=vm.createContext({fixtureScopeCodes:['EXAMPLE',"O'NEIL",null,'']});
  vm.runInContext(scopeBuilder,c);
  assert.equal(c.syncScopeSql,"'','EXAMPLE','O''NEIL'",'SQL literals escape apostrophes and ignore blank/null codes');
  assert.match(action,/projectConfig\.put\("criteria","\(\\"Projects \(Zoho Projects\)\\"\.\\"Project Code\\" IN/);
  assert.match(action,/taskConfig\.put\("criteria",[^\n]+Final Acceptance[^\n]+Accept - Muni/,'Acceptance retains its proven compact task-name filter');
  assert.doesNotMatch(action,/syncProjectIdsSql|taskConfig\.put\("criteria",[^\n]+Project ID[^\n]+IN/,'Acceptance export must not construct a long ID list that can cause HTTP 414');
  assert.match(action,/if\(projectCode == null \|\| !syncScopeCodes\.contains\(projectCode\)\)/,'Acceptance tasks are still scoped locally before parsing dates');
}
const M='2107789000014058199', T='2107789000014196812';
const pid='Projects (Zoho Projects).Project ID', pcode='Projects (Zoho Projects).Project Code';
const projectId='900719925474099312345';
const m=(code='EXAMPLE',patch={})=>({[pid]:projectId,[pcode]:code,'Const Plans Release':'2027-03-04 00:00:00','Const Start':'03/20/2027','Rough Start Date':'03-25-2027',...patch});
const t=(code='EXAMPLE',patch={})=>({[pid]:projectId,[pcode]:code,'CP Rel Est (EST. Comp Date)':'2027-03-02',...patch});
const subdivision=(code='EXAMPLE',id='900719925474099398765')=>({ID:id,Subdivision_Code:code,CP_Release_Goal:'old-goal',CP_Release_Estimate:'old-estimate',Construction_Start_Goal:'old-start-goal',Construction_Start_Estimate:'old-start-estimate',Final_Acceptance_Due_Date:'old-acceptance'});
function execute({milestones=[m()],tasks=[t()],subdivisions=[subdivision()],ambiguous=[],review=0,failView='',projectCodes={[projectId]:'EXAMPLE'},dryRun=false}={}){
  const c=vm.createContext({fixtureSources:JSON.stringify({[M]:milestones,[T]:tasks}),fixtureSubdivisions:JSON.stringify(subdivisions),fixtureCodes:JSON.stringify(projectCodes),fixtureAmbiguous:JSON.stringify(ambiguous),reviewCount:review,dryRun,failView,calls:[]});
  vm.runInContext(`
    function Map(){return {};} function List(){return [];} function ifnull(v,f){return v==null?f:v;}
    function delugeIf(c,a,b){return c?a:b;}
    Object.defineProperties(Object.prototype,{get:{value:function(k){return this[k]??null;}},put:{value:function(k,v){this[k]=v;}},keys:{value:function(){return Object.keys(this);}},toString:{value:function(){return JSON.stringify(this);}},size:{value:function(){return Object.keys(this).length;}}});
    Array.prototype.add=function(v){this.push(v);};Array.prototype.contains=function(v){return this.includes(v);};Array.prototype.size=function(){return this.length;};Array.prototype.intersect=function(values){return [...new Set(this.filter(value=>values.includes(value)))];};
    function canonical(value){return value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;}
    Array.prototype.distinct=function(){const seen=new Set(),result=this.filter(value=>{const key=JSON.stringify(canonical(value));if(seen.has(key))return false;seen.add(key);return true;});distinctCounts.push({before:this.length,after:result.length});return result;};
    String.prototype.matches=function(p){return new RegExp('^(?:'+p+')$').test(this);};String.prototype.subString=function(a,b){return this.substring(a,b);};String.prototype.left=function(n){return this.slice(0,n);};
    String.prototype.toDate=function(format){
      parseCount++;let y,m,d;const s=String(this);
      if(format==='yyyy-MM-dd'){[y,m,d]=s.split('-').map(Number);}
      else if(format==='MM-dd-yyyy'){[m,d,y]=s.split('-').map(Number);}
      else if(format==='MM/dd/yyyy'){[m,d,y]=s.split('/').map(Number);}
      else if(format==='dd MMM, yyyy'){const match=s.match(/^(\\d{2}) ([A-Za-z]{3}), (\\d{4})$/);if(!match)throw new Error('Invalid text month date');d=Number(match[1]);m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(match[2])+1;y=Number(match[3]);}
      else throw new Error('Unknown date format');
      const date=new Date(Date.UTC(y,m-1,d));if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)throw new Error('Invalid calendar date');
      return date.toISOString().slice(0,10);
    };
    var sources=JSON.parse(fixtureSources),subdivisions=JSON.parse(fixtureSubdivisions),codeByProject=JSON.parse(fixtureCodes),ambiguousCodes=JSON.parse(fixtureAmbiguous),parseCount=0,nativeUpdates=0,distinctCounts=[];
    var syncScopeCodes=[...new Set(subdivisions.map(s=>s.Subdivision_Code))],syncScopeSql="''"+syncScopeCodes.map(code=>",'"+code.replaceAll("'","''")+"'").join('');
    var auditId='fixture',auditReceived=0,auditProcessed=0,auditMissingMapping=0,auditSkipped=0,auditUpdatedIds=[],auditUpdated=0,auditWriteAttempted=false;
    var thisapp={analyticsExportRows(view,config,id,allowEmpty){calls.push({view,config,id,allowEmpty});if(view===failView)throw new Error('Export failed');var rows=sources[view];if(!allowEmpty&&!rows.length)throw new Error('Unexpected empty export');return rows;}};
    function findSubdivisions(codes){return subdivisions.filter(s=>codes.includes(s.Subdivision_Code));}
  `,c);
  let error;try{vm.runInContext(compiled,c);}catch(e){error=String(e);}
  return {c,error,rows:JSON.parse(vm.runInContext('JSON.stringify(subdivisions)',c))};
}
{
  const r=execute({review:3});assert.equal(r.error,undefined);
  assert.deepEqual(r.rows[0],{...subdivision(),CP_Release_Goal:'2027-03-04',CP_Release_Estimate:'2027-03-02',Construction_Start_Goal:'2027-03-20',Construction_Start_Estimate:'2027-03-25'});
  assert.equal(r.c.reviewCount,3,'Acceptance review does not gate new fields');assert.equal(r.c.auditUpdated,1,'Count each destination once');
  assert.equal(r.c.calls.length,2);assert.equal(r.c.calls[0].allowEmpty,true);assert.equal(r.c.calls[1].allowEmpty,true);
  assert.equal(r.c.calls[0].config.criteria,undefined,'M uses its cached project rollup plus an early local scope check');
  assert.equal(r.c.calls[1].config.criteria,undefined,'T also reuses its cached query before native map deduplication and local scope');
  assert.equal(r.c.nativeUpdates,1,'Four eligible fields use one native multi-field update task');
  assert.deepEqual(Array.from(r.c.calls[0].config.selectedColumns),[pid,pcode,'Const Plans Release','Const Start','Rough Start Date']);
}
{
  const r=execute({milestones:[m('EXAMPLE',{'Const Plans Release':null,'Const Start':'','Rough Start Date':null})],tasks:[t('EXAMPLE',{'CP Rel Est (EST. Comp Date)':null})]});
  for(const field of ['CP_Release_Goal','CP_Release_Estimate','Construction_Start_Goal','Construction_Start_Estimate'])assert.equal(r.rows[0][field],null,'Explicit source null clears stale field');
  assert.equal(r.rows[0].Final_Acceptance_Due_Date,'old-acceptance');
}
{
  const r=execute({tasks:[t(),t()]});assert.equal(r.error,undefined);assert.equal(r.c.reviewCount,0,'Identical joined task values do not conflict');
  const conflict=execute({tasks:[t(),t('EXAMPLE',{'CP Rel Est (EST. Comp Date)':'2027-03-03'})]});
  assert.equal(conflict.rows[0].CP_Release_Estimate,'old-estimate');assert.equal(conflict.rows[0].CP_Release_Goal,'2027-03-04');assert.equal(conflict.c.reviewCount,1);
}
{
  const r=execute({milestones:[m('EXAMPLE',{'Const Plans Release':'2027-02-30'})]});
  assert.equal(r.rows[0].CP_Release_Goal,'old-goal');assert.equal(r.rows[0].Construction_Start_Goal,'2027-03-20');assert.equal(r.c.reviewCount,1);
}
{
  const r=execute({tasks:[t('OTHER',{[pid]:'other-project'})],projectCodes:{[projectId]:'EXAMPLE','other-project':'OTHER'}});
  assert.equal(r.rows[0].CP_Release_Estimate,'old-estimate','Absent source row preserves old estimate');assert.equal(r.rows[0].CP_Release_Goal,'2027-03-04');
}
for(const config of [{subdivisions:[subdivision(),subdivision('EXAMPLE','second-id')]},{ambiguous:['EXAMPLE']},{milestones:[m('EXAMPLE',{[pid]:'wrong-project'})],tasks:[t('EXAMPLE',{[pid]:'wrong-project'})]}]){
  const r=execute(config);assert.equal(r.error,undefined);for(const s of r.rows)assert.equal(s.CP_Release_Goal,'old-goal');assert.equal(r.c.auditUpdated,0);assert.ok(r.c.reviewCount>0);
}
for(const config of [{failView:M},{failView:T},{milestones:[m('EXAMPLE',{'Const Start':undefined})]}]){
  const r=execute(config);assert.ok(r.error);assert.equal(r.rows[0].CP_Release_Goal,'old-goal','Both sources validate before any construction assignment');assert.equal(r.c.auditUpdated,0);
}
{
  const r=execute({milestones:[],tasks:[]});assert.equal(r.error,undefined);assert.equal(r.rows[0].CP_Release_Goal,'old-goal');assert.equal(r.c.auditUpdated,0,'Legitimately empty scoped exports preserve all dates');
  const named=execute({milestones:[m('EXAMPLE',{'Const Plans Release':'25 Jun, 2021 00:00:00','Const Start':'01 Dec, 2020 23:59:00','Rough Start Date':'06 Apr, 2026 12:00:00'})],tasks:[t('EXAMPLE',{'CP Rel Est (EST. Comp Date)':'05 Sep, 2024 00:00:00'})]});
  assert.equal(named.rows[0].CP_Release_Goal,'2021-06-25');assert.equal(named.rows[0].Construction_Start_Goal,'2020-12-01');assert.equal(named.rows[0].Construction_Start_Estimate,'2026-04-06');assert.equal(named.rows[0].CP_Release_Estimate,'2024-09-05');assert.equal(named.c.reviewCount,0);
  const invalid=execute({milestones:[m('EXAMPLE',{'Const Plans Release':'31 Feb, 2027 00:00:00'})]});assert.equal(invalid.rows[0].CP_Release_Goal,'old-goal');assert.equal(invalid.rows[0].Construction_Start_Goal,'2027-03-20');
  const many=execute({milestones:[...Array.from({length:344},(_,i)=>m('IRRELEVANT'+i)),m()],tasks:Array.from({length:30131},()=>t())});
  assert.equal(many.error,undefined);assert.equal(many.c.parseCount,4,'Unmapped rows and identical joined task rows never enter date parsing');assert.equal(many.c.auditUpdated,1);
  assert.deepEqual(JSON.parse(JSON.stringify(many.c.distinctCounts[1])),{before:30131,after:1},'Native-style deduplication happens before the per-row loop');
  const cohort=Array.from({length:344},(_,i)=>({code:'PHASE'+i,id:projectId+i}));
  const full=execute({milestones:cohort.map(p=>m(p.code,{[pid]:p.id})),tasks:cohort.map(p=>t(p.code,{[pid]:p.id})),subdivisions:cohort.map(p=>subdivision(p.code,'subdivision-'+p.id)),projectCodes:Object.fromEntries(cohort.map(p=>[p.id,p.code]))});
  assert.equal(full.error,undefined);assert.equal(full.c.nativeUpdates,344);assert.equal(full.c.auditUpdated,344);assert.equal(full.c.parseCount,4,'Repeated dates across a complete project cohort reuse successful native parses');assert.equal(full.c.reviewCount,0);
  full.c.fixtureDistinctRows=JSON.stringify([{code:'EXAMPLE',id:'1',date:'2027-01-01'},{date:'2027-01-01',id:'1',code:'EXAMPLE'},{code:'EXAMPLE',id:'1',date:'2027-01-01'},{code:'EXAMPLE',id:'1',date:null},{code:'EXAMPLE',id:'1'},{code:'EXAMPLE',id:'1',date:'2027-01-02'},{code:'EXAMPLE',id:'2',date:'2027-01-01'},{code:'OTHER',id:'1',date:'2027-01-01'}]);
  assert.equal(vm.runInContext('JSON.parse(fixtureDistinctRows).distinct().length',full.c),6,'Mirror the native-proved flat-map distinct fixture, including key order and null versus absent');
}
{
  const r=execute({dryRun:true});assert.equal(r.rows[0].CP_Release_Goal,'old-goal');assert.equal(r.c.auditUpdated,0);
}
const finalization=action.slice(action.indexOf('\n\tauditCounts = ',start),action.indexOf('}catch (auditError)'));
assert.doesNotMatch(finalization,/\bthrow\b/,'Review-only completion must not roll back unambiguous construction writes');
assert.match(finalization,/auditFinalStatus = "Partial"/);
assert.match(finalization,/auditCounts\.put\("failed",reviewCount\)/);
assert.match(action,/conflictRule = "REVIEW"/);
assert.equal(action.match(/subdiv\.Final_Acceptance_Due_Date=selectedDate;/g)?.length,1,'Existing acceptance destination stays singular');
assert.match(action,/"workflow":"Zoho Projects - Sync Subdivision Schedule Dates"/);
assert.ok(action.indexOf('scheduleRows = scheduleRows.distinct();')<action.indexOf('for each scheduleRow in scheduleRows'),'Deduplicate selected flat maps before iterating');
console.log('PASS: actual schedule-date Deluge block covers scoped SQL/escaping, captured month-name dates, early skips/duplicate fingerprints, query columns, large text IDs, independent acceptance review, null clearing, absent rows, conflicting values, invalid dates, ambiguous mappings, export failures, dry run and Partial completion.');
