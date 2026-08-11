import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "widgets/manage-lots/src/app/widget.html"), "utf8");

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

const scalar = (value) => {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(scalar).filter(Boolean).join(", ");
  if (typeof value === "object") return String(value.display_value || value.zc_display_value || value.Subdivision_Name || value.Builder_Name || value.Name || value.value || value.ID || value.id || "");
  return String(value);
};
const lotBlock = new Function("str", `return (${extractFunction("lotBlock")})`)(scalar);

assert.equal(lotBlock({ Block: "A" }), "A", "letter blocks must remain visible");
assert.equal(lotBlock({ Block: { display_value: "B2" } }), "B2", "Creator display objects must remain visible");
assert.equal(lotBlock({ Lot_Code: "AAA-B01-L012" }), "1", "missing report Block values must fall back to Lot_Code");
assert.equal(lotBlock({ Lot_Code: "AAA-BC-L12" }), "C", "letter blocks must be derived from Lot_Code");
assert.equal(lotBlock({ Lot_Code: "NO-BLOCK-DATA" }), "Unassigned", "unknown codes must use the explicit fallback group");

assert.match(source, /takedowns:\s*"All_Builder_Takedowns"/, "Builder Takedowns report must be loaded");
assert.match(source, /View only/, "Builder Takedowns view must remain read-only");
assert.match(source, /pointerdown/, "drag selection must start with pointer input");
assert.match(source, /pointermove/, "drag selection must cover lots crossed while holding");
assert.match(source, /\.lot\.chosen::after/, "selected lots must have a prominent selected marker");
assert.doesNotMatch(source, /ZOHO\.CREATOR\.API\.(updateRecord|deleteRecord)/, "the Builder Takedowns view must not expose editing APIs");

console.log("Manage Lots mixed-block, drag-selection, selected-state, and read-only takedown checks passed.");
