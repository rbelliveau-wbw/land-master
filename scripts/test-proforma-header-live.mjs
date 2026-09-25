import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("widgets/proforma-manager/src/app/widget.html", "utf8");
const headerStart = source.indexOf("function syncPersistentRecordHeader(");
const headerEnd = source.indexOf("/* Record-level view slider", headerStart);
const recalcStart = source.indexOf("var recalcLive=debounce(function(){");
const recalcEnd = source.indexOf("/* field helpers */", recalcStart);
assert.ok(headerStart >= 0 && headerEnd > headerStart && recalcStart >= 0 && recalcEnd > recalcStart);

const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    textContent: "",
    classList: {remove() {}, add() {}}
  });
  return elements.get(id);
}
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const model = {Name: "", Territory: "", purchaseDate: null, Lots: ""};
const S = {view: "vEdit", ed: {model, pane: "gen", calc: null}};
const context = vm.createContext({
  S,
  document: {getElementById: element, querySelectorAll: () => []},
  debounce: fn => fn,
  syncAllPerUnitAdditionalCosts: () => false,
  phaseSalesActive: () => false,
  modelToCalc: m => ({
    totals: {}, roi: null, irr: null, xirr: null, months: [], phases: [], warnings: [],
    schedule: {estimatedCompletion: m.purchaseDate && m.scheduleReady ? {y: 2028, m: 12} : null}
  }),
  ymLabel: d => d ? `${months[d.m - 1]}, ${d.y}` : "—",
  ymShort: d => d ? `${months[d.m - 1]} ${d.y}` : "—",
  parseDateAny: d => d || null,
  num: v => Number(v) || 0,
  fmt$: v => String(v),
  fmtPct: v => String(v),
  fmtN: v => String(v),
  refreshComputedInputs() {}, refreshPhaseSalesFeedback() {}, refreshLOICompleteness() {}, updateTabWarnings() {}
});
vm.runInContext(source.slice(headerStart, headerEnd), context);
vm.runInContext(source.slice(recalcStart, recalcEnd), context);

context.recalcLive();
assert.equal(element("dhTitle").textContent, "(unnamed) - —");
assert.equal(element("dhPurchase").textContent, "—");
assert.equal(element("dhCompletion").textContent, "—");

model.Name = "Test PF";
model.Territory = "Dallas/Fort Worth";
context.recalcLive();
assert.equal(element("dhTitle").textContent, "Test PF - Dallas/Fort Worth", "unsaved name and territory appear in the title card");

model.purchaseDate = {y: 2027, m: 2};
model.scheduleReady = true;
context.recalcLive();
assert.equal(element("dhPurchase").textContent, "Feb, 2027", "Project Start follows the chosen month");
assert.equal(element("dhCompletion").textContent, "Dec, 2028", "completion follows the live calculation");

S.view = "vDash";
element("dhTitle").textContent = "Saved dashboard title";
model.Name = "Unsaved later change";
context.recalcLive();
assert.equal(element("dhTitle").textContent, "Saved dashboard title", "an editor recalculation cannot overwrite another record view");

console.log("Pro Forma live title card checks passed.");
