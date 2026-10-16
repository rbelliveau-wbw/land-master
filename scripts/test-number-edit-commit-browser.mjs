// Four real presentation engines; native keyboard events and synthetic calculations, no Creator calls.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const engines={shared:'shared',pf:'widgets/proforma-manager/src/app',insights:'widgets/lot-sales-explorer/src/app',forecast:'widgets/forecast-manager/src/app'};
const server=http.createServer((req,res)=>{
  const [engine,file]=new URL(req.url,'http://fixture').pathname.slice(1).split('/');
  if(!engines[engine]){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',(file?.endsWith('.js')?'text/javascript':file?.endsWith('.css')?'text/css':'text/html')+'; charset=utf-8');
  if(file){res.end(fs.readFileSync(path.join(file==='number-edit-commit.js'?'shared':engines[engine],file),'utf8'));return;}
  res.end(`<!doctype html><link rel="stylesheet" href="/${engine}/number-transitions.css"><script src="/${engine}/number-edit-commit.js"></script><script src="/${engine}/number-transitions.js"></script><style>body{font:20px Arial;padding:40px}input,button{font:inherit;margin:20px}#derived{margin:20px;color:rgb(0,100,0)}#requestBalance .request-balance-negative,.fs-balance.negative #derived,#derived.negative{color:rgb(180,0,0)}</style><input id="driver" value="1"><input id="next" value="2"><button id="choice">Change measure</button><div id="requestBalance" class="fs-balance"><div id="derived" class="rv"></div></div>`);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];
page.setDefaultTimeout(5000);page.on('pageerror',e=>errors.push(e.message));
try{
 for(const engine of Object.keys(engines)){
  console.log('Checking '+engine);
  await page.goto(`http://127.0.0.1:${server.address().port}/${engine}`);
  await page.evaluate(engine=>{
    const host=document.getElementById('derived');window.__model=1;
    const format=n=>window.__specialValue===undefined?(engine==='forecast'?'':'$')+(n*1000).toLocaleString('en-US'):window.__specialValue;
    let observer;
    window.__render=n=>{
      const value=format(n);
      host.classList.toggle('request-balance-negative',!!window.__negative);host.classList.toggle('negative',!!window.__negative);host.parentElement.classList.toggle('negative',!!window.__negative);
      if(engine==='shared'){host.textContent=value;observer?.flush();}
      if(engine==='pf'){const old=window.__emptyComparisons?new Map():PFNumbers.capture(host);host.textContent=value;PFNumbers.display(host,'derived');PFNumbers.apply(host,old);}
      if(engine==='insights'){const old=window.__emptyComparisons?new Map():InsightsNumbers.capture(host);host.innerHTML=InsightsNumbers.markup(value,'derived');InsightsNumbers.apply(host,old);}
      if(engine==='forecast'){if(window.__scalarText)ForecastNumbers.text(host,value,'derived');else{const old=window.__emptyComparisons?new Map():ForecastNumbers.capture(host);host.innerHTML=ForecastNumbers.markup(value,'derived');ForecastNumbers.apply(host,old);}}
    };
    if(engine==='shared')observer=LMNumbers.start({module:'fixture',root:document.body,collect:api=>api.text(host,'derived')});
    __render(1);
    document.getElementById('driver').addEventListener('input',event=>{__model=Number(event.target.value);__render(__model);});
    // A native change can rebuild the held output before focusout fires.
    document.getElementById('driver').addEventListener('change',()=>__render(__model));
    document.getElementById('choice').addEventListener('click',()=>__render(9));
  },engine);
  const changing='.lm-number-changing,.pf-number-changing,.is-changing',held='.number-edit-pending';
  const settle=()=>page.waitForFunction(selector=>!document.querySelector(selector),changing);
  assert.equal(await page.locator(changing).count(),0,engine+' initial appearance');
  await page.locator('#driver').focus();await page.evaluate(()=>__render(2));
  assert.ok(await page.locator(changing).count()>0,engine+' focus alone never delays a response');await settle();
  await page.evaluate(()=>__render(1));await settle();
  const beforeBounds=await page.locator('#derived > span').evaluate(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};});
  await page.evaluate(()=>{window.__emptyComparisons=true;});
  await page.locator('#driver').fill('12.3456789');
  assert.equal(await page.locator('#driver').inputValue(),'12.3456789');assert.equal(await page.evaluate(()=>__model),12.3456789);
  assert.equal(await page.locator(changing).count(),0,engine+' no transition while typing');
  assert.equal(await page.locator(held).count(),1,engine+' only presentation held');
  const heldBounds=await page.locator(held).evaluate(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};});
  for(const dimension of ['x','y','width','height'])assert.ok(Math.abs(heldBounds[dimension]-beforeBounds[dimension])<0.1,engine+' held '+dimension+' must not shift: '+JSON.stringify({beforeBounds,heldBounds}));
  assert.match(await page.locator('#derived').textContent(),/12,345.679/,'latest calculated DOM text stays available');
  const visual=await page.locator(held).evaluate(n=>({from:n.dataset.numberEditFrom,opacity:getComputedStyle(n.firstElementChild).opacity,before:getComputedStyle(n,'::before').content}));
  assert.match(visual.from,/1,000/);assert.equal(visual.opacity,'0');assert.match(visual.before,/1,000/);
  await page.evaluate(engine=>{const host=document.getElementById('derived');if(engine==='pf')PFNumbers.apply(host,new Map());if(engine==='insights')InsightsNumbers.apply(host,new Map());if(engine==='forecast')ForecastNumbers.apply(host,new Map());},engine);
  assert.match(await page.locator(held).getAttribute('data-number-edit-from'),/1,000/,'a second renderer with no comparison cannot blank the held number');
  await page.locator('#driver').fill('42');assert.match(await page.locator(held).getAttribute('data-number-edit-from'),/1,000/,'successive keystrokes retain one baseline');
  await page.locator('#driver').press('Tab');
  await page.waitForFunction(selector=>!!document.querySelector(selector),changing,{timeout:2500}).catch(async error=>{console.error({engine,html:await page.locator('#derived').innerHTML(),errors});throw error;});
  assert.equal(await page.locator(held).count(),0);assert.match(await page.locator('#derived').textContent(),/42,000/);
  await settle();
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#driver').fill('3');
  assert.equal(await page.locator(held).count(),1,engine+' reduced motion still respects field exit');
  await page.locator('#driver').press('Tab');await page.waitForTimeout(30);
  assert.equal(await page.locator(held).count(),0);assert.equal(await page.locator(changing).count(),0);assert.match(await page.locator('#derived').textContent(),/3,000/);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('#driver').fill('3');await page.locator('#driver').press('Tab');await page.waitForTimeout(30);
  assert.equal(await page.locator(changing).count(),0,engine+' unchanged committed result stays still');
  await page.evaluate(()=>{window.__emptyComparisons=false;});
  await page.locator('#choice').click();assert.ok(await page.locator(changing).count()>0,engine+' explicit choices remain immediate');await settle();
  for(const align of ['left','center','right']){
    await page.evaluate(align=>{const host=document.getElementById('derived');host.style.textAlign=align;host.style.width='320px';host.style.fontFamily=align==='center'?'monospace':'Arial';document.getElementById('driver').value='1';__render(1);},align);await settle();
    const rect=()=>page.locator('#derived > span').evaluate(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};});
    const before=await rect();
    for(const value of ['123456789','0.001']){
      await page.locator('#driver').fill(value);const during=await rect();
      for(const dimension of ['x','y','width','height'])assert.ok(Math.abs(during[dimension]-before[dimension])<0.1,engine+' '+align+' holds exact '+dimension+' across longer/shorter incoming numbers');
    }
    await page.locator('#driver').press('Tab');await settle();
  }

  // Budget's remaining-request amount and Forecast's balance are real host
  // patterns: their semantic class changes synchronously in original handlers.
  await page.evaluate(()=>{window.__scalarText=true;window.__specialValue='$1,000';window.__negative=false;__render(1);});await settle();
  const scalarBefore=await page.locator('#derived > span').evaluate(n=>({color:getComputedStyle(n).color,x:n.getBoundingClientRect().x,width:n.getBoundingClientRect().width}));
  for(const value of ['-$99,999','—','—','','']){
    await page.evaluate(value=>{window.__specialValue=value;window.__negative=true;},value);
    await page.locator('#driver').fill(String(11+(await page.locator('#driver').inputValue()).length));
    assert.equal(await page.locator(held).count(),1,engine+' complete scalar survives intermediate '+JSON.stringify(value)+'; '+await page.locator('#derived').innerHTML());
    const visual=await page.locator(held).evaluate(n=>({text:n.dataset.numberEditFrom,color:getComputedStyle(n,'::before').color,x:n.getBoundingClientRect().x,width:n.getBoundingClientRect().width}));
    assert.equal(visual.text,'$1,000',engine+' original complete scalar is retained');assert.equal(visual.color,scalarBefore.color,engine+' old semantic color remains while typing');
    assert.ok(Math.abs(visual.x-scalarBefore.x)<0.1&&Math.abs(visual.width-scalarBefore.width)<0.1,engine+' unknown and blank results do not change held geometry');
    assert.equal(await page.locator('#derived').textContent(),value,engine+' authoritative scalar DOM text remains current');
    assert.equal(await page.locator(changing).count(),0,engine+' intermediate scalar results never animate');
  }
  await page.locator('#driver').press('Tab');await page.waitForTimeout(35);
  assert.equal(await page.locator(held).count(),0);assert.equal(await page.locator(changing).count(),0,engine+' unknown destinations remain static at commit');
  await page.evaluate(()=>{window.__specialValue='$500';window.__negative=false;__render(1);});await settle();
  await page.evaluate(()=>{window.__specialValue='-$900';window.__negative=true;});await page.locator('#driver').fill('14');
  assert.equal(await page.locator(held).evaluate(n=>getComputedStyle(n,'::before').color),'rgb(0, 100, 0)',engine+' positive baseline retains its color');
  await page.locator('#driver').press('Tab');await page.waitForFunction(selector=>!!document.querySelector(selector),changing);
  const colorPair=await page.locator(changing).evaluate(n=>({from:getComputedStyle(n,'::before').color,to:getComputedStyle(n.firstElementChild).color}));
  assert.deepEqual(colorPair,{from:'rgb(0, 100, 0)',to:'rgb(180, 0, 0)'},engine+' committed transition keeps each value in its own semantic color');await settle();
  if(engine==='shared'||engine==='pf'){
    await page.evaluate(()=>{window.__specialValue='31.2%';window.__negative=false;__render(1);});await settle();
    await page.evaluate(()=>{window.__specialValue='1.2e+277%';});await page.locator('#driver').fill('15');
    assert.equal(await page.locator(held).count(),1,engine+' scientific percentage remains one complete scalar');
    assert.equal(await page.locator(held).getAttribute('data-number-edit-from'),'31.2%');
    assert.equal(await page.locator('#derived').textContent(),'1.2e+277%');
    await page.locator('#driver').press('Tab');await settle();
  }

 }
 assert.deepEqual(errors,[]);
 console.log('PASS: all four engines hold complete typed scalar visuals and semantic colors through signed, unknown and blank results until Tab/blur; preserve exact native/model/DOM values, geometry and scientific percentage suffixes; retain one baseline through repeated input/native-change replacement; respect reduced motion and keep explicit choices immediate.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
