// Execute the checked-in native functions, using exact-ID Creator lookup shapes.
// This local adapter is not a Creator compiler or a live publication check.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';

const fields = ['Labor_Budget', 'Materials_Budget', 'Equipment_Budget', 'Subcontractor_Budget', 'Other_Budget'];
const names = ['createBudgetModification', 'modificationAdmin', 'submitBudgetModification', 'sendModificationEmail'];
const program = names.map(name => {
  let source = fs.readFileSync(`creator/functions/${name}.dg`, 'utf8');
  source = source.replace(/\{((?:"(?:\\.|[^"\\])*"\s*:[^{}\n]+))\}/g, (_, body) => 'delugeMap(' + body.replace(/("(?:\\.|[^"\\])*")\s*:/g, '$1,') + ')');
  source = source.replace(/insert into (\w+)\s*\[([^\]]+)\]/g, (_, form, values) => 'insertRecord("' + form + '",delugeMap(' + values.trim().split('\n').map(line => {
    const match = line.trim().match(/^(\w+)=(.*)$/); assert.ok(match, line);
    return JSON.stringify(match[1]) + ',' + match[2];
  }).join(',') + '))');
  source = source.replace(/delete from (\w+)\[([^\]]+)\];/g, (_, form, criteria) => 'removeRecords("' + form + '",row=>' + criteria.replace(/\b([A-Za-z_]\w*)\s*(==|!=|>=|<=|>|<)/g, 'row.$1 $2') + ');');
  source=source.replace(/sendmail\s*\[([^\]]+)\]/g,(_,body)=>'sendMail(delugeMap('+body.trim().split('\n').map(line=>{const match=line.trim().match(/^(\w+)\s*:(.*)$/);assert.ok(match,line);return JSON.stringify(match[1])+','+match[2].replace(/^\s*file:/,'');}).join(',')+'));');
  return translate(source).js + (name === 'sendModificationEmail' ? ';' : `;thisapp.${name}=${name};`);
}).join('\n');
const ids = {actor:'90071992547409931', budget:'90071992547409941', item:'90071992547409951', modification:'90071992547409961', created:'90071992547409962'};
const parts = values => Object.fromEntries(fields.map((field, index) => [field, values[index]]));
const envelope = values => JSON.stringify({contract:'budget-components-v1', components:parts(values)});
const initialParts = parts([1, 2, 3, 4, 5]);

function runtime({grant={Edit_All_Budgets:true}, profile='', duplicate=false, reference='', status='Draft', routeFailure=false, emailFailure=false}={}) {
  const tables = {
    User_Access:[{ID:ids.actor, User:'fixture', ...grant}],
    Add_Budget:[{ID:ids.budget, Budget_Owner:[ids.actor], Subdivision1:'71'}],
    Subdivision:[{ID:'71', Territory:'Fixture Territory'}],
    Budget_Item:[{ID:ids.item, Budget:ids.budget, Budget_Category:'81'}],
    Budget_Category:[{ID:'81'}], Budget_Approvals:[],
    Budget_Modification:[{ID:ids.modification, Budget:ids.budget, Budget_Item:ids.item, Amount:15, Modification_Type:'Increase', Status:status, Reference_Number:reference, ...initialParts}]
  };
  if (duplicate) tables.User_Access.push({ID:'90071992547409932', User:'fixture', ...grant});
  const c = vm.createContext({initial:structuredClone(tables), ids, profile, routeFailure, emailFailure});
  vm.runInContext(`
    var tables=JSON.parse(JSON.stringify(initial)),writes=[],events=[],thisapp={};
    function map(value){
      if(value && typeof value==='object' && !Array.isArray(value)){
        Object.values(value).forEach(map);
        Object.defineProperties(value,{get:{value:function(k){return this[k]??null;}},put:{value:function(k,v){this[k]=v;}}});
      }
      return value;
    }
    function Map(){return map({});}function List(){return [];}function ifnull(value,fallback){return value==null?fallback:value;}
    function delugeMap(...pairs){var value={};for(var i=0;i<pairs.length;i+=2)value[pairs[i]]=pairs[i+1];return map(value);}
    Array.prototype.add=function(value){this.push(value);};Array.prototype.get=function(index){return this[index]??null;};Array.prototype.count=Array.prototype.size=function(){return this.length;};
    String.prototype.toLong=Number.prototype.toLong=function(){return BigInt(this);};BigInt.prototype.toLong=function(){return this.valueOf();};
    String.prototype.toDecimal=function(){var value=Number(this);if(!this.trim()||!Number.isFinite(value))throw Error('Invalid native decimal');return value;};
    Number.prototype.abs=function(){return Math.abs(this);};
    Number.prototype.round=function(precision){var factor=10**precision;return Math.round(this*factor)/factor;};
    String.prototype.toFile=function(name){return {name,content:String(this)};};Number.prototype.text=function(){return '$'+Number(this).toLocaleString('en-US',{maximumFractionDigits:4});};
    String.prototype.toMap=function(){return map(JSON.parse(this));};String.prototype.toDate=function(){return String(this);};
    var zoho={loginuser:'fixture',adminuser:'publishing-admin',currentdate:'2026-11-03'};
    thisapp.permissions={profileForUser(){return profile;}};
    var lookups={Budget:'Add_Budget',Budget_Item:'Budget_Item',Budget_Category:'Budget_Category',Subdivision1:'Subdivision'};
    function lookup(form,id){var row=(tables[form]||[]).find(row=>row.ID==id)||{ID:String(id)};return new Proxy(row,{get(o,k){if(k==='valueOf')return ()=>BigInt(o.ID);if(k==='toString')return ()=>String(o.ID);return o[k]??null;}});}
    function record(form,row){return new Proxy(row,{get(o,k){if(k==='Budget_Owner'&&o[k]!=null)return o[k].map(owner=>lookup('User_Access',owner));if(k in lookups&&o[k]!=null)return lookup(lookups[k],o[k]);return o[k]??null;},set(o,k,v){writes.push({form,id:o.ID,field:k});o[k]=typeof v==='bigint'?v.toString():v;return true;}});}
    function query(form,predicate,sort){var rows=(tables[form]||[]).map(row=>record(form,row)).filter(predicate);if(sort)rows.sort((a,b)=>a[sort]>b[sort]?1:a[sort]<b[sort]?-1:0);return new Proxy(rows,{get(a,k){return k in a||typeof k==='symbol'?a[k]:a[0]?.[k]??null;},set(a,k,v){if(!a.length)throw Error('Missing record');a[0][k]=v;return true;}});}
    function insertRecord(form,data){events.push({kind:'insert',data:JSON.parse(JSON.stringify(data,(_,value)=>typeof value==='bigint'?value.toString():value))});var row={ID:ids.created,...events.at(-1).data};tables[form].push(row);writes.push({form,id:row.ID,insert:true});return BigInt(row.ID);}
    function removeRecords(){throw Error('This fixture never deletes records');}
    function sendMail(message){events.push({kind:'sent-mail',message});}
    thisapp.budgetElementExportRows=()=>['1','2','3','4','5'].map((code,i)=>delugeMap('code',code,'label',['(1) Labor','(2) Materials','(3) Equipment','(4) Subcontractor','(5) Other'][i],'values',[null,null,null,100,10,110]));
    thisapp.poCurrencyString=value=>value;
    thisapp.resolveApprovalRoute=context=>{events.push({kind:'route-preview',amount:context.get('amount')});return delugeMap('success',!routeFailure,'error','Fixture route unavailable');};
    thisapp.applySharedApprovalPolicy=context=>{events.push({kind:'approval-chain',modification:JSON.parse(JSON.stringify(tables.Budget_Modification.at(-1)))});return delugeMap('success',true,'shared',true);};
    thisapp.sendModificationEmail=(id,event)=>{events.push({kind:'email',modification:JSON.parse(JSON.stringify(tables.Budget_Modification.at(-1)))});if(emailFailure)throw Error('Fixture email unavailable');return 'Email sent';};
    thisapp.recalcItemRevisedFinal=id=>{events.push({kind:'item-rollup',id:String(id)});return 'OK';};
    thisapp.recalcBudgetModifiedTotals=id=>{events.push({kind:'budget-rollup',id:String(id)});return 'OK';};
  ` + program, c);
  const call = (name, args) => vm.runInContext(`${name === 'sendModificationEmail' ? name : 'thisapp.' + name}(${args.map(value=>JSON.stringify(value)).join(',')})`, c);
  return {
    c,
    call,
    create:(amount, type='Increase')=>call('createBudgetModification',[ids.item,type,amount,'Element fixture','MANUAL:fixture','2026-11-03','Construction']),
    update:(amount, type='Decrease')=>call('modificationAdmin',['update',ids.modification,ids.budget,type,amount,'Updated element fixture','MANUAL:updated','2026-11-04']),
    snapshot:()=>JSON.parse(JSON.stringify(c.tables)),
    events:()=>JSON.parse(JSON.stringify(c.events))
  };
}

for (let selected=0; selected<fields.length; selected++) {
  const values = fields.map((_, index)=>index===selected?'125.35':'0.00');
  for (const type of ['Increase', 'Decrease']) {
    const h=runtime(); assert.match(h.create(envelope(values),type),/^OK: Modification 90071992547409962 submitted/);
    const saved=h.snapshot().Budget_Modification.at(-1);
    assert.equal(saved.Amount,125.35); assert.equal(saved.Modification_Type,type);
    assert.equal(saved.Budget_Item,ids.item); assert.equal(saved.Budget,ids.budget);
    assert.deepEqual(Object.fromEntries(fields.map(field=>[field,saved[field]])),parts(values.map(Number)));
    for (const event of h.events().filter(event=>['insert','approval-chain','email'].includes(event.kind))) {
      const record=event.data||event.modification;
      assert.deepEqual(Object.fromEntries(fields.map(field=>[field,record[field]])),parts(values.map(Number)),'all components persist before approval/email');
    }
    assert.equal(saved.Status,'Submitted');
  }
}
let h=runtime();assert.match(h.create(envelope(['1','2','3','4','5'])),/^OK:/,'existing multi-component native callers remain supported');
assert.equal(h.snapshot().Budget_Modification.at(-1).Amount,15);
h=runtime();assert.match(h.create('25.50'),/^OK:/,'legacy scalar amount remains accepted');
assert.ok(fields.every(field=>h.snapshot().Budget_Modification.at(-1)[field]===null),'legacy caller stays explicitly unallocated');
h=runtime({emailFailure:true});assert.match(h.create(envelope(['25.50','0','0','0','0'])),/^OK: Modification 90071992547409962 submitted.*email could not/i,'email failure retains recoverable saved identity');
assert.equal(h.snapshot().Budget_Modification.at(-1).Labor_Budget,25.5);

const invalid = [
  JSON.stringify({contract:'unknown',components:parts([1,0,0,0,0])}),
  JSON.stringify({contract:'budget-components-v1'}),
  envelope(['1','0','0','0',undefined]), envelope(['1','0','0','0','']),
  envelope(['1','0','0','0','no money']), envelope(['-1','0','0','0','0']),
  envelope(['1.001','0','0','0','0']), envelope(['0','0','0','0','0']), '{broken'
];
for (const amount of invalid) {
  h=runtime();const before=h.snapshot();assert.match(h.create(amount),/^ERROR:/);assert.deepEqual(h.snapshot(),before);assert.equal(h.c.writes.length,0);assert.equal(h.c.events.length,0);
  h=runtime();const beforeUpdate=h.snapshot();assert.match(h.update(amount),/^ERROR:/);assert.deepEqual(h.snapshot(),beforeUpdate,'invalid update validates before changing type, amount or components');assert.equal(h.c.writes.length,0);
}
for (const setup of [{grant:{}},{grant:{Create_Purchase_Orders:true}},{grant:{Edit_All_Budgets:true},profile:'Construction Budgeting'},{duplicate:true}]) {
  h=runtime(setup);assert.match(h.create(envelope(['25','0','0','0','0'])),/^ERROR:/);assert.equal(h.c.writes.length,0);assert.equal(h.c.events.length,0);
  h=runtime(setup);assert.match(h.update(envelope(['25','0','0','0','0'])),/^ERROR:/);assert.equal(h.c.writes.length,0);assert.equal(h.c.events.length,0);
}
h=runtime({grant:{Edit_Owned_Budgets:true}});assert.match(h.create(envelope(['0','25','0','0','0'])),/^OK:/,'owned-budget creation permission is retained');
h=runtime({grant:{Edit_Owned_Budgets:true}});assert.match(h.update(envelope(['0','25','0','0','0'])),/^ERROR:/,'global admin permission is still required to update');
h=runtime({routeFailure:true});assert.match(h.create(envelope(['25','0','0','0','0'])),/^ERROR: Approval routing unavailable/);assert.equal(h.c.writes.length,0);

for(let selected=0;selected<fields.length;selected++) {
  h=runtime({status:'Approved'});const values=fields.map((_,index)=>index===selected?'50.25':'0.00');
  assert.match(h.update(envelope(values)),/^OK: Modification updated/);
  const saved=h.snapshot().Budget_Modification[0];
  assert.equal(saved.Amount,50.25);assert.equal(saved.Modification_Type,'Decrease');
  assert.deepEqual(Object.fromEntries(fields.map(field=>[field,saved[field]])),parts(values.map(Number)),'changing element clears all prior allocations');
  assert.deepEqual(h.events().map(event=>event.kind),['item-rollup','budget-rollup'],'approved edits retain existing rollups without sending approval email');
}
h=runtime({reference:'PO:fixture'});const before=h.snapshot();assert.match(h.update(envelope(['25','0','0','0','0'])),/^ERROR: This modification belongs to a combined Purchase Order/);assert.deepEqual(h.snapshot(),before);assert.equal(h.c.writes.length,0);
h=runtime();assert.match(h.update('20.00'),/^OK:/);assert.deepEqual(Object.fromEntries(fields.map(field=>[field,h.snapshot().Budget_Modification[0][field]])),initialParts,'legacy scalar update preserves existing component fields');

console.log('PASS: actual native modification component create/update bodies; all five selections, signs, persisted-before-approval fields, legacy callers, validation-before-write, permissions, PO isolation, unknown mail recovery and approved rollups. Native Creator compilation/publication remains a separate gate.');

const signedEnvelope=values=>JSON.stringify({contract:'budget-components-v2',components:parts(values)});
for(const [values,type,total,gross] of [[[100,-80,0,0,0],'Increase',20,180],[[100,-80,0,0,0],'Decrease',20,180],[[100,-100,0,0,0],'Increase',0,200]]){
 h=runtime();assert.match(h.create(signedEnvelope(values),type),/^OK:/);let saved=h.snapshot().Budget_Modification.at(-1);assert.equal(saved.Amount,total);assert.equal(saved.Component_Reallocation,true);assert.equal(saved.Modification_Type,type);assert.deepEqual(Object.fromEntries(fields.map(f=>[f,saved[f]])),parts(values));assert.equal(h.events().filter(e=>e.kind==='approval-chain').length,1);assert.equal(h.events().find(e=>e.kind==='route-preview').amount,String(gross),'gross changes drive approval thresholds');
 h=runtime();assert.match(h.update(signedEnvelope(values),type),/^OK:/);saved=h.snapshot().Budget_Modification[0];assert.equal(saved.Amount,total);assert.equal(saved.Component_Reallocation,true);assert.equal(saved.Modification_Type,type);assert.deepEqual(Object.fromEntries(fields.map(f=>[f,saved[f]])),parts(values));
}
for(const [values,type] of [[[-100,80,0,0,0],'Increase'],[[0,0,0,0,0],'Increase'],[[100,-100,0,0,0],'Decrease'],[[1.001,0,0,0,0],'Increase']]){
 for(const method of ['create','update']){h=runtime();const before=h.snapshot();assert.match(h[method](signedEnvelope(values),type),/^ERROR:/);assert.deepEqual(h.snapshot(),before);assert.equal(h.c.writes.length,0);}
}
for(const method of ['create','update']){h=runtime();const before=h.snapshot();const args=method==='create'?[ids.item,'Increase',signedEnvelope([1,0,0,0,0]),'Reason','PO:forged','','Construction']:['update',ids.modification,ids.budget,'Increase',signedEnvelope([1,0,0,0,0]),'Reason','PO:forged',''];const result=vm.runInContext(`thisapp.${method==='create'?'createBudgetModification':'modificationAdmin'}(${args.map(JSON.stringify).join(',')})`,h.c);assert.match(result,/^ERROR: PO references/);assert.deepEqual(h.snapshot(),before);}
console.log('Native V2: mixed signs, zero net, positive/decrease normalization, one approval chain, gross threshold basis, no-write validation and reserved PO references passed.');

// Execute the actual mail producer, reopen its native Excel attachment, and
// compare numeric cells with the independently signed modification values.
const xlsxContext=vm.createContext({});vm.runInContext(fs.readFileSync('widgets/land-master/src/app/vendor/xlsx.full.min.js','utf8'),xlsxContext);
for(const [type,values,net] of [['Increase',[100,-80,0,0,0],20],['Decrease',[100,-80,0,0,0],-20],['Increase',[100,-100,0,0,0],0]]){
 h=runtime();const record=h.c.tables.Budget_Modification[0];Object.assign(record,parts(values),{Modification_Type:type,Amount:Math.abs(net),Component_Reallocation:true,Reason:'=SUM(1,2) <city> & scope',Type_field:'Dev',Type_Comment:'Two elements'});
 vm.runInContext(`tables.Budget_Approvals=[{ID:'77',Budget_Modification:ids.modification,Type1:'Modification',Status:'Not Sent',Sort_Order:1,Title:'VP',Approver:'fixture@example.com'}];`,h.c);
 const result=h.call('sendModificationEmail',[ids.modification,'created']);assert.match(result,/^Modification email sent/);
 const mails=h.events().filter(e=>e.kind==='sent-mail');assert.equal(mails.length,1);const mail=mails[0].message;assert.match(mail.message,/>Gross Changes:/);assert.doesNotMatch(mail.message,/\+\$-|--\$/);assert.match(mail.message,/<city>|&lt;city&gt;/);assert.match(mail.Attachments.name,/^Budget-Modification-.*\.xls$/);
 const book=xlsxContext.XLSX.read(mail.Attachments.content.replace(/<[^>]*>/g,tag=>tag.replace(/(\s[\w:.-]+)='([^']*)'/g,(_,name,value)=>name+'="'+value.replace(/"/g,'&quot;')+'"')),{type:'string'}),sheet=book.Sheets[book.SheetNames[0]],rows=xlsxContext.XLSX.utils.sheet_to_json(sheet,{header:1});
 assert.equal(rows.find(row=>row[0]==='Net Modification')[1],net);assert.equal(rows.find(row=>row[0]==='Gross Changes')[1],values.reduce((sum,n)=>sum+Math.abs(n),0));
 assert.equal(rows.find(row=>row[0]==='Reason')[1],'=SUM(1,2) <city> & scope');assert.equal(sheet.B6.t,'s','user text remains a literal string');
 const elementRows=rows.filter(row=>/^\([1-5]\)/.test(row[0]));assert.deepEqual(Array.from(elementRows,row=>row[0]),['(1) Labor','(2) Materials','(3) Equipment','(4) Subcontractor','(5) Other']);
 elementRows.forEach((row,i)=>{const signed=(type==='Decrease'?-1:1)*values[i]||0;assert.equal(row[4],signed);assert.equal(row[5],110+signed);});
 assert.equal(h.snapshot().Budget_Approvals[0].Status,'Pending');assert.ok(h.snapshot().Budget_Approvals[0].Sent_Date,'delivery stamp follows the email including its attachment');
}
console.log('Approval email and Excel: five ordered signed elements, net/gross changes, prior/projected values, escaped text, formula-safe numeric/string cells and delivery stamping passed.');

for(const method of ["create","update"]){h=runtime();const before=h.snapshot();assert.match(h[method](signedEnvelope([1,0,0,0,0]),""),/^ERROR:/);assert.deepEqual(h.snapshot(),before);}
