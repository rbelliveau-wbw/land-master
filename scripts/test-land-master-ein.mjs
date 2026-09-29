import assert from 'node:assert/strict';
import fs from 'node:fs';

const widget = fs.readFileSync('widgets/land-master/src/app/widget.html', 'utf8');
const start = widget.indexOf('function normalizedEin(v)');
const end = widget.indexOf('function urlOpenHTML(v,label)', start);
assert.ok(start >= 0 && end > start, 'EIN normalizer must be present');
const normalizedEin = new Function(`${widget.slice(start, widget.indexOf('function validateEinInput', start))}; return normalizedEin;`)();

for (const [entry, expected] of [
  ['123456789', '12-3456789'],
  ['001234567', '00-1234567'],
  ['12-3456789', '12-3456789'],
  ['', ''],
]) assert.equal(normalizedEin(entry), expected, entry);

for (const entry of ['12345678', '1234567890', '1-23456789', '123-456789', '12-345678', '12-34567890', '12 3456789', ' 123456789', '123456789 ', '12-345678X', '１２３４５６７８９']) {
  assert.equal(normalizedEin(entry), null, `${entry} must be rejected`);
}

assert.match(widget, /F\("EIN","EIN","ein",rec\.EIN\)/, 'Company editor must load EIN');
assert.match(widget, /\{label:"EIN",key:"EIN",edit:"ein"\}/, 'Companies table must edit EIN');
assert.match(widget, /if\(ft==='ein'\)\{raw=validateEinInput\(el,\$\("panelMsg"\)\);if\(raw===null\)return;\}/, 'full editor must reject invalid EIN before save');
assert.match(widget, /if\(ftype==='ein'\)\{raw=validateEinInput\(el,null\);if\(raw===null\)return;\}/, 'inline editor must reject invalid EIN before save');

console.log('Land Master EIN validation and Company save paths passed.');
