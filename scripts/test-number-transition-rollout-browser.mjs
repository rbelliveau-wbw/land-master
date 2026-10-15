// Desktop synthetic data + actual module renderers and event handlers. No Creator writes.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const widgets=['budget-manager','manage-lots','contract-management','tax-center','land-master','milestone-gantt','settings-manager'];
const exposed={
 'budget-manager':'{S,renderProjectKpis,renderBudgetMetrics,renderRequestBalance,renderProjectComparison}',
 'manage-lots':'{S,render,renderTakedowns,openTakedownDetail,manageController}',
 'contract-management':'{S,renderHome,renderDetail,renderTable,renderBoard,statsFor,lotClosingSummaryHTML}',
 'tax-center':'{S:state,renderSummaryStrip,renderSidebar,renderLotRow,renderTable,renderFooter}',
 'land-master':'{S,renderAll,renderCounts,renderTable,renderPager,cols,LandData}',
 'milestone-gantt':'{S:state,renderSummary,renderRow,renderAll}',
 'settings-manager':'{S,render,curveCard,groupCard,GROUPS,Controller}'
};
const root=process.cwd(),output=path.resolve('tmp/number-transition-rollout-preview');fs.mkdirSync(output,{recursive:true});
const server=http.createServer((req,res)=>{
  const [widget,...parts]=new URL(req.url,'http://localhost').pathname.slice(1).split('/'),file=parts.join('/')||'widget.html';
  const base=path.resolve('widgets',widget||'none','src/app'),filename=path.resolve(base,file);
  if(!widgets.includes(widget)||!filename.startsWith(base+path.sep)||!fs.existsSync(filename)){res.writeHead(404).end();return;}
  let body=fs.readFileSync(filename,'utf8');
  if(file==='widget.html'){
    body=body.replace('/* Repository design:','window.__NUM_ALL__='+exposed[widget]+';\n/* Repository design:');
    if(widget==='budget-manager')body=body.replaceAll('boot();','/* inert fixture startup */');
    if(widget==='settings-manager')body=body.replace('\nboot();','\n/* inert fixture startup */');
    if(widget==='contract-management')body=body.replace('contractBoot();\nwindow.addEventListener','/* inert fixture startup */\nwindow.addEventListener');
    if(widget==='tax-center')body=body.replace('window.__taxBoot=taxBoot();','window.__taxBoot=Promise.resolve();');
    if(widget==='land-master')body=body.replace('initializeCreatorV2();','/* inert fixture startup */');
    if(widget==='manage-lots')body=body.replace('manageController.start().catch','Promise.resolve().catch');
    if(widget==='milestone-gantt')body=body.replace('\n  start();','\n  /* inert fixture startup */');
  }
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(body);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,channel:'chrome'}),errors=[];
const page=await browser.newPage({viewport:{width:1540,height:1000}});page.setDefaultTimeout(10000);
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning'&&m.text().includes('Number transitions:'))errors.push(m.text());});
await page.route(/.*/,route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.fulfill({body:'',contentType:'text/javascript'}));
const url='http://127.0.0.1:'+server.address().port;
const settle=()=>page.waitForFunction(()=>!document.querySelector('.lm-number-changing'));
const go=async widget=>{await page.goto(url+'/'+widget+'/');await page.waitForFunction(()=>window.__NUM_ALL__&&window.__numberTransitions);};
const flush=()=>page.evaluate(()=>__numberTransitions.flush());
async function changed(selector,message){await page.waitForFunction(selector=>!!document.querySelector(selector+' .lm-number-changing'),selector);assert.ok(await page.locator(selector+' [data-lm-number-key]').count()>0,message);}
async function screenshot(widget,selector){await page.locator(selector).evaluate(node=>{for(let current=node;current&&current!==document.body;current=current.parentElement){current.hidden=false;if(getComputedStyle(current).display==='none')current.style.setProperty('display','block','important');}});await page.locator(selector).screenshot({path:path.join(output,widget+'.png')});}
try{
  await go('budget-manager');
  await page.evaluate(()=>{const T=__NUM_ALL__,S=T.S;S.view='vEditor';S.useMock=true;S.edPhaseIdx='all';S.tier='prelim';S.edBudget={ID:'90071992547410001',Lots:100,Equiv_LF_of_Street:5000,Prelim_Budget_Grand_Total:10000};S.items[S.edBudget.ID]=[{ID:'item-1',Prelim_Budget_Ttl:10000,Budget_Ttl:20000}];window.__project={key:'project-1',phases:[S.edBudget]};document.getElementById('vEditor').style.display='block';T.renderProjectKpis(__project);});await flush();
  assert.equal(await page.locator('#summaryMatrices .lm-number-changing').count(),0,'Budget initial values stay still');
  await page.evaluate(()=>{__NUM_ALL__.S.items['90071992547410001'][0].Prelim_Budget_Ttl=15000.25;__NUM_ALL__.renderProjectKpis(__project);});await changed('#summaryMatrices','Budget project totals');assert.match(await page.locator('#summaryMatrices').textContent(),/15,000.25/);await screenshot('budget-manager','#summaryMatrices');await settle();
  // Actual read-only Budget metrics formatter, with the same budget/field identity.
  await page.evaluate(()=>{const b=__NUM_ALL__.S.edBudget;document.getElementById('editorMetrics').innerHTML=__NUM_ALL__.renderBudgetMetrics(b);});await flush();
  await page.evaluate(async()=>{
    window.__poWrites=0;
    const ui=LMPOUI.create({scope:()=> 'fixture',phaseName:()=> 'Phase 1',canEdit:()=>true,userAccessId:()=> '90071992547410111',vendors:async()=>[{ID:'90071992547410222',Vendor_Name:'Fixture Vendor'}],items:()=>[{ID:'90071992547410333',Item_Name:'Civil works',Cost_Code:'2101'}],call:async payload=>{
      if(payload.action==='Balances')return {contract:'po-v1',success:true,balances:[{budgetItemId:'90071992547410333',finalCents:'1000000',modCents:'0',issuedCents:'0',availableCents:'1000000',pendingModificationCents:'0',subdivisionCode:'CEDAR',minorCode:'2101'}]};
      if(payload.action==='PreviewApprovals')return {contract:'po-v1',success:true,approvalPreview:{roles:[{role:'CFO'}]}};
      __poWrites++;throw Error('Fixture cannot write');
    }});await ui.open({ID:'90071992547410001'});
  });await page.waitForFunction(()=>!document.querySelector('.po-picker-trigger[data-po-picker="budgetItemId"]').disabled);
  await page.locator('[data-po-picker="budgetItemId"]').click();await page.locator('[data-po-pick="budgetItemId"]').first().click();
  await page.locator('[data-po-field="quantity"]').fill('100');await page.locator('[data-po-field="unitPrice"]').fill('10.25');await page.waitForFunction(()=>document.querySelector('[data-po-total]').textContent==='$1,025');await flush();await page.locator('[data-po-field="unitPrice"]').press('Tab');await settle();
  await page.locator('[data-po-field="quantity"]').fill('200');await flush();assert.equal(await page.locator('.po-total-amount .lm-number-changing').count(),0);assert.ok(await page.locator('.po-total-amount .number-edit-pending').count()>0,'PO derived total waits for field exit');await page.locator('[data-po-field="quantity"]').press('Tab');await changed('.po-total-amount','PO totals and commitments');assert.equal(await page.locator('[data-po-total]').textContent(),'$2,050');assert.ok(await page.locator('[data-po-summary] .lm-number-changing').count()>0,'per-cost-code balance cells animate');assert.equal(await page.evaluate(()=>__poWrites),0);await screenshot('budget-po','.po-workspace');
  await go('manage-lots');
  await page.evaluate(async()=>{
    const T=__NUM_ALL__,S=T.S;T.manageController.state.ready=true;S.subdivisionIds=['100'];
    const lot={ID:'90071992547410001',Subdivision:{ID:'100'},Builder1:{ID:'200'},Block:'01',Lot_Number:'001',Base_Price:50000,Earnest_Money:1000,Appraised_Value:10000,Additional_Tax:0,Additional_Fees:100,Fee_Type:'Fixed',Escalator:0,Archived:false,Status:'Open',Add_Builder_Takedown_Name:''};window.__receiptLots=[lot];
    await LMTakedownEditor.open({subdivision:{ID:'100',Subdivision_Name:'Cedar Hollow',County:'Bell'},builders:[{ID:'200',Builder_Name:'Atlas'}],lots:()=>__receiptLots,context:()=> 'fixture',locked:()=>false,id:v=>String(v?.ID||v||''),block:l=>l.Block,lotNumber:l=>l.Lot_Number,read:async()=>[]});
  });await flush();assert.equal(await page.locator('#receiptgrand .lm-number-changing').count(),0,'first receipt stays still');
  assert.match(await page.locator('#receiptgrand').textContent(),/49,100/);
  await page.locator('#fFees').fill('250.75');await page.locator('#fFees').dispatchEvent('change');await flush();assert.equal(await page.locator('#receiptgrand .lm-number-changing').count(),0);assert.ok(await page.locator('#receiptgrand .number-edit-pending').count()>0);assert.equal(await page.locator('#fFees').evaluate(n=>n===document.activeElement),true);await page.locator('#fFees').press('Tab');await changed('#receiptgrand','real receipt input updates after field exit');assert.match(await page.locator('#receiptgrand').textContent(),/49,250.75/);
  assert.equal(await page.locator('#fFees').inputValue(),'250.75');assert.equal(await page.locator('#receiptDate [data-lm-number-key],#receiptLotRows td:first-child [data-lm-number-key]').count(),0,'receipt dates and block/lot identities stay static');await screenshot('manage-lots','#receipt');await settle();
  await go('contract-management');
  await page.evaluate(()=>{const T=__NUM_ALL__,S=T.S;S.coreReady=true;S.demo=true;S.contracts=[{ID:'90071992547410001',Contract_Name:'Cedar Hollow',Contract_Type:'Lot (Master)',Status:'In Progress',Number_of_Lots:100,Initial_Closing_Lots:20,Initial_Closing_Days:30}];S.actions=[{ID:'action-1',Contract1:{ID:S.contracts[0].ID},Contract_Action:'Review',Complete:false}];S.mode='list';T.renderHome();});await flush();
  await page.evaluate(()=>{const T=__NUM_ALL__,S=T.S;S.contracts.push({...S.contracts[0],ID:'90071992547410002',Contract_Name:'Copper Ridge'});T.renderHome();});await changed('.scope-count','Legal contract counts');await settle();
  await page.evaluate(()=>{const S=__NUM_ALL__.S;S.contracts[0].Number_of_Lots=120;__NUM_ALL__.renderHome();});await flush();await screenshot('contract-management','#view');
  await go('tax-center');
  await page.evaluate(()=>{const T=__NUM_ALL__,S=T.S;S.rowsLoaded=true;S.referenceLoaded=true;S.data.parcelYears=[{id:'90071992547410001',status:'Under Protest',appraisedValue:500000,protestValue:400000,taxYear:'2026'}];T.renderSummaryStrip();T.renderSidebar();});await flush();
  await page.evaluate(()=>{__NUM_ALL__.S.data.parcelYears[0].appraisedValue=700000;__NUM_ALL__.renderSummaryStrip();});await changed('#kpiPortfolio','Tax financial totals');assert.match(await page.locator('#kpiPortfolio').textContent(),/700/);await screenshot('tax-center','.kpi-strip');await settle();
  await page.evaluate(()=>{const S=__NUM_ALL__.S;S.rowsLoaded=false;S.serverCounts.currentTotal=12;__NUM_ALL__.renderSummaryStrip();});await flush();assert.equal(await page.locator('#kpiPortfolio .lm-number-changing').count(),0,'loaded dollars and matching row counts have different keys');
  await go('land-master');
  await page.evaluate(()=>{const T=__NUM_ALL__,S=T.S;S.demo=true;S.properties=[{ID:'90071992547410001',Property_Name:'Cedar',Acres:20}];S.scope='props';T.renderAll();});await flush();
  await page.evaluate(()=>{__NUM_ALL__.S.properties.push({ID:'90071992547410002',Property_Name:'Copper',Acres:30});__NUM_ALL__.renderAll();});await changed('#ctProps','Land record counts');await settle();
  await page.evaluate(()=>{const T=__NUM_ALL__,S=T.S;S.scope='subs';S.projects=[{ID:'project-1',Project_Name:'Cedar Hollow'}];S.subdivisions=[{ID:'sub-1',Subdivision_Name:'Phase 1',Project:{ID:'project-1'},Total_Lots:100,Lots_Sold:10}];S.expandedGroups={'project-1':true};T.renderAll();});await flush();
  await page.evaluate(()=>{__NUM_ALL__.S.subdivisions[0].Total_Lots=120;__NUM_ALL__.renderTable();});await changed('#tableScroll','Land subdivision read-only quantities');await screenshot('land-master','#tableScroll');
  await go('milestone-gantt');
  await page.evaluate(()=>{const T=__NUM_ALL__,S=T.S;S.ready=true;S.loading=false;S.selectedSubdivisionId='sub-1';S.subdivisions=[{id:'sub-1',name:'Cedar Hollow'}];S.milestones=[{id:'milestone-1',subdivisionId:'sub-1',name:'Engineering',sequence:1,draftStart:new Date(2027,0,1),draftEnd:new Date(2027,0,10),start:new Date(2027,0,1),end:new Date(2027,0,10)}];S.timeline={min:Date.UTC(2027,0,1)/86400000,dayWidth:8,width:3000};T.renderSummary();const host=document.createElement('div');host.id='fixtureRows';document.body.appendChild(host);host.innerHTML=T.renderRow(S.milestones[0],0,1);});await flush();
  await page.evaluate(()=>{const T=__NUM_ALL__,m=T.S.milestones[0];m.draftEnd=new Date(2027,0,15);document.getElementById('fixtureRows').innerHTML=T.renderRow(m,0,1);T.renderSummary();});await changed('#fixtureRows .row-dates','Gantt duration');assert.equal(await page.locator('#fixtureRows .row-dates').textContent(),'15 days');assert.equal(await page.locator('.row-index [data-lm-number-key],.bar-date [data-lm-number-key]').count(),0,'Gantt sequence and date identities stay static');await screenshot('milestone-gantt','#fixtureRows');await settle();
  await go('settings-manager');
  await page.evaluate(()=>{const T=__NUM_ALL__,S=T.S;S.ready=true;S.demo=true;S.rec={ID:'settings-1'};S.recId='settings-1';S.resources.curve='ready';S.curve=[{ID:'curve-1',Cost_Curve:'2',Month_Number:'1',Percent_Cost:'50'},{ID:'curve-2',Cost_Curve:'2',Month_Number:'2',Percent_Cost:'50'}];T.render();});await flush();
  await page.evaluate(()=>{const T=__NUM_ALL__;T.S.curve[1].Percent_Cost='40';T.render();});await changed('#sec-curve .pill','Settings curve percentage');assert.equal(await page.locator('#sec-curve .pill').textContent(),'90%');assert.equal(await page.locator('#sec-curve input [data-lm-number-key],#sec-curve select [data-lm-number-key]').count(),0);await screenshot('settings-manager','#sec-curve');await settle();
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{__NUM_ALL__.S.curve[1].Percent_Cost='35';__NUM_ALL__.render();});await flush();assert.equal(await page.locator('.lm-number-changing').count(),0,'reduced motion is immediate');
  await page.emulateMedia({reducedMotion:'no-preference'});
  const performance=await page.evaluate(()=>{
    __numberTransitions.stop();document.body.innerHTML='<div id="core"></div>';const host=document.getElementById('core');
    window.__coreScope='record-1';window.__coreReady=true;window.__coreContext='dollars';
    host.innerHTML='<b id="quantity">($1,250.50)</b><span id="identity">001-02 · Jan 2027</span><input id="editable" value="0.123456789">';
    window.__core=LMNumbers.start({module:'fixture',root:host,ready:()=>__coreReady,collect(api){api.text(document.getElementById('quantity'),[__coreScope,'quantity'],'all',__coreContext);api.each('[data-large]',node=>api.text(node,[__coreScope,'large',node.dataset.large]));}});__core.flush();
    window.__first=host.querySelectorAll('.lm-number-changing').length;
    for(let i=0;i<2000;i++){const n=document.createElement('span');n.dataset.large=String(i);n.textContent=String(i);host.appendChild(n);}
    let start=performance.now();__core.flush();const first=performance.now()-start;host.lastChild.textContent='9001';start=performance.now();__core.flush();return {first,update:performance.now()-start};
  });assert.ok(performance.update<600,'a 2,000-cell update stays bounded');assert.equal(await page.evaluate(()=>__first),0);
  await page.evaluate(()=>{document.getElementById('quantity').textContent='$75.25';__core.flush();});assert.equal(await page.locator('#quantity').textContent(),'$75.25');assert.equal(await page.locator('#quantity .lm-number-push').getAttribute('data-lm-number-from'),'($1,250.50)');
  await page.evaluate(()=>{document.getElementById('quantity').textContent='$75.25';__core.flush();});assert.ok(await page.locator('#quantity .lm-number-changing').count()>0,'an equal rebuild resumes the current animation');assert.equal(await page.locator('#quantity .lm-number-push').getAttribute('data-lm-number-from'),'($1,250.50)');
  await page.evaluate(()=>{document.getElementById('quantity').textContent='−$42.10';__core.flush();});assert.equal(await page.locator('#quantity').textContent(),'−$42.10');await settle();
  await page.evaluate(()=>{document.getElementById('quantity').textContent='—';__core.flush();document.getElementById('quantity').textContent='$20';__core.flush();});assert.equal(await page.locator('#quantity .lm-number-changing').count(),0,'unknown values do not become fabricated zeroes');
  await page.evaluate(()=>{__coreScope='record-2';document.getElementById('quantity').textContent='$30';__core.flush();});assert.equal(await page.locator('#quantity .lm-number-changing').count(),0,'record identities isolate transitions');
  await page.evaluate(()=>{__coreReady=false;__core.flush();__coreReady=true;document.getElementById('quantity').textContent='$35';__core.flush();});assert.ok(await page.locator('#quantity .lm-number-changing').count()>0,'same authorized snapshot survives loading');await settle();
  await page.evaluate(()=>{__coreContext='count';document.getElementById('quantity').textContent='35';__core.flush();});assert.ok(await page.locator('#quantity .lm-number-changing').count()>0,'explicit display context can replace a measure');assert.equal(await page.locator('#identity [data-lm-number-key],#editable [data-lm-number-key]').count(),0);assert.equal(await page.locator('#editable').inputValue(),'0.123456789');
  assert.deepEqual(errors,[],'all actual modules must load/render without transition warnings or browser errors');
  console.log('PASS: all seven real module documents/renderers, native receipt edits, formatted financial totals, count refreshes, Tax basis isolation, Gantt durations/identities, Settings totals, and reduced motion.');
}catch(error){console.error('Browser errors:',errors);console.error(await page.locator('[data-po-total]').allTextContents());throw error;}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
