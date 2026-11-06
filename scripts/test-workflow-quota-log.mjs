// Execute the captured/native Deluge reader with local HTTP fixtures.
// This adapter does not replace Creator Save/Execute syntax verification.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('creator/functions/analyticsExportRows.dg', 'utf8');
const before = fs.readFileSync('creator/quota-reduction-2026-11-05/native-before/development/analyticsExportRows.dg', 'utf8');
const auditId = '4410926000000000001';
const jobId = '90001';
const waiting = 'Waiting for Analytics export';
const downloading = 'Downloading completed Analytics export';
const processing = 'Processing Analytics rows';

function compile(native) {
  const strings = [];
  let code = native.replace(/"(?:\\.|[^"\\])*"/g, value => `STRINGTOKEN${strings.push(value) - 1}END`);
  code = code.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');
  const signature = code.match(/^\s*list\s+(\w+)\(([^)]*)\)\s*\{/);
  const args = signature[2].split(',').map(arg => arg.trim().split(/\s+/).at(-1));
  code = code.replace(signature[0], `function ${signature[1]}(${args.join(',')}){`);
  code = code.replace(/invokeurl\s*\[([\s\S]*?)\]/g, (_, request) => 'fixtureHttp({' + request.trim().split('\n').map(line => line.trim()).filter(Boolean).map(line => line.replace(/^type\s*:\s*(\w+)$/, (_, type) => `type:"${type}"`)).join(',') + '})');
  code = code.replace(/\{\s*((?:(?:STRINGTOKEN\d+END|\d+)\s*,\s*)*(?:STRINGTOKEN\d+END|\d+))\s*\}/g, '[$1]');
  code = code.replace(/for each\s+(\w+) in ([^\n{]+)/g, 'for ($1 of $2)');
  const variables = [...new Set([...code.matchAll(/(?<![.\w])([A-Za-z_]\w*)\s*=(?!=)/g)].map(match => match[1]).concat([...code.matchAll(/for \((\w+) of/g)].map(match => match[1])))].filter(name => !args.includes(name));
  code = code.replace(`function ${signature[1]}(${args.join(',')}){`, `function ${signature[1]}(${args.join(',')}){var ${variables.join(',')};`);
  return code.replace(/STRINGTOKEN(\d+)END/g, (_, index) => strings[Number(index)]);
}

function runtime(native = source, options = {}) {
  const calls = [], events = [], delays = [];
  const context = vm.createContext({ calls, events, delays, options: JSON.stringify(options) });
  vm.runInContext(`
    var fixture = JSON.parse(options);
    function ifnull(value, fallback) { return value == null ? fallback : value; }
    function Map() { return {}; }
    function List() { return []; }
    Object.defineProperties(Object.prototype, {
      get: {value: function(key) { return this[key] ?? null; }},
      put: {value: function(key, value) { this[key] = value; }},
      remove: {value: function(key) { delete this[key]; }},
      keys: {value: function() { return Object.keys(this); }},
      toString: {value: function() { return JSON.stringify(this); }}
    });
    Array.prototype.get = function(index) { return this[index] ?? null; };
    Array.prototype.add = function(value) { this.push(value); };
    Array.prototype.contains = function(value) { return this.includes(value); };
    Array.prototype.size = function() { return this.length; };
    String.prototype.toMap = function() { return JSON.parse(this); };
    String.prototype.contains = function(value) { return this.includes(value); };
    var thisapp = {workflowRunLog(event) {
      events.push(JSON.parse(JSON.stringify(event)));
      if (fixture.auditFailure) throw Error('Ambiguous audit response; do not replay');
      return {id: '${auditId}'};
    }};
    function getUrl(url) { delays.push(url); }
    function fixtureHttp(config) {
      calls.push(JSON.parse(JSON.stringify(config)));
      if (fixture.transportFailure) throw Error('socket timeout');
      let body;
      if (config.url.includes('/views/')) body = {status: 'success', data: {jobId: '${jobId}'}};
      else if (config.url.endsWith('/data?exportFormat=json')) {
        if (fixture.downloadFailure) return {responseCode: 503, responseText: 'unavailable'};
        body = {data: fixture.rows ?? [{Code: 'EA04', Cost: 42}]};
      } else body = {status: 'success', data: {jobId: fixture.replyJob ?? '${jobId}', jobCode: fixture.jobCode ?? '1004'}};
      return {responseCode: 200, responseText: JSON.stringify(body)};
    }
    ${compile(native)}
  `, context);
  return {
    calls, events, delays,
    run(config = {_resumeJobId: jobId, _resumeJobComplete: true}, allowEmpty = false, id = auditId) {
      context.args = JSON.stringify(['view-id', {selectedColumns: ['Code', 'Cost'], ...config}, id, allowEmpty]);
      return JSON.parse(vm.runInContext('JSON.stringify(analyticsExportRows(...JSON.parse(args)))', context));
    }
  };
}

{
  const baseline = runtime(before), candidate = runtime();
  assert.deepEqual(candidate.run(), baseline.run(), 'Retain the same acknowledged immutable source rows');
  assert.equal(baseline.events.length, 3);
  assert.deepEqual(candidate.events.map(event => event.stage), [downloading, processing]);
  assert.equal(candidate.events.at(-1).counts.received, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(candidate.calls)), JSON.parse(JSON.stringify(baseline.calls)), 'Only the redundant audit request changes; Analytics traffic is unchanged');
  assert.equal(candidate.calls.length, 1, 'Acknowledged prepared completion still downloads directly');
  assert.equal(candidate.calls[0].type, 'GET');
  assert.equal(candidate.delays.length, 0);
}

// A job ID alone does not prove completion; retain its waiting/status checkpoint.
for (const config of [{_resumeJobId: jobId}, {_resumeJobId: jobId, _resumeJobComplete: false}]) {
  const h = runtime(); h.run(config);
  assert.deepEqual(h.events.map(event => event.stage), [waiting, downloading, processing]);
  assert.equal(h.calls.length, 2);
  assert.equal(h.calls.some(call => call.url.includes('/views/')), false);
}
for (const config of [{}, {_resumeJobComplete: true}]) {
  const h = runtime(); h.run(config);
  assert.deepEqual(h.events.map(event => event.stage), [waiting, downloading, processing]);
  assert.equal(h.calls.length, 3, 'Unprepared calls retain creation, completion check and download');
}
for (const options of [{jobCode: '1002'}, {jobCode: '1003'}, {replyJob: 'wrong-job'}]) {
  const h = runtime(source, options);
  assert.throws(() => h.run({_resumeJobId: jobId}));
  assert.deepEqual(h.events.map(event => event.stage), [waiting]);
  assert.equal(h.calls.length, 1, 'Refused prepared jobs are neither recreated nor downloaded');
}
{
  const h = runtime(source, {downloadFailure: true});
  assert.throws(() => h.run(), error => String(error).includes('download HTTP 503'));
  assert.deepEqual(h.events.map(event => event.stage), [downloading], 'Retain the durable checkpoint before a failing download');
  assert.equal(h.calls.length, 1);
}
{
  const h = runtime(source, {transportFailure: true});
  assert.throws(() => h.run(), error => String(error).includes('ANALYTICS_READ_TIMEOUT|download|'));
  assert.equal(h.calls.length, 1, 'A read timeout is propagated without an added retry');
}
{
  const h = runtime(source, {auditFailure: true});
  assert.throws(() => h.run(), error => String(error).includes('Ambiguous audit response'));
  assert.equal(h.events.length, 1);
  assert.equal(h.calls.length, 0, 'An uncertain checkpoint is not replayed or followed by a download');
}
{
  const h = runtime(source, {rows: []});
  assert.deepEqual(h.run(undefined, true), []);
  assert.equal(h.events.at(-1).counts.received, 0);
}
for (const rows of [[], [{Code: 'EA04'}]]) {
  const h = runtime(source, {rows});
  assert.throws(() => h.run());
  assert.deepEqual(h.events.map(event => event.stage), [downloading], 'Preserve empty/source-column checks before processing');
}
for (const config of [{}, {_resumeJobId: jobId}, {_resumeJobId: jobId, _resumeJobComplete: true}]) {
  const h = runtime(); h.run(config, false, '');
  assert.equal(h.events.length, 0, 'Audit-free readers remain audit-free');
}

console.log('PASS: prepared completed exports save one audit API request while preserving download/count checkpoints, unprepared checks, source rows, failures and no replay.');
