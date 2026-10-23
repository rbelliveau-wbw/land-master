// Actual Settings workspace and approval editor. All SDK requests stay in this local fixture.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const root='widgets/settings-manager/src/app/';
const output=path.resolve('tmp/settings-workspace-preview');
fs.mkdirSync(output,{recursive:true});

function installFixture(){
  const clone=value=>JSON.parse(JSON.stringify(value));
  const record={
    ID:'4410926000000769023',Next_Workflow_Run:'10/24/2026 12:30:00 AM',
    Approval_Reminder_Interval_Days:'3',Next_Approval_Reminder_Date:'10/24/2026',Workflow_Log_Failure_Recipients:[{ID:'34',zc_display_value:'Jordan Lane'}],
    Open_Forecasting_Window:false,Unlock_All_Forecasts:false,
    Receive_Legal_Notifications:'legal@example.invalid',Builder_Approval_Template:[{ID:'61',zc_display_value:'Avery Brooks'}],Builder_Contract_Action_Template:[{ID:'71',zc_display_value:'Legal review'}],
    COO_Approval_Threshold:'10000.00',Multi_Line:'Existing budget notes',
    Capital_Cost:'8',Points:'2',Admin_Cost:'3',Engineering_Markup:'10',Engineering_Sub_Markup:'5',
    Construction_Markup:'12',Construction_Sub_Markup:'6',Profit_Share:'15',
    PF_Review_Criteria:'Review land cost, project margin, and construction timing.',PF_Review_Provider:'openai',
    PF_Review_Model:'fixture-model',PF_Review_Criteria_Updated:'10/22/2026 9:00:00 AM',
    Plat_Review_Criteria:'Identify Block, Lot and Width columns. Preserve source row numbers.',Future_Field:'Retained configuration'
  };
  const config={
    roles:[{id:'11',name:'VP',active:true},{id:'12',name:'CFO',active:true},{id:'13',name:'COO',active:true}],
    territories:[{id:'22',label:'Bryan / College Station',vpUserAccessIds:['31']}],
    users:[
      {id:'31',user:'vp.fixture',name:'Avery Brooks',approverEmail:'vp@example.invalid',routingEnabled:true},
      {id:'32',user:'cfo.fixture',name:'Morgan Ellis',approverEmail:'cfo@example.invalid',routingEnabled:true},
      {id:'33',user:'coo.fixture',name:'Riley Parker',approverEmail:'coo@example.invalid',routingEnabled:true},
      {id:'34',user:'owner.fixture',name:'Jordan Lane',approverEmail:'owner@example.invalid',routingEnabled:true}
    ],
    assignments:[
      {id:'41',roleId:'12',userAccessId:'32',active:true,territory:'',department:''},
      {id:'42',roleId:'13',userAccessId:'33',active:true,territory:'',department:''}
    ],
    policies:[
      {id:'51',workflow:'Purchase Order',status:'Published',enabled:true,selfApproval:'Allow',territory:'',department:'',adapterEnabled:false,steps:[
        {key:'vp',roleId:'11',order:1,condition:'Budget modification attached',enabled:true},
        {key:'cfo',roleId:'12',order:2,condition:'Always',enabled:true},
        {key:'coo',roleId:'13',order:3,condition:'Budget modification attached',enabled:true}
      ]},
      {id:'52',workflow:'Budget Modification',status:'Published',enabled:true,selfApproval:'Allow',territory:'',department:'',adapterEnabled:true,steps:[
        {key:'mod-cfo',roleId:'12',order:1,condition:'Always',threshold:'',enabled:true},
        {key:'mod-coo',roleId:'13',order:2,condition:'Above',threshold:'10000.00',enabled:true}
      ]},
      {id:'53',workflow:'Budget',status:'Published',enabled:true,selfApproval:'Allow',territory:'',department:'',adapterEnabled:true,steps:[
        {key:'budget-vp',roleId:'11',order:1,condition:'Always',threshold:'',enabled:true},
        {key:'budget-cfo',roleId:'12',order:2,condition:'Always',threshold:'',enabled:true}
      ]},{id:'54',workflow:'Pro Forma',status:'Published',enabled:true,selfApproval:'Allow',territory:'',department:'',adapterEnabled:true,steps:[
        {key:'pf-vp',roleId:'11',order:1,condition:'Always',threshold:'',enabled:true},
        {key:'pf-cfo',roleId:'12',order:2,condition:'Always',threshold:'',enabled:true}
      ]},{id:'55',workflow:'Contract',status:'Published',enabled:true,selfApproval:'Allow',territory:'22',department:'Development',adapterEnabled:true,steps:[
        {key:'contract-vp',roleId:'11',order:1,condition:'Always',threshold:'',enabled:true}
      ]}
    ],audit:[{id:'180',action:'SavePolicy',status:'Complete',actorId:'34',actorName:'Jordan Lane',token:'fixture-history-receipt-0001',before:{id:'52',workflow:'Budget Modification',enabled:false},after:{id:'52',workflow:'Budget Modification',enabled:true,status:'Published'}}]
  };
  const reports={
    All_Settings:[record],All_Construction_Curves:[4,8,16,24,24,16,8].map((cost,index)=>({ID:'44109260000007691'+String(24+index),Settings:{ID:record.ID},Cost_Curve:'7',Month_Number:String(index+1),Percent_Cost:String(cost),Template_Item:true,Pro_Forma:''})),
    All_Contract_Approvals:[{ID:'61',Approver:'Avery Brooks',Approval_Sequence:'1',Type1:'VP',Contract_Template:'Builder'},{ID:'62',Approver:'Morgan Ellis',Approval_Sequence:'2',Type1:'CFO',Contract_Template:'Builder'}],
    All_Contract_Actions:[{ID:'71',Contract_Action:'Legal review',Type_field:'Legal',Sort_Order:'1',Template_Action:true},{ID:'72',Contract_Action:'Confirm closing schedule',Type_field:'Development',Sort_Order:'2',Template_Action:true}],
    All_Pro_Formas:[{ID:'81',Name:'Oak Meadow · Phase 1'},{ID:'82',Name:'Cedar Grove · Phase 2'}],
    User_Access_Report:[{ID:'31',Full_Name:'Avery Brooks',Approver_Email:'vp@example.invalid',User:'vp.fixture'},{ID:'32',Full_Name:'Morgan Ellis',Approver_Email:'cfo@example.invalid',User:'cfo.fixture'},{ID:'34',Full_Name:'Jordan Lane',Approver_Email:'owner@example.invalid',User:'owner.fixture'}],
    Workflow_Run_Log_Report:[
      {ID:'4410926000000000190',Started_At:'10/23/2026 09:00:00 AM',Finished_At:'10/23/2026 09:00:04 AM',Workflow_Name:'Budget approvals',External_System:'Creator',Run_Status:'Success',Stage:'Complete',Rows_Received:'12',Rows_Processed:'12',Rows_Created:'0',Rows_Updated:'12',Rows_Skipped:'0',Rows_Failed:'0',Duration_Seconds:'4'},
      {ID:'4410926000000000189',Started_At:'10/23/2026 08:00:00 AM',Finished_At:'10/23/2026 08:00:02 AM',Workflow_Name:'Forecast sync',External_System:'Creator',Run_Status:'Failed',Stage:'Read records',Rows_Received:'0',Rows_Processed:'0',Rows_Created:'0',Rows_Updated:'0',Rows_Skipped:'0',Rows_Failed:'1',Duration_Seconds:'2',Message:'Fixture failure',Failure_Notified:true}
    ]
  };
  const receipts=new Map();let nextId=200;
  window.fixture={calls:[],record,config,reports,holdSettings:false,releases:[]};
  function selected(request){
    const rows=reports[request.report_name]||[],criteria=request.criteria||'';
    const byId=criteria.match(/(?:\(|^)ID == (\d+)/),parent=criteria.match(/Settings == (\d+)/);
    return rows.filter(row=>(!byId||row.ID===byId[1])&&(!parent||(row.Settings?.ID||row.Settings)===parent[1]));
  }
  function log(method,request){fixture.calls.push({method,request:clone(request)});}
  const DATA={
    async getRecordCount(request){log('count',request);return {code:3000,result:{records_count:String(selected(request).length)}};},
    async getRecords(request){log('records',request);return {code:3000,data:clone(selected(request))};},
    async updateRecordById(request){
      log('update',request);
      if(fixture.holdSettings)await new Promise(resolve=>fixture.releases.push(resolve));
      const row=(reports[request.report_name]||[]).find(row=>row.ID===request.id);
      if(!row)return {code:3100,message:'Record not found'};
      Object.assign(row,clone(request.payload.data));return {code:3000,data:{ID:request.id}};
    },
    async addRecords(request){log('add',request);const row={ID:String(++nextId),...clone(request.payload.data)};reports.All_Construction_Curves.push(row);return {code:3000,result:[{code:3000,data:{ID:row.ID}}]};},
    async deleteRecords(request){log('delete',request);const id=request.payload.criteria.match(/ID == (\d+)/)?.[1],rows=reports[request.report_name]||[],index=rows.findIndex(row=>row.ID===id);if(index>=0)rows.splice(index,1);return {code:3000,result:[{code:3000,data:{ID:id}}]};},
    async invokeCustomApi(request){
      log('api',request);
      if(/Get_User_Access_Lean/.test(request.api_name))return {found:true,myId:'34'};
      if(!/Manage_Approval_Policies/.test(request.api_name))throw new Error('Unexpected fixture API: '+request.api_name);
      const payload=JSON.parse(request.payload.payload);fixture.calls.push({method:'approval',request:clone(payload)});
      if(payload.action==='List')return {contract:'approval-policy-v1',success:true,canAdmin:true,policyModel:'territory-perpetual-v2',actorId:'34',configuration:clone(config)};
      if(payload.action==='Preview'){try{return {contract:'approval-policy-v1',success:true,snapshot:LMApprovalPolicy.resolve(config,payload.context)};}catch(error){return {contract:'approval-policy-v1',success:false,error:error.message};}}
      if(payload.action==='Check')return receipts.get(payload.token);
      const collection=payload.action==='SaveRole'?'roles':payload.action==='SaveAssignment'?'assignments':'policies';
      const before=config[collection].find(row=>row.id===payload.data.id);
      let after={...clone(payload.data),id:payload.data.id||String(++nextId)};
      if(payload.action==='Publish')after={...before,status:'Published'};
      if(payload.action==='SavePolicy')Object.assign(after,{status:payload.data.status||'Draft',adapterEnabled:false});
      const index=config[collection].findIndex(row=>row.id===after.id);if(index<0)config[collection].push(after);else config[collection][index]=after;
      config.audit.push({id:String(++nextId),action:payload.action,status:'Complete',actorId:'34',actorName:'Jordan Lane',token:payload.token,before:clone(before||{}),after:clone(after)});
      const receipt={contract:'approval-policy-v1',success:true,writeState:'verified',token:payload.token,after};receipts.set(payload.token,receipt);return receipt;
    }
  };
  window.ZOHO={CREATOR:{DATA,UTIL:{getInitParams:async()=>({envUrlFragment:'/environment/development',loginUser:'owner.fixture',appLinkName:'land-master'}),navigateParentURL:request=>log('navigate',request)}}};
  document.addEventListener('DOMContentLoaded',()=>{
    const label=document.createElement('div');label.id='fixture-sample-label';label.textContent='Sample data · local preview';
    Object.assign(label.style,{position:'fixed',right:'14px',bottom:'10px',zIndex:'10000',background:'#fff',border:'1px solid #c7d7e7',borderRadius:'6px',padding:'4px 8px',color:'#47627d',font:'11px system-ui',pointerEvents:'none'});
    document.body.appendChild(label);
  });
}

const source=fs.readFileSync(root+'widget.html','utf8');
const exposure='window.__settingsWorkspace={state:S,controller:Controller,render:render};\n';
assert.ok(source.includes('\nboot();'),'Real Settings startup remains available for fixture exposure');
const documentText=source.replace(/<script src="https:\/\/static\.zohocdn\.com\/creator\/widgets\/version\/2\.0\/widgetsdk-min\.js"><\/script>/,'<script>('+installFixture.toString()+')();</script>')
  .replace('\nboot();','\n'+exposure+'boot();');
const exportOutput=path.resolve('outputs/settings-workspace-mockups');
if(process.argv.includes('--export')){
  fs.mkdirSync(exportOutput,{recursive:true});
  const inlineAsset=(asset,tag)=>{
    const name=asset.split('?')[0];
    assert.match(name,/^[a-z][a-z0-9.-]*\.(?:js|css)$/,'Only local widget assets may be exported');
    const text=fs.readFileSync(root+name,'utf8').replace(tag==='script'?/<\/script/gi:/<\/style/gi,tag==='script'?'<\\/script':'<\\/style');
    return '<'+tag+' data-source="'+name+'">\n'+text+'\n</'+tag+'>';
  };
  const exported=documentText.replace(/<script src="([^"]+)"[^>]*><\/script>/g,(_match,asset)=>inlineAsset(asset,'script'))
    .replace(/<link rel="stylesheet" href="([^"]+)"[^>]*>/g,(_match,asset)=>inlineAsset(asset,'style'))
    .replace('<title>Land Master Settings</title>','<title>Sample data · Land Master Settings mockups</title>');
  assert.doesNotMatch(exported,/<script[^>]+src=|<link[^>]+rel="stylesheet"/i,'The mockup must work offline without external assets');
  fs.writeFileSync(path.join(exportOutput,'index.html'),exported);
  fs.writeFileSync(path.join(exportOutput,'README.txt'),'Land Master Settings mockups\n\nOpen index.html in a browser. All styles, scripts, settings, workflow history and approval examples are included in this file.\n\nThis is an interactive mockup with sample data. Changes remain in memory and reset when the page reloads. No Creator records are read or changed and no approval emails are sent.\n');
  console.log('Standalone interactive mockup: '+path.join(exportOutput,'index.html'));
}
const server=http.createServer((request,response)=>{
  const name=decodeURIComponent(request.url.split('?')[0]).slice(1);
  if(!name){response.setHeader('Content-Type','text/html; charset=utf-8');response.end(documentText);return;}
  if(/^[a-z][a-z0-9.-]*\.(?:js|css)$/.test(name)&&fs.existsSync(root+name)){
    response.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':'text/css');response.end(fs.readFileSync(root+name));return;
  }
  response.statusCode=404;response.end('Not found');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port;
if(process.argv.includes('--serve')){
  console.log('Local Settings workspace fixture: '+url+' (simulated records; no Creator writes)');
  await new Promise(()=>{});
}

const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({viewport:{width:1440,height:940}}),errors=[];
page.setDefaultTimeout(10000);
page.on('pageerror',error=>errors.push(error.message));
page.on('request',request=>{assert.ok(request.url().startsWith(url)||request.url().startsWith('data:'),'Fixture must not contact remote services: '+request.url());});
const nav=key=>page.locator('[data-jump="'+key+'"]');
const visibleScreen=()=>page.locator('[data-settings-screen]:visible');
const approvalKeys=new Set(['approval-rules','approvers','roles','test-route','approval-history']);
async function switchTo(key){await nav(key).click();assert.equal(await visibleScreen().count(),1,'Each destination is a separate screen: '+key);assert.equal(await page.locator(approvalKeys.has(key)?'#approval-screen':'#sec-'+key).isVisible(),true,'Selected screen is visible: '+key);}
async function quietFeedback(){await page.waitForFunction(()=>!document.querySelector('#toast').classList.contains('show')&&(!document.querySelector('#lmSuccessToast')||document.querySelector('#lmSuccessToast').hidden));}
async function noOverflow(){
  const result=await page.evaluate(()=>({body:document.body.scrollWidth<=innerWidth,document:document.documentElement.scrollWidth<=innerWidth,view:document.querySelector('#view').scrollWidth<=document.querySelector('#view').clientWidth}));
  assert.deepEqual(result,{body:true,document:true,view:true},'Desktop workspace keeps scrolling inside bounded content');
}
try{
  await page.goto(url);
  await page.waitForFunction(()=>window.__settingsWorkspace?.state.ready===true);
  assert.equal(await visibleScreen().count(),1);
  assert.equal(await page.locator('#reload,#openrec,.nav-caption,#screen-tag').count(),0,'Removed header actions and Configuration labels stay absent');
  const screenKeys=await page.locator('[data-jump]').evaluateAll(nodes=>nodes.map(node=>node.dataset.jump));
  assert.ok(screenKeys.includes('workflow-log'),'Workflow Log remains reachable');
  for(const key of approvalKeys)assert.ok(screenKeys.includes(key),'Approval screen is part of Settings navigation: '+key);
  for(const key of screenKeys){
    await switchTo(key);await noOverflow();
    assert.equal(await page.getByRole('button',{name:/^Refresh$/i}).count(),0,'Routine Refresh action is absent: '+key);
    if(key==='approval-rules')assert.equal(await page.locator('[data-ap-new]').evaluate(node=>{const box=node.getBoundingClientRect();return box.top>=0&&box.bottom<=innerHeight;}),true,'Add Rule stays visible above the full workflow list');
    if(['automation','approval-rules','approvers','defaults'].includes(key)){
      await page.waitForTimeout(220);await page.screenshot({path:path.join(output,key+'-desktop.png')});
    }
  }
  assert.equal(await page.evaluate(()=>fixture.calls.filter(call=>['update','add','delete'].includes(call.method)||call.method==='approval'&&!['List','Preview','Check'].includes(call.request.action)).length),0,'Opening every Settings screen makes no writes');

  await switchTo('automation');
  const interval=page.locator('[data-f="Approval_Reminder_Interval_Days"]');
  await interval.evaluate(node=>window.intervalNode=node);
  await interval.fill('1.5');
  await switchTo('forecasting');await switchTo('automation');
  assert.equal(await interval.inputValue(),'1.5','Invalid draft text survives screen changes');
  assert.equal(await interval.evaluate(node=>node===window.intervalNode),true,'Navigation preserves mounted editors');
  assert.equal(await page.evaluate(()=>__settingsWorkspace.state.drafts.Approval_Reminder_Interval_Days.value),'1.5');
  assert.equal(await page.evaluate(()=>fixture.calls.filter(call=>call.method==='update').length),0,'Invalid integer never reaches native write');
  await interval.fill('4');await interval.press('Tab');
  await page.waitForFunction(()=>fixture.record.Approval_Reminder_Interval_Days==='4'&&!__settingsWorkspace.controller.hasDrafts());
  assert.equal(await interval.evaluate(node=>node===window.intervalNode),true,'Successful autosave keeps the editor mounted');

  await switchTo('workflow-log');
  await page.waitForFunction(()=>document.querySelectorAll('[data-wl-id]').length===2);
  const historyReads=await page.evaluate(()=>fixture.calls.filter(call=>call.method==='records'&&call.request.report_name==='Workflow_Run_Log_Report').length);
  await page.locator('input[name="workflow-search"]').fill('Forecast');
  await page.locator('[data-wl-failures]').check();
  await switchTo('forecasting');await switchTo('workflow-log');
  assert.equal(await page.locator('input[name="workflow-search"]').inputValue(),'Forecast');
  assert.equal(await page.locator('[data-wl-failures]').isChecked(),true);
  assert.equal(await page.locator('[data-wl-id]').count(),1,'Workflow filters and complete loaded rows survive navigation');
  assert.equal(await page.evaluate(()=>fixture.calls.filter(call=>call.method==='records'&&call.request.report_name==='Workflow_Run_Log_Report').length),historyReads,'Returning to Workflow Log does not redownload history');

  await switchTo('approval-rules');
  await page.locator('[data-ap-edit="52"]').click();
  const threshold=page.locator('[data-ap-field="threshold"]');
  await quietFeedback();
  await page.waitForTimeout(220);await page.screenshot({path:path.join(output,'approval-rule-desktop.png')});
  await threshold.evaluate(node=>window.thresholdNode=node);
  await threshold.fill('10000.250001');await threshold.press('Tab');
  await page.waitForFunction(()=>document.querySelector('[data-ap-inline-status]')?.textContent.includes('exact currency string'));
  assert.equal(await page.evaluate(()=>fixture.calls.filter(call=>call.method==='approval'&&call.request.action==='SavePolicy').length),0,'Existing approval currency precision validation still rejects excess fractional digits');
  await nav('automation').click();
  assert.equal(await page.locator('#approval-screen').isVisible(),true,'Invalid approval draft prevents navigation from silently discarding it');
  assert.equal(await threshold.inputValue(),'10000.250001','Invalid approval text remains available for correction');
  await threshold.fill('10000.25');await threshold.press('Tab');
  await page.waitForFunction(()=>document.querySelector('[data-ap-inline-status]')?.textContent==='Saved');
  assert.equal(await page.evaluate(()=>fixture.calls.filter(call=>call.method==='approval'&&call.request.action==='SavePolicy').at(-1).request.data.steps[1].threshold),'10000.25','Actual approval transport retains exact threshold cents as a decimal string');
  assert.equal(await threshold.evaluate(node=>node===window.thresholdNode),true,'Approval save keeps the threshold editor mounted');
  assert.equal(await page.locator('.ap-overlay:not(.ap-inline)').count(),0,'Approval administration belongs to its Settings screen');
  await switchTo('automation');await switchTo('approval-rules');
  assert.equal(await threshold.evaluate(node=>node===window.thresholdNode),true,'Approval editor survives leaving and returning to its screen');
  assert.equal(await threshold.inputValue(),'10000.25');
  await page.locator('[data-ap-row="mod-coo"] [aria-label="Condition"]').click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.ap-picker').count(),0,'Escape closes the anchored picker');
  assert.equal(await page.locator('[data-ap-row="mod-coo"] [aria-label="Condition"]').evaluate(node=>node===document.activeElement),true,'Picker dismissal restores its actual trigger');
  assert.equal(await page.locator('#approval-screen').isVisible(),true);

  await switchTo('automation');await nav('forecasting').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('#sec-forecasting').isVisible(),true,'Keyboard activates the selected Settings destination');
  assert.equal(await nav('forecasting').getAttribute('aria-current'),'page','Current navigation state is announced');
  await page.emulateMedia({reducedMotion:'reduce'});await switchTo('automation');await switchTo('forecasting');
  assert.equal(await visibleScreen().count(),1,'Reduced motion uses the same real navigation state');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await quietFeedback();

  for(const width of [1008,760,390]){
    await page.setViewportSize({width,height:720});
    for(const key of ['automation','workflow-log','approval-rules','curve']){await switchTo(key);await noOverflow();}
    await page.waitForTimeout(220);await page.screenshot({path:path.join(output,'workspace-'+width+'.png')});
  }
  assert.deepEqual(errors,[],'Actual widget has no browser errors');
  if(process.argv.includes('--export')){
    for(const name of fs.readdirSync(output).filter(name=>name.endsWith('.png')&&name!=='failure.png'))fs.copyFileSync(path.join(output,name),path.join(exportOutput,name));
    const offline=await browser.newPage({viewport:{width:1440,height:940}}),offlineErrors=[],offlineRequests=[];
    offline.on('pageerror',error=>offlineErrors.push(error.message));offline.on('request',request=>offlineRequests.push(request.url()));
    await offline.goto(new URL('file:///'+path.join(exportOutput,'index.html').replace(/\\/g,'/')).href);
    await offline.waitForFunction(()=>window.__settingsWorkspace?.state.ready===true);
    await offline.locator('[data-jump="approval-rules"]').click();await offline.locator('[data-ap-edit="52"]').click();
    assert.equal(await offline.locator('[data-ap-field="threshold"]').inputValue(),'10000.00','Standalone mockup uses fresh sample data');
    assert.deepEqual(offlineErrors,[],'Standalone interactive file has no browser errors');
    assert.ok(offlineRequests.every(request=>request.startsWith('file:')||request.startsWith('data:')),'Standalone mockup makes no network requests');
    await offline.close();
    console.log('PASS: exported standalone HTML opens offline with working approval navigation and no network requests.');
  }
  console.log('PASS: Settings workspace at 1008/1440px with 760/390px overflow smoke checks; separate screens, mounted invalid drafts and successful saves, retained Workflow Log filters, real inline approvals and exact threshold validation/transport, keyboard/current state, picker Escape/focus and reduced motion.');
  console.log('Preview screenshots: '+output);
}catch(error){
  await page.screenshot({path:path.join(output,'failure.png')});
  console.error('Workspace browser errors: '+JSON.stringify(errors));
  throw error;
}finally{
  await browser.close();await new Promise(resolve=>server.close(resolve));
}
