// Execute the actual email renderer with isolated captured facts. No native calls/sends.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {compileDelugePO} from './test-po-test-cfo-backend.mjs';

const content={outcome:'Approved',revision:'sample-submission-2026-11-10',objectId:'4410926123456000001',budgetId:'4410926123456000002',phaseName:'Eagle Prairie / Phase 01',vendorName:'A Greater Austin <Development> & Construction',amount:'187132.50',url:'#sample-po',costCodes:[{code:'5100',cents:9250000},{code:'5200',cents:6386250},{code:'6100',cents:3077000}]};
assert.equal(content.costCodes.reduce((sum,row)=>sum+row.cents,0),18713250);
const source=fs.readFileSync('creator/functions/renderPurchaseOrderOutcomeEmail.dg','utf8');
const context=vm.createContext({contentJSON:JSON.stringify(content)});
vm.runInContext(`
function map(value){if(!value||typeof value!=='object')return value;if(Array.isArray(value))return value.map(map);for(const key of Object.keys(value))value[key]=map(value[key]);Object.defineProperties(value,{get:{value(key){return this[key]??null;}},put:{value(key,value){this[key]=map(value);}},toString:{value(){return JSON.stringify(this);}}});return value;}
function Map(){return map({});}function ifnull(value,fallback){return value==null?fallback:value;}
function recordValues(...pairs){const value={};for(let i=0;i<pairs.length;i+=2)value[pairs[i]]=pairs[i+1];return map(value);}
String.prototype.toDecimal=function(){return Number(this);};String.prototype.toMap=function(){return map(JSON.parse(this));};String.prototype.replaceAll=function(pattern,value){return this.replace(new RegExp(pattern,'g'),value);};
Number.prototype.toDecimal=function(){return Number(this);};Number.prototype.text=function(){return '$'+this.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});};
var content=map(JSON.parse(contentJSON));
${compileDelugePO(source)}
var rendered=renderPurchaseOrderOutcomeEmail(content);
`,context);
const result=context.rendered;assert.equal(result.success,true,result.error||'Actual email renderer failed');
for(const amount of ['$187,132.50','$92,500.00','$63,862.50','$30,770.00'])assert.ok(result.body.includes(amount));
assert.match(result.body,/A Greater Austin &lt;Development&gt; &amp; Construction/);assert.match(result.body,/Eagle Prairie \/ Phase 01/);assert.doesNotMatch(result.body,/attached Excel|workbook|Budget Item/i);
const output=path.resolve(process.argv[2]||'tmp/po-outcome-email-preview');fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'body.html'),result.body);
const document=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Actual Approved PO Email — Local Preview</title><style>html,body{margin:0;background:#f0f3f7;color:#17304c;font:13px/1.5 Arial,Helvetica,sans-serif}.preview-envelope{box-sizing:border-box;max-width:650px;margin:24px auto 0;padding:22px 25px;background:white;border:1px solid #e4e9ef;border-radius:8px}.preview-envelope h1{margin:0 0 15px;font-size:18px;line-height:1.4}.preview-envelope p{margin:5px 0;color:#64748b;font-size:12px}.preview-envelope strong{color:#17304c}.preview-label{margin:0 auto;max-width:650px;padding:14px 20px 0;box-sizing:border-box;color:#7c8b9e;font-size:11px;display:flex;justify-content:space-between;gap:16px}@media(max-width:680px){.preview-envelope{margin:12px 12px 0}.preview-label{margin:0 12px}}</style></head><body><div class="preview-label"><span>ACTUAL EMAIL RENDERER</span><span>Local sample · No send</span></div><header class="preview-envelope"><h1>Purchase Order Approved · Eagle Prairie / Phase 01 · $187,132.50</h1><p><strong>From</strong> Notifications@wbdevelopment.com</p><p><strong>To</strong> Sam, Sokha Sim, Kimberly M. Singer, Michael Wilson, Construction PM</p></header>${result.body}</body></html>`;
fs.writeFileSync(path.join(output,'approved-email.html'),document);fs.writeFileSync(path.join(output,'captured-content.json'),JSON.stringify(content,null,2)+'\n');
console.log('Actual renderer preview: '+path.join(output,'approved-email.html'));
