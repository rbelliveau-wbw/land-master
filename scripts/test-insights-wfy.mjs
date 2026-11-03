import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createPFTestDOM} from './fixtures/proforma-sdk-v2-dom.mjs';

const app = 'widgets/lot-sales-explorer/src/app/';
const html = fs.readFileSync(app + 'widget.html', 'utf8');
const source = fs.readFileSync(app + 'sales-app.js', 'utf8');
function harness(year, month, day) {
  const instant = new Date(year, month - 1, day, 12).getTime();
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [instant])); }
    static now() { return instant; }
  }
  const {document, nodes, node} = createPFTestDOM(html);
  nodes.forEach(el => Object.defineProperty(el, 'selectedOptions', {get: () => el.options.filter(option => option.selected)}));
  const context = vm.createContext({document, Date: FixedDate, Map, Set, Intl, URL, URLSearchParams, console, setTimeout, clearTimeout, queueMicrotask});
  context.window = context;
  context.addEventListener = () => {};
  context.InsightsControls = {
    syncAll() {},
    values: el => el.options.filter(option => option.selected && option.value).map(option => option.value),
    setValues: (el, values) => el.options.forEach(option => { option.selected = values.includes(option.value); })
  };
  // Skip connection only; execute the real initial period, listeners and reset.
  vm.runInContext(source.replace('  start();', '  window.__test = {applyPeriod, selectedFilters};'), context);
  function period(value) {
    node('period').value = value;
    assert.equal(node('period').value, value, 'period option exists: ' + value);
    context.__test.applyPeriod();
    return [node('from').value, node('to').value];
  }
  return {node, period, filters: context.__test.selectedFilters};
}

for (const [date, fiscal, previous, combined, ytd] of [
  [[2026, 1, 31], ['2025-02', '2026-01'], ['2024-02', '2025-01'], ['2024-02', '2026-01'], ['2025-02', '2026-01']],
  [[2026, 2, 1], ['2026-02', '2027-01'], ['2025-02', '2026-01'], ['2025-02', '2027-01'], ['2026-02', '2026-02']],
  [[2024, 2, 29], ['2024-02', '2025-01'], ['2023-02', '2024-01'], ['2023-02', '2025-01'], ['2024-02', '2024-02']],
  [[2026, 12, 31], ['2026-02', '2027-01'], ['2025-02', '2026-01'], ['2025-02', '2027-01'], ['2026-02', '2026-12']]
]) {
  const h = harness(...date), calendarYear = date[0], month = String(date[1]).padStart(2, '0');
  assert.equal(h.node('period').value, 'twoWFYs', 'initial scope uses WFY');
  assert.deepEqual([h.node('from').value, h.node('to').value], combined);
  assert.deepEqual(h.period('currentWFY'), fiscal);
  assert.deepEqual(h.period('previousWFY'), previous);
  assert.deepEqual(h.period('twoWFYs'), combined);
  assert.deepEqual(h.period('wfytd'), ytd);
  assert.deepEqual(h.period('currentYear'), [calendarYear + '-01', calendarYear + '-12']);
  assert.deepEqual(h.period('previousYear'), [calendarYear - 1 + '-01', calendarYear - 1 + '-12']);
  assert.deepEqual(h.period('twoYears'), [calendarYear - 1 + '-01', calendarYear + '-12']);
  assert.deepEqual(h.period('ytd'), [calendarYear + '-01', calendarYear + '-' + month]);
  h.period('currentYear');
  await h.node('reset').fire('click');
  assert.equal(h.node('period').value, 'twoWFYs', 'Reset restores the fiscal default');
  assert.deepEqual([h.node('from').value, h.node('to').value], combined);
}
{
  const h = harness(2026, 1, 31);
  assert.deepEqual(h.period('13'), ['2025-01', '2026-01']);
  assert.deepEqual(h.period('6'), ['2025-08', '2026-01']);
  h.node('from').value = '2024-06'; h.node('to').value = '2025-03';
  assert.deepEqual(h.period('custom'), ['2024-06', '2025-03'], 'custom calendar months remain exact');
  assert.equal(h.node('from').disabled, false); assert.equal(h.node('to').disabled, false);
  h.period('all');
  assert.equal(h.node('from').disabled, true); assert.equal(h.node('to').disabled, true);
  assert.equal(h.filters().from, ''); assert.equal(h.filters().to, '');
  h.period('currentWFY');
  assert.equal(h.node('from').disabled, false); assert.equal(h.node('to').disabled, false);
}
console.log('PASS Insights WFY initial/reset defaults, January/February rollover, leap February, fiscal/calendar presets, rolling months, custom dates and all history.');
