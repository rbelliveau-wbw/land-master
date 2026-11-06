import assert from 'node:assert/strict';
import {constructionSubmissionRuntime} from './lib/construction-submission-test-runtime.mjs';

const ID='90071992547409931';
const request=(type='Internal',extra={})=>({ID,Work_Module:'Construction',Contract_Type:type,Status:'Proposed',...extra});
const template=(n,extra={})=>({ID:(90071992547410000n+BigInt(n)).toString(),Contract1:null,Template_Action:true,Work_Module:'Construction',Type_field:'Internal',Contract_Action:'Task '+n,Sort_Order:n,...extra});
const children=tables=>tables.Contract_Actions.filter(row=>row.Contract1===ID);

for(const type of ['Internal','Offsite','Amenity','MUD Bid']){
  const rows=[template(2,{Type_field:type}),template(1,{Type_field:type,Contract_Action:'  First task  '}),template(3,{Type_field:type,Contract_Action:' '}),
    template(4,{Type_field:type,Work_Module:'Legal'}),template(5,{Type_field:type,Work_Module:null}),template(6,{Type_field:type,Template_Action:false}),
    template(7,{Type_field:type,Template_Action:null}),template(8,{Type_field:type,Contract1:'another-parent'}),template(9,{Type_field:'Issue'})];
  const before=JSON.stringify(rows),tables={Contract_Actions:structuredClone(rows)},input=request(type);
  const runtime=constructionSubmissionRuntime(tables);runtime.run(input);
  assert.equal(JSON.stringify(tables.Contract_Actions.slice(0,rows.length)),before,'source template and ordinary rows remain unchanged');
  assert.deepEqual(children(tables).map(row=>row.Contract_Action),['First task','Task 2']);
  assert.equal(input.Status,'Proposed','the request stays in Pending Review');
  for(const [index,row]of children(tables).entries()){
    assert.equal(typeof row.Contract1,'string');assert.equal(row.Contract1,ID);assert.equal(row.Work_Module,'Construction');assert.equal(row.Type_field,type);
    assert.equal(row.Template_Action,false);assert.equal(row.Status,'Proposed');assert.equal(row.Complete,false);assert.equal(row.Sort_Order,index+1);assert.equal(row.Current_Action,index===0);assert.equal(row.Added_User,'native-submitter');
  }
  assert.deepEqual(JSON.parse(JSON.stringify(runtime.refreshes)),[{url:'#Script:page.parent.refresh ',target:'parent window'}],'the existing parent refresh remains');
  runtime.run(input);assert.equal(children(tables).length,2,'a repeated success hook cannot seed a second checklist');
}
for(const mode of [null,'','Legal']){
  const tables={Contract_Actions:[template(1)]},runtime=constructionSubmissionRuntime(tables);runtime.run(request('Internal',{Work_Module:mode}));assert.equal(runtime.writes.length,0,'Legal never receives Construction templates');assert.equal(runtime.refreshes.length,1);
}
for(const type of [null,'','Issue','Offsite']){
  const tables={Contract_Actions:[template(1)]},runtime=constructionSubmissionRuntime(tables);runtime.run(request(type));assert.equal(runtime.writes.length,0,'invalid or unmatched types do not use another checklist');
}
{
  const tables={Contract_Actions:[]},runtime=constructionSubmissionRuntime(tables);runtime.run(request());assert.equal(runtime.writes.length,0,'a genuinely empty template library remains allowed');
}
{
  const tables={Contract_Actions:[template(1),template(2,{Contract1:ID,Template_Action:false,Contract_Action:'Existing custom task'})]},runtime=constructionSubmissionRuntime(tables);runtime.run(request());assert.equal(runtime.writes.length,0,'existing task lists are preserved');assert.equal(children(tables)[0].Contract_Action,'Existing custom task');
}
{
  const tables={Contract_Actions:[template(1)]},runtime=constructionSubmissionRuntime(tables);runtime.run(request('Internal',{ID:null}));assert.equal(runtime.writes.length,0,'the saved parent identity must exist before seeding');
}
{
  const tables={Contract_Actions:[template(1),template(2),template(3)]},runtime=constructionSubmissionRuntime(tables,{failInsert:2}),input=request();
  assert.throws(()=>runtime.run(input),/Native insert failed/,'a partial native failure remains an actual failure');assert.equal(children(tables).length,1);assert.equal(runtime.refreshes.length,0,'a failed seed does not advance to the final refresh');
  runtime.run(input);assert.equal(children(tables).length,1,'a partial checklist is not blindly replayed or duplicated');assert.equal(input.Status,'Proposed');
}
console.log('PASS Construction submission: actual trusted native template inserts, four types, exact module/flag/parent isolation, Proposed state, unchanged templates and submitter permissions, existing/empty preservation, no duplicate or partial replay, and retained parent refresh.');
