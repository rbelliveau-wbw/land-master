// Actual approval controller embedded in a stable Settings screen; local fixtures only.
import fs from 'node:fs';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const root='widgets/settings-manager/src/app/';
const fixture=fs.readFileSync('scripts/fixtures/approval-policies.html','utf8').replace('return receipt;','if(window.fixtureLoseNext){window.fixtureLoseNext=false;throw Error("Lost fixture response");}return receipt;');
const server=http.createServer((req,res)=>{
  const name=req.url.slice(1).split('?')[0];
  if(!name){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fixture);}
  else if(/^[a-z-]+\.(?:js|css)$/.test(name)&&fs.existsSync(root+name)){res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':'text/css');res.end(fs.readFileSync(root+name));}
  else{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:1440,height:950}}),errors=[];
page.setDefaultTimeout(7000);page.on('pageerror',e=>errors.push(e.message));
const saved=()=>page.waitForFunction(()=>document.querySelector('[data-ap-inline-status]')?.textContent==='Saved');
try{
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(()=>{
    const workspace=document.createElement('main');workspace.id='workspace';workspace.innerHTML='<button id="parent-nav">Settings navigation</button><div id="approval-host"></div><button id="after-approvals">Next settings action</button>';document.body.appendChild(workspace);
    window.workspaceStates=[];window.mountResult=ui.mount(document.querySelector('#approval-host'),'Policies',state=>{workspaceStates.push(state);document.querySelector('#parent-nav').disabled=!state.canLeave;});
  });
  await page.waitForFunction(()=>document.querySelectorAll('.ap-record').length===2);
  assert.equal(await page.evaluate(()=>mountResult),true);
  assert.equal(await page.locator('.ap-card').getAttribute('role'),'region');
  assert.equal(await page.locator('.ap-card>header').isVisible(),false);
  assert.equal(await page.locator('.ap-tabs').isVisible(),false);
  assert.equal(await page.locator('.ap-workspace-toolbar [data-ap-new]').isVisible(),true,'Add Rule is available above the records');
  assert.equal(await page.locator('.ap-card>footer').isVisible(),false,'list actions are not repeated below the list');
  assert.equal(await page.evaluate(()=>document.querySelector('#workspace').inert),false,'ordinary screens do not inert the parent menu');
  assert.equal(await page.evaluate(()=>ui.navigate('Assignments')),true);
  await page.locator('[data-ap-edit="41"]').click();
  await page.evaluate(()=>{const host=document.querySelector('#workspace');host.style.maxHeight='220px';host.style.overflow='auto';});
  await page.locator('[aria-label="Approver"]').click();
  await page.locator('.ap-picker-results').evaluate(node=>{node.scrollTop=90;});
  assert.equal(await page.locator('.ap-picker').isVisible(),true,'scrolling picker results keeps the picker open');
  await page.evaluate(()=>{const host=document.querySelector('#workspace');host.scrollTop=host.scrollTop?0:60;});
  await page.waitForFunction(()=>!document.querySelector('.ap-picker'));
  await page.evaluate(()=>{const host=document.querySelector('#workspace');host.style.maxHeight='';host.style.overflow='';});
  await page.locator('[data-ap-field="active"]').uncheck();
  const result=await page.evaluate(()=>({allowed:ui.canLeave(),navigated:ui.navigate('Roles'),state:ui.state()}));
  assert.equal(result.allowed,false);assert.equal(result.navigated,false);assert.equal(result.state.pending,true,'leaving requests the existing inline flush');
  await saved();
  assert.equal(await page.evaluate(()=>ui.canLeave()),true);
  assert.equal(await page.evaluate(()=>fixtureRequests.filter(r=>r.action==='SaveAssignment').length),1,'one audited mutation handles the coalesced edit');
  await page.evaluate(()=>{window.fixtureLoseNext=true;});
  await page.locator('[data-ap-field="active"]').check();
  await page.waitForFunction(()=>ui.state().unknown);
  assert.equal(await page.evaluate(()=>ui.canLeave()),false);
  assert.equal(await page.evaluate(()=>ui.navigate('Roles')),false,'unknown reply cannot be hidden by parent navigation');
  const token=await page.evaluate(()=>fixtureRequests.filter(r=>r.action==='SaveAssignment').at(-1).token);
  await page.locator('[data-ap-inline-check]').click();await saved();
  assert.equal(await page.evaluate(()=>fixtureRequests.at(-1).action),'Check');
  assert.equal(await page.evaluate(()=>fixtureRequests.at(-1).token),token,'recovery keeps the original operation token');
  assert.equal(await page.evaluate(()=>fixtureRequests.filter(r=>r.action==='SaveAssignment').length),2,'Check never replays a mutation');
  assert.equal(await page.evaluate(()=>ui.navigate('Policies')),true);
  await page.locator('[data-ap-new]').click();
  assert.equal(await page.evaluate(()=>ui.canLeave()),false,'an unsaved new rule stays in its editor');
  assert.equal(await page.evaluate(()=>ui.navigate('Audit')),false);
  await page.locator('[aria-label="Workflow"]').click();await page.locator('[data-ap-pick="workflow"][data-value="Budget"]').click();
  await page.locator('[data-ap-save]').click();
  assert.equal(await page.evaluate(()=>document.querySelector('.ap-inline').parentElement===document.body),true,'configuration progress portals into its actual modal boundary');
  assert.equal(await page.locator('.ap-card').getAttribute('role'),'dialog');assert.equal(await page.locator('.ap-card').getAttribute('aria-modal'),'true');
  assert.equal(await page.evaluate(()=>document.querySelector('#workspace').inert),true);
  assert.equal(await page.evaluate(()=>ui.canLeave()),false);
  await page.waitForFunction(()=>document.querySelector('[data-ap-outcome-title]')?.textContent==='Rule Active');
  await page.locator('[data-ap-done]').click();
  await page.waitForFunction(()=>document.querySelector('.ap-inline')?.parentElement.id==='approval-host');
  assert.equal(await page.evaluate(()=>document.querySelector('#workspace').inert),false);
  assert.equal(await page.locator('.ap-card').getAttribute('role'),'region');assert.equal(await page.evaluate(()=>ui.canLeave()),true);
  assert.equal(await page.evaluate(()=>ui.navigate('Audit')),true);
  assert.ok(await page.locator('.ap-list').count());
  await page.locator('.ap-inline').evaluate(panel=>{const nodes=Array.from(panel.querySelectorAll('button,input,summary')).filter(node=>!node.disabled&&node.getClientRects().length);nodes.at(-1).focus();});await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'after-approvals','an ordinary embedded screen does not trap keyboard focus');
  assert.equal(await page.evaluate(()=>workspaceStates.some(state=>state.unknown&&!state.canLeave)),true);
  assert.deepEqual(errors,[]);
  console.log('PASS: embedded approval screens, parent navigation/dirty-write guards, same-token read-only recovery, unsaved draft retention, modal progress portal, inert/focus restoration and ordinary keyboard navigation.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
