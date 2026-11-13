import assert from 'node:assert/strict';
import fs from 'node:fs';
import {harness} from './fixtures/proforma-sdk-v2-harness.mjs';
const source=fs.readFileSync('widgets/proforma-manager/src/app/widget.html','utf8').replace('window.__PFW_TEST__={','window.__PFW_TEST__={loiChoiceList,loiComboSource,CFG,');
let cities=[' Temple ','College Station','Temple','','Future City'],fail=false;
const h=harness({source,invoke:config=>{
 if(/^Get_Land_Master_Choices/.test(config.api_name))return fail?{code:2898,message:'Denied'}:{code:3000,details:{output:JSON.stringify({City:cities})}};
}});
await h.c.__pfBoot;await h.widget.ensurePFReferences();
assert.deepEqual(Array.from(h.widget.CFG.choices.cities),['College Station','Future City','Temple']);
assert.deepEqual(Array.from(h.widget.loiChoiceList('City')),['College Station','Future City','Temple']);
assert.deepEqual(Array.from(h.widget.loiComboSource({getAttribute:()=> 'city'})),['College Station','Future City','Temple']);
assert.equal(h.writes.length,0,'City API must be treated as read-only');
for(const value of [null,'College Station']){
 h.widget.S.referenceContext='';cities=value;
 await assert.rejects(h.widget.ensurePFReferences(),/City options/);
 assert.equal(h.widget.pfReferencesReady(),false);
}
h.widget.S.referenceContext='';fail=true;
await assert.rejects(h.widget.ensurePFReferences());
assert.equal(h.widget.pfReferencesReady(),false);
fail=false;cities=['New Global City','College Station'];
await h.widget.ensurePFReferences();
assert.deepEqual(Array.from(h.widget.loiChoiceList('City')),['College Station','New Global City']);
assert.equal(h.writes.length,0);
console.log('PASS global City: both pickers, native envelopes, new values, normalization, denied/malformed reads and retry.');
