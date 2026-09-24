import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("widgets/proforma-manager/src/app/widget.html", "utf8");
const start = source.indexOf("function addLotMixRow(){");
assert.ok(start >= 0, "explicit lot-row action exists");
const end = source.indexOf("\nfunction ", start + 1);
const action = source.slice(start, end);
const rows = [{ID: "row-1", Lot_Size_Ft: "55", Lot_Count: "155", Price_LF: "1200"}];
let renders = 0, recalcs = 0, focuses = 0, dirtyUpdates = 0;
const model = {lotMix: rows};
const S = {ed: {model, dirty: false}};
const context = vm.createContext({
  S,
  isInputLocked: () => false,
  canSavePf: () => true,
  updateDirtyChip: () => { dirtyUpdates += 1; },
  rerenderPane: pane => {assert.equal(pane, "gen"); renders += 1;},
  recalcLive: () => {recalcs += 1;},
  document: {querySelectorAll: () => [{querySelector: () => ({focus: () => {focuses += 1;}})}]}
});
vm.runInContext(action, context);

assert.equal(model.lotMix.length, 1, "opening the grid must keep the existing row count");
context.addLotMixRow();
assert.equal(model.lotMix.length, 2, "the Add action creates one row");
assert.deepEqual(Object.keys(model.lotMix[1]), ["ID", "Lot_Size_Ft", "Lot_Count", "Price_LF"]);
assert.equal(model.lotMix[1].Lot_Size_Ft, "");
assert.equal(S.ed.dirty, true);
assert.equal(renders, 1);
assert.equal(recalcs, 1);
assert.equal(focuses, 1, "new row should be ready for typing");

context.addLotMixRow();
assert.equal(model.lotMix.length, 2, "repeated Add must reuse an untouched empty row");
assert.equal(renders, 1, "reusing a blank row must not discard input focus by rerendering");
assert.equal(dirtyUpdates, 1);

model.lotMix[1].Lot_Size_Ft = "65";
context.addLotMixRow();
assert.equal(model.lotMix.length, 3, "Add creates another row after the prior row has content");

const wireStart = source.indexOf("function wireEditInputs(){");
const wireEnd = source.indexOf("\nfunction filterAddlRows(){", wireStart);
assert.ok(wireStart >= 0 && wireEnd > wireStart, "editor input handler exists");
const host = {addEventListener() {}};
const priceInput = {value: ""};
context.document.getElementById = id => id === "edPanes" ? host : null;
context.document.querySelector = () => priceInput;
context.formatNumericInputs = () => {};
context.syncLotMixDerived = () => {};
context.phaseSalesSeedWhenReady = () => {};
context.lotMixRowPrice = () => "$12,000";
vm.runInContext(source.slice(wireStart, wireEnd), context);
context.wireEditInputs();
const existingRow = {getAttribute: key => ({"data-kind": "lotmix", "data-i": "0"})[key]};
const existingInput = {
  value: "56",
  classList: {contains: () => false},
  getAttribute: key => ({"data-ik": "Lot_Size_Ft"})[key] ?? null,
  closest: selector => selector === "tr[data-kind]" ? existingRow : null
};
const beforeTyping = model.lotMix.length;
host.oninput({target: existingInput});
assert.equal(model.lotMix.length, beforeTyping, "typing in an existing pricing row must not create another row");
assert.equal(model.lotMix[0].Lot_Size_Ft, "56", "the typed value updates the existing row");
assert.equal(priceInput.value, "$12,000", "the computed price refreshes in place");

assert.doesNotMatch(source, /data-ghostmix|data-ghostadd|promoteLotMixGhost/, "typing into lot pricing must not create a row");
assert.ok(source.includes('id="btnAddLotMix"'), "the grid exposes an explicit Add action");
console.log("Pro Forma lot pricing row interaction checks passed.");
