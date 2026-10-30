import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import test from 'node:test';

function harness(options={}){
 const storage=options.storage||new Map(),native=options.native||[1,2,3].map(n=>({ID:'90071992547409930'+n,EmployeeName:'Employee '+n,IsActive:true,Territory:'Fresh Territory '+n,Labor_Type:n===1?'Foreman':'Skilled',Crew:''})),calls=[],events=new Map(),nodes=new Map(),ctx={user:'actor',environment:'development',epoch:1};let mode=options.mode||'normal',pending=false,busy=false;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,style:{},dataset:{},textContent:'',innerHTML:'',hidden:false,open:false,disabled:false,parentElement:{setAttribute(){}},setAttribute(){},querySelectorAll:()=>[],replaceChildren(){this.innerHTML='';},showModal(){this.open=true;},close(){this.open=false;},addEventListener(){},focus(){}});return nodes.get(id);};
 const adapter={context:()=>ctx,scope:()=>ctx.user+':'+ctx.environment+':'+ctx.epoch,canWrite:()=>options.readonly!==true,access:rows=>rows.every(r=>native.some(e=>e.ID===r.id)),readFresh:async()=>structuredClone(options.missing?native.slice(0,1):native),setBusy:v=>busy=v,setPending:v=>pending=v,settled(){},refresh:async()=>{},acceptSaved(result,body){assert.equal(result.recordId,body.employee.id);},async api(body,write){calls.push({body:structuredClone(body),write});const row=native.find(r=>r.ID===body.employee.id);if(body.action==='employee-status')return {state:row.Crew===body.employee.crewId?'saved':'unconfirmed',kind:'employee',requestId:body.requestId,recordId:row.ID};if(mode==='reject'&&calls.length===2)throw Object.assign(Error('Native validation rejected this employee.'),{unknown:false});Object.assign(row,{Crew:body.employee.crewId,Territory:body.employee.territory,Labor_Type:body.employee.laborType});if(mode==='lost'){mode='normal';throw Object.assign(Error('Reply lost.'),{unknown:true});}if(mode==='actor-change')ctx.epoch++;return {state:'saved',kind:'employee',requestId:body.requestId,recordId:mode==='wrong-id'?'999':row.ID};}};
 const document={getElementById:node,addEventListener:(name,fn)=>events.set(name,fn)};
 const scope=vm.createContext({document,crypto:{randomUUID},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>{if(options.quota)throw Error('Quota');storage.set(k,v);},removeItem:k=>storage.delete(k)},console,Map,Set,Date,Intl,Math,Number,String,Object});scope.window=scope;
 vm.runInContext(fs.readFileSync('widgets/crew-locations/src/app/crew-model.js','utf8'),scope);vm.runInContext(fs.readFileSync('widgets/crew-locations/src/app/crew-group-assign.js','utf8'),scope);scope.CrewGroupAssign.install(adapter);
 const plan={foremanId:native[0].ID,foremanName:native[0].EmployeeName,crewId:'90071992547408800',crewLabel:'Utility Crew 2',rows:native.map(r=>({id:r.ID,name:r.EmployeeName}))};
 return {app:scope.CrewGroupAssign,plan,native,calls,storage,events,node,ctx,get pending(){return pending;},get busy(){return busy;}};
}
test('group saves every captured active employee once and preserves fresh staffing',async()=>{
 const h=harness();h.plan.rows.push(h.plan.rows[1]);await h.app.start(h.plan);assert.equal(h.calls.length,3);assert.equal(h.app.state.run.rows.length,3);assert.equal(h.app.state.run.phase,'saved');for(const [i,call] of h.calls.entries()){assert.equal(call.body.employee.territory,'Fresh Territory '+(i+1));assert.equal(call.body.employee.laborType,i===0?'Foreman':'Skilled');assert.equal(typeof call.body.employee.id,'string');}assert.equal(h.pending,false);assert.equal(h.busy,false);assert.equal(h.node('groupDialog').open,true,'Terminal result remains mounted');
});
test('unchanged and newly inactive workers are accounted for without writes',async()=>{
 const h=harness();h.native[1].Crew=h.plan.crewId;h.native[2].IsActive=false;await h.app.start(h.plan);assert.equal(h.calls.length,1);assert.deepEqual(Array.from(h.app.state.run.rows,r=>r.state),['saved','unchanged','inactive']);assert.equal(h.native[2].Crew,'');
});
test('a lost reply stops sends, read-only checking never resumes remaining employees',async()=>{
 const h=harness({mode:'lost'});await h.app.start(h.plan);assert.equal(h.calls.length,1);assert.equal(h.pending,true);await h.app.execute();assert.equal(h.calls.length,1);await h.app.check();assert.equal(h.calls.length,2);assert.equal(h.calls[1].write,false);assert.equal(h.app.state.run.phase,'partial');assert.equal(h.pending,false);await h.app.execute();assert.equal(h.calls.filter(c=>c.write).length,3);assert.equal(h.calls.filter(c=>c.write&&c.body.employee.id===h.plan.foremanId).length,1,'Recovered destination is never resent');assert.equal(h.app.state.run.phase,'saved');
});
test('reload restores an uncertain request without writes and keeps exact request identity',async()=>{
 const a=harness({mode:'lost'});await a.app.start(a.plan);const b=harness({storage:a.storage,native:a.native});b.events.get('crew:management-ready')();assert.equal(b.calls.length,0);assert.equal(b.app.state.run.phase,'unknown');await b.app.check();assert.equal(b.calls[0].write,false);assert.equal(b.calls[0].body.requestId,a.calls[0].body.requestId);
});
test('partial rejection stops remaining work; explicit continuation excludes saved people',async()=>{
 const h=harness({mode:'reject'});await h.app.start(h.plan);assert.equal(h.calls.length,2);assert.equal(h.app.state.run.phase,'partial');assert.equal(h.app.state.run.rows[2].state,'waiting');await h.app.execute();assert.equal(h.app.state.run.phase,'saved');assert.equal(h.calls.filter(c=>c.body.employee.id===h.plan.foremanId).length,1);
});
test('preflight visibility, storage failure and read-only rights prevent all writes',async()=>{
 for(const options of [{missing:true},{quota:true},{readonly:true}]){const h=harness(options);await h.app.start(h.plan);assert.equal(h.calls.length,0);}
});
test('wrong destination and actor changes become uncertain and stop further sends',async()=>{
 for(const mode of ['wrong-id','actor-change']){const h=harness({mode});await h.app.start(h.plan);assert.equal(h.calls.length,1);assert.equal(h.app.state.run.phase,'unknown');}
});
test('lost visibility redacts private progress while retaining only checkable recovery intent',async()=>{
 const h=harness({mode:'lost'});await h.app.start(h.plan);assert.equal(h.node('groupDialog').open,true);h.native.splice(1,1);h.events.get('crew:employees-changed')();assert.equal(h.app.state.run,null);assert.equal(h.node('groupDialog').open,false);assert.equal(h.node('groupContext').textContent,'');assert.equal(h.node('groupStatus').textContent,'');assert.equal(h.node('groupResults').innerHTML,'');assert.equal(h.node('groupReview').hidden,false);assert.equal(h.pending,true);assert.equal(h.calls.length,1);
});
test('inactive foreman aborts before any group write',async()=>{
 const h=harness();h.native[0].IsActive=false;await h.app.start(h.plan);assert.equal(h.calls.length,0);assert.match(h.app.state.run.message,/foreman is inactive/i);
});
