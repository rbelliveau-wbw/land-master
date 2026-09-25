import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

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

/* Phase-sales detail must use the same month receipts as Finished Lot Sales. It is
   descriptive and must not increase Total Income a second time. */
const elements = new Map(["flowTableWrap", "flowTimelineWrap", "flowTimelineTooltip", "flowHead",
  "flowBody", "flowPrev", "flowNext", "flowYr"].map(id => [id, {
  innerHTML: "", hidden: false, disabled: false, textContent: ""
}]));
const context = vm.createContext({
  S: {dash: {tab: "cash", page: 0, expanded: {}, model: {purchaseDate: {y: 2027, m: 1}}, calc: null}},
  document: {getElementById: id => elements.get(id), querySelectorAll: () => []},
  FLOW_COLS: 24, MONTHS_S: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  num: value => Number(value || 0), fmtN: value => String(value), esc: value => String(value),
  phaseSalesAdopted: model => model.v2,
  ymKey: date => `${date.y}-${String(date.m).padStart(2, "0")}`,
  ymAdd: (date, n) => { const month = date.y * 12 + date.m - 1 + n; return {y: Math.floor(month / 12), m: month % 12 + 1}; },
  monthsBetween: (a, b) => (b.y - a.y) * 12 + b.m - a.m
});
vm.runInContext(["fmt$", "dashboardSalesBreakdown"].map(extractFunction).join("\n") + "\n" + flow, context);
const agg = [1, 2].map(month => ({m: month, date: {y: 2027, m: month}, fls: month === 1 ? 109 : 30,
  landSale: 0, pid: 0, reimb: 0, reimbFees: 0, totalIncome: month === 1 ? 109 : 30,
  landCost: 0, engByPhase: {}, engAddl: 0, constByPhase: {}, constAddl: 0,
  totalExpenses: 0, cash: month === 1 ? 109 : 30, runCash: month === 1 ? 109 : 139}));
context.S.dash.calc = {agg, phases: [], months: [
  {Month1: 1, Base_Lot_Sales: 70, Additional_Markup_Income: 7,
    Escalator_Interest_Accrued: 3, Finished_Lot_Sales: 80},
  {Month1: 1, Base_Lot_Sales: 30, Additional_Markup_Income: -3,
    Escalator_Interest_Accrued: 2, Finished_Lot_Sales: 29},
  {Month1: 2, Base_Lot_Sales: 40, Additional_Markup_Income: -10,
    Escalator_Interest_Accrued: 0, Finished_Lot_Sales: 30}
]};
context.S.dash.model.v2 = true;
context.renderFlowTable();
const body = elements.get("flowBody").innerHTML;
for (const label of ["Finished Lot Sales", "Base Price", "Phase Increase", "Escalator", "Total Income"])
  assert.ok(body.includes(label), `${label} should appear in phase-sales inflows`);
assert.match(body, /data-xbucket="finishedLotSales"[^>]*><td><button[^>]*aria-expanded="false"[^>]*aria-controls="flowLotbase flowLotincrease flowLotescalator"/,
  "Finished Lot Sales starts collapsed with a keyboard-accessible toggle");
for (const key of ["base", "increase", "escalator"])
  assert.match(body, new RegExp(`class="xchild hid" id="flowLot${key}" data-xof="finishedLotSales"`),
    `${key} detail is hidden by default`);
assert.ok(body.indexOf("Finished Lot Sales") < body.indexOf("Base Price") &&
  body.indexOf("Base Price") < body.indexOf("Phase Increase") &&
  body.indexOf("Phase Increase") < body.indexOf("Escalator"), "breakdown should sit below its parent");
assert.match(body, /Base Price<\/td><td class="tot mono">\$140<\/td>/,
  "base price should sum both rows in the same month and the whole schedule");
assert.match(body, /Phase Increase<\/td><td class="tot mono">\(\$6\)<\/td>/,
  "phase increases and decreases should retain their net dollar value and sign");
assert.match(body, /Escalator<\/td><td class="tot mono">\$5<\/td>/);
assert.match(body, /Total Income<\/td><td class="tot mono">\$139<\/td>/,
  "breakdown must not be added again to total income");
context.S.dash.expanded.finishedLotSales = true;
context.renderFlowTable();
assert.match(elements.get("flowBody").innerHTML, /data-xbucket="finishedLotSales"[^>]*><td><button[^>]*aria-expanded="true"/,
  "expanding Finished Lot Sales exposes its open state");
for (const key of ["base", "increase", "escalator"])
  assert.match(elements.get("flowBody").innerHTML,
    new RegExp(`class="xchild" id="flowLot${key}" data-xof="finishedLotSales"`),
    `${key} detail is visible when expanded`);
context.S.dash.tab = "in";
context.renderFlowTable();
assert.match(elements.get("flowBody").innerHTML, /data-xbucket="finishedLotSales"[^>]*><td><button[^>]*aria-expanded="true"/,
  "Inflows tab uses the same expanded sales breakdown");
context.S.dash.expanded.finishedLotSales = false;
context.renderFlowTable();
assert.match(elements.get("flowBody").innerHTML, /class="xchild hid" id="flowLotincrease"/,
  "Inflows tab also collapses the breakdown");
context.S.dash.model.v2 = false;
context.renderFlowTable();
assert.ok(!elements.get("flowBody").innerHTML.includes("Phase Increase"),
  "legacy sales retain their existing single Finished Lot Sales line");

/* The dashboard assumption must show the persisted frontage price to cents;
   the neighboring financial totals retain their usual whole-dollar display. */
elements.set("kpis", {innerHTML: ""});
elements.set("assump", {innerHTML: ""});
elements.set("vDash", {classList: {toggle() {}}});
context.S.dash.model = {purchaseDate: {y: 2027, m: 1}, Sale_Price_FF: "1444.45", Lot_Size_Ft: "56"};
context.S.dash.calc = {totals: {Gross_Sales: 8088630, Total_Income: 8088630,
  Total_Expenses: 1430000, Net_Profit: 6658630}, schedule: {}, cashPosition: []};
context.syncPersistentRecordHeader = () => {};
context.renderDashboardOwners = () => {};
context.renderDealRoom = () => {};
context.renderFlowTable = () => {};
context.phaseSalesDisplaySummary = () => null;
context.ymLabel = () => "Jan 2030";
context.landPurchaseLabel = () => "—";
vm.runInContext(extractFunction("renderDashboard"), context);
context.renderDashboard();
assert.match(elements.get("assump").innerHTML,
  /<label>Sale Price \/ FF<\/label><b>\$1,444\.45<\/b>/,
  "the saved Sale Price / FF must show both decimal places on the dashboard");
assert.match(elements.get("kpis").innerHTML, /<div class="k-big">\$6,658,630<\/div>/,
  "Net Profit retains its whole-dollar presentation");
context.S.dash.model.Sale_Price_FF = "1500";
context.renderDashboard();
assert.match(elements.get("assump").innerHTML,
  /<label>Sale Price \/ FF<\/label><b>\$1,500\.00<\/b>/,
  "whole-number Sale Price / FF values still show two decimal places");

console.log("Pro Forma dashboard Total column placement, scope, and sign checks passed.");
