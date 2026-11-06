// Inert desktop fixture. Served only by this runner, never shipped in the widget.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
const directory=path.resolve('widgets/forecast-manager/src/app');
function fixture(){
  const sub='4410926000001000001',other='4410926000001000002',a='4410926000002000001',b='4410926000002000002',c='4410926000002000003',d='4410926000002000004';
  const lookup=ID=>({ID,zc_display_value:'Native Lookup Label'});
  const catalog={subdivisions:[{id:sub,name:'Cedar Ridge — Phase 01',code:'CR01',territory:'Central'},{id:other,name:'Willow Creek — Phase 02',code:'WC02',territory:'East'}],builders:[{id:a,name:'Northline Homes',type:'Builder'},{id:b,name:'Evergreen Homes',type:'Builder'},{id:c,name:'Meridian Homes',type:'Builder'},{id:d,name:'Parkside Homes',type:'Builder'}]};
  const parent=(ID,s,builder,year,forecast='0')=>({ID,Subdivision1:lookup(s),Builder1:lookup(builder),Forecast_Year:year,Status:'Builder',Forecast_Name:ID+' Forecast',Full_Year_Forecast:forecast});
  const contract=(ID,builder,subdivisions,status='Approved',archive='false')=>({ID,Subdivision1:subdivisions.map(lookup),Builder:lookup(builder),Contract_Type:'Lot (Master)',Contract_Name:'Contract '+ID,Status:status,Archive:archive});
  const schedule=(ID,builder,subdivisions,contractId,extra={})=>({ID,Subdivisions:subdivisions.map(lookup),Builder1:lookup(builder),Add_Contract_Contract_Name:contractId?lookup(contractId):'',Takedown_Schedule_Code:'TD-'+ID,Status:'Active',Total_Lot_Obligation:'120',Initial_Closing_Date:'11/15/2026',Takedown_Start_Date:'12/15/2026',Initial_Takedown:'20',Initial_Delay_Days:'30',Second_Closing_Lots:'',Second_Closing_Days:'',Continued_Takedown:'10',Continued_Takedown_Delay_Days:'60',Takedown_End_Date:'07/07/2028',Last_Takedown_Date:'',Last_Takedown_Amount:'',Lots_Sold:'0',Lots_Expected:'0',...extra});
  const tables={All_Forecast_Years:[parent('101',sub,a,'2026','40'),parent('102',sub,a,'2027','60'),parent('103',other,b,'2027','36'),parent('104',sub,d,'2026')],All_Contracts1:[contract('201',a,[sub]),contract('202',b,[other],'Awaiting Counterparty'),contract('203',c,[sub],'Complete','true'),contract('204',d,[sub])],All_Takedown_Schedules:[schedule('301',a,[sub],'201',{Second_Closing_Lots:'20',Second_Closing_Days:'90'}),schedule('302',a,[sub],'201'),schedule('303',c,[sub],'203'),schedule('304',d,[other],'204')]};
  const calls=[];let denied=false,partial=false,delay=0;
  window.fixtureReads=calls;
  const params=new URL(location.href).searchParams;denied=params.has('denied');partial=params.has('partial');delay=Number(params.get('delay')||0);
  if(params.has('controls'))document.addEventListener('DOMContentLoaded',()=>{
    const tools=document.createElement('div');tools.setAttribute('aria-label','Fixture Controls');
    for(const [label,action] of [['Deny Next Read',()=>{denied=true;}],['Short Next Snapshot',()=>{partial=true;}],['Restore Reads',()=>{denied=false;partial=false;}]]){const button=document.createElement('button');button.textContent=label;button.addEventListener('click',action);tools.append(button);}
    document.body.prepend(tools);
  });
  window.fixtureControls={deny(value){denied=value;},partial(value){partial=value;},delay(value){delay=value;}};
  window.ZOHO={CREATOR:{UTIL:{getInitParams:async()=>({loginUser:'inert-review-fixture',envUrlFragment:'environment/development',appLinkName:'land-master'})},DATA:{
    invokeCustomApi:async config=>{const body=JSON.parse(config.payload.payload);calls.push({kind:'custom',action:body.action});const meta={ok:true,action:body.action,today:'2026-11-06',windowOpen:false};if(body.action==='catalog')return {code:3000,details:{output:JSON.stringify({...meta,...catalog})}};if(body.action==='snapshot')return {...meta,subdivision:{id:sub,name:catalog.subdivisions[0].name,code:'CR01',builderIds:[a,d],unforecasted:0,expectedUnforecasted:0},years:[{id:'101',builderId:a,year:'2026',hasLotContract:true}],months:[],summaryHtml:''};throw new Error('No writes are permitted by this fixture.');},
    getRecordCount:async config=>{calls.push({kind:'count',...config});if(delay)await new Promise(resolve=>setTimeout(resolve,delay));if(denied&&config.report_name==='All_Contracts1')throw {code:2898,message:'Permission denied',permissionDenied:true};return {code:3000,result:{records_count:String(tables[config.report_name].length+(partial&&config.report_name==='All_Takedown_Schedules'?1:0))}};},
    getRecords:async config=>{calls.push({kind:'records',...config});if(delay)await new Promise(resolve=>setTimeout(resolve,delay));const list=tables[config.report_name],start=config.record_cursor?2:0;return {code:3000,data:list.slice(start,start+2),...(start+2<list.length?{record_cursor:'fixture-page-2'}:{})};}
  }}};
}
const server=http.createServer((request,response)=>{
  const url=new URL(request.url,'http://localhost');
  if(url.pathname==='/fixture.js'){response.setHeader('Content-Type','text/javascript');response.end('('+fixture.toString()+')();');return;}
  const target=path.resolve(directory,'.'+url.pathname);
  if(!target.startsWith(directory+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){response.writeHead(404).end();return;}
  let content=fs.readFileSync(target);
  if(target.endsWith('widget.html'))content=content.toString().replace('https://static.zohocdn.com/creator/widgets/version/2.0/widgetsdk-min.js','/fixture.js');
  response.setHeader('Content-Type',target.endsWith('.css')?'text/css':target.endsWith('.js')?'text/javascript':'text/html');response.end(content);
});
server.listen(0,'127.0.0.1',()=>console.log('http://127.0.0.1:'+server.address().port+'/widget.html'));
