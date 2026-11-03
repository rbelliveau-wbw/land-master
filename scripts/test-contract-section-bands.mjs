import assert from 'node:assert/strict';
import {ready,ID} from './test-contract-sdk-v2-foundation.mjs';

for(const mode of ['legal','construction']){
  const h=await ready({realDOM:true});
  const c=h.c; c.S.workMode=mode;
  const first={...c.findContract(ID),Work_Module:mode==='construction'?'Construction':'Legal',Contract_Type:'DA'};
  const second={...first,ID:'90071992547410222',Contract_Name:'Other request',Contract_Type:'Amendment'};
  c.S.contracts=[first,second];
  const mount=()=>{h.node('view').innerHTML=c.renderTable(c.S.contracts);};
  mount();
  let buttons=c.document.querySelectorAll('.tgroup-toggle');
  assert.equal(buttons.length,2);
  for(const button of buttons)assert.equal(button.getAttribute('aria-expanded'),'true','each section starts expanded');
  let button=buttons[0],body=c.document.getElementById(button.getAttribute('aria-controls'));
  const row=body.children[0],calls=h.calls.length;
  c.toggleRequestSection(button);
  assert.equal(body.hidden,true);assert.equal(button.getAttribute('aria-expanded'),'false');
  assert.equal(body.children[0],row,'collapse retains the mounted record');
  assert.equal(h.calls.length,calls,'collapse does not write or refetch records');
  mount();buttons=c.document.querySelectorAll('.tgroup-toggle');button=buttons[0];
  assert.equal(button.getAttribute('aria-expanded'),'false','refresh retains the intentional collapse');
  assert.equal(buttons[1].getAttribute('aria-expanded'),'true','other section stays expanded');
  c.toggleRequestSection(button);
  assert.equal(c.document.getElementById(button.getAttribute('aria-controls')).hidden,false);
  c.toggleRequestSection(button);
  c.S.workMode=mode==='legal'?'construction':'legal';mount();
  assert.ok(c.document.querySelectorAll('.tgroup-toggle').every(b=>b.getAttribute('aria-expanded')==='true'),'modules have independent section state');
}
console.log('Legal/Construction sections: default open, independent groups and modules, retained rows, no writes, refresh persistence passed.');
