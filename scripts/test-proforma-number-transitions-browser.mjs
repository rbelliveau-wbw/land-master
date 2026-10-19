// Desktop, inert fixtures. Uses actual PF renderers/math/handlers; no Creator business writes.
import {createRequire} from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fixture as transferFixture} from './fixtures/proforma-budget-transfer.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=path.resolve('widgets/proforma-manager/src/app'),output=path.resolve('tmp/proforma-number-transitions-preview');
fs.mkdirSync(output,{recursive:true});
const boot='if(window.ZOHO&&window.ZOHO.CREATOR){window.__pfBoot=pfBootV2();}else{S.liveSDK=false;S.useMock=true;S.coreReady=true;window.__pfBoot=boot();}';
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost'),file=url.pathname.slice(1)||'widget.html',filename=path.resolve(root,file);
  if(!filename.startsWith(root+path.sep)||!fs.existsSync(filename)){res.writeHead(404).end();return;}
  let body=fs.readFileSync(filename,'utf8');
  if(file==='widget.html'){
    assert.ok(body.includes(boot));
    body=body.replace(boot,'window.__pfBoot=Promise.resolve(); window.__NUMTEST__={renderList,renderDashboard,renderDealRoom,renderDealHeavy,renderFlowTable,renderEdit,renderMonthsPane,refreshComputedInputs,refreshPhaseLotPricePill,refreshPhaseSalesFeedback,rerenderPane,moUpdateSummary,recalcLive,showView,applyPermsFromFlags,loiRecalcSummary,refreshLoiAcreField,refreshLoiPriceField,recordToLOIWorksheet};');
    if(url.searchParams.has('plain'))body=body.replace(/<(?:script|link)\b[^>]*(?:number-transitions|number-views)[^>]*>(?:<\/script>)?/g,'');
  }
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(body);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:1580,height:1020}}),errors=[];
page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning'&&(m.text().includes('number presentation')||m.text().includes('Interaction motion unavailable')))errors.push(m.text());});
await page.route(/.*/,route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.fulfill({body:'',contentType:'text/javascript'}));
await page.addInitScript(()=>{window.ZOHO={CREATOR:{UTIL:{getInitParams:async()=>({envUrlFragment:'/environment/development',loginUser:'fixture@example.test'})}}};});
const url='http://127.0.0.1:'+server.address().port;
async function setup(target=page,plain=false){
  await target.goto(url+(plain?'/?plain=1':''));await target.waitForFunction(()=>window.__PFW_TEST__&&window.__NUMTEST__);
  await target.evaluate(async()=>{
    const W=__PFW_TEST__,T=__NUMTEST__,S=W.S;await W.PFTransport.start();
    S.coreReady=true;S.useMock=false;S.liveSDK=false;S.phaseSalesReady=true;
    T.applyPermsFromFlags({hasRow:true,pfEditAll:true,pfEditCurve:true,pfVpCompTab:true,pfEditProbability:true,pfEditOwner:true,pfApprAll:true,myId:'owner'});
    const m=W.newModel();Object.assign(m,{ID:'90071992547410001',Name:'Cedar Hollow',Territory:'North Austin',Owner:'owner',purchaseDate:{y:2027,m:1},Lots:'100',Phases:'2',Total_Acres:'100',Lot_Size_Ft:'50',Sale_Price_FF:'1000',Land_Cost_Acre:'10000',Total_Street_LF:'5000',Engineering_Cost_Lot:'1000',Const_Cost_FF:'120',Engineering_Length_Months:'6',Construction_Length:'12',Lot_Sales_Schedule_Version:'2',Same_Lot_Sales_All_Phases:'false'});
    m.lotMix=[{ID:'mix-1',Lot_Size_Ft:'50',Lot_Count:'100',Price_LF:'1000'}];
    m.phaseSales=[1,2].map(Phase=>({ID:'phase-'+Phase,Phase,Total_Lots:'50',Initial_Take_Lots:'20',Initial_Delay_Months:'0',First_Recurring_Delay_Months:'1',Lots_Per_Take:'10',Take_Frequency:'Monthly',Escalator_Enabled:'false',Annual_Escalator_Pct:'0',Additional_Markup_Pct:'0'}));
    m.curve=Array.from({length:12},(_,i)=>({Month_Number:String(i+1),Percent_Cost:String(100/12)}));
    m.items=[{ID:'cost-1',Department:'Construction',Category:'Construction',Item_Name:'Fixture civil work',Add_l_Cost:'10000',Unit:'Lot',Per_Unit:'100',_perUnit:true,Cost_Application:'Across Phases',Start_Phase:'1',End_Phase:'2'}];
    S.proformas=[{...m,Estimated_Purchase_Date:'01-Jan-2027',Net_Profit:'1000000',ROI1:'25',IRR:'20',XIRR:'19'}];
    S.properties=[{ID:'property-1',Property_Name:'Cedar',Acres:'100'}];
    S.referenceContext=JSON.stringify(LMRuntime.current());
    S.ed={...S.ed,id:m.ID,model:m,calc:W.modelToCalc(m),pane:'gen',isNew:false,dirty:false,phaseSelected:0,loi:T.recordToLOIWorksheet({},m)};
    S.ed.loi.propertyIds=['property-1'];S.ed.loi.Amount_Per_Acre='10000';T.loiRecalcSummary();
    T.showView('vEdit');T.renderEdit();T.recalcLive();
  });
  await target.waitForFunction(()=>document.getElementById('lvTI').textContent!=='—');
}
const settled=()=>page.waitForFunction(()=>!document.querySelector('.pf-number-changing'));
const typeValue=async(input,value)=>{await input.click();await settled();await input.press('Control+a');const before=await page.locator('[data-pf-number-key]').evaluateAll(nodes=>Object.fromEntries(nodes.map(n=>[n.dataset.pfNumberKey,{text:n.dataset.pfNumberText,...(()=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})()}])));await page.keyboard.insertText(value);await page.waitForFunction(()=>document.querySelector('.number-edit-pending'));assert.equal(await page.locator('.pf-number-changing').count(),0,'typing holds derived visuals '+JSON.stringify(await page.locator('.pf-number-changing').evaluateAll(nodes=>nodes.map(n=>({key:n.dataset.pfNumberKey,where:n.closest('.pfbt')?'transfer':n.closest('#vEdit')?'editor':'other',from:n.dataset.pfNumberFrom,now:n.dataset.pfNumberText})))));assert.equal(await input.evaluate(n=>n===document.activeElement),true,'typing preserves focus');assert.equal(await input.inputValue(),value,'typing preserves exact native precision');const blanks=await page.locator('.number-edit-pending').evaluateAll((nodes,before)=>nodes.filter(n=>before[n.dataset.pfNumberKey]!==undefined&&n.dataset.numberEditFrom!==before[n.dataset.pfNumberKey].text).map(n=>({key:n.dataset.pfNumberKey,old:before[n.dataset.pfNumberKey],from:n.dataset.numberEditFrom,css:getComputedStyle(n,'::before').content})),before);assert.deepEqual(blanks,[],'every existing derived number remains visibly equal to its pre-edit value');const moved=await page.locator('.number-edit-pending').evaluateAll((nodes,before)=>nodes.filter(n=>{const b=before[n.dataset.pfNumberKey];if(!b||!b.width||!b.height)return false;const r=n.getBoundingClientRect();const dimensions=n.closest('.pfbt-footer-state')?['width','height']:['x','y','width','height'];return dimensions.some(k=>Math.abs(b[k]-r[k])>0.1);}).map(n=>({key:n.dataset.pfNumberKey,before:before[n.dataset.pfNumberKey],now:(()=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})()})),before);assert.deepEqual(moved,[],'all held Pro Forma numbers retain their exact position and size while typing');if(value==='12345.67')await page.screenshot({path:path.join(output,'typing-old-values.png')});await input.press('Tab');};
const unique=async(selector)=>{
  const duplicates=await page.locator(selector+' [data-pf-number-key]').evaluateAll(nodes=>{const seen=new Set();return nodes.map(n=>n.dataset.pfNumberKey).filter(k=>seen.has(k)||!seen.add(k));});
  assert.deepEqual(duplicates,[],selector+' has stable unique field keys');
};
async function typeOneKeyAtATime(input,value,label){
  await input.click();await settled();
  let sawUnknown=false;
  const before=await page.locator('#lvNP,#lvROI,#lvIRR,#lvXIRR').evaluateAll(nodes=>Object.fromEntries(nodes.map(host=>{
    const node=host.querySelector('[data-pf-number-key]'),r=node.getBoundingClientRect();
    return [host.id,{text:host.textContent,color:getComputedStyle(node).color,x:r.x,y:r.y,width:r.width,height:r.height}];
  })));
  await input.press('Control+a');await input.press('Backspace');
  for(const character of ['',...value]){
    if(character)await input.press(character);
    // Longer than recalcLive's debounce: every intermediate financial state
    // actually renders, including a loss and unavailable IRR/XIRR.
    await page.waitForTimeout(210);
    const held=await page.locator('#lvNP,#lvROI,#lvIRR,#lvXIRR').evaluateAll(nodes=>nodes.map(host=>{
      const node=host.querySelector('[data-pf-number-key]'),r=node?.getBoundingClientRect();
      return {id:host.id,children:host.childNodes.length,held:node?.dataset.numberEditFrom,current:host.textContent,
        color:node?getComputedStyle(node,'::before').color:null,pending:node?.classList.contains('number-edit-pending'),
        x:r?.x,y:r?.y,width:r?.width,height:r?.height};
    }));
    for(const sample of held){
      if(sample.current==='—'&&before[sample.id].text!=='—')sawUnknown=true;
      assert.equal(sample.children,1,label+' retains one complete formatted scalar '+sample.id);
      assert.equal(sample.pending,true,label+' holds even unknown results '+sample.id);
      assert.equal(sample.held,before[sample.id].text,label+' retains old text '+sample.id);
      assert.equal(sample.color,before[sample.id].color,label+' retains old sign color '+sample.id);
      for(const dimension of ['x','y','width','height'])assert.ok(Math.abs(sample[dimension]-before[sample.id][dimension])<.1,label+' retains old '+dimension+' '+sample.id);
    }
    assert.equal(await page.locator('.pf-number-changing').count(),0,label+' never animates an intermediate keystroke');
    assert.equal(await input.evaluate(node=>node===document.activeElement),true,label+' retains native editing focus');
  }
  assert.equal(await input.inputValue(),value,label+' preserves native text');
  const changed=await page.locator('#lvNP').textContent();assert.notEqual(changed,before.lvNP.text,label+' calculates the current value immediately for accessible DOM/export');
  await page.screenshot({path:path.join(output,label+'-typing.png')});
  await input.press('Tab');await page.waitForFunction(()=>!document.querySelector('.number-edit-pending'));
  assert.equal(await page.locator('#lvNP .pf-number-push').getAttribute('data-pf-number-from'),before.lvNP.text,label+' commits directly from the last displayed value');
  assert.equal(await page.locator('#lvNP .pf-number-push').evaluate(node=>getComputedStyle(node,'::before').color),before.lvNP.color,label+' outgoing value retains its original sign color');
  const unknown=await page.locator('#lvIRR,#lvXIRR').evaluateAll(nodes=>nodes.filter(node=>node.textContent==='—').map(node=>node.querySelector('.pf-number-changing')!==null));
  assert.ok(unknown.every(changing=>!changing),label+' unknown final results stay still');await settled();
  return {sawUnknown};
}
try{
  await setup();await settled();assert.equal(await page.locator('.pf-number-changing').count(),0);
  await unique('#vEdit');
  assert.equal(await page.locator('.ed-side .sh-label').textContent(),'Net Profit','editor profit label stays unchanged');
  await page.locator('.ed-side').screenshot({path:path.join(output,'summary-sidebar.png')});
  const plain=await browser.newPage({viewport:{width:1580,height:1020}});await plain.route(/.*/,route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.fulfill({body:'',contentType:'text/javascript'}));await plain.addInitScript(()=>{window.ZOHO={CREATOR:{UTIL:{getInitParams:async()=>({envUrlFragment:'/environment/development',loginUser:'fixture@example.test'})}}};});await setup(plain,true);
  const existingText=target=>target.locator('#vEdit').evaluate(node=>{const clone=node.cloneNode(true);clone.querySelectorAll('.pf-number-input-display').forEach(n=>n.remove());return clone.textContent;});
  assert.equal(await existingText(page),await existingText(plain),'formatted text matches the existing renderer exactly');await plain.close();
  // The actual editor adopts shared tab motion and stable draft-row identities.
  await page.waitForFunction(()=>document.querySelector('#edTabs .lm-motion-rail'));
  await page.locator('#edTabs [data-pane="sched"]').click();await page.waitForTimeout(35);
  assert.ok(await page.locator('#edTabs .lm-motion-rail').evaluate(node=>node.getAnimations().length)>0,'actual PF selected tab slides');
  await page.locator('#edTabs [data-pane="gen"]').click();await page.waitForTimeout(220);await settled();
  const rowResize=async(selector,action,label)=>{
    const before=await page.locator(selector).evaluate(node=>({height:node.getBoundingClientRect().height,width:node.getBoundingClientRect().width}));
    const rowSelector=selector+' tbody>tr[data-kind],'+selector+' tbody>tr:has([data-loi-remove])';
    const priorRows=await page.locator(rowSelector).count();
    await action();
    assert.equal(await page.locator(rowSelector).count(),priorRows+(/remove/.test(label)?-1:1),label+' changes the native row collection immediately');
    await page.waitForTimeout(35);
    const actual=await page.locator(selector).evaluate(node=>({height:node.getBoundingClientRect().height,width:node.getBoundingClientRect().width,frames:node.getAnimations().flatMap(animation=>animation.effect.getKeyframes()).filter(frame=>frame.height)}));
    assert.ok(actual.frames.length>=2,label+' animates the actual list boundary, even without a following row');
    assert.ok(Math.abs(parseFloat(actual.frames[0].height)-before.height)<.5,label+' starts from the previously visible boundary');
    const target=parseFloat(actual.frames.at(-1).height);
    assert.ok(Math.abs(actual.height-target)>.5,label+' has a visible intermediate height');
    assert.ok(Math.abs(actual.width-before.width)<.5,label+' never shifts table width '+JSON.stringify({before,actual}));
    await page.screenshot({path:path.join(output,label+'-motion.png')});
    await page.waitForTimeout(280);
    assert.ok(Math.abs((await page.locator(selector).evaluate(node=>node.getBoundingClientRect().height))-target)<.5,label+' releases to the natural final height');
  };
  await rowResize('.lotmix-wrap',()=>page.locator('#btnAddLotMix').click(),'lotmix-append');
  assert.equal(await page.locator('tr[data-kind="lotmix"]').count(),2);
  assert.equal(await page.locator('tr[data-kind="lotmix"]').last().locator('input').first().evaluate(node=>node===document.activeElement),true,'native Add still focuses the new lot-size editor');
  assert.ok(await page.locator('tr[data-kind="lotmix"]').last().locator('td').first().evaluate(node=>node.getAnimations().length)>0,'inserted cell highlight remains visible above opaque table fills');
  await rowResize('.lotmix-wrap',()=>page.locator('tr[data-kind="lotmix"] .rowdel svg').last().click(),'lotmix-remove-last');
  assert.equal(await page.locator('tr[data-kind="lotmix"]').count(),1,'original removal handler remains immediate');
  await rowResize('.lotmix-wrap',()=>page.locator('tr[data-kind="lotmix"] .rowdel').click(),'lotmix-remove-only');
  assert.equal(await page.locator('tr[data-kind="lotmix"]').count(),0);
  await rowResize('.lotmix-wrap',()=>page.locator('#btnAddLotMix').click(),'lotmix-first');
  assert.equal(await page.locator('tr[data-kind="lotmix"]').count(),1);
  await page.evaluate(()=>__PFW_TEST__.setPane('pid'));await page.waitForTimeout(250);
  await rowResize('.pid-wrap',()=>page.locator('#btnAddPid .pid-add-icon svg').click(),'pid-first');
  await rowResize('.pid-wrap',()=>page.locator('tr[data-kind="pid"] .rowdel').click(),'pid-remove-only');
  await page.evaluate(()=>{__PFW_TEST__.setPane('loi');});await page.waitForTimeout(250);
  await rowResize('[data-lm-row-list="loi-sellers"]',()=>page.locator('#btnLOIAddNewSellerRow').click(),'offer-seller-first');
  await rowResize('[data-lm-row-list="loi-sellers"]',()=>page.locator('[data-loi-remove="new-seller"]').click(),'offer-seller-remove-only');
  await rowResize('[data-lm-row-list="loi-properties"]',()=>page.locator('#btnLOIAddNewPropertyRow').click(),'offer-property-append');
  await rowResize('[data-lm-row-list="loi-properties"]',()=>page.locator('[data-loi-remove="new-property"]').click(),'offer-property-remove-last');
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>__PFW_TEST__.setPane('gen'));await page.waitForTimeout(250);
  await page.locator('tr[data-kind="lotmix"] .rowdel').click();await page.locator('#btnAddLotMix').click();await page.waitForTimeout(35);
  assert.equal(await page.locator('.lotmix-wrap').evaluate(node=>node.getAnimations().length),0,'reduced motion applies the list boundary immediately');
  await page.locator('#btnAddLotMix').click();
  assert.equal(await page.locator('tr[data-kind="lotmix"]').count(),1,'native empty-draft duplicate guard remains intact');
  await page.emulateMedia({reducedMotion:'no-preference'});
  // Restart the inert fixture after destructive draft tests; do not fabricate
  // derived model totals while preparing the financial field-exit scenarios.
  await setup();await page.waitForTimeout(700);await settled();
  // The reported regression uses a number input in a subform, typed one key
  // at a time. A bulk paste never exercised its transient loss/unknown states.
  const lotPrice=page.locator('input[data-ik="Price_LF"]');
  assert.equal((await typeOneKeyAtATime(lotPrice,'12','lot-price-loss')).sawUnknown,true,'lot price fixture actually passes through unavailable IRR/XIRR');
  assert.equal(await page.locator('#lvNP').evaluate(node=>node.classList.contains('neg')),true,'a loss adopts its negative color only on committed display');
  await typeOneKeyAtATime(lotPrice,'1000','lot-price-restored');
  assert.equal(await page.locator('#lvNP').evaluate(node=>node.classList.contains('pos')),true);
  await page.evaluate(()=>__PFW_TEST__.setPane('addl'));await settled();
  await typeOneKeyAtATime(page.locator('input[data-ik="Per_Unit"]'),'125','additional-cost-per-unit');
  await page.evaluate(()=>__PFW_TEST__.setPane('gen'));await settled();
  const input=page.locator('input[data-k="Land_Cost_Acre"]');await typeValue(input,'12345.67');
  await page.waitForFunction(()=>document.querySelector('#lvLC .pf-number-changing'));
  assert.equal(await page.locator('.number-edit-pending').count(),0,'Tab releases the final visual');assert.equal((await input.inputValue()).replace(/,/g,''),'12345.67','typing keeps exact editable precision');
  assert.equal(await page.locator('#lvLC').textContent(),'$1,234,567','real final calculation is readable immediately');
  assert.equal(await page.locator('#lvLC .pf-number-push').getAttribute('data-pf-number-from'),'$1,000,000');
  assert.equal(await page.locator('[data-calc="engineeringStart"] [data-pf-number-key]').count(),0,'dates remain static');
  await page.screenshot({path:path.join(output,'editor-live.png')});await settled();
  // Calculated read-only controls preserve the actual input/value and have an aria-hidden visual layer.
  const mix=page.locator('input[data-ik="Price_LF"]');
  await typeValue(mix,'1100.25');await page.waitForFunction(()=>document.querySelector('[data-mixprice="0"]').value.includes('55,012.5'));
  await page.waitForFunction(()=>document.querySelector('.pf-number-input-display .pf-number-changing'));
  assert.equal(await page.locator('.number-edit-pending').count(),0);assert.equal(await page.locator('[data-mixprice="0"]').getAttribute('readonly'),'');
  await settled();
  await page.evaluate(()=>__PFW_TEST__.setPane('lotsales'));await settled();
  await typeOneKeyAtATime(page.locator('input[data-ps-k="Additional_Markup_Pct"]'),'12','phase-increase');
  const markup=page.locator('input[data-ps-k="Additional_Markup_Pct"]');await typeValue(markup,'10');
  await page.waitForFunction(()=>document.querySelector('[data-ps-marked-price] .pf-number-changing'));
  assert.equal(await page.locator('.number-edit-pending').count(),0);await page.waitForFunction(()=>document.querySelector('.ps-final-price .pf-number-changing'));
  await page.screenshot({path:path.join(output,'phase-prices.png')});await settled();
  await page.locator('[data-ps-select="1"]').click();assert.equal(await page.locator('[data-ps-marked-price] .pf-number-changing').count(),0,'another phase is a different identity');await settled();
  await page.evaluate(()=>{__PFW_TEST__.setPane('loi');const S=__PFW_TEST__.S;S.properties=[{ID:'property-1',Property_Name:'Cedar',Acres:'100'}];S.ed.loi.propertyIds=['property-1'];__NUMTEST__.loiRecalcSummary();__NUMTEST__.rerenderPane('loi');});await settled();
  const loiAmount=page.locator('input[data-loi-k="Amount_Per_Acre"]');await typeValue(loiAmount,'12000.25');
  await page.waitForFunction(()=>document.querySelector('#loiEstimatedPrice .pf-number-changing'));
  assert.equal(await page.locator('#loiEstimatedPrice').textContent(),'$1,200,025');assert.equal((await loiAmount.inputValue()).replace(/[$,]/g,''),'12000.25');assert.equal(await page.locator('.number-edit-pending').count(),0);await settled();
  await page.evaluate(()=>{__NUMTEST__.renderMonthsPane();__PFW_TEST__.S.ed.pane='months';});await unique('#monthsPane');await settled();
  await page.evaluate(()=>{const S=__PFW_TEST__.S;S.ed.model.Sale_Price_FF='1300';S.ed.calc=__PFW_TEST__.modelToCalc(S.ed.model);__NUMTEST__.renderMonthsPane();});
  assert.ok(await page.locator('#monthsPane .pf-number-changing').count()>0);assert.equal(await page.locator('#monthsPane table.mp td:nth-child(2) [data-pf-number-key]').count(),0);await settled();
  await page.evaluate(()=>{const W=__PFW_TEST__,S=W.S;S.dash={id:S.ed.id,model:structuredClone(S.ed.model),calc:null,tab:'cash',page:0,expanded:{},scenarioOpen:true,pins:[]};S.dash.calc=W.modelToCalc(S.dash.model);__NUMTEST__.showView('vDash');__NUMTEST__.renderDashboard();});await settled();await unique('#vDash');
  const peakView=async()=>{
    const expected=await page.evaluate(()=>{
      let run=0,min=0,point=null;
      for(const a of __PFW_TEST__.S.dash.calc.agg){run+=(a.totalIncome||0)-(a.totalExpenses||0);if(run<min){min=run;point=a;}}
      return {amount:(min<0?'($':'$')+Math.abs(min).toLocaleString('en-US',{maximumFractionDigits:0})+(min<0?')':''),timing:point?'Mth '+point.m+' · '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][point.date.m-1]+' '+point.date.y:''};
    });
    assert.equal(await page.locator('#flowPeakCash').textContent(),expected.amount,'peak amount uses the same cumulative cash series and preserves its sign');
    assert.equal(await page.locator('#flowPeakCashTiming').textContent(),expected.timing,'model/calendar timing identifies the actual deficit');
    assert.equal(await page.locator('#flowPeakCashTiming [data-pf-number-key]').count(),1,'only the model month animates; the calendar month/year stays static');
    assert.equal(await page.locator('.k-gross .k-label').textContent(),'Gross Profit','dashboard profit label stays unchanged');
  };
  await peakView();await page.locator('#kpis').screenshot({path:path.join(output,'summary-cards.png')});
  const before=await page.locator('#kpis').textContent();
  await page.evaluate(()=>__PFW_TEST__.dealApplyDriver('Sale_Price_FF',1500));
  assert.ok(await page.locator('#kpis .pf-number-changing').count()>0);assert.notEqual(await page.locator('#kpis').textContent(),before);assert.ok(await page.locator('#flowBody .pf-number-changing').count()>0);
  assert.equal(await page.locator('#flowBody .mth [data-pf-number-key],#flowHead [data-pf-number-key]').count(),0,'month/year identities stay static');
  await unique('#vDash');await page.screenshot({path:path.join(output,'dashboard-scenario.png')});await settled();
  const peakMonthBefore=await page.locator('#flowPeakCashMonth').textContent();
  await page.evaluate(()=>__PFW_TEST__.dealApplyDriver('Engineering_Length_Months',12));
  assert.notEqual(await page.locator('#flowPeakCashMonth').textContent(),peakMonthBefore,'a real schedule change moves peak timing');
  assert.ok(await page.locator('#flowPeakCashMonth .pf-number-changing').count()>0,'derived peak month adopts the existing Sliding push');
  await peakView();await settled();
  await page.evaluate(()=>{const S=__PFW_TEST__.S;S.dash.model.ID='90071992547410002';S.dash.id=S.dash.model.ID;S.dash.model.Sale_Price_FF='1700';S.dash.calc=__PFW_TEST__.modelToCalc(S.dash.model);__NUMTEST__.renderDashboard();});
  assert.equal(await page.locator('#kpis .pf-number-changing').count(),0,'unrelated records never morph');await settled();
  await page.evaluate(()=>{__NUMTEST__.showView('vList');__NUMTEST__.renderList();});await settled();await unique('#listBody');
  await page.evaluate(()=>{const S=__PFW_TEST__.S;S.proformas[0].Net_Profit='-325000';S.proformas.push({...S.proformas[0],ID:'90071992547419999',Name:'Copper Ridge'});__NUMTEST__.renderList();});
  assert.ok(await page.locator('#listBody tr[data-id="90071992547410001"] .pf-number-changing').count()>0);assert.ok(await page.locator('#pfCount2 .pf-number-changing').count()>0);
  assert.equal(await page.locator('#listBody tr[data-id="90071992547419999"] .pf-number-changing').count(),0,'new list records stay still');await unique('#listBody');await settled();
  await page.evaluate(()=>{const N=PFNumbers,host=document.createElement('div');host.id='numeric-regression';document.body.appendChild(host);host.textContent='($1,250.50)';N.decorate(host,'signed');window.__old=N.capture(host);host.textContent='$75.25';N.decorate(host,'signed');N.apply(host,__old);});
  assert.equal(await page.locator('#numeric-regression').textContent(),'$75.25');assert.equal(await page.locator('#numeric-regression .pf-number-push').getAttribute('data-pf-number-from'),'($1,250.50)');
  await page.evaluate(()=>{const N=PFNumbers,host=document.getElementById('numeric-regression'),old=N.capture(host);host.textContent='-$42';N.decorate(host,'signed');N.apply(host,old);});assert.equal(await page.locator('#numeric-regression').textContent(),'-$42');await settled();
  await page.evaluate(()=>{const N=PFNumbers,host=document.getElementById('numeric-regression'),old=N.capture(host);N.decorate(host,'signed');N.apply(host,old);});assert.equal(await page.locator('#numeric-regression .pf-number-changing').count(),0,'equal values stay still');
  await page.evaluate(()=>{const N=PFNumbers,host=document.getElementById('numeric-regression');host.textContent='—';N.decorate(host,'signed');const old=N.capture(host);host.textContent='$50';N.decorate(host,'signed');N.apply(host,old);});assert.equal(await page.locator('#numeric-regression .pf-number-changing').count(),0,'unknown values never become fabricated zeroes');
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{__PFW_TEST__.dealApplyDriver('Sale_Price_FF',1800);__PFW_TEST__.dealApplyDriver('Engineering_Length_Months',6);});assert.equal(await page.locator('.pf-number-changing').count(),0,'reduced motion is immediate');await peakView();await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(async context=>{window.__transferContext=context;await PFBudgetTransferUI.open({id:'pf-transfer',name:'Cedar Hollow',canSend:()=>true,getProjects:async()=>[{ID:'project-1',Project_Name:'Cedar',Proforma:'pf-transfer'}],capabilities:async()=>3,loadContext:async()=>structuredClone(context),preview:async()=>({plan:PFBudgetTransfer.build(context,{1:'s1',2:'s2',3:'s3',4:'s4'}),token:'fixture'}),apply:()=>{throw Error('Fixture must never send');}});},transferFixture());await settled();
  const lots=page.locator('.pfbt [data-metric="Lot_Total_Residential"]');await typeValue(lots,'60');
  assert.ok(await page.locator('.pfbt .pf-number-changing').count()>0);assert.equal(await page.locator('.number-edit-pending').count(),0);assert.equal(await lots.inputValue(),'60');await unique('.pfbt');
  await page.screenshot({path:path.join(output,'budget-transfer.png')});
  assert.deepEqual(errors,[],'actual renderers have no browser/presentation errors');
  console.log('PASS: desktop PF numbers: text parity, native repeated subform typing/precision, held complete text/sign color/unknown/layout, live totals, read-only values, phase identity, monthly/scenario updates, signed rapid values, record scope, reduced motion and Budget transfer.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
