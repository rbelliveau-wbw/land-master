// The complete mounted Tax progress component in a real desktop browser.
// Fixture ledgers only: no Creator SDK, requests or business writes are loaded.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {source,readTaxScript} from './fixtures/tax-source.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const bulkFields=source.match(/var BULK_EDIT_FIELDS = \[[\s\S]*?\n\];/)[0];
const html='<!doctype html><meta charset="utf-8"><style>body{margin:0;font:14px system-ui}main{padding:24px}button{font:inherit}</style><main id="toolbar"><button id="open">Save changes</button></main><script>window.LMRuntime={current:()=>({user:"fixture",environment:"DEVELOPMENT"})};'+bulkFields+'</script><script src="/tax-progress.js"></script><script src="/interaction-motion.js"></script><link rel="stylesheet" href="/interaction-motion.css">';
const server=http.createServer((req,res)=>{
 const name=req.url.slice(1);
 if(name==='tax-progress.js'){res.setHeader('Content-Type','text/javascript');res.end(readTaxScript(name));}
 else if(['interaction-motion.js','interaction-motion.css'].includes(name)){res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':'text/css');res.end(fs.readFileSync('shared/'+name));}
 else {res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,channel:'chrome',ignoreDefaultArgs:['--hide-scrollbars']});
const page=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const output=path.resolve('tmp/tax-progress-preview');fs.mkdirSync(output,{recursive:true});
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
 assert.ok(value.dialog.y>=23&&value.dialog.bottom<=viewportHeight-23,'viewport margins remain visible');
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
 assert.deepEqual(errors,[]);
 console.log('PASS compact Tax progress: complete source, 135/32-row desktop geometry, pinned summary/stages/actions, internal results scrolling, human field/status copy, mounted rows, true confirmed counts, errors, focus/close/inert locks, retained results and reduced motion.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
