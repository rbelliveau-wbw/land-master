import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app='widgets/milestone-gantt/src/app/';
const html=fs.readFileSync(app+'widget.html','utf8');
const controllerSource=fs.readFileSync(app+'gantt-controller.js','utf8');
const inline=html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
assert.ok(inline);assert.match(html,/widgets\/version\/2\.0\/widgetsdk-min\.js/);
assert.doesNotMatch(inline,/CREATOR\.API|CREATOR\.init\(|buildUpdateEnvelopes|maxPagesPerReport/);
assert.equal(fs.readFileSync(app+'creator-data.js','utf8'),fs.readFileSync('shared/creator-data.js','utf8'));
assert.equal(fs.readFileSync(app+'runtime-context.js','utf8'),fs.readFileSync('widgets/land-master/src/app/runtime-context.js','utf8'));
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
async function settle(){for(let i=0;i<35;i++)await Promise.resolve();}
const clone=value=>JSON.parse(JSON.stringify(value));

function harness({count=2,initialize=async()=>({envUrlFragment:'/environment/development',loginUser:'fixture',appLinkName:'land-master'}),reduced=true}={}){
 const nodes=new Map(),documentHandlers=new Map(),calls=[],renders=[],timers=new Map();let timer=0,nativeHandshakes=0;
 const document={referrer:'',activeElement:null,getElementById:id=>node(id),createElement:tag=>node(null,tag),querySelectorAll:selector=>selector==='[data-zoom]'?[node('zoomCompact'),node('zoomWeek')]:[],addEventListener(type,fn){if(!documentHandlers.has(type))documentHandlers.set(type,[]);documentHandlers.get(type).push(fn);},removeEventListener(){}};
 function node(id,tag='div'){
  if(id&&nodes.has(id))return nodes.get(id);
  const classes=new Set(),handlers=new Map();let text='',markup='';
  const element={id,tagName:tag.toUpperCase(),children:[],style:{},attrs:{},disabled:false,hidden:id==='ganttSaveOverlay'||id==='ganttSaveRecheck',inert:false,isConnected:true,value:'',className:'',scrollLeft:0,clientWidth:800,appendCount:0,
   classList:{add(...values){values.forEach(value=>classes.add(value));},remove(...values){values.forEach(value=>classes.delete(value));},toggle(value,force){if(force===undefined)force=!classes.has(value);if(force)classes.add(value);else classes.delete(value);},contains:value=>classes.has(value)},
   getAttribute:key=>element.attrs[key]||'',setAttribute(key,value){element.attrs[key]=String(value);},setPointerCapture(){},focus(){document.activeElement=element;},
   appendChild(child){element.children.push(child);element.appendCount++;return child;},
   addEventListener(type,fn){if(!handlers.has(type))handlers.set(type,[]);handlers.get(type).push(fn);},
   async fire(type,event={}){for(const fn of handlers.get(type)||[])await fn.call(element,event);},handlers,
   querySelector:selector=>node(id+selector),querySelectorAll:selector=>selector==='button'?[node('ganttSaveX'),node('ganttSaveRecheck'),node('ganttSaveClose')]:[]};
  Object.defineProperty(element,'textContent',{get:()=>text,set(value){text=String(value);element.children=[];}});
  Object.defineProperty(element,'innerHTML',{get:()=>markup,set(value){markup=String(value);element.htmlWrites=(element.htmlWrites||0)+1;}});
  if(id)nodes.set(id,element);return element;
 }
 node('zoomCompact').attrs['data-zoom']='compact';node('zoomWeek').attrs['data-zoom']='week';
 const server=Array.from({length:count},(_,i)=>({ID:String(90071992547409931n+BigInt(i)),Milestone_Name:'Fixture '+i,Subdivision1:{ID:'1',display_value:'Fixture subdivision'},Start_Date:'10/01/2026',End_Date:'10/05/2026'}));
 const selected=config=>config.criteria?server.filter(row=>row.ID===config.criteria.match(/ID == (\d+)/)?.[1]):config.report_name==='All_Subdivisions'?[{ID:'1',Subdivision_Name:'Fixture subdivision',Status:'Active'}]:server;
 const api={getRecordCount:async config=>{calls.push({method:'count',config:clone(config)});return{code:3000,result:{records_count:String(selected(config).length)}};},
  getRecords:async config=>{calls.push({method:'records',config:clone(config)});const rows=selected(config),start=Number(config.record_cursor||0);return{code:3000,data:clone(rows.slice(start,start+1000)),...(start+1000<rows.length?{record_cursor:String(start+1000)}:{})};},
  updateRecordById:async config=>{calls.push({method:'update',config:clone(config)});const row=server.find(row=>row.ID===config.id);Object.assign(row,config.payload.data);return{code:3000,data:{ID:config.id}};}};
 const context=vm.createContext({document,location:{href:'https://example.test/dev/milestone-gantt/',search:''},ZOHO:{CREATOR:{DATA:api,UTIL:{getInitParams(){nativeHandshakes++;return initialize();}}}},setTimeout(fn,ms){const id=++timer;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),matchMedia:()=>({matches:reduced}),localStorage:{getItem:()=>null,setItem(){}},console});
 context.window=context;context.parent={};context.addEventListener=()=>{};
 vm.runInContext(fs.readFileSync(app+'runtime-context.js','utf8'),context);
 vm.runInContext(fs.readFileSync(app+'creator-data.js','utf8'),context);
 vm.runInContext(controllerSource,context);
 // Use the whole actual controller, original mapping/date/dependency/event functions, and actual progress view.
 // Only the timeline renderer is replaced: layout is verified in the native UI gate.
 const factory=context.LMGantt;
 context.LMGantt={...factory,create(options){options.render=()=>renders.push({ready:options.state.ready,milestones:options.state.milestones.length});return factory.create(options);}};
 const expose="window.__ganttTest={state:state,controller:ganttController,start:start,reload:reloadAll,save:saveChanges,reset:resetDrafts,link:toggleLink,down:onBarPointerDown,move:onBarPointerMove,up:onBarPointerUp,toDay:toDay,fromDay:fromDay,isDirty:isDirty};";
 vm.runInContext(inline.replace('  start();',expose),context);
 const widget=context.__ganttTest;
 return{context,widget,api,server,calls,nodes,node,document,documentHandlers,renders,timers,handshakes:()=>nativeHandshakes,
  tick(ms){const entry=[...timers].find(([,value])=>value.ms===ms);assert.ok(entry,'Missing timer '+ms);timers.delete(entry[0]);entry[1].fn();}};
}
function change(h,index=0,days=1){const m=h.widget.state.milestones[index];m.draftStart=h.widget.fromDay(h.widget.toDay(m.start)+days);m.draftEnd=h.widget.fromDay(h.widget.toDay(m.end)+days);return m;}

{
 const h=harness({count:12017});await h.widget.start();assert.equal(h.widget.state.ready,true);assert.equal(h.widget.state.milestones.length,12017);assert.equal(h.widget.state.milestones[0].id,'90071992547409931');assert.equal(h.calls.filter(call=>call.method==='records'&&call.config.report_name==='All_Milestones').length,13);assert.ok(h.calls.filter(call=>call.method==='records').every(call=>call.config.field_config==='all'&&call.config.max_records===1000));
 const previous=h.widget.state.milestones;h.api.getRecords=async config=>({code:3000,data:clone(config.report_name==='All_Subdivisions'?[{ID:'1',Subdivision_Name:'Fixture'}]:h.server.slice(0,1000))});await assert.rejects(h.widget.reload(),/loaded 1000 of 12017/);assert.equal(h.widget.state.milestones,previous);assert.equal(h.widget.state.ready,false);assert.equal(h.node('gantt').inert,true);
}
{
 const h=harness();await h.widget.start();const first=deferred(),second=deferred();let reads=0;const original=h.api.getRecords;
 h.api.getRecords=config=>config.report_name==='All_Milestones'&&!config.criteria?++reads===1?first.promise:second.promise:original(config);
 const older=h.widget.reload();await settle();const newer=h.widget.reload();await settle();first.resolve({code:3000,data:clone(h.server)});assert.equal(await older,false);assert.equal(h.widget.state.loading,true);assert.equal(h.node('gantt').inert,true);second.resolve({code:3000,data:clone(h.server)});assert.equal(await newer,true);assert.equal(h.widget.state.ready,true);
}
{
 const h=harness();await h.widget.start();const held=deferred(),original=h.api.getRecords,previous=h.widget.state.milestones,subdivisions=h.widget.state.subdivisions;h.api.getRecords=config=>config.report_name==='All_Milestones'&&!config.criteria?held.promise:original(config);
 const reload=h.widget.reload();await settle();assert.equal(h.widget.controller.canEdit(),false);assert.equal(h.widget.reset(),false);assert.equal(h.widget.link(previous[0].id),false);assert.equal(h.widget.down({}),false);assert.equal(h.widget.move({}),false);assert.equal(await h.widget.save(),false);
 h.node('subdivisionSelect').value='changed';await h.node('subdivisionSelect').fire('change');assert.equal(h.widget.state.selectedSubdivisionId,'1');const zoom=h.widget.state.zoom;await h.node('zoomWeek').fire('click');assert.equal(h.widget.state.zoom,zoom);
 assert.equal(h.widget.controller.update,undefined,'Raw native write stays private to the captured save run');assert.equal(await h.widget.save(),false);assert.equal(h.calls.filter(call=>call.method==='update').length,0,'Every public committing entry point is blocked during stalled refresh');
 held.reject({code:2899,message:'Denied report'});await assert.rejects(reload);assert.equal(h.widget.state.milestones,previous);assert.equal(h.widget.state.subdivisions,subdivisions,'failed refresh preserves both complete collections');assert.equal(h.widget.state.ready,false);
 h.api.getRecords=original;await h.node('refreshBtn').fire('click');assert.equal(h.widget.state.ready,true);assert.equal(h.handshakes(),1,'failed read retries within the existing native session');
}
{
 const h=harness();await h.widget.start();const m=change(h);const native=deferred(),original=h.api.updateRecordById;
 h.api.updateRecordById=config=>{h.calls.push({method:'held-update',config:clone(config)});return native.promise.then(()=>original(config));};
 const saving=h.widget.save();assert.equal(h.node('ganttSaveOverlay').hidden,false,'dialog opens synchronously before preflight');assert.equal(h.node('ganttApp').inert,true);await settle();
 assert.equal(h.widget.state.saveInProgress,true);assert.equal(await h.widget.save(),false);assert.equal(await h.widget.reload(),false);assert.equal(h.widget.reset(),false);assert.equal(h.widget.link(m.id),false);assert.equal(h.widget.down({}),false);assert.equal(h.widget.move({}),false);assert.equal(h.widget.controller.closeRun(),false);
 const selector=h.node('subdivisionSelect');selector.value='different';await selector.fire('change');assert.equal(selector.value,'1');assert.equal(h.widget.state.selectedSubdivisionId,'1');assert.equal(h.node('zoomWeek').disabled,true);
 const sentDay=h.widget.toDay(m.draftStart);m.draftStart=h.widget.fromDay(sentDay+10);native.resolve();const result=await saving;assert.equal(result.verified,1);assert.equal(h.widget.toDay(m.start),sentDay);assert.equal(h.widget.isDirty(m),true,'later defensive draft remains unsaved');assert.equal(h.node('ganttSaveCount').textContent,'1 / 1 verified');assert.equal(h.node('ganttSaveBar').getAttribute('aria-valuenow'),'1');assert.equal(h.node('ganttSaveClose').disabled,false);assert.equal(h.node('ganttSaveResults').appendCount,1,'progress patches the mounted per-record result');assert.equal(h.widget.controller.closeRun(),true);assert.equal(h.node('ganttApp').inert,false);
}
{
 const h=harness();await h.widget.start();const first=change(h,0),second=change(h,1,2),held=deferred(),original=h.api.updateRecordById;
 let writes=0;h.api.updateRecordById=config=>++writes===1?held.promise.then(()=>original(config)):original(config);
 const saving=h.widget.save();await settle();second.draftStart=h.widget.fromDay(h.widget.toDay(second.draftStart)+10);held.resolve();const result=await saving;assert.equal(result.verified,2);const updates=h.calls.filter(call=>call.method==='update');assert.equal(updates[1].config.payload.data.Start_Date,'10/03/2026');assert.equal(h.widget.toDay(second.start),h.widget.toDay(h.widget.fromDay(h.widget.toDay(first.start)+1)));assert.equal(h.widget.isDirty(second),true);
}
{
 const h=harness();await h.widget.start();change(h);change(h,1);const original=h.api.updateRecordById;h.api.updateRecordById=config=>config.id===h.server[1].ID?Promise.reject({code:2899,message:'Denied'}):original(config);
 const result=await h.widget.save();assert.equal(result.verified,1);assert.equal(result.items[1].status,'failed');assert.equal(result.items[1].error.code,2899);assert.equal(h.widget.isDirty(h.widget.state.milestones[1]),true);assert.equal(h.node('ganttSaveTitle').textContent,'Milestone dates need review');assert.equal(h.widget.state.saveReview,null);h.widget.controller.closeRun();assert.equal(h.widget.controller.canEdit(),true);
}
{
 const h=harness();await h.widget.start();change(h);change(h,1);h.server[1].Start_Date='10/09/2026';const result=await h.widget.save();assert.equal(result.verified,0);assert.equal(h.calls.filter(call=>call.method==='update').length,0,'one conflicting preflight prevents the whole write set');assert.equal(result.items[0].status,'not_sent');assert.equal(result.items[1].status,'failed');assert.equal(h.node('ganttSaveStage1').querySelector('.gantt-save-stage-chip').textContent,'Not sent');
}
{
 const h=harness();await h.widget.start();change(h);h.server[0].Start_Date='10/02/2026';h.server[0].End_Date='10/06/2026';const result=await h.widget.save();assert.equal(result.verified,1);assert.equal(h.calls.filter(call=>call.method==='update').length,0,'matching persisted dates need no replay');assert.equal(result.items[0].message,'Already saved; verified');assert.equal(h.widget.isDirty(h.widget.state.milestones[0]),false);
}
{
 const h=harness();await h.widget.start();change(h);const initial=h.widget.state.milestones[0].start;let denyVerification=false;const original=h.api.updateRecordById,count=h.api.getRecordCount;
 h.api.updateRecordById=async config=>{const result=await original(config);denyVerification=true;return result;};h.api.getRecordCount=config=>denyVerification&&config.criteria?Promise.reject({code:2899,message:'Readback denied'}):count(config);
 const result=await h.widget.save();assert.equal(result.verified,0);assert.equal(result.items[0].status,'unknown');assert.equal(h.widget.state.milestones[0].start,initial);assert.equal(h.widget.isDirty(h.widget.state.milestones[0]),true);assert.equal(h.widget.controller.canEdit(),false);h.widget.controller.closeRun();const writes=h.calls.filter(call=>call.method==='update').length;
 denyVerification=false;const checked=await h.widget.save();assert.equal(checked.verified,1);assert.equal(h.calls.filter(call=>call.method==='update').length,writes,'Save becomes a read-only recheck for unknown outcome');assert.equal(h.widget.state.saveReview,null);h.widget.controller.closeRun();assert.equal(h.widget.controller.canEdit(),true);
}
{
 const h=harness();await h.widget.start();change(h);const original=h.api.updateRecordById;h.api.updateRecordById=async config=>{await original(config);h.server[0].Start_Date='10/07/2026';return{code:3000,data:{ID:config.id}};};
 const result=await h.widget.save();assert.equal(result.items[0].status,'verified');assert.equal(result.verified,1);assert.equal(h.node('ganttSaveBar').getAttribute('aria-valuenow'),'1');assert.equal(h.widget.state.saveReview,null);assert.equal(h.calls.filter(call=>call.method==='update').length,1);assert.equal(h.widget.state.milestones[0].raw.Start_Date,'10/07/2026');assert.equal(h.widget.isDirty(h.widget.state.milestones[0]),false,'the returned dates replace the submitted draft without another save');
}
{
 const h=harness();await h.widget.start();change(h);change(h,1);const lost=deferred();h.api.updateRecordById=config=>{h.calls.push({method:'lost-update',config:clone(config)});return lost.promise;};const saving=h.widget.save();await settle();h.tick(30000);await saving;assert.equal(h.calls.filter(call=>call.method==='lost-update').length,1,'uncertain write stops later sends');assert.equal(h.widget.controller.run().items[1].status,'not_sent');h.widget.controller.closeRun();assert.equal(await h.widget.controller.recheck(),false,'pending native write cannot be replayed or declared settled');lost.reject(new Error('Connection lost'));await settle();const checked=await h.widget.controller.recheck();assert.equal(checked.verified,0);assert.equal(h.calls.filter(call=>call.method==='lost-update').length,1);
}
{
 const id='90071992547409931',valid={code:3000,data:{ID:id}};
 for(const response of [{code:3000},{code:3000,result:[]},{code:3000,data:{ID:123}},{code:3000,data:{ID:'wrong'}},{...valid,error:'Denied'},{...valid,status:'ERROR'},{...valid,status:'failed'},{...valid,status:'failure'},{...valid,success:false},{code:3000,result:[{...valid,success:false}]},{code:3000,result:[{...valid,status:'failed'}]},{...valid,result:{}},{...valid,result:{data:{ID:id}}},{code:3000,result:[{...valid,error:'Denied'}]},{code:3000,result:[{...valid,status:'error'}]},{code:3000,result:[{...valid,result:[]}]},{code:3000,result:[valid,{code:2899,message:'Denied'}]},{code:3000,result:[{code:2899,message:'Denied'}]},{code:3000,data:{ID:'other'},result:[valid]},{...valid,result:[valid]},{code:3000,result:[{...valid,result:[{code:2899,message:'Nested denial'}]}]},{code:3000,result:[{...valid,result:{code:3000,data:{ID:id}}}]},{code:3000,result:[valid,valid]},...[{error:'Denied'},{status:' FAILURE '},{success:false},{code:2899}].flatMap(flags=>[{code:3000,data:{ID:id,...flags}},{code:3000,result:[{code:3000,data:{ID:id,...flags}}]}])]){
  const h=harness({count:1});await h.widget.start();const milestone=change(h),initial=milestone.start;h.api.updateRecordById=config=>{h.calls.push({method:'invalid-update',config:clone(config)});return Promise.resolve(response);};assert.equal(h.widget.controller.update,undefined);const result=await h.widget.save(),item=result.items[0],failure=item.mutationError;assert.ok(failure);assert.equal(failure.uncertain,true);assert.equal(failure.response,response);assert.equal(result.verified,0);assert.equal(item.status,'unknown');assert.equal(milestone.start,initial);assert.equal(h.widget.isDirty(milestone),true);assert.equal(h.node('ganttSaveTitle').textContent,'Milestone dates need review');assert.equal(h.calls.filter(call=>call.method==='invalid-update').length,1);assert.equal(h.widget.controller.canEdit(),false);
  if(response.data?.code===2899||response.result?.[0]?.data?.code===2899)assert.equal(failure.code,2899,'Raw acknowledgement-data failure code remains unknown');
  h.widget.controller.closeRun();const sent=h.calls.find(call=>call.method==='invalid-update').config.payload.data;Object.assign(h.server[0],sent);const checked=await h.widget.controller.recheck();assert.equal(checked.verified,1);assert.equal(h.calls.filter(call=>call.method==='invalid-update').length,1,'Recheck verifies exact persisted dates without replay');assert.equal(h.widget.isDirty(milestone),false);
 }
 const h=harness({count:1});await h.widget.start();change(h);const update=h.api.updateRecordById;h.api.updateRecordById=async config=>({code:3000,result:[await update(config)]});assert.equal((await h.widget.save()).verified,1,'native nonempty per-record success remains supported');
}
{
 const late=deferred();let getter=()=>late.promise;const h=harness({initialize:()=>getter()});h.context.LMFrontendContext={params:{envUrlFragment:'',loginUser:'cached',appLinkName:'cached'}};const starting=h.widget.start();await settle();const concurrent=h.widget.start();assert.equal(h.handshakes(),1);h.tick(5000);assert.equal(await starting,false);assert.equal(await concurrent,false);assert.equal(h.calls.length,0);assert.equal(h.context.LMRuntime.current().environment,'UNKNOWN');assert.equal(h.widget.state.ready,false);
 getter=()=>Promise.resolve({envUrlFragment:'/environment/development',loginUser:'retry-fixture',appLinkName:'land-master'});await h.node('refreshBtn').fire('click');assert.equal(h.handshakes(),2);assert.equal(h.widget.state.ready,true);assert.equal(h.node('saveBtn').handlers.get('click').length,1,'retry must not bind actions twice');
 late.resolve({envUrlFragment:'',loginUser:'late-production',appLinkName:'stale'});await settle();assert.equal(h.context.LMRuntime.current().environment,'DEVELOPMENT');assert.equal(h.context.LMRuntime.current().user,'retry-fixture');
}
{
 for(const initialize of [()=>Promise.reject({code:2899,message:'Denied'}),()=>{throw new Error('Native throw');},()=>Promise.resolve(null),()=>Promise.resolve({envUrlFragment:'unknown',loginUser:'fixture',appLinkName:'land-master'})]){const h=harness({initialize});assert.equal(await h.widget.start(),false);assert.equal(h.calls.length,0);assert.equal(h.widget.state.ready,false);assert.equal(h.context.LMRuntime.current().environment,'UNKNOWN');}
 for(const params of [{},[],{envUrlFragment:'/environment/development'},{envUrlFragment:'/environment/development',loginUser:{name:'malformed'}},{envUrlFragment:'/environment/development',loginUser:[]},{envUrlFragment:'/environment/development',loginUser:false}]){const h=harness({initialize:()=>Promise.resolve(params)});assert.equal(await h.widget.start(),false);assert.equal(h.calls.length,0,'malformed or missing native actor must not read reports');assert.equal(h.widget.state.nativeReady,false);assert.equal(h.widget.state.ready,false);}
 const inherited=harness({initialize:()=>Promise.resolve({envUrlFragment:'/environment/development'})});inherited.context.ZOHO.CREATOR.loginUser='native-global-actor';assert.equal(await inherited.widget.start(),true);assert.equal(inherited.context.LMRuntime.current().user,'native-global-actor','preserve a real actor supplied by the native SDK');
 const h=harness();h.context.parent=h.context;h.context.ZOHO=null;assert.equal(await h.widget.start(),false);assert.equal(h.calls.length,0);assert.equal(h.widget.state.ready,false,'outside Creator must not invent a demo snapshot');
}
{
 const h=harness({reduced:false});await h.widget.start();change(h);h.node('saveBtn').focus();const saving=h.widget.save();await settle();assert.equal(h.widget.state.saveInProgress,true);assert.equal(h.node('ganttSaveClose').disabled,true);let prevented=false;
 const key=h.documentHandlers.get('keydown')[0];key({key:'Escape',preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(h.node('ganttSaveOverlay').hidden,false);assert.equal(h.widget.controller.closeRun(),false);
 for(let step=0;step<3;step++){h.tick(560);await settle();}await saving;assert.equal(h.node('ganttSaveClose').disabled,false);
 h.node('ganttSaveX').focus();key({key:'Tab',shiftKey:true,preventDefault(){}});assert.equal(h.document.activeElement,h.node('ganttSaveClose'));key({key:'Tab',shiftKey:false,preventDefault(){}});assert.equal(h.document.activeElement,h.node('ganttSaveX'));h.widget.controller.closeRun();assert.equal(h.document.activeElement,h.node('saveBtn'));
}
{
 const h=harness();await h.widget.start();const blank=h.widget.state.milestones[0];blank.start=null;blank.end=null;blank.draftStart=null;blank.draftEnd=null;assert.equal(h.widget.isDirty(blank),false);
 const update=h.api.updateRecordById;change(h,1);await h.widget.save();const config=h.calls.find(call=>call.method==='update').config;assert.equal(config.report_name,'All_Milestones');assert.equal(typeof config.id,'string');assert.equal(Object.hasOwn(config.payload,'skip_workflow'),false);assert.equal(Object.hasOwn(config,'skip_workflow'),false);assert.equal(config.payload.data.Start_Date,'10/02/2026');assert.ok(update);
}

console.log('PASS: Gantt actual SDK2 controller, complete counted snapshots, captured/verified dates, no replay, unknown-outcome read-only recheck, per-destination progress and input guards.');
