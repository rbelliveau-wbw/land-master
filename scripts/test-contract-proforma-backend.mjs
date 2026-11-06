import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const base='creator/schema-changes/contract-proforma-project-2026-11-06/';
const manifest=JSON.parse(read(base+'change.json'));
const reports=JSON.parse(read(base+'reports.json'));
const permissions=JSON.parse(read(base+'permissions.json'));
assert.equal(manifest.field.link_name,'Proforma');
assert.equal(manifest.field.values,'Add_Pro_Forma.ID');
assert.equal(manifest.field.native_mandatory,false,'Legacy links remain optional.');
if(manifest.creator_production_published){
  assert.equal(manifest.creator_production_publication_verified,true,'Published state needs separate native confirmation.');
  assert.equal(manifest.creator_promotion_owner,'user');
  assert.equal(manifest.creator_publication_initiated_by_this_agent,false);
  assert.equal(manifest.native_production_version,'9.157');
  assert.match(manifest.production_evidence.creator_publication,/User confirmed/);
  assert.equal(manifest.production_evidence.environments.Stage,'9.157');
  assert.equal(manifest.production_evidence.environments.Production,'9.157');
  assert.equal(manifest.production_evidence.environments.changes,'No changes available');
  assert.equal(manifest.production_evidence.environments.maintenance_lock,false);
  assert.deepEqual(manifest.production_evidence.remaining_required_actions,[]);
  assert.equal(permissions.production_published,true);
  assert.equal(permissions.development_evidence['Dev/Land Acq - Proforma & Budgets'].production_published,true);
  assert.deepEqual(permissions.remaining_feature_required,[],'All required grants must be complete before reporting full publication.');
}else{
  assert.equal(manifest.creator_production_publication_verified,false);
  assert.ok(permissions.remaining_feature_required.length||manifest.production_evidence?.remaining_action,'Unpublished state must identify the outstanding promotion or check.');
}
const picker=reports.create.find(row=>row.report==='Contract_Proforma_Choices');
assert.deepEqual(picker.fields,['ID','Name','Territory','LOI_Contract']);
assert.equal(picker.read_only,true);
assert.equal(permissions.additive_report_grant.edit,false);
assert.equal(permissions.additive_report_grant.modify_all,false);
assert.equal(permissions.additive_report_grant.delete,false);
assert.equal(permissions.additive_report_grant.export,false);
assert.deepEqual(permissions.new_user_access_flags,[]);
for(const name of ['All_Contracts1','All_Contracts','All_Contracts_v2']){
  assert.ok(reports.updates.find(row=>row.report===name).add_fields.includes('Proforma'));
}
assert.ok(reports.updates.find(row=>row.report==='All_Subdivisions').add_fields_if_omitted.includes('Subdivision_Code'));
const reportSource=read(base+'Contract_Proforma_Choices.report.ds');
assert.match(reportSource,/show all rows from Add_Pro_Forma/);
assert.match(reportSource,/detailview[\s\S]*?Name as "Pro Forma"[\s\S]*?Territory[\s\S]*?LOI_Contract/,'Native Detail View is restricted before profile grants.');
for(const field of ['Name','Territory','LOI_Contract'])assert.match(reportSource,new RegExp('\\b'+field+'\\b'));
assert.doesNotMatch(reportSource,/LOI_Approval_Token|Acquisition_Email|Land_Cost|Gross_Sales/);

// Execute the checked-in Deluge identity/create block. This fixture adapts
// native collection/lookup semantics; it is not a Creator compiler or live test.
const functionSource=read('creator/functions/Create_LOI_Contract.dg');
assert.match(functionSource,/existingContract\.Proforma=pf\.ID/);
assert.match(functionSource,/insert into Contract[\s\S]*?Proforma=pf\.ID/);
let block=functionSource.slice(functionSource.indexOf('stage = "create_or_reuse_contract";'),functionSource.indexOf('stage = "seed_contract_actions";'));
assert.ok(block.length>500);
block=block.replace(/\w+\.put\("meta",[^\n]+\);/g,'');
block=block.replace(/contractId = insert into Contract\s*\[([\s\S]*?)\];/,(_,body)=>{
  const puts=body.trim().split(/\r?\n/).map(line=>{
    const [_,field,value]=line.trim().match(/^(\w+)=(.*)$/)||[];
    assert.ok(field,'Native insert fields must be understood by the fixture.');
    return 'insertFields.put("'+field+'",'+value+');';
  });
  return 'insertFields = Map();\n'+puts.join('\n')+'\ncontractId = insertRow(insertFields);';
});
const program=translate('string submitFixture() {\n'+block+'\nresult.put("success",true); result.put("contractId",contractId); return result.toString();\n}').js;
function submit({rows=[],type='PSA',pfName='Source',worksheetContract=null,pfContract=null,sources=[],worksheets=[]}={}){
  const context=vm.createContext({fixture:JSON.stringify({rows,type,pfName,worksheetContract,pfContract,sources,worksheets})});
  vm.runInContext(`
    const f=JSON.parse(fixture); var rows=f.rows, added=[];
    function ifnull(v,d){return v==null?d:v;}
    function Map(){return {put(k,v){this[k]=v;},get(k){return this[k]??null;},toString(){return JSON.stringify(this);}};}
    function List(){return [];}
    Array.prototype.count=function(){return this.length;};
    Array.prototype.add=function(value){this.push(value);};
    function record(row){return new Proxy(row,{get(o,k){return o[k]??null;}});}
    function query(form,predicate){
      const table=form==='Contract'?rows:form==='Add_Pro_Forma'?f.sources:form==='LOI_Worksheet'?f.worksheets:[];
      const found=table.map(record).filter(predicate);
      return new Proxy(found,{
        get(a,k){return k in a||typeof k==='symbol'?a[k]:a[0]?.[k]??null;},
        set(a,k,v){if(!a.length)throw Error('Cannot update missing Contract.');a[0][k]=v;return true;}
      });
    }
    var pf={ID:'100',Name:f.pfName,LOI_Contract:f.pfContract};
    var loiRec={Agreement_Type:f.type,Contract:f.worksheetContract};
    var zoho={loginuser:'fixture_user'},result=Map(),trace=List();
    var contractTerritory='North',wbwPointPerson='fixture_person';
    function insertRow(fields){const row={...fields,ID:'900'};delete row.put;delete row.get;delete row.toString;rows.push(row);added.push(row);return row.ID;}
  `,context);
  vm.runInContext(program,context);
  const out=JSON.parse(vm.runInContext('submitFixture()',context));
  return {out,rows:JSON.parse(vm.runInContext('JSON.stringify(rows)',context)),added:JSON.parse(vm.runInContext('JSON.stringify(added)',context))};
}
const contract=(id,overrides={})=>({ID:id,Contract_Name:'Other Name',Contract_Type:'ACQ (PSA)',Work_Module:'Legal',Proforma:null,WBW_Point_Person:null,...overrides});
for(const type of ['PSA','LOI']){
  const created=submit({type});
  assert.equal(created.out.success,true);
  assert.equal(created.added.length,1);
  assert.equal(created.added[0].Proforma,'100');
  assert.equal(created.added[0].Contract_Type,'ACQ ('+type+')');
  const renamed=submit({type,pfName:'Renamed Source',rows:[contract('201',{Contract_Type:'ACQ ('+type+')',Proforma:'100'})]});
  assert.equal(renamed.out.contractId,'201','Renaming the source or Contract does not create another Contract.');
  assert.equal(renamed.added.length,0);
  assert.equal(renamed.rows[0].Proforma,'100');
}
for(const pointer of ['worksheetContract','pfContract']){
  const linked=submit({[pointer]:'202',rows:[contract('202')]});
  assert.equal(linked.out.contractId,'202','Exact existing reverse pointers recover legacy links.');
  assert.equal(linked.rows[0].Proforma,'100');
  assert.equal(linked.added.length,0);
}
for(const name of ['ACQ (PSA) - Source','Acquisition - Source','Source - LOI']){
  const legacy=submit({rows:[contract('203',{Contract_Name:name})]});
  assert.equal(legacy.out.contractId,'203');
  assert.equal(legacy.rows[0].Proforma,'100');
}
const foreign=submit({rows:[contract('204',{Contract_Name:'ACQ (PSA) - Source',Proforma:'101'})]});
assert.equal(foreign.added.length,1,'A matching name never captures another Pro Forma’s Contract.');
assert.equal(foreign.rows[0].Proforma,'101');
const subtype=submit({type:'LOI',rows:[contract('205',{Proforma:'100'})],worksheetContract:'205',pfContract:'205'});
assert.equal(subtype.added.length,1,'PSA and LOI have distinct subtype identity.');
assert.equal(subtype.rows[0].Contract_Type,'ACQ (PSA)');
const construction=submit({rows:[contract('206',{Proforma:'100',Work_Module:'Construction'})]});
assert.equal(construction.added.length,1,'A Construction request cannot be reused as a Legal Contract.');
const ambiguous=submit({rows:[contract('207',{Proforma:'100'}),contract('208',{Proforma:'100'})]});
assert.equal(ambiguous.out.success,false);
assert.equal(ambiguous.added.length,0);
assert.ok(ambiguous.rows.every(row=>row.Contract_Name==='Other Name'),'Ambiguity stops before Contract mutation.');
const duplicateNames=submit({rows:[contract('209',{Contract_Name:'ACQ (PSA) - Source'}),contract('210',{Contract_Name:'ACQ (PSA) - Source'})]});
assert.equal(duplicateNames.out.success,false);
assert.equal(duplicateNames.added.length,0);
for(const name of ['ACQ (PSA) - Source','Acquisition - Source','Source - LOI']){
  for(const reverse of ['sources','worksheets']){
    const options={rows:[contract('211',{Contract_Name:name})]};
    options[reverse]=reverse==='sources'?[{ID:'101',Name:'Source',LOI_Contract:'211'}]:[{ID:'301',Proforma:'101',Contract:'211'}];
    const conflict=submit(options);
    assert.equal(conflict.out.success,false,'Same-name legacy Contract ownership is checked through '+reverse+'.');
    assert.equal(conflict.added.length,0);
    assert.equal(conflict.rows[0].Proforma,null,'A foreign reverse pointer prevents source reassignment.');
    assert.equal(conflict.rows[0].Contract_Name,name,'Conflict stops before any Contract mutation.');
  }
}
const contradictory=submit({rows:[contract('212',{Proforma:'100'})],sources:[{ID:'101',LOI_Contract:'212'}]});
assert.equal(contradictory.out.success,false,'Contradictory reverse ownership blocks even a populated direct lookup.');
const sameSourceReverse=submit({rows:[contract('213',{Contract_Name:'ACQ (PSA) - Source'})],sources:[{ID:'100',LOI_Contract:'213'}],worksheets:[{ID:'302',Proforma:'100',Contract:'213'}]});
assert.equal(sameSourceReverse.out.success,true,'Consistent reverse pointers preserve legacy reuse.');
assert.equal(sameSourceReverse.out.contractId,'213');

let validation=read(base+'Contract.Proforma.validate.dg').replace(/alert ([^;]+);/g,'throw new Error($1);').replace(/cancel submit;/g,'');
const validationProgram=translate('string validateFixture() {\n'+validation+'\nreturn "ok";\n}').js;
function validate(input,exists=true){
  const context=vm.createContext({input,exists});
  vm.runInContext('function ifnull(v,d){return v==null?d:v;} function query(){return {count(){return exists?1:0;}};}',context);
  vm.runInContext(validationProgram,context);
  return ()=>vm.runInContext('validateFixture()',context);
}
for(const type of ['Acquisition','ACQ (PSA)','ACQ (LOI)']){
  assert.equal(validate({Contract_Type:type,Work_Module:'Legal',Proforma:'100'})(),'ok');
}
assert.equal(validate({Contract_Type:'Issue',Work_Module:'Legal',Proforma:null})(),'ok','Legacy and non-acquisition blank links remain valid.');
assert.throws(validate({Contract_Type:'Issue',Work_Module:'Legal',Proforma:'100'}),/only be linked/);
assert.throws(validate({Contract_Type:'ACQ (PSA)',Work_Module:'Construction',Proforma:'100'}),/only be linked/);
assert.throws(validate({Contract_Type:'ACQ (PSA)',Work_Module:'Legal',Proforma:'100'},false),/unavailable/);

console.log('PASS Contract Proforma backend: exact source/subtype identity, rename and reverse-pointer reuse, legacy recovery, foreign direct/reverse ownership and Construction exclusion, ambiguous-match stop, acquired lookup assignment, optional legacy validation and restricted report/permission candidates.');
