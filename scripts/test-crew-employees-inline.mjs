import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';

// Exercise the real employee controller and its installed picker handlers.
// Native preparation/update semantics are covered separately by the Crew API suites.
function harness(mode='normal'){
 const nodes=new Map(),calls=[],storage=new Map(),context={user:'actor',environment:'development',epoch:1,busy:false,unknown:false};let sequence=0;
 const document={body:null,activeElement:null,querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){},createElement:tag=>node('created:'+tag),createDocumentFragment:()=>({append(){}}),getElementById:id=>node(id)};
 function node(id){if(nodes.has(id))return nodes.get(id);const n={id,dataset:{},style:{},children:[],hidden:false,disabled:false,isConnected:true,textContent:'',innerHTML:'',offsetWidth:300,open:false,
  setAttribute(key,value){this[key]=value;},querySelectorAll:()=>[],querySelector:selector=>node(id+':'+selector),contains:()=>false,closest:()=>null,addEventListener(){},append(){},replaceChildren(){},getBoundingClientRect:()=>({left:100,top:100,bottom:130}),focus(){document.activeElement=this;},showModal(){this.open=true;},close(){this.open=false;}};nodes.set(id,n);return n;}
 document.body=node('body');document.activeElement=document.body;
 const bridge={context:()=>context,permissions:()=>({assignments:mode!=='readonly'}),model:()=>({phases:[{territory:'North'}]}),setPending(value){context.unknown=value;},reload:()=>new Promise(()=>{}),async api(body){calls.push(structuredClone(body));if(mode==='reject')throw Error('Native staffing validation rejected this assignment.');if(mode==='lost')throw Object.assign(Error('Save reply lost.'),{unknown:true});if(mode==='actor-change')context.epoch++;return {state:'saved',requestId:body.requestId,recordId:body.employee.id,kind:'employee'};}};
 const scope=vm.createContext({document,console,Date,Intl,Map,Set,Object,String,Number,Math,innerWidth:1280,innerHeight:800,crypto:{randomUUID:()=>String(++sequence)},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},LMSuccess:{show(){}},LMMotion:{refresh(){}},CrewManager:{newCrew(){}},LMRuntime:{}});scope.window=scope;scope.addEventListener=()=>{};scope.CrewApp={management:bridge};
 for(const file of ['crew-employees-model.js','crew-model.js'])vm.runInContext(fs.readFileSync('widgets/crew-locations/src/app/'+file,'utf8'),scope);
 const source=fs.readFileSync('widgets/crew-locations/src/app/crew-employees.js','utf8').replace('install,load,state:S','install,load,state:S,inline,save');vm.runInContext(source,scope);
 const controller=scope.CrewEmployees,S=controller.state;
 const employee={ID:'90071992547408802',EmployeeName:'Sample Employee',Employee_Code:'100',BU_Employee_ID:'MEMBER',IsActive:true,Territory:'North',Labor_Type:'Skilled',Crew:''};
 Object.assign(S,{ready:true,canAssign:true,rows:[employee],crews:[],scope:'actor:development:1'});controller.install();
 const button=node('inline-button');button.dataset={employeeInline:employee.ID,field:'laborType'};
 function choose(value){const option=node('option');option.dataset.employeeOption=value;nodes.get('employeeInlinePicker').onclick({target:{closest:selector=>selector==='[data-employee-option]'?option:null}});}
 return {controller,S,employee,button,choose,node,calls,storage,context};
}
test('inline options use native string identities, preserve other staffing and skip unchanged choices',async()=>{
 const h=harness();h.controller.inline(h.button);h.choose('Skilled');assert.equal(h.calls.length,0);
 h.controller.inline(h.button);h.choose('Laborer');await new Promise(setImmediate);
 assert.equal(h.calls.length,1);assert.deepEqual(h.calls[0].employee,{id:h.employee.ID,territory:'North',laborType:'Laborer',crewId:''});assert.equal(h.employee.Labor_Type,'Laborer');assert.equal(h.storage.size,0);assert.equal(h.S.pending,null);assert.equal(h.node('employeeEditor').open,false);
});
test('inactive and read-only employees cannot open an inline write',()=>{
 for(const mode of ['normal','readonly']){const h=harness(mode);if(mode==='normal')h.employee.IsActive=false;h.controller.inline(h.button);assert.equal(h.S.picker,null);assert.equal(h.calls.length,0);}
});
test('native rejection leaves acknowledged staffing untouched and exposes the real error',async()=>{
 const h=harness('reject');h.controller.inline(h.button);h.S.draft.laborType='Laborer';await h.controller.save();assert.equal(h.employee.Labor_Type,'Skilled');assert.match(h.node('employeeStatus').textContent,/Native staffing validation/);assert.equal(h.storage.size,0);assert.equal(h.calls.length,1);
});
test('lost reply opens existing read-only recovery and blocks duplicate writes',async()=>{
 const h=harness('lost');h.controller.inline(h.button);h.S.draft.laborType='Laborer';await h.controller.save();assert.equal(h.S.pending.employee.id,h.employee.ID);assert.equal(h.storage.size,1);assert.equal(h.node('employeeEditor').open,true);assert.equal(h.node('employeeCheck').hidden,false);assert.equal(h.employee.Labor_Type,'Skilled');await h.controller.save();assert.equal(h.calls.length,1);
});
test('an actor change during a save never applies the prior actor reply',async()=>{
 const h=harness('actor-change');h.controller.inline(h.button);h.S.draft.laborType='Laborer';await h.controller.save();assert.equal(h.employee.Labor_Type,'Skilled');assert.equal(h.calls.length,1);
});
