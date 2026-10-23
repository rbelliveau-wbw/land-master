// Local-only integration harness. It replaces the SDK ONLY in served previews.
// No fixture file is copied to widgets/, releases/, dist/ or Creator.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {crewFixture,crewDesktopFixture} from './fixtures/crew-locations.mjs';
const root=path.resolve('widgets/crew-locations/src/app'),port=Number(process.argv[2]||4317);
function fixtureSDK(data){
 // Simulate a host consuming bubbling change events at document level. Editors
 // must save at their own element/container before reaching that host listener.
 document.addEventListener('change',event=>{if(event.target.matches('.stage-input,.boundary-input'))event.stopImmediatePropagation();});
 // Every document gets its own actor/preferences, including nested and parallel
 // sizing checks. Only this document's temporary key is removed on exit.
 const fixtureUser='isolated-fixture-'+crypto.randomUUID()+'@local.test',fixturePreferenceKey='crew-locations:view:DEVELOPMENT:'+fixtureUser;
 window.addEventListener('pagehide',()=>localStorage.removeItem(fixturePreferenceKey));
 const NativeDate=Date;window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:['2026-10-21T17:00:00Z']));}static now(){return NativeDate.now();}};
 const fixture={requests:[],mode:new URLSearchParams(location.search).get('fixtureMode')||'normal',operations:[],prepared:new Map(),data};
 function expose(){const node=document.getElementById('fixture-audit');if(node)node.textContent=JSON.stringify({requests:fixture.requests,operations:fixture.operations,mode:fixture.mode});}
 const tables={All_Subdivisions:data.subdivisions,All_Milestones:data.milestones,All_Crews:data.crews,Crew_Assignment_Report:data.assignments,All_Task_Schedules:data.tasks};
 const iso=s=>!s?null:/^\d{4}-/.test(s)?s:s.slice(6)+'-'+s.slice(0,2)+'-'+s.slice(3,5),us=s=>!s?'':s.slice(5,7)+'/'+s.slice(8)+'/'+s.slice(0,4);
 const meta=body=>({ok:true,action:body.action,testingMode:false,creatorOnly:true,projectsPushEnabled:false,environment:'development'});
 window.ZOHO={CREATOR:{UTIL:{getInitParams:async()=>({loginUser:fixtureUser,appLinkName:'land-master',envUrlFragment:'environment/development'})},DATA:{
  getRecordCount:async config=>({code:3000,result:{records_count:tables[config.report_name].length}}),
  // SDK pages contain at least 200 rows when more remain. Match that contract;
  // tiny synthetic pages can otherwise hit LMData's bounded-completion guard.
  getRecords:async config=>{const rows=tables[config.report_name],offset=Number(config.record_cursor||0),pageSize=200,batch=rows.slice(offset,offset+pageSize).map(row=>Object.fromEntries(String(config.fields||Object.keys(row).join(',')).split(',').map(field=>[field,row[field]??''])));return {code:3000,data:batch,...(rows.length>offset+pageSize?{record_cursor:String(offset+pageSize)}:{})};},
  invokeCustomApi:async config=>{
   const body=JSON.parse(config.payload.payload);fixture.requests.push(body);expose();const base=meta(body);
   if(config.api_name!=='Crew_Locations_Widget_DEV')throw new Error('Unexpected fixture API name');
   if(body.action==='capabilities'){if(fixture.mode==='denied')return {...base,ok:false,message:'Fixture access revoked'};return {...base,permissions:{view:true,milestones:true,tasks:true},sources:{crews:fixture.mode!=='unconfigured',tasks:fixture.mode!=='unconfigured'&&!new URLSearchParams(location.search).has('desktop')},dependencies:['Isolated browser fixture. No live Creator or Projects records are connected.']};}
   if(body.action==='history')return {...base,operations:fixture.operations.filter(o=>o.subdivisionId===body.subdivisionId).map(o=>({...o,origin:o.origin,state:o.result.state,actor:'Fixture user',timestamp:'10/21/2026 12:00:00'}))};
   if(body.action==='status'){const op=fixture.operations.find(o=>o.operationId===body.operationId);if(op?.recoveryResult)op.result=op.recoveryResult;expose();return {...op?.result,...base,state:op?'saved':'unknown',unknown:!op,operationId:body.operationId};}
   if(body.action==='prepare'){
    if(fixture.mode==='reject'){fixture.mode='normal';return {...base,ok:false,unknown:false,message:'Fixture save denied before writing',operationId:body.operationId,confirmed:[]};}
    fixture.prepared.set(body.operationId,JSON.stringify({...body,action:'apply'}));
    if(fixture.mode==='prepare-lost'){fixture.mode='normal';throw new Error('Fixture preparation response lost before any date write');}
    return {...base,operationId:body.operationId,state:'prepared'};
   }
   if(body.action==='apply'){
    if(fixture.prepared.get(body.operationId)!==JSON.stringify(body))return {...base,ok:false,unknown:false,message:'Prepare this exact operation before saving'};
    if(fixture.mode==='reject'){fixture.mode='normal';return {...base,ok:false,unknown:false,message:'Fixture save denied before writing',operationId:body.operationId,confirmed:[]};}
    const existing=fixture.operations.find(o=>o.operationId===body.operationId);if(existing)return {...base,...existing.result};
    const confirmed=[],records=[];
    for(const change of body.changes){const rows=change.type==='M'?data.milestones:data.tasks,r=rows.find(r=>r.ID===change.recordId);if(!r)throw new Error('Missing fixture record');if(body.origin==='drag'&&change.type==='T')return {...base,ok:false,unknown:false,message:'Task dragging prohibited'};if(iso(r.Start_Date)!==change.expected.start||iso(r.End_Date)!==change.expected.end)return {...base,ok:false,unknown:false,message:'Fixture revision conflict'};for(const [field,entry] of Object.entries(change.fields))r[field==='start'?'Start_Date':'End_Date']=us(entry.after);r.Push_Update=false;confirmed.push({type:change.type,recordId:change.recordId});records.push({type:change.type,id:change.recordId,start:iso(r.Start_Date),end:iso(r.End_Date)});}
    const result={...base,operationId:body.operationId,state:'saved',confirmed,...(fixture.mode==='identity-only'?{}:{records})};
    if(fixture.mode==='identity-only')fixture.mode='normal';
    if(fixture.mode==='ambiguous'){fixture.mode='normal';const unknown={...base,ok:false,unknown:true,operationId:body.operationId,state:'unknown',message:'Fixture native acknowledgement is ambiguous',confirmed:[],records:[]};fixture.operations.push({...body,result:unknown,recoveryResult:result});expose();return unknown;}
    fixture.operations.push({...body,result});expose();
    if(fixture.mode==='lost'){fixture.mode='normal';throw new Error('Fixture response lost after local write');}
    return result;
   }
   throw new Error('Unknown fixture action');
  }
 }}};
 window.addEventListener('DOMContentLoaded',()=>{
  document.title='Isolated preview — Crew Locations';const warning=document.createElement('aside');warning.id='fixture-warning';warning.setAttribute('role','note');warning.textContent='ISOLATED PREVIEW — sample records only; no Creator or Projects connection.';warning.style.cssText='background:#17355a;color:#fff;padding:8px 14px;border-radius:7px;font:13px Segoe UI,sans-serif;margin-bottom:16px';document.body.prepend(warning);
  const panel=document.createElement('details');panel.id='fixture-tools';panel.innerHTML='<summary>Isolated preview controls</summary><p>No live records are connected. These controls are not in the widget package.</p>'+['normal','reject','lost','prepare-lost','ambiguous','identity-only','triple','denied','unconfigured'].map(mode=>'<button data-fixture-mode="'+mode+'">'+mode+'</button>').join(' ')+'<pre id="fixture-audit" hidden></pre><ol id="browser-checks" aria-label="Browser test results"></ol>';document.body.appendChild(panel);panel.addEventListener('click',e=>{if(e.target.dataset.fixtureMode){fixture.mode=e.target.dataset.fixtureMode;if(fixture.mode==='triple')for(const rows of [data.milestones,data.tasks])rows.filter(r=>r.Subdivision1.ID===data.subdivisions[1].ID&&(r.Stage_Key||r.Milestone_Name)==='Rough Cut').forEach(r=>r.End_Date='02/10/2027');expose();}});expose();
 });
}
const sdk='('+fixtureSDK.toString()+')('+JSON.stringify(crewFixture())+');';
const desktopSdk='('+fixtureSDK.toString()+')('+JSON.stringify(crewDesktopFixture())+');';
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1'),name=url.pathname==='/'?'/widget.html':url.pathname;
 if(name==='/desktop.html'){res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Crew desktop sizing checks</title><style>body{margin:14px;font:14px Segoe UI,Arial,sans-serif;color:#172b46;background:#e5ecf3}button{font:inherit;border:1px solid #bac9de;border-radius:6px;padding:7px 10px;margin-right:6px;background:#fff;cursor:pointer}iframe{display:block;border:1px solid #abbdd4;background:white;max-width:none}pre{white-space:pre-wrap;font:13px/1.4 Consolas,monospace;max-width:1250px}p{margin:9px 0}</style><h1 style="font-size:20px;margin:0 0 10px">Isolated crew desktop checks</h1><div>${[[1250,600],[1366,768],[1440,900],[1920,1080]].map(([w,h])=>'<button data-size="'+w+'x'+h+'">'+w+' × '+h+'</button>').join('')}</div><p id="size"></p><iframe id="desktopFrame" title="Crew Management desktop preview"></iframe><pre id="results" aria-live="polite">Loading…</pre><script>const frame=document.getElementById('desktopFrame');function resize(size){const [w,h]=size.split('x').map(Number);frame.width=w;frame.height=h;document.getElementById('size').textContent='Widget viewport: '+w+' × '+h+' · 38 synthetic phases · Tasks unavailable';document.getElementById('results').textContent='Running…';frame.src='/widget.html?desktop=1&checks=1&case='+encodeURIComponent(size);}document.querySelectorAll('[data-size]').forEach(button=>button.onclick=()=>resize(button.dataset.size));window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===frame.contentWindow&&event.data?.crewDesktopQA)document.getElementById('results').textContent=JSON.stringify(event.data.crewDesktopQA,null,2);});resize(new URLSearchParams(location.search).get('size')||'1250x600');</script></html>`);return;}
 if(name==='/__crew-fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(url.searchParams.has('desktop')?desktopSdk:sdk);return;}
 if(name==='/__crew-browser-checks.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync('scripts/fixtures/crew-browser-checks.js'));return;}
 if(name==='/__crew-desktop-checks.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync('scripts/fixtures/crew-desktop-checks.js'));return;}
 const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');let content=fs.readFileSync(file);
 if(file.endsWith('widget.html')){content=content.toString().replace('https://static.zohocdn.com/creator/widgets/version/2.0/widgetsdk-min.js','/__crew-fixture.js'+(url.searchParams.has('desktop')?'?desktop=1':''));if(url.searchParams.has('checks'))content=content.replace('</body>','<script src="/'+(url.searchParams.has('desktop')?'__crew-desktop-checks.js':'__crew-browser-checks.js')+'"></script></body>');}
 res.end(content);
});
server.listen(port,'127.0.0.1',()=>console.log('Isolated Crew Locations preview: http://127.0.0.1:'+port+'/widget.html (add ?checks=1 for browser integration checks). No live writes.'));
