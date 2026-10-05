// Execute the checked-in Deluge engine and native action bodies against local
// fixtures. This verifies business arithmetic; it is not a Creator compiler.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';

const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
// Optional installation QA: run this same fixture suite against an explicitly
// supplied captured/reopened native body. Default repository checks use only
// checked-in sources and never depend on local installation captures.
const nativeSources=new Map();
for(let i=2;i<process.argv.length;i+=3) {
  assert.equal(process.argv[i],'--native-source','expected --native-source <workflow> <file>');
  assert.ok(process.argv[i+1] && process.argv[i+2],'native source requires workflow and file');
  nativeSources.set(process.argv[i+1],process.argv[i+2]);
}
const engineSource = read('creator/functions/Calculate_Takedown_Cadence.dg');
const engineJs = translate(engineSource).js;
const workflows = Object.fromEntries([
  'Update_Takedown_Dates_Tak', 'Update_Expected_Sold_Coun', 'Refresh_Calc_Fields_Taked',
  'Validate_Takedown_Cadence', 'Recalculate_Takedown_Cadence_On_Save',
].map(name => {
  const source = nativeSources.has(name)?fs.readFileSync(nativeSources.get(name),'utf8'):read(`creator/workflows/${name}.dg`);
  const body = source.replace(/\binfo\s+([^;]+);/g, 'info($1);')
    .replace(/\balert\s+([^;]+);/g, 'alert($1);')
    .replace(/cancel submit;/g, 'cancelSubmit();');
  const js = translate(`void runWorkflow()\n{\n${body}\n}`).js
    .replace(/\bNULL\b/g, 'null').replace(/\.count\(ID\)/g, '.count()')
    .replace(/\.minimum\((\w+)\)/g, '.minimum("$1")');
  return [name, {source, js}];
}));
for(const name of nativeSources.keys()) assert.ok(workflows[name],`unknown workflow override ${name}`);

const day = 86400000;
const start = Date.UTC(2026, 0, 1);
function runtime({tables = {}, input = {}, now = start} = {}) {
  const context = vm.createContext({tablesJson: JSON.stringify(tables), inputJson: JSON.stringify(input), now});
  vm.runInContext(`
    var tables = JSON.parse(tablesJson), input = JSON.parse(inputJson);
    var today = now, messages = [], alerts = [];
    function ifnull(value, fallback) { return value == null ? fallback : value; }
    function Map() { return {put(key,value) { this[key] = value; }, get(key) { return this[key] ?? null; }}; }
    function floor(value) { return Math.floor(value); }
    function ceil(value) { return Math.ceil(value); }
    function abs(value) { return Math.abs(value); }
    function daysBetween(from,to) { return (to-from)/86400000; }
    function addDay(from,amount) { return from+amount*86400000; }
    function info(message) { messages.push(message); }
    function alert(message) { alerts.push(message); }
    function cancelSubmit() { throw new Error('CANCEL_SUBMIT'); }
    Number.prototype.toDecimal = function() { return Number(this); };
    Number.prototype.toLong = function() { return Math.trunc(this); };
    Number.prototype.floor = function() { return Math.floor(this); };
    Number.prototype.ceil = function() { return Math.ceil(this); };
    Number.prototype.addDay = function(amount) { return Number(this)+amount*86400000; };
    Object.defineProperty(Number.prototype, 'Builder_Name', {get() { return 'Builder'; }});
    String.prototype.toDecimal = function() { const n = Number(this); if (!Number.isFinite(n)) throw new Error('Invalid number'); return n; };
    Array.prototype.count = function() { return this.length; };
    Object.defineProperty(Array.prototype, 'Subdivision_Code', {get() { return 'PHASE'; }});
    function record(row) { return new Proxy(row, {get(object,key) { return object[key] ?? null; }}); }
    function query(form,predicate,sort) {
      const rows = (tables[form] ?? []).map(record).filter(predicate);
      if (sort) rows.sort((a,b) => a[sort]-b[sort]);
      rows.minimum = field => rows.length ? Math.min(...rows.map(row => row[field]).filter(value => value != null)) : null;
      return new Proxy(rows, {
        get(object,key) { return key in object || typeof key === 'symbol' ? object[key] : object[0]?.[key] ?? null; },
        set(object,key,value) { if (key in object || !object.length) object[key] = value; else object[0][key] = value; return true; },
      });
    }
    ${engineJs}
    var thisapp = {Calculate_Takedown_Cadence};
  `, context);
  return {
    context,
    calculate(terms) {
      context.termsJson = JSON.stringify(terms);
      return JSON.parse(vm.runInContext(`var terms = Map(); Object.assign(terms,JSON.parse(termsJson)); JSON.stringify(Calculate_Takedown_Cadence(terms));`, context));
    },
    workflow(name) {
      try {
        vm.runInContext(workflows[name].js + '\nrunWorkflow();', context);
      } catch (error) {
        if (error.message !== 'CANCEL_SUBMIT') throw error;
      }
      return JSON.parse(vm.runInContext('JSON.stringify({tables,input,messages,alerts})', context));
    },
  };
}
const baseTerms = {
  Total_Lot_Obligation:30, Initial_Takedown:10, Initial_Due_Offset_Days:30,
  Second_Closing_Lots:7, Second_Closing_Days:45,
  Continued_Takedown:4, Continued_Takedown_Delay_Days:20, Elapsed_Days:0,
};
const calculate = (overrides = {}) => runtime().calculate({...baseTerms, ...overrides});
for (const [elapsed, expected] of [[-80,0],[0,0],[29,0],[30,10],[74,10],[75,17],[94,17],[95,21],[115,25],[135,29],[155,30],[5000,30]]) {
  const result = calculate({Elapsed_Days:elapsed});
  assert.equal(result.ok,true,`valid at day ${elapsed}`);
  assert.equal(result.lotsExpected,expected,`expected lots at day ${elapsed}`);
  assert.equal(result.initialDueOffsetDays,30);
  assert.equal(result.secondDueOffsetDays,75);
  assert.equal(result.endOffsetDays,155);
}
assert.equal(calculate({Second_Closing_Lots:10, Elapsed_Days:74}).lotsExpected,10);
assert.equal(calculate({Second_Closing_Lots:10, Elapsed_Days:75}).lotsExpected,20);
assert.equal(calculate({Second_Closing_Lots:10, Elapsed_Days:95}).lotsExpected,24);
assert.equal(calculate({Total_Lot_Obligation:35, Second_Closing_Lots:10, Continued_Takedown:10, Continued_Takedown_Delay_Days:30}).endOffsetDays,135);
console.log('PASS: one-time Second Closing at day 75 inclusive, different quantities/frequencies, signed future start and partial final take');

for (const [total, elapsed, expected, end] of [[8,29,0,30],[8,30,8,30],[15,74,10,75],[15,75,15,75],[15,5000,15,75]]) {
  const result = calculate({Total_Lot_Obligation:total, Continued_Takedown:0, Continued_Takedown_Delay_Days:0, Elapsed_Days:elapsed});
  assert.equal(result.ok,true);
  assert.equal(result.lotsExpected,expected);
  assert.equal(result.endOffsetDays,end);
}
for (const [total,elapsed,expected,end] of [[20,74,10,75],[20,75,20,75],[8,30,8,30]]) {
  for (const blank of [null,'']) {
    const result=calculate({Total_Lot_Obligation:total,Second_Closing_Lots:10,Continued_Takedown:blank,Continued_Takedown_Delay_Days:blank,Elapsed_Days:elapsed});
    assert.equal(result.ok,true,'unused recurring terms may be blank');
    assert.equal(result.lotsExpected,expected);
    assert.equal(result.endOffsetDays,end);
  }
}
assert.equal(calculate({Second_Closing_Days:0, Elapsed_Days:29}).lotsExpected,0);
assert.equal(calculate({Second_Closing_Days:0, Elapsed_Days:30}).lotsExpected,17);
assert.equal(calculate({Initial_Due_Offset_Days:0, Second_Closing_Days:0, Elapsed_Days:0}).lotsExpected,17);
assert.equal(calculate({Initial_Takedown:0, Initial_Due_Offset_Days:0, Second_Closing_Days:0, Elapsed_Days:0}).lotsExpected,7);
for (const invalid of [
  {Second_Closing_Lots:null}, {Second_Closing_Days:null}, {Second_Closing_Lots:0},
  {Second_Closing_Lots:-1}, {Second_Closing_Days:-1}, {Second_Closing_Lots:1.5},
  {Initial_Due_Offset_Days:1.5}, {Continued_Takedown:0}, {Continued_Takedown_Delay_Days:0},
  {Total_Lot_Obligation:0}, {Initial_Takedown:null}, {Continued_Takedown:null},
  {Second_Closing_Days:'bad'}, {Elapsed_Days:0.5},
]) {
  const result = calculate(invalid);
  assert.equal(result.ok,false,JSON.stringify(invalid));
  assert.equal(result.lotsExpected,undefined,'invalid terms cannot provide replacement expected lots');
  assert.equal(result.endOffsetDays,undefined,'invalid terms cannot provide replacement end date');
}
console.log('PASS: initial-only, second-only, zero-day grace/Second Closing, capped obligation and invalid/partial cadence without division by zero');

function schedule(overrides = {}) {
  return {
    ID:1, Subdivisions:[101,102], Builder1:7, Status:'Active', Initial_Closing_Date:start,
    Takedown_Start_Date:start, Takedown_End_Date:start+999*day, Total_Lot_Obligation:30,
    Initial_Takedown:10, Initial_Delay_Days:30, Second_Closing_Lots:7,
    Second_Closing_Days:45, Continued_Takedown:4, Continued_Takedown_Delay_Days:20,
    Lots_Expected:999, Lots_Sold:10, Completion_Percent:0,
    ...overrides,
  };
}
const soldLots = Array.from({length:10}, (_, i) => ({ID:i+1, Builder1:7, Status:'Sold', Purchase_Date:start, Subdivision:i<5?101:102}));
function runAction(name, row, elapsed, lots = soldLots) {
  return runtime({tables:{Takedown_Schedule:[row],Lots:lots},input:row,now:start+elapsed*day}).workflow(name);
}
for (const [elapsed, expected] of [[-5,0],[29,0],[30,10],[74,10],[75,17],[95,21],[155,30]]) {
  const row = schedule({Takedown_Start_Date:start-20*day});
  const daily = runAction('Update_Expected_Sold_Coun',row,elapsed).tables.Takedown_Schedule[0];
  const dates = runAction('Update_Takedown_Dates_Tak',row,elapsed).tables.Takedown_Schedule[0];
  const manual = runAction('Refresh_Calc_Fields_Taked',row,elapsed).input;
  const saved = runAction('Recalculate_Takedown_Cadence_On_Save',row,elapsed).tables.Takedown_Schedule[0];
  for (const output of [daily, manual, saved]) {
    assert.equal(output.Lots_Expected,expected,`daily/manual/save at day ${elapsed}`);
    assert.equal(output.Takedown_Start_Date,start,'explicit actual Initial Closing wins');
    assert.equal(output.Takedown_End_Date,start+155*day);
  }
  assert.equal(dates.Takedown_End_Date,start+155*day);
  assert.equal(manual.Lots_Sold,10,'multi-phase sales count unchanged');
  assert.equal(manual.Status,expected>10?'Behind':'Active');
  assert.equal(saved.Status,expected>10?'Behind':'Active');
}
for (const name of ['Update_Expected_Sold_Coun','Refresh_Calc_Fields_Taked','Recalculate_Takedown_Cadence_On_Save']) {
  const row = schedule({Second_Closing_Lots:10});
  const before = runAction(name,row,74);
  const due = runAction(name,row,75);
  const output = value => name==='Refresh_Calc_Fields_Taked'?value.input:value.tables.Takedown_Schedule[0];
  assert.equal(output(before).Lots_Expected,10);
  assert.equal(output(due).Lots_Expected,20);
  if (name!=='Update_Expected_Sold_Coun') assert.equal(output(due).Status,'Behind');
}
const fallbackRow=schedule({Initial_Closing_Date:null,Takedown_Start_Date:start});
assert.equal(runAction('Update_Expected_Sold_Coun',fallbackRow,75).tables.Takedown_Schedule[0].Lots_Expected,17);
const noStart=schedule({Initial_Closing_Date:null,Takedown_Start_Date:null,Lots_Expected:null});
assert.equal(runAction('Update_Expected_Sold_Coun',noStart,75,[]).tables.Takedown_Schedule[0].Lots_Expected,0);
for (const name of ['Update_Expected_Sold_Coun','Update_Takedown_Dates_Tak','Refresh_Calc_Fields_Taked','Recalculate_Takedown_Cadence_On_Save']) {
  const row={...noStart,Lots_Expected:123,Lots_Sold:0};
  const result=runAction(name,row,75,[]);
  const output=name==='Refresh_Calc_Fields_Taked'?result.input:result.tables.Takedown_Schedule[0];
  if(name!=='Update_Takedown_Dates_Tak') assert.equal(output.Lots_Expected,0,'valid no-start expected is zero even if stale');
  assert.equal(output.Takedown_End_Date,null,'valid no-start clears stale end date');
  const invalid={...row,Second_Closing_Days:null,Lots_Expected:null};
  const invalidResult=runAction(name,invalid,75,[]);
  const invalidOutput=name==='Refresh_Calc_Fields_Taked'?invalidResult.input:invalidResult.tables.Takedown_Schedule[0];
  assert.equal(invalidOutput.Lots_Expected,null,'invalid no-start cannot initialize expectation');
  assert.equal(invalidOutput.Takedown_End_Date,invalid.Takedown_End_Date,'invalid no-start cannot clear end date');
}
for (const [total,elapsed,expected,end] of [[20,74,10,75],[20,75,20,75],[8,30,8,30]]) {
  const row=schedule({Total_Lot_Obligation:total,Second_Closing_Lots:10,Continued_Takedown:null,Continued_Takedown_Delay_Days:null});
  assert.equal(validate(row).alerts.length,0,'unused blank recurrence passes native validation');
  for(const name of ['Update_Expected_Sold_Coun','Refresh_Calc_Fields_Taked','Recalculate_Takedown_Cadence_On_Save']) {
    const result=runAction(name,row,elapsed);
    const output=name==='Refresh_Calc_Fields_Taked'?result.input:result.tables.Takedown_Schedule[0];
    assert.equal(output.Lots_Expected,expected,'unused blank recurrence matches native paths');
    assert.equal(output.Takedown_End_Date,start+end*day);
  }
}
for (const name of ['Update_Expected_Sold_Coun','Update_Takedown_Dates_Tak','Refresh_Calc_Fields_Taked','Recalculate_Takedown_Cadence_On_Save']) {
  const partial=schedule({Second_Closing_Days:null,Lots_Expected:123});
  const result=runAction(name,partial,75);
  const output=name==='Refresh_Calc_Fields_Taked'?result.input:result.tables.Takedown_Schedule[0];
  assert.equal(output.Lots_Expected,123,'partial new cadence cannot silently run legacy formula');
  assert.equal(output.Takedown_End_Date,partial.Takedown_End_Date);
}
const invalidBehind=schedule({Status:'Behind',Second_Closing_Days:null,Takedown_Schedule_Code:'KEEP',Completion_Percent:42});
const invalidBehindResult=runAction('Refresh_Calc_Fields_Taked',invalidBehind,75).input;
assert.equal(invalidBehindResult.Takedown_Schedule_Code,'KEEP','invalid Behind terms cannot bypass the cadence guard');
assert.equal(invalidBehindResult.Completion_Percent,42);
for(const name of ['Update_Expected_Sold_Coun','Refresh_Calc_Fields_Taked','Recalculate_Takedown_Cadence_On_Save']) {
  const completed=schedule({Status:'Completed',Lots_Expected:123});
  const result=runAction(name,completed,75);
  const output=name==='Refresh_Calc_Fields_Taked'?result.input:result.tables.Takedown_Schedule[0];
  assert.equal(output.Lots_Expected,123,'Completed expected-lots gate preserved');
  assert.equal(output.Status,'Completed');
}
console.log('PASS: checked-in daily/manual/save paths agree at all boundaries; actual-date override, multi-phase sales, no-start initialization and partial-input protection');

const legacy=schedule({Second_Closing_Lots:null,Second_Closing_Days:null,Initial_Closing_Date:null,Takedown_End_Date:start+130*day});
assert.equal(runAction('Update_Expected_Sold_Coun',legacy,30).tables.Takedown_Schedule[0].Lots_Expected,0,'legacy exact initial day remains strict');
assert.equal(runAction('Update_Expected_Sold_Coun',legacy,75).tables.Takedown_Schedule[0].Lots_Expected,18);
assert.equal(runAction('Refresh_Calc_Fields_Taked',legacy,75).input.Lots_Expected,18);
const legacyMissingEnd={...legacy,Takedown_End_Date:null};
assert.equal(runAction('Update_Takedown_Dates_Tak',legacyMissingEnd,75).tables.Takedown_Schedule[0].Takedown_End_Date,start+130*day);
const legacyExistingEnd={...legacy,Takedown_End_Date:start+200*day};
assert.equal(runAction('Update_Takedown_Dates_Tak',legacyExistingEnd,75).tables.Takedown_Schedule[0].Takedown_End_Date,start+200*day,'legacy missing-end-only gate');
assert.equal(runAction('Update_Expected_Sold_Coun',{...legacy,Takedown_Start_Date:start+80*day,Takedown_End_Date:start+210*day},0).tables.Takedown_Schedule[0].Lots_Expected,18,'legacy future-start abs behavior preserved');
assert.equal(runAction('Update_Expected_Sold_Coun',{...legacy,Initial_Delay_Days:0,Continued_Takedown:0},0).tables.Takedown_Schedule[0].Lots_Expected,10,'legacy upfront special case preserved');
assert.deepEqual(runAction('Recalculate_Takedown_Cadence_On_Save',legacy,75).tables.Takedown_Schedule[0],legacy,'legacy on-save is a no-op');
console.log('PASS: untouched legacy strict boundaries, recurrence, future-date abs behavior, existing end dates, upfront special case and on-save no-op');

function validate(input,saved=null) {
  return runtime({input,tables:{Takedown_Schedule:saved?[saved]:[]}}).workflow('Validate_Takedown_Cadence');
}
assert.equal(validate({...legacy,Status:'Behind'},legacy).alerts.length,0,'unrelated legacy edits allowed');
for (const change of [{Total_Lot_Obligation:31},{Initial_Takedown:11},{Initial_Delay_Days:31},{Continued_Takedown:5},{Continued_Takedown_Delay_Days:21},{Initial_Closing_Date:start},{Takedown_Start_Date:start+day}]) {
  assert.equal(validate({...legacy,...change},legacy).alerts.length,1,'legacy cadence edits require Second Closing: '+JSON.stringify(change));
}
assert.equal(validate({...legacy,ID:null}).alerts.length,1,'new schedule requires Second Closing');
assert.equal(validate(schedule({ID:null})).alerts.length,0,'new complete cadence allowed');
assert.equal(validate(schedule(),legacy).alerts.length,0,'explicit migration accepted');
assert.equal(validate(schedule({Second_Closing_Days:null}),legacy).alerts.length,1,'partial migration rejected');
assert.equal(validate({...schedule(),Second_Closing_Lots:null,Second_Closing_Days:null},schedule()).alerts.length,1,'new cadence cannot revert to legacy');
console.log('PASS: native validation protects new cadence, requires Second Closing on legacy cadence/total/anchor edits and permits unrelated historical edits');

assert.match(engineSource,/\n\s*return result;\s*\n}\s*$/,'typed unconditional outer fallback');
assert.doesNotMatch(engineSource,/\bwhile\s*\(|containsKey\s*\(|\babs\s*\(|Takedown_Schedule\[/);
for (const {source} of Object.values(workflows)) assert.doesNotMatch(source,/\bContract\[|\.Contract\s*=/,'schedule-only scope');
assert.match(workflows.Update_Expected_Sold_Coun.source,/\(Status != "Completed" && Second_Closing_Lots != null\) \|\| \(Status != "Completed" && Second_Closing_Days != null\)/,'mixed query remains safe if native save removes grouping');
assert.match(workflows.Refresh_Calc_Fields_Taked.source,/if\(cadenceCanRefresh\)\s*\{\s*if\(input.Status == "Active" \|\| input.Status == "Behind"\)/,'invalid cadence guard remains safe if native save removes grouping');

// Guard the actual exported action bodies as well as behavioral fixtures.
// Reconcile captured live bodies separately during native installation; ignored
// installation evidence is not required for this repository regression.
function loops(source) {
  const clean=source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,'');
  const result=[];
  const pattern=/for each\s+\w+\s+in\s+\w+\[[^\]]+\]\s*(?:sort by\s+\w+\s*)?\{/g;
  for (let match; (match=pattern.exec(clean));) {
    let depth=1, end=pattern.lastIndex;
    for (;end<clean.length && depth;end++) {
      if(clean[end]==='{') depth++;
      else if(clean[end]==='}') depth--;
    }
    assert.equal(depth,0,'closed exported loop body');
    result.push(clean.slice(match.index,end));
    pattern.lastIndex=end;
  }
  return result;
}
function normalizedLegacy(loop) {
  return loop.replace(/\[\s*\(Second_Closing_Lots == null && Second_Closing_Days == null\)\s*&&\s*\(([\s\S]*?)\)\s*\]/,'[$1]')
    .replace(/\s+/g,'');
}
const exportSource=read('creator/exports/Land_Master_2026-08-06.ds');
function exportedWorkflow(name,next) {
  return exportSource.slice(exportSource.indexOf(name+' as '),exportSource.indexOf(next+' as '));
}
const originalDateLoops=loops(exportedWorkflow('Update_Takedown_Dates_Tak','Update_Expected_Sold_Coun'));
const originalExpectedLoops=loops(exportedWorkflow('Update_Expected_Sold_Coun','Update_Subdivision_Status'));
assert.equal(originalDateLoops.length,1);
assert.equal(originalExpectedLoops.length,3);
const candidateDateLoops=loops(workflows.Update_Takedown_Dates_Tak.source);
const candidateExpectedLoops=loops(workflows.Update_Expected_Sold_Coun.source);
assert.equal(normalizedLegacy(candidateDateLoops[0]),normalizedLegacy(originalDateLoops[0]),'date legacy loop retains all original gates/assignments');
assert.deepEqual([0,2,3].map(i=>normalizedLegacy(candidateExpectedLoops[i])),originalExpectedLoops.map(normalizedLegacy),'expected legacy actions retain original bodies and order');
console.log('PASS: combined daily replacements retain complete original legacy action bodies, criteria and ordering');
if(nativeSources.size) console.log('PASS: all applicable fixtures executed against reopened native body: '+[...nativeSources.keys()].join(', '));
