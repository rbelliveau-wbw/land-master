// Whole-IIFE SDK1 startup regression: no importer globals; no native writes.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const app='widgets/manage-lots/src/app/';
const html=fs.readFileSync(app+'widget.html','utf8');
const original=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match=>match[1]).find(text=>text.includes('var CFG='));
assert.ok(original);
assert.match(html,/widgets\/version\/1\.0\/widgetsdk-min\.js/,'This rollback candidate remains SDK1.');
const inline=original;
assert.doesNotMatch(inline,/spreadsheet\.state\(\)|renderPlat\(/,'Obsolete importer expressions must not return.');
const SID='90071992547409931',LOT='90071992547409941',SOLD='90071992547409942',BUILDER='90071992547409961',TD='90071992547409951';
const drain=async()=>{for(let index=0;index<12;index++)await new Promise(resolve=>setImmediate(resolve));};
function element(id=''){
  const classes=new Set(),listeners=new Map();
  const node={id,value:'',textContent:'',innerHTML:'',style:{},dataset:{},hidden:false,disabled:false,listeners,
    classList:{add(...values){values.forEach(value=>classes.add(value));},remove(...values){values.forEach(value=>classes.delete(value));},contains:value=>classes.has(value),toggle(value,on){if(on===undefined)on=!classes.has(value);if(on)classes.add(value);else classes.delete(value);return on;}},
    addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);},
    async fire(type,event){for(const fn of listeners.get(type)||[])await fn(event);},
    querySelectorAll(){return[];},querySelector(){return null;},closest(){return null;},
    setAttribute(){},removeAttribute(){},getBoundingClientRect(){return{top:0,left:0,bottom:20,right:20,width:20,height:20};},
    focus(){},select(){node.selected=true;},remove(){},before(){},appendChild(){},removeChild(){}};
  return node;
}
async function boot({clipboard='absent',optionalDenied=false,coreDenied=false}={}){
  const nodes=new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(match=>[match[1],element(match[1])]));
  const calls=[],copies=[],events=new Map(),timers=new Map();let timer=0,initializations=0,captures=0;
  const flags={optionalDenied,coreDenied};
  const rows={
    All_Subdivisions:[{ID:SID,Subdivision_Name:'Fixture subdivision',Subdivision_Code:'FX01'}],
    All_Builders:[{ID:BUILDER,Builder_Name:'Fixture builder'}],
    All_Builder_Takedowns:[{ID:TD,Name:'Read-only fixture',Lots:[],Subdivision1:{ID:SID},Added_Time:'01-Oct-2026 10:00:00'}],
    All_Contracts1:[],
    All_Lots_All_Fields:[{ID:LOT,Subdivision:{ID:SID},Status:'Open',Archived:false,Add_Builder_Takedown_Name:'',Block:'A',Lot_Number:'01'}],
    All_Active_Lots_List_View:[{ID:LOT,Subdivision:{ID:SID},Status:'Open',Block:'A',Lot_Number:'01'},{ID:SOLD,Subdivision:{ID:SID},Status:'Sold',Block:'A',Lot_Number:'02'}]
  };
  const document={referrer:'https://creatorapp.zoho.com/fixture/land-master/',body:element('body'),
    getElementById:id=>nodes.get(id)||null,querySelector:selector=>selector==='.tabs'?element('tabs'):null,querySelectorAll:()=>[],
    createElement:()=>element(),addEventListener(type,fn){events.set(type,fn);},execCommand:()=>false};
  const navigator={};
  if(clipboard!=='absent')navigator.clipboard={writeText(text){copies.push(text);return clipboard==='success'?Promise.resolve():Promise.reject(new Error('Clipboard blocked'));}};
  const context=vm.createContext({document,navigator,location:{pathname:'/prod/manage-lots/',href:'https://example.test/prod/manage-lots/'},
    console:{log(){},warn(){},error(){},info(){}},CSS:{escape:String},innerWidth:1200,innerHeight:800,
    setTimeout(fn,ms){const id=++timer;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),addEventListener(type,fn){events.set(type,fn);},
    ZOHO:{CREATOR:{init:async()=>{initializations++;},UTIL:{getInitParams:async()=>{captures++;return{loginUser:'fixture@example.test',envUrlFragment:''};}},API:{
      getAllRecords:async args=>{
        calls.push({kind:'read',args:JSON.parse(JSON.stringify(args))});
        assert.equal(args.report_name,undefined);assert.equal(args.page,1);assert.equal(args.pageSize,200);
        if(flags.coreDenied&&args.reportName==='All_Builders')throw{code:2898,message:'Denied core fixture'};
        if(flags.optionalDenied&&args.reportName==='All_Contracts1')throw{code:2898,message:'Denied optional fixture'};
        return{code:3000,data:JSON.parse(JSON.stringify(rows[args.reportName]||[]))};
      },
      getRecordCount:async args=>{calls.push({kind:'count',args});return{code:3000,result:{records_count:'0'}};},
      addRecord:async args=>{calls.push({kind:'add',args});throw new Error('Read-only fixture must never create.');},
      updateRecord:async args=>{calls.push({kind:'update',args});throw new Error('Read-only fixture must never update.');},
      deleteRecord:async args=>{calls.push({kind:'delete',args});throw new Error('Read-only fixture must never delete.');}
    }}}});
  context.window=context;
  vm.runInContext(fs.readFileSync(app+'runtime-context.js','utf8'),context);
  vm.runInContext(fs.readFileSync(app+'subdivision-counts.js','utf8'),context);
  vm.runInContext(inline,context,{filename:'manage-lots-actual-inline.js'});
  await drain();
  assert.ok(context.__MLW_TEST__,'Entire actual IIFE and wiring ran.');
  return{context,nodes,calls,copies,flags,state:context.__MLW_TEST__.S,widget:context.__MLW_TEST__,initializations:()=>initializations,captures:()=>captures};
}
const mutations=h=>h.calls.filter(call=>['add','update','delete'].includes(call.kind));

{
  const h=await boot({clipboard:'success'});
  assert.equal(h.nodes.get('mode').textContent,'Connected','Raw candidate full boot must succeed without importer globals.');
  assert.equal(h.initializations(),1);assert.equal(h.captures(),1);
  assert.equal(h.state.subdivisions[0].ID,SID);assert.equal(h.state.builders[0].ID,BUILDER);assert.equal(h.state.takedowns[0].ID,TD);
  assert.ok(h.calls.some(call=>call.args.reportName==='All_Contracts1'),'Optional contracts load must be reached.');
  h.widget.setSubdivisionIds([SID]);await drain();
  assert.deepEqual(Array.from(h.state.lots,row=>row.ID),[LOT,SOLD],'Actual complete dual-report scope merge survives repair.');
  assert.equal(h.state.lots[0].Lot_Number,'01');
  await h.nodes.get('btnLogCopy').fire('click');await drain();
  assert.match(h.copies[0],/^Manage Lots v[^ ]+ \| env=PRODUCTION \| user=fixture@example\.test \| lots=2/);
  assert.doesNotMatch(h.copies[0],/staged=/);
  await h.nodes.get('reload').fire('click');await drain();
  assert.equal(h.nodes.get('mode').textContent,'Connected');assert.equal(h.initializations(),1);assert.equal(h.captures(),1);
  assert.equal(h.state.lots.length,2);assert.equal(mutations(h).length,0);
}
for(const clipboard of ['absent','reject']){
  const h=await boot({clipboard});assert.equal(h.nodes.get('mode').textContent,'Connected');
  await h.nodes.get('btnLogCopy').fire('click');await drain();
  assert.equal(h.nodes.get('adRaw').hidden,false);assert.equal(h.nodes.get('adRaw').selected,true);
  assert.match(h.nodes.get('adRaw').value,/user=fixture@example\.test/);assert.doesNotMatch(h.nodes.get('adRaw').value,/staged=/);
  assert.equal(mutations(h).length,0);
}
{
  const h=await boot({optionalDenied:true});
  assert.equal(h.nodes.get('mode').textContent,'Connected');assert.equal(h.nodes.get('notice').textContent,'');
  assert.ok(h.state.audit.some(entry=>entry.level==='warn'&&entry.msg==='Contract lot details unavailable'));
  assert.equal(mutations(h).length,0);
}
{
  const h=await boot({coreDenied:true});
  assert.equal(h.nodes.get('mode').textContent,'Load failed');assert.match(h.nodes.get('notice').textContent,/Denied core fixture/);
  assert.ok(h.state.audit.some(entry=>entry.level==='error'&&entry.msg==='Creator report request failed'&&entry.meta.includes('2898')));
  assert.equal(h.calls.filter(call=>call.args.reportName==='All_Contracts1').length,0);
  h.flags.coreDenied=false;await h.nodes.get('reload').fire('click');await drain();
  assert.equal(h.nodes.get('mode').textContent,'Connected');assert.equal(mutations(h).length,0);
}
console.log('Manage Lots SDK1 whole-IIFE startup/nonempty core/scoped dual-reader/reload/audit clipboard+raw fallback/optional denial/core denial+retry passed.');
