import fs from 'node:fs';import vm from 'node:vm';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {source,ready,ID,ACCESS,clone} from './fixtures/proforma-sdk-v2-harness.mjs';
function fn(text,name){text=text.replace(/\r\n/g,'\n');const start=text.indexOf('function '+name+'(');assert.ok(start>=0,name);const line=text.slice(start,text.indexOf('\n',start));try{new vm.Script(line);return line;}catch{}const end=text.indexOf('\n}',start)+2,block=text.slice(start,end);new vm.Script(block);return block;}
const baseline=JSON.parse(fs.readFileSync(new URL('./fixtures/proforma-sdk-v1-business-baseline.json',import.meta.url),'utf8'));
for(const [name,expected]of Object.entries(baseline.functions))assert.equal(crypto.createHash('sha256').update(fn(source,name)).digest('hex'),expected,name+' business/label function must remain the original65 function');
{
 const h=await ready();assert.equal(h.widget.S.proformas[0].Name,'Fixture Pro Forma 0');assert.deepEqual(clone(h.widget.pfOwnerIds(h.widget.S.proformas[0])),[ACCESS]);const row=h.document.querySelector('tr[data-pf-id="'+ID+'"]')||h.document.getElementById('listBody');assert.ok(row);assert.match(row.textContent,/Fixture Pro Forma 0/);assert.match(row.textContent,/Fixture Owner|fixture/);
}
console.log('PASS PF SDK2 unchanged financial/phase/payload/permission and author/label functions, actual loaded list name+owner rendering.');
