import assert from 'node:assert/strict';
import fs from 'node:fs';
import {harness} from './fixtures/proforma-sdk-v2-harness.mjs';
const properties=Array.from({length:2139},(_,i)=>({ID:String(900000+i),Common_Name:'Property '+i}));
const companies=Array.from({length:204},(_,i)=>({ID:String(910000+i),Company_Name:'Company '+i}));
const deferredReports=new Set(['All_Companies','All_Builders','All_Property','Proforma_Item_Report','All_Construction_Cost_Curves']);
const drain=async()=>{for(let i=0;i<15;i++)await new Promise(resolve=>setImmediate(resolve));};
function held(){let resolve;const promise=new Promise(yes=>{resolve=yes});return{promise,resolve};}
{
 const baseline=harness({source:fs.readFileSync('releases/proforma-manager/1.80.69/index.html','utf8'),storage:{All_Property:properties,All_Companies:companies}});await baseline.c.__pfBoot;
 const h=harness({storage:{All_Property:properties,All_Companies:companies}});assert.equal((await h.c.__pfBoot).published,true);
 assert.equal(h.widget.S.coreReady,true);assert.equal(h.widget.S.properties.length,0);assert.equal(h.widget.pfReferencesReady(),false);
 assert.equal(h.calls.filter(call=>deferredReports.has(call.config.report_name)).length,0,'main list needs no lookup or template request');
 const firstCalls=h.calls.length;await h.widget.ensurePFReferences();assert.equal(h.widget.S.properties.length,2139);assert.equal(h.widget.S.companies.length,204);
 assert.equal(new Set(h.widget.S.properties.map(row=>row.ID)).size,2139);assert.equal(h.calls.filter(call=>call.method==='records'&&call.config.report_name==='All_Property').length,3);
 const completeCalls=h.calls.length;await h.widget.ensurePFReferences();assert.equal(h.calls.length,completeCalls,'reuse the complete actor-bound reference snapshot');assert.equal(h.writes.length,0);
 assert.ok(firstCalls<baseline.calls.length);
 console.log('PF startup evidence: '+baseline.calls.length+' → '+firstCalls+' initial requests; '+(completeCalls-firstCalls)+' deferred requests; all 2139 properties/204 companies preserved.');
}
{
 const gate=held(),h=harness({storage:{All_Property:properties},read:async config=>{if(config.report_name==='All_Property')await gate.promise;}});await h.c.__pfBoot;
 const opening=h.widget.openEdit(null);await drain();assert.equal(h.widget.S.ed.model,null,'no draft seeded from incomplete template/reference data');assert.equal(h.widget.S.properties.length,0);assert.equal(h.writes.length,0);
 gate.resolve();await opening;assert.equal(h.widget.pfReferencesReady(),true);assert.equal(h.widget.S.properties.length,2139);assert.equal(h.widget.S.ed.isNew,true);
}
{
 let denied=true;const h=harness({storage:{All_Property:properties},read:async config=>config.report_name==='All_Property'&&denied?{code:2898,message:'Denied'}:undefined});await h.c.__pfBoot;
 assert.equal(await h.widget.openEdit(null),false);assert.equal(h.widget.S.ed.model,null);assert.equal(h.widget.pfReferencesReady(),false);assert.equal(h.writes.length,0);
 denied=false;await h.widget.openEdit(null);assert.equal(h.widget.pfReferencesReady(),true);assert.equal(h.widget.S.ed.isNew,true);
}
{
 const gate=held(),h=harness({storage:{All_Property:properties},read:async config=>{if(config.report_name==='All_Property')await gate.promise;}});await h.c.__pfBoot;const pending=h.widget.ensurePFReferences();await drain();
 h.c.LMRuntime.apply({envUrlFragment:'/environment/development',loginUser:'different@example.test'});gate.resolve();await assert.rejects(pending);assert.equal(h.widget.S.referenceContext,'');assert.equal(h.widget.S.properties.length,0);assert.equal(h.widget.S.companies.length,0);assert.equal(h.writes.length,0);
}
console.log('PASS actual PF first-screen/lazy options: complete cursor IDs, atomic actor-bound publication, held/failing options block drafts, retry and no business writes.');
