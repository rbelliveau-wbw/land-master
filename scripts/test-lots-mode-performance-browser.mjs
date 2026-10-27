// Real DOM with inert Creator responses. No live Creator writes.
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const source=path.resolve(process.env.LM_LOTS_APP||'widgets/manage-lots/src/app'),out=path.resolve('tmp/lots-mode-performance');fs.mkdirSync(out,{recursive:true});
const SID='90071992547409931',BUILDER='90071992547409961',TD='90071992547409981';
const lots=Array.from({length:312},(_,i)=>({ID:'9007199254741'+String(i).padStart(4,'0'),Subdivision:{ID:SID},Block:String(1+Math.floor(i/78)),Lot_Number:String(i%78+1),Lot_Code:'RS01-B'+(i<6?'01':'0A')+'-L'+String(i%6+1).padStart(2,'0'),Status:i===1?'Sold':i===8?'Scheduled':'Open',Archived:false,Add_Builder_Takedown_Name:i===1?{ID:TD}:{},Lot_Size:45,Builder1:null,On_Hold:false,Base_Price:'80000.25',Earnest_Money:'8000',Additional_Tax:'0',Appraised_Value:'80000',Address:'120'+i+' Oak Lane',Entered_Date:'07-Oct-2026',Purchase_Date:'15-Oct-2026',Close_Date:i===1?'30-Oct-2026':'',Notes:i===0?'Existing note':''}));
const fixture={All_Subdivisions:[{ID:SID,Subdivision_Name:'Rancho San Gabriel — Phase 1',Subdivision_Code:'RS01'}],All_Builders:[{ID:BUILDER,Builder_Name:'DR Horton',Type1:'Builder'},{ID:'90071992547409962',Builder_Name:'Acme Homes',Type1:'Builder'},{ID:'90071992547409963',Builder_Name:'Seller Only',Type1:'Seller'}],All_Builder_Takedowns:[{ID:TD,Name:'October closing',Subdivision1:{ID:SID},Builder1:{ID:BUILDER},Lots:[{ID:lots[1].ID,display_value:lots[1].Lot_Code+' - Sold'},{ID:lots[8].ID,display_value:lots[8].Lot_Code+' - Scheduled'}],Lot_Count:2,Entered_Date:'07-Oct-2026',Purchase_Date:'15-Oct-2026',Status:'Sold'}],All_Contracts1:[],All_Lots_All_Fields:lots,All_Active_Lots_List_View:lots,All_Active_Lots_Contracts_View:lots};
fixture.All_Builders.push(...Array.from({length:250},(_,i)=>({ID:String(90071992547410000n+BigInt(i)),Builder_Name:'Builder '+String(i).padStart(3,'0'),Type1:'Builder'})));
const server=http.createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||(fs.existsSync(path.join(source,'widget.html'))?'widget.html':'index.html'),file=path.resolve(source,name);if(!file.startsWith(source+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',name.endsWith('.css')?'text/css':name.endsWith('.js')?'text/javascript':'text/html');res.end(fs.readFileSync(file));});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,channel:process.env.LM_BROWSER_CHANNEL||'chrome'}),page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.setDefaultTimeout(12000);page.on('pageerror',error=>errors.push(error.message));
await page.route('https://js.zohostatic.com/**',route=>route.fulfill({contentType:'text/javascript',body:''}));
await page.addInitScript(({fixture})=>{
  window.__fixture=fixture;window.__writes=[];window.__delay=0;window.__failRead=false;
  function scoped(config){
    let rows=window.__fixture[config.report_name]||[],criteria=config.criteria||'';
    const ids=Array.from(criteria.matchAll(/\(ID == (\d+)\)/g),match=>match[1]);if(ids.length)rows=rows.filter(row=>ids.includes(row.ID));
    for(const match of criteria.matchAll(/\((Subdivision|Subdivision1|Builder1) == (\d+)\)/g))rows=rows.filter(row=>String(row[match[1]]?.ID||row[match[1]])===match[2]);
    return JSON.parse(JSON.stringify(rows));
  }
  window.ZOHO={CREATOR:{UTIL:{getInitParams:async()=>({loginUser:'inert-list-fixture',appLinkName:'land-master',envUrlFragment:'environment/development'})},DATA:{
    getRecordCount:async config=>({code:3000,result:{records_count:scoped(config).length}}),
    getRecords:async config=>{if(window.__failRead&&config.criteria?.includes('(ID =='))throw Error('Temporary verification failure');const rows=scoped(config);if(config.field_config==='custom'){const fields=['ID',...config.fields.split(',')];rows.forEach(row=>Object.keys(row).forEach(key=>{if(!fields.includes(key))delete row[key];}));}return {code:3000,data:rows};},
    updateRecordById:async config=>{window.__writes.push(config);if(window.__rejectNative)throw {code:2898,message:'Permission denied'};if(window.__delay)await new Promise(resolve=>setTimeout(resolve,window.__delay));const row=window.__fixture.All_Lots_All_Fields.find(row=>row.ID===config.id);Object.assign(row,config.payload.data);if(window.__failAfterWrite)window.__failRead=true;return {code:3000,data:{ID:config.id}};}
  }}};
},{fixture});
try{
  await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.waitForFunction(()=>window.__MLW_TEST__?.controller.state.ready);
  await page.evaluate(sid=>window.__MLW_TEST__.setSubdivisionIds([sid]),SID);await page.waitForSelector('[data-lot-row]');
  await page.locator('[data-lot-check]').nth(50).check();await page.locator('[data-jump-block]').nth(2).click();
  const measurements=[];
  for(let i=0;i<4;i++){
    measurements.push(await page.evaluate(()=>{const node=document.getElementById('llEditMode'),report=document.querySelector('.ll-report'),row=document.querySelector('[data-lot-row]'),top=report.scrollTop,checked=document.querySelectorAll('[data-lot-check]:checked').length,t=performance.now();node.checked=!node.checked;node.dispatchEvent(new Event('change',{bubbles:true}));const ms=performance.now()-t;return {enabled:document.getElementById('llEditMode').checked,ms,rows:document.querySelectorAll('[data-lot-row]').length,sameRow:row===document.querySelector('[data-lot-row]'),sameReport:report===document.querySelector('.ll-report'),scrollRetained:top===document.querySelector('.ll-report').scrollTop,selectionRetained:checked===document.querySelectorAll('[data-lot-check]:checked').length,options:document.querySelectorAll('.ll-table select option').length};}));
    await page.waitForTimeout(350);
  }
  console.log(JSON.stringify({lots:312,builders:fixture.All_Builders.length,measurements}));
  assert.equal(await page.evaluate(()=>__writes.length),0);assert.deepEqual(errors,[]);
  if(!process.env.LM_LOTS_BASELINE){for(const result of measurements){assert.equal(result.sameRow,true);assert.equal(result.sameReport,true);assert.equal(result.selectionRetained,true);assert.equal(result.scrollRetained,true);assert.ok(result.ms<500,'312-lot mode switch must stay below 500ms');assert.ok(result.options<=624,'inline Builder options are populated only when opened');}}
  await page.screenshot({path:path.join(out,'mode-performance.png')});
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
