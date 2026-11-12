import fs from 'node:fs';

// Creator's saved editor removes a parenthesized right operand after &&.
// Exercise the existing PO workflow matrix using that observed native format,
// so source-only success cannot hide broken draft/family deletion or choices.
function nativeFormat(source) {
  let cursor = 0;
  for (;;) {
    const match = /&&\s*\(/g;
    match.lastIndex = cursor;
    const next = match.exec(source);
    if (!next) return source;
    const start = source.indexOf('(', next.index);
    let depth = 1, end = start + 1, quoted = false, escaped = false;
    for (; end < source.length && depth; end++) {
      const char = source[end];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') quoted = true;
      else if (char === '(') depth++;
      else if (char === ')') depth--;
    }
    if (depth) throw new Error('Unbalanced native source.');
    source = source.slice(0, start) + source.slice(start + 1, end - 1) + source.slice(end);
    cursor = start;
  }
}
const read = fs.readFileSync;
fs.readFileSync = function(file, ...args) {
  const source = read.call(this, file, ...args);
  const name = String(file).replaceAll('\\', '/');
  return typeof source === 'string' && /creator\/functions\/(managePurchaseOrder|poSnapshot)[.]dg$/.test(name) ? nativeFormat(source) : source;
};
try {
  await import('./test-po-supplemental.mjs');
  console.log('PO native formatter: approved choices, saved draft plans and complete deletion/recovery matrix passed after Creator-style parenthesis removal.');
} finally {
  fs.readFileSync = read;
}
