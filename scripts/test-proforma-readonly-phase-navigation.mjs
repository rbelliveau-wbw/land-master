import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('widgets/proforma-manager/src/app/widget.html','utf8');
const start=source.indexOf('function applyInputLock(){');
const end=source.indexOf('\n/* Save is gated',start);
assert.ok(start>=0&&end>start);

function control(selector,{disabled=false,loi=false,lotSales=true}={}){
  return {
    disabled,dataset:{},
    closest:query=>loi&&query.includes('"loi"')?{}:(lotSales&&query.includes('"lotsales"')?{}:null),
    matches:query=>query.split(',').some(part=>part.trim()===selector)
  };
}
function check({locked,canSave}){
  const phase=control('[data-ps-select]');
  const input=control('[data-ps-k]');
  const frequency=control('[data-ps-frequency]');
  const shared=control('[data-ps-shared]');
  const alreadyDisabled=control('[data-ps-k]',{disabled:true});
  const controls=[phase,input,frequency,shared,alreadyDisabled];
  const classes=new Map();
  const host={
    classList:{toggle:(name,value)=>classes.set(name,value)},
    querySelectorAll:()=>controls
  };
  const context=vm.createContext({
    document:{getElementById:()=>host},
    S:{ed:{model:{}}},
    isInputLocked:()=>locked,
    isLOIApprovalLocked:()=>false,
    canSavePf:()=>canSave
  });
  vm.runInContext(source.slice(start,end),context);
  vm.runInContext('applyInputLock()',context);
  assert.equal(phase.disabled,false,'phase navigation stays usable');
  assert.equal(input.disabled,locked||!canSave,'phase values stay read only');
  assert.equal(frequency.disabled,locked||!canSave,'frequency stays read only');
  assert.equal(shared.disabled,locked||!canSave,'shared settings stay read only');
  assert.equal(alreadyDisabled.disabled,true,'pre-disabled fields stay disabled');
  assert.equal(classes.get('input-lock'),locked);
}

check({locked:true,canSave:true});
check({locked:true,canSave:false});
check({locked:false,canSave:false});
check({locked:false,canSave:true});
console.log('Read-only phase navigation tests passed.');
