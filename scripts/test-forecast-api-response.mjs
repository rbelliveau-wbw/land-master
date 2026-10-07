// Exercise the widget's actual decoder without a Creator session or network.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../widgets/forecast-manager/src/app/forecast-app.js', import.meta.url), 'utf8');
const start = source.indexOf('  function decode(raw) {');
const end = source.indexOf('\n  async function request(', start);
assert.ok(start >= 0 && end > start, 'The actual forecast decoder must be available for regression checks');
const context = vm.createContext({});
vm.runInContext(source.slice(start, end), context, {timeout: 500});
function decode(raw) {
  context.raw = raw;
  return vm.runInContext('decode(raw)', context, {timeout: 500});
}
function same(actual, expected, message) {
  // Parsed objects belong to the VM realm; compare their JSON-visible contract.
  assert.equal(JSON.stringify(actual), JSON.stringify(expected), message);
}

const id = '9007199254740993123456';
const success = {
  ok: true,
  action: 'snapshot',
  today: '2026-10-07',
  windowOpen: false,
  subdivision: {id},
  years: [{id: '9007199254740993123457', builderId: '9007199254740993123458', year: 2026}],
  months: [{id: '9007199254740993123459', forecast: null}, {id: '9007199254740993123460', forecast: 0}]
};
const native = decode({code: 3000, details: {output: JSON.stringify(success)}});
same(native, success, 'The native details.output JSON-string envelope must decode');
assert.equal(native.subdivision.id, id, 'Creator IDs must retain their exact string precision');
assert.equal(typeof native.years[0].builderId, 'string');
assert.equal(native.months[0].forecast, null, 'Blank must remain distinct from zero');
assert.equal(native.months[1].forecast, 0);
assert.equal(native.windowOpen, false, 'A closed forecasting window must remain false');
assert.equal(decode(success), success, 'Direct domain responses must retain their identity');

for (const wrapper of [
  JSON.stringify(success),
  {code: 3000, result: JSON.stringify(success)},
  {response: {body: {data: JSON.stringify(success)}}},
  {details: JSON.stringify({output: JSON.stringify(success)})},
  {output: success},
  JSON.stringify({code: 3000, details: {output: JSON.stringify(success)}})
]) same(decode(wrapper), success, 'Established object/string response wrappers must remain compatible');
console.log('PASS: native details.output and legacy envelopes preserve exact string IDs, blank/zero and the closed window');

const refused = {ok: false, action: 'save', message: 'Forecasting window closed for the month.', unknown: false};
assert.equal(decode(refused), refused, 'A direct business refusal must not become success');
for (const wrapper of [{code: 3000, details: {output: JSON.stringify(refused)}}, {result: refused}]) {
  const result = decode(wrapper);
  same(result, refused);
  assert.equal(result.ok, false);
  assert.equal(result.unknown, false, 'A definitive business refusal must not become ambiguous');
}
const mentionedError = {ok: false, action: 'ensure', message: 'Review a prior Custom API link error (9350) before continuing.', unknown: false};
same(decode(mentionedError), mentionedError, 'Business text mentioning an API error must remain a business refusal');
console.log('PASS: direct and wrapped business refusals remain failures with their original certainty');

for (const code of [9350, '9350']) {
  assert.throws(() => decode({code, message: "Custom API doesn't exist. Please check the custom API link name."}), error => error.apiMissing === true,
    'Creator error 9350 must identify a missing API binding');
}
assert.throws(() => decode(JSON.stringify({code: 9350, message: "Custom API doesn't exist."})), error => error.apiMissing === true,
  'A serialized Creator 9350 response must identify a missing API binding');
console.log('PASS: numeric, string and serialized Creator 9350 responses identify a missing API binding');

for (const malformed of [null, undefined, 0, false, {}, {code: 3000, details: {}}, '{"ok":', 'not JSON', {result: '{"ok":'}]) {
  assert.throws(() => decode(malformed), error => error.apiMissing !== true,
    'Malformed responses must fail without being mistaken for a missing API');
}
const cyclic = {};
cyclic.result = cyclic;
assert.throws(() => decode(cyclic), error => /unrecognized forecast response/i.test(error.message),
  'A cyclic envelope must be rejected within the decoder bound, without timing out');
let excessive = success;
for (let index = 0; index < 100; index++) excessive = {details: {output: excessive}};
assert.throws(() => decode(excessive), error => /unrecognized forecast response/i.test(error.message),
  'Excessive envelope depth must be rejected within the decoder bound');
console.log('PASS: malformed, cyclic and excessive envelopes fail in bounded decoding');
