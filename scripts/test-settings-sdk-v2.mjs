import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app = 'widgets/settings-manager/src/app/';
const html = fs.readFileSync(app+'widget.html','utf8');
const inline = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
assert.match(html,/widgets\/version\/2\.0\/widgetsdk-min\.js/);
assert.doesNotMatch(inline,/CREATOR\.API|CREATOR\.init\(|window\.(?:confirm|alert|prompt)\(|beforeunload|ENC_MODES|tryUpdate/);
assert.doesNotMatch(inline,/function (?:apiUpdate|apiAdd|apiDelete|getAll)\(/,'Unused transport entry points cannot bypass controller readiness');
assert.equal(fs.readFileSync(app+'creator-data.js','utf8'),fs.readFileSync('shared/creator-data.js','utf8'));
assert.equal(fs.readFileSync(app+'runtime-context.js','utf8'),fs.readFileSync('widgets/land-master/src/app/runtime-context.js','utf8'));
const ID='4410926000000769023', OTHER='4410926000000769024', A='4410926000000769123', B='4410926000000769124', D='4410926000000769125';
const clone=value=>JSON.parse(JSON.stringify(value));
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
async function drain(){for(let index=0;index<90;index++)await Promise.resolve();}
function harness({initialize=async()=>({envUrlFragment:'/environment/development',loginUser:'fixture',appLinkName:'land-master'}),count=1,embedded=true,creator=true,controllerSource}={}){
  const calls=[],warnings=[],nodes=new Map(),timers=new Map(),listeners=new Map();let timerId=0,handshakes=0,active=0,maxActive=0;
  const document={referrer:'',activeElement:null,body:null,getElementById:id=>node(id),createElement:tag=>node(null,tag),addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);},querySelector:selector=>selector.startsWith('[data-frow=')?node('row:'+selector.match(/"([^"]+)"/)[1]):selector==='.hdr'?node('header'):null,querySelectorAll(selector){
    if(selector==='[data-f],[data-chipinput]')return ['Multi_Line','Future_Field','Builder_Approval_Template','COO_Approval_Threshold'].map(field=>{const el=node('input:'+field);el.attrs['data-f']=field;return el;});
    if(selector==='[data-msel]')return ['Builder_Approval_Template','Builder_Contract_Action_Template'].map(field=>{const el=node('ms:'+field);el.attrs['data-msel']=field;return el;});
    if(selector==='[data-cf],[data-delcurve],#addCurve')return [node('addCurve'),node('curveInput'),node('curveDelete')];
    return [];
  }};
  function node(id,tag='div'){
    if(id&&nodes.has(id))return nodes.get(id);
    const classes=new Set(),handlers=new Map();let text='',markup='';
    const el={id,tagName:tag.toUpperCase(),attrs:{},style:{},children:[],disabled:false,hidden:false,inert:false,value:'',className:'',scrollHeight:50,
      classList:{add(...values){values.forEach(value=>classes.add(value));},remove(...values){values.forEach(value=>classes.delete(value));},contains:value=>classes.has(value),toggle(value,force){if(force===undefined)force=!classes.has(value);if(force)classes.add(value);else classes.delete(value);}},
      getAttribute:key=>el.attrs[key]||'',hasAttribute:key=>Object.hasOwn(el.attrs,key),setAttribute(key,value){el.attrs[key]=String(value);},focus(){document.activeElement=el;},getBoundingClientRect:()=>({top:0}),scrollIntoView(){},appendChild(child){el.children.push(child);return child;},
      closest(selector){return selector==='[data-frow]'?node('row:'+(el.attrs['data-f']||el.attrs['data-chipinput'])):null;},
      addEventListener(type,fn){if(!handlers.has(type))handlers.set(type,[]);handlers.get(type).push(fn);},handlers,
      async fire(type,event){for(const fn of handlers.get(type)||[])await fn(event);},
      querySelector:selector=>node(id+':'+selector),querySelectorAll:selector=>selector==='button'?['[data-curve-close]','[data-curve-cancel]','[data-curve-delete]'].map(selector=>node(id+':'+selector)):[]};
    Object.defineProperty(el,'textContent',{get:()=>text,set(value){text=String(value);}});
    Object.defineProperty(el,'innerHTML',{get:()=>markup,set(value){markup=String(value);el.htmlWrites=(el.htmlWrites||0)+1;}});
    if(id)nodes.set(id,el);return el;
  }
  document.body=node('body');
  const records=Array.from({length:count},(_,index)=>({ID:index?OTHER:ID,Multi_Line:'persisted',Future_Field:'future',Builder_Approval_Template:[{ID:A,zc_display_value:'Unresolved approval'}],Builder_Contract_Action_Template:[],COO_Approval_Threshold:'10,000.00'}));
  const curves=[{ID:B,Settings:{ID},Cost_Curve:'7',Month_Number:'1',Percent_Cost:'100',Pro_Forma:{ID:A,zc_display_value:'Unresolved PF'},Template_Item:true}];
  const reports={All_Settings:records,All_Construction_Curves:curves,All_Contract_Approvals:[],All_Contract_Actions:[],All_Pro_Formas:[]};
  function selected(config){const rows=reports[config.report_name]||[];const match=(config.criteria||'').match(/(?:\(|^)ID == (\d+)/);const parent=(config.criteria||'').match(/Settings == (\d+)/);return rows.filter(row=>(!match||row.ID===match[1])&&(!parent||(typeof row.Settings==='object'?row.Settings.ID:row.Settings)===parent[1]));}
  function counted(method,config,fn){calls.push({method,config:clone(config)});active++;maxActive=Math.max(maxActive,active);return Promise.resolve().then(fn).finally(()=>active--);}
  const api={
    getRecordCount:config=>counted('count',config,()=>({code:3000,result:{records_count:String(selected(config).length)}})),
    getRecords:config=>counted('records',config,()=>{const rows=selected(config),start=Number(config.record_cursor||0);return{code:3000,data:clone(rows.slice(start,start+1000)),...(start+1000<rows.length?{record_cursor:String(start+1000)}:{})};}),
    updateRecordById:config=>counted('update',config,()=>{const row=(reports[config.report_name]||[]).find(row=>row.ID===config.id);Object.assign(row,clone(config.payload.data));return{code:3000,data:{ID:config.id}};}),
    addRecords:config=>counted('add',config,()=>{assert.equal(config.form_name,'Construction_Curve');const newId=D;curves.push({ID:newId,...clone(config.payload.data)});return{code:3000,result:[{code:3000,data:{ID:newId}}]};}),
    deleteRecords:config=>counted('delete',config,()=>{const target=config.payload.criteria.match(/ID == (\d+)/)[1];const at=curves.findIndex(row=>row.ID===target);if(at>=0)curves.splice(at,1);return{code:3000,result:[{code:3000,data:{ID:target}}]};})
  };
  const context=vm.createContext({document,location:{href:'https://example.test/dev/settings-manager/'},setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),console:{warn(message){warnings.push(String(message));}},ZOHO:creator?{CREATOR:{DATA:api,UTIL:{getInitParams(){handshakes++;return initialize();},navigateParentURL:config=>{calls.push({method:'navigate',config});}}}}:undefined});
  context.window=context;context.parent=embedded?{}:context;context.addEventListener=(type,fn)=>{if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);};
  for(const file of ['runtime-context.js','creator-data.js','settings-controller.js'])vm.runInContext(file==='settings-controller.js'&&controllerSource!==undefined?controllerSource:fs.readFileSync(app+file,'utf8'),context);
  const expose='window.__settingsTest={state:S,controller:Controller,boot:boot,load:loadData,queue:queue,flush:flush,value:curVal,render:render,wire:wire,other:otherCard,multi:multiSelect,curveRow:curveRow,curveEdit:curveEdit,add:addCurve,remove:deleteCurve,close:closeCurveDialog};\n';
  vm.runInContext(inline.replace(/boot\(\);\s*\}\)\(\);\s*$/,expose+'boot();\n\n})();'),context);
  assert.ok(context.__settingsTest,'Whole source IIFE test exposure found');
  return{context,widget:context.__settingsTest,api,reports,records,curves,calls,warnings,nodes,node,timers,listeners,handshakes:()=>handshakes,maxActive:()=>maxActive,
    tick(ms){const entry=[...timers].find(([,timer])=>timer.ms===ms);assert.ok(entry,'Timer '+ms+' exists');timers.delete(entry[0]);entry[1].fn();}};
}
async function ready(options){const h=harness(options);await drain();assert.equal(h.widget.state.ready,true);return h;}

// Replay the observed 1.3.3 filtered-count failure through its immutable actual
// controller and the whole widget IIFE. This fixture is not a new native test.
{
  const previous=fs.readFileSync('releases/settings-manager/1.3.3/settings-controller.js','utf8');
  assert.match(previous,/\['actions',C\.actionsReport,'Contract_Template != ""'\]/);
  const h=harness({controllerSource:previous}),native=h.api.getRecordCount,failed=[];
  h.records[0].Builder_Contract_Action_Template=Array.from({length:7},(_,index)=>({ID:String(900000000000000100n+BigInt(index)),zc_display_value:'Persisted '+index}));
  h.api.getRecordCount=config=>{
    if(config.report_name==='All_Contract_Actions'&&config.criteria==='Contract_Template != ""'){failed.push(clone(config));return Promise.reject({message:'Native count failure without a code'});}
    return native(config);
  };
  await drain();assert.equal(failed.length,1);assert.equal(h.widget.state.resources.actions,'error');assert.equal(h.widget.state.rec.Builder_Contract_Action_Template.length,7);assert.equal(h.widget.controller.canEdit('Builder_Contract_Action_Template'),false);assert.equal(h.calls.filter(call=>call.method==='records'&&call.config.report_name==='All_Contract_Actions').length,0);
}
{
  const h=harness(),native=h.api.getRecordCount,filtered=[];
  const templates=[true,false,'true',' FALSE ','Yes','No','1','0',1,0,'',null,'   ',' TrUe '];
  h.reports.All_Contract_Actions=templates.map((Template_Action,index)=>({ID:String(900000000000000010n+BigInt(index)),Template_Action,Contract_Action:'Action '+index,Type_field:'Builder',Sort_Order:String(index+1),Contract_Template:index%2?'Former template':''}));
  const original=clone(h.reports.All_Contract_Actions),expected=[0,2,4,6,8,13].map(index=>original[index].ID);
  const persisted=expected.concat([original[1].ID,'900000000000000098','900000000000000097']).map(ID=>({ID,zc_display_value:'Persisted '+ID}));
  h.records[0].Builder_Contract_Action_Template=clone(persisted);
  h.api.getRecordCount=config=>{
    if(config.report_name==='All_Contract_Actions'&&config.criteria){filtered.push(clone(config));return Promise.reject({message:'Native count failure without a code'});}
    return native(config);
  };
  await drain();assert.equal(filtered.length,0);assert.equal(h.widget.state.resources.actions,'ready');assert.deepEqual(clone(h.widget.state.actions.map(row=>row.ID)),expected,'Only checked Template Action rows qualify; the removed Contract_Template never changes eligibility');assert.deepEqual(h.reports.All_Contract_Actions,original,'Filtering must not alter native rows or their lookup shapes');
  const reads=h.calls.filter(call=>['count','records'].includes(call.method)&&call.config.report_name==='All_Contract_Actions');assert.equal(reads.length,2);assert.ok(reads.every(call=>!Object.hasOwn(call.config,'criteria')),'Count and records read the same complete report without the rejected predicate');
  assert.match(h.widget.multi({n:'Builder_Contract_Action_Template',src:'actions'},persisted),/Action 0/,'Picker labels use the current Contract_Action field');assert.doesNotMatch(h.widget.multi({n:'Builder_Contract_Action_Template',src:'actions'},persisted),/Former template/,'Removed template text does not supply labels or metadata');
  assert.ok(h.calls.filter(call=>['count','records'].includes(call.method)&&call.config.report_name==='All_Contract_Approvals').every(call=>call.config.criteria==='Contract_Template == "Builder"'),'The user-authorized Actions rule does not change Builder approval eligibility');
  assert.deepEqual(clone(h.widget.state.rec.Builder_Contract_Action_Template),persisted,'Unchecked and unresolved saved IDs remain selected');assert.match(h.widget.multi({n:'Builder_Contract_Action_Template',src:'actions'},persisted),/900000000000000098/);assert.equal(h.widget.controller.canEdit('Builder_Contract_Action_Template'),true);assert.equal(h.calls.filter(call=>['update','add','delete'].includes(call.method)).length,0,'Loading the eligible choices never prunes saved selections with a write');
  assert.equal(h.widget.queue('Builder_Contract_Action_Template',persisted.map(row=>row.ID)),true);await h.widget.flush();assert.deepEqual(clone(h.widget.state.rec.Builder_Contract_Action_Template),persisted.map(row=>row.ID).sort());assert.equal(h.calls.filter(call=>call.method==='update').length,1,'Known and unresolved selected IDs retain exact native write/readback verification');
}
{
  const h=await ready();h.reports.All_Contract_Actions=Array.from({length:2001},(_,index)=>({ID:String(900000000000010000n+BigInt(index)),Template_Action:index%2===1,Contract_Action:'Complete '+index}));await h.widget.load();assert.equal(h.widget.state.resources.actions,'ready');assert.equal(h.widget.state.actions.length,1000);const reads=h.calls.filter(call=>call.method==='records'&&call.config.report_name==='All_Contract_Actions');assert.equal(reads.length,3,'Every complete unfiltered cursor page precedes local checkbox filtering; a counted empty report needs no page');assert.ok(h.maxActive()<=3);
}
for(const failure of ['count','duplicate','missing-id','incomplete','missing-template','malformed-template','unknown-template']){
  const h=await ready();h.reports.All_Contract_Actions=[{ID:A,Template_Action:true,Contract_Action:'Retained action'}];h.records[0].Builder_Contract_Action_Template=[{ID:A,zc_display_value:'Selected action'},{ID:D,zc_display_value:'Unresolved selected'}];await h.widget.load();const old=h.widget.state.actions,selected=clone(h.widget.state.rec.Builder_Contract_Action_Template),nativeCount=h.api.getRecordCount,nativeRead=h.api.getRecords;
  const replacement=[{ID:B,Template_Action:true,Contract_Action:'Incomplete replacement'},{ID:D,Template_Action:false,Contract_Action:'Unchecked row'}];
  h.reports.All_Contract_Actions=replacement;
  if(failure==='count')h.api.getRecordCount=config=>config.report_name==='All_Contract_Actions'?Promise.reject({message:'Native count failure without a code'}):nativeCount(config);
  else if(failure==='duplicate')replacement[1].ID=B;
  else if(failure==='missing-id')delete replacement[1].ID;
  else if(failure==='incomplete')h.api.getRecords=config=>config.report_name==='All_Contract_Actions'?Promise.resolve({code:3000,data:[clone(replacement[0])]}):nativeRead(config);
  else if(failure==='missing-template')delete replacement[1].Template_Action;
  else if(failure==='malformed-template')replacement[1].Template_Action={display_value:{name:'Unsupported'}};
  else replacement[1].Template_Action='Maybe';
  const before=h.calls.filter(call=>['update','add','delete'].includes(call.method)).length;await h.widget.load();assert.equal(h.widget.state.resources.actions,'error',failure);assert.equal(h.widget.state.actions,old,'A failed complete lookup scope keeps the previous rows unavailable');assert.deepEqual(clone(h.widget.state.rec.Builder_Contract_Action_Template),selected);assert.equal(h.widget.controller.canEdit('Builder_Contract_Action_Template'),false);assert.equal(h.widget.queue('Builder_Contract_Action_Template',[B]),false);assert.equal(h.widget.controller.canEdit('Multi_Line'),true,'The optional lookup failure does not change scalar grants');assert.equal(h.calls.filter(call=>['update','add','delete'].includes(call.method)).length,before);
  h.api.getRecordCount=nativeCount;h.api.getRecords=nativeRead;h.reports.All_Contract_Actions=[{ID:B,Template_Action:true,Contract_Action:'Fresh complete action'}];await h.widget.load();assert.equal(h.widget.state.resources.actions,'ready');assert.equal(h.widget.controller.canEdit('Builder_Contract_Action_Template'),true);assert.deepEqual(clone(h.widget.state.rec.Builder_Contract_Action_Template),selected,'Successful complete retry retains unresolved persisted selection IDs');
}

for(const response of [{code:3000,status:'failure',result:{records_count:'1'}},{code:3000,success:false,result:{records_count:'1'}},{code:3000,error:['Denied'],result:{records_count:'1'}},{code:3000,result:{code:2898,records_count:'1'}}]){
  const h=harness();h.api.getRecordCount=async()=>response;await drain();assert.equal(h.widget.state.ready,false);assert.equal(h.widget.state.loadBlocked,true);assert.equal(h.widget.controller.canEdit(),false);assert.equal(h.calls.filter(call=>call.method==='records'||call.method==='add'||call.method==='update').length,0,'Malformed/denied count cannot claim an empty or complete singleton');
}
{
  const h=harness({count:0});await drain();assert.equal(h.widget.state.ready,false);assert.equal(h.widget.controller.canEdit(),false);assert.match(h.node('wrap').innerHTML,/No Settings record exists/);assert.equal(h.calls.filter(call=>call.method==='add').length,0);
}

{
  const h=await ready({count:2});assert.equal(h.handshakes(),1);assert.equal(h.widget.state.recCount,2);assert.equal(h.widget.state.recId,ID);assert.match(h.node('wrap').innerHTML,/2 Settings records exist/);assert.equal(h.widget.controller.canEdit('Multi_Line'),true,'Existing duplicate warning preserves selected-row editing');
  assert.ok(h.calls.filter(call=>call.method==='records').every(call=>call.config.field_config==='all'&&call.config.max_records===1000));assert.ok(h.maxActive()<=3);
  assert.match(h.widget.other(),/Future Field/);assert.match(h.widget.multi({n:'Builder_Approval_Template',src:'approvals'},h.records[0].Builder_Approval_Template),new RegExp(A));assert.match(h.widget.multi({n:'Builder_Approval_Template',src:'approvals'},h.records[0].Builder_Approval_Template),/not in list/);assert.match(h.widget.curveRow(h.curves[0]),/Unresolved PF/);
  const handlers=h.node('wrap').handlers;h.widget.render();h.widget.render();assert.equal(handlers.get('change').length,1);assert.equal(handlers.get('input').length,2);assert.equal(h.listeners.get('click').length,1,'Repeated rendering does not multiply document handlers');
  assert.equal(h.widget.queue('Missing_Field','invented'),false);assert.equal(h.calls.filter(call=>call.method==='add').length,0);assert.equal(h.widget.controller.mutate,undefined,'Native mutation stays private to guarded captured operations');
}
{
  const h=await ready();assert.equal(h.widget.queue('Multi_Line','draft'),true);assert.equal(h.widget.queue('Future_Field','new future'),true);assert.equal(h.node('reload').disabled,true);assert.equal(await h.widget.load(),false);h.tick(700);await drain();
  const writes=h.calls.filter(call=>call.method==='update');assert.equal(writes.length,1);assert.deepEqual(writes[0].config,{report_name:'All_Settings',id:ID,payload:{data:{Multi_Line:'draft',Future_Field:'new future'}}});assert.equal(h.widget.state.drafts.Multi_Line,undefined);assert.equal(h.records[0].Future_Field,'new future');assert.match(h.node('row:Multi_Line:.tick').innerHTML,/Verified saved/);assert.ok(h.calls.some(call=>call.method==='count'&&call.config.criteria==='(ID == '+ID+')'));
}
{
  const h=await ready(),held=deferred(),native=h.api.updateRecordById;
  h.api.updateRecordById=config=>held.promise.then(()=>native(config));h.widget.queue('Multi_Line','older');const saving=h.widget.flush();await drain();
  assert.equal(h.widget.value('Multi_Line'),'older');assert.equal(Object.isFrozen(h.widget.state.inflight.values),true);assert.equal(h.node('openrec').disabled,true);assert.equal(await h.widget.load(),false);
  h.widget.queue('Multi_Line','newer');h.widget.render();assert.match(h.node('wrap').innerHTML,/newer/);held.resolve();await saving;
  assert.equal(h.widget.value('Multi_Line'),'newer');assert.equal(h.widget.state.rec.Multi_Line,'older');assert.doesNotMatch(h.node('row:Multi_Line:.tick').innerHTML,/Verified saved/);assert.equal(h.widget.state.drafts.Multi_Line.status,'queued');await h.widget.flush();assert.equal(h.widget.value('Multi_Line'),'newer');assert.equal(h.widget.state.drafts.Multi_Line,undefined);
}
for(const response of [{code:2945,message:'Invalid input'},{code:3000,result:[{code:2899,message:'No permission'}]},{code:3000,result:[{code:3000,data:{ID}},{code:2899,message:'No permission'}]},{code:3000,status:' FAILURE ',data:{ID}},{code:3000,success:false,data:{ID}},{code:3000,result:[{code:3000,status:'failure',data:{ID}}]},{code:3000},{code:3000,result:[]},{code:3000,data:{ID:Number(ID)}},{code:3000,data:{ID:OTHER}},{}]){
  const h=await ready();let writes=0;h.api.updateRecordById=async()=>{writes++;return response;};h.widget.queue('Future_Field','failed future');let failure;await assert.rejects(h.widget.flush(),error=>{failure=error;return true;});assert.equal(writes,1);assert.equal(h.widget.value('Future_Field'),'failed future');h.widget.render();assert.match(h.widget.other(),/failed future/);assert.doesNotMatch(h.node('row:Future_Field:.tick').innerHTML,/Verified saved/);assert.equal(await h.widget.load(),false);
  if(response.code===2945)assert.equal(failure.code,'2945');if(response.result?.some(item=>item.code===2899))assert.equal(failure.code,'2899');
  await h.widget.controller.recheck().catch(()=>{});assert.equal(writes,1,'Read-only recheck never repeats a failed or uncertain mutation');
  if(h.widget.state.uncertain){assert.equal(h.widget.queue('Multi_Line','blocked after unknown'),false);await assert.rejects(h.widget.controller.curveOperation('add','',{}));assert.equal(h.widget.controller.canEdit(),false);assert.equal(h.widget.controller.mutate,undefined);assert.equal(writes,1);}
}
for(const response of [
  {code:3000,data:{ID:OTHER},result:[{code:3000,data:{ID}}]},
  {code:3000,data:{ID},result:[{code:3000,data:{ID}}]},
  {code:3000,result:[{code:3000,data:{ID},result:[{code:2899,message:'Nested denial'}]}]},
  {code:3000,result:[{code:3000,data:{ID},result:[]}]},
  {code:3000,result:[{code:3000,data:{ID},result:{code:3000,data:{ID}}}]},
  {code:3000,result:[{code:3000,data:{ID}},{code:3000,data:{ID}}]},
  {code:3000,data:{ID,error:'Denied'}},
  {code:3000,data:{ID,status:' FAILURE '}},
  {code:3000,data:{ID,success:false}},
  {code:3000,data:{ID,code:2899}},
  {code:3000,result:[{code:3000,data:{ID,error:'Denied'}}]},
  {code:3000,result:[{code:3000,data:{ID,status:'error'}}]},
  {code:3000,result:[{code:3000,data:{ID,success:false}}]},
  {code:3000,result:[{code:3000,data:{ID,code:2899}}]}
]){
  const h=await ready();let writes=0;h.api.updateRecordById=async()=>{writes++;return response;};h.widget.queue('Multi_Line','captured exact scalar');h.widget.queue('Builder_Approval_Template',[A,B]);let failure;await assert.rejects(h.widget.flush(),error=>{failure=error;return true;});assert.equal(failure.outcome,'unknown');assert.equal(failure.noReplay,true);assert.equal(failure.response,response);assert.equal(failure.raw,response);assert.equal(writes,1);assert.equal(h.widget.value('Multi_Line'),'captured exact scalar');assert.equal(h.widget.controller.canEdit(),false);assert.doesNotMatch(h.node('row:Multi_Line:.tick').innerHTML,/Verified saved/);await assert.rejects(h.widget.flush());assert.equal(writes,1);
  if(response.data?.code===2899||response.result?.[0]?.data?.code===2899)assert.equal(failure.code,'2899','Raw acknowledgement-data failure code is preserved as unknown');
  h.records[0].Multi_Line='captured exact scalar';h.records[0].Builder_Approval_Template=[{ID:A},{ID:D}];await assert.rejects(h.widget.controller.recheck(),/did not match/);assert.equal(writes,1);assert.ok(h.widget.state.uncertain,'same-count wrong lookup IDs cannot settle the uncertain scalar+lookup batch');h.records[0].Builder_Approval_Template=[{ID:B},{ID:A}];await h.widget.controller.recheck();assert.equal(writes,1,'Exact fresh manual recheck never resends the malformed acknowledgement write');assert.equal(h.widget.controller.hasDrafts(),false);assert.match(h.node('row:Multi_Line:.tick').innerHTML,/Verified saved/);
}
{
  const h=await ready();h.records[0].Future_Lookup={ID:A,zc_display_value:'Unresolved future lookup'};h.records[0].Future_Multi=[{ID:A,zc_display_value:'Unresolved future list'}];await h.widget.load();assert.match(h.widget.other(),new RegExp('value="'+A+'"'));h.widget.queue('Future_Lookup',B);h.widget.queue('Future_Multi',A+','+B);await h.widget.flush();const write=h.calls.filter(call=>call.method==='update').at(-1);assert.equal(write.config.payload.data.Future_Lookup,B);assert.deepEqual(write.config.payload.data.Future_Multi,[A,B]);assert.equal(h.widget.state.drafts.Future_Multi,undefined);
  h.widget.queue('Future_Multi',[]);await h.widget.flush();h.widget.queue('Future_Multi',A+','+B);await h.widget.flush();assert.deepEqual(h.calls.filter(call=>call.method==='update').at(-1).config.payload.data.Future_Multi,[A,B]);
}
{
  const h=await ready();h.records[0].Approval_Reminder_Interval_Days='3';await h.widget.load();assert.equal(h.widget.queue('Approval_Reminder_Interval_Days','1.5'),false);assert.equal(h.widget.value('Approval_Reminder_Interval_Days'),'1.5');assert.equal(h.calls.filter(call=>call.method==='update').length,0);assert.equal(h.node('reload').disabled,true);h.widget.queue('Approval_Reminder_Interval_Days','4');await h.widget.flush();assert.equal(h.widget.value('Approval_Reminder_Interval_Days'),'4');
  const count=h.calls.filter(call=>call.method==='update').length;await assert.rejects(h.widget.controller.curveOperation('edit',B,{Month_Number:'1.5'}),/whole month/);assert.equal(h.calls.filter(call=>call.method==='update').length,count);assert.equal(h.widget.state.curveDrafts[B].values.Month_Number,'1.5');
  assert.equal(h.widget.controller.discardRejected(),true);await h.widget.controller.curveOperation('edit',B,{Month_Number:'2'});assert.equal(h.widget.state.curve[0].Month_Number,'2');assert.equal(h.calls.filter(call=>call.method==='update').length,count+1,'Discarded local rejection cannot retain a stale failed promise');
}
{
  const h=await ready();h.api.updateRecordById=async()=>({code:2945,message:'Definitive rejected edit'});h.widget.queue('Multi_Line','rejected but retained');await assert.rejects(h.widget.flush());assert.equal(h.widget.value('Multi_Line'),'rejected but retained');assert.equal(h.widget.state.uncertain,null);assert.equal(h.widget.controller.discardRejected(),true);assert.equal(h.widget.value('Multi_Line'),'persisted');assert.equal(h.widget.controller.hasDrafts(),false);
  await assert.rejects(h.widget.controller.curveOperation('edit',B,{Percent_Cost:'99'}));assert.equal(h.widget.state.curveDrafts[B].values.Percent_Cost,'99');assert.equal(h.widget.controller.discardRejected(),true);assert.equal(h.widget.state.curve[0].Percent_Cost,'100');assert.equal(h.widget.controller.curveAllowed(),true);
}
for(const readback of ['missing','denied','wrong IDs','extra IDs','missing field','duplicate IDs']){
  const h=await ready();let writes=0;h.api.updateRecordById=async()=>{writes++;return{code:3000,data:{ID}};};const native=h.api.getRecords;
  h.api.getRecords=config=>config.report_name==='All_Settings'&&config.criteria?readback==='denied'?Promise.reject({code:2898,message:'No permission'}):Promise.resolve({code:3000,data:readback==='missing'?[]:[{ID,...(readback==='missing field'?{}:{Builder_Approval_Template:readback==='wrong IDs'?[B,D]:readback==='extra IDs'?[A,B,D]:[A,A]})}]}):native(config);
  h.widget.queue('Builder_Approval_Template',[A,B]);await assert.rejects(h.widget.flush());assert.equal(writes,1);assert.deepEqual(Array.from(h.widget.value('Builder_Approval_Template')),[A,B]);assert.ok(h.widget.state.uncertain);assert.doesNotMatch(h.node('row:Builder_Approval_Template:.tick').innerHTML,/Verified saved/);
  h.api.getRecords=native;h.records[0].Builder_Approval_Template=[{ID:B},{ID:A}];await h.widget.controller.recheck();assert.equal(writes,1);assert.equal(h.widget.state.drafts.Builder_Approval_Template,undefined);assert.equal(h.widget.state.uncertain,null);
}
{
  const h=await ready(),native=h.api.getRecords;h.widget.queue('Multi_Line','persisted but response uncertain');h.api.getRecords=config=>config.report_name==='All_Settings'&&config.criteria?Promise.resolve({code:3000,status:'failure',data:clone(h.records)}):native(config);await assert.rejects(h.widget.flush());assert.equal(h.records[0].Multi_Line,'persisted but response uncertain');assert.ok(h.widget.state.uncertain);assert.doesNotMatch(h.node('row:Multi_Line:.tick').innerHTML,/Verified saved/);h.api.getRecords=native;await h.widget.controller.recheck();assert.equal(h.calls.filter(call=>call.method==='update').length,1);
}
{
  const h=await ready(),held=deferred();let writes=0;h.api.updateRecordById=config=>{writes++;Object.assign(h.records[0],clone(config.payload.data));return held.promise;};h.widget.queue('Multi_Line','older applied');const saving=h.widget.flush();await drain();h.widget.queue('Multi_Line','newer retained');held.reject(new Error('Lost response'));await assert.rejects(saving);assert.equal(h.widget.value('Multi_Line'),'newer retained');assert.equal(h.widget.queue('Future_Field','blocked after loss'),false);await h.widget.controller.recheck();assert.equal(h.widget.value('Multi_Line'),'newer retained');assert.equal(writes,1);assert.equal(h.widget.state.drafts.Multi_Line.status,'queued');
}
{
  const h=await ready(),held=deferred(),native=h.api.updateRecordById;h.api.updateRecordById=config=>held.promise.then(()=>native(config));h.widget.queue('Multi_Line','captured');const saving=h.widget.flush();await drain();h.widget.state.recId=OTHER;held.resolve();await assert.rejects(saving,/selected Settings record changed/);assert.equal(h.records[0].Multi_Line,'captured');assert.doesNotMatch(h.node('row:Multi_Line:.tick').innerHTML,/Verified saved/);assert.equal(h.calls.filter(call=>call.method==='count'&&call.config.criteria==='(ID == '+OTHER+')').length,0);
}
{
  const h=await ready(),held=deferred(),native=h.api.updateRecordById;h.api.updateRecordById=config=>held.promise.then(()=>native(config));h.widget.queue('Multi_Line','captured actor');const saving=h.widget.flush();await drain();h.context.LMRuntime.apply({envUrlFragment:'',loginUser:'different actor'});held.resolve();await assert.rejects(saving,/session changed/);assert.equal(h.widget.value('Multi_Line'),'captured actor');assert.equal(h.widget.controller.canEdit(),false);assert.doesNotMatch(h.node('row:Multi_Line:.tick').innerHTML,/Verified saved/);
}
{
  const h=await ready(),held=deferred(),native=h.api.getRecords,old=h.widget.state.rec;
  h.api.getRecords=config=>config.report_name==='All_Settings'&&!config.criteria?held.promise:native(config);const loading=h.widget.load();await drain();assert.equal(h.widget.state.rec,old);assert.equal(h.widget.controller.canEdit('Multi_Line'),false);assert.equal(h.node('input:Multi_Line').disabled,true);assert.equal(h.widget.queue('Multi_Line','mid-read draft'),false);assert.equal(h.widget.value('Multi_Line'),'persisted');
  await assert.rejects(h.widget.controller.curveOperation('edit',B,{Percent_Cost:'99'}));await assert.rejects(h.widget.flush());assert.equal(h.widget.controller.mutate,undefined);assert.equal(h.calls.filter(call=>['update','add','delete'].includes(call.method)).length,0);
  held.resolve({code:3000,data:[{...clone(h.records[0]),Multi_Line:'fresh'}]});await loading;assert.equal(h.widget.value('Multi_Line'),'fresh');assert.equal(h.widget.controller.canEdit(),true);
  h.api.getRecords=native;h.records[0].ID=OTHER;await h.widget.load();assert.equal(h.widget.state.recId,ID);assert.equal(h.widget.value('Multi_Line'),'fresh');assert.equal(h.widget.controller.canEdit(),false,'Disappeared selected singleton does not silently switch IDs');
}
{
  const h=await ready(),native=h.api.getRecordCount,old=h.widget.state.curve;
  h.api.getRecordCount=config=>config.report_name==='All_Construction_Curves'||config.report_name==='All_Contract_Approvals'?Promise.reject({code:2898,message:'Denied'}):native(config);
  await h.widget.load();assert.equal(h.widget.state.resources.curve,'error');assert.equal(h.widget.state.curve,old);assert.match(h.node('wrap').innerHTML,/Curve rows unavailable/);assert.equal(h.widget.controller.curveAllowed(),false);assert.equal(h.widget.controller.canEdit('Builder_Approval_Template'),false);assert.equal(h.widget.controller.canEdit('Multi_Line'),true);assert.match(h.widget.multi({n:'Builder_Approval_Template',src:'approvals'},h.widget.state.rec.Builder_Approval_Template),new RegExp(A));
}
{
  const h=await ready();h.reports.All_Pro_Formas=Array.from({length:2001},(_,index)=>({ID:String(10000+index),Pro_Forma_Name:'PF '+index}));await h.widget.load();assert.equal(h.widget.state.proformas.length,2001);assert.ok(h.maxActive()<=3);const previous=h.widget.state.proformas;h.api.getRecords=async config=>({code:3000,data:clone(config.report_name==='All_Pro_Formas'?h.reports.All_Pro_Formas.slice(0,1000):h.reports[config.report_name]||[])});await h.widget.load();assert.equal(h.widget.state.resources.proformas,'error');assert.equal(h.widget.state.proformas,previous,'Incomplete options retain the complete snapshot but stay unavailable');
  const diagnostic=h.warnings.find(message=>message.startsWith('Settings resource unavailable '));assert.ok(diagnostic);assert.deepEqual(Object.keys(JSON.parse(diagnostic.slice('Settings resource unavailable '.length))),['resource','message','code']);assert.doesNotMatch(diagnostic,/PF 100|Pro_Forma_Name/,'Diagnostics omit report rows');
}
{
  const h=await ready();await h.widget.controller.curveOperation('edit',B,{Percent_Cost:'99'});assert.equal(h.widget.state.curve[0].Percent_Cost,'99');const edit=h.calls.find(call=>call.method==='update');assert.equal(edit.config.report_name,'All_Construction_Curves');assert.equal(edit.config.id,B);
  await h.widget.controller.curveOperation('add','',{});assert.equal(h.widget.state.curve.length,2);assert.deepEqual(h.calls.find(call=>call.method==='add').config,{form_name:'Construction_Curve',payload:{data:{Settings:ID}}});await h.widget.controller.curveOperation('delete',D,{});assert.equal(h.widget.state.curve.length,1);assert.deepEqual(h.calls.find(call=>call.method==='delete').config,{report_name:'All_Construction_Curves',payload:{criteria:'(ID == '+D+')'}});assert.equal(h.calls.filter(call=>call.method==='add'&&call.config.form_name==='Settings').length,0);assert.equal(h.widget.controller.mutate,undefined);
}
{
  const h=await ready(),held=deferred(),native=h.api.updateRecordById;h.api.updateRecordById=config=>held.promise.then(()=>native(config));const saving=h.widget.controller.curveOperation('edit',B,{Percent_Cost:'99'});await drain();assert.equal(h.widget.controller.canEdit('Multi_Line'),false);assert.equal(h.widget.queue('Multi_Line','blocked'),false);assert.equal(await h.widget.load(),false);const duplicate=h.widget.controller.curveOperation('edit',B,{Percent_Cost:'88'});held.resolve();await saving;await duplicate;assert.equal(h.calls.filter(call=>call.method==='update').length,1);assert.equal(h.widget.state.curve[0].Percent_Cost,'99');
}
for(const action of ['edit','delete','add']){
  const h=await ready();let writes=0;h.api[action==='edit'?'updateRecordById':action==='delete'?'deleteRecords':'addRecords']=async()=>{writes++;return{code:3000};};await assert.rejects(h.widget.controller.curveOperation(action,action==='add'?'':B,action==='edit'?{Percent_Cost:'99'}:{}));assert.equal(writes,1);await h.widget.controller.recheckCurve().catch(()=>{});assert.equal(writes,1);assert.ok(h.widget.state.curveUncertain);assert.equal(h.widget.state.curve.length,1);
  assert.equal(h.widget.queue('Multi_Line','blocked after unknown curve'),false);assert.equal(h.widget.controller.discardRejected(),false);assert.equal(writes,1);
}
{
  const h=await ready();let writes=0;h.api.updateRecordById=async()=>{writes++;h.curves[0].Percent_Cost='99';return{code:3000,data:{ID:B}};};const native=h.api.getRecordCount;h.api.getRecordCount=config=>config.report_name==='All_Construction_Curves'&&config.criteria.includes('ID ==')?Promise.reject({code:2898,message:'Denied readback'}):native(config);
  await assert.rejects(h.widget.controller.curveOperation('edit',B,{Percent_Cost:'99'}));assert.equal(h.widget.state.curve[0].Percent_Cost,'100');assert.equal(h.widget.state.curveDrafts[B].values.Percent_Cost,'99');h.api.getRecordCount=native;h.curves[0].Settings={ID:OTHER};await assert.rejects(h.widget.controller.recheckCurve(),/Settings parent/);h.curves[0].Settings={ID};await h.widget.controller.recheckCurve();assert.equal(writes,1);assert.equal(h.widget.state.curve[0].Percent_Cost,'99');
}
{
  const h=await ready(),held=deferred(),native=h.api.deleteRecords;h.widget.remove(B);const host=h.node('curve-dialog'),commit=host.querySelector('[data-curve-delete]');h.api.deleteRecords=config=>held.promise.then(()=>native(config));commit.onclick();await drain();assert.equal(h.node('view').inert,true);assert.equal(host.querySelector('[data-curve-cancel]').disabled,true);h.widget.close();assert.equal(host.hidden,false);host.onkeydown({key:'Escape',preventDefault(){}});assert.equal(host.hidden,false);held.resolve();await drain();assert.match(host.querySelector('[data-curve-status]').textContent,/verified/);assert.equal(host.querySelector('[data-curve-delete]').disabled,true);h.widget.close();assert.equal(host.hidden,true);assert.equal(h.node('view').inert,false);assert.equal(h.calls.filter(call=>call.method==='delete').length,1);
}
{
  const stalled=deferred(),h=harness({initialize:()=>stalled.promise});await drain();h.tick(5000);await drain();assert.equal(h.widget.state.live,false);assert.equal(h.calls.length,0);assert.equal(h.node('reload').disabled,false);stalled.resolve({envUrlFragment:'',loginUser:'late'});await drain();assert.equal(h.calls.length,0,'Late initialization cannot start business reads');h.context.ZOHO.CREATOR.UTIL.getInitParams=async()=>({envUrlFragment:'',loginUser:'retry'});await h.widget.boot();assert.equal(h.widget.state.live,true);assert.equal(h.widget.state.ready,true);
}
{
  const h=harness(),native=h.api.getRecords;h.api.getRecords=config=>config.report_name==='All_Pro_Formas'?Promise.resolve({code:3000,data:[]}):native(config);await drain();h.widget.queue('Multi_Line','retained after boot');assert.equal(h.node('reload').disabled,true);assert.equal(await h.widget.boot(),false);assert.equal(h.widget.value('Multi_Line'),'retained after boot');assert.equal(h.handshakes(),1);
}
for(const params of [{envUrlFragment:'',loginUser:{}},{envUrlFragment:'',loginUser:' '},{envUrlFragment:'/wrong/environment',loginUser:'actor'},null]){
  const h=harness({initialize:async()=>params});await drain();assert.equal(h.widget.state.live,false);assert.equal(h.calls.length,0,'Invalid native actor/environment cannot start data reads');assert.equal(h.widget.controller.canEdit(),false);
}
{
  const h=harness({initialize:async()=>({envUrlFragment:''})});h.context.ZOHO.CREATOR.loginUser='genuine-global-actor';await drain();assert.equal(h.widget.state.live,true);assert.equal(h.context.LMRuntime.current().user,'genuine-global-actor');h.context.LMRuntime.apply({envUrlFragment:'',loginUser:'different'});assert.equal(h.widget.queue('Multi_Line','unsafe'),false);assert.equal(h.widget.controller.canEdit(),false);
  const noSdk=harness({creator:false});await drain();assert.equal(noSdk.widget.state.demo,false);assert.equal(noSdk.widget.state.live,false);assert.equal(noSdk.calls.length,0);const preview=harness({creator:false,embedded:false});await drain();assert.equal(preview.widget.state.demo,true);assert.equal(preview.widget.queue('Multi_Line','unsafe'),false);
}
for(const wrapped of [false,true]){
  const h=await ready();let writes=0;
  const native={code:4590,error:[{task:'alert',alert_message:['Next Workflow Run is invalid.']} ]};
  h.api.updateRecordById=async()=>{writes++;if(wrapped)throw {responseText:JSON.stringify(native)};return native;};
  h.widget.queue('Multi_Line','retained diagnostic draft');let failure;
  await assert.rejects(h.widget.flush(),error=>{failure=error;return true;});
  assert.match(failure.message,/Next Workflow Run is invalid/);assert.equal(failure.code,'4590');
  assert.equal(failure.recordId,ID);assert.deepEqual(Array.from(failure.fields),['Multi_Line']);
  assert.equal(h.widget.value('Multi_Line'),'retained diagnostic draft');assert.equal(writes,1);
  await h.widget.controller.recheck().catch(()=>{});assert.equal(writes,1,'Detailed native failures cannot replay a write');
}
console.log('PASS: Settings whole-IIFE SDK2/native counted reads, singleton atomic reload, immutable retained autosave drafts and exact fresh scalar/multi-ID verification, strict Curve CRUD/parent verification, no mutation replay and guarded native handshake.');
