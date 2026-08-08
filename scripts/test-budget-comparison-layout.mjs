import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'widgets', 'budget-manager', 'src', 'app', 'widget.html'),
  'utf8'
);

const expectations = [
  ['comparison view owns horizontal scrolling', /#vCompare\{overflow-x:auto\}/],
  ['comparison panel does not trap sticky positioning', /\.compare-panel\{[^}]*overflow:visible/],
  ['comparison table wrapper does not create a nested scroll boundary', /\.compare-scroll\{overflow:visible/],
  ['comparison column headers remain sticky', /\.compare-table thead th\{position:sticky;top:0/],
  ['comparison metrics have a bounded width', /\.compare-head-metrics\{[^}]*max-width:300px/],
  ['comparison metrics stay right aligned', /\.compare-head-metrics\{[^}]*margin:1px 0 0 auto/]
];

const failures = expectations.filter(([, pattern]) => !pattern.test(source));
if (failures.length) {
  for (const [message] of failures) console.error(`Budget comparison layout regression: ${message}.`);
  process.exit(1);
}

console.log('Budget comparison sticky-header and metric-width checks passed.');
