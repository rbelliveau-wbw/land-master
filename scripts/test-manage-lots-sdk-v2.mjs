// Inert native SDK2 simulation. Evaluates the real app scripts and complete IIFE.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
// After adoption, run with --app-root=widgets/manage-lots/src/app.
const app=(process.argv.find(arg=>arg.startsWith('--app-root='))?.slice('--app-root='.length)||'widgets/manage-lots/src/app').replace(/[\\/]+$/,'')+'/',html=fs.readFileSync(app+(fs.existsSync(app+'widget.html')?'widget.html':'index.html'),'utf8');
const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match=>match[1]).find(text=>text.includes('var CFG='));
const widgetVersion=html.match(/version:"([^"]+)"/)[1];
assert.match(html,/widgets\/version\/2\.0\/widgetsdk-min\.js/);assert.doesNotMatch(inline,/ZOHO\.CREATOR\.API\.|ZOHO\.CREATOR\.init\(|spreadsheet\.|renderPlat\(/);
const SID='90071992547409931',LOT='90071992547409941',SOLD='90071992547409942',BUILDER='90071992547409961',TD='90071992547409951',CREATED='90071992547409981';
const plain=value=>JSON.parse(JSON.stringify(value));const turn=()=>new Promise(resolve=>setImmediate(resolve));const drain=async()=>{for(let i=0;i<20;i++)await turn()};
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}}
function harness(options={}){
  const nodes=new Map(),events=new Map(),timers=new Map(),calls=[],copies=[];let timerSeq=0,initCalls=0,active=0,maximum=0;
  function node(id='',tag='div'){
    const classes=new Set(),listeners=new Map(),attrs={};let markup='';
    const out={id,tagName:tag.toUpperCase(),value:'',textContent:'',style:{},dataset:{},disabled:false,hidden:false,inert:false,spans:[],
      classList:{add(...values){values.forEach(value=>classes.add(value))},remove(...values){values.forEach(value=>classes.delete(value))},contains:value=>classes.has(value),toggle(value,on){if(on===undefined)on=!classes.has(value);if(on)classes.add(value);else classes.delete(value);return on}},
      addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn)},async fire(name,event={}){for(const fn of listeners.get(name)||[])await fn.call(out,event)},
      querySelectorAll(selector){if(selector==='span')return out.spans;if(selector==='button')return [...nodes.values()].filter(n=>n.id.startsWith('mlProgress')&&n.tagName==='BUTTON');return[]},querySelector(){return null},closest(){return null},
      setAttribute(name,value){attrs[name]=String(value)},getAttribute:name=>attrs[name],getBoundingClientRect:()=>({top:0,left:0,bottom:20,right:20,width:20,height:20}),focus(){document.activeElement=out},select(){out.selected=true},appendChild(child){if(child.id)nodes.set(child.id,child)},removeChild(){},remove(){},before(){}};
    Object.defineProperty(out,'innerHTML',{get:()=>markup,set(value){markup=String(value);for(const match of markup.matchAll(/<([a-z][a-z0-9]*)\b[^>]*\bid=(['"])(.*?)\2([^>]*)>/g)){const child=node(match[3],match[1]),valueAttr=match[4].match(/\bvalue=(['"])(.*?)\1/);if(valueAttr)child.value=valueAttr[2];nodes.set(child.id,child)}out.spans=[...markup.matchAll(/<span[^>]*>(.*?)<\/span>/g)].map(match=>({textContent:match[1]}))}});return out;
  }
  for(const match of html.matchAll(/<([a-z][a-z0-9]*)\b[^>]*\bid="([^"]+)"/g))nodes.set(match[2],node(match[2],match[1]));
  const document={referrer:'https://creatorapp.zoho.com/fixture/land-master/',body:node('body'),activeElement:null,
    getElementById:id=>nodes.get(id)||null,querySelector:selector=>selector==='.tabs'?tabs:['.topbar','.toolbar','.main'].includes(selector)?node(selector):null,
    querySelectorAll:selector=>selector.startsWith('#form input')?[...nodes.values()].filter(n=>/^(INPUT|SELECT|TEXTAREA)$/.test(n.tagName)&&/^(f|ir|if|it)/.test(n.id)):selector==='header,.toolbar,.main,#selectionBar,#overlay'?[nodes.get('selectionBar'),nodes.get('overlay')]:[],
    createElement:tag=>node('',tag),addEventListener(name,fn){events.set(name,fn)},execCommand:()=>false};const tabs=node('tabs');
  const rows={All_Subdivisions:[{ID:SID,Subdivision_Name:'Fixture subdivision',Subdivision_Code:'FX01'}],All_Builders:[{ID:BUILDER,Builder_Name:'Fixture builder'}],
    All_Builder_Takedowns:[{ID:TD,Name:'Read-only takedown',Lots:[],Subdivision1:{ID:SID},Builder1:{ID:BUILDER},Lot_Count:0,Added_Time:'01-Oct-2026 10:00:00',Entered_Date:'10/01/2026',Purchase_Date:'10/15/2026',Status:'Active',Total:'12345.67'}],All_Contracts1:[],
    All_Lots_All_Fields:[{ID:LOT,Subdivision:{ID:SID},Status:'Open',Archived:false,Add_Builder_Takedown_Name:{},Base_Price:80000,Earnest_Money:8000,Additional_Tax:0,Additional_Fees:0,Escalator:null,Escalator_Start_Date:null,Block:'001',Lot_Number:'01'}],
    All_Active_Lots_List_View:[{ID:LOT,Subdivision:{ID:SID},Status:'Open',Block:'001',Lot_Number:'01'},{ID:SOLD,Subdivision:{ID:SID},Status:'Sold',Block:'001',Lot_Number:'02'}],All_Active_Lots_Contracts_View:[]};
  const gate={init:options.init||null,read:null,write:null,response:undefined,denyCore:false,denyOptional:false,mismatch:false,reverseWrong:false};
  const initParams=options.params||{loginUser:'actual-native-actor',appLinkName:'land-master',envUrlFragment:''};
  function scoped(config){let data=rows[config.report_name]||[];const sid=(config.criteria||'').match(/\(Subdivision == (\d+)\)/),record=(config.criteria||'').match(/\(ID == (\d+)\)/);if(sid)data=data.filter(row=>row.Subdivision?.ID===sid[1]);if(record)data=data.filter(row=>row.ID===record[1]);return data}
  async function invoke(method,config){
    calls.push({method,config:plain(config)});active++;maximum=Math.max(maximum,active);
    try{
      assert.equal(config.reportName,undefined);assert.equal(config.formName,undefined);
      if(gate.denyCore&&config.report_name==='All_Builders')throw {code:2898,message:'Denied core fixture'};
      if(gate.denyOptional&&config.report_name==='All_Contracts1')throw {code:2898,message:'Denied optional fixture'};
      if(method==='add'){
        if(gate.write)await gate.write.promise;
        if(gate.response!==undefined){if(gate.response instanceof Error)throw gate.response;return plain(gate.response)}
        const payload=config.payload.data;rows.All_Builder_Takedowns.push({...plain(payload),ID:CREATED,Subdivision1:{ID:payload.Subdivision1},Builder1:{ID:payload.Builder1},Lots:payload.Lots.map(ID=>({ID})),Added_Time:'02-Oct-2026 12:00:00'});
        for(const row of rows.All_Lots_All_Fields)if(payload.Lots.includes(row.ID))row.Add_Builder_Takedown_Name=[{ID:gate.reverseWrong===true||gate.reverseWrong===row.ID?TD:CREATED}];
        return {code:3000,data:{ID:CREATED}};
      }
      const captured=plain(scoped(config));if(method==='count')return {code:3000,result:{records_count:captured.length+(gate.mismatch&&config.report_name==='All_Lots_All_Fields'?1:0)}};
      if(gate.read)await gate.read.promise;
      if(config.report_name==='All_Builder_Takedowns'){
        const fields=config.field_config==='custom'?['ID',...config.fields.split(',')]:['ID','Name','Lots','Subdivision1','Builder1','Lot_Count','Added_Time'];
        captured.forEach(row=>Object.keys(row).forEach(key=>{if(!fields.includes(key))delete row[key]}));
      }
      const offset=config.record_cursor?Number(config.record_cursor):0,page=captured.slice(offset,offset+1000),more=offset+page.length<captured.length;
      return {code:3000,data:page,...(more?{record_cursor:String(offset+page.length)}:{})};
    }finally{active--}
  }
  const context=vm.createContext({document,location:{pathname:'/prod/manage-lots/',href:'https://example.test/prod/manage-lots/'},navigator:{clipboard:{writeText:async text=>{copies.push(text)}}},console:{log(){},info(){},warn(){},error(){}},CSS:{escape:String},innerWidth:1200,innerHeight:800,URL,URLSearchParams,Promise,Date,Error,Set,Map,
    matchMedia:()=>({matches:options.reduced!==false}),setTimeout(fn,ms){const id=++timerSeq;timers.set(id,{fn,ms});return id},clearTimeout:id=>timers.delete(id),addEventListener(name,fn){events.set(name,fn)},
    ZOHO:{CREATOR:{UTIL:{getInitParams:async()=>{initCalls++;if(gate.init)return gate.init.promise;return plain(initParams)}},DATA:{getRecordCount:config=>invoke('count',config),getRecords:config=>invoke('read',config),addRecords:config=>invoke('add',config)}}}});context.window=context;
  for(const file of ['runtime-context.js','creator-data.js','subdivision-counts.js','manage-lots-controller.js','takedown-model.js','takedown-editor.js','lot-edit-controller.js','lots-list.js'].filter(file=>fs.existsSync(app+file)))vm.runInContext(fs.readFileSync(app+file,'utf8'),context,{filename:file});
  vm.runInContext(inline,context,{filename:'whole-manage-lots-sdk2.js'});
  async function timersAt(ms){for(const [key,timer]of[...timers])if(timer.ms===ms){timers.delete(key);timer.fn()}await drain()}
  async function flushProgress(){for(let i=0;i<6;i++)await timersAt(options.reduced===false?560:0)}
  async function choose(){if(nodes.has('lotsGridMode'))await nodes.get('lotsGridMode').fire('click');context.__MLW_TEST__.setSubdivisionIds([SID]);await drain();context.__MLW_TEST__.applySelection(LOT,true);context.__MLW_TEST__.openModal();for(const [id,value]of Object.entries({fName:'Frozen fixture takedown',fBuilder:BUILDER,fStatus:'Active',fEntered:'2026-10-02',fPurchase:'2026-10-04',fTaxMethod:'Flat',fTaxStatus:'Taxes Paid',fTaxPerLot:'0',fPercent:'0',fFees:'0'}))nodes.get(id).value=value;await context.LMTakedownEditor.loadDefaults();nodes.get('fName').value='Frozen fixture takedown'}
  return {context,nodes,rows,gate,calls,copies,events,timers,timersAt,flushProgress,choose,widget:context.__MLW_TEST__,state:context.__MLW_TEST__.S,initCalls:()=>initCalls,maximum:()=>maximum};
}
const writes=h=>h.calls.filter(call=>call.method==='add');
// The native count task has one documented result object. Competing failure containers
// never publish a numerical badge, even alongside a valid records_count.
for(const response of [
  {code:3000,result:{records_count:'0',result:{code:2898,error:'Denied'}}},
  {code:3000,result:{records_count:'1'},details:{code:2898,status:'failure'}},
  {code:3000,result:{records_count:'1'},response:'{"code":2898,"error":"Denied"}'},
  {code:3000,result:{records_count:'1',details:{success:false}}},
  {code:3000,result:{records_count:'1'},data:{ID:CREATED}},
]){
  const h=harness();await drain();let requests=0;h.context.ZOHO.CREATOR.DATA.getRecordCount=async()=>{requests++;return response};
  await assert.rejects(h.widget.controller.count('All_Lots_All_Fields','(Subdivision == '+SID+')'),error=>{assert.equal(error.raw,response);assert.equal(error.noReplay,false);return true});
  assert.equal(requests,1);assert.equal(writes(h).length,0);
  const core=harness();await drain();const nativeCount=core.context.ZOHO.CREATOR.DATA.getRecordCount;
  core.context.ZOHO.CREATOR.DATA.getRecordCount=config=>config.report_name==='All_Builders'?Promise.resolve(response):nativeCount(config);
  await core.widget.load();await drain();assert.equal(core.widget.controller.state.ready,false,'the complete core snapshot must reject the same failed count, not publish an editable empty collection');assert.equal(core.nodes.get('create').disabled,true);assert.equal(writes(core).length,0);
}
// An applied native create with a contradictory wrapper stays unverified. A unique
// returned ID permits a subsequent explicit read-only reconciliation, never replay.
for(const extra of [{details:{code:2898,error:'Denied'}},{response:'{"status":"failure"}'},{output:[{success:false}]}]){
  const h=harness();await drain();await h.choose();const add=h.context.ZOHO.CREATOR.DATA.addRecords;
  h.context.ZOHO.CREATOR.DATA.addRecords=async config=>({...await add(config),...extra});
  await h.widget.confirm();await h.flushProgress();assert.equal(writes(h).length,1);assert.ok(h.widget.controller.state.review);assert.equal(h.widget.controller.state.review.createdId,CREATED);assert.equal(h.widget.controller.state.review.error.noReplay,true);assert.equal(h.state.verifiedCreate,undefined);assert.notEqual(h.nodes.get('mlProgressStage2').textContent,'Done');
  await h.widget.confirm();assert.equal(writes(h).length,1);await h.widget.recheckCreate();await h.flushProgress();assert.equal(writes(h).length,1);assert.equal(h.widget.controller.state.review,null);assert.equal(h.nodes.get('mlProgressStage2').textContent,'Done','only the explicit persisted claims read proves the result');
}
{
  const h=harness();await drain();await h.choose();const add=h.context.ZOHO.CREATOR.DATA.addRecords;
  h.context.ZOHO.CREATOR.DATA.addRecords=async config=>({code:2899,output:await add(config)});
  await h.widget.confirm();await h.flushProgress();assert.equal(writes(h).length,1);assert.ok(h.widget.controller.state.review);assert.equal(h.widget.controller.state.review.createdId,CREATED);assert.equal(h.widget.controller.state.review.error.noReplay,true);assert.equal(h.state.verifiedCreate,undefined);
  await h.widget.confirm();assert.equal(writes(h).length,1,'an outer rejection competing with an applied output ID is not a definite precommit failure');await h.widget.recheckCreate();await h.flushProgress();assert.equal(h.widget.controller.state.review,null);assert.equal(writes(h).length,1);
}
{
  const h=harness();await drain();await h.choose();const add=h.context.ZOHO.CREATOR.DATA.addRecords;
  h.context.ZOHO.CREATOR.DATA.addRecords=async config=>({...await add(config),details:{code:2898,data:{ID:'90071992547409982'}}});
  await h.widget.confirm();await h.flushProgress();assert.equal(writes(h).length,1);assert.equal(h.widget.controller.state.review.createdId,'','competing record IDs cannot select an invented reconciliation target');assert.equal(await h.widget.recheckCreate(),false);await h.widget.confirm();assert.equal(writes(h).length,1);
}
// Every legacy interest period and date field is captured unchanged in the real
// SDK2 create, including the declared Interest_Rate_71 field for period seven.
{
  const h=harness();await drain();await h.choose();for(let i=1;i<=12;i++){h.nodes.get('ir'+i).value=String(i+0.25);h.nodes.get('if'+i).value='2026-09-'+String(i).padStart(2,'0');h.nodes.get('it'+i).value='2026-09-'+String(i+1).padStart(2,'0');}
  const baseline=fs.readFileSync('releases/manage-lots/0.9.15/index.html','utf8'),payload=baseline.split(/\r?\n/).find(line=>line.includes('function payload()'));
  const ctx=vm.createContext({S:h.state,val:id=>h.nodes.get(id)?.value||'',selectedLotSubdivisionId:()=>SID,toZoho:v=>v?v.split('-').slice(1).concat(v.split('-')[0]).join('/'):'',Array,Number});vm.runInContext(payload,ctx);
  const expected={...plain(ctx.payload()),Base_Price_Subtotal:80000,DRH_Subtract_Day:false,Subtract_Day_From:[],Additional_Items:[]};assert.deepEqual(plain(h.widget.payload()),expected);await h.widget.confirm();await h.flushProgress();const sent=writes(h)[0].config.payload.data;assert.deepEqual(sent,expected);assert.equal(Object.keys(sent).filter(key=>/^(Interest_Rate_|Date[0-9]+_[12])/.test(key)).length,36);assert.equal(sent.Interest_Rate_71,7.25);
  h.state.takedowns[0].Builder1={ID:BUILDER,zc_display_value:'Native builder label'};h.state.view='takedowns';h.widget.render();assert.match(h.nodes.get('takedownsBody').innerHTML,/Native builder label/);assert.doesNotMatch(h.nodes.get('takedownsBody').innerHTML,/input|textarea|data-act=|data-edit=/);
}
{
  const h=harness();await drain();assert.equal(h.nodes.get('mode').textContent,'Connected');assert.equal(h.initCalls(),1);assert.equal(h.widget.controller.state.ready,true);
  h.widget.setSubdivisionIds([SID]);await drain();assert.deepEqual(Array.from(h.state.lots,row=>row.ID),[LOT,SOLD]);assert.equal(h.widget.eligible(h.state.lots[0]),true);assert.equal(h.widget.eligible(h.state.lots[1]),false);assert.match(h.nodes.get('blocks').innerHTML,/Block 001/);assert.match(h.nodes.get('blocks').innerHTML,/>01<\/button>/);assert.equal(h.widget.controller.state.core.claims.size,0);
  await h.nodes.get('btnLogCopy').fire('click');assert.ok(h.copies[0].includes('Manage Lots v'+widgetVersion+' | env=PRODUCTION | user=actual-native-actor | lots=2'));
  await h.widget.load();await drain();assert.equal(h.state.lots.length,2);assert.equal(writes(h).length,0);assert.ok(h.maximum()<=3);
}
{
  const h=harness();await drain();await h.choose();const original=h.nodes.get('fName').value,calls=h.calls.length;
  assert.equal(await h.widget.load(),false,'active selection/form draft prevents snapshot replacement');assert.equal(h.calls.length,calls);assert.equal(h.nodes.get('fName').value,original);
  await h.widget.confirm();await h.flushProgress();assert.equal(writes(h).length,1);assert.equal(writes(h)[0].config.form_name,'Builder_Takedown');assert.equal(writes(h)[0].config.payload.data.Lots[0],LOT);assert.equal(h.state.verifiedCreate.createdId,CREATED);assert.equal(h.nodes.get('mlProgressStage2').textContent,'Done');assert.equal(h.nodes.get('mlProgress').classList.contains('open'),true,'terminal result stays visible');assert.equal(h.widget.closeCreateProgress(),true);await drain();assert.equal(h.widget.controller.state.ready,true);
}
for(const response of [{code:3000},{code:3000,data:{ID:123}},{code:3000,data:{ID:CREATED},result:[{code:3000,data:{ID:CREATED}}]},{code:2945,data:{ID:CREATED}},{code:3000,result:[{code:3000,data:{ID:CREATED}},{code:2899,error:'Denied'}]},{code:3000,status:'failure',data:{ID:CREATED}},new Error('Native response lost')]){
  const h=harness();await drain();await h.choose();h.gate.response=response;await h.widget.confirm();await h.flushProgress();
  assert.equal(writes(h).length,1);assert.ok(h.widget.controller.state.review);assert.equal(h.nodes.get('fName').value,'Frozen fixture takedown');await h.widget.confirm();assert.equal(writes(h).length,1,'ambiguous/mixed acknowledgement never permits a second explicit insert');assert.equal(await h.widget.load(),false);
}
{
  const h=harness();await drain();await h.choose();const held=deferred();h.gate.write=held;const first=h.widget.confirm();await drain();
  assert.equal(h.widget.closeCreateProgress(),false);assert.equal(h.nodes.get('confirm').disabled,true);assert.equal(h.nodes.get('fName').disabled,true);h.widget.applySelection(LOT,false);assert.equal(h.state.selected.has(LOT),true);await h.widget.confirm();assert.equal(writes(h).length,1);
  await h.timersAt(20000);await first;await h.flushProgress();assert.ok(h.widget.controller.state.review);assert.equal(h.widget.closeCreateProgress(),false,'pending native RPC remains locked after deadline');held.resolve();await drain();assert.equal(writes(h).length,1);assert.equal(h.widget.controller.state.review.createdId,'','late success cannot silently settle the expired create');
}
for(const change of ['claim','status','context']){
  const h=harness();await drain();await h.choose();if(change==='claim')h.rows.All_Builder_Takedowns[0].Lots=[{ID:LOT}];if(change==='status')h.rows.All_Lots_All_Fields[0].Status='Sold';if(change==='context')h.context.LMRuntime.apply({loginUser:'different-native-actor',envUrlFragment:''});
  await h.widget.confirm();await h.flushProgress();assert.equal(writes(h).length,0,'fresh eligibility/context preflight rejects the entire submission');assert.equal(h.state.selected.has(LOT),true,'failed preflight retains captured draft');
}
// Each complete native report contributes Sold monotonically; stale eligibility never wins.
for(const changedReport of ['All_Lots_All_Fields','All_Active_Lots_List_View']){
  const h=harness();await drain();h.rows[changedReport][0].Status='Sold';
  const before=plain(h.rows);h.widget.setSubdivisionIds([SID]);await drain();
  assert.equal(h.widget.lotById(LOT).Status,'Sold');assert.equal(h.widget.eligible(h.widget.lotById(LOT)),false);assert.equal(h.widget.lotState(h.widget.lotById(LOT)),'sold');
  assert.deepEqual(h.rows,before,'report union does not mutate the original counted snapshots');h.widget.applySelection(LOT,true);assert.equal(h.state.selected.has(LOT),false);assert.equal(writes(h).length,0);
}
for(const field of ['Status','Archived','Add_Builder_Takedown_Name']){
  const h=harness();await drain();await h.choose();
  h.rows.All_Active_Lots_List_View[0][field]=field==='Status'?'Scheduled':field==='Archived'?true:{ID:TD};
  await h.widget.confirm();await h.flushProgress();assert.equal(writes(h).length,0,'explicit contradictory eligibility blocks the captured whole submission');assert.equal(h.state.selected.has(LOT),true);assert.equal(h.nodes.get('fName').value,'Frozen fixture takedown');
}
// The preflight uses fresh immutable claims; another takedown cannot disappear into UI state.
{
  const h=harness();await drain();await h.choose();const oldClaims=h.state.takedownLotIds;
  h.rows.All_Builder_Takedowns.push({ID:'90071992547409952',Lots:[{ID:LOT}],Subdivision1:{ID:'90071992547409932'}});
  await h.widget.confirm();await h.flushProgress();assert.equal(writes(h).length,0);assert.equal(oldClaims.size,0);assert.equal(h.state.takedownLotIds,oldClaims,'fresh preflight does not replace the draft-bound core snapshot');
}
{
  const h=harness();await drain();await h.choose();h.gate.mismatch=true;await h.widget.confirm();await h.flushProgress();assert.equal(writes(h).length,0);assert.equal(h.nodes.get('mlProgressStage1').textContent,'Not sent');
}
{
  const h=harness();await drain();await h.choose();h.gate.reverseWrong=true;await h.widget.confirm();await h.flushProgress();assert.ok(h.widget.controller.state.review);assert.equal(h.widget.controller.state.review.createdId,CREATED);assert.equal(writes(h).length,1);
  h.rows.All_Lots_All_Fields[0].Add_Builder_Takedown_Name=[{ID:CREATED}];await h.widget.recheckCreate();await h.flushProgress();assert.equal(h.widget.controller.state.review,null);assert.equal(writes(h).length,1,'read-only recheck verifies original exact ID/claims without another create');
}
// Neither a competing ID nor a duplicate direct claim proves an exclusive relationship.
for(const directIds of [[CREATED,TD],[CREATED,CREATED]]){
  const h=harness();await drain();await h.choose();const add=h.context.ZOHO.CREATOR.DATA.addRecords;
  h.context.ZOHO.CREATOR.DATA.addRecords=async config=>{const response=await add(config);h.rows.All_Lots_All_Fields.find(row=>row.ID===LOT).Add_Builder_Takedown_Name=directIds.map(ID=>({ID}));return response;};
  await h.widget.confirm();await h.flushProgress();const review=h.widget.controller.state.review;
  assert.ok(review);assert.equal(review.createdId,CREATED);assert.equal(review.error.noReplay,true);assert.equal(review.error.uncertain,true);assert.deepEqual(Array.from(review.confirmedLotIds),[]);assert.equal(h.state.verifiedCreate,undefined);
  assert.equal(h.state.selected.has(LOT),true);assert.equal(h.nodes.get('fName').value,'Frozen fixture takedown');assert.notEqual(h.nodes.get('mlProgressStage2').textContent,'Done');
  await h.widget.confirm();assert.equal(writes(h).length,1,'another explicit confirm cannot replay a conflicting fresh relationship');assert.equal(await h.widget.load(),false);
  assert.equal(await h.widget.recheckCreate(),false,'read-only Recheck keeps an unresolved relationship in review');await h.flushProgress();assert.equal(writes(h).length,1);assert.equal(h.state.selected.has(LOT),true);
  h.rows.All_Lots_All_Fields.find(row=>row.ID===LOT).Add_Builder_Takedown_Name=[{ID:CREATED}];await h.widget.recheckCreate();await h.flushProgress();
  assert.equal(writes(h).length,1);assert.equal(h.widget.controller.state.review,null);assert.equal(h.state.verifiedCreate.createdId,CREATED);assert.equal(h.state.selected.size,0);assert.equal(h.nodes.get('mlProgressStage2').textContent,'Done','only an exact fresh singleton relationship verifies the captured destination');
}
for(const params of [{envUrlFragment:''},{loginUser:{name:'bad'},envUrlFragment:''},[],{loginUser:'known',envUrlFragment:'bad'}]){
  const h=harness({params});await drain();assert.equal(h.widget.controller.state.nativeReady,false);assert.equal(h.calls.length,0);assert.equal(h.state.live,false);
}
{
  const first=deferred(),h=harness({init:first});await drain();await h.timersAt(5000);assert.equal(h.calls.length,0);h.gate.init=null;await h.widget.load();await drain();assert.equal(h.initCalls(),2);first.resolve({loginUser:'late-expired-actor',envUrlFragment:''});await drain();assert.equal(h.context.LMRuntime.current().user,'actual-native-actor');
}
{
  const h=harness();await drain();for(let i=0;i<1201;i++)h.rows.All_Lots_All_Fields.push({ID:String(100000000000000000n+BigInt(i)),Subdivision:{ID:SID},Status:'Contracted',Archived:false,Add_Builder_Takedown_Name:{},Block:'001',Lot_Number:'000'+i});h.widget.setSubdivisionIds([SID]);await drain();assert.equal(h.state.lots.length,1203);assert.ok(h.calls.some(call=>call.method==='read'&&call.config.report_name==='All_Lots_All_Fields'&&call.config.record_cursor==='1000'));assert.ok(h.maximum()<=3);assert.equal(writes(h).length,0);
}
// Unknown partial scopes and core report failures never leave an editable selection.
{
  const h=harness();await drain();h.gate.mismatch=true;h.widget.setSubdivisionIds([SID]);await drain();
  assert.equal(h.state.lots.length,0);assert.equal(h.nodes.get('create').disabled,true);assert.equal(writes(h).length,0);
}
for(const field of ['Status','Archived','Add_Builder_Takedown_Name']){
  const h=harness();await drain();delete h.rows.All_Lots_All_Fields[0][field];if(field==='Status')delete h.rows.All_Active_Lots_List_View[0][field];
  h.widget.setSubdivisionIds([SID]);await drain();assert.equal(h.state.lots.length,0);assert.equal(h.nodes.get('availablePill').textContent,'Load failed','missing eligibility fields remain unavailable, never a false zero');assert.equal(writes(h).length,0);
}
{
  const h=harness();h.gate.denyCore=true;await drain();assert.equal(h.widget.controller.state.ready,false);assert.equal(h.nodes.get('create').disabled,true);assert.equal(writes(h).length,0);
  h.gate.denyCore=false;await h.widget.load();await drain();assert.equal(h.widget.controller.state.ready,true);
}
{
  const h=harness();h.gate.denyOptional=true;await drain();assert.equal(h.widget.controller.state.ready,true);await h.choose();assert.equal(h.state.selected.has(LOT),true);assert.equal(writes(h).length,0,'optional contract labels do not grant or block native lot eligibility');
}
// Native send starts before display pacing, while actual form/destination inputs remain locked.
{
  const h=harness({reduced:false});await drain();await h.choose();const held=deferred();h.gate.write=held;
  const sent=h.widget.confirm();await drain();assert.equal(writes(h).length,1,'560ms pacing never delays the native request');assert.equal(h.nodes.get('mlProgressStage0').textContent,'Running');assert.equal(h.widget.closeCreateProgress(),false);
  h.nodes.get('fName').value='Changed after captured send';h.nodes.get('fBuilder').value='90071992547409962';
  assert.equal(writes(h)[0].config.payload.data.Name,'Frozen fixture takedown');assert.equal(writes(h)[0].config.payload.data.Builder1,BUILDER);assert.equal(writes(h)[0].config.payload.data.Lots[0],LOT);
  held.resolve();await sent;assert.equal(h.widget.closeCreateProgress(),false,'terminal result cannot dismiss while stages are settling');await h.flushProgress();assert.equal(h.nodes.get('mlProgressStage2').textContent,'Done');assert.equal(h.widget.closeCreateProgress(),true);
}
// Persisted partial claims identify confirmed destinations and never create a second takedown.
{
  const h=harness();await drain();const second='90071992547409943';
  h.rows.All_Lots_All_Fields.push({...h.rows.All_Lots_All_Fields[0],ID:second,Lot_Number:'03'});await h.choose();h.widget.applySelection(second,true);h.gate.reverseWrong=second;
  await h.widget.confirm();await h.flushProgress();assert.equal(writes(h).length,1);assert.deepEqual(Array.from(h.widget.controller.state.review.confirmedLotIds),[LOT]);
  assert.deepEqual(h.nodes.get('mlProgressResults').spans.map(span=>span.textContent),['Verified','Needs review']);await h.widget.confirm();assert.equal(writes(h).length,1);
  h.rows.All_Lots_All_Fields.find(row=>row.ID===second).Add_Builder_Takedown_Name=[{ID:CREATED}];await h.widget.recheckCreate();await h.flushProgress();assert.equal(h.widget.controller.state.review,null);assert.equal(writes(h).length,1);assert.deepEqual(h.nodes.get('mlProgressResults').spans.map(span=>span.textContent),['Verified','Verified']);
}
// A request queued behind the bounded transport rechecks actor identity at actual send time.
{
  const h=harness();await drain();await h.choose();const waiting=deferred(),request=h.context.LMData.request;
  h.context.LMData=Object.freeze({...h.context.LMData,request:(name,invoke)=>name==='manage-lots:create'?waiting.promise.then(()=>request(name,invoke)):request(name,invoke)});
  const attempt=h.widget.confirm();await drain();h.context.LMRuntime.apply({loginUser:'changed-native-actor',envUrlFragment:''});waiting.resolve();await attempt;await h.flushProgress();
  assert.equal(writes(h).length,0);assert.equal(h.widget.controller.state.review,null,'a queued but never sent create is not an applied outcome');assert.equal(h.nodes.get('mlProgressStage1').textContent,'Not sent');
}
// A changed financial input must stop the whole create, even when eligibility is unchanged.
for(const field of ['Base_Price','Earnest_Money','Additional_Tax']){
  const h=harness();await drain();await h.choose();h.rows.All_Lots_All_Fields[0][field]+=100;
  await h.widget.confirm();await h.flushProgress();assert.equal(writes(h).length,0);assert.equal(h.state.selected.has(LOT),true);assert.match(h.nodes.get('formError').textContent,/pricing or taxes changed/);
}
// Saved financial fields/day settings are verified separately from otherwise correct claims.
for(const field of ['Tax_Per_Lot','Purchase_Date','Subtract_Day_From']){
  const h=harness();await drain();await h.choose();const add=h.context.ZOHO.CREATOR.DATA.addRecords;
  h.context.ZOHO.CREATOR.DATA.addRecords=async config=>{const response=await add(config),saved=h.rows.All_Builder_Takedowns.find(row=>row.ID===CREATED);saved[field]=field==='Purchase_Date'?'10/03/2026':field==='Subtract_Day_From'?['Tax']:100;return response;};
  await h.widget.confirm();await h.flushProgress();assert.equal(h.widget.controller.state.review,null);assert.equal(writes(h).length,1,'Returned receipt fields no longer fail a saved takedown');
}

// A real report-layout response omits form dates/totals unless explicitly projected.
{
 const h=harness();await drain();const reads=h.calls.filter(call=>call.method==='read'&&call.config.report_name==='All_Builder_Takedowns');
 assert.ok(reads.length);for(const call of reads){assert.equal(call.config.field_config,'custom');for(const field of ['Name','Lots','Subdivision1','Builder1','Lot_Count','Added_Time','Entered_Date','Purchase_Date','Status','Total'])assert.ok(call.config.fields.split(',').includes(field));}
 h.state.view='takedowns';h.widget.render();assert.match(h.nodes.get('takedownsBody').innerHTML,/10\/01\/2026/);assert.match(h.nodes.get('takedownsBody').innerHTML,/Close Date <b>10\/15\/2026<\/b>/,'the report uses the confirmed closing date already stored as Purchase_Date');
 h.widget.openTakedownDetail(TD);assert.match(h.nodes.get('takedownDetailBody').innerHTML,/Close Date <b>10\/15\/2026<\/b>/,'the detail modal uses the same closing date pill');assert.match(h.nodes.get('takedownDetailBody').innerHTML,/\$12,345.67/);assert.match(h.nodes.get('takedownDetailBody').innerHTML,/Active/);assert.equal(writes(h).length,0);
 const missing=h.widget.takedownDatesHTML({Entered_Date:'10/01/2026',Close_Date:'must not substitute a lot date'});assert.match(missing,/Close Date <b>—<\/b>/,'an omitted takedown purchase date stays unknown, without falling back to a lot date');
}
// The actual report remains a complete flat snapshot, with display-only details.
{
 const h=harness();await drain();const sub2='90071992547409932',b2='90071992547409962';
 h.state.subdivisions.push({ID:sub2,Subdivision_Name:'Other subdivision'});h.state.builders.push({ID:b2,Builder_Name:'Other builder'});
 h.state.takedowns=[{ID:'90071992547409990',Name:'Newest',Subdivision1:{ID:sub2},Builder1:{ID:b2},Added_Time:'04-Oct-2026 11:00:00',Entered_Date:'02-Oct-2026',Purchase_Date:'15-Oct-2026',Lot_Count:8,Status:'Active',Total:'12345.67',Lots:Array.from({length:8},(_,i)=>({ID:String(90071992547409000n+BigInt(i)),zc_display_value:'FX01-B01-L'+i+' - Scheduled'})),Notes:'<script>must be text</script>'}, {...h.state.takedowns[0],Name:'Older',Added_Time:'01-Oct-2026 11:00:00'}];
 h.state.view='takedowns';h.widget.render();const html=h.nodes.get('takedownsBody').innerHTML;assert.ok(html.indexOf('Newest')<html.indexOf('Older'));assert.doesNotMatch(html,/subdivision-row/);assert.match(html,/Other subdivision/);assert.match(html,/Other builder/);assert.match(html,/View all 8 lots/);assert.match(html,/lot-state scheduled/);assert.match(html,/02-Oct-2026/);
 h.state.takedownBuilderIds=[b2];assert.equal(h.widget.visibleTakedowns().length,1);h.state.takedownSubdivisionIds=[SID];assert.equal(h.widget.visibleTakedowns().length,0);h.state.takedownSubdivisionIds=[];h.state.takedownBuilderIds=[];
 h.widget.renderBuilderOptions();assert.match(h.nodes.get('builderOptions').innerHTML,/Other builder/);const before=h.calls.length;
 assert.equal(h.widget.openTakedownDetail('90071992547409990',h.nodes.get('builderToggle')),true);assert.match(h.nodes.get('takedownDetailBody').innerHTML,/\$12,345.67/);assert.equal((h.nodes.get('takedownDetailBody').innerHTML.match(h.widget.lotsList?/ll-status st-scheduled/g:/lot-detail-chip/g)||[]).length,8);assert.match(h.nodes.get('takedownDetailBody').innerHTML,/&lt;script&gt;/);assert.doesNotMatch(h.nodes.get('takedownDetailBody').innerHTML,/<script>/);assert.equal(h.calls.length,before);assert.equal(writes(h).length,0);h.widget.closeTakedownDetail();assert.equal(h.nodes.get('takedownDetail').classList.contains('open'),false);
}

console.log('Manage SDK2 actual whole-IIFE: native startup/timeout/fresh retry, full count/cursors/dual Sold merge/exact IDs/leading zeros, immutable draft/eligibility/financial/actor preflight, one strict create/claims and financial readback, unknown no-replay/read-only recheck, pending+paced UI locks and native clipboard passed.');
