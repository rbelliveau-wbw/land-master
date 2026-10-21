// Executes the checked-in native Deluge action bodies against record fixtures.
// This is not a substitute for Creator compilation and native validation rollback.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';
import {directory,rules,action} from './build-child-lifecycle.mjs';

function compile(body){
  let code=body.replace(/delete from (\w+)\[([^\]]+)\]/g,(_,form,c)=>`removeRows('${form}',query('${form}',row=>${predicate(c)}))`);
  code=code.replace(/\b([A-Z]\w*)\[([^\]]+)\]/g,(_,form,c)=>`query('${form}',row=>${predicate(c)})`);
  code=code.replace(/alert "[^"\n]*";/g,'').replace(/cancel (delete|submit);/g,'throw Error("cancelled");');
  return translate('void runAction()\n{\n'+code+'\n}').js;
}
function predicate(c){return c.replace(/(?<![.\w])([A-Za-z_]\w*)\s*(==|!=|>=|<=|>|<)/g,'row.$1 $2');}
function run(body,tables,input){
  const context=vm.createContext({fixtures:structuredClone(tables),input:structuredClone(input)});
  vm.runInContext(`
    var tables=fixtures,writes=[],pfKey=input.ID;
    function List(){return [];}
    function Map(){return {put(k,v){this[k]=v;},get(k){return this[k]??null;}};}
    Array.prototype.add=function(v){this.push(v);};
    Array.prototype.contains=function(v){return this.includes(v);};
    Array.prototype.count=function(){return this.length;};
    Array.prototype.size=function(){return this.length;};
    Number.prototype.toString=function(){return String(this.valueOf());};
    function query(form,predicate){return Array.from(tables[form]||[],r=>new Proxy(r,{get:(o,k)=>o[k]??null})).filter(predicate);}
    function removeRows(form,rows){writes.push(...rows.map(r=>({form,id:r.ID})));tables[form]=(tables[form]||[]).filter(r=>!rows.some(x=>x.ID===r.ID));}
  `+compile(body)+';runAction();',context);
  return JSON.parse(JSON.stringify({tables:context.tables,writes:context.writes}));
}
let scenarios=0;
for(const rule of rules)for(const event of ['delete']){
  const body=fs.readFileSync(`${directory}/${rule.parent}.${event}.dg`,'utf8');
  assert.equal(body,action(rule,event),'generated action remains reproducible');
  const rowForms=new Map();
  for(const [,alias,form]of body.matchAll(/for each (\w+) in (\w+)\[/g)){
    assert.ok(!rowForms.has(alias)||rowForms.get(alias)===form,'Creator row variables cannot be reused for different form types');rowForms.set(alias,form);
  }
  assert.doesNotMatch(body,/while\s*\(|Added_Time|currenttime|\.clear\(/,'no global/time-based purge or field-event mutation');
  for(const group of rule.groups){
    if(event==='edit'&&!group.grids.length)continue;
    const current={ID:42,...Object.fromEntries(rule.groups.flatMap(g=>g.grids).map(g=>[g,[]]))};
    const saved={ID:101,...Object.fromEntries(group.owners.map(o=>[o,42])),...Object.fromEntries((group.flags||[]).map(f=>[f,false]))};
    const fixture={[group.form]:[saved,{...saved,ID:102,...Object.fromEntries(group.owners.map(o=>[o,99]))}]};
    assert.deepEqual(run(body,fixture,current).writes,[{form:group.form,id:101}],`${rule.parent}/${event}/${group.form}: only removed owned row`);scenarios++;
    for(const other of group.other||[]){assert.equal(run(body,{[group.form]:[{...saved,[other]:77}]},current).writes.length,0,`${group.form}.${other}: shared/template record retained`);scenarios++;}
    for(const flag of group.flags||[])for(const value of [true,null]){assert.equal(run(body,{[group.form]:[{...saved,[flag]:value}]},current).writes.length,0,'only explicit non-template records eligible');scenarios++;}
    for(const owner of group.owners){
      if(group.owners.length<2)continue;
      assert.equal(run(body,{[group.form]:[{...saved,[owner]:99}]},current).writes.length,0,'another surviving parent protects row');scenarios++;
    }
    if(event==='edit')for(const grid of group.grids){
      const kept={...current,[grid]:[{ID:101}]};
      assert.equal(run(body,fixture,kept).writes.length,0,grid+': kept/moved row survives');scenarios++;
    }
    assert.equal(run(body,fixture,{...current,ID:null}).writes.length,0,'unsaved parent never becomes global null-owner deletion');scenarios++;
  }
}
for(const[form,field,other]of [['Payment_Request','Payment_Request','Budget_Modification'],['Budget_Modification','Budget_Modification','Payment_Request']]){
  const body=fs.readFileSync('creator/workflows/Keep_Budget_Files_'+form+'.dg','utf8');
  const legacy={ID:101,[field]:42,Budget:null};
  let result=run(body,{Attachment:[legacy]},{ID:42,Budget:77});
  assert.equal(result.tables.Attachment[0].Budget,77,'legacy file gains the genuine Budget before unlink');
  assert.equal(result.tables.Attachment[0][field],null);assert.equal(result.writes.length,0,'files are retained');
  result=run(body,{Attachment:[{...legacy,Budget:88}]},{ID:42,Budget:77});
  assert.equal(result.tables.Attachment[0].Budget,88,'existing association is not overwritten');
  assert.throws(()=>run(body,{Attachment:[legacy]},{ID:42,Budget:null}),/cancelled/,'missing source Budget prevents exclusive-file orphaning');
  result=run(body,{Attachment:[{...legacy,Contract1:66}]},{ID:42,Budget:null});
  assert.equal(result.tables.Attachment[0].Contract1,66,'other file owner survives');
  scenarios+=4;
}
{
 const body=fs.readFileSync(directory+'/Contract.delete.dg','utf8');
 const parent={ID:42,Work_Module:'Construction'},row={ID:101,Contract1:42,Work_Module:'Construction',Type_field:'Internal',Template_Action:false};
 assert.deepEqual(run(body,{Contract_Actions:[row]},parent).writes,[{form:'Contract_Actions',id:101}],'an ordinary Construction action uses Type as classification, not a template reference');
 for(const value of [true,null])assert.equal(run(body,{Contract_Actions:[{...row,Template_Action:value}]},parent).writes.length,0,'actual/unknown templates remain protected');
 for(const fixture of [{...row,Work_Module:'Legal'},{...row,Contract1:99}])assert.equal(run(body,{Contract_Actions:[fixture]},parent).writes.length,0,'other modules and parents remain protected');
 assert.equal(run(body,{Contract_Actions:[row]},{...parent,Work_Module:'Legal'}).writes.length,0,'the legacy Legal typed-action rule stays unchanged');
 scenarios+=6;
}
const pf=fs.readFileSync('creator/functions/proforma_save.dg','utf8');
const financialDelete=pf.slice(pf.indexOf('deleteStage = "land_purchase_installments"'),pf.indexOf('deleteStage = "construction_curve"'));
assert.doesNotMatch(financialDelete,/\[[^\]\n]*\|\|/,'Creator strips boolean groups: no OR lookup criteria in root deletion');
for(const form of ['Land_Installments','Proforma_Item']){
  const owners=form==='Land_Installments'?['Pro_Forma','Pro_Forma2','Pro_Forma_PID_MUD']:['Pro_Forma_Const','Pro_Forma_Dev'];
  for(const owner of owners){
    const row={ID:101,[owner]:42,...(form==='Proforma_Item'?{Template_Item:false}:{})};
    const body='deleted = Map();\n'+financialDelete;
    assert.equal(run(body,{[form]:[row]},{ID:42}).writes.length,1,'root delete removes an exclusively owned row');scenarios++;
    for(const other of owners.filter(x=>x!==owner)){
      assert.equal(run(body,{[form]:[{...row,[other]:99}]},{ID:42}).writes.length,0,'root delete protects another surviving parent');scenarios++;
      assert.equal(run(body,{[form]:[{...row,[other]:42}]},{ID:42}).writes.length,1,'same parent in two grids deletes the row once');scenarios++;
    }
    assert.equal(run(body,{[form]:[{...row,[owner]:99}]},{ID:42}).writes.length,0,'root delete cannot reach another parent');scenarios++;
    if(form==='Proforma_Item')for(const flag of [true,null]){assert.equal(run(body,{[form]:[{...row,Template_Item:flag}]},{ID:42}).writes.length,0,'root delete keeps template and unknown flags');scenarios++;}
  }
}
assert.ok(pf.indexOf('deleteStage = "proforma_lot_mix"')<pf.indexOf('deleteStage = "parent_proforma"'));
assert.ok(pf.indexOf('deleteStage = "proforma_attachments"')<pf.indexOf('deleteStage = "parent_proforma"'));
assert.doesNotMatch(pf,/delete from Proforma_AI_Review/,'AI history is retained');
const budget=fs.readFileSync('creator/functions/manageBudget.dg','utf8');
const nativeBudget=fs.readFileSync(directory+'/Add_Budget.delete.dg','utf8');
{
  const result=run(nativeBudget,{
    Budget_Months:[{ID:1,Budget:42},{ID:2,Budget:42,Subdivision:88},{ID:3,Budget:99}],
    Attachment:[{ID:4,Budget:42},{ID:5,Budget:42,Pro_Forma:88},{ID:6,Budget:99}],
    Comment_Log:[{ID:7,Budget:42},{ID:8,Budget:42,Project:88}],
    Budget_Item:[{ID:9,Budget:42}],Budget_Import_Item:[{ID:10,Budget_Item:9}]
  },{ID:42});
  assert.deepEqual(result.writes.map(r=>r.id).sort((a,b)=>a-b),[1,4,7,9],'native Budget delete keeps shared files/comments/Subdivision months');
  assert.equal(result.tables.Budget_Import_Item[0].Budget_Item,null,'import provenance is unlinked, not deleted');scenarios+=2;
  for(const Request_Type of ['Purchase Order','Check','Wire']){assert.throws(()=>run(nativeBudget,{Payment_Request:[{ID:1,Budget:42,Request_Type}]},{ID:42}),/cancelled/,'all request types block Budget deletion');scenarios++;}
  assert.throws(()=>run(nativeBudget,{}, {ID:null}),/cancelled/,'invalid parent cannot become a global null-owner delete');scenarios++;
}
// Any new Attachment lookup in a future export must be reviewed as a new owner.
// Do not let an old null-owner criterion silently become a wider deletion rule.
const attachmentOwners=new Set(['Contract1','Budget','Pro_Forma','Payment_Request','Budget_Modification']);
const attachmentSchema=JSON.parse(fs.readFileSync('creator/generated/fields/Attachment.json','utf8'));
for(const field of attachmentSchema.fields.filter(field=>/\.ID\b/.test(String(field.values||''))))assert.ok(attachmentOwners.has(field.link_name),'New Attachment owner needs explicit delete/retention guards: '+field.link_name);
assert.match(budget,/Payment_Request\[Budget == budgetKey\]\.count\(\)/,'Check/Wire requests protect the Budget too');
assert.match(budget,/monthRow in Budget_Months\[Budget == budgetKey && Subdivision == null\]/,'Subdivision months are preserved');
assert.match(budget,/commentRow in Comment_Log\[Budget == budgetKey && Project == null && Pro_Forma == null && Contract1 == null\]/,'shared comments preserved');
console.log(`PASS ${scenarios} child lifecycle cases: exact parent isolation, shared ownership, template/unknown flags, unsaved guards, typed native row variables and retained request files. Native compilation/rollback verification remains a separate Creator gate.`);
