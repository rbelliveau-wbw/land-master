import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createPFTestDOM} from './fixtures/proforma-sdk-v2-dom.mjs';
import {installPFReadiness} from './fixtures/proforma-sdk-v2-readiness.mjs';
import '../widgets/proforma-manager/src/app/phase-sales-engine.js';

const source=fs.readFileSync('widgets/proforma-manager/src/app/widget.html','utf8');
function widgetFunction(name){
  const start=source.indexOf(`function ${name}(`),brace=source.indexOf('{',start);
  assert.ok(start>=0,name);let depth=0;
  for(let i=brace;i<source.length;i++){
    if(source[i]==='{')depth++;
    if(source[i]==='}')depth--;
    if(!depth)return source.slice(start,i+1);
  }
  throw Error(`Unclosed ${name}`);
}

const model={Lots:20,Phases:2,Total_Acres:10,Sale_Price_FF:1000,Lot_Size_Ft:50,
  Engineering_Delay_Months:0,Engineering_Length_Months:1,
  Construction_Delay_Months:0,Construction_Length:1,purchaseDate:{y:2027,m:1},
  phaseSales:[1,2].map(Phase=>({ID:`phase-${Phase}`,Phase,Total_Lots:'10',
    Initial_Take_Lots:'2',Initial_Delay_Months:'0',First_Recurring_Delay_Months:'1',
    Lots_Per_Take:'2',Take_Frequency:'Monthly',Escalator_Enabled:'false',
    Annual_Escalator_Pct:'0',Additional_Markup_Pct:'0'}))};
const dom=createPFTestDOM('<body><div id="edPanes"><div class="ed-pane" data-pane="lotsales"></div></div></body>');
// The parsed fixture retains text/children but does not serialize child
// innerHTML. Populate the timing markup so the real feedback diff sees it.
function hydrateCardTimings(root,markup){
  for(const match of markup.matchAll(/<button\b[^>]*data-ps-select="(\d+)"[^>]*>([\s\S]*?)<\/button>/g)){
    const timing=root.querySelector(`[data-ps-select="${match[1]}"] .ps-card-window`);
    if(timing)timing.innerHTML=match[2].match(/<small class="ps-card-window">([\s\S]*?)<\/small>/)?.[1]||'';
  }
}
const createElement=dom.document.createElement;
dom.document.createElement=tag=>new Proxy(createElement(tag),{
  set(node,key,value){
    Reflect.set(node,key,value);
    if(key==='innerHTML')hydrateCardTimings(node,String(value));
    return true;
  }
});
const pane=dom.document.querySelector('.ed-pane[data-pane="lotsales"]');
const host=dom.document.getElementById('edPanes');
const redraws=[];
let refreshCount=0;
const context=vm.createContext({
  S:{ed:{model,pane:'lotsales',phaseSelected:0,dirty:false}},document:dom.document,
  PhaseSalesEngine:globalThis.PhaseSalesEngine,
  MONTHS_S:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  esc:String,dateToCreatorValue:value=>value||'',
  canSavePf:()=>true,isInputLocked:()=>false,updateDirtyChip(){},
  rerenderPane:name=>redraws.push(name),
  recalcLive(){refreshCount++;attachDomMethods(dom.document.body);context.refreshPhaseSalesFeedback();}
});
vm.runInContext(['num','intN','fmt$','fmtN','fmtPct','ymAdd','ymShort',
  'stripNumberGroups','inFmtN','numericInput','formatNumericInput','formatNumericInputs',
  'phaseSalesSharedLocked',
  'phaseSalesBalance','phaseSalesPlan','phaseMonthTrigger','phaseSalesField',
  'phaseLotPriceValues','phaseSaleUnitPriceParts','finishedPricePerFF','phaseMonthText',
  'panePhaseSales','refreshPhaseSalesFeedback','wireEditInputs']
  .map(widgetFunction).join('\n'),context);
const initialMarkup=context.panePhaseSales();
pane.innerHTML=initialMarkup;
hydrateCardTimings(pane,initialMarkup);

// The shared parsed-markup fixture omits these browser methods. Add only the
// mount/focus behavior this test exercises; keep the real widget event handlers.
function attachDomMethods(node){
  node.matches=selector=>node.tagName==='INPUT'&&(
    selector.includes('input[data-number-format]')&&node.hasAttribute('data-number-format')||
    selector.includes('input[type="number"]')&&node.getAttribute('type')==='number');
  node.replaceWith=next=>{
    const parent=node.parentNode,index=parent.children.indexOf(node);
    assert.ok(index>=0,'replaced feedback was mounted');
    parent.children.splice(index,1,next);next.parentNode=parent;
    function disconnect(old){old.isConnected=false;old.children.forEach(disconnect);}
    if(node.contains(dom.document.activeElement))dom.document.activeElement=dom.document.body;
    disconnect(node);
  };
  node.children.forEach(attachDomMethods);
}
attachDomMethods(dom.document.body);
await installPFReadiness(context);
context.wireEditInputs();

const navigation=pane.querySelector('.ps-nav');
const phaseOne=navigation.querySelector('[data-ps-select="0"]');
const phaseTwo=navigation.querySelector('[data-ps-select="1"]');
const phaseTwoTitle=phaseTwo.querySelector('.ps-nav-title');
const phaseTwoAllocation=phaseTwo.querySelector('small');
const phaseTwoTiming=phaseTwo.querySelector('.ps-card-window');
const sharingSlider=pane.querySelector('[data-ps-shared]');
const delay=pane.querySelector('input[data-ps-k="Initial_Delay_Months"]');
const nextInput=pane.querySelector('input[data-ps-k="First_Recurring_Delay_Months"]');
const firstInput=pane.querySelector('input[data-ps-k="Initial_Take_Lots"]');

// A blur/change fires before the next clicked field or phase button receives
// its click. It must format the edited input without redrawing those targets.
delay.value='2';
delay.focus();
host.oninput({target:delay});
host.onchange({target:delay});
assert.deepEqual(redraws,[],'numeric commits do not redraw the phase pane');
assert.equal(model.phaseSales[0].Initial_Delay_Months,'2');
assert.equal(pane.querySelector('input[data-ps-k="Initial_Delay_Months"]'),delay);
assert.equal(pane.querySelector('input[data-ps-k="First_Recurring_Delay_Months"]'),nextInput);
assert.equal(pane.querySelector('[data-ps-shared]'),sharingSlider,'numeric commits keep the sharing slider mounted');
nextInput.focus();
assert.equal(dom.document.activeElement,nextInput,'the next input remains focusable on the first click');
context.recalcLive();
assert.equal(dom.document.activeElement,nextInput,'live feedback retains input focus');
assert.equal(pane.querySelector('.ps-nav'),navigation);
assert.equal(navigation.querySelector('[data-ps-select="0"]'),phaseOne);
assert.equal(navigation.querySelector('[data-ps-select="1"]'),phaseTwo);
assert.equal(phaseTwo.querySelector('.ps-nav-title'),phaseTwoTitle);
assert.equal(phaseTwo.querySelector('small'),phaseTwoAllocation);
assert.equal(phaseTwo.querySelector('.ps-card-window'),phaseTwoTiming);
assert.match(phaseTwoTiming.textContent,/Const ends Mth 9/,'retained cards receive current schedule feedback');

// A refresh while a phase button has keyboard focus, or between pointer down
// on its allocation label and click, must leave the same controls mounted.
phaseTwo.focus();
model.phaseSales[1].Total_Lots='11';
context.recalcLive();
assert.equal(dom.document.activeElement,phaseTwo,'phase button focus survives live updates');
assert.equal(phaseTwoAllocation.isConnected,true,'the pending pointer target stays mounted');
assert.match(phaseTwoAllocation.textContent,/11 lots/,'lot allocation updates in place');
host.onclick({target:phaseTwoAllocation});
assert.equal(context.S.ed.phaseSelected,1,'the first click selects the destination phase');
assert.deepEqual(redraws,['lotsales'],'an explicit phase selection performs one pane redraw');

// Temporary incomplete/invalid edits hide timing without detaching the card;
// restoring a valid schedule reuses the same timing container.
model.phaseSales[1].Total_Lots='10';
delay.value='1234.5000';
host.oninput({target:delay});
host.onchange({target:delay});
assert.equal(delay.value,'1,234.5000','formatting keeps all entered decimal digits');
assert.equal(model.phaseSales[0].Initial_Delay_Months,'1234.5000','formatting does not alter the draft');
assert.equal(phaseTwoTiming.style.display,'none');
delay.value='0';
host.oninput({target:delay});
assert.equal(phaseTwoTiming.style.display,'');
assert.equal(phaseTwo.querySelector('.ps-card-window'),phaseTwoTiming);
assert.equal(pane.querySelector('input[data-ps-k="Initial_Take_Lots"]'),firstInput);
assert.deepEqual(redraws,['lotsales'],'later numeric commits still preserve the pane');
assert.ok(refreshCount>=6,'input and commit paths refresh calculated feedback');

// An initially incomplete schedule gains its timing when the last required
// phase input is filled, without replacing the navigation or focused editor.
model.phaseSales[1].Total_Lots='';
context.S.ed.phaseSelected=0;
const incompleteMarkup=context.panePhaseSales();
pane.innerHTML=incompleteMarkup;hydrateCardTimings(pane,incompleteMarkup);
attachDomMethods(dom.document.body);
const incompleteNav=pane.querySelector('.ps-nav');
const incompletePhase=incompleteNav.querySelector('[data-ps-select="1"]');
const incompleteInput=pane.querySelector('input[data-ps-k="Initial_Take_Lots"]');
assert.equal(incompletePhase.querySelector('.ps-card-window'),null);
incompleteInput.focus();
model.phaseSales[1].Total_Lots='10';
context.recalcLive();
assert.equal(pane.querySelector('.ps-nav'),incompleteNav);
assert.equal(incompleteNav.querySelector('[data-ps-select="1"]'),incompletePhase);
assert.match(incompletePhase.querySelector('.ps-card-window').textContent,/Const ends Mth 7/);
assert.equal(dom.document.activeElement,incompleteInput);
console.log('Phase input commits preserve first-click targets; live schedules retain phase navigation and focus.');
