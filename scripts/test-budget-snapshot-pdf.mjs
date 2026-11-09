import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {budgetPdfFixture} from './lib/budget-pdf-fixture.mjs';

const root=path.resolve('widgets/budget-manager/src/app'),plain=value=>JSON.parse(JSON.stringify(value));
for(const [file,hash] of [['pdfmake-0.2.20.min.js','c2fd3a5e24db096c9139bb7d266765de433b0b866d03ba356c2ef4d9ae1a53b7'],['pdfmake-0.2.20-fonts.js','f91db5690400fc851536c3a9322f822619f8e9f681abe42013e572d88d3c1f38']])assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'vendor',file))).digest('hex'),hash,'official pinned renderer bytes stay immutable');
const context=vm.createContext({console,Map,Set});
vm.runInContext(fs.readFileSync(path.join(root,'full-budget-export.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'budget-snapshot-pdf.js'),'utf8'),context);
const fixture=budgetPdfFixture(),definition=context.BudgetSnapshotPdf.definition(fixture);
assert.equal(definition.pageSize,'LETTER');assert.equal(definition.pageOrientation,'landscape');
const tables=definition.content.filter(node=>node.table),detail=tables.filter(node=>node.table.widths.length===10),elements=tables.filter(node=>node.table.widths.length===8);
assert.equal(detail.length,21,'empty categories remain visible');
assert.equal(detail.reduce((count,node)=>count+node.table.body.slice(2).filter(row=>row.length===10&&!row[0].colSpan).length,0),227);
assert.equal(elements.length,227);assert.equal(elements.reduce((count,node)=>count+node.table.body.length-2,0),1135);
assert.match(tables[0].table.body[1][4].text,/1,188,716\.12/,'summary uses saved grand Final');
assert.match(detail[0].table.body[0][0].text,/1,234,567\.89/,'category uses saved total, never a recomputed sum');
assert.equal(detail[0].table.body[2][3].text,'','unknown unit rate stays blank');
assert.equal(elements[0].table.body[2][1].text,'\u2014','unknown element remains unknown');
assert.equal(elements[0].table.body[2][2].text,'$0','known zero stays known');
assert.ok(JSON.stringify(definition).includes('-$100.12'));assert.ok(JSON.stringify(definition).includes('-$10.4321'));
assert.ok(JSON.stringify(definition).includes('Jos\u00e9 <Literal>'),'text remains literal with Unicode');
assert.equal(tables.at(-1).table.body[1][5].text,'Saved approval\nSecond line');
assert.deepEqual(plain(definition.footer(2,30)).text,'Page 2 of 30');
for(const node of tables){assert.ok(node.table.widths.reduce((sum,n)=>sum+n,0)+node.table.widths.length*8<=742,'tables fit landscape letter margins');}
// Exact IDs, not equal category labels, determine the saved category assignment.
const sameNames=budgetPdfFixture();Object.assign(sameNames.structure.categories[1],{Category_Code:'100',Budget_Category_Name:'Category 0'});
sameNames.rows.forEach((row,i)=>{if(i%20===1){row[3]='100';row[4]='Category 0';sameNames.elementRows.slice(i*5,i*5+5).forEach(element=>{element[3]='100';element[4]='Category 0';});}});
assert.equal(context.BudgetSnapshotPdf.definition(sameNames).content.filter(node=>node.table?.widths.length===10).length,21);
for(const mutate of [
  s=>s.structure.categories[0].Budget.ID='4410926000001671999',
  s=>s.structure.items[0].Budget_Category.ID='4410926000006999999',
  s=>s.structure.items.pop(),s=>s.itemIds[0]=s.itemIds[1],s=>s.itemIds[0]=Number(s.itemIds[0]),
  s=>s.rows[0][3]='changed',s=>s.rows[0][11]='100',s=>s.elementRows.pop(),
  s=>s.structure.categories[0].Budget_Total='invalid',s=>s.meta.budgetId='4410926000001671999'
]){const snapshot=budgetPdfFixture();mutate(snapshot);assert.throws(()=>context.BudgetSnapshotPdf.definition(snapshot));}
const empty=budgetPdfFixture();empty.rows=[];empty.elementRows=[];empty.itemIds=[];empty.structure.items=[];
assert.ok(context.BudgetSnapshotPdf.definition(empty).content.length>0,'empty saved budgets export without dropping categories');

for(const mode of ['success','error','messageerror','invalid','timeout','constructor']){
  let terminated=0,cleared=0;
  class FakeWorker {
    constructor(url){assert.equal(url,'https://example.com/prod/budget-manager/budget-snapshot-pdf-worker.js?v=122.29.106');if(mode==='constructor')throw new Error('Worker blocked');}
    postMessage(){queueMicrotask(()=>{if(mode==='success')this.onmessage({data:{ok:true,buffer:new Uint8Array([37,80,68,70,45,1]).buffer}});else if(mode==='invalid')this.onmessage({data:{ok:true,buffer:new ArrayBuffer(0)}});else if(mode==='error')this.onerror();else if(mode==='messageerror')this.onmessageerror();});}
    terminate(){terminated++;}
  }
  const client=vm.createContext({URL,Worker:FakeWorker,ArrayBuffer,document:{currentScript:{src:'https://example.com/prod/budget-manager/budget-snapshot-pdf.js?v=122.29.106'}},setTimeout:callback=>{if(mode==='timeout')queueMicrotask(callback);return 1;},clearTimeout:()=>cleared++});
  vm.runInContext(fs.readFileSync(path.join(root,'budget-snapshot-pdf.js'),'utf8'),client);
  if(mode==='success')assert.equal((await client.BudgetSnapshotPdf.render(fixture)).byteLength,6);
  else await assert.rejects(()=>client.BudgetSnapshotPdf.render(fixture));
  assert.equal(terminated,mode==='constructor'?0:1);assert.equal(cleared,1,'every terminal path clears the timeout and disposes the worker');
}

// Execute the production worker and pinned browser builds. The shim replaces
// only the Worker transport/importScripts with local files; no Creator writes.
const pdf=await new Promise((resolve,reject)=>{
  const sandbox={console,setTimeout,clearTimeout,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer};
  const worker=vm.createContext(sandbox);worker.self=worker;worker.location={search:'?v=fixture'};
  worker.addEventListener=()=>{};
  worker.postMessage=message=>message.ok?resolve(Buffer.from(message.buffer)):reject(new Error(message.error));
  worker.importScripts=(...urls)=>urls.forEach(url=>vm.runInContext(fs.readFileSync(path.join(root,url.split('?')[0]),'utf8'),worker,{filename:url}));
  vm.runInContext(fs.readFileSync(path.join(root,'budget-snapshot-pdf-worker.js'),'utf8'),worker);
  worker.onmessage({data:budgetPdfFixture()});
});
assert.equal(pdf.subarray(0,5).toString(),'%PDF-');assert.ok(pdf.length>30000);
const outputIndex=process.argv.indexOf('--output');
if(outputIndex>=0){const output=process.argv[outputIndex+1];fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,pdf);console.log('PDF fixture saved: '+output);}
console.log('Budget PDF: production worker and pinned renderer;227 items,1135 elements,21 exact-ID categories, saved totals, credits, unknown/zero, approvals, Unicode and long-note pagination passed ('+pdf.length+' bytes).');
