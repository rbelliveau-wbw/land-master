import assert from "node:assert/strict";
import fs from "node:fs";

const widget = fs.readFileSync("widgets/proforma-manager/src/app/widget.html", "utf8");
const renderStart = widget.indexOf("function renderList(){");
const renderEnd = widget.indexOf("function closeProFormaMenus", renderStart);
const renderList = widget.slice(renderStart, renderEnd);

assert.ok(renderStart >= 0 && renderEnd > renderStart, "Pro Forma list renderer must be available");
assert.ok(
  renderList.includes("rowEditDisabledReason=rowCanEdit?\"\":proformaEditDisabledReason(r,approvalState,rowClosed)"),
  "the list must resolve a disabled Edit reason for every non-editable row"
);
assert.ok(
  renderList.includes("(rowCanEdit?'primary':rowEditDisabledClass)"),
  "Edit must always render and switch between active and disabled styling"
);
assert.ok(
  renderList.includes("disabled aria-disabled=\"true\" title=\""),
  "non-editable rows must expose a disabled Edit action and its reason"
);
assert.ok(
  widget.includes(".btn.rowact.edit-disabled,.btn.rowact.edit-disabled:hover"),
  "disabled Edit actions must have a stable gray visual treatment"
);
assert.ok(
  widget.includes('return "You can only edit Pro Formas you own."'),
  "owned-only users must receive an ownership-specific disabled reason"
);

console.log("Pro Forma list: Edit stays visible and clearly disabled outside the user's editable scope.");
