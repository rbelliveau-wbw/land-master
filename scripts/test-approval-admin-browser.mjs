// Actual Settings styles and approval editor, with local audited-write fixtures only.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const root='widgets/settings-manager/src/app/';
const globalStyles=fs.readFileSync(root+'widget.html','utf8').match(/<style>[\s\S]*?<\/style>/)[0];
const documentText=fs.readFileSync('scripts/fixtures/approval-policies.html','utf8').replace('<link rel="stylesheet" href="/approval-admin.css">','<link rel="stylesheet" href="/approval-admin.css">'+globalStyles+'<link rel="stylesheet" href="/interaction-motion.css"><script src="/interaction-motion.js"></script><script src="/interaction-surfaces.js"></script>');
const server=http.createServer((req,res)=>{
  const name=req.url.slice(1).split('?')[0];
  if(!name){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(documentText);}
  else if(/^[a-z-]+\.(?:js|css)$/.test(name)&&fs.existsSync(root+name)){res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':'text/css');res.end(fs.readFileSync(root+name));}
  else{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:1008,height:700}}),errors=[];
page.setDefaultTimeout(7000);page.on('pageerror',e=>errors.push(e.message));
const output=path.resolve('tmp/approval-admin-preview');fs.mkdirSync(output,{recursive:true});
const settled=()=>page.waitForFunction(()=>document.querySelector('[data-ap-inline-status]')?.textContent==='Saved');
async function geometry(){
  const rows=await page.locator('.ap-rule-step').evaluateAll(nodes=>nodes.map(row=>{
    const rect=node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,centerY:(r.top+r.bottom)/2,width:r.width,height:r.height};};
    return {row:rect(row),role:rect(row.querySelector('[aria-label="Role"]')),condition:rect(row.querySelector('[aria-label="Condition"]')),threshold:row.querySelector('[data-ap-field="threshold"]')?rect(row.querySelector('[data-ap-field="threshold"]')):null,tools:rect(row.querySelector('.ap-step-tools')),checkbox:rect(row.querySelector('[type="checkbox"]')),trash:rect(row.querySelector('.ap-step-remove'))};
  }));
  for(const row of rows){
    assert.ok(Math.abs(row.role.centerY-row.condition.centerY)<1,'picker control baselines align');
    assert.ok(Math.abs(row.role.centerY-row.checkbox.centerY)<1,'Enabled aligns with the actual inputs');
    assert.ok(Math.abs(row.role.centerY-row.trash.centerY)<1,'Delete aligns with the actual inputs');
    assert.ok(row.role.right<=row.condition.left-8);
    if(row.threshold){assert.ok(row.condition.right<=row.threshold.left-8);assert.ok(row.threshold.right<=row.tools.left-8,'threshold cannot overlap Enabled or Delete');assert.equal(row.threshold.height,row.role.height);}
    assert.ok(row.tools.right<row.row.right,'actions stay inside their row');
  }
  assert.equal(rows[0].role.left,rows[1].role.left);assert.equal(rows[0].role.width,rows[1].role.width,'Always and conditional rows retain identical Role widths');
  assert.equal(rows[0].condition.left,rows[1].condition.left);assert.equal(rows[0].condition.width,rows[1].condition.width);
  assert.equal(await page.locator('.ap-body').evaluate(node=>node.scrollWidth>node.clientWidth),false,'no horizontal overflow in the editor');
  const close=await page.locator('.ap-x').evaluate(button=>{const b=button.getBoundingClientRect(),s=button.querySelector('svg').getBoundingClientRect();return {x:(b.left+b.right-s.left-s.right)/2,y:(b.top+b.bottom-s.top-s.bottom)/2};});
  assert.ok(Math.abs(close.x)<.1&&Math.abs(close.y)<.1,'close SVG remains centered at its real size');
}
try{
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(()=>LMInteractionSurfaces.install('settings-manager',{ready:()=>true}));
  await page.locator('#open').click();await page.locator('[data-ap-edit="52"]').click();await page.waitForTimeout(200);
  await geometry();assert.equal(await page.locator('#writes').textContent(),'Writes: 0','viewing the cleaned editor does not change configuration');
  await page.locator('.ap-card').screenshot({path:path.join(output,'desktop-1008.png')});
  await page.setViewportSize({width:1440,height:950});await geometry();await page.locator('.ap-card').screenshot({path:path.join(output,'desktop-1440.png')});
  const threshold=page.locator('[data-ap-field="threshold"]');assert.equal(await threshold.inputValue(),'10000.00');assert.equal(await threshold.getAttribute('inputmode'),'decimal');
  await threshold.evaluate(node=>window.thresholdNode=node);await threshold.fill('10000.25');await threshold.press('Tab');await settled();
  assert.equal(await threshold.evaluate(node=>node===window.thresholdNode),true,'autosave keeps the threshold editor mounted');
  assert.equal(await page.evaluate(()=>fixtureRequests.filter(r=>r.action==='SavePolicy').at(-1).data.steps[1].threshold),'10000.25','currency precision is unchanged in the actual payload');
  await page.locator('[data-ap-row="mod-coo"] [aria-label="Condition"]').click();await page.locator('[data-ap-pick="condition"][data-value="Always"]').click();await settled();
  assert.equal(await page.locator('[data-ap-field="threshold"]').count(),0);await geometry();
  await page.locator('[data-ap-row="mod-coo"] [aria-label="Condition"]').click();await page.locator('[data-ap-pick="condition"][data-value="Above"]').click();await settled();await geometry();
  const handle=page.locator('[data-ap-row="mod-cfo"] button[data-ap-drag]');await handle.focus();await handle.press('Alt+ArrowDown');
  assert.deepEqual(await page.locator('.ap-rule-step').evaluateAll(nodes=>nodes.map(n=>n.dataset.apRow)),['mod-coo','mod-cfo'],'keyboard reorder still changes the native draft immediately');
  await page.waitForTimeout(35);assert.ok(await page.locator('[data-ap-row="mod-coo"]').evaluate(n=>getComputedStyle(n).transform!=='none'),'surviving rows still move with native FLIP');await settled();await geometry();
  await page.locator('.ap-add-step').click();assert.equal(await page.locator('.ap-rule-step').count(),3);await page.locator('.ap-rule-step').last().locator('.ap-step-remove').click();assert.equal(await page.locator('.ap-rule-step').count(),2);await page.waitForTimeout(750);
  await page.locator('[data-ap-cancel]').click();await page.locator('[data-ap-edit="51"]').click();
  assert.equal(await page.locator('[data-ap-row="cfo"] .ap-step-remove').count(),0,'required PO CFO removal stays unavailable');
  await page.locator('[data-ap-row="vp"] [aria-label="Approver Role"]').click();await page.keyboard.press('Escape');assert.equal(await page.locator('.ap-picker').count(),0);assert.equal(await page.locator('.ap-overlay').count(),1,'first Escape closes only the picker');
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-ap-row="vp"] button[data-ap-drag]').press('Alt+ArrowDown');await settled();
  assert.equal(await page.locator('[data-ap-row="vp"]').evaluate(n=>getComputedStyle(n).transform),'none','reduced motion retains immediate reorder');
  await page.locator('[data-ap-close]').click();assert.equal(await page.locator('.ap-overlay').count(),0);assert.equal(await page.locator('#open').evaluate(n=>n===document.activeElement&&!n.inert),true,'Close restores focus and background interaction');
  assert.deepEqual(errors,[]);
  console.log('PASS: actual desktop approval editor at 1008/1440px; aligned conditional controls without overlap, centered X, exact mounted threshold autosave, condition changes, keyed keyboard FLIP, add/remove, required PO CFO, picker Escape/focus and reduced motion.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
