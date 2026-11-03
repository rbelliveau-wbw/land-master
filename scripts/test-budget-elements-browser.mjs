// Desktop fixture uses the full shipped Budget document and original handlers.
// Creator startup and business writes are disabled; native-shaped rows stay local.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = createRequire(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'))('playwright'); }
const base = path.resolve('widgets/budget-manager/src/app'), output = path.resolve('tmp/budget-elements');
fs.mkdirSync(output, {recursive:true});
const inject = `
window.__ELEMENT_TEST__={S,CFG,renderPhaseMatrix,renderProjectMatrix,renderCatFilterBar,budgetFeature,applyBudgetItemFilters,updateExpandToggle,refreshBudgetElementValues,openModModal,openModEdit,closeModModal};
window.__ELEMENT_TEST__.enableModBoundary=function(){
  window.__modNativeWrites=[];window.__modApis=[];
  mountModRequestAttachments=function(){};
  sdkUpdateRecord=async function(form,id,data){__modNativeWrites.push({form,id,data});return {code:3000};};
  sdkRunBudgetFunction=async function(name,args){__modApis.push({name,args});return {result:'ok'};};
  refreshBudgetWorkflowState=async function(){};refreshModSurfaces=function(){};openModDetail=function(){};
  openModificationProgress=function(id,bid,trigger,action){window.__modPending=action();};
};
window.__ELEMENT_TEST__.enableFullExportBoundary=function(){
  window.__fullExportFormats=[];
  runFullBudgetExport=function(format){__fullExportFormats.push(format);closeFullBudgetExportMenu();return Promise.resolve();};
};
window.__elementWrites=0;
sdkUpdateRecord=async function(){window.__elementWrites++;throw Error('Read-only element fixture cannot write');};
sdkGetAllRecords=async function(report){return report===CFG.reports.importItems?(window.__elementImports||[]):[];};
`;
const server = http.createServer((req,res) => {
  const file = new URL(req.url,'http://localhost').pathname.slice(1) || 'widget.html', filename = path.resolve(base,file);
  if (!filename.startsWith(base+path.sep) || !fs.existsSync(filename)) {res.writeHead(404).end();return;}
  let body = fs.readFileSync(filename);
  if (file==='widget.html') body=body.toString().replace(/\/\* Creator injects[\s\S]*?(?=\/\* Repository design:)/,inject);
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(body);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await playwright.chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1580,height:1100}}),errors=[];
page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));
await page.route(/.*/,route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.fulfill({body:'',contentType:'text/javascript'}));
const visible=selector=>page.locator(selector+':visible').count();
const settle=()=>page.waitForTimeout(340);
const snapshot=()=>page.evaluate(()=>({footer:document.querySelector('#mx tfoot').textContent,items:JSON.stringify(__ELEMENT_TEST__.S.items),editors:document.querySelectorAll('#mx tr.irow input.ci').length}));
async function toolbar(label){assert.equal(await page.locator('#expandToggleText').innerText(),label);}
try {
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  await page.waitForFunction(()=>window.__ELEMENT_TEST__&&window.__interactionMotion&&window.__numberTransitions);
  await page.evaluate(()=>{
    const T=__ELEMENT_TEST__,S=T.S;
    S.view='vEditor';S.useMock=true;S.startupReady=true;S.currentUser='element-fixture';S.myAccessId='4410926000009999000';
    S.perms={editAll:true,viewImports:true};S.globalMode='edit';S.edPhaseIdx=0;S.tier='final';S.catFilter='all';S.hideEmptyItems=false;
    T.budgetFeature('modifications').status='loaded';T.budgetFeature('imports').status='loaded';
    const b1={ID:'4410926000009999001',Budget_Name:'Cedar Phase 1',Subdivision_Code:'CEDAR01',Lot_Total_Residential:10,_projectKey:'cedar',Const_Budget_Approval_Status:'Not Sent',Dev_Budget_Approval_Status:'Not Sent'},b2={...b1,ID:'4410926000009999002',Budget_Name:'Cedar Phase 2',Subdivision_Code:'CEDAR02'};
    window.__elementProject={key:'cedar',name:'Cedar',phases:[b1,b2]};S.projects=[__elementProject];S.budgets=[b1,b2];S.edBudget=b1;
    const parts=(a,b,c,d,e)=>({Labor_Budget:a,Materials_Budget:b,Equipment_Budget:c,Subcontractor_Budget:d,Other_Budget:e});
    const cat=(ID,b,code,name,dept,total)=>({ID,Budget:{ID:b.ID},Category_Code:code,Budget_Category_Name:name,Deparment:dept,Prelim_Budget_Total:total,Budget_Total:total});
    S.categories[b1.ID]=[cat('4410926000009999011',b1,'3100','Site Work','Construction',1000),cat('4410926000009999012',b1,'4100','Development','Development',0)];
    S.categories[b2.ID]=[cat('4410926000009999021',b2,'3100','Site Work','Construction',2000),cat('4410926000009999022',b2,'4100','Development','Development',0)];
    const item=(ID,b,c,name,code,total,split)=>({ID,Budget:{ID:b.ID},Budget_Category:{ID:c},Item_Name:name,Cost_Code:code,Budget_Code:b.Subdivision_Code+'-'+code,Prelim_Budget_Ttl:total,Unapproved_Final_Budget_Ttl:total,Budget_Ttl:total,HCSS_Actuals:50,PROJ_Actual:75,...split});
    S.items[b1.ID]=[item('4410926000009999031',b1,'4410926000009999011','Clearing','3101',600,parts('100.1234','200.0000','50.0000','150.0000','99.8766')),item('4410926000009999032',b1,'4410926000009999011','Grading','3102',400,{}),{...item('4410926000009999033',b1,'4410926000009999012','Empty Line','4101',0,parts(0,0,0,0,0)),HCSS_Actuals:0,PROJ_Actual:0}];
    S.items[b2.ID]=[item('4410926000009999041',b2,'4410926000009999021','Clearing','3101',1500,parts(200,400,200,400,300)),item('4410926000009999042',b2,'4410926000009999021','Grading','3102',500,parts(100,100,100,100,100))];
    S.modifications=[{ID:'4410926000009999051',Budget:{ID:b1.ID},Budget_Item:{ID:'4410926000009999031',zc_display_value:'Clearing'},Status:'Approved',Modification_Type:'Increase',Amount:'25',...parts(5,5,5,5,5)},{ID:'4410926000009999052',Budget:{ID:b1.ID},Budget_Item:{ID:'4410926000009999031'},Status:'Approved',Modification_Type:'Decrease',Amount:'5',...parts(1,1,1,1,1)}];
    window.__elementImports=[{ID:'4410926000009999061',Budget_Item:{ID:'4410926000009999031'},Data_Source:'HeavyJob Budget',Cost:'600',...parts('100.1234',200,50,150,'99.8766')}];
    S.importItems=__elementImports;S.importItemsLoaded=true;S.collapsed={'c4410926000009999011':true,'c4410926000009999012':true};S.elementExpanded={};
    T.renderCatFilterBar();T.renderPhaseMatrix(b1);
    for(const id of ['mx','expandToggle'])for(let node=document.getElementById(id);node&&node!==document.body;node=node.parentElement){node.hidden=false;if(getComputedStyle(node).display==='none')node.style.display='block';}
    document.querySelector('#vEditor').style.display='block';document.querySelector('#vBudgets').style.display='none';document.querySelector('#loading')?.style.setProperty('display','none');
    __interactionMotion.flush();__numberTransitions.flush();
  });
  const phaseInitial=await snapshot();
  await toolbar('Expand All Lines');assert.equal(await visible('#mx tr.irow'),0);
  await page.locator('#expandToggle').click();await settle();await toolbar('Expand All Elements');assert.equal(await visible('#mx tr.irow'),3);assert.equal(await visible('#mx tr.budget-element-row'),0);
  await page.evaluate(()=>{window.__originalEditor=document.querySelector('#mx tr.irow input.ci');__originalEditor.value='987.6543';});
  await page.locator('#expandToggle').click();await settle();await toolbar('Collapse All');assert.equal(await visible('#mx tr.budget-element-row'),15);
  await page.locator('[data-cf="dev"]').click();await settle();assert.equal(await visible('#mx tr.irow'),1);assert.equal(await visible('#mx tr.budget-element-row'),5,'department filter hides element descendants with their category');await page.locator('[data-cf="all"]').click();await settle();assert.equal(await visible('#mx tr.budget-element-row'),15);
  assert.deepEqual(await snapshot(),phaseInitial,'expansion preserves native parent totals, amounts and mounted editor count');
  assert.equal(await page.evaluate(()=>document.querySelector('#mx tr.irow input.ci')===__originalEditor),true);assert.equal(await page.locator('#mx tr.irow input.ci').first().inputValue(),'987.6543');
  assert.deepEqual(await page.locator('#mx tr.budget-element-row .budget-element-label').allTextContents(),Array(3).fill(['(1) Labor','(2) Materials','(3) Equipment','(4) Subcontractor','(5) Other']).flat());
  const firstChildren=page.locator('#mx tr.budget-element-row').first();assert.match(await firstChildren.locator('td').nth(6).innerText(),/100\.1234/);assert.match(await firstChildren.locator('td').nth(7).innerText(),/4/);assert.match(await firstChildren.locator('td').nth(8).innerText(),/104\.1234/);
  await page.evaluate(()=>{
    window.__originalChild=document.querySelector('#mx tr.budget-element-row');
    const S=__ELEMENT_TEST__.S;S.importItems=S.importItems.map(row=>({...row,Labor_Budget:'120.1234',Other_Budget:'79.8766'}));
    __ELEMENT_TEST__.refreshBudgetElementValues();
  });
  assert.match(await firstChildren.locator('td').nth(5).innerText(),/120\.1234/,'current import refresh patches only its matching Unapproved component');
  assert.match(await firstChildren.locator('td').nth(6).innerText(),/100\.1234/,'current import refresh cannot replace frozen Final');
  assert.equal(await page.evaluate(()=>document.querySelector('#mx tr.budget-element-row')===__originalChild&&document.querySelector('#mx tr.irow input.ci')===__originalEditor),true,'import completion retains mounted rows and editors');
  assert.equal(await page.locator('#mx tr.irow input.ci').first().inputValue(),'987.6543');
  await page.evaluate(()=>{__ELEMENT_TEST__.S.perms.viewImports=false;__ELEMENT_TEST__.refreshBudgetElementValues();});
  assert.equal(await firstChildren.locator('td').nth(5).innerText(),'—','revoking native Imports permission hides cached imported values');
  assert.match(await firstChildren.locator('td').nth(6).innerText(),/100\.1234/,'saved Final remains a Budget-owned value');
  await page.evaluate(()=>{__ELEMENT_TEST__.S.perms.viewImports=true;__ELEMENT_TEST__.refreshBudgetElementValues();});
  assert.equal(await page.locator('#mx tr.budget-element-row input').count(),0,'element rows never create editors');
  await page.locator('#vEditor').screenshot({path:path.join(output,'phase-elements.png')});
  await page.locator('#expandToggle').click();await settle();await toolbar('Expand All Lines');assert.equal(await visible('#mx tr.irow'),0);assert.equal(await visible('#mx tr.budget-element-row'),0);
  await page.locator('#expandToggle').click();await settle();
  const firstToggle=page.locator('#mx [data-element-toggle]').first();await firstToggle.focus();await firstToggle.press('Enter');await settle();assert.equal(await firstToggle.getAttribute('aria-expanded'),'true');assert.equal(await visible('#mx tr.budget-element-row'),5);
  await firstToggle.press('Space');await settle();assert.equal(await firstToggle.getAttribute('aria-expanded'),'false');assert.equal(await visible('#mx tr.budget-element-row'),0);
  await page.evaluate(()=>{const button=document.querySelector('#mx [data-element-toggle]');for(let i=0;i<9;i++)button.click();});await settle();assert.equal(await firstToggle.getAttribute('aria-expanded'),'true');assert.equal(await visible('#mx tr.budget-element-row'),5);
  const category=page.locator('#mx tr.catr').first();await category.click();await settle();assert.equal(await visible('#mx tr.budget-element-row'),0,'category collapse hides descendants');await category.click();await settle();assert.equal(await visible('#mx tr.budget-element-row'),5,'category reopen restores individual element choice');
  await page.locator('#itemSearch').fill('Grading');await settle();assert.equal(await visible('#mx tr.irow'),1);assert.equal(await visible('#mx tr.budget-element-row'),0,'search hides descendants with their parent');
  await page.locator('#itemSearch').fill('');await settle();assert.equal(await visible('#mx tr.budget-element-row'),5);
  await page.locator('#expandToggle').click();await settle();await toolbar('Collapse All');assert.equal(await visible('#mx tr.budget-element-row'),15);
  await page.locator('#budgetHideEmpty').click();await settle();assert.equal(await visible('#mx tr.irow'),2);assert.equal(await visible('#mx tr.budget-element-row'),10,'Hide Empty propagates to element descendants');await page.locator('#budgetHideEmpty').click();await settle();assert.equal(await visible('#mx tr.budget-element-row'),15);
  await page.evaluate(()=>{for(let i=0;i<6;i++)document.getElementById('expandToggle').click();});await settle();await toolbar('Collapse All');assert.equal(await visible('#mx tr.budget-element-row'),15,'rapid whole-table cycles settle without duplicating children');assert.equal(await page.locator('#mx tr.budget-element-row').count(),15);
  await page.evaluate(()=>{const T=__ELEMENT_TEST__,S=T.S;S.edPhaseIdx='all';S.tier='final';S.elementExpanded={};S.collapsed={};T.renderCatFilterBar();T.renderProjectMatrix(__elementProject);});
  const projectInitial=await snapshot();await toolbar('Expand All Elements');await page.locator('#expandToggle').click();await settle();await toolbar('Collapse All');assert.equal(await visible('#mx tr.budget-element-row'),15);
  assert.match(await page.locator('#mx tr.budget-element-row').first().locator('td').last().innerText(),/300\.1234/,'all-phase total uses aligned native element snapshots');assert.deepEqual(await snapshot(),projectInitial);
  assert.equal(await page.locator('#mx tr.budget-element-row').nth(5).locator('td').last().innerText(),'—','an incomplete phase breakdown cannot claim a complete all-phase element total');
  await page.locator('#vEditor').screenshot({path:path.join(output,'all-phase-elements.png')});
  await page.locator('[data-tierpill="prelim"]').click();await settle();assert.equal(await visible('#mx tr.budget-element-row'),15,'tier switch retains disclosure choices');assert.equal(await page.locator('#mx tr.budget-element-row').first().locator('td').last().innerText(),'—','Preliminary does not invent a split');
  await page.locator('[data-tierpill="final"]').click();await settle();assert.match(await page.locator('#mx tr.budget-element-row').first().locator('td').last().innerText(),/300\.1234/);
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#expandToggle').click();await toolbar('Expand All Lines');assert.equal(await visible('#mx tr.budget-element-row'),0);await page.locator('#expandToggle').click();await toolbar('Expand All Elements');await page.locator('#expandToggle').click();await toolbar('Collapse All');assert.equal(await visible('#mx tr.budget-element-row'),15);
  assert.equal(await page.locator('#mx .budget-element-toggle svg').first().evaluate(node=>getComputedStyle(node).transitionDuration),'0s','reduced motion disables chevron transitions');
  const geometry=await page.locator('#mx').evaluate(table=>{const parent=table.querySelector('tr.irow'),child=table.querySelector('tr.budget-element-row'),r=table.getBoundingClientRect();return {tableWidth:r.width,parentColumns:parent.cells.length,childColumns:child.cells.length,labelInset:child.cells[0].querySelector('span').getBoundingClientRect().left-parent.cells[0].getBoundingClientRect().left,childHeight:child.getBoundingClientRect().height};});
  assert.equal(geometry.parentColumns,geometry.childColumns,'element cells retain matrix alignment');assert.ok(geometry.labelInset>=40,'element labels are indented beneath budget lines');assert.ok(geometry.childHeight>15&&geometry.childHeight<45,'desktop element rows stay compact');
  await page.evaluate(()=>{const T=__ELEMENT_TEST__,S=T.S;S.edPhaseIdx=0;S.items[S.edBudget.ID]=[];S.collapsed={};S.elementExpanded={};T.renderCatFilterBar();T.renderPhaseMatrix(S.edBudget);});
  await toolbar('Collapse All');await page.locator('#expandToggle').click();await toolbar('Expand All Lines');assert.equal(await visible('#mx tr.catr.closed'),2,'empty categories can collapse without an element expansion dead end');
  await page.locator('#expandToggle').click();await toolbar('Collapse All');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>{
    const T=__ELEMENT_TEST__,S=T.S;T.enableModBoundary();
    const b=S.edBudget,parts=values=>Object.fromEntries(['Labor_Budget','Materials_Budget','Equipment_Budget','Subcontractor_Budget','Other_Budget'].map((field,index)=>[field,values[index]]));
    S.categories[b.ID]=[{ID:'mod-con',Deparment:'Construction'},{ID:'mod-dev',Deparment:'Development'},{ID:'mod-eng',Deparment:'Engineering'}];
    S.items[b.ID]=[{ID:'4410926000009999101',Budget:{ID:b.ID},Budget_Category:{ID:'mod-con'},Item_Name:'Clearing',Budget_Ttl:'1500',...parts([100,200,300,400,500])},{ID:'4410926000009999102',Budget:{ID:b.ID},Budget_Category:{ID:'mod-dev'},Item_Name:'Permits',Budget_Ttl:500},{ID:'4410926000009999103',Budget:{ID:b.ID},Budget_Category:{ID:'mod-eng'},Item_Name:'Design',Budget_Ttl:500}];
    S.modifications=[{ID:'4410926000009999111',Budget:{ID:b.ID},Budget_Item:{ID:'4410926000009999101'},Status:'Approved',Modification_Type:'Increase',Amount:'25',Reason:'Existing material order',Reference_Number:'CO-OLD',...parts([0,25,0,0,0])},{ID:'4410926000009999112',Budget:{ID:b.ID},Budget_Item:{ID:'4410926000009999101'},Status:'Approved',Modification_Type:'Increase',Amount:'50',Reason:'Prior labor',...parts([50,0,0,0,0])}];
    T.openModModal('4410926000009999103','add');
  });
  assert.equal(await page.locator('#modElementLabel').innerText(),'(1) Labor','Engineering new modifications default to Labor');
  await page.evaluate(()=>{__ELEMENT_TEST__.closeModModal();__ELEMENT_TEST__.openModModal('4410926000009999102','add');});
  assert.equal(await page.locator('#modElementLabel').innerText(),'(5) Other','Development new modifications default to Other');
  await page.evaluate(()=>{__ELEMENT_TEST__.closeModModal();__ELEMENT_TEST__.openModModal('4410926000009999101','add');});
  assert.equal(await page.locator('#modElementLabel').innerText(),'(5) Other');
  const position=await page.locator('#modElementToggle').evaluate(picker=>({picker:picker.getBoundingClientRect().left,amount:document.getElementById('modAmt').getBoundingClientRect().left,sign:document.querySelector('.sign-seg').getBoundingClientRect().left}));assert.ok(position.sign<position.picker&&position.picker<position.amount,'element picker sits between sign controls and amount');
  await page.locator('#modAmt').fill('70');await page.locator('#modReason').fill('Scope retained through element changes');await page.locator('#modRef').fill('CO-123');await page.locator('#modDate').fill('11/03/2026');
  await page.evaluate(()=>{window.__originalModAmount=document.getElementById('modAmt');});
  await page.locator('#modElementToggle').focus();await page.locator('#modElementToggle').press('Enter');assert.equal(await page.locator('#modElementMenu').isVisible(),true);
  assert.deepEqual(await page.locator('#modElementMenu [role=option]').allTextContents(),['(1) Labor','(2) Materials','(3) Equipment','(4) Subcontractor','(5) Other']);
  await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');assert.equal(await page.locator('#modElementLabel').innerText(),'(4) Subcontractor');
  assert.equal(await page.evaluate(()=>document.getElementById('modAmt')===__originalModAmount),true,'element choice patches preview without replacing input');
  assert.deepEqual(await page.locator('[data-mod-element-row="4"] td').allTextContents(),['$400','$0','$70','$470']);
  await page.locator('[data-modtype="Decrease"]').click();await settle();assert.equal(await page.locator('#modElementLabel').innerText(),'(4) Subcontractor');assert.equal(await page.locator('#modAmt').inputValue(),'$70');assert.equal(await page.locator('#modReason').inputValue(),'Scope retained through element changes');assert.equal(await page.locator('#modRef').inputValue(),'CO-123');assert.equal(await page.locator('#modDate').inputValue(),'11/03/2026');
  assert.deepEqual(await page.locator('[data-mod-element-row="4"] td').allTextContents(),['$400','$0','−$70','$330']);
  await page.locator('#modOverlay .mod-modal').screenshot({path:path.join(output,'modification-elements.png')});
  await page.locator('#modSubmitBtn').click();await page.waitForFunction(()=>__modApis.length===1);const created=await page.evaluate(()=>__modApis[0]);assert.equal(created.name,'createBudgetModification');assert.equal(created.args.modType,'Decrease');assert.equal(JSON.parse(created.args.amount).components.Subcontractor_Budget,'70.00');
  await page.evaluate(()=>__ELEMENT_TEST__.openModEdit('4410926000009999111'));assert.equal(await page.locator('#modElementLabel').innerText(),'(2) Materials','editing keeps the original nondefault element');
  assert.deepEqual(await page.locator('[data-mod-element-row="2"] td').allTextContents(),['$200','$0','$25','$225'],'edit preview excludes its own old allocation from prior modifications');
  await page.locator('#modAmt').focus();await page.locator('#modAmt').fill('30');assert.equal(await page.locator('#modAmt').inputValue(),'30');await page.locator('#modAmt').press('Tab');assert.equal(await page.locator('#modAmt').inputValue(),'$30');await page.locator('#modSubmitBtn').click();await page.waitForFunction(()=>__modApis.length===2&&__modNativeWrites.length===1);const edited=await page.evaluate(()=>({api:__modApis[1],native:__modNativeWrites[0]}));assert.equal(edited.api.name,'modificationAdmin');assert.equal(edited.native.data.Materials_Budget,'30.00');assert.equal(edited.native.data.Labor_Budget,'0.00');assert.equal(JSON.parse(edited.api.args.amount).components.Materials_Budget,'30.00');
  await page.evaluate(()=>{
    const T=__ELEMENT_TEST__,S=T.S;T.closeModModal();S.edPhaseIdx=0;S.tier='prelim';S.globalMode='edit';S.collapsed={};
    const item=S.items[S.edBudget.ID].find(row=>row.ID==='4410926000009999102');item.Prelim_Budget_Ttl=100;
    ['Labor','Materials','Equipment','Subcontractor','Other'].forEach(name=>{item['Prelim_'+name+'_Budget']=null;});
    S.elementExpanded={[item.ID]:true};T.renderCatFilterBar();T.renderPhaseMatrix(S.edBudget);
    window.__prelimEntry=document.querySelector('tr[data-iid="'+item.ID+'"] input.ci');window.__prelimChild=document.querySelector('tr[data-element-parent="'+item.ID+'"]');
  });
  const prelimInput=page.locator('tr[data-iid="4410926000009999102"] input.ci');await prelimInput.focus();await prelimInput.fill('150.125');
  assert.equal(await page.evaluate(()=>document.querySelector('tr[data-iid="4410926000009999102"] input.ci')===__prelimEntry),true,'typing uses the existing parent input');
  assert.equal(await page.evaluate(()=>document.querySelector('tr[data-element-parent="4410926000009999102"]')===__prelimChild),true,'typing patches the existing element rows');
  assert.deepEqual(await page.evaluate(()=>__ELEMENT_TEST__.S.items[__ELEMENT_TEST__.S.edBudget.ID].find(row=>row.ID==='4410926000009999102')._prelimElementDraft),[0,0,0,0,150.125]);
  assert.equal(await page.evaluate(()=>__modNativeWrites.length),1,'typing alone does not cross the existing blur-save boundary');
  await prelimInput.press('Tab');await page.waitForFunction(()=>__modNativeWrites.length===2);await page.waitForTimeout(450);
  const prelimSave=await page.evaluate(()=>__modNativeWrites[1]);assert.equal(prelimSave.id,'4410926000009999102');assert.equal(prelimSave.data.Prelim_Budget_Ttl,150.125);assert.equal(prelimSave.data.Prelim_Other_Budget,150.125);assert.equal(prelimSave.data.Prelim_Labor_Budget,0);assert.equal(Object.hasOwn(prelimSave.data,'Other_Budget'),false,'Preliminary entry cannot write frozen Final components');
  assert.match(await page.locator('tr[data-element-parent="4410926000009999102"]').nth(4).locator('td').nth(4).innerText(),/150\.125/,'the existing input updates Other below the line');
  await page.locator('#vEditor').screenshot({path:path.join(output,'preliminary-entry-elements.png')});
  assert.equal(await page.evaluate(()=>__elementWrites),0);
  // Give the landing-only export menu its own clean landing state, independent
  // from the preceding editor/modal fixtures and their focus scopes.
  await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.waitForFunction(()=>window.__ELEMENT_TEST__);
  await page.evaluate(()=>{__ELEMENT_TEST__.enableFullExportBoundary();__ELEMENT_TEST__.S.view='vBudgets';document.getElementById('fullBudgetExportWrap').style.display='inline-block';const outside=document.createElement('button');outside.id='exportOutsideFocus';outside.textContent='Outside Export Menu';document.body.appendChild(outside);});
  await page.locator('#fullBudgetExport').click();assert.equal(await page.locator('#fullBudgetExport').getAttribute('aria-expanded'),'true');assert.deepEqual(await page.locator('#fullBudgetExportMenu [role=menuitem]').allTextContents(),['Excel','CSV']);
  assert.equal(await page.locator('[data-full-budget-export="xlsx"]').evaluate(node=>node===document.activeElement),true,'opening export menu focuses Excel');
  await page.keyboard.press('ArrowDown');assert.equal(await page.locator('[data-full-budget-export="csv"]').evaluate(node=>node===document.activeElement),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#fullBudgetExportMenu').isVisible(),false);assert.equal(await page.locator('#fullBudgetExport').evaluate(node=>node===document.activeElement),true,'Escape restores the export trigger focus');
  await page.locator('#fullBudgetExport').click();await page.locator('#fullBudgetExport').click();assert.equal(await page.locator('#fullBudgetExportMenu').isVisible(),false,'trigger toggles menu closed');
  await page.locator('#fullBudgetExport').click();await page.locator('#exportOutsideFocus').focus();assert.equal(await page.locator('#exportOutsideFocus').evaluate(node=>node===document.activeElement),true);assert.equal(await page.locator('#fullBudgetExportMenu').isVisible(),false,'focus outside closes the export menu');
  await page.locator('#fullBudgetExport').click();await page.mouse.click(2,100);assert.equal(await page.locator('#fullBudgetExportMenu').isVisible(),false,'outside click closes the export menu');
  await page.locator('#fullBudgetExport').click();await page.locator('[data-full-budget-export="csv"]').click();assert.equal(await page.locator('#fullBudgetExportMenu').isVisible(),false);await page.locator('#fullBudgetExport').click();await page.locator('[data-full-budget-export="xlsx"]').click();assert.deepEqual(await page.evaluate(()=>__fullExportFormats),['csv','xlsx'],'original menu handlers dispatch the selected format to the isolated export boundary');
  assert.equal(await page.evaluate(()=>__elementWrites),0);assert.deepEqual(errors,[]);
  console.log('Budget elements desktop: disclosures/filters/drafts/totals/reduced motion; modification picker/previews/payloads; unchanged Preliminary entry with atomic split; actual Excel/CSV menu keyboard/outside/focus/format dispatch passed.',geometry);
} catch(error) {await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});console.error('Budget element browser errors:',errors);throw error;}
finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
