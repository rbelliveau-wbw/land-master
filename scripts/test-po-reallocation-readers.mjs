// Execute the actual native workbook/email readers. The authenticated bundle is
// a native-shaped verified DTO; no Creator request or real email is performed.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';

function compile(source){
  source=source.replace(/insert into (\w+)\s*\[([^\]]+)\]/g,(_,form,body)=>`insertRecord("${form}",recordValues(${body.trim().split('\n').map(line=>{const match=line.trim().match(/^(\w+)=(.*)$/);assert.ok(match,line);return JSON.stringify(match[1])+','+match[2];}).join(',')}))`);
  source=source.replace(/sendmail\s*\[([^\]]+)\]/g,(_,body)=>'sendMail(recordValues('+body.trim().split('\n').map(line=>{const match=line.trim().match(/^(\w+)\s*:(.*)$/);assert.ok(match,line);return JSON.stringify(match[1])+','+match[2].replace(/^\s*file:/,'');}).join(',')+'));');
  for(;;){const next=source.replace(/\{([^{}]*)\}/g,(whole,body)=>/^\s*"(?:\\.|[^"\\])*"\s*:/.test(body)?'recordValues('+body.replace(/(^|,)\s*("(?:\\.|[^"\\])*")\s*:/g,'$1$2,')+')':whole);if(next===source)break;source=next;}
  return translate(source).js.replace(/\.length\(\)/g,'.length').replace(/catch\s*\(\s*(\w+)\s*\)\s*\{/g,(_,error)=>'catch('+error+') { throw '+error+';');
}
const programs=['activityEmailClaim','poExcelWorkbook','sendPurchaseOrderEmail'].map(name=>compile(fs.readFileSync('creator/functions/'+name+'.dg','utf8'))+';thisapp.'+name+'='+name+';').join('\n');
function runtime(modifications){
  const c=vm.createContext({input:modifications});
  vm.runInContext(`
  input=JSON.parse(JSON.stringify(input));
  function map(value){if(!value||typeof value!=='object'||Array.isArray(value)||Object.prototype.hasOwnProperty.call(value,'get'))return value;for(var key of Object.keys(value))value[key]=Array.isArray(value[key])?value[key].map(map):map(value[key]);Object.defineProperties(value,{get:{value:function(key){return this[key]??null;}},put:{value:function(key,value){this[key]=map(value);}},toString:{value:function(){return JSON.stringify(this);}}});return value;}
  function Map(){return map({});}function List(){return [];}function ifnull(value,fallback){return value==null?fallback:value;}function choose(condition,yes,no){return condition?yes:no;}
  function recordValues(...pairs){var value={};for(var i=0;i<pairs.length;i+=2)value[pairs[i]]=pairs[i+1];return map(value);}
  Array.prototype.add=function(value){this.push(value);};Array.prototype.get=function(index){return this[index]??null;};Array.prototype.size=Array.prototype.count=function(){return this.length;};Array.prototype.contains=function(value){return this.includes(value);};
  String.prototype.toLong=String.prototype.toDecimal=function(){return Number(this);};String.prototype.matches=function(pattern){return new RegExp('^(?:'+pattern+')$').test(this);};String.prototype.replaceAll=function(pattern,value){return this.replace(new RegExp(pattern,'g'),value);};String.prototype.toFile=function(name){return {name,content:this.toString()};};
  Number.prototype.text=function(){return (this<0?'-$':'$')+Math.abs(this).toFixed(2);};
  var writes=0,mails=[],zoho={loginuser:'fixture-owner',adminuser:'fixture-owner',currentdate:'2026-11-09',currenttime:'2026-11-10T10:30:00-06:00',encryption:{sha256(value){return 'fixture-'+value;}}},bundle=map({revision:'revision-one',reallocationContract:'po-reallocation-v1',active:{id:'81',role:'CFO'},modifications:input});
  var tables={Payment_Request:[{ID:51,Request_Type:'Purchase Order',PO_Revision:'revision-one',PO_Approval_State:'Pending',PO_Line_Count:1,PO_Amount_Exact:'150.00',PO_Description:'Review <work>',Request_Date:null,Date_Needed:null,Budget:{ID:61,Budget_Name:'EP01 - Phase 01'},Vendor:{ID:91,Vendor_Name:'Vendor & Co'}}],PO_Item:[{ID:101,Purchase_Order:51,Revision:'revision-one',Line_Order:1,Budget_Item:{ID:71,Item_Name:'Road & <scope>'},Description:'=not a formula',Cost_Code:'C_EP01-3240-4',Cost_Element:'4',UOM:'LS',Quantity_Exact:null,Unit_Price_Exact:null,Final_Amount_Exact:'150.00'}],Budget_Item:[{ID:71,Item_Name:'Road & <scope>',Cost_Code:'3240'}],Budget_Approvals:[{ID:81,Status:'Pending',Approver:'approver@example.test',Sent_Date:null}],PO_Phase_Lock:[]};
  function record(row){return new Proxy(row,{get(object,key){if(key==='toString')return ()=>String(object.ID);var value=object[key];return value&&typeof value==='object'&&!Array.isArray(value)?record(value):value??null;},set(object,key,value){writes++;object[key]=value;return true;}});}
  function query(form,predicate,sort){var rows=(tables[form]||[]).map(record).filter(predicate);if(sort)rows.sort((a,b)=>a[sort]-b[sort]);return new Proxy(rows,{get(array,key){return key in array||typeof key==='symbol'?array[key]:array[0]?.[key]??null;},set(array,key,value){array[0][key]=value;return true;}});}
  tables.Activity_Log=[];function insertRecord(form,value){if(value.Claim_Key&&tables[form].some(row=>row.Claim_Key===value.Claim_Key))throw Error('Duplicate native Claim_Key');value.ID=200+tables[form].length;tables[form].push(value);writes++;return value.ID;}
  function sendMail(message){mails.push(message);}
  var thisapp={environment:{type:'Production'},poApprovalBundle(){return map({success:true,bundle});},poElementExportRows(){return [];}};
  `+programs,c);
  return c;
}
const parts=values=>Object.fromEntries(values.map((value,index)=>[String(index+1),value]));
for(const [type,amount,normalized,actual,net] of [
  ['Increase','0.00',['-100.00','0.00','0.00','100.00','0.00'],['-100.00','0.00','0.00','100.00','0.00'],0],
  ['Increase','25.00',['-75.00','0.00','0.00','100.00','0.00'],['-75.00','0.00','0.00','100.00','0.00'],25],
  ['Decrease','25.00',['125.00','0.00','0.00','-100.00','0.00'],['-125.00','0.00','0.00','100.00','0.00'],-25]
]){
  const c=runtime([{id:'111',budgetItemId:'71',amount,componentReallocation:true,modificationType:type,components:parts(normalized),signedComponents:parts(actual)}]);
  const workbook=c.poExcelWorkbook('51');assert.equal(workbook.success,true,workbook.error);assert.equal(c.writes,0,'downloads stay read-only');
  const sheet=workbook.content.split("ss:Name='Budget Modifications'")[1].split('</Worksheet>')[0];assert.match(sheet,/Net Change/);assert.ok(sheet.includes("ss:Type='Number'>"+net+'</Data>'),'net Amount follows the global direction once');
  for(const value of actual)assert.ok(sheet.includes("ss:Type='Number'>"+value+'</Data>'),'workbook exports actual signed component '+value);
  assert.match(c.sendPurchaseOrderEmail('51'),/^OK:/);assert.equal(c.mails.length,1);assert.equal(c.mails[0].to,'approver@example.test');assert.match(c.mails[0].message,/Proposed Budget Changes/);assert.match(c.mails[0].message,/Road &amp; &lt;scope&gt;/);assert.ok(c.mails[0].message.includes(net<0?'Net $-25':'Net $'+net));assert.match(c.mails[0].message,/-\$[0-9]+\.00/,'offset reductions are explicit in the approval message');assert.match(c.mails[0].message,/\$100\.00/,'element-four increase remains visible even when net is zero or negative');
  const writes=c.writes;assert.match(c.sendPurchaseOrderEmail('51'),/already recorded/);assert.equal(c.mails.length,1,'delivery stamp prevents duplicate mail');assert.equal(c.writes,writes);
}
const legacy=runtime([{id:'111',budgetItemId:'71',amount:'10.00',components:parts(['10.00','0.00','0.00','0.00','0.00'])}]);assert.equal(legacy.poExcelWorkbook('51').success,true);assert.match(legacy.sendPurchaseOrderEmail('51'),/^OK:/);assert.match(legacy.mails[0].message,/Net \$10/);
const denied=runtime([]);vm.runInContext("thisapp.poApprovalBundle=function(){return map({success:false,error:'Unverified component marker'});};",denied);assert.equal(denied.poExcelWorkbook('51').success,false);assert.match(denied.sendPurchaseOrderEmail('51'),/^ERROR:/);assert.equal(denied.mails.length,0);assert.equal(denied.writes,0);
console.log('PO reallocation readers: actual native workbook/email, normalized positive/zero/negative net, signed element offsets, escaped native item names, unchanged recipient/delivery guard, legacy compatibility and unverified-bundle refusal passed.');
