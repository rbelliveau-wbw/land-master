import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const widget = fs.readFileSync(path.join(root, "widgets/proforma-manager/src/app/widget.html"), "utf8");
const build = fs.readFileSync(path.join(root, "creator/functions/PF_Build_Proforma_Approval_PDF.dg"), "utf8");
const compile = fs.readFileSync(path.join(root, "creator/functions/PF_PDF_Compile.dg"), "utf8");

for (const required of [
  ".loi-tv-link{",
  "cursor:pointer",
  "function externalHttpUrl(v)",
  "if(isLOIApprovalLocked(S.ed.model)&&label)",
  "target=\"_blank\" rel=\"noopener noreferrer\"",
  "terraVaultControl(r.TerraVault_URL"
]) {
  assert.ok(widget.includes(required), `locked TerraVault link is missing ${required}`);
}

for (const required of [
  'listSort:{key:"",dir:""}',
  'data-list-sort="Name"',
  'data-list-sort="Net_Profit"',
  'data-list-sort="Estimated_Completion"',
  'function cycleListSort(key)',
  'S.listSort={key:key,dir:"asc"}',
  'S.listSort={key:key,dir:"desc"}',
  'S.listSort={key:"",dir:""}',
  'if(t!==0)return t;',
  'compareListValues(a,b,S.listSort.key,S.listSort.dir)',
  'Sort ascending within each territory'
]) {
  assert.ok(widget.includes(required), `grouped territory sorting is missing ${required}`);
}

for (const required of [
  "PF_PDF_Rect(0,0,1224,792",
  '"LAND PURCHASE"',
  '"PID / MUD REIMBURSEMENTS"',
  '"SITE INFO"',
  '"COSTS"',
  '"TIMELINE"',
  '"LOT SALES"',
  '"DEVELOPMENT COSTS"',
  '"CONSTRUCTION ADDITIONAL COSTS"',
  'inflowLabels = {"Gross Sales","MUD Revenue","Reimbursements","Reimbursed Fees","Land Sales (Other)"}',
  'outflowLabels = {"Land Cost","Engineering Base","Ent/Eng Add\'l","Construction Base","Construction Add\'l"}',
  'returnLabels = {"ROI","IRR","XIRR"}',
  '"Territory: " + territoryHeader + " | Stage: " + stage + " | Status: " + statusValue',
  '"Purchase: " + purchaseLabel + " | Completion: " + completionLabel',
  "if(developmentItemCount < 12)",
  "if(constructionItemCount < 6)",
  "if(detailAdditionalItems.size() > 0)",
  "for each  costItem in detailAdditionalItems"
]) {
  assert.ok(build.includes(required), `approval packet redesign is missing ${required}`);
}

assert.ok(
  build.indexOf("detailAdditionalItems.add(costItem);") < build.indexOf("for each  costItem in detailAdditionalItems"),
  "overflow rows must be selected before detail-page rendering"
);
assert.ok(
  !build.includes("Full itemization stays on the following pages"),
  "detail pages must not repeat page-one Additional Cost rows"
);

for (const required of [
  "if(pageCounter == 0)",
  "pageWidth = 1224;",
  "pageHeight = 792;",
  '/MediaBox [0 0 " + pageWidth + " " + pageHeight'
]) {
  assert.ok(compile.includes(required), `mixed-size PDF compiler is missing ${required}`);
}

console.log("Pro Forma locked TerraVault link and non-redundant approval packet checks passed.");
