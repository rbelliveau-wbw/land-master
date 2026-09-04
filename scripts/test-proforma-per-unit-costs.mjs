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

const num = (v) => Number(String(v ?? "").replace(/[$,]/g, "")) || 0;
const hasVal = (v) => v != null && String(v).trim() !== "";
const round2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;
const additionalCostUnitQuantity = Function("num", `${extractFunction("additionalCostUnitQuantity")}; return additionalCostUnitQuantity;`)(num);
const syncPerUnitAdditionalCost = Function(
  "num",
  "hasVal",
  "round2",
  "additionalCostUnitQuantity",
  `${extractFunction("syncPerUnitAdditionalCost")}; return syncPerUnitAdditionalCost;`
)(num, hasVal, round2, additionalCostUnitQuantity);

const model = { Total_Acres: "12.5", Lots: "40", Total_Street_LF: "3200" };
assert.equal(additionalCostUnitQuantity(model, "Acre"), 12.5);
assert.equal(additionalCostUnitQuantity(model, "Lot"), 40);
assert.equal(additionalCostUnitQuantity(model, "LF"), 3200);

for (const [unit, rate, total] of [
  ["Acre", "100", "1250"],
  ["Lot", "250.25", "10010"],
  ["LF", "2.5", "8000"]
]) {
  const row = { _perUnit: true, Unit: unit, Per_Unit: rate, Add_l_Cost: "1" };
  assert.equal(syncPerUnitAdditionalCost(model, row), true);
  assert.equal(row.Add_l_Cost, total);
}

const off = { _perUnit: false, Unit: "Lot", Per_Unit: "10", Add_l_Cost: "777" };
assert.equal(syncPerUnitAdditionalCost(model, off), false);
assert.equal(off.Add_l_Cost, "777", "manual Add'l Cost must remain untouched when the widget toggle is off");

assert.match(source, /data-per-unit=/, "each Additional Cost row must render a widget-only toggle");
assert.match(source, /readonly aria-readonly="true"/, "the computed Add'l Cost input must be read-only");
assert.match(source, /t\.getAttribute\("data-ik"\)===\"Per_Unit\"[\s\S]{0,180}?rerenderPane\("addl"\)/, "committing a Per Unit Cost must rerender and unlock scheduling controls");
assert.match(source, /Unit:r\._perUnit\?\(r\.Unit\|\|""\):""/, "Unit must be included in the save payload");
assert.match(source, /Per_Unit:r\._perUnit\?\(r\.Per_Unit\|\|""\):""/, "Per Unit Cost must be included in the save payload");

const deluge = fs.readFileSync(path.join(root, "creator/functions/proforma_save.dg"), "utf8");
assert.equal((deluge.match(/Unit=ifnull\(r\.get\("Unit"\),""\)/g) || []).length, 2);
assert.equal((deluge.match(/Per_Unit=if\(/g) || []).length, 2);

console.log("Pro Forma per-unit Additional Cost calculation and persistence checks passed.");
