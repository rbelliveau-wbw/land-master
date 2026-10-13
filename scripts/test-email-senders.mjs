import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const sender = 'Notifications@wbdevelopment.com';
let checked = 0;
for (const directory of ['creator/functions', 'creator/workflows']) {
  for (const name of fs.readdirSync(directory).filter(name => name.endsWith('.dg'))) {
    const file = path.join(directory, name);
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/^\s*from\s*:\s*("[^"]+"|[\w.]+)/gm)) {
      const expression = match[1];
      let value = expression;
      if (!expression.startsWith('"')) {
        const assignments = [...source.matchAll(new RegExp(`^\\s*${expression.replaceAll('.', '\\.')}\\s*=\\s*("[^"]+"|[\\w.]+)`, 'gm'))];
        assert.ok(assignments.length, `${file}: unresolved sender ${expression}`);
        assert.ok(assignments.every(assignment => assignment[1] === JSON.stringify(sender)), `${file}: sender variable must always use ${sender}`);
        value = assignments[0][1];
      }
      assert.equal(value, JSON.stringify(sender), `${file}: application email sender`);
      checked++;
    }
  }
}
assert.ok(checked > 0, 'Must inspect application sendmail senders');
console.log(`Application email sender checks passed (${checked} sendmail blocks).`);
