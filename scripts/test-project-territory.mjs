import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const window={};vm.runInNewContext(fs.readFileSync('widgets/land-master/src/app/project-territory.js','utf8'),{window,Set});
const {plan,apply}=window.LMProjectTerritory;
const p=(id,Territory='')=>({ID:id,Project_Name:'Project '+id,Territory});
const s=(id,pid,Territory)=>({ID:id,Project:{ID:pid},Territory});
const choices=['Waco','Temple/Belton'];
let rows=plan([p('1'),p('2'),p('3','Waco'),p('4'),p('5'),{ID:'6'},p('7')],[s('11','1','Waco'),s('12','1',''),s('21','2','Waco'),s('22','2','Temple/Belton'),s('41','4','Other'),{ID:'71',Project:{ID:'7'}}],choices);
assert.deepEqual(rows.map(r=>r.status),['Ready','Conflicting subdivisions','Already filled','Territory outside global choices','No subdivision Territory','Project Territory unavailable','Subdivision Territory unavailable']);
assert.equal(rows[0].territory,'Waco');assert.throws(()=>plan([p('1'),p('1')],[],choices),/duplicated/);
assert.throws(()=>plan([p('1')],[],[]),/live Territory/);
let writes=0,saved=0,project=p('1'),children=[s('11','1','Waco')];
const api={choices:()=>choices,project:async id=>({...project,ID:id}),subdivisions:async()=>children,write:async(id,t)=>{writes++;project.Territory=t;},saved:()=>saved++};
rows=plan([project],children,choices);let result=await apply(rows,api,()=>{});assert.equal(result.unknown,false);assert.equal(rows[0].status,'Verified');assert.equal(writes,1);assert.equal(saved,1);
project=p('1');rows=plan([project],children,choices);project.Territory='Temple/Belton';await apply(rows,api,()=>{});assert.equal(writes,1);assert.equal(rows[0].status,'Preserved newer value');
project=p('1');rows=plan([project],children,choices);children=[s('11','1','Temple/Belton')];await apply(rows,api,()=>{});assert.equal(writes,1);assert.equal(rows[0].status,'Source changed — skipped');
project=p('1');children=[s('11','1','Waco')];rows=plan([project],children,choices);api.write=async()=>{writes++;project.Territory='Waco';throw Error('Lost acknowledgement');};await apply(rows,api,()=>{});assert.equal(rows[0].status,'Verified','persisted read-back reconciles a lost acknowledgement without another write');assert.equal(writes,2);
project=p('1');rows=plan([project,p('2')],[...children,s('21','2','Waco')],choices);api.write=async()=>{writes++;throw Error('Timeout');};result=await apply(rows,api,()=>{});assert.equal(result.unknown,true);assert.equal(rows[0].status,'Needs review');assert.equal(rows[1].status,'Ready');assert.equal(writes,3,'stop on unknown outcome before sending later rows');
const source=fs.readFileSync('widgets/land-master/src/app/widget.html','utf8');
assert.match(source,/data-scope="subs">Projects/);assert.match(source,/data-edit-project/);assert.match(source,/req:S.editorNew\?1:0/);
const group=source.slice(source.indexOf('function groupSubs('),source.indexOf('\n',source.indexOf('function groupSubs(')));
const ctx={S:{projects:[{ID:'1',Project_Name:'Same'},{ID:'2',Project_Name:'Same'},{ID:'3',Project_Name:'Empty'}],search:'',issuesOnly:false},filterActive:()=>false,lookupId:v=>v?.ID||'',findIn:(a,id)=>a.find(x=>x.ID===id),displayValue:()=>''};vm.runInNewContext(group,ctx);
const groups=ctx.groupSubs([{ID:'11',Project:{ID:'1'}},{ID:'21',Project:{ID:'2'}}]);assert.equal(groups.length,3);assert.equal(groups.find(g=>g.key==='3').items.length,0);assert.equal(groups.filter(g=>g.name==='Same').length,2,'Project IDs keep identical names separate');
console.log('Project territory migration, verified writes, preserved values, unknown-outcome hold and Project groups passed.');
const wiring=source.slice(source.indexOf('var projectTerritoryMigration='),source.indexOf('var lotImport='));
let mounted,readCalls=[];
const wiringContext={LMProjectTerritory:{mount:api=>(mounted=api,{open(){}})},S:{choicesSource:'live'},OPTS:{territory:choices},LandData:{generation:()=>1},loadLocationChoices:async()=>{},sdkGetAll:async(report,criteria)=>{readCalls.push({report,criteria});return report==='All_Projects'?[p('1')]:[s('11','1','Waco')];},$:()=>({addEventListener(){}})};
vm.runInNewContext(wiring,wiringContext);assert.equal((await mounted.snapshot()).projects.length,1);assert.equal((await mounted.project('1')).ID,'1');await mounted.subdivisions('1');assert.equal(readCalls[3].criteria,'(Project == 1)');
console.log('Migration uses actual complete SDK2 read helper and exact Project criteria.');

const territoryExpr=source.match(/F\("Territory","Territory",S.editorNew\?"select":"ro",rec.Territory,\{opts:OPTS.territory,req:S.editorNew\?1:0\}\)/)[0];
for (const editorNew of [false,true]) {
  const descriptor=vm.runInNewContext(territoryExpr,{S:{editorNew},rec:{Territory:'Waco'},OPTS:{territory:choices},F:(k,label,type,v,options)=>({k,type,v,...options})});
  assert.equal(descriptor.type,editorNew?'select':'ro');assert.equal(descriptor.req,editorNew?1:0);
}
console.log('Existing Project Territory is read-only; new Projects require a global choice.');
