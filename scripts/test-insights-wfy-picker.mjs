import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createPFTestDOM} from './fixtures/proforma-sdk-v2-dom.mjs';

const source=fs.readFileSync('widgets/lot-sales-explorer/src/app/insights-controls.js','utf8');
function harness(value,now='2027-01-12T12:00:00') {
  const dom=createPFTestDOM('<body><label>From<input id="from" type="hidden" data-month-picker></label><input id="search"></body>');
  const {document,node}=dom,create=document.createElement;
  const enhance=el=>{
    el.append=(...children)=>children.forEach(child=>el.appendChild(child));
    el.after=child=>el.parentNode.appendChild(child);el.before=el.after;
    el.remove=()=>el.parentNode?.removeChild(el);el.scrollHeight=240;
    return el;
  };
  dom.nodes.forEach(enhance);document.createElement=tag=>enhance(create(tag));
  const control=node('from');control.value=value;
  control.closest=()=>({childNodes:[{nodeType:3,textContent:'From'}]});
  class TestDate extends Date {constructor(...args){super(...(args.length?args:[now]));}}
  const c=vm.createContext({document,Date:TestDate,Map,Set,innerWidth:1200,innerHeight:900,Event:class {constructor(type){this.type=type;}}});
  c.window=c;c.addEventListener=()=>{};
  let changes=0;control.addEventListener('change',()=>changes++);
  vm.runInContext(source,c);
  return {...dom,control,get changes(){return changes;},open:async()=>{await node('fromPicker').fire('click');return node('fromPopup');}};
}
{
  const h=harness('2027-01'),panel=await h.open();
  assert.equal(panel.querySelector('.month-year').textContent,'WFY 2026');
  assert.deepEqual(panel.querySelectorAll('[data-month]').map(b=>b.textContent),['Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan']);
  const january=panel.querySelector('[data-month="0"]');
  assert.equal(january.getAttribute('aria-label'),'Choose January 2027 (WFY 2026)');
  assert.equal(january.getAttribute('aria-pressed'),'true');
  await january.fire('click');assert.equal(h.control.value,'2027-01');assert.equal(h.changes,1);
  assert.equal(h.document.getElementById('fromPopup'),null);assert.equal(h.document.activeElement,h.node('fromPicker'));
}
{
  const h=harness('2026-02'),panel=await h.open();
  assert.equal(panel.querySelector('.month-year').textContent,'WFY 2026');
  await panel.querySelector('[data-step="1"]').fire('click');
  assert.equal(panel.querySelector('.month-year').textContent,'WFY 2027');
  await panel.querySelector('[data-month="0"]').fire('click');assert.equal(h.control.value,'2028-01');
}
{
  const h=harness('2027-01'),panel=await h.open();
  await panel.querySelector('.month-year').fire('click');
  assert.equal(panel.querySelector('[data-step="-1"]').getAttribute('aria-label'),'Previous 12 WFYs');
  assert.equal(panel.querySelector('[data-year="2025"]').getAttribute('aria-label'),'Choose WFY 2025');
  await panel.querySelector('[data-year="2025"]').fire('click');
  await panel.querySelector('[data-month="1"]').fire('click');assert.equal(h.control.value,'2025-02');
}
for(const [now,expected,wfy] of [['2027-01-12T12:00:00','2027-01',2026],['2027-02-01T12:00:00','2027-02',2027]]){
  const h=harness('',now),panel=await h.open();
  assert.equal(panel.querySelector('.month-year').textContent,'WFY '+wfy);
  await panel.querySelector('[data-today]').fire('click');assert.equal(h.control.value,expected);
}
{
  const h=harness('2027-01'),panel=await h.open();
  await panel.querySelector('[data-step="-1"]').fire('click');
  assert.equal(panel.querySelector('.month-year').textContent,'WFY 2025');
  await h.dispatch('keydown',panel,{key:'Escape'});
  assert.equal(h.control.value,'2027-01');assert.equal(h.changes,0);
  assert.equal(h.document.getElementById('fromPopup'),null);assert.equal(h.document.activeElement,h.node('fromPicker'));
}
console.log('PASS Insights WFY picker: February–January ordering, start-year labels, January rollover, WFY navigation, This Month and Escape.');
