import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';

const runtime=vm.createContext({});
vm.runInContext(`
var tables={},thisapp={},mails=[],zoho={loginuser:'owner',adminuser:'owner',currentdate:'2026-11-12'};
function ifnull(v,f){return v==null?f:v;} function List(){return [];} function Map(){return {};}
function recordValues(...pairs){var r={};for(var i=0;i<pairs.length;i+=2)r[pairs[i]]=pairs[i+1];return r;}
Object.defineProperties(Object.prototype,{get:{value:function(k){return this[k]??null;}},put:{value:function(k,v){this[k]=v;}}});
Array.prototype.add=function(v){this.push(v);};Array.prototype.get=function(k){return this[k]??null;};Array.prototype.count=Array.prototype.size=function(){return this.length;};
String.prototype.toLong=String.prototype.toDecimal=function(){return Number(this);};String.prototype.contains=function(v){return this.includes(v);};
String.prototype.replaceAll=function(p,v){return this.replace(new RegExp(p,'g'),v);};
Number.prototype.toLong=Number.prototype.toDecimal=function(){return Number(this);};Number.prototype.abs=function(){return Math.abs(this);};Number.prototype.text=function(){return '$'+Number(this).toLocaleString('en-US',{maximumFractionDigits:4});};
var relations={Budget_Category:'Budget_Category',Budget_Item:'Budget_Item',Budget:'Add_Budget'};
function record(form,row){return new Proxy(row,{get(o,k){if(k==='valueOf')return ()=>o.ID;if(k==='toString')return ()=>String(o.ID);if(relations[k]&&o[k]!=null){var t=(tables[relations[k]]||[]).find(v=>v.ID===o[k]);return t?record(relations[k],t):null;}return o[k]??null;},set(o,k,v){if(form!=='Budget_Approvals'||k!=='Sent_Date')throw Error('Unexpected write');o[k]=v;return true;}});}
function query(form,predicate,sort){var r=(tables[form]||[]).map(row=>record(form,row)).filter(predicate);if(sort)r.sort((a,b)=>a[sort]>b[sort]?1:a[sort]<b[sort]?-1:0);return new Proxy(r,{get(a,k){return k in a||typeof k==='symbol'?a[k]:a[0]?.[k]??null;}});}
`,runtime);
function compile(source){
  source=source.replace(/sendmail\s*\[\s*from\s*:fromAddress\s*to\s*:approverEmail\s*subject\s*:emailSubject\s*message\s*:emailBody\s*\]/g,'mails.add(recordValues("to",approverEmail,"body",emailBody));');
  return translate(source.replace(/\{([^{}]*)\}/g,(w,b)=>/^\s*"(?:\\.|[^"\\])*"\s*:/.test(b)?`recordValues(${b.replace(/(^|,)\s*("(?:\\.|[^"\\])*")\s*:/g,'$1$2,')})`:w)).js;
}
for(const name of ['budgetElementExportValues','budgetElementExportRows','budgetElementExportHtml','sendApprovalEmail']){
  vm.runInContext(compile(fs.readFileSync(`creator/functions/${name}.dg`,'utf8'))+`;thisapp.${name}=${name};`,runtime);
}
const elements=['Labor','Materials','Equipment','Subcontractor','Other'];
function item(id,category,code,name,prelim,pending,hcss,gp){
  const r={ID:id,Budget_Category:category,Cost_Code:code,Item_Name:name,Prelim_Budget_Ttl:prelim.reduce((a,b)=>a+b,0),Unapproved_Final_Budget_Ttl:pending.reduce((a,b)=>a+b,0),HCSS_Actuals:hcss.reduce((a,b)=>a+b,0),PROJ_Actual:gp.reduce((a,b)=>a+b,0)};
  elements.forEach((e,i)=>{r['Prelim_'+e+'_Budget']=prelim[i];r['HCSS_'+e+'_Actuals']=hcss[i];r['GP_'+e+'_Actuals']=gp[i];});
  return r;
}
const construction=item(21,11,'3101','Clearing & <Brush>',[10000,0,0,0,0],[500,0,1500,0,0],[0,0,0,0,0],[0,0,0,0,0]);
const credit=item(22,12,'3201','Credit',[0,0,0,0,0],[-50,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]);
runtime.tables={Add_Budget:[{ID:1,Budget_Name:'Test Budget'}],Budget_Approvals:[{ID:2,Budget:1,Approver:'brian@example.test',Title:'VP',Type1:'Construction',Sort_Order:1}],Budget_Category:[{ID:11,Budget:1,Category_Code:'3100',Budget_Category_Name:'Clearing',Deparment:'Construction'},{ID:12,Budget:1,Category_Code:'3200',Budget_Category_Name:'Streets',Deparment:'Construction'},{ID:13,Budget:1,Category_Code:'1100',Budget_Category_Name:'Development',Deparment:'Development'},{ID:14,Budget:99,Category_Code:'9900',Budget_Category_Name:'Other Budget',Deparment:'Construction'}],Budget_Item:[construction,credit,item(23,13,'1101','Development Only',[1,0,0,0,0],[1,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]),item(24,14,'9901','Other Budget',[1,0,0,0,0],[1,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0])],Budget_Import_Item:[construction,credit].map((r,i)=>({ID:31+i,Budget_Item:r.ID,Data_Source:'HeavyJob Budget',Cost:r.Unapproved_Final_Budget_Ttl,...Object.fromEntries(elements.map((e,n)=>[e,i===0?[500,0,1500,0,0][n]:[-50,0,0,0,0][n]]))})),Budget_Modification:[]};
vm.runInContext('tables=JSON.parse(JSON.stringify(tables));',runtime);
function render(){runtime.sendApprovalEmail(1,2);return runtime.mails.at(-1).body;}
let html=render();
assert.ok(html.indexOf('Open Approval Page')<html.indexOf('Unapproved Summary'));
assert.equal((html.match(/Open Approval Page/g)||[]).length,1);
assert.match(html,/3101 Clearing &amp; &lt;Brush&gt;/);
assert.doesNotMatch(html,/Development Only|Other Budget/);
assert.doesNotMatch(html,/\(2\) Materials<\/th><td/,'zero-only detail hidden');
assert.doesNotMatch(html,/\(4\) Subcontractor<\/th><td/);
assert.match(html,/\$-50/,'signed credit retained');
assert.match(html,/\$1,950/,'grand total from saved Unapproved');
assert.match(html,/\$450/,'element column total includes credit');
assert.equal((html.match(/>Code\/Element</g)||[]).length,1);
assert.match(html,/>Preliminary<.*>Unapproved<.*>HCSS Actuals<.*>GP Actuals</);
assert.match(html,/background:#fff3cd/);
assert.equal(runtime.tables.Budget_Approvals[0].Sent_Date,'2026-11-12');
const original=html;
for(const recipient of ['doug@example.test','other@example.test']){
  runtime.tables.Budget_Approvals[0].Approver=recipient;
  assert.equal(render(),original,'same amounts for every recipient');
}
runtime.tables.Budget_Item[0].Prelim_Materials_Budget=null;
html=render();assert.match(html,/\(2\) Materials<\/th><td/,'unknown is not zero');
runtime.tables.Budget_Import_Item[0].Cost=2001;
html=render();assert.match(html,/—/);assert.match(html,/\$1,950/,'missing allocation does not erase parent total');
runtime.tables.Budget_Approvals[0].Type1='Development';
html=render();assert.doesNotMatch(html,/Unapproved Summary|3101 Clearing|Other Budget/);assert.match(html,/Development Only/);assert.match(html,/Approved Mods/,'shared Development layout retained');
runtime.tables.Budget_Approvals[0].Type1='Purchase Order';
const count=runtime.mails.length;assert.match(runtime.sendApprovalEmail(1,2),/combined PO email/);assert.equal(runtime.mails.length,count);
if(process.argv[2])fs.writeFileSync(process.argv[2],original);
console.log('PASS Construction email: real Deluge bodies, native lookup shapes, scope, totals, signed credits, known-zero suppression, unavailable allocations, recipient parity, escaping, Development/PO isolation, and delivery stamp. No live mail sent.');
