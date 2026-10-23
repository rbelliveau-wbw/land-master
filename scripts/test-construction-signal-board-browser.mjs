// Actual desktop Construction document with synthetic records; no Creator calls.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=path.resolve('widgets/contract-management/src/app'),output=path.resolve('tmp/construction-signal-board');
fs.mkdirSync(output,{recursive:true});
const server=http.createServer((req,res)=>{
 const file=new URL(req.url,'http://localhost').pathname.slice(1)||'widget.html',filename=path.resolve(base,file);
 if(!filename.startsWith(base+path.sep)||!fs.existsSync(filename)){res.writeHead(404).end();return;}
 let body=fs.readFileSync(filename,'utf8');
 if(file==='widget.html')body=body.replace('contractBoot();\nwindow.addEventListener','/* inert fixture startup */\nwindow.addEventListener');
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(body);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:1540,height:1159}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
await page.route(/.*/,route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.fulfill({body:'',contentType:route.request().resourceType()==='stylesheet'?'text/css':'text/javascript'}));
const card=id=>page.locator('[data-board-id="'+id+'"]');
try{
 await page.goto('http://127.0.0.1:'+server.address().port+'/');
 await page.waitForFunction(()=>window.__interactionMotion&&window.__numberTransitions);
 await page.evaluate(()=>{
  LMRuntime.apply({envUrlFragment:'',loginUser:'fixture@example.test',appLinkName:'land-master'});
  Object.assign(S,{workMode:'construction',mode:'board',view:'home',homeSection:'contracts',coreReady:true,liveSDK:true,demo:false,contractCoreScope:contractMutationScope(),currentUser:'fixture@example.test',usersLoaded:true,optionsLoaded:true,projectsLoaded:true});
  Object.assign(S.acc,{known:true,constructionEditAll:true,constructionSubmit:false,edit:false,approve:false,templates:false});
  S.contracts=[
   {ID:'90071992547410001',Priority:'ASAP',Status:'Proposed',Contract_Type:'Amenity',Contract_Name:'Arroyo Ranch - Phase 01 · Amenity budget',Date_Needed:'10/30/2026',Parent_Contract:{ID:'90071992547410002'}},
   {ID:'90071992547410002',Priority:'High',Status:'Proposed',Contract_Type:'MUD Bid',Contract_Name:'Arroyo Ranch - Phase 05 · MUD Bid budget'},
   {ID:'90071992547410003',Priority:'Medium',Status:'New',Contract_Name:'Arroyo Ranch - Phase 07 · Internal budget',Date_Needed:'2026-11-06'},
   {ID:'90071992547410004',Priority:'Medium',Status:'Approved',Contract_Name:'Alta Vista · Phase 01 · MUD bid'},
   {ID:'90071992547410005',Priority:'High',Status:'Proposed',Contract_Name:'Walker’s Landing · Submitted budget'},
   {ID:'90071992547410006',Priority:'Medium',Status:'Complete',Contract_Name:'Pecan Grove · Completed estimate'},
   {ID:'90071992547410007',Priority:'',Status:'New',Contract_Name:'Legacy request without priority'},
   {ID:'90071992547410008',Priority:'Legacy <urgent>',Status:'Other <status>',Contract_Name:'Legacy <request> & context'},
   {ID:'90071992547410009',Priority:'High',Status:'Hold',Contract_Name:'Alta Vista · Amenity construction estimate with a long request name'}
  ].map(c=>Object.assign({Work_Module:'Construction',Contract_Type:'Internal',Subdivision1:[{ID:'sub-1',display_value:'Redundant subdivision fixture'}],Parent_Contract:'',Owner:[]},c));
  S.actions=[{ID:'action-1',Contract1:{ID:'90071992547410003'},Contract_Action:'prepare an imagination',Current_Action:true,Complete:false,Status:'New',Work_Module:'Construction'}];
  window.__allRequests=S.contracts;S.contracts=S.contracts.slice(0,3);renderAll();setStatus('ok','Connected');
  // Only the native adapter boundary is held. Renderer, drop/status/save handlers stay real.
  window.__writes=[];window.__ack=null;
  updateRecord=(id,payload,report)=>{__writes.push({id,payload,report});return new Promise(resolve=>{__ack=resolve;});};
 });
 await page.waitForTimeout(350);
 const fit=await page.locator('.construction-board').evaluate(board=>({height:board.getBoundingClientRect().height,grid:board.firstElementChild.getBoundingClientRect().height,gap:board.getBoundingClientRect().bottom-board.querySelector('.construction-board-lane:last-child').getBoundingClientRect().bottom,background:getComputedStyle(board.querySelector('.construction-board-cell')).backgroundColor}));
 assert.ok(fit.height<500,'the screenshot-sized three-request board must not stretch into blank space');assert.ok(Math.abs(fit.height-fit.grid)<=3);assert.ok(fit.gap<=2,'bottom border hugs the final lane');assert.notEqual(fit.background,'rgb(255, 255, 255)','lanes have a muted background');
 assert.equal(await page.locator('.construction-board .bcard-builder,.construction-board .lot-parent-label,.construction-board .contract-master-note,.construction-board .lot-type-badge').count(),0);
 assert.doesNotMatch(await card('90071992547410001').textContent(),/Phase 05|Redundant subdivision/,'the child card omits its parent and duplicate subdivision');
 assert.match(await card('90071992547410003').textContent(),/prepare an imagination.*Internal.*11\/06\/2026/,'card fields include the actual request Date Needed');
 assert.equal(await card('90071992547410001').locator('.bcard-needed').textContent(),'10/30/2026');
 assert.equal(await card('90071992547410002').locator('.bcard-needed').textContent(),'—','legacy requests without Date Needed remain undated');
 await page.screenshot({path:path.join(output,'signal-rail-three-requests.png')});
 await page.evaluate(()=>{S.contracts=__allRequests;renderAll();});
 assert.deepEqual(await page.locator('.construction-board-lane').evaluateAll(nodes=>nodes.map(n=>n.dataset.priority)),['ASAP','High','Medium','Legacy <urgent>','']);
 assert.equal(await page.locator('.construction-board .bcard').count(),9);
 assert.equal(await page.locator('.scope-count,.review-n,.bcol-head .n').count(),0);
 assert.equal(await page.locator('.construction-priority-rail').first().evaluate(n=>n.getBoundingClientRect().width),54);
 assert.equal(await card('90071992547410005').getAttribute('draggable'),'true','pending Review can change priority');
 assert.equal(await card('90071992547410006').getAttribute('draggable'),null,'completed stays locked');
 assert.equal(await page.locator('.construction-board-cell[data-status="Hold"]').count(),5);
 assert.equal(await page.locator('.construction-board script,.construction-board urgent').count(),0,'legacy values are text');
 assert.ok(await card('90071992547410009').evaluate(n=>n.scrollWidth<=n.clientWidth),'long names wrap within cards');
 await page.screenshot({path:path.join(output,'signal-rail-desktop.png')});
 await page.setViewportSize({width:1540,height:620});
 const sticky=await page.evaluate(async()=>{
  const board=document.querySelector('.construction-board'),rail=document.querySelector('.construction-priority-rail'),head=document.querySelector('.construction-board-head'),corner=document.querySelector('.construction-board-corner');
  const before={x:rail.getBoundingClientRect().x,y:head.getBoundingClientRect().y,cornerX:corner.getBoundingClientRect().x,cornerY:corner.getBoundingClientRect().y};board.scrollLeft=410;board.scrollTop=120;
  await new Promise(requestAnimationFrame);return {before,after:{x:rail.getBoundingClientRect().x,y:head.getBoundingClientRect().y,cornerX:corner.getBoundingClientRect().x,cornerY:corner.getBoundingClientRect().y},scroll:[board.scrollLeft,board.scrollTop]};
 });
 assert.deepEqual(sticky.after,sticky.before,'priority rail and status header stay pinned during both scroll axes');assert.ok(sticky.scroll.every(v=>v>0));
 await page.screenshot({path:path.join(output,'signal-rail-scrolled.png')});
 await page.setViewportSize({width:1540,height:1000});
 // Real drag/drop -> existing status handler -> held native acknowledgement.
 await page.evaluate(()=>{const b=document.querySelector('.construction-board');b.scrollLeft=0;b.scrollTop=0;});
 const moved='90071992547410003',target=page.locator('.construction-board-cell[data-priority="High"][data-status="Hold"]');
 const before=await card(moved).boundingBox();
 await card(moved).dragTo(target);
 assert.equal(await page.evaluate(()=>__writes.length),1);assert.deepEqual(await page.evaluate(()=>__writes[0].payload),{Status:'Hold',Priority:'High'});
 assert.equal(await card(moved).evaluate(n=>n.closest('[data-status]').dataset.status),'New','card waits for acknowledgement');
 const motion=await page.evaluate(async id=>{
  __ack();await Promise.resolve();await Promise.resolve();
  const node=document.querySelector('[data-board-id="'+id+'"]');
  await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
  const initial=node.getBoundingClientRect();const active=getComputedStyle(node).transform;
  await new Promise(resolve=>setTimeout(resolve,90));const mid=node.getBoundingClientRect();
  await new Promise(resolve=>setTimeout(resolve,300));const end=node.getBoundingClientRect();
  return {initial:{x:initial.x,y:initial.y},mid:{x:mid.x,y:mid.y},end:{x:end.x,y:end.y},active,final:getComputedStyle(node).transform,priority:findContract(id).Priority};
 },moved);
 assert.notEqual(motion.active,'none','saved drop starts a real transform');assert.ok(Math.abs(motion.mid.x-motion.end.x)>1,'card crosses an intermediate horizontal position');assert.ok(Math.abs(motion.mid.y-motion.end.y)>1,'stacked destination also animates vertical movement');
 assert.ok(Math.abs(motion.mid.x-motion.end.x)<Math.abs(before.x-motion.end.x),'saved card progresses toward destination');assert.equal(motion.final,'none');assert.equal(motion.priority,'High');
 assert.equal(await card(moved).evaluate(n=>n.closest('[data-status]').dataset.status),'Hold');
 await card('90071992547410001').dragTo(page.locator('.construction-priority-rail[data-priority="High"]'));
 assert.deepEqual(await page.evaluate(()=>__writes[1].payload),{Priority:'High'});assert.equal(await card('90071992547410001').evaluate(n=>n.closest('.construction-board-lane').dataset.priority),'ASAP','priority waits for the native acknowledgement');
 await page.evaluate(async()=>{__ack();await Promise.resolve();await Promise.resolve();});await page.waitForTimeout(350);
 assert.equal(await card('90071992547410001').evaluate(n=>n.closest('.construction-board-lane').dataset.priority),'High');assert.equal(await page.evaluate(()=>findContract('90071992547410001').Status),'Proposed','rail drop never accepts Pending Review');
 // Rerenders retain scroll; only the native pencil button opens edit mode.
 const restored=await page.evaluate(async()=>{const b=document.querySelector('.construction-board');b.scrollLeft=400;b.scrollTop=100;const before=[b.scrollLeft,b.scrollTop];renderAll();await new Promise(requestAnimationFrame);const next=document.querySelector('.construction-board');return {before,after:[next.scrollLeft,next.scrollTop]};});
 assert.deepEqual(restored.after,restored.before);
 await page.evaluate(()=>{const b=document.querySelector('.construction-board');b.scrollLeft=0;b.scrollTop=0;S.bDragEndedAt=0;});
 await card('90071992547410001').locator('.bcard-name').click();
 assert.equal(await page.evaluate(()=>S.view),'home');assert.equal(await page.evaluate(()=>S.constructionEdit),null);
 await card('90071992547410001').locator('.bcard-edit').focus();await page.keyboard.press('Enter');
 assert.equal(await page.evaluate(()=>S.constructionEdit.cid),'90071992547410001');assert.equal(await page.evaluate(()=>S.view),'home');
 await page.evaluate(()=>constructionEditClose());
 await page.emulateMedia({reducedMotion:'reduce'});
 const reduced=await page.evaluate(async()=>{queueFlip('board:90071992547410003');findContract('90071992547410003').Status='New';renderAll();await new Promise(requestAnimationFrame);return getComputedStyle(document.querySelector('[data-board-id="90071992547410003"]')).transform;});
 assert.equal(reduced,'none','reduced motion skips travel');
 const bounded=await page.evaluate(()=>{const base=S.contracts[0];for(let i=0;i<160;i++)S.contracts.push({...base,ID:String(900000+i),Priority:i%2?'ASAP':'High',Contract_Name:'Large board '+i});renderAll();const positions=flipCapture('board:'+base.ID);return {cards:document.querySelectorAll('.construction-board .bcard').length,measured:Object.keys(positions).filter(k=>k.startsWith('board:')).length};});
 assert.ok(bounded.cards>100);assert.equal(bounded.measured,1,'large-board geometry work is bounded to the moved request');
 assert.deepEqual(errors,[]);
 console.log('PASS desktop Signal rail correction: screenshot-matched three-request content height/background/card facts, no family/subdivision metadata, native-acknowledged priority and combined drag with intermediate motion, sticky rail/header, legacy/full-status visibility, scroll/keyboard/reduced-motion and large-board guards.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
