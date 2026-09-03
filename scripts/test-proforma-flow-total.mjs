import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "widgets/proforma-manager/src/app/widget.html"), "utf8");

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const brace = source.indexOf("{", start);
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not parse ${name}`);
}

const flow = extractFunction("renderFlowTable");
const has = (re, message) => assert.ok(re.test(flow), message);

/* The dashboard's monthly table paginates 24 months at a time. The Total column must be the
   whole schedule, on every tab, frozen beside Category. */
has(/<th class="tot">Total<\/th>/, "the flow table must have a Total header column");
has(
  /function totalOver\(fn\)\{ return agg\.reduce\(/,
  "the total must be summed over the whole agg, not the visible column window"
);
assert.ok(
  !/function totalOver[\s\S]{0,200}?cols\.map/.test(flow),
  "the total must not be computed from the paginated cols array"
);
has(/if\(mode!=="signed" && mode!=="last"\) v=Math\.abs\(v\)/, "section rows must show an unsigned total");
has(/'<td class="tot mono">'/, "the total cell must carry the row's own styling, not a colour of its own");
assert.ok(!/class="tot[^"]*neg/.test(flow), "the total cell must never take the red negative class");

/* Every row builder must emit exactly one total cell, or the columns shear. */
has(/function row\(label, fn, cls, mode\)\{[\s\S]{0,200}?totCell\(fn,fmt\$,mode\)\+cells\(fn\)/, "row() must emit a total cell before its months");
has(/data-xbucket[\s\S]{0,300}?totCell\(fn\)\+cells\(fn\)/, "an expandable parent row must have a total");
has(/data-xof[\s\S]{0,300}?totCell\(itemOf\)\+cells\(itemOf\)/, "an expanded child row must have a total");
has(/totCell\(lots,fmtN\)\+cellsN\(lots\)/, "the lot-closing phase rows must total as a count, not currency");
has(/totCell\(eng\)\+cells\(eng\)/, "the engineering phase rows must have a total");
has(/totCell\(con\)\+cells\(con\)/, "the construction phase rows must have a total");
has(/<td class="tot"><\/td>'\+cells/, "the section band that doubles as the month strip must keep the column aligned");
has(/colspan="'\+\(FLOW_COLS\+2\)/, "a full-width section band must span the added column");

/* Cumulative is a running balance: summing it would add the balance to itself. */
has(/"Cash Flow Monthly"[^\n]*"cf","signed"/, "cash flow monthly keeps its sign — no section above it says which way the money went");
has(/"Cash Flow Cumulative"[^\n]*"cfc","last"/, "cash flow cumulative must take its final month, not a sum");

const css = source.slice(0, source.indexOf("</style>"));
assert.ok(
  /table\.flow td\.tot,table\.flow th\.tot\{position:sticky;left:220px/.test(css),
  "the Total column must be frozen beside the 220px Category column"
);
assert.ok(/table\.flow thead th\.tot\{z-index:3/.test(css), "the Total header must sit above the sticky body cells");

console.log("Pro Forma dashboard Total column placement, scope, and sign checks passed.");
