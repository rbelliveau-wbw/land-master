// Actual Tax controller and shared scheduler; native-shaped fixtures, no live writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {source,readTaxScript} from './tax-source.mjs';

export const clone=value=>JSON.parse(JSON.stringify(value));
export const REPORT='All_Tax_Parcel_Years',FIELD='Arbitration_Notice_Received';
export const ID='90071992547409941',OTHER='90071992547409942';
export const reports={parcelYears:REPORT,rawLand:'All_Property',companies:'All_Companies',subdivisions:'All_Subdivisions',jurisdictions:'All_Taxing_Jurisdictions',projects:'All_Projects'};
const fieldsByReport=Object.fromEntries([['Tax_Parcel_Year',REPORT],['Property',reports.rawLand]].map(([form,report])=>[report,Object.fromEntries(JSON.parse(fs.readFileSync('creator/generated/fields/'+form+'.json','utf8')).fields.map(field=>[field.link_name,field]))]));
export const row=id=>({ID:id,Tax_Parcel_Year_Code:'fixture-'+id,Tax_Year:'2026',Company1:{ID:'90071992547440000',zc_display_value:'Series 125'},Property_ID:'000073',Status:'Under Protest',[FIELD]:'28-Sep-2026'});
export const rawThrottle={status:429,responseText:JSON.stringify({code:2955,description:'Minute API limit reached'})};
export const drain=async()=>{for(let index=0;index<20;index++)await new Promise(resolve=>setImmediate(resolve));};
export function held(){let resolve;return {promise:new Promise(yes=>resolve=yes),resolve:value=>resolve(value)};}
export function idsOf(config){const criteria=config.payload.criteria;assert.match(criteria,/^\(ID == \d+\)(?: \|\| \(ID == \d+\))*$/);const ids=[...criteria.matchAll(/ID == (\d+)/g)].map(match=>match[1]);assert.equal(new Set(ids).size,ids.length);assert.ok(ids.length<=200);return ids;}
export const acknowledged=ids=>({code:3000,result:ids.map(ID=>({code:3000,data:{ID},message:'Data Updated Successfully!'}))});

export function harness(options={}){
 let now=0,sequence=0;
 class FakeDate extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
 const timers=new Map(),calls=[],writes=[],published=[],hooks={},progress=[];
 const runtime={user:'fixture',environment:'PRODUCTION',appLinkName:'land-master'},scope={value:'(Tax_Year == 2026)'};
 const storage={[REPORT]:clone(options.rows||[row(ID)]),[reports.rawLand]:clone(options.properties||[{ID:'90071992547420000',Property_ID:'000073',Land_Type:'Original'}])};
 const selected=config=>{const rows=storage[config.report_name]||[],criteria=String(config.criteria||'');if(/^\(ID == \d+\)(?: \|\| \(ID == \d+\))*$/.test(criteria)){const ids=new Set([...criteria.matchAll(/ID == (\d+)/g)].map(match=>match[1]));return rows.filter(value=>ids.has(value.ID));}return rows;};
 async function native(method,config,action){calls.push({method,config:clone(config),at:now});return action();}
 const DATA={
  getRecordCount:config=>native('count',config,async()=>{const value=hooks.count?await hooks.count(config):undefined;return value===undefined?{code:3000,result:{records_count:String(selected(config).length)}}:value;}),
  getRecords:config=>native('records',config,async()=>{const value=hooks.records?await hooks.records(config):undefined;if(value!==undefined)return value;const rows=selected(config),offset=Number(config.record_cursor||0),page=rows.slice(offset,offset+200),next=offset+page.length;return {code:3000,data:clone(page),...(next<rows.length?{record_cursor:String(next)}:{})};}),
  updateRecordById:config=>native('update',config,async()=>{writes.push(clone(config));const apply=()=>Object.assign(storage[config.report_name].find(value=>value.ID===config.id),clone(config.payload.data));if(hooks.update)return hooks.update(config,apply);apply();return {code:3000,data:{ID:config.id}};}),
  updateRecords:config=>native('batch',config,async()=>{writes.push(clone(config));const ids=idsOf(config),apply=(targets=ids)=>targets.forEach(id=>{const record=storage[config.report_name].find(value=>value.ID===id);assert.ok(record,'exact captured ID exists');Object.assign(record,clone(config.payload.data));});if(hooks.batch)return hooks.batch(config,apply,ids);apply();return acknowledged(ids);}),
 };
 const c=vm.createContext({Date:FakeDate,performance:{now:()=>now},setTimeout(fn,ms){const id=++sequence;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id),LMRuntime:{current:()=>runtime,apply:()=>runtime},ZOHO:{CREATOR:{UTIL:{getInitParams:async()=>({})},DATA}}});
 c.window=c;
 for(const name of ['creator-data.js','tax-controller.js'])vm.runInContext(readTaxScript(name),c);
 const configuration=source.match(/if\(window\.LMData\)LMData\.configure\(\{maxRequestsPerMinute:45,readRetryOnThrottle:true\}\);/);
 assert.ok(configuration,'Tax startup retains the proven shared request budget and safe read retry');vm.runInContext(configuration[0],c);
 const tax=c.LMTaxPreparation.create({reports,forms:{property:'Property',parcelYear:'Tax_Parcel_Year'},fieldsByReport,scopeKey:()=>scope.value,verificationTimeoutMs:options.verificationTimeoutMs,mutationTimeoutMs:options.mutationTimeoutMs,onRecovery:(operation,value)=>published.push(clone(value)),onBatchOpen(){},onBatchProgress:value=>progress.push(clone(value))});
 async function advance(ms){const until=now+ms;for(let steps=0;steps<10000;steps++){const first=[...timers].filter(([,timer])=>timer.at<=until).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!first)break;now=first[1].at;timers.delete(first[0]);first[1].fn();await drain();}now=until;await drain();}
 async function finish(promise){let done=false,result,failure;promise.then(value=>{done=true;result=value;},error=>{done=true;failure=error;});for(let step=0;step<2000&&!done;step++){await drain();if(done)break;const next=Math.min(...[...timers.values()].map(timer=>timer.at));assert.ok(Number.isFinite(next),'a pending fixture needs a real request or deadline timer');await advance(next-now);}assert.equal(done,true,'the captured request must settle');if(failure)throw failure;return result;}
 return {c,tax,DATA,calls,writes,published,storage,hooks,progress,runtime,scope,timers,advance,finish,now:()=>now};
}
export async function ready(options){const h=harness(options);await h.finish(h.tax.start());assert.equal((await h.finish(h.tax.reloadReferences())).published,true);assert.equal((await h.finish(h.tax.search(h.scope.value))).published,true);return h;}
