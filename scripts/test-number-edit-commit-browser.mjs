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
  res.setHeader('Content-Type',file?.endsWith('.js')?'text/javascript':file?.endsWith('.css')?'text/css':'text/html');
  if(file){res.end(fs.readFileSync(path.join(file==='number-edit-commit.js'?'shared':engines[engine],file),'utf8'));return;}
  res.end(`<!doctype html><link rel="stylesheet" href="/${engine}/number-transitions.css"><script src="/${engine}/number-edit-commit.js"></script><script src="/${engine}/number-transitions.js"></script><style>body{font:20px Arial;padding:40px}input,button{font:inherit;margin:20px}#derived{margin:20px}</style><input id="driver" value="1"><input id="next" value="2"><button id="choice">Change measure</button><div id="derived"></div>`);
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
    const format=n=>(engine==='forecast'?'':'$')+(n*1000).toLocaleString('en-US');
    let observer;
    window.__render=n=>{
      const value=format(n);
      if(engine==='shared'){host.textContent=value;observer?.flush();}
      if(engine==='pf'){const old=PFNumbers.capture(host);host.textContent=value;PFNumbers.decorate(host,'derived');PFNumbers.apply(host,old);}
      if(engine==='insights'){const old=InsightsNumbers.capture(host);host.innerHTML=InsightsNumbers.markup(value,'derived');InsightsNumbers.apply(host,old);}
      if(engine==='forecast'){const old=ForecastNumbers.capture(host);host.innerHTML=ForecastNumbers.markup(value,'derived');ForecastNumbers.apply(host,old);}
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
  await page.locator('#driver').fill('12.3456789');
  assert.equal(await page.locator('#driver').inputValue(),'12.3456789');assert.equal(await page.evaluate(()=>__model),12.3456789);
  assert.equal(await page.locator(changing).count(),0,engine+' no transition while typing');
  assert.equal(await page.locator(held).count(),1,engine+' only presentation held');
  assert.match(await page.locator('#derived').textContent(),/12,345.679/,'latest calculated DOM text stays available');
  const visual=await page.locator(held).evaluate(n=>({from:n.dataset.numberEditFrom,opacity:getComputedStyle(n.firstElementChild).opacity,before:getComputedStyle(n,'::before').content}));
  assert.match(visual.from,/1,000/);assert.equal(visual.opacity,'0');assert.match(visual.before,/1,000/);
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
  await page.locator('#choice').click();assert.ok(await page.locator(changing).count()>0,engine+' explicit choices remain immediate');await settle();
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: all four engines hold typed derived visuals until Tab/blur, preserve exact native/model/DOM values, retain one baseline through repeated input and native-change node replacement, respect reduced motion and keep explicit choices immediate.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
