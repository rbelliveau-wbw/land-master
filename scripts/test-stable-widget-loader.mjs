import assert from 'node:assert/strict';
import vm from 'node:vm';
import {stableWidgetLoader} from './stable-widget-loader.mjs';

async function run(params, {framed = true, failed = false} = {}) {
  let inserted, fetched, written, error;
  const html = stableWidgetLoader('budget-manager','test',true);
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const doc = {
    createElement:()=>({}), head:{appendChild:s=>{inserted=s;}},
    getElementById:()=>({set textContent(s){error=s;}}),
    open(){},close(){},write(s){written=s;}
  };
  const window = {}; window.parent=framed?{}:window;
  const context = {document:doc,window,location:{href:'https://rbelliveau-wbw.github.io/land-master/prod/budget-manager/'}, URL,Date,Promise,setTimeout:()=>1,clearTimeout(){},console:{error(){}},
    ZOHO:{CREATOR:{UTIL:{getInitParams:()=>failed?Promise.reject(new Error('offline')):Promise.resolve(params)}}},
    fetch:async(url,opts)=>{fetched={url,opts};return{ok:true,text:async()=>'<html><head><script src="https://static.zohocdn.com/creator/widgets/version/2.0/widgetsdk-min.js"></script><script src="./creator-data.js"></script></head><body>Ready</body></html>'};}};
  vm.runInNewContext(script,context);
  if(inserted)inserted.onload();
  for(let i=0;i<12;i++)await Promise.resolve();
  return {fetched,written,error,window,html};
}
for(const [fragment,env] of [['','prod'],['environment/development','dev'],['environment/stage','stage']]) {
  const r=await run({envUrlFragment:fragment,loginUser:'test'});
  assert.equal(new URL(r.fetched.url).pathname,`/land-master/${env}/budget-manager/widget.html`);
  assert.equal(r.fetched.opts.cache,'no-store');
  assert.match(r.fetched.url,/\?_lmcb=\d+$/);
  assert.match(r.written,new RegExp(`<base href="https://rbelliveau-wbw.github.io/land-master/${env}/budget-manager/">`));
  assert(!r.written.includes('widgetsdk-min.js'));
  assert.equal(r.window.LMFrontendContext.params.envUrlFragment,fragment);
  assert(!r.html.includes('location.replace'));
  assert(!r.html.includes('<iframe'));
}
for(const params of [{},null,{envUrlFragment:'unknown'}]) {
  const r=await run(params);assert(!r.fetched);assert.match(r.error,/Could not load/);
}
assert(!(await run(null,{failed:true})).fetched);
const direct=await run(null,{framed:false});assert.equal(direct.fetched.url.split('?')[0],'./widget.html');
assert(direct.written.includes('widgetsdk-min.js'));
console.log('Stable frontend routing checks passed: authenticated Dev/Stage/Prod, unchanged iframe, fail closed, asset base, SDK reuse.');
