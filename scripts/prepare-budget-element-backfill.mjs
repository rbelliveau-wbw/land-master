// Offline, one-time data preparation only. This file never connects to Creator,
// installs automation, or applies a record update. Import requires a separate
// native audit and deliberate update-existing-records action.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const COMPONENT_FIELDS = ['Labor_Budget','Materials_Budget','Equipment_Budget','Subcontractor_Budget','Other_Budget'];
export const COMPONENT_LABELS = ['(1) Labor','(2) Materials','(3) Equipment','(4) Subcontractor','(5) Other'];
export const PRELIM_COMPONENT_FIELDS = COMPONENT_FIELDS.map(name=>'Prelim_'+name);
const DEFAULT_ITEMS = {
  id:['ID','Record ID','Record_ID','id'],
  budgetId:['Budget.ID','Budget ID','Budget_ID','Budget'],
  categoryId:['Budget_Category.ID','Budget Category ID','Budget_Category_ID','Budget Category','Budget_Category'],
  template:['Template_Item','Template Item'],
  final:['Budget_Ttl','Final Budget Ttl','Final Budget Total','Final Budget'],
  department:['Department','Dept'],
  components:Object.fromEntries(COMPONENT_FIELDS.map((field,index)=>[field,[field,COMPONENT_LABELS[index],COMPONENT_LABELS[index].replace(') ',')')]]))
};
const DEFAULT_CATEGORIES = {
  id:['ID','Record ID','Record_ID','id'],
  budgetId:['Budget.ID','Budget ID','Budget_ID','Budget'],
  department:['Deparment','Department','Dept'],
  template:['Template_Item','Template Item']
};
const blank = value => value == null || typeof value==='string' && value.trim()==='';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function fail(message) { throw new Error(message); }

// RFC-style quoted CSV, including embedded quotes/newlines and CRLF. No numeric
// coercion: Creator IDs and native decimal strings must survive unchanged.
export function parseCsv(text) {
  text=String(text).replace(/^\uFEFF/,'').replace(/^sep=,\r?\n/i,'');
  const records=[];let row=[],field='',quoted=false,closedQuote=false;
  const endField=()=>{row.push(field);field='';closedQuote=false;};
  const endRow=()=>{endField();if(row.some(value=>value!==''))records.push(row);row=[];};
  for(let i=0;i<text.length;i++) {
    const char=text[i];
    if(quoted) {
      if(char==='"' && text[i+1]==='"'){field+='"';i++;}
      else if(char==='"'){quoted=false;closedQuote=true;}
      else field+=char;
    } else if(char===',') endField();
    else if(char==='\r'||char==='\n'){endRow();if(char==='\r'&&text[i+1]==='\n')i++;}
    else if(char==='"') {
      if(field!==''||closedQuote)fail('CSV contains a quote outside a quoted field.');
      quoted=true;
    } else if(closedQuote) {
      if(!/[ \t]/.test(char))fail('CSV contains text after a closing quote.');
    } else field+=char;
  }
  if(quoted)fail('CSV contains an unterminated quoted field.');
  if(field!==''||row.length||closedQuote)endRow();
  if(!records.length)fail('CSV has no header.');
  const headers=records.shift().map(value=>value.trim());
  if(headers.some(value=>!value)||new Set(headers).size!==headers.length)fail('CSV headers must be unique and nonblank.');
  return records.map((values,index)=>{
    if(values.length!==headers.length)fail(`CSV row ${index+2} has ${values.length} fields; expected ${headers.length}.`);
    return Object.fromEntries(headers.map((header,column)=>[header,values[column]]));
  });
}
export function csvText(headers,rows) {
  const cell=value=>{const text=blank(value)?'':String(value);return /[",\r\n]/.test(text)?'"'+text.replace(/"/g,'""')+'"':text;};
  return '\uFEFF'+[headers,...rows].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
export function readRows(filename) {
  const text=fs.readFileSync(filename,'utf8');
  if(!filename.toLowerCase().endsWith('.json'))return parseCsv(text);
  const source=JSON.parse(text.replace(/^\uFEFF/,''));
  const rows=Array.isArray(source)?source:source.data??source.records??source.All_Budget_Items??source.All_Budget_Categories;
  if(!Array.isArray(rows))fail('JSON input must be an array, or a native {data:[...]} / {records:[...]} envelope.');
  if(rows.some(row=>!row||typeof row!=='object'||Array.isArray(row)))fail('Every JSON record must be an object.');
  return rows;
}
function at(row,key) {
  if(Object.hasOwn(row,key))return {present:true,value:row[key]};
  let value=row;
  for(const part of key.split('.')) {
    if(!value||typeof value!=='object'||!Object.hasOwn(value,part))return {present:false};
    value=value[part];
  }
  return {present:true,value};
}
function field(row,spec,label,optional=false) {
  for(const key of Array.isArray(spec)?spec:[spec]) {
    const result=at(row,key);if(result.present)return result.value;
  }
  if(optional)return undefined;
  fail(`Missing ${label} column. Export it explicitly or supply a field mapping.`);
}
function recordId(raw,label) {
  if(raw&&typeof raw==='object')raw=raw.ID??raw.id;
  if(typeof raw!=='string'||!/^\d+$/.test(raw.trim()))fail(`${label} must be an exact string record ID, not a number or lookup display label.`);
  return raw.trim();
}
function nativeBoolean(raw,label) {
  if(raw===true||raw===false)return raw;
  if(typeof raw==='string') {
    const text=raw.trim().toLowerCase();
    if(['true','yes','1'].includes(text))return true;
    if(['false','no','0'].includes(text))return false;
  }
  fail(`${label} must explicitly identify true/false; a missing or blank template flag cannot authorize a change.`);
}
export function decimal4(raw,label='Final Budget Ttl') {
  if(typeof raw==='number') {
    if(!Number.isSafeInteger(raw))fail(`${label} must be a decimal string to retain native precision.`);
    raw=String(raw);
  }
  if(typeof raw!=='string')fail(`${label} is unavailable.`);
  let text=raw.trim().replace(/\u2212/g,'-');const accounting=/^\(.*\)$/.test(text);
  if(accounting)text=text.slice(1,-1);
  // Accept only correctly grouped native/display currency, with no exponents,
  // partial parses or rounding beyond the native four decimal places.
  if(!/^[+-]?\$?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,4})?$/.test(text))fail(`${label} is not an exact currency value with at most four decimal places.`);
  text=text.replace(/[$,]/g,'');let negative=text.startsWith('-')||accounting;
  if(accounting&&/^[+-]/.test(text))fail(`${label} contains conflicting signs.`);
  text=text.replace(/^[+-]/,'');const [whole,fraction='']=text.split('.');
  let units=BigInt(whole)*10000n+BigInt(fraction.padEnd(4,'0'));
  if(negative)units=-units;
  const abs=units<0n?-units:units;
  return {units,text:(units<0n?'-':'')+(abs/10000n).toString()+'.'+(abs%10000n).toString().padStart(4,'0')};
}
function department(raw) {return typeof raw==='string'?raw.trim().toLowerCase():'';}

export function planBackfill(items,categories=[],mapping={}) {
  const tier=mapping.tier??'final';
  if(!['final','preliminary'].includes(tier))fail('Tier must be final or preliminary.');
  const componentFields=tier==='preliminary'?PRELIM_COMPONENT_FIELDS:COMPONENT_FIELDS;
  const componentLabels=tier==='preliminary'?COMPONENT_LABELS.map(label=>'Prelim '+label):COMPONENT_LABELS;
  const componentAliases=Object.fromEntries(componentFields.map((name,index)=>[name,[name,componentLabels[index]] ]));
  const itemDepartment=mapping.departmentSource==='item';
  if(mapping.departmentSource&&!['item','category'].includes(mapping.departmentSource))fail('Department source must be item or category.');
  const itemFields={...DEFAULT_ITEMS,...mapping.items,components:{...componentAliases,...mapping.items?.components}};
  const sourceAmount=tier==='preliminary'?(mapping.items?.preliminary??['Prelim_Budget_Ttl','Prelim Budget Ttl','Preliminary Budget Ttl']):itemFields.final;
  const categoryFields={...DEFAULT_CATEGORIES,...mapping.categories};
  const output={id:'ID',...Object.fromEntries(componentFields.map((name,index)=>[name,componentLabels[index]])),...mapping.output};
  if(new Set(Object.values(output)).size!==6||Object.keys(output).length!==6||Object.values(output).some(value=>typeof value!=='string'||!value.trim()))fail('Output must contain only ID and the five distinct component column labels.');
  const headers=[output.id,...componentFields.map(name=>output[name])];
  const categoryMap=new Map(),itemIds=new Set();
  const summary={contract:'budget-elements-one-time-backfill-v1',mode:'prepared-only',tier,source_amount_field:tier==='preliminary'?'Prelim_Budget_Ttl':'Budget_Ttl',department_source:itemDepartment?'native Budget_Item.Department':'exact Budget_Category.ID join',source_item_count:items.length,source_category_count:categories.length,planned_count:0,by_department:{Development:0,Engineering:0},preserved_existing_allocation:0,skipped_template_items:0,skipped_template_categories:0,skipped_other_departments:0,skipped_missing_budget:0,skipped_missing_final:0,skipped_missing_preliminary:0,planned_zero_source_count:0,planned_negative_source_count:0,changes_only:componentFields,preserves:['Budget_Ttl','Prelim_Budget_Ttl','Unapproved_Final_Budget_Ttl','HCSS_Actuals','PROJ_Actual','Budget','Budget_Category','Template_Item','approvals','status','history',...(tier==='preliminary'?COMPONENT_FIELDS:PRELIM_COMPONENT_FIELDS)],scheduled_or_installed_automation:false};
  for(const [index,row] of (itemDepartment?[]:categories).entries()) {
    const id=recordId(field(row,categoryFields.id,'category ID'),'Category ID');
    if(categoryMap.has(id))fail('Category export contains duplicate IDs.');
    const template=nativeBoolean(field(row,categoryFields.template,'category Template Item'),'Category Template Item');
    const budget=field(row,categoryFields.budgetId,'category Budget ID');
    categoryMap.set(id,{template,budget:template&&blank(budget)?null:recordId(budget,'Category Budget ID'),department:department(field(row,categoryFields.department,'category Dept')),index});
  }
  const updates=[],rollback=[],preimages=[];
  for(const row of items) {
    const id=recordId(field(row,itemFields.id,'item ID'),'Item ID');
    if(itemIds.has(id))fail('Item export contains duplicate IDs.');itemIds.add(id);
    // Require all five columns even when a row will be excluded; omission of
    // a field must never masquerade as a fully blank component allocation.
    const components=componentFields.map(name=>field(row,itemFields.components[name],`item ${name}`));
    if(nativeBoolean(field(row,itemFields.template,'item Template Item'),'Item Template Item')){summary.skipped_template_items++;continue;}
    let scope,budget,categoryId;
    if(itemDepartment) {
      // Native report export lookup labels are provenance only, never a join.
      // Scope is the explicit Department picklist and writes use exact item ID.
      scope=department(field(row,itemFields.department,'native item Department'));
      if(!['development','engineering'].includes(scope)){summary.skipped_other_departments++;continue;}
      budget=field(row,itemFields.budgetId,'item Budget reference');
      if(blank(budget)){summary.skipped_missing_budget++;continue;}
      categoryId=field(row,itemFields.categoryId,'item Budget Category reference',true)??null;
    } else {
      budget=recordId(field(row,itemFields.budgetId,'item Budget ID'),'Item Budget ID');
      categoryId=recordId(field(row,itemFields.categoryId,'item Budget Category ID'),'Item Budget Category ID');
      const category=categoryMap.get(categoryId);if(!category)fail('An item references a category absent from the complete category export.');
      if(category.budget!==budget)fail('An item/category Budget ID mismatch would cross phase boundaries.');
      if(category.template){summary.skipped_template_categories++;continue;}
      scope=category.department;
      if(!['development','engineering'].includes(scope)){summary.skipped_other_departments++;continue;}
      const ownDepartment=department(field(row,itemFields.department,'item Department',true));
      if(ownDepartment&&ownDepartment!==scope)fail('Item Department disagrees with the exact native category Department; review before backfill.');
    }
    if(components.some(value=>!blank(value))){summary.preserved_existing_allocation++;continue;}
    const savedAmount=field(row,sourceAmount,`item ${summary.source_amount_field}`);
    if(blank(savedAmount)){summary[tier==='preliminary'?'skipped_missing_preliminary':'skipped_missing_final']++;continue;}
    const amount=decimal4(savedAmount,summary.source_amount_field),values=componentFields.map((_,index)=>index===(scope==='engineering'?0:4)?amount.text:'0.0000');
    updates.push([id,...values]);rollback.push([id,...components.map(value=>blank(value)?'':value)]);
    preimages.push({id,budgetReference:budget,categoryReference:categoryId,department:scope,fields:Object.fromEntries(componentFields.map((name,index)=>[name,components[index]??null])),sourceAmountField:summary.source_amount_field,sourceAmountValue:savedAmount,sourceRecord:row});
    summary.by_department[scope==='engineering'?'Engineering':'Development']++;
    if(amount.units===0n)summary.planned_zero_source_count++;
    if(amount.units<0n)summary.planned_negative_source_count++;
  }
  summary.planned_count=updates.length;
  return {headers,updates,rollback,preimages,summary};
}

export function runCli(args=process.argv.slice(2)) {
  const options={};for(let i=0;i<args.length;i+=2){if(!['--items','--categories','--out','--mapping','--department-source','--tier'].includes(args[i])||!args[i+1])fail('Usage: node scripts/prepare-budget-element-backfill.mjs --items items.json|csv --out output-directory [--categories categories.json|csv] [--department-source item|category] [--tier final|preliminary] [--mapping mapping.json]');options[args[i].slice(2)]=args[i+1];}
  if(!options.items||!options.out)fail('--items and --out are required.');
  const inputs=[options.items,...(options.categories?[options.categories]:[]),...(options.mapping?[options.mapping]:[])].map(value=>path.resolve(value));
  const out=path.resolve(options.out),filenames=['updates.csv','rollback.csv','rollback-preimage.json','summary.json'];
  if(filenames.some(name=>inputs.includes(path.join(out,name))))fail('Output paths must not overwrite input exports.');
  if(filenames.some(name=>fs.existsSync(path.join(out,name))))fail('Output files already exist. Use a fresh directory to preserve earlier audit and rollback artifacts.');
  const mapping=options.mapping?JSON.parse(fs.readFileSync(options.mapping,'utf8')):{};
  if(options['department-source'])mapping.departmentSource=options['department-source'];
  if(options.tier)mapping.tier=options.tier;
  if(mapping.departmentSource!=='item'&&!options.categories)fail('--categories is required for exact category-ID scope, or explicitly choose --department-source item for native Department scope.');
  const plan=planBackfill(readRows(options.items),options.categories?readRows(options.categories):[],mapping);
  const files={
    'updates.csv':csvText(plan.headers,plan.updates),
    'rollback.csv':csvText(plan.headers,plan.rollback),
    'rollback-preimage.json':JSON.stringify({contract:plan.summary.contract,mode:'read-only-preimage',records:plan.preimages},null,2)+'\n'
  };
  const summary={...plan.summary,input_sha256:{items:hash(fs.readFileSync(options.items)),...(options.categories?{categories:hash(fs.readFileSync(options.categories))}:{})},artifact_sha256:Object.fromEntries(Object.entries(files).map(([name,contents])=>[name,hash(contents)])),rollback_note:'Rollback CSV contains original blank components. Native import must explicitly clear blanks; confirm that behavior or restore exact nulls through the native record API. No rollback has been applied.'};
  files['summary.json']=JSON.stringify(summary,null,2)+'\n';
  fs.mkdirSync(out,{recursive:true});for(const [name,contents] of Object.entries(files))fs.writeFileSync(path.join(out,name),contents,{flag:'wx'});
  console.log(JSON.stringify(summary,null,2));return summary;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try{runCli();}catch(error){console.error(error.message);process.exitCode=1;}
}
