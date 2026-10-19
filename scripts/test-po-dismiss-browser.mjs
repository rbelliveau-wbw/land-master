// Real PO renderer and shared motion; local fixtures never call Creator.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const app='widgets/budget-manager/src/app/';
const server=http.createServer((req,res)=>{
  const name=req.url.slice(1).split('?')[0];
  if(!name){
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.end(fs.readFileSync('scripts/fixtures/purchase-orders.html','utf8').replace('</title>','</title><link rel="stylesheet" href="/interaction-motion.css"><script src="/interaction-motion.js"></script><script src="/interaction-surfaces.js"></script>'));
  }else if(/^[a-z-]+\.(?:js|css)$/.test(name)&&fs.existsSync(app+name)){
    res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':'text/css');
    res.end(fs.readFileSync(app+name));
  }else{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({viewport:{width:1950,height:1080}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.setDefaultTimeout(5000);
const output=path.resolve('tmp/po-dismiss-preview');fs.mkdirSync(output,{recursive:true});
try{
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(()=>{
    window.motion=LMInteractionSurfaces.install('budget-manager',{ready:()=>true});
    window.exitCopies=[];
    window.openFades=0;
    const animate=Element.prototype.animate;
    Element.prototype.animate=function(frames,timing){if(this.matches('.po-workspace')&&!this.matches('.lm-motion-ghost'))openFades++;return animate.call(this,frames,timing);};
    new MutationObserver(records=>{
      for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1&&node.matches('.lm-motion-ghost')){
        const card=node.matches('.po-workspace')?node.querySelector('.po-card'):null;
        exitCopies.push({className:node.className,cardHeight:card?.getBoundingClientRect().height});
      }
    }).observe(document.body,{childList:true});
  });
  await page.waitForTimeout(60);
  async function openApproval(){
    const fades=await page.evaluate(()=>openFades);
    await page.locator('#approval').click();
    await page.locator('[data-po-decision="Approve"]').waitFor();
    await page.waitForTimeout(220);
    if(!await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches))assert.ok(await page.evaluate(()=>openFades)>fades,'the real opening fade remains');
  }
  async function closed(trigger){
    assert.equal(await page.locator('.po-overlay').count(),0,'original overlay is removed immediately');
    assert.equal(await page.locator(trigger).evaluate(node=>node===document.activeElement),true,'focus returns immediately');
    assert.equal(await page.locator(trigger).evaluate(node=>node.inert),false,'background becomes interactive immediately');
    await page.waitForTimeout(200);
    assert.deepEqual(await page.evaluate(()=>exitCopies),[],'no detached PO copy may flash or change layout after dismissal');
    assert.equal(await page.locator('.lm-motion-ghost').count(),0);
  }
  await openApproval();
  const before=await page.locator('.po-card').boundingBox();
  assert.ok(before.height>900,'uses the actual desktop PO workspace');
  await page.screenshot({path:path.join(output,'approval-open.png')});
  await page.locator('footer [data-po-close]').click();
  await closed('#approval');
  await page.screenshot({path:path.join(output,'approval-closed.png')});
  await openApproval();await page.locator('header [data-po-close]').click();await closed('#approval');
  await openApproval();await page.keyboard.press('Escape');await closed('#approval');
  // Close before saved reads complete: the late response must not reopen it.
  await page.locator('#slow').check();await page.locator('#view').click();
  await page.locator('header [data-po-close]').click();await closed('#view');
  await page.locator('#slow').uncheck();
  // Rapid close/reopen keeps one real dialog and its original geometry.
  await openApproval();await page.locator('header [data-po-close]').click();
  await page.locator('#approval').click();await page.locator('[data-po-decision="Approve"]').waitFor();
  await page.waitForTimeout(220);
  assert.equal(await page.locator('.po-workspace').count(),1);
  assert.deepEqual(await page.locator('.po-card').boundingBox(),before);
  assert.deepEqual(await page.evaluate(()=>exitCopies),[]);
  await page.keyboard.press('Escape');await closed('#approval');
  // Escape dismisses a picker before its parent workspace, without a copy.
  await page.locator('#open').click();await page.locator('[data-po-picker="vendorId"]').click();
  assert.equal(await page.locator('.po-popover').count(),1);
  await page.waitForTimeout(50);await page.keyboard.press('Escape');
  assert.equal(await page.locator('.po-popover').count(),0);
  assert.equal(await page.locator('.po-overlay').count(),1);
  await page.keyboard.press('Escape');await closed('#open');
  await page.emulateMedia({reducedMotion:'reduce'});await openApproval();
  assert.equal(await page.locator('.po-workspace').evaluate(node=>node.getAnimations().length),0);
  await page.keyboard.press('Escape');await closed('#approval');
  await page.emulateMedia({reducedMotion:'no-preference'});
  // Pending approval writes must still block Close and Escape.
  await page.locator('#slow-write').check();await openApproval();
  await page.locator('[data-po-decision="Approve"]').click();
  await page.waitForTimeout(200);await page.keyboard.press('Escape');
  assert.equal(await page.locator('.po-overlay').count(),1,'pending write retains its progress dialog');
  assert.equal(await page.locator('header [data-po-close]').isDisabled(),true,'pending write blocks the X');
  assert.deepEqual(await page.evaluate(()=>exitCopies),[]);
  await page.waitForTimeout(5100);
  assert.equal(await page.locator('.po-overlay').count(),1,'late old reads cannot close the current result');
  const done=page.locator('footer [data-po-finish]');await done.waitFor();await done.click();await closed('#approval');
  assert.equal(await page.locator('#writes').textContent(),'Writes: 1','only the explicit approval writes');
  await page.evaluate(()=>fixtureDelete=false);await page.locator('#view').click();await page.waitForFunction(()=>document.querySelector('[data-po-status-badge]')?.textContent.trim()==='Draft');assert.equal(await page.locator('[data-po-delete]').count(),0,'Owned-budget editing never grants PO Delete');await page.keyboard.press('Escape');await closed('#view');
  const denied=await page.evaluate(async()=>{try{await ui.open({ID:'1001'},document.querySelector('#view'),'2002','delete',{id:'2002',budgetId:'1001',revision:'saved-fixture',status:'Draft',amount:'100.00'});return '';}catch(e){return e.message;}});assert.match(denied,/Edit\/Delete All Budgets\/Requests/);assert.equal(await page.locator('.po-overlay').count(),0);assert.equal(await page.locator('#writes').textContent(),'Writes: 1');
  assert.deepEqual(errors,[]);
  console.log('PASS: actual desktop PO Close/X/Escape, loading cancellation, rapid reopen, no exit copies/layout flicker, immediate focus/inert restoration, reduced motion and pending approval close lock.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
