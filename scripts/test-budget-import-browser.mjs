// Complete shipped desktop document and actual handlers; native responses stay local to this fixture.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let playwright;
try{playwright=require('playwright');}catch{playwright=createRequire(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'))('playwright');}
const {chromium}=playwright,base=path.resolve('widgets/budget-manager/src/app'),output=path.resolve('tmp/budget-import-browser');
fs.mkdirSync(output,{recursive:true});
const inject=`
window.__IMPORT_TEST__={S,CFG,boot,renderImports,scheduleBudgetBadgeSummaries,openImportsTab,importFilteredSorted,importHasDifferentCode,assignImportItem};
fetchCurrentUser=async function(){S.currentUser='native-desktop-fixture';return S.currentUser;};
loadUserAccess=async function(){S.perms=window.__fixturePerms;};
`;
const server=http.createServer((req,res)=>{
  const file=new URL(req.url,'http://localhost').pathname.slice(1)||'widget.html',filename=path.resolve(base,file);
  if(!filename.startsWith(base+path.sep)||!fs.existsSync(filename)){res.writeHead(404).end();return;}
  let body=fs.readFileSync(filename);
  if(file==='widget.html')body=body.toString().replace(/\/\* Creator injects[\s\S]*?(?=\/\* Repository design:)/,inject);
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(body);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:1540,height:1000}}),errors=[];
page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));
await page.route(/.*/,route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.fulfill({body:'',contentType:'text/javascript'}));
const url='http://127.0.0.1:'+server.address().port;
const IDs={item:'4410926000009999001',drain:'4410926000009999002',cross:'4410926000009999003',utility:'4410926000009999004'};
const rowId=index=>'44109260000099999'+String(index).padStart(2,'0');
const items=[{ID:IDs.item,Budget_Code:'653-0100',Item_Name:'Earthwork',Subdivision_Code:'653'},
  {ID:IDs.drain,Budget_Code:'653-0200',Item_Name:'Drainage',Subdivision_Code:'653'},
  {ID:IDs.cross,Budget_Code:'654-0100',Item_Name:'Adjacent phase',Subdivision_Code:'654'},
  {ID:IDs.utility,Budget_Code:'653-0300',Item_Name:'Utilities',Subdivision_Code:'653'}];
function row(index,minor,source,budgetItem,description){return {ID:rowId(index),Code:'653-'+(source==='HeavyJob'?'HJ':'GP')+'-'+minor,Cost_Code_Description:description,
  Subdivision_Code:'653',Subdivision_Name:'Alta Vista',Minor_Code:minor,Major_Code:'1000',Data_Source:source,Cost_to_Complete:'12000',Budget_Item:budgetItem};}
const rows=[row(1,'0100','HeavyJob',{ID:IDs.drain,display_value:'653-0200 - Drainage'},'HJ earthwork adjustment'),
  row(2,'0300','Great Plains',{ID:IDs.item,display_value:'653-0100 — Earthwork'},'GP utility adjustment'),
  row(3,'0100','HeavyJob',{ID:IDs.item,display_value:'653-0100 - Earthwork'},'HJ matched earthwork'),
  row(4,'0200','Great Plains',{ID:IDs.drain,display_value:'653-0200 — Drainage'},'GP matched drainage'),
  row(5,'0100','Great Plains',{ID:IDs.cross,display_value:'654-0100 - Adjacent phase'},'GP cross subdivision adjustment'),
  row(6,'0100','HeavyJob',null,'Unassigned earthwork'),row(7,'0200','Great Plains',{},'Unassigned drainage'),
  row(8,'0100','HeavyJob',{ID:IDs.item},'HJ ID-only matched earthwork')];
async function start(edit){
  await page.goto(url);await page.waitForFunction(()=>window.__IMPORT_TEST__&&window.LMData);
  await page.evaluate(({rows,items,edit})=>{
    const T=__IMPORT_TEST__,S=T.S;S.liveSDK=true;S.useMock=false;S.sdkInitFailed=false;
    window.__fixturePerms={viewImports:true,editImports:edit,readOnly:!edit};window.__nativeCalls=[];window.__fixtureWrites=[];
    const data=Object.fromEntries(Object.values(T.CFG.reports).map(report=>[report,[]]));
    data[T.CFG.reports.importItems]=rows;data[T.CFG.reports.items]=items;
    window.__importsGate=new Promise(resolve=>window.__releaseImports=resolve);
    function records(config){return data[config.report_name]||[];}
    window.ZOHO={CREATOR:{DATA:{
      async getRecordCount(config){__nativeCalls.push({kind:'count',config});if(config.report_name===T.CFG.reports.importItems)await __importsGate;return {code:3000,result:{records_count:String(records(config).length)}};},
      async getRecords(config){__nativeCalls.push({kind:'read',config});const native=records(config),fields=config.fields?.split(',');
        return {code:3000,data:structuredClone(fields?native.map(row=>Object.fromEntries(fields.map(field=>[field,row[field]]))):native)};},
      async updateRecordById(config){__fixtureWrites.push(structuredClone(config));const rec=data[T.CFG.reports.importItems].find(row=>row.ID===config.id);
        if(!rec)throw Error('Fixture update destination does not exist');rec.Budget_Item={ID:config.payload.data.Budget_Item};return {code:3000,data:{ID:config.id}};}
    }}};
    window.__fixtureBoot=T.boot();
  },{rows,items,edit});
  await page.waitForFunction(()=>__IMPORT_TEST__.S.startupReady);
  assert.equal(await page.locator('#importCt').textContent(),'…');assert.equal(await page.locator('#vBudgets').isVisible(),true);
  assert.equal(await page.evaluate(()=>__nativeCalls.some(call=>call.config.report_name===__IMPORT_TEST__.CFG.reports.items)),false,'background count never reads assignment choices');
  await page.evaluate(()=>__releaseImports());await page.waitForFunction(()=>document.getElementById('importCt').textContent==='2');
  assert.equal(await page.locator('#vImports').isVisible(),false,'background count appears before opening the import tab');
  await page.locator('#importsTabLink').click();await page.waitForFunction(()=>document.querySelectorAll('[data-imp-id]').length===8);
}
async function rowIds(){return await page.locator('[data-imp-id]').evaluateAll(nodes=>nodes.map(node=>node.dataset.impId).sort());}
async function expectRows(expected,message){await page.waitForFunction(expected=>{
  const actual=Array.from(document.querySelectorAll('[data-imp-id]'),node=>node.dataset.impId).sort();return JSON.stringify(actual)===JSON.stringify(expected.slice().sort());
},expected);assert.deepEqual(await rowIds(),expected.slice().sort(),message);}
async function screenshot(width,name){
  await page.waitForFunction(()=>document.getElementById('lmSuccessToast')?.hidden!==false);
  await page.setViewportSize({width,height:1000});await page.waitForTimeout(500);
  const geometry=await page.evaluate(()=>{
    const toolbar=document.querySelector('.imports-toolbar'),controls=[...toolbar.querySelectorAll('input,select,button')],rect=toolbar.getBoundingClientRect();
    return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,toolbar:{left:rect.left,right:rect.right},
      controls:controls.map(node=>{const r=node.getBoundingClientRect();return {id:node.id,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width};})};
  });
  assert.ok(geometry.scrollWidth<=width+1,'desktop page has no horizontal overflow');
  for(const control of geometry.controls){assert.ok(control.width>0,control.id+' remains visible');assert.ok(control.left>=-1&&control.right<=width+1,control.id+' stays inside viewport');}
  await page.screenshot({path:path.join(output,name+'-'+width+'.png')});return geometry;
}
try{
  // View-only use exercises native label parsing and the deferred ID/Budget_Code projection.
  await start(false);
  assert.equal(await page.locator('.imp-combo-input,[data-imp-change]').count(),0,'view-only screen has no assignment controls');
  await page.locator('#importFilterDifferent').click();await expectRows([rowId(1),rowId(2),rowId(5)],'Different code uses native Subdivision_Code-Minor_Code across HJ and GP');
  assert.equal(await page.locator('#importFilterDifferent').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#importFilterMissing').getAttribute('aria-pressed'),'false');
  const projection=await page.evaluate(()=>__nativeCalls.filter(call=>call.kind==='read'&&call.config.report_name===__IMPORT_TEST__.CFG.reports.items));
  assert.equal(projection.length,1);assert.equal(projection[0].config.field_config,'custom');assert.equal(projection[0].config.fields,'ID,Budget_Code');
  assert.equal(await page.locator('#importCt').textContent(),'2','different-code filter does not replace the missing count');
  await page.locator('#importSource').selectOption('Great Plains');await expectRows([rowId(2),rowId(5)],'source intersects Different code');
  await page.locator('#importSearch').fill('utility');await expectRows([rowId(2)],'search intersects source and Different code');
  await page.locator('#importSearch').fill('');await page.locator('#importSource').selectOption('');await expectRows([rowId(1),rowId(2),rowId(5)]);
  await page.locator('#importFilterMissing').click();await expectRows([rowId(6),rowId(7)],'Missing and Different code are mutually exclusive');
  assert.equal(await page.locator('#importFilterDifferent').getAttribute('aria-pressed'),'false');assert.equal(await page.locator('#importFilterMissing').getAttribute('aria-pressed'),'true');
  await page.locator('#importFilterDifferent').click();await expectRows([rowId(1),rowId(2),rowId(5)]);
  const geometry=[];geometry.push(await screenshot(1540,'view-only-different-code'));geometry.push(await screenshot(1366,'view-only-different-code'));
  // Edit use exercises the actual combobox events and SDK acknowledgement, backed only by local fixture responses.
  await start(true);await page.locator('#importFilterDifferent').click();await expectRows([rowId(1),rowId(2),rowId(5)]);
  await page.locator('[data-imp-change="'+rowId(1)+'"]').click();await page.locator('[data-imp-combo-input="'+rowId(1)+'"]').click();
  await page.locator('[data-imp-pick="'+IDs.item+'"][data-imp-pick-row="'+rowId(1)+'"]').click();
  await expectRows([rowId(2),rowId(5)],'successful reassignment removes a corrected row from Different code');
  assert.equal(await page.locator('#importCt').textContent(),'2');
  await page.locator('#importFilterMissing').click();await expectRows([rowId(6),rowId(7)]);
  await page.locator('[data-imp-combo-input="'+rowId(6)+'"]').click();await page.locator('[data-imp-pick="'+IDs.item+'"][data-imp-pick-row="'+rowId(6)+'"]').click();
  await expectRows([rowId(7)],'successful missing-row assignment removes the row from Missing');
  await page.waitForFunction(()=>document.getElementById('importCt').textContent==='1');assert.equal(await page.locator('#importMissingCt').textContent(),'1');
  assert.equal(await page.evaluate(()=>__fixtureWrites.length),2);assert.equal(await page.evaluate(()=>__fixtureWrites.every(write=>write.report_name==='All_Budget_Item_Imports'&&typeof write.id==='string'&&typeof write.payload.data.Budget_Item==='string')),true);
  await page.locator('#importFilterDifferent').click();await expectRows([rowId(2),rowId(5)]);geometry.push(await screenshot(1366,'edit-after-assignment'));
  assert.deepEqual(errors,[],'actual desktop import screen and handlers have no browser errors');
  fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify({mode:'offline native-shaped fixture; no live Creator requests',widths:[1540,1366],fixtureRows:rows.length,initialMissing:2,initialDifferent:3,afterAssignments:{missing:1,different:2},geometry},null,2));
  console.log('PASS desktop imports: background missing badge before tab; actual Different code/Missing events, HJ/GP native code and label forms, ID-only code projection, view-only access, source/search intersections, local acknowledged reassignment, 1540/1366 geometry and screenshots. No live Creator requests or writes.');
}catch(error){console.error('Browser errors:',errors);await page.screenshot({path:path.join(output,'failure.png')});throw error;}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
