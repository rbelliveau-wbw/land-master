import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createContractTestDOM} from './contract-sdk-v2-test-dom.mjs';
const app=new URL('../widgets/contract-management/src/app/',import.meta.url),source=fs.readFileSync(new URL('widget.html',app),'utf8');
const inline=[...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match=>match[1]).filter(value=>value.trim()).join('\n');
const ID='90071992547409931',ACTION='90071992547409932',SUB='90071992547409933',ACCESS='90071992547409934',NEW='90071992547409935';
const clone=value=>JSON.parse(JSON.stringify(value)),drain=async()=>{for(let i=0;i<30;i++)await new Promise(resolve=>setImmediate(resolve));};
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
function harness({initialize=()=>({envUrlFragment:'',loginUser:'actual-actor@example.test'}),denied=false,actionsCount=1,accessFailure=false,realDOM=false}={}){
  const parsed=realDOM?createContractTestDOM(source):null;
  const nodes=parsed?parsed.nodes:new Map(),listeners=new Map(),timers=new Map(),calls=[],logs=[];let timerId=0,active=0,maximum=0,handshakes=0,createdSequence=BigInt(NEW);
  function node(key=''){
    if(parsed)return parsed.node(key);
    if(nodes.has(key))return nodes.get(key);
    const attrs=new Map(),classes=new Set(),handlers=new Map();let markup='';
    const value={id:key,value:'',checked:false,disabled:false,hidden:false,style:{},dataset:{},children:[],scrollTop:0,scrollLeft:0,offsetHeight:100,offsetWidth:100,
      classList:{add:(...names)=>names.forEach(name=>classes.add(name)),remove:(...names)=>names.forEach(name=>classes.delete(name)),contains:name=>classes.has(name),toggle(name,on){const enabled=on==null?!classes.has(name):on;enabled?classes.add(name):classes.delete(name);return enabled;}},
      addEventListener(type,fn){if(!handlers.has(type))handlers.set(type,[]);handlers.get(type).push(fn);},getAttribute:name=>attrs.get(name)||null,setAttribute:(name,v)=>attrs.set(name,String(v)),removeAttribute:name=>attrs.delete(name),querySelector:()=>null,querySelectorAll:()=>[],
      appendChild(child){this.children.push(child);child.parentNode=this;return child;},insertBefore(child){return this.appendChild(child);},insertAdjacentHTML(where,text){markup+=text;},remove(){},focus(){},blur(){},click(){},getBoundingClientRect:()=>({top:0,left:0,bottom:100,right:100,width:100,height:100}),textContent:'',handlers};
    Object.defineProperty(value,'innerHTML',{get:()=>markup,set:v=>{markup=String(v);value.htmlWrites=(value.htmlWrites||0)+1;}});nodes.set(key,value);return value;
  }
  const document=parsed?parsed.document:{referrer:'https://creatorapp.zoho.com/fixture/land-master/#Page:Contracts',getElementById:node,querySelector:()=>null,querySelectorAll:selector=>selector==='button,input,select,textarea'?[...nodes.values()]:[],createElement:tag=>node('created:'+tag+':'+nodes.size),addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);},activeElement:null,body:node('body'),head:node('head')};
  const reports={All_Contracts1:[{ID,Contract_Name:'Fixture contract',Contract_Type:'DA',Status:'New',Subdivision1:[{ID:SUB,zc_display_value:'Fixture phase'}],Owner:[{ID:ACCESS}],Archive:false}],
    All_Contract_Actions:Array.from({length:actionsCount},(_,index)=>({ID:index?(90071992547410000n+BigInt(index)).toString():ACTION,Contract1:{ID,zc_display_value:'Fixture contract'},Contract_Action:'Fixture action '+index,Sort_Order:String(index+1),Status:'New',Complete:false,Current_Action:index===0,Dev_Notes:'server note'})),
    All_Contract_Versions:[],All_Pro_Formas_All_Fields:[],All_Contract_Approvals:[],Contract_Pricing_Report:[],All_Subdivisions:[{ID:SUB,Subdivision_Name:'Fixture phase',Subdivision_Code:'F01',Project:{},Status:'Active'}],All_Builders:[],All_Active_Lots_Contracts_View:[],Comment_Log_Report:[],All_Takedown_Schedules:[]};
  const flags={found:true,hasRow:true,myId:ACCESS,ctEdit:true,ctPropose:false,ctApprove:false,ctTemplates:false,ctDeleteArchive:false,users:[{id:ACCESS,label:'Actual actor',email:'actual-actor'}]};
  function selected(config){let rows=reports[config.report_name]||[];const criteria=String(config.criteria||''),match=criteria.match(/(?:^|\()ID == (\d+)/),sub=criteria.match(/Subdivision == (\d+)/),parent=criteria.match(/Contract1 == (\d+)/);if(match)rows=rows.filter(row=>row.ID===match[1]);if(sub)rows=rows.filter(row=>(typeof row.Subdivision==='string'?row.Subdivision:row.Subdivision&&row.Subdivision.ID)===sub[1]);if(parent)rows=rows.filter(row=>(typeof row.Contract1==='string'?row.Contract1:row.Contract1&&row.Contract1.ID)===parent[1]);if(criteria==='Contract_Template == "Builder"')rows=rows.filter(row=>row.Contract_Template==='Builder');return rows;}
  const counted=(method,config,fn)=>{calls.push({method,config:clone(config)});active++;maximum=Math.max(maximum,active);return Promise.resolve().then(fn).finally(()=>active--);};
  const api={
    getRecordCount:config=>counted('count',config,()=>{if(denied&&config.report_name==='All_Contract_Actions')throw {code:2898,message:'Denied actions'};return {code:3000,result:{records_count:String(selected(config).length)}};}),
    getRecords:config=>counted('records',config,()=>{const rows=selected(config),offset=Number(config.record_cursor||0);return {code:3000,data:clone(rows.slice(offset,offset+1000)),...(offset+1000<rows.length?{record_cursor:String(offset+1000)}:{})};}),
    invokeCustomApi:config=>counted('custom',config,()=>{if(accessFailure)throw {code:2899,message:'Access API failed'};return {code:3000,details:{output:JSON.stringify(flags)}};}),
    updateRecordById:config=>counted('update',config,()=>{const row=selected({...config,criteria:'(ID == '+config.id+')'})[0];Object.assign(row,clone(config.payload.data));return {code:3000,data:{ID:config.id}};}),
    addRecords:config=>counted('add',config,()=>{const report={Contract:'All_Contracts1',Contract_Actions:'All_Contract_Actions',Contract_Version:'All_Contract_Versions',Contract_Approvals:'All_Contract_Approvals',Contract_Pricing:'Contract_Pricing_Report',Builder:'All_Builders'}[config.form_name],id=(createdSequence++).toString();assert.ok(report);reports[report].push({ID:id,...clone(config.payload.data)});return {code:3000,result:[{code:3000,data:{ID:id}}]};}),
    deleteRecords:config=>counted('delete',config,()=>{const target=config.payload.criteria.match(/ID == (\d+)/)[1];reports[config.report_name]=reports[config.report_name].filter(row=>row.ID!==target);return {code:3000,result:[{code:3000,data:{ID:target}}]};})
  };
  const ctx=vm.createContext({document,location:{href:'https://example.test/prod/contracts-manager/',search:''},navigator:{clipboard:{writeText:async()=>{}}},URL,URLSearchParams,Blob,Uint8Array,ArrayBuffer,atob,btoa,Intl,console:{log:(...values)=>logs.push(values),warn:(...values)=>logs.push(values),error:(...values)=>logs.push(values),debug:(...values)=>logs.push(values)},requestAnimationFrame:fn=>fn(),setTimeout(fn,ms){const timer=++timerId;timers.set(timer,{fn,ms});return timer;},clearTimeout:timer=>timers.delete(timer),ZOHO:{CREATOR:{DATA:api,UTIL:{getInitParams(){handshakes++;return initialize();},getQueryParams:async()=>({}),navigateParentURL:async()=>{}}}}});
  ctx.window=ctx;ctx.parent={};ctx.scrollTo=()=>{};ctx.innerWidth=1280;ctx.innerHeight=900;ctx.addEventListener=(type,fn)=>{if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);};
  ctx.matchMedia=()=>({matches:true});
  for(const file of ['runtime-context.js','creator-data.js','contract-progress.js','pinned-comments.js'])vm.runInContext(fs.readFileSync(file==='pinned-comments.js'?new URL('../releases/proforma-manager/1.79.9/comments.js',import.meta.url):new URL(file,app),'utf8'),ctx,{filename:file});
  vm.runInContext(inline,ctx,{filename:'private-contracts-whole-ui.html'});
  return {c:ctx,reports,flags,api,calls,nodes,node,timers,logs,listeners,handshakes:()=>handshakes,maximum:()=>maximum,tick(ms){const entry=[...timers].find(([,timer])=>timer.ms===ms);assert.ok(entry,'timer '+ms);timers.delete(entry[0]);entry[1].fn();}};
}
async function ready(options){const h=harness(options);await drain();assert.equal(h.c.S.coreReady,true);return h;}
{
  const h=await ready({actionsCount:5001});assert.equal(h.handshakes(),1);assert.equal(h.c.S.actions.length,5001);assert.ok(h.maximum()<=3);assert.ok(h.calls.filter(call=>call.method==='records').every(call=>call.config.max_records===1000&&call.config.field_config==='all'));
  const access=h.calls.find(call=>call.method==='custom').config;assert.equal(access.api_name,'Get_User_Access');assert.equal(access.http_method,'GET');assert.equal(access.query_params,undefined);assert.equal(access.payload,undefined);assert.equal(access.parameters,undefined);assert.equal(h.c.canEdit(),true);assert.ok([...h.nodes.values()].some(node=>node.innerHTML.includes('Fixture contract')),'actual legacy renderer built the contract list');
}
{
  const h=await ready({initialize:()=>({envUrlFragment:'/environment/development',loginUser:'ViewAs@example.test'})});const config=h.calls.find(call=>call.method==='custom').config;assert.equal(config.api_name,'Get_User_Access_DEV');assert.equal(config.http_method,'POST');assert.deepEqual(config.payload,{user:'viewas'});
}
{
  const h=await ready({accessFailure:true});assert.equal(h.c.S.acc.known,false);assert.equal(h.c.S.acc.degraded,true);assert.equal(h.c.canEdit(),true,'existing degraded business policy retained');
}
{
  const h=harness({denied:true});await drain();assert.equal(h.c.S.coreReady,false);assert.equal(h.c.S.demo,false);assert.equal(h.c.canEdit(),false);assert.equal(h.c.S.contracts.length,0);assert.equal(h.calls.filter(call=>['add','update','delete'].includes(call.method)).length,0);
}
{
  const held=deferred(),h=harness({initialize:()=>held.promise});await drain();h.tick(5000);await drain();held.resolve({envUrlFragment:'',loginUser:'late@example.test'});await drain();assert.equal(h.c.S.liveSDK,false);assert.equal(h.c.S.coreReady,false);assert.equal(h.calls.length,0,'late handshake issues no business reads');
}
{
  const h=await ready(),row=h.reports.All_Contract_Actions[0];await h.c.updateRecord(ACTION,{Dev_Notes:'captured note'},h.c.CFG.reports.actions);assert.equal(row.Dev_Notes,'captured note');assert.equal(h.calls.filter(call=>call.method==='update').length,1);assert.ok(h.calls.some(call=>call.method==='count'&&call.config.criteria==='(ID == '+ACTION+')'));
}
for(const response of [{code:3000},{code:3000,data:{ID:ACTION},result:[{code:3000,data:{ID:ACTION}}]},{code:3000,result:[{code:3000,data:{ID:ACTION},result:[{code:2899}]}]},{code:3000,data:{ID:ACTION,status:'failure'}},{code:3000,result:[{code:3000,data:{ID:ACTION}},{code:2945}]}]){
  const h=await ready();let writes=0;h.api.updateRecordById=async()=>{writes++;return response;};await assert.rejects(h.c.updateRecord(ACTION,{Dev_Notes:'unverified'},h.c.CFG.reports.actions));await assert.rejects(h.c.updateRecord(ACTION,{Dev_Notes:'retry'},h.c.CFG.reports.actions));assert.equal(writes,1);assert.equal(h.c.canEdit(),false,'unknown mutation prevents further UI commits');
}
for(const acknowledgement of [id=>({code:3000,data:{ID:id},details:{message:'Updated successfully',limits:{remaining:10}}}),id=>({code:3000,result:[{code:3000,data:{ID:id},details:{message:'Updated successfully'}}],response:{message:'Request completed'}}),id=>({code:3000,data:{ID:id,details:{message:'Saved'}},output:{message:'Request completed'}})]){
  const h=await ready(),el=h.node('metadata-inline');el.value='native informational metadata';el.isConnected=true;el.setAttribute('data-aid',ACTION);el.setAttribute('data-af','Dev_Notes');
  h.api.updateRecordById=async config=>{Object.assign(h.reports.All_Contract_Actions[0],clone(config.payload.data));return acknowledgement(config.id);};
  assert.equal(await h.c.afSave(el),true);assert.equal(el.classList.contains('saved-ok'),true);assert.equal(h.c.contractHasReviews(),false);assert.equal(h.c.findAction(ACTION).ID,ACTION,'decimal string above Number precision is retained');
  const nativeAdd=h.api.addRecords;h.api.addRecords=async config=>{const result=await nativeAdd(config);return acknowledgement(result.result[0].data.ID);};const created=await h.c.createRecord(h.c.CFG.forms.action,{Contract1:ID,Contract_Action:'Metadata child',Status:'New'});assert.equal(typeof created.data.ID,'string');assert.equal(h.reports.All_Contract_Actions.filter(row=>row.ID===created.data.ID).length,1);
}
for(const metadata of [{code:2899,message:'Denied'},JSON.stringify({output:{code:2899}}),{data:{ID:ID}},{data:{ID:Number(ID)}}]){
  const h=await ready(),response={code:3000,data:{ID:ACTION},details:metadata};let writes=0;h.api.updateRecordById=async()=>{writes++;return response;};await assert.rejects(h.c.updateRecord(ACTION,{Dev_Notes:'unknown metadata'},h.c.CFG.reports.actions));await assert.rejects(h.c.updateRecord(ACTION,{Dev_Notes:'second click'},h.c.CFG.reports.actions));assert.equal(writes,1);assert.equal(h.c.canEdit(),false);
  const retained=Object.values(h.c.S.sdkMutationReviews)[0];assert.equal(retained.response,response);assert.equal(retained.id,ACTION,'an update rechecks only its originally captured target');
}
for(const conflicting of [ID,Number(ID)]){
 const h=await ready();let writes=0;h.api.addRecords=async()=>{writes++;return {code:3000,data:{ID:NEW},details:{data:{ID:conflicting}}};};await assert.rejects(h.c.createRecord(h.c.CFG.forms.action,{Contract1:ID,Contract_Action:'Unknown child'}));await assert.rejects(h.c.createRecord(h.c.CFG.forms.action,{Contract1:ID,Contract_Action:'Unknown child'}));assert.equal(writes,1);assert.equal(Object.values(h.c.S.sdkMutationReviews)[0].id,'','conflicting or malformed create acknowledgement IDs cannot choose a recovery record');
}
{
  const h=await ready();h.c.auditLog('warn','Private link https://example.test/path?tokenId=CAPABILITY-1&contractId=123',{url:'https://example.test/path?token=CAPABILITY-2',tokenId:'CAPABILITY-3',response:{base64:'PRIVATE-BYTES'},error:new Error('https://example.test/file?privateLink=CAPABILITY-4')});assert.ok(!JSON.stringify(h.c.S.audit).includes('CAPABILITY'));assert.ok(!JSON.stringify(h.logs).includes('CAPABILITY'));assert.ok(!JSON.stringify(h.c.S.audit).includes('PRIVATE-BYTES'));
}
console.log('PASS whole Contracts UI foundation: fresh native handshake, 5001 counted full-field actions/max3, authoritative Prod GET/Dev POST, retained degraded policy, atomic denied startup, late-init exclusion, exact native CRUD/readback/no replay, informational acknowledgement metadata and capability redaction.');
export {harness,ready,drain,deferred,ID,ACTION,SUB,ACCESS,NEW};
