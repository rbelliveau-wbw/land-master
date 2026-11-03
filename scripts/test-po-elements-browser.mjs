// Actual shipped PO editor, deterministic native component DTOs; no live writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);let playwright;
try{playwright=require('playwright');}catch{playwright=createRequire(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'))('playwright');}
const output=path.resolve('tmp/po-elements');fs.mkdirSync(output,{recursive:true});
let fixture=fs.readFileSync('scripts/fixtures/purchase-orders.html','utf8');
fixture=fixture.replace("subdivisionCode:'SH01',minorCode:'3225'", "subdivisionCode:'SH01',minorCode:'3225',componentBaselineAvailable:true,unallocatedIssuedCents:'0',unallocatedModificationCents:'0',issuedComponentsAllocated:true,componentBalances:['1','2','3','4','5'].map(costElement=>({costElement,finalCents:String(final/5n),modCents:'0',issuedCents:String(costElement==='5'?issued:0n),availableCents:String(final/5n-(costElement==='5'?issued:0n)),pendingModificationCents:String(costElement==='5'?pending:0n)}))");
const base=path.resolve('widgets/budget-manager/src/app');
const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname.slice(1);if(!name){res.setHeader('Content-Type','text/html');res.end(fixture);return;}const filename=path.resolve(base,name);if(!filename.startsWith(base+path.sep)||!fs.existsSync(filename)){res.writeHead(404).end();return;}res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':'text/css');res.end(fs.readFileSync(filename));});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await playwright.chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1820,height:1050}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(10000);
const moneySlot=(element,metric)=>page.locator(`[data-po-element-value][data-budget-item="1003"][data-element="${element}"][data-metric="${metric}"]`);
try{
  await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#open').click();await page.waitForFunction(()=>!document.querySelector('[data-po-error]')?.textContent&&document.querySelectorAll('[data-po-picker="budgetItemId"]').length>0);await page.waitForTimeout(900);await page.locator('[data-po-picker="budgetItemId"]').click();await page.locator('[data-po-pick="budgetItemId"][data-value="1003"]').click();
  assert.equal(await page.locator('[data-po-picker="costElement"]>span').innerText(),'(5) Other');
  await page.locator('[data-po-picker="costElement"]').click();
  assert.deepEqual(await page.locator('[data-po-pick="costElement"]').allTextContents(),['(1) Labor','(2) Materials','(3) Equipment','(4) Subcontractor','(5) Other']);
  assert.deepEqual(await page.locator('[data-po-pick="costElement"]').evaluateAll(nodes=>nodes.map(node=>node.dataset.value)),['1','2','3','4','5']);
  await page.locator('[data-po-pick="costElement"][data-value="1"]').click();assert.equal(await page.locator('[data-po-picker="costElement"]>span').innerText(),'(1) Labor');
  await page.locator('[data-po-field="quantity"]').fill('3');await page.locator('[data-po-field="unitPrice"]').fill('40.00');
  assert.equal(await page.locator('[data-po-summary-element]').count(),5,'all five elements are displayed once per item');
  assert.equal(await moneySlot('1','budget-left').innerText(),'$10,000');assert.equal(await moneySlot('1','budget-right').innerText(),'$0');assert.equal(await moneySlot('1','budget-result').innerText(),'$10,000');
  assert.equal(await moneySlot('1','available-right').innerText(),'$0');assert.equal(await moneySlot('1','available-result').innerText(),'$10,000');
  assert.equal(await moneySlot('1','remaining-right').innerText(),'$120');assert.equal(await moneySlot('1','remaining-result').innerText(),'$9,880');
  assert.equal(await moneySlot('5','available-right').innerText(),'$35');assert.equal(await moneySlot('5','remaining-result').innerText(),'$9,965');
  assert.equal(await page.locator('[data-po-summary-total]').innerText(),'$120','elements do not multiply the PO total');
  await page.locator('[data-po-picker="costElement"]').scrollIntoViewIfNeeded();await page.locator('[data-po-picker="costElement"]').click();await page.screenshot({path:path.join(output,'element-picker.png')});await page.locator('[data-po-pick="costElement"][data-value="4"]').click();
  assert.equal(await moneySlot('1','remaining-result').innerText(),'$10,000');assert.equal(await moneySlot('4','remaining-result').innerText(),'$9,880');
  await page.locator('[data-po-element-item]').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'element-summary.png')});
  const geometry=await page.locator('.po-line-fields [data-po-picker="costElement"]').evaluate(node=>({width:node.getBoundingClientRect().width,scrollWidth:node.querySelector('span').scrollWidth,clientWidth:node.querySelector('span').clientWidth}));
  assert.ok(geometry.width>=135,'selected element label gets a readable ledger column');assert.ok(geometry.scrollWidth<=geometry.clientWidth+1,'Subcontractor label is not clipped');
  await page.locator('[data-po-close]').first().click();assert.equal(await page.locator('.po-overlay').count(),0);
  await page.locator('#approval').click();await page.locator('[data-po-summary-element]').first().waitFor();
  assert.equal(await moneySlot('5','available-right').innerText(),'$35','saved current PO reservation is removed once from Existing POs');
  assert.equal(await moneySlot('5','available-result').innerText(),'$9,965');assert.equal(await moneySlot('5','remaining-right').innerText(),'$50,065');
  assert.equal(await page.locator('#writes').innerText(),'Writes: 0');assert.deepEqual(errors,[]);
  console.log('PO element desktop: native-value named picker, all-five per-item equation cards, current element edits, unchanged total, saved own-reservation credit and readable ledger labels passed.',geometry);
}catch(error){await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});throw error;}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
