import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const source = fs.readFileSync(path.join(process.cwd(), "widgets/budget-manager/src/app/widget.html"), "utf8");

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

const S = { globalMode:"edit", edPhaseIdx:null, items:{"1":[]}, categories:{"1":[{ID:"11", Deparment:"Construction"}]}, saveTimers:{} };
const writes = [];
const context = vm.createContext({
  S, BUDGET_UNIT_CHOICES:["Acre", "LF", "Lot"], Number, Promise,
  cleanVal: v => String(v ?? "").trim(),
  metricRaw: (budget, field) => Number(budget[field]) || 0,
  normalizeReimbursementValue: (item, field, value) => item.reimbursement ? -Math.abs(value) : value,
  lookupId: value => value?.ID,
  catDept: category => category.Deparment,
  budgetCategoryIsLocked: budget => !!budget.constructionLocked,
  budgetTrackIsLocked: (budget, track) => track === "Development" ? !!budget.developmentLocked : !!budget.constructionLocked,
  canEditBudget: budget => budget.canEdit !== false,
  clearTimeout: () => {}, setTimeout: callback => { callback(); return 1; },
  setEdAutosave: () => {}, markInputState: () => {},
  sdkUpdateRecord: (_form, id, fields) => { writes.push({id, fields}); return Promise.resolve(); },
  CFG:{forms:{item:"Budget_Item"}}, auditLog: () => {}, setMsg: () => {}
});
vm.runInContext([
  "var BUDGET_UNIT_CHOICES = ['Acre','LF','Lot'];",
  ...["budgetMetricEditable", "budgetUnitNumber", "budgetUnitRate", "budgetUnitMoney", "budgetPerUnitEnabled", "budgetPerUnitQuantity", "budgetPerUnitStatus", "syncBudgetPerUnitItem", "budgetItemCanEditPerUnit", "recalcBudgetPerUnitItems", "queueBudgetPerUnitSave", "renderProjectKpis", "updateProjectMatrixLive"].map(extractFunction)
].join("\n"), context);

const budget = {ID:"1", Acres:12.5, Equiv_LF_of_Street:3200, Lot_Total_Residential:40};
assert.equal(context.budgetUnitRate("$1.239"), 1.24, "currency rates use two decimal places before multiplication");
for (const [unit, rate, total] of [["Acre",100.25,1253.13], ["LF",2.5,8000], ["Lot",250.25,10010]]) {
  const item = {_perUnit:true, Unit:unit, Per_Unit:rate, Prelim_Budget_Ttl:99};
  assert.equal(context.budgetPerUnitStatus(budget, item).amount, total);
  assert.equal(context.syncBudgetPerUnitItem(budget, item), true);
  assert.equal(item.Prelim_Budget_Ttl, total);
}

const manual = {_perUnit:false, Unit:"Lot", Per_Unit:10, Prelim_Budget_Ttl:777};
assert.equal(context.syncBudgetPerUnitItem(budget, manual), false);
assert.equal(manual.Prelim_Budget_Ttl, 777, "turning Per Unit off must retain the manually editable total");

for (const [unit, rate, expected] of [["",10,"Pick a unit"], ["Lot",0,"Enter a cost per unit"], ["Acre",10,"Acre quantity must be greater than 0"]]) {
  const item = {_perUnit:true, Unit:unit, Per_Unit:rate, Prelim_Budget_Ttl:777};
  const basis = unit === "Acre" ? {...budget, Acres:0} : budget;
  assert.equal(context.budgetPerUnitStatus(basis, item).error, expected);
  assert.equal(context.syncBudgetPerUnitItem(basis, item), false);
  assert.equal(item.Prelim_Budget_Ttl, 777, "incomplete inputs must not overwrite the last total");
}

const reimbursement = {_perUnit:true, Unit:"Lot", Per_Unit:5, Prelim_Budget_Ttl:0, reimbursement:true};
context.syncBudgetPerUnitItem(budget, reimbursement);
assert.equal(reimbursement.Prelim_Budget_Ttl, -200, "reimbursements remain credits");

const lockedItem = {ID:"20", Budget_Category:{ID:"11"}, _perUnit:true, Unit:"LF", Per_Unit:3, Prelim_Budget_Ttl:500};
S.items["1"] = [lockedItem];
budget.constructionLocked = true;
assert.equal(context.budgetMetricEditable(budget, "Equiv_LF_of_Street"), false);
assert.equal(context.budgetMetricEditable(budget, "Land_Cost"), true);
assert.equal(context.recalcBudgetPerUnitItems(budget).length, 0);
assert.equal(lockedItem.Prelim_Budget_Ttl, 500, "a locked Construction row must not recalculate");
budget.constructionLocked = false;
assert.equal(context.recalcBudgetPerUnitItems(budget).length, 1);
assert.equal(lockedItem.Prelim_Budget_Ttl, 9600);
budget.developmentLocked = true;
assert.equal(context.budgetMetricEditable(budget, "Land_Cost"), false);

const draftWrites = writes.length;
lockedItem.Unit = "";
context.queueBudgetPerUnitSave(budget, lockedItem);
assert.equal(writes.length, draftWrites, "missing unit remains a local draft");
lockedItem.Unit = "LF";
lockedItem.Per_Unit = "";
context.queueBudgetPerUnitSave(budget, lockedItem);
assert.equal(writes.length, draftWrites, "missing rate remains a local draft");
lockedItem.Per_Unit = 3;
budget.Equiv_LF_of_Street = 0;
context.queueBudgetPerUnitSave(budget, lockedItem);
assert.equal(writes.length, draftWrites, "missing quantity remains a local draft");
budget.Equiv_LF_of_Street = 3200;

context.queueBudgetPerUnitSave(budget, lockedItem);
await S.perUnitSaveChains["20"];
assert.deepEqual(JSON.parse(JSON.stringify(writes.at(-1))), {id:"20", fields:{Unit:"LF", Per_Unit:3, Prelim_Budget_Ttl:9600}});
lockedItem._perUnit = false;
lockedItem.Unit = "";
lockedItem.Per_Unit = "";
context.queueBudgetPerUnitSave(budget, lockedItem);
await S.perUnitSaveChains["20"];
assert.deepEqual(JSON.parse(JSON.stringify(writes.at(-1))), {id:"20", fields:{Unit:"", Per_Unit:"", Prelim_Budget_Ttl:9600}}, "turning off clears rate fields and retains total");

// An all-phases manual edit must retain the calculated amount in the same row,
// category, footer, and KPI even though its read-only cell has no input.
const phaseA = {ID:"a", Lot_Total_Residential:2};
const phaseB = {ID:"b", Lot_Total_Residential:1};
const itemA = {ID:"a1", Prelim_Budget_Ttl:12.34};
const itemB = {ID:"b1", Prelim_Budget_Ttl:5.5, _perUnit:true, Unit:"Lot", Per_Unit:5.5};
S.items = {a:[itemA], b:[itemB]};
S.edPhaseIdx = "all";
S.edBudget = phaseA;
S.tier = "prelim";
const rowTotal = {textContent:""};
const catCells = Array.from({length:4}, () => ({textContent:""}));
const footerCells = Array.from({length:4}, () => ({innerHTML:""}));
const itemCell = id => ({getAttribute: name => name === "data-budget-item-id" ? id : null});
const categoryRow = {cells:catCells};
const tbody = {querySelector: () => categoryRow, querySelectorAll: () => [row]};
const row = {
  cells:[{}, itemCell("a1"), itemCell("b1"), rowTotal],
  closest: selector => selector === "tbody" ? tbody : null,
  querySelector: selector => selector === "td.rt" ? rowTotal : null
};
const mx = {querySelector: selector => selector === "tfoot tr" ? {cells:footerCells} : null};
const summary = {innerHTML:""};
context.$ = id => id === "mx" ? mx : null;
context.document = {getElementById: id => id === "summaryMatrices" ? summary : null};
context.findProjectForBudget = () => ({phases:[phaseA, phaseB]});
context.findItemById = id => [itemA, itemB].find(item => item.ID === id);
context.budgetLots = b => b.Lot_Total_Residential;
context.fmt = n => `$${n}`;
context.fmtK = n => `$${n}`;
context.v = n => Math.round(Number(n) || 0);
context.tierLabel = () => "Preliminary";
context.updateProjectMatrixLive({closest: selector => selector === "tr.irow" ? row : null});
assert.equal(rowTotal.textContent, "$17.84", "read-only per-unit cell contributes to row total");
assert.equal(catCells[1].textContent, "$12.34");
assert.equal(catCells[2].textContent, "$5.5", "read-only per-unit cell contributes to phase category subtotal");
assert.equal(catCells[3].textContent, "$17.84");
assert.match(footerCells[3].innerHTML, /\$17\.84/, "footer retains cents across phases");
assert.match(summary.innerHTML, /Grand total[^]*\$17\.84/, "KPI retains cents across phases");

assert.match(source, /data-budget-unit-toggle=/);
assert.match(source, /data-budget-unit-open=/);
assert.match(source, /data-budget-rate=/);
assert.match(source, /Calculated per unit; open this phase/, "all-phases matrix must protect calculated totals");

console.log("Budget per-unit calculation, locks, and persistence checks passed.");
