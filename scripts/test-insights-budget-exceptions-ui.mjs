import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createPFTestDOM} from './fixtures/proforma-sdk-v2-dom.mjs';

const directory='widgets/lot-sales-explorer/src/app/';
const source=fs.readFileSync(directory+'budget-exceptions-app.js','utf8');
const permissions={hasRow:true,budgetExceptionsDashboard:true,today:'2026-11-09'};
const held=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const drain=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function fixture(){
  const budget=(ID,Subdivision1,approved)=>({ID,Subdivision1,Development_Budget_Approval_Status:approved?'Approved':'Draft',Const_Budget_Approval_Status:approved?'Approved':'Pending',Budget_Name:'Budget '+ID,Added_Time:'2026-11-01',Status:'Active'});
  const category=(ID,Budget,final)=>({ID,Budget,Budget_Category_Name:'Construction',Deparment:'Construction',Category_Code:'CON',Budget_Total:final,Template_Item:false});
  const item=(ID,Budget,Budget_Category,final,gp,hcss)=>({ID,Budget,Budget_Category,Item_Name:'Water',Budget_Code:'CON-220',Cost_Code:'220',Budget_Ttl:final,PROJ_Actual:gp,HCSS_Actuals:hcss,Template_Item:false});
  return{budgets:[budget('101','201',false),budget('102','202',true)],categories:[category('301','101',null),category('302','102',100)],items:[item('401','101','301',null,100,125),item('402','102','302',100,140,130)],approvals:[{ID:'501',Budget:'101',Type1:'Construction',Status:'Pending',Sent_Date:'2026-10-10',Budget_Modification:null,Proforma:null}],subdivisions:[{ID:'201',Subdivision_Name:'Turnbo Ranch',Project:'601',Territory:'Fort Hood'},{ID:'202',Subdivision_Name:'Mesa Ridge',Project:'602',Territory:'Central Texas'}],projects:[{ID:'601',Project_Name:'Turnbo Project'},{ID:'602',Project_Name:'Mesa Project'}]};
}
function harness(route={}){
  const dom=createPFTestDOM('<body><button id="refresh"></button><section id="budgetExceptionsDashboard"></section></body>');
  const originalCreate=dom.document.createElement,originalGet=dom.document.getElementById;
  function enhance(node){
    if(!node||node.__enhanced)return node;node.__enhanced=true;
    Object.defineProperties(node,{
      firstElementChild:{get:()=>node.children[0]||null},
      nextElementSibling:{get:()=>{const children=node.parentNode?.children||[];return children[children.indexOf(node)+1]||null;}},
      selectedOptions:{get:()=>node.options.filter(option=>option.selected)}
    });
    node.multiple=node.hasAttribute('multiple');
    node.insertBefore=(child,before)=>{const old=child.parentNode;if(old){const at=old.children.indexOf(child);if(at>=0)old.children.splice(at,1);}const at=before?node.children.indexOf(before):-1;node.children.splice(at<0?node.children.length:at,0,child);child.parentNode=node;child.isConnected=true;return child;};
    node.remove=()=>{const parent=node.parentNode;if(parent){const at=parent.children.indexOf(node);if(at>=0)parent.children.splice(at,1);}node.parentNode=null;node.isConnected=false;};
    node.replaceChildren=(...children)=>{for(const child of [...node.children])node.removeChild(child);for(const child of children)node.appendChild(child);};
    return node;
  }
  dom.document.getElementById=id=>enhance(originalGet(id));
  dom.document.createElement=tag=>{
    if(tag!=='template')return enhance(originalCreate(tag));
    const container=originalCreate('div');
    return{set innerHTML(value){container.innerHTML=value;},get content(){return{firstElementChild:enhance(container.children[0])};}};
  };
  const listeners=new Map(),loads=[],requests=[],identity={environment:'DEVELOPMENT',user:'viewer@example.com',appLinkName:'land-master'},calls={mount:0,apply:0};
  const context=vm.createContext({document:dom.document,setTimeout,clearTimeout,Intl,Map,Set,URL,URLSearchParams});context.window=context;
  context.addEventListener=(name,fn)=>{if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn);};
  context.LMRuntime={current:()=>({...identity})};context.InsightsShell={current:()=> 'budget-exceptions',connected:()=>true,route:()=>route};
  context.InsightsControls={mount(){calls.mount++;},syncAll(){},values:control=>control.options.filter(option=>option.selected&&option.value).map(option=>option.value),setValues:(control,values)=>control.options.forEach(option=>option.selected=values.includes(option.value))};
  context.InsightsNumbers={markup:value=>String(value),capture:()=>new Map(),apply(){calls.apply++;}};
  context.ZOHO={CREATOR:{DATA:{}}};
  vm.runInContext(fs.readFileSync(directory+'sales-model.js','utf8'),context);
  vm.runInContext(fs.readFileSync(directory+'budget-exceptions-model.js','utf8'),context);
  context.InsightsBudgetExceptionsCreator={load:async(_api,_references,_progress,options)=>{requests.push(options);const request=held();loads.push(request);return request.promise;}};
  vm.runInContext(source,context);
  const node=id=>enhance(originalGet(id));
  const emit=(name,detail)=>{for(const fn of listeners.get(name)||[])fn({detail});};
  const show=()=>emit('insights:dashboard','budget-exceptions');
  const click=async target=>{await node('budgetExceptionsDashboard').fire('click',{target});};
  return{...dom,node,context,loads,requests,identity,calls,emit,show,click};
}
{
  const h=harness();h.emit('insights:access',{hasRow:true,budgetExceptionsDashboard:false,today:permissions.today});h.show();await drain();
  assert.equal(h.loads.length,0,'Denied dashboards never request budget reports');assert.equal(h.node('beLoading').hidden,true);assert.equal(h.node('beBody').children.length,0);
  h.emit('insights:access',{...permissions,hasRow:false});h.show();await drain();assert.equal(h.loads.length,0,'A dashboard flag without a User Access row is insufficient');
}
{
  const h=harness();h.emit('insights:access',permissions);h.show();await drain();
  assert.equal(h.calls.mount,1,'The existing custom picker mounts on the persistent dashboard');assert.equal(h.loads.length,1);
  assert.equal(h.node('beLoading').hidden,false);assert.equal(h.node('beMatrix').getAttribute('aria-busy'),'true');assert.equal(h.node('beBody').children.length,0,'No partial rows appear before the complete snapshot');
  h.loads[0].resolve(fixture());await drain();
  assert.equal(h.context.BudgetExceptionsApp.ready(),true);assert.equal(h.node('beLoading').hidden,true);assert.equal(h.node('beMatrix').getAttribute('aria-busy'),'false');
  const body=h.node('beBody'),phase=body.querySelector('.be-phase'),category=body.querySelector('.be-category'),line=body.querySelector('.be-line');
  assert.match(phase.textContent,/Turnbo Ranch/);assert.match(phase.textContent,/No Final/);assert.match(phase.textContent,/\$100/);assert.match(phase.textContent,/\$125/);assert.equal(category.hidden,false);assert.equal(line.hidden,false,'The first phase and its category expose actual budget lines');
  const phaseButton=phase.querySelector('[data-be-toggle-phase]');phaseButton.focus();await h.click(phaseButton);
  assert.equal(category.hidden,true);assert.equal(line.hidden,true);assert.equal(body.querySelector('.be-phase'),phase,'Disclosures retain mounted row identity');assert.equal(h.document.activeElement,phaseButton);
  await h.click(phaseButton);const categoryButton=category.querySelector('[data-be-toggle-category]');await h.click(categoryButton);assert.equal(line.hidden,true);await h.click(categoryButton);assert.equal(line.hidden,false);
  await h.click(h.node('beCards').querySelector('[data-be-exception="over"]'));
  assert.equal(h.node('beTitle').textContent,'Over Final Budget');assert.match(body.textContent,/Mesa Ridge/);assert.doesNotMatch(body.textContent,/Turnbo Ranch/);assert.match(body.textContent,/\+\$40/);
  assert.equal(h.node('beCards').querySelector('[data-be-exception="over"]').getAttribute('aria-pressed'),'true');
  h.context.InsightsControls.setValues(h.node('beProject'),['601']);await h.node('beProject').fire('change');
  assert.equal(body.children.length,0);assert.equal(h.node('beEmpty').hidden,false);assert.match(h.node('beCards').querySelector('[data-be-count="missing"]').textContent,/1Phase/,'Cards reflect filter scope independently of the selected exception');
  await h.node('beReset').fire('click');assert.match(body.textContent,/Turnbo Ranch/);assert.equal(h.node('beEmpty').hidden,true);
  const before=body.querySelector('.be-phase'),refresh=h.context.BudgetExceptionsApp.refresh();await drain();
  assert.equal(h.node('beLoading').hidden,false);assert.equal(body.querySelector('.be-phase'),before,'Refresh keeps the authorized complete report mounted');
  h.loads[1].reject(Error('Native report denied'));await refresh;await drain();assert.equal(body.querySelector('.be-phase'),before);assert.equal(h.node('beLoading').hidden,true);assert.equal(h.node('beRetry').hidden,false);assert.match(h.node('beNoticeText').textContent,/Native report denied/);
  const stale=h.context.BudgetExceptionsApp.refresh();await drain();h.emit('insights:access',null);
  assert.equal(body.children.length,0,'Losing access clears financial data immediately');assert.equal(h.context.BudgetExceptionsApp.ready(),false);assert.equal(h.node('beLoading').hidden,true);assert.equal(h.requests[2].isCancelled(),true);
  h.loads[2].resolve(fixture());await stale;await drain();assert.equal(body.children.length,0,'A late response cannot republish a revoked report');
}
{
  const h=harness();h.emit('insights:access',permissions);h.show();await drain();
  h.identity.user='other@example.com';h.emit('insights:access',permissions);h.show();await drain();
  assert.equal(h.loads.length,2);h.loads[0].resolve(fixture());await drain();assert.equal(h.node('beBody').children.length,0);assert.equal(h.node('beLoading').hidden,false,'The old request cannot hide a newer loader');
  h.loads[1].resolve(fixture());await drain();assert.match(h.node('beBody').textContent,/Turnbo Ranch/);assert.match(h.context.BudgetExceptionsApp.scope(),/other@example.com/);
}
{
  const h=harness();h.emit('insights:access',{...permissions,today:''});h.show();await drain();assert.equal(h.loads.length,0);assert.equal(h.node('beLoading').hidden,true);assert.match(h.node('beNoticeText').textContent,/Creator application date/);assert.equal(h.node('beBody').children.length,0);
}
{
  const h=harness({projectId:'unavailable-project'});h.emit('insights:access',permissions);h.show();await drain();h.loads[0].resolve(fixture());await drain();
  assert.equal(h.node('beBody').children.length,0,'An unavailable deep-link Project never widens the query to every project');assert.equal(h.node('beProject').selectedOptions[0].value,'unavailable-project');
  await h.node('beReset').fire('click');assert.equal(h.node('beProject').selectedOptions[0].value,'unavailable-project','Reset restores the explicit route scope');assert.equal(h.node('beBody').children.length,0);
}
{
  const h=harness();h.emit('insights:access',permissions);h.show();await drain();h.loads[0].resolve(fixture());await drain();
  h.context.InsightsControls.setValues(h.node('beProject'),['601']);await h.node('beProject').fire('change');await h.node('beCollapse').fire('click');
  h.emit('insights:access',null);assert.equal(h.node('beProject').selectedOptions.filter(option=>option.value).length,0,'Revalidation clears the visible old scope');
  h.emit('insights:access',permissions);h.show();await drain();h.loads[1].resolve(fixture());await drain();
  assert.equal(h.node('beProject').selectedOptions[0].value,'601','The same authorized actor retains explicit filter choices after revalidation');assert.equal(h.node('beBody').querySelector('.be-category').hidden,true,'The same actor retains collapsed disclosure choices');
  h.identity.user='different@example.com';h.emit('insights:access',permissions);h.show();await drain();h.loads[2].resolve(fixture());await drain();assert.equal(h.node('beProject').selectedOptions.filter(option=>option.value).length,0,'Another actor cannot inherit the previous actor’s filter choices');
}
console.log('Budget Exceptions UI: permission gates, combined cards/hierarchy, mounted disclosures, scoped filters, loading, retained refresh, errors and stale-reply isolation passed.');
