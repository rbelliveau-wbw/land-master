import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import {crewManagementFixture} from './fixtures/crew-locations.mjs';

function harness(read){
 const data=crewManagementFixture(),calls=[],reports={All_Crews:data.crews,Crew_Assignment_Report:data.assignments,All_Subdivisions:data.subdivisions};
 const scope=vm.createContext({Date,Intl,Map,Set,Number,String,Object,Math,LMData:{readAll:async options=>{calls.push(options);const rows=structuredClone(reports[options.reportName]);for(const row of rows)for(const field of options.fields)if(!Object.hasOwn(row,field))row[field]='';return read?read(options,{...reports,[options.reportName]:rows}):rows;}}});scope.window=scope;
 vm.runInContext(fs.readFileSync('widgets/crew-locations/src/app/crew-model.js','utf8'),scope);
 const source=fs.readFileSync('widgets/crew-locations/src/app/crew-manager.js','utf8');
 vm.runInContext(source.replaceAll('install,state:S,load,switchWorkspace,','install,state:S,load,switchWorkspace,readComplete,'),scope);
 return {read:scope.CrewManager.readComplete,calls,data};
}
const capabilities=assignments=>({permissions:{view:true,assignments},sources:{crews:true},management:{enabled:true,nativeWrites:true,protocol:'native-validated-v1'}});

test('roster reads the complete native SDK reports with no OAuth/API bridge or date-window filter',async()=>{
 const h=harness(),cancelled=()=>false,result=await h.read(capabilities(true),cancelled);
 assert.equal(result.crews.length,4);assert.equal(result.assignments.length,9);assert.equal(result.phases.length,6);
 assert.deepEqual(h.calls.map(call=>call.reportName).sort(),['All_Crews','All_Subdivisions','Crew_Assignment_Report']);
 for(const call of h.calls){assert.equal(call.fresh,true);assert.equal(call.isCancelled,cancelled);assert.equal(call.criteria,undefined);assert.ok(call.fields.includes('ID'));}
 assert.ok(result.assignments.some(row=>row.date==='2026-11-04'),'future work survives the schedule badge window');
 assert.equal(result.crews.find(row=>row.code==='U2').active,true);
 assert.equal(result.crews.find(row=>row.code==='RC').active,false);
 assert.ok(result.assignments.every(row=>typeof row.id==='string'&&typeof row.crewId==='string'&&typeof row.phaseId==='string'));
});

test('module denial and unavailable sources reject before reading private reports',async()=>{
 const h=harness();await assert.rejects(h.read({...capabilities(true),permissions:{view:false}}),/access has not been granted/);
 await assert.rejects(h.read({...capabilities(true),sources:{crews:false}}),/not configured/);assert.equal(h.calls.length,0);
});

test('native report denial and hidden required fields never return a partial roster',async()=>{
 const denied=harness(async options=>{if(options.reportName==='Crew_Assignment_Report')throw Error('Permission denied');return [];});
 await assert.rejects(denied.read(capabilities(true)),/Permission denied/);
 const missing=harness(async(options,reports)=>structuredClone(reports[options.reportName]).map(row=>{if(options.reportName==='Crew_Assignment_Report')delete row.Source_Key;return row;}));
 await assert.rejects(missing.read(capabilities(true)),/must expose native field Source_Key/);
});

test('native row scope, read-only rights, imported lineage and phase locks remain authoritative',async()=>{
 const h=harness(async(options,reports)=>structuredClone(reports[options.reportName]).filter(row=>row.ID!=='90071992547409933'&&row.ID!=='90071992547407011'));
 const result=await h.read(capabilities(false));assert.ok(!result.phases.some(row=>row.id==='90071992547409933'));assert.ok(!result.assignments.some(row=>row.id==='90071992547407011'));
 assert.ok(result.assignments.every(row=>row.editable===false));assert.ok(result.phases.every(row=>row.editable===false));
 const full=await harness().read(capabilities(true));assert.equal(full.assignments.find(row=>row.id==='90071992547407012').editable,false);assert.ok(full.phases.some(row=>row.editable===false&&row.reason==='This phase is locked.'));
});

test('unsafe record IDs and missing lookup identities cannot become editable assignments',async()=>{
 for(const corrupt of [row=>row.Crew={display_value:'Crew without native identity'},row=>row.ID=90071992547409930]){
  const h=harness(async(options,reports)=>{const rows=structuredClone(reports[options.reportName]);if(options.reportName==='Crew_Assignment_Report')corrupt(rows[0]);return rows;});
  await assert.rejects(h.read(capabilities(true)),/incomplete assignment|unsafe numeric/);
 }
});
