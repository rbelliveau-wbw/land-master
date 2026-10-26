// The complete mounted Tax progress component in a real desktop browser.
// Fixture ledgers only: no Creator SDK, requests or business writes are loaded.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {source,readTaxScript,appRoot} from './fixtures/tax-source.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const bulkFields=source.match(/var BULK_EDIT_FIELDS = \[[\s\S]*?\n\];/)[0];
const appFiles=new Set(fs.readdirSync(appRoot));
const html='<!doctype html><meta charset="utf-8"><style>body{margin:0;font:14px system-ui}main{padding:24px}button{font:inherit}</style><main id="toolbar"><button id="open">Save changes</button></main><script>window.LMRuntime={current:()=>({user:"fixture",environment:"DEVELOPMENT"})};'+bulkFields+'</script><script src="/tax-progress.js"></script><script src="/interaction-motion.js"></script><link rel="stylesheet" href="/interaction-motion.css">';
const server=http.createServer((req,res)=>{
 const name=new URL(req.url,'http://fixture.test').pathname.slice(1);
 if(name==='full-widget'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(source);}
 else if(name==='embedded-widget'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><style>html,body{margin:0;height:100%;overflow:hidden}iframe{display:block;border:0;width:1280px;height:1800px}</style><iframe src="/full-widget"></iframe>');}
 else if(appFiles.has(name)){res.setHeader('Content-Type',name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html; charset=utf-8':'text/javascript');res.end(readTaxScript(name));}
 else if(['interaction-motion.js','interaction-motion.css'].includes(name)){res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':'text/css');res.end(fs.readFileSync('shared/'+name));}
 else {res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,channel:'chrome',ignoreDefaultArgs:['--hide-scrollbars']});
const page=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const output=path.resolve('tmp/tax-progress-preview');fs.mkdirSync(output,{recursive:true});
async function embeddedFocusRegression(){
 const measurements={};
 for(const previous of [true,false]){
  const host=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'});
  host.on('pageerror',error=>errors.push(error.message));
  await host.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(previous&&url.pathname==='/tax-progress.js')return route.fulfill({status:200,contentType:'text/javascript',body:fs.readFileSync('releases/tax-center/19.17.30/tax-progress.js','utf8')});
   return url.hostname==='127.0.0.1'?route.continue():route.fulfill({status:200,contentType:'text/javascript',body:''});
  });
  await host.addInitScript(()=>{window.ZOHO={CREATOR:{UTIL:{getInitParams:async()=>({envUrlFragment:'/environment/development',loginUser:'fixture'}),setIframeHeight(){}},DATA:{getRecordCount:async()=>({code:3000,result:{records_count:'0'}}),getRecords:async()=>({code:3000,data:[]})}}};});
  try{
   await host.goto('http://127.0.0.1:'+server.address().port+'/embedded-widget');const frame=host.frames().find(frame=>frame.url().endsWith('/full-widget'));
   await frame.evaluate(()=>__taxBoot);
   const before=await host.evaluate(()=>({top:scrollY,htmlTop:document.documentElement.scrollTop,bodyTop:document.body.scrollTop}));
   await frame.evaluate(()=>TaxUI.open({id:'iframe-focus-fixture',report:'All_Tax_Parcel_Years',stage:'sending',finished:false,rows:Array.from({length:135},(_,index)=>({id:String(90071992547410000n+BigInt(index)),state:'not-sent',phase:'not-sent',payload:{Arbitration_Notice_Received:''}}))}));
   const after=await host.evaluate(()=>({top:scrollY,htmlTop:document.documentElement.scrollTop,bodyTop:document.body.scrollTop})),dialogTop=await frame.locator('#taxSaveDialog').evaluate(node=>node.getBoundingClientRect().top);
   measurements[previous?'previous':'updated']={before,after,dialogTop};
   if(previous)assert.ok(dialogTop>500,'the previous centered shell sits low in a tall Creator-style iframe');else{assert.equal(dialogTop,32);assert.deepEqual(after,before,'the updated focus does not scroll an overflow-hidden embedding page');}
   await host.screenshot({path:path.join(output,previous?'embedded-previous.png':'embedded-updated.png')});
  }finally{await host.close();}
 }
 fs.writeFileSync(path.join(output,'focus-regression.json'),JSON.stringify(measurements,null,2));
 console.log('Tall-iframe focus evidence: '+JSON.stringify(measurements));
}
async function wholeWidgetIntegration(){
 const meta=form=>JSON.parse(fs.readFileSync('creator/generated/fields/'+form+'.json','utf8')).fields;
 const blank=fields=>Object.fromEntries(fields.map(field=>[field.link_name,field.type==='checkbox'?false:field.type==='list'?[]:field.type==='USD'||/^(decimal|number|percentage)$/.test(field.type)?'100':'']));
 const allIds=Array.from({length:135},(_,index)=>String(90071992547409941n+BigInt(index))),ids=allIds.slice(0,2);
 const fixture={All_Tax_Parcel_Years:allIds.map((ID,index)=>({...blank(meta('Tax_Parcel_Year')),ID,Tax_Parcel_Year_Code:'Fixture-'+index,Property_ID:'000073',Tax_Year:'2026',Status:'Awaiting Assessment',Market_Value:'100',Assessed_Value:'50',County:'Fixture',Archived:false,Arbitration_Notice_Received:'28-Sep-2026',Company1:'',Property1:'',Arbitrate1:''})),All_Property:[{...blank(meta('Property')),ID:'90071992547420000',Common_Name:'Fixture property',Property_ID:'000073',Land_Type:'Raw Land Holdings',County:'Fixture',Company1:'',Projects:[],Acres:'100',Ag_Exempt:false,Deed_to_HOA:false,Insured:false}],All_Companies:[],All_Subdivisions:[],All_Taxing_Jurisdictions:[],All_Projects:[]};
 const app=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'});
 app.on('pageerror',error=>errors.push(error.message));
 // The full widget loads unchanged. All outside-network script loads are inert;
 // only this local native-shaped fixture can read or change synthetic records.
 await app.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.fulfill({status:200,contentType:'text/javascript',body:''}));
 await app.addInitScript(storage=>{
  const clone=value=>JSON.parse(JSON.stringify(value)),calls=[],selected=config=>{const rows=storage[config.report_name]||[],criteria=String(config.criteria||''),ids=Array.from(criteria.matchAll(/\(ID == (\d+)\)/g),match=>match[1]);return ids.length?rows.filter(row=>ids.includes(row.ID)):rows;};
  const state=window.__taxFixture={storage,calls,mode:'success',release:null,writes:0};
  window.ZOHO={CREATOR:{UTIL:{getInitParams:async()=>({envUrlFragment:'/environment/development',loginUser:'fixture'}),setIframeHeight(){}},DATA:{
   getRecordCount:async config=>{calls.push({kind:'count',config:clone(config)});return {code:3000,result:{records_count:String(selected(config).length)}};},
   getRecords:async config=>{calls.push({kind:'records',config:clone(config)});return {code:3000,data:clone(selected(config))};},
   updateRecords:config=>new Promise(resolve=>{calls.push({kind:'batch',config:clone(config)});state.writes++;state.release=()=>{state.release=null;if(state.mode==='rejected'){resolve({code:2897,message:'Fixture update permission denied.'});return;}const ids=Array.from(config.payload.criteria.matchAll(/\(ID == (\d+)\)/g),match=>match[1]);ids.forEach(id=>Object.assign(storage[config.report_name].find(row=>row.ID===id),clone(config.payload.data)));resolve({code:3000,result:ids.map(ID=>({code:3000,data:{ID}}))});};}),
   invokeCustomApi:async()=>({code:3000,details:{output:JSON.stringify({success:true})}})
  }}};
 },fixture);
 try{
  await app.goto('http://127.0.0.1:'+server.address().port+'/full-widget');
  assert.equal(await app.evaluate(async()=>{const ready=await __taxBoot;return ready.published;}),true);
  await app.locator('#companyFacetPill').click();await app.locator('#countyFacetPill').click();await app.evaluate(()=>{closeFacetDropdown('county');setYear('2025');setYear('2026');});await app.waitForTimeout(500);
  assert.equal(await app.evaluate(()=>__taxFixture.calls.filter(call=>call.config.report_name==='All_Tax_Parcel_Years').length),0,'startup, filter changes and dropdown opens make no parcel row or count calls');
  assert.equal(await app.evaluate(async()=>{const result=await runParcelSearch();return result.published;}),true);
  assert.deepEqual(await app.evaluate(()=>__taxFixture.calls.filter(call=>call.config.report_name==='All_Tax_Parcel_Years').slice(0,3).map(call=>call.kind)),['count','records','count'],'explicit Search completes its mandatory bounded scope before background headline/facet counts');
  const tableTop=()=>app.locator('#tableWrap').evaluate(node=>node.getBoundingClientRect().top),initialTop=await tableTop();
  await app.evaluate(id=>toggleBulkRow(id,true),ids[0]);assert.equal(await tableTop(),initialTop,'one selection leaves the table header fixed');
  await app.evaluate(()=>selectAllVisible());assert.equal(await app.locator('#fbulkCount').textContent(),'135 selected');assert.equal(await tableTop(),initialTop,'135 selections leave the table header fixed');
  await app.evaluate(()=>clearBulkSelection());assert.equal(await tableTop(),initialTop,'clearing the action row leaves the table header fixed');assert.equal(await app.evaluate(()=>__taxFixture.writes),0);
  await app.evaluate(()=>switchTab('properties'));assert.equal(await app.locator('#reportControls').isVisible(),false);await app.evaluate(()=>switchTab('parcels'));assert.equal(await app.locator('#reportControls').isVisible(),true);
  await app.setViewportSize({width:3400,height:900});await app.evaluate(()=>selectAllVisible());
  const wide=await app.evaluate(()=>{const controls=document.getElementById('reportControls').getBoundingClientRect(),pager=document.getElementById('topPager').getBoundingClientRect();return {controls:controls.x+controls.width/2,pager:pager.x+pager.width/2};});
  assert.ok(Math.abs(wide.controls-wide.pager)<2,'pagination remains centered across the wide report');await app.setViewportSize({width:1280,height:800});await app.evaluate(()=>clearBulkSelection());
  async function selectAndOpen(){
   await app.evaluate(ids=>{state.bulkSelectedIds=Object.fromEntries(ids.map(id=>[id,true]));renderAll();},ids);
   await app.locator('#bulkEditBtn').click();assert.equal(await app.locator('#bulkEditOverlay').isVisible(),true);
   await app.locator('.be-toggle[data-key="arbNoticeReceived"]').check();
   await app.locator('.be-input[data-key="arbNoticeReceived"]').fill('');
  }
  await selectAndOpen();
  const scrollBefore=await app.evaluate(()=>{const table=document.getElementById('tableWrap');table.scrollTop=500;table.scrollLeft=70;return {tableTop:table.scrollTop,tableLeft:table.scrollLeft,htmlTop:document.documentElement.scrollTop,bodyTop:document.body.scrollTop,htmlStyle:document.documentElement.style.overflow,bodyStyle:document.body.style.overflow,htmlOverflow:getComputedStyle(document.documentElement).overflow,bodyOverflow:getComputedStyle(document.body).overflow};});
  assert.ok(scrollBefore.tableTop>0,'the actual report begins at a scrolled position');await app.locator('#bulkEditApplyBtn').click();
  await app.waitForFunction(()=>__taxFixture.release!==null);
  assert.equal(await app.locator('#bulkEditOverlay').isVisible(),false,'committing captured bulk changes closes the editor');
  assert.equal(await app.locator('#taxSaveOverlay').isVisible(),true);
  assert.equal(await app.locator('.modal-overlay:not(.hidden):visible').count(),0,'the save progress is the only visible backdrop');
  assert.equal(await app.locator('#reportControls').evaluate(node=>node.inert),true,'the moved report action row remains locked');
  assert.equal(await app.locator('#taxSaveClose').isDisabled(),true);await app.keyboard.press('Escape');assert.equal(await app.locator('#taxSaveOverlay').isVisible(),true);
  assert.equal(await app.locator('#taxSaveDialog').evaluate(node=>Math.round(node.getBoundingClientRect().top)),32);
  await app.screenshot({path:path.join(output,'full-widget-pending.png')});
  await app.evaluate(()=>__taxFixture.release());await app.waitForFunction(()=>TaxUI.progress().displayDone&&!state.bulkSaving);
  assert.equal(await app.locator('#taxSaveClose').textContent(),'Done');assert.equal(await app.locator('#bulkEditOverlay').isVisible(),false);
  await app.locator('#taxSaveClose').click();assert.equal(await app.locator('#runSearchBtn').evaluate(node=>node===document.activeElement),true,'successful selection clearing restores focus to the visible report action');
  assert.equal(await app.locator('#bulkEditOverlay').isVisible(),false,'dismissing success never reopens the old editor');assert.equal(await app.evaluate(()=>__taxFixture.writes),1);
  const scrollAfter=await app.evaluate(()=>{const table=document.getElementById('tableWrap');return {tableTop:table.scrollTop,tableLeft:table.scrollLeft,htmlTop:document.documentElement.scrollTop,bodyTop:document.body.scrollTop,htmlStyle:document.documentElement.style.overflow,bodyStyle:document.body.style.overflow,htmlOverflow:getComputedStyle(document.documentElement).overflow,bodyOverflow:getComputedStyle(document.body).overflow};});
  assert.deepEqual(scrollAfter,scrollBefore,'save and dismissal preserve report position and intentional root overflow styles');
  assert.equal(await app.locator('#reportControls').evaluate(node=>node.inert),false);assert.equal(await app.locator('#tableWrap').evaluate(node=>node.inert),false);assert.equal(await app.locator('body>[inert]').count(),0,'background inert state is fully restored');
  const tablePoint=await app.locator('#tableWrap').evaluate(node=>{const r=node.getBoundingClientRect();return {x:r.x+100,y:r.y+100};});await app.mouse.move(tablePoint.x,tablePoint.y);await app.mouse.wheel(0,-1000);await app.waitForFunction(()=>document.getElementById('tableWrap').scrollTop===0);
  assert.equal(await app.locator('#taxSaveOverlay').isVisible(),false,'no invisible save backdrop intercepts scrolling');
  await selectAndOpen();await app.evaluate(()=>__taxFixture.mode='rejected');await app.locator('#bulkEditApplyBtn').click();await app.waitForFunction(()=>__taxFixture.release!==null);
  assert.equal(await app.locator('#bulkEditOverlay').isVisible(),false);await app.evaluate(()=>__taxFixture.release());await app.waitForFunction(()=>TaxUI.progress().displayDone);
  assert.equal(await app.locator('#taxSaveTitle').textContent(),'Changes need review');assert.match(await app.locator('#taxSaveResults small').first().textContent(),/Fixture update permission denied/);
  await app.locator('#taxSaveClose').click();assert.equal(await app.locator('#bulkEditBtn').evaluate(node=>node===document.activeElement),true,'retained rejected selections restore focus to the visible Bulk Edit opener');
  assert.equal(await app.locator('#bulkEditOverlay').isVisible(),false);assert.equal(await app.evaluate(()=>__taxFixture.writes),2,'closing or reviewing never replays a write');
 }finally{await app.close();}
}
async function open(count=135){
 await page.evaluate(count=>{
  window.ledger={id:'fixture-'+count,report:'All_Tax_Parcel_Years',stage:'sending',finished:false,error:null,rows:Array.from({length:count},(_,index)=>({id:String(90071992547410000n+BigInt(index)),state:index<9?'verified':'not-sent',phase:index<9?'verified':index===9?'verifying':index===10?'sending':'not-sent',payload:{Arbitration_Notice_Received:''}}))};
  if(!window.ui)window.ui=LMTaxUIPreparation.create({label:(_,id)=>'Parcel '+id.slice(-6)+'-2026',close:()=>true,recheck:()=>window.rechecks++,pending:()=>false});
  window.rechecks=0;document.getElementById('open').focus();ui.open(ledger);
  window.firstResult=document.querySelector('#taxSaveResults li');
  window.motion=LMMotion.start({module:'tax-progress-fixture',ready:()=>true,actor:()=>LMRuntime.current().user,surfaces:[{selector:'#taxSaveDialog'}],meters:['#taxSaveBarFill']});
 },count);
}
async function geometry(viewportHeight){
 const value=await page.evaluate(()=>{
  const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};};
  const area=document.getElementById('taxSaveResultArea'),body=document.querySelector('.tax-save-body');
  return {dialog:rect('taxSaveDialog'),area:rect('taxSaveResultArea'),bar:rect('taxSaveBar'),close:rect('taxSaveClose'),header:document.querySelector('.tax-save-header').getBoundingClientRect().y,footer:document.querySelector('.tax-save-footer').getBoundingClientRect().y,bodyOverflow:getComputedStyle(body).overflow,areaScrollHeight:area.scrollHeight,areaHeight:area.clientHeight,pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight};
 });
 assert.equal(value.dialog.width,540,'the compact shell uses the existing 540px design rule');
 assert.ok(value.dialog.height<=Math.min(620,viewportHeight-48)+1,'the complete dialog stays within its desktop viewport');
 assert.ok(value.dialog.y>=31&&value.dialog.y<=33&&value.dialog.bottom<=viewportHeight-15,'the shell stays high in the widget with its footer inside the viewport');
 assert.ok(value.areaHeight>30&&value.areaScrollHeight>value.areaHeight,'only the results need an internal scrollbar');
 assert.equal(value.bodyOverflow,'hidden','summary and stages never become the body scroller');
 assert.ok(value.close.y>=value.dialog.y&&value.close.bottom<=value.dialog.bottom,'the footer action remains inside the shell');
 assert.ok(value.bar.y>value.header&&value.bar.bottom<value.area.y,'the truthful summary stays above the result scroller');
 assert.equal(value.pageWidth,1280);assert.equal(value.pageHeight,viewportHeight,'the modal creates no page overflow');
 await page.evaluate(()=>document.getElementById('taxSaveResultArea').scrollTop=99999);
 const after=await page.evaluate(()=>({header:document.querySelector('.tax-save-header').getBoundingClientRect().y,footer:document.querySelector('.tax-save-footer').getBoundingClientRect().y,scroll:document.getElementById('taxSaveResultArea').scrollTop}));
 assert.ok(after.scroll>0);assert.equal(after.header,value.header);assert.equal(after.footer,value.footer,'scrolling results keeps header and footer pinned');
 await page.evaluate(()=>document.getElementById('taxSaveResultArea').scrollTop=0);
 return value;
}
try{
 await page.goto('http://127.0.0.1:'+server.address().port);await open();
 assert.equal(await page.locator('#taxSaveTitle').textContent(),'Saving changes');
 assert.equal(await page.locator('#taxSaveContext').textContent(),'135 selected records');
 assert.equal(await page.locator('#taxSaveCount').textContent(),'9 of 135 records saved');
 assert.deepEqual(await page.locator('.tax-save-stage strong').allTextContents(),['Checking records','Saving changes','Confirming updates']);
 assert.equal(await page.locator('#taxSaveResults small').first().textContent(),'ARB Notice Received');
 assert.deepEqual(await page.locator('#taxSaveResults li b').allTextContents().then(rows=>rows.slice(8,12)),['Saved','Checking…','Saving…','Waiting']);
 assert.doesNotMatch(await page.locator('#taxSaveDialog').textContent(),/All_Tax_Parcel_Years|Arbitration_Notice_Received|persisted|destination|Creator|Captured/);
 assert.equal(await page.locator('#taxSaveBar').getAttribute('aria-valuenow'),'9');
 assert.equal(await page.locator('#taxSaveStageChip1').textContent(),'Running');assert.equal(await page.locator('#taxSaveStageChip2').textContent(),'Up next','an acknowledged group does not mark all remaining sends complete');
 assert.equal(await page.locator('#taxSaveClose').isDisabled(),true);assert.equal(await page.locator('#taxSaveX').isDisabled(),true);
 assert.equal(await page.locator('#toolbar').evaluate(node=>node.inert),true);
 await page.keyboard.press('Escape');assert.equal(await page.locator('#taxSaveOverlay').isVisible(),true,'Escape cannot dismiss active work');
 await geometry(800);await page.screenshot({path:path.join(output,'desktop-pending.png')});
 await page.setViewportSize({width:1280,height:480});await geometry(480);await page.screenshot({path:path.join(output,'short-desktop-pending.png')});
 await page.evaluate(async()=>{ledger.rows.forEach(row=>{row.state='verified';row.phase='verified';});ledger.stage='verifying';ledger.finished=true;await ui.finish(ledger);});
 assert.equal(await page.locator('#taxSaveTitle').textContent(),'Changes saved');assert.equal(await page.locator('#taxSaveCount').textContent(),'135 of 135 records saved');
 assert.equal(await page.locator('#taxSaveClose').textContent(),'Done');assert.equal(await page.locator('#taxSaveClose').isDisabled(),false);
 assert.equal(await page.evaluate(()=>firstResult===document.querySelector('#taxSaveResults li')),true,'updates patch the original mounted result rows');
 assert.equal(await page.locator('#taxSaveOverlay').isVisible(),true,'terminal results remain until dismissed');await geometry(480);
 await page.locator('#taxSaveClose').click();assert.equal(await page.locator('#taxSaveOverlay').isVisible(),false);assert.equal(await page.locator('#open').evaluate(node=>node===document.activeElement),true);assert.equal(await page.locator('#toolbar').evaluate(node=>node.inert),false);
 await page.setViewportSize({width:1280,height:800});await open(32);
 await page.evaluate(async()=>{ledger.rows[9].state='unknown';ledger.rows[9].phase='unknown';ledger.rows[9].message='Creator 2955: minute API limit reached.';ledger.rows[10].state='rejected';ledger.rows[10].phase='rejected';ledger.error='Creator 2955: minute API limit reached. '+Array(40).fill('Actual diagnostic detail retained.').join(' ');ledger.finished=true;await ui.finish(ledger);});
 assert.equal(await page.locator('#taxSaveCount').textContent(),'9 of 32 records saved');assert.equal(await page.locator('#taxSaveClose').textContent(),'Close');assert.equal(await page.locator('#taxSaveRecheck').isVisible(),true);
 assert.equal(await page.locator('#taxSaveResults li').nth(9).locator('b').textContent(),'Needs review');assert.equal(await page.locator('#taxSaveResults li').nth(10).locator('b').textContent(),'Not saved');assert.equal(await page.locator('#taxSaveResults li').nth(11).locator('b').textContent(),'Not saved');
 assert.match(await page.locator('#taxSaveError').textContent(),/Creator 2955/);await geometry(800);
 await page.locator('#taxSaveRecheck').focus();await page.keyboard.press('Tab');assert.equal(await page.locator('#taxSaveClose').evaluate(node=>node===document.activeElement),true);await page.keyboard.press('Tab');assert.equal(await page.locator('#taxSaveX').evaluate(node=>node===document.activeElement),true,'terminal focus remains trapped');
 await page.locator('#taxSaveRecheck').click();assert.equal(await page.evaluate(()=>rechecks),1);await page.screenshot({path:path.join(output,'desktop-review.png')});
 await page.keyboard.press('Escape');assert.equal(await page.locator('#taxSaveOverlay').isVisible(),false);
 await page.emulateMedia({reducedMotion:'no-preference'});await open(32);
 await page.evaluate(async()=>{ledger.rows.forEach(row=>{row.state='verified';row.phase='verified';});ledger.stage='verifying';ledger.finished=true;window.settlement=ui.finish(ledger);});
 assert.equal(await page.locator('#taxSaveBar').getAttribute('aria-valuenow'),'32','display pacing never invents a different confirmed count');
 assert.equal(await page.locator('#taxSaveClose').isDisabled(),true,'normal display settlement retains its existing close lock');
 await page.waitForFunction(()=>ui.progress().displayDone);assert.equal(await page.locator('#taxSaveClose').isDisabled(),false);
 await wholeWidgetIntegration();
 await embeddedFocusRegression();
 assert.deepEqual(errors,[]);
 console.log('PASS compact Tax progress: top-aligned 135/32-row desktop geometry, pinned summary/stages/actions, internal results scrolling, human copy, confirmed counts, reduced motion; whole-widget bulk commit hides its editor, keeps one backdrop and locks the report controls, retains errors, restores visible success/rejection focus and never replays writes.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
