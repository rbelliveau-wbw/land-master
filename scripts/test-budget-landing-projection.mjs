import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8').replace(/\r\n/g,'\n');
const adapter = fs.readFileSync('widgets/budget-manager/src/app/creator-data.js','utf8');
const fields = JSON.parse(source.match(/landingCategoryFields:\s*(\[[^\]]+\])/)[1]);
assert.deepEqual(fields,['ID','Budget','Deparment','Prelim_Budget_Total','Budget_Total']);
function block(name) {
  const start = source.indexOf(`function ${name}(`), next = source.indexOf('\nfunction ',start + 1);
  assert.ok(start >= 0 && next > start,name);
  return source.slice(start,next);
}
const plain = value => JSON.parse(JSON.stringify(value));
const reports = Object.fromEntries(['budgets','subdivisions','projects','categories','approvals','proformas','modifications','items'].map(name => [name,name]));
const budgets = [
  ['Pending','Pending'],['Pending','Approved'],['Approved','Pending'],['Approved','Approved'],
  ['Approved','Pending'],['Approved','Approved'],['Approved','Approved']
].map(([construction,development],index) => ({ID:`90000000000000000${index + 1}`,Const_Budget_Approval_Status:construction,Development_Budget_Approval_Status:development,Prelim_Budget_Grand_Total:987,Budget_Grand_Total:654}));
const fullCategories = budgets.slice(0,4).flatMap((budget,index) => [
  ['Construction',100,1000],['Development',20,200],['Engineering',-25,-250],['Other',10,100]
].map(([department,prelim,final],category) => ({ID:`8000000000000000${index}${category}`,Budget:{ID:budget.ID,display_value:'Phase'},Deparment:department,Prelim_Budget_Total:String(prelim),Budget_Total:String(final),Category_Code:`${category + 1}000`,Budget_Category_Name:`${department} category`,Description:'Full detail only'})));
fullCategories.push({ID:'800000000000000040',Budget:{ID:budgets[6].ID},Deparment:'Construction',Prelim_Budget_Total:'',Budget_Total:'0',Category_Code:'1000',Budget_Category_Name:'Zero category'});
const items = fullCategories.map((category,index) => ({ID:`7000000000000000${String(index).padStart(2,'0')}`,Budget_Category:{ID:category.ID},Item_Name:'Detail line',Description:'Persisted note'}));
const data = {budgets,categories:fullCategories,items,subdivisions:[],projects:[],approvals:[],proformas:[],modifications:[]};
const nativeCalls = [];
function selected(config) {
  let rows = data[config.report_name];
  if(config.report_name === 'categories' && config.criteria)rows = rows.filter(row => config.criteria.includes(row.Budget.ID));
  if(config.report_name === 'items' && config.criteria)rows = rows.filter(row => config.criteria.includes(row.Budget_Category.ID));
  return rows;
}
const context = vm.createContext({
  S:{liveSDK:true,useMock:false,budgets:[],landingCategories:{},categories:{},items:{},detailLoads:{},detailGeneration:{}},
  CFG:{reports,landingCategoryFields:fields,reportCandidates:{}},
  LMRuntime:{current:() => ({environment:'PRODUCTION',user:'server_session',appLinkName:'land-master'})},
  ZOHO:{CREATOR:{DATA:{
    async getRecordCount(config){return {code:3000,result:{records_count:selected(config).length}};},
    async getRecords(config){
      nativeCalls.push(plain(config));
      const rows = selected(config);
      return {code:3000,data:config.field_config === 'custom' ? rows.map(row => Object.fromEntries(config.fields.split(',').map(field => [field,row[field]]))) : plain(rows)};
    }
  }}},
  setLoad:() => {},auditLog:() => {},hydrateBudgetSubdivisions:() => {},buildProjects:() => [],
  compareCategoryRecords:() => 0,compareItemRecords:() => 0,shortErr:error => error?.message || String(error)
});
context.window = context;
vm.runInContext(adapter,context);
for(const name of ['cleanVal','isObj','rawPath','firstRaw','lookupId','getReportCandidates','budgetSdkCode','budgetMissingReport','sdkGetAllRecords','validateLandingCategoryRows','loadAll','budgetApprovalStatus','trackIsApproved','catDept','v','landingCategoryTotal','budgetTotal','loadBudgetDetail'])vm.runInContext(block(name),context);
await context.loadAll();
const landingRequest = nativeCalls.find(config => config.report_name === 'categories');
assert.equal(landingRequest.field_config,'custom');
assert.equal(landingRequest.fields,fields.join(','),'the actual native SDK receives precisely five fields');
assert.equal(landingRequest.criteria,undefined,'landing totals use the complete category snapshot');
assert.equal(landingRequest.max_records,1000);
const projected = plain(context.S.landingCategories);
const expected = [105,60,1005,1050,987,654,0];
for(const [index,budget] of budgets.entries()) {
  const projectedTotal = context.budgetTotal(budget);
  context.S.landingCategories[budget.ID] = fullCategories.filter(category => category.Budget.ID === budget.ID);
  assert.equal(projectedTotal,context.budgetTotal(budget),'full and projected categories produce identical hybrid totals');
  assert.equal(projectedTotal,expected[index],'each independent approval track, Engineering, signed amounts, unknown departments and empty/zero cases keep their known total');
}
context.S.landingCategories = projected;
assert.equal(projected[budgets[0].ID][0].ID,fullCategories[0].ID,'unsafe-integer-sized IDs retain exact string values');
assert.deepEqual(Object.keys(projected[budgets[0].ID][0]).sort(),fields.slice().sort());
assert.equal(Object.keys(context.S.categories).length,0,'landing projection does not seed the full detail store');
await context.loadBudgetDetail(budgets[0].ID);
const detailRequest = nativeCalls.find(config => config.report_name === 'categories' && config.criteria);
assert.equal(detailRequest.field_config,'all','detail remains a full-field read');
assert.equal(detailRequest.fields,undefined);
assert.equal(detailRequest.criteria,`(Budget == ${budgets[0].ID})`);
assert.equal(context.S.categories[budgets[0].ID][0].Description,'Full detail only');
assert.equal(context.S.items[budgets[0].ID][0].Description,'Persisted note');
assert.equal(context.S.landingCategories[budgets[0].ID][0].Description,undefined,'detail cannot mutate the projected landing snapshot');
const criteria = `(Budget == ${budgets[0].ID})`, before = nativeCalls.length;
const [narrow,full] = await Promise.all([
  context.sdkGetAllRecords('categories',criteria,{fields}),context.sdkGetAllRecords('categories',criteria)
]);
assert.equal(narrow[0].Description,undefined);assert.equal(full[0].Description,'Full detail only');
assert.deepEqual(nativeCalls.slice(before).map(config => config.field_config).sort(),['all','custom'],'identical report/criteria with different fields are distinct reads');
for(const field of fields) {
  const malformed = {...projected[budgets[0].ID][0]};delete malformed[field];
  assert.throws(() => context.validateLandingCategoryRows([malformed]),new RegExp(field),'an omitted projected field cannot silently become a zero/fallback total');
}
assert.deepEqual(plain(context.validateLandingCategoryRows([])),[],'a confirmed empty category report remains valid');
console.log('Budget native five-field landing projection, mixed-track totals, exact IDs, full detail and disjoint field scopes passed.');
