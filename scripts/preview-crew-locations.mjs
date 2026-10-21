// Local-only integration harness. It replaces the SDK ONLY in served previews.
// No fixture file is copied to widgets/, releases/, dist/ or Creator.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {crewFixture} from './fixtures/crew-locations.mjs';
const root=path.resolve('widgets/crew-locations/src/app'),port=Number(process.argv[2]||4317);
function fixtureSDK(data){
 localStorage.removeItem('crew-locations:view:DEVELOPMENT:isolated-fixture@local.test');
 const NativeDate=Date;window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:['2026-10-21T17:00:00Z']));}static now(){return NativeDate.now();}};
 const fixture={requests:[],mode:'normal',operations:[],data};
 function expose(){const node=document.getElementById('fixture-audit');if(node)node.textContent=JSON.stringify({requests:fixture.requests,operations:fixture.operations,mode:fixture.mode});}
 const tables={All_Subdivisions:data.subdivisions,All_Milestones:data.milestones,All_Crews:data.crews,All_Crew_Assignments:data.assignments,All_Task_Schedules:data.tasks};
 const iso=s=>!s?null:/^\d{4}-/.test(s)?s:s.slice(6)+'-'+s.slice(0,2)+'-'+s.slice(3,5),us=s=>!s?'':s.slice(5,7)+'/'+s.slice(8)+'/'+s.slice(0,4);
 const meta=body=>({ok:true,action:body.action,testingMode:false,creatorOnly:true,projectsPushEnabled:false,environment:'development'});
 window.ZOHO={CREATOR:{UTIL:{getInitParams:async()=>({loginUser:'isolated-fixture@local.test',appLinkName:'land-master',envUrlFragment:'environment/development'})},DATA:{
  getRecordCount:async config=>({code:3000,result:{records_count:tables[config.report_name].length}}),
  getRecords:async config=>{const rows=tables[config.report_name],offset=Number(config.record_cursor||0),batch=rows.slice(offset,offset+20).map(row=>Object.fromEntries(String(config.fields||Object.keys(row).join(',')).split(',').map(field=>[field,row[field]??''])));return {code:3000,data:batch,...(rows.length>offset+20?{record_cursor:String(offset+20)}:{})};},
  invokeCustomApi:async config=>{
   const body=JSON.parse(config.payload.payload);fixture.requests.push(body);expose();const base=meta(body);
   if(config.api_name!=='Crew_Locations_Widget_DEV')throw new Error('Unexpected fixture API name');
   if(body.action==='capabilities'){if(fixture.mode==='denied')return {...base,ok:false,message:'Fixture access revoked'};return {...base,permissions:{view:true,milestones:true,tasks:true},sources:{crews:fixture.mode!=='unconfigured',tasks:fixture.mode!=='unconfigured'},dependencies:['Isolated browser fixture. No live Creator or Projects records are connected.']};}
   if(body.action==='history')return {...base,operations:fixture.operations.filter(o=>o.subdivisionId===body.subdivisionId).map(o=>({...o,origin:o.origin,state:o.result.state,actor:'Fixture user',timestamp:'10/21/2026 12:00:00'}))};
   if(body.action==='status'){const op=fixture.operations.find(o=>o.operationId===body.operationId);if(op?.recoveryResult)op.result=op.recoveryResult;expose();return {...op?.result,...base,state:op?'saved':'unknown',unknown:!op,operationId:body.operationId};}
   if(body.action==='apply'){
    if(fixture.mode==='reject'){fixture.mode='normal';return {...base,ok:false,unknown:false,message:'Fixture save denied before writing',operationId:body.operationId,confirmed:[]};}
    const existing=fixture.operations.find(o=>o.operationId===body.operationId);if(existing)return {...base,...existing.result};
    const confirmed=[],records=[];
    for(const change of body.changes){const rows=change.type==='M'?data.milestones:data.tasks,r=rows.find(r=>r.ID===change.recordId);if(!r)throw new Error('Missing fixture record');if(body.origin==='drag'&&change.type==='T')return {...base,ok:false,unknown:false,message:'Task dragging prohibited'};if(iso(r.Start_Date)!==change.expected.start||iso(r.End_Date)!==change.expected.end)return {...base,ok:false,unknown:false,message:'Fixture revision conflict'};for(const [field,entry] of Object.entries(change.fields))r[field==='start'?'Start_Date':'End_Date']=us(entry.after);r.Push_Update=false;confirmed.push({type:change.type,recordId:change.recordId});records.push({type:change.type,id:change.recordId,start:iso(r.Start_Date),end:iso(r.End_Date)});}
    const result={...base,operationId:body.operationId,state:'saved',confirmed,records};
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
  const panel=document.createElement('details');panel.id='fixture-tools';panel.innerHTML='<summary>Isolated preview controls</summary><p>No live records are connected. These controls are not in the widget package.</p>'+['normal','reject','lost','ambiguous','triple','denied','unconfigured'].map(mode=>'<button data-fixture-mode="'+mode+'">'+mode+'</button>').join(' ')+'<pre id="fixture-audit" hidden></pre><ol id="browser-checks" aria-label="Browser test results"></ol>';document.body.appendChild(panel);panel.addEventListener('click',e=>{if(e.target.dataset.fixtureMode){fixture.mode=e.target.dataset.fixtureMode;if(fixture.mode==='triple')for(const rows of [data.milestones,data.tasks])rows.filter(r=>r.Subdivision1.ID===data.subdivisions[1].ID&&(r.Stage_Key||r.Milestone_Name)==='Rough Cut').forEach(r=>r.End_Date='02/10/2027');expose();}});expose();
 });
}
const sdk='('+fixtureSDK.toString()+')('+JSON.stringify(crewFixture())+');';
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1'),name=url.pathname==='/'?'/widget.html':url.pathname;
 if(name==='/__crew-fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(sdk);return;}
 if(name==='/__crew-browser-checks.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync('scripts/fixtures/crew-browser-checks.js'));return;}
 const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');let content=fs.readFileSync(file);
 if(file.endsWith('widget.html')){content=content.toString().replace('https://static.zohocdn.com/creator/widgets/version/2.0/widgetsdk-min.js','/__crew-fixture.js');if(url.searchParams.has('checks'))content=content.replace('</body>','<script src="/__crew-browser-checks.js"></script></body>');}
 res.end(content);
});
server.listen(port,'127.0.0.1',()=>console.log('Isolated Crew Locations preview: http://127.0.0.1:'+port+'/widget.html (add ?checks=1 for browser integration checks). No live writes.'));
