import fs from 'node:fs';import http from 'node:http';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const output=path.resolve('tmp/comment-owner-preview');fs.mkdirSync(output,{recursive:true});
const component=fs.readFileSync('widgets/proforma-manager/src/app/comments.js','utf8'),css=fs.readFileSync('widgets/proforma-manager/src/app/comments.css','utf8');
const hosts=['proforma-manager','contract-management','budget-manager'];
const hostStyles=Object.fromEntries(hosts.map(slug=>[slug,[...fs.readFileSync('widgets/'+slug+'/src/app/widget.html','utf8').matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match=>match[1]).join('\n')]));
const server=http.createServer((req,res)=>{const host=new URL(req.url,'http://localhost').searchParams.get('host');res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html><head><style>body{font:14px Arial;background:#eef3fa;margin:0}.btn{font:700 12px Arial;border:1px solid #174f9a;border-radius:7px;color:white;background:#174f9a}.pf-comment-modal-dialog{width:900px;height:760px}.pf-comment-modal-close{cursor:pointer}'+css+'\n'+(hostStyles[host]||'')+'</style></head><body><section class="pf-comment-modal show"><div class="pf-comment-modal-dialog" role="dialog" aria-label="Cedar Grove comments"><header class="pf-comment-modal-head"><div class="pf-comment-modal-copy"><span>Comment Log</span><h2>Cedar Grove</h2></div><button class="pf-comment-modal-close" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header><div id="thread" class="pf-comment-modal-thread"></div></div></section><script>'+component+'</script></body></html>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:1440,height:1000}});
const parent='90071992547419991',otherParent='90071992547419993';
const send=()=>page.locator('[data-pc="send"]'),input=()=>page.getByRole('textbox',{name:'New comment',exact:true});
async function setup(options={}){
 await page.evaluate(async({parent,...options})=>{
  if(window.thread&&typeof thread.destroy==='function')thread.destroy();if(window.observe)observe.disconnect();
  document.getElementById('thread').outerHTML='<div id="thread" class="pf-comment-modal-thread"></div>';
  window.calls=0;window.loads=0;window.rows=[];window.labels=[];window.writeStarted=0;window.acknowledged=0;window.postedAt=0;window.pendingRead=null;window.releaseWrite=null;window.releaseRead=null;
  const field=options.field||'Pro_Forma';
  window.thread=PFComments.mount(document.getElementById('thread'),{parentField:field,currentUser:()=>options.readonly?'':options.actor||'author',users:()=>options.users||[],error:e=>e.message,
   load:async()=>{loads++;if(loads>1){const button=document.querySelector('[data-pc="send"]');pendingRead={label:button.textContent,disabled:button.disabled,width:button.getBoundingClientRect().width};}if(loads>1&&options.slowRead)await new Promise(resolve=>releaseRead=resolve);if(loads>1&&options.failRead)throw Error('Could not refresh comments.');return rows;},
   add:async data=>{calls++;writeStarted=performance.now();if(options.slowWrite)await new Promise(resolve=>releaseWrite=resolve);if(options.reject){const error=Error(options.reject);error.noReplay=!!options.noReplay;throw error;}rows.push({...data,ID:String(9000000+calls),User:'author',Added_User:'author',Added_Time:new Date().toISOString()});acknowledged=performance.now();return {notificationState:options.state||'sent',data:{ID:String(9000000+calls)}};},
   update:async()=>{},confirm:async()=>true});
  await thread.open(parent);
  const button=document.querySelector('[data-pc="send"]');labels.push(button.textContent);
  window.observe=new MutationObserver(()=>{const value=button.textContent;if(labels.at(-1)!==value)labels.push(value);if(value==='Posted')postedAt=performance.now();});observe.observe(button,{subtree:true,childList:true,characterData:true});
 },{parent,...options});
}
async function post(value='Please review the revised terms.') {await input().fill(value);await page.getByRole('button',{name:'Post',exact:true}).click();}
async function terminal(){await page.waitForFunction(()=>document.querySelector('.pc-status').textContent.startsWith('Comment posted'),null,{timeout:5000});}
async function keyboardPost(){await page.evaluate(()=>document.querySelector('.pc-input').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',ctrlKey:true,bubbles:true})));}
try{
 await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('.pf-comment-modal-dialog').evaluate(node=>Promise.all(node.getAnimations().map(animation=>animation.finished)));
 for(const field of ['Contract1','Pro_Forma','Budget','Project'])for(const state of ['sent','failed','skipped']){
  await setup({field,state});const width=(await send().boundingBox()).width;
  assert.equal(await page.locator('.pc-notify-note').textContent(),'Posting also emails the other record owners.');await post();
  await page.waitForFunction(()=>calls===1&&acknowledged>0&&loads===2);
  assert.deepEqual(await page.evaluate(()=>pendingRead),{label:'Posting…',disabled:true,width},'the required refresh begins while the same fixed-width pending action remains mounted');
  await keyboardPost();assert.equal(await page.evaluate(()=>calls),1);await terminal();
  assert.equal(await page.locator('[role="dialog"]').count(),1);assert.equal(await page.evaluate(()=>calls),1);assert.equal(await input().inputValue(),'');assert.equal(await page.locator('.pc-message').count(),1);assert.equal(await page.locator('.pc-status').textContent(),state==='sent'?'Comment posted · Owners emailed.':state==='failed'?'Comment posted · Email failed.':'Comment posted · No other owners to email.');
  assert.equal(await send().textContent(),'Posted');assert.equal((await send().boundingBox()).width,width);assert.deepEqual(await page.evaluate(()=>labels),['Post','Posting…','Posted']);await keyboardPost();assert.equal(await page.evaluate(()=>calls),1);assert.match(await page.locator('.pc-status').textContent(),/^Comment posted/,'a repeated shortcut cannot replace the terminal result with an empty-draft error');
  assert.ok(await page.evaluate(()=>postedAt-writeStarted)>=600,'pending display lasts through the fast acknowledgement');
  if(field==='Contract1'&&state==='sent')await page.screenshot({path:path.join(output,'comment-posted-owners-emailed.png')});
 }
 // A slow required read must never expose Post between acknowledgement and the
 // refreshed thread. Native create and read begin before the display-only hold.
 await setup({slowRead:true});const postWidth=(await send().boundingBox()).width;await post();await page.waitForFunction(()=>calls===1&&loads===2&&typeof releaseRead==='function');
 assert.equal(await input().inputValue(),'','the acknowledged draft is cleared before the read finishes');await page.waitForTimeout(800);assert.equal(await send().textContent(),'Posting…');assert.equal(await send().isDisabled(),true);await keyboardPost();assert.equal(await page.evaluate(()=>calls),1);
 await page.screenshot({path:path.join(output,'comment-posting-stable.png')});await page.evaluate(()=>releaseRead());await terminal();assert.equal((await send().boundingBox()).width,postWidth);assert.deepEqual(await page.evaluate(()=>labels),['Post','Posting…','Posted']);
 await page.waitForTimeout(500);assert.equal(await send().textContent(),'Posted','the terminal check does not flash away');await page.waitForFunction(()=>document.querySelector('[data-pc="send"]').textContent==='Post');assert.deepEqual(await page.evaluate(()=>labels),['Post','Posting…','Posted','Post']);assert.match(await page.locator('.pc-status').textContent(),/Owners emailed/,'the concise saved result remains after the button resets');
 // Refresh errors cannot restore the saved draft or describe an acknowledged
 // create as a failed write. A new draft immediately restores the normal action.
 await setup({failRead:true});await post('Already saved');await terminal();assert.equal(await page.evaluate(()=>calls),1);assert.equal(await input().inputValue(),'');assert.equal(await send().textContent(),'Posted');assert.equal(await page.locator('.pc-status').textContent(),'Comment posted · Owners emailed. Thread refresh failed. Reopen to refresh.');
 await input().fill('A new comment');assert.equal(await send().textContent(),'Post');assert.equal(await send().isDisabled(),false);
 // An ambiguous write keeps its draft and cannot be replayed through another
 // shortcut or a close/reopen, even when the host has not yet patched controls.
 await setup({slowWrite:true,reject:'Comment outcome unverified. Review before posting again.',noReplay:true});await post('Keep this draft');await page.waitForFunction(()=>typeof releaseWrite==='function');await keyboardPost();assert.equal(await page.evaluate(()=>calls),1);await page.evaluate(()=>releaseWrite());await page.waitForFunction(()=>document.querySelector('.pc-status').textContent.includes('unverified'));
 assert.equal(await input().inputValue(),'Keep this draft');assert.equal(await send().isDisabled(),true);await keyboardPost();await page.evaluate(parent=>thread.open(parent),parent);await keyboardPost();assert.equal(await page.evaluate(()=>calls),1);assert.equal(await input().inputValue(),'Keep this draft');assert.match(await page.locator('.pc-status').textContent(),/unverified/);
 await setup({slowWrite:true,reject:'Comment outcome unverified. Review before posting again.',noReplay:true});await post('Original record draft');await page.waitForFunction(()=>typeof releaseWrite==='function');await page.evaluate(parent=>thread.open(parent),otherParent);await page.evaluate(()=>releaseWrite());await page.waitForFunction(()=>!document.querySelector('[data-pc="send"]').disabled);assert.equal(await page.locator('.pc-status').textContent(),'');await page.evaluate(parent=>thread.open(parent),parent);await keyboardPost();assert.equal(await page.evaluate(()=>calls),1,'an unknown result is quarantined even after switching away before it arrives');assert.equal(await input().inputValue(),'Original record draft');assert.equal(await send().isDisabled(),true);
 await setup({reject:'The comment is too long.'});await post('Correct this draft');await page.waitForFunction(()=>document.querySelector('.pc-status').textContent==='The comment is too long.');assert.equal(await input().inputValue(),'Correct this draft');assert.equal(await send().textContent(),'Post');assert.equal(await send().isDisabled(),false,'a definite rejected write remains correctable');
 // Completion from an old parent never publishes a saved result into the newly
 // opened parent; terminal timers also stop when their component is destroyed.
 await setup({slowWrite:true});await post('For the original record');await page.waitForFunction(()=>typeof releaseWrite==='function');await page.evaluate(parent=>thread.open(parent),otherParent);await page.evaluate(()=>releaseWrite());await page.waitForFunction(()=>!document.querySelector('[data-pc="send"]').disabled);assert.equal(await send().textContent(),'Post');assert.equal(await page.locator('.pc-status').textContent(),'');assert.equal(await page.locator('.pc-message').count(),0);
 await setup();await post();await terminal();await page.evaluate(()=>{thread.destroy();document.querySelector('[data-pc="send"]').textContent='Detached';});await page.waitForTimeout(1500);assert.equal(await send().textContent(),'Detached','no terminal timer redraws a destroyed conversation');
 // Reduced motion skips the display hold and spinning motion while preserving
 // truthful acknowledgement, refresh and the same stable terminal result.
 await page.emulateMedia({reducedMotion:'reduce'});await setup({slowWrite:true});await post();await page.waitForFunction(()=>typeof releaseWrite==='function');assert.equal(await page.locator('.pc-send-spinner').evaluate(node=>getComputedStyle(node).animationName),'none');await page.evaluate(()=>releaseWrite());await terminal();assert.equal(await send().textContent(),'Posted');
 // The approved composer renders through the real host style cascade. Exercise
 // the unchanged formatting handlers and preserved draft rather than duplicating
 // them in a separate design-only implementation.
 await page.emulateMedia({reducedMotion:'no-preference'});
 for(const host of hosts){
  await page.goto('http://127.0.0.1:'+server.address().port+'/?host='+host);
  await setup({field:'Contract1',actor:'rbelliveau@wbdevelopment.com',users:[{email:'rbelliveau@wbdevelopment.com',Full_Name:'Robby Belliveau'}]});
  await page.evaluate(parent=>{rows.push({ID:'9000001',Contract1:{ID:parent},User:'doug',Author_Name:'Doug Reinke',Added_User:'doug',Added_Time:new Date().toISOString(),Comment:'Legal needs timelines to be confirmed.'});return thread.open(parent);},parent);
  const strip=page.locator('.pc-notify-note'),identity=page.locator('.pc-compose-identity'),editor=page.locator('.pc-editor-shell');
  assert.equal(await page.locator('.pc-compose-name').textContent(),'Robby Belliveau');assert.equal(await page.locator('.pc-compose-avatar').textContent(),'RB');assert.equal(await identity.getAttribute('title'),'rbelliveau@wbdevelopment.com');
  assert.equal(await page.locator('.pc-toolbar button').count(),9);assert.equal(await page.locator('.pc-toolbar button svg').count(),9);
  const boxes=await Promise.all([strip,identity,editor,page.locator('.pc-compose-footer')].map(node=>node.boundingBox()));
  for(let i=1;i<boxes.length;i++)assert.ok(boxes[i].y>=boxes[i-1].y+boxes[i-1].height,host+' composer order and separation');
  assert.equal(await strip.evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(235, 243, 253)');
  assert.ok(boxes.every(box=>box.x>=0&&box.x+box.width<=1440),host+' composer remains inside the desktop modal');
  await input().fill('Review');await input().evaluate(node=>node.setSelectionRange(0,node.value.length));await page.getByRole('button',{name:'Bold',exact:true}).click();assert.equal(await input().inputValue(),'**Review**');
  await page.getByRole('button',{name:'Preview',exact:true}).click();assert.equal(await page.locator('.pc-preview strong').textContent(),'Review');assert.equal(await page.getByRole('button',{name:'Preview',exact:true}).getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'Preview',exact:true}).click();await page.getByRole('button',{name:'Insert emoji',exact:true}).click();await page.getByRole('button',{name:'👍',exact:true}).click();assert.match(await input().inputValue(),/👍/);
  await page.evaluate(parent=>thread.open(parent),parent);assert.match(await input().inputValue(),/\*\*Review\*\*👍/,'reopening retains the actual formatted draft');
  await input().fill('I’ll confirm the timelines with Legal and update this record.');
  await page.screenshot({path:path.join(output,'delivery-strip-'+host+'.png')});
  await setup({readonly:true});assert.equal(await input().isDisabled(),true);assert.equal(await send().isDisabled(),true);assert.equal(await page.locator('.pc-compose-you').isVisible(),false,'read-only has no false You identity');
 }
 console.log('Desktop shared comments passed: Delivery strip in all three host cascades, resolved author/tooltip, existing formatting/preview/emoji and retained drafts; four parent scopes, stable pending/Posted feedback, slow/failed refresh, duplicate/unknown locks, parent/destroy races and reduced motion. '+output);
}finally{await browser.close();server.close();}
