import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8');
const start=html.indexOf('function loadBudgetDetail('),end=html.indexOf('\n/* ── LANDING:',start);
assert.ok(start>=0&&end>start);
const codeStart=html.indexOf('function budgetSdkCode('),codeEnd=html.indexOf('\nfunction budgetMissingReport(',codeStart);
assert.ok(codeStart>=0&&codeEnd>codeStart);
const category={ID:'900002',Budget:{ID:'900001'}},item={ID:'900003',Budget_Category:{ID:'900002'}};
const nativeFailures=[
  {label:'native quota response',value:{code:2955,description:'You have reached your API call limit for a minute.'}},
  {label:'nested quota response',value:{code:3000,result:{code:2955,description:'Minute API limit reached'}}},
  {label:'HTTP quota rejection',reject:true,value:{status:429,responseText:'{"code":2955,"description":"Minute API limit reached"}'}},
  {label:'HTTP quota without native code',reject:true,value:{status:429}},
  {label:'native permission rejection',reject:true,value:{code:2898,message:'Permission denied'}},
  {label:'wrapped permission rejection',reject:true,value:{permissionDenied:true,raw:{code:2898}}},
  {label:'cancelled read',reject:true,value:{cancelled:true,message:'Load superseded.'}},
  {label:'wrapped cancelled read',reject:true,value:{cause:{cancelled:true}}},
  {label:'HTTP permission rejection',reject:true,value:{status:403}},
  {label:'server transport failure',reject:true,value:{status:503}},
  {label:'disconnected transport',reject:true,value:{status:0}},
  {label:'fetch transport failure',reject:true,value:new TypeError('Failed to fetch')}
];

async function exercise(report,stage,failure){
  const calls=[],oldCategories=[{ID:'retained-category'}],oldItems=[{ID:'retained-item'}];
  const S={detailLoads:{},detailGeneration:{},categories:{'900001':oldCategories},items:{'900001':oldItems}};
  const api={
    getRecordCount:config=>read('count',config),
    getRecords:config=>read('records',config)
  };
  function read(kind,config){
    calls.push({kind,...config});
    if(config.report_name===report&&kind===stage&&config.criteria){
      if(failure.reject)return Promise.reject(failure.value);
      return Promise.resolve(failure.value);
    }
    return Promise.resolve(kind==='count'?{code:3000,result:{records_count:'1'}}:{code:3000,data:[config.report_name==='categories'?category:item]});
  }
  const context=vm.createContext({S,CFG:{reports:{categories:'categories',items:'items'}},Promise,Date,Map,Set,Error,
    budgetDetailReady:()=>false,budgetDetailPublishAllowed:()=>true,setLoad(){},auditLog(){},compareCategoryRecords:()=>0,compareItemRecords:()=>0,
    rowBelongsToBudget:(row,id)=>row.Budget?.ID===id,rowBelongsToCategory:(row,ids)=>ids.includes(row.Budget_Category?.ID)
  });
  vm.runInContext(fs.readFileSync('shared/creator-data.js','utf8'),context);
  vm.runInContext(html.slice(codeStart,codeEnd),context);
  context.sdkGetAllRecords=(reportName,criteria)=>context.LMData.readAll({api,reportName,criteria});
  vm.runInContext(html.slice(start,end),context);
  await assert.rejects(context.loadBudgetDetail('900001'),undefined,`${failure.label}, ${report} ${stage}`);
  assert.equal(calls.filter(call=>!call.criteria).length,0,`${failure.label} must not trigger a full report`);
  assert.equal(calls.filter(call=>call.report_name===report).length,stage==='count'?1:2,'Failed criteria is attempted once');
  assert.equal(S.categories['900001'],oldCategories,'Failure cannot replace the published category snapshot');
  assert.equal(S.items['900001'],oldItems,'Failure cannot replace the published item snapshot');
  assert.equal(Object.keys(S.detailLoads).length,0,'Failed reads release their in-flight receipt');
  assert.equal(Object.keys(S.detailRefreshing).length,0,'Failed reads release their refreshing state');
}

for(const report of ['categories','items'])for(const stage of ['count','records'])for(const failure of nativeFailures)await exercise(report,stage,failure);
console.log('PASS Budget detail native quota, permission, cancellation and transport errors never fan out to full reports or publish partial snapshots.');
