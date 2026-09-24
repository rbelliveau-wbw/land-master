import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("widgets/proforma-manager/src/app/widget.html", "utf8");
const start = source.indexOf("function addPidRow(){");
const end = source.indexOf("\nfunction paneAddl(){", start);
assert.ok(start >= 0 && end > start, "PID/MUD row action exists");

const model = {pidMud: [{ID:"saved",Month1:"4",Cost:"2500",Type1:"PID/MUD"}]};
const S = {ed:{model,dirty:false}};
let renders = 0, focused = 0, dirtyUpdates = 0;
const context = vm.createContext({
  S,
  isInputLocked: () => false,
  canSavePf: () => true,
  hasVal: value => value != null && String(value).trim() !== "",
  updateDirtyChip: () => {dirtyUpdates++;},
  rerenderPane: pane => {assert.equal(pane,"pid");renders++;},
  document: {querySelectorAll: () => [{querySelector: () => ({focus: () => {focused++;}})}]}
});
vm.runInContext(source.slice(start,end),context);

context.addPidRow();
assert.equal(model.pidMud.length,2,"Add creates one PID/MUD row");
assert.equal(model.pidMud[1].Cost,"");
assert.equal(renders,1);
assert.equal(focused,1,"new row is ready for amount entry");
assert.equal(S.ed.dirty,true);
context.addPidRow();
assert.equal(model.pidMud.length,2,"repeated Add reuses an untouched row");
assert.equal(renders,1,"reusing a row does not rerender");
model.pidMud[1].Cost="1000";
context.addPidRow();
assert.equal(model.pidMud.length,3,"Add creates a row after the previous one has content");
assert.equal(dirtyUpdates,2);

assert.match(source,/id="btnAddPid"[^>]*>.*?pid-add-icon[^>]*>.*?<svg viewBox="0 0 20 20"/s,"PID/MUD uses an explicit add button with a centered SVG plus");
assert.match(source,/table\.sub\.pid-table input\[data-ik\]:not\(:disabled\)/,"editable PID/MUD cells are outlined");
console.log("Pro Forma PID/MUD row interaction checks passed.");
