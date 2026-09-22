import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const widget = fs.readFileSync(path.join(root, "widgets/proforma-manager/src/app/widget.html"), "utf8");
const build = fs.readFileSync(path.join(root, "creator/functions/PF_Build_Proforma_Approval_PDF.dg"), "utf8");
const compile = fs.readFileSync(path.join(root, "creator/functions/PF_PDF_Compile.dg"), "utf8");
const endpoint = fs.readFileSync(path.join(root, "creator/functions/Get_Proforma_Approval_PDF.dg"), "utf8");
const approvalEmail = fs.readFileSync(path.join(root, "creator/functions/Send_Proforma_Approval_Email_With_Context.dg"), "utf8");

function extractWidgetFunction(name) {
  const start = widget.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const brace = widget.indexOf("{", start);
  let depth = 0;
  for (let i = brace; i < widget.length; i += 1) {
    if (widget[i] === "{") depth += 1;
    if (widget[i] === "}") depth -= 1;
    if (depth === 0) return widget.slice(start, i + 1);
  }
  throw new Error(`Could not parse ${name}`);
}

const packetFileName = new Function(
  "S",
  "exportDateStamp",
  `${extractWidgetFunction("safePacketStem")}\n${extractWidgetFunction("proformaPacketFileName")}\nreturn proformaPacketFileName;`
)(
  { proformas: [{ ID: "4410926000004288980", Name: "Corsicana Trails (ORIGINAL) / Phase #1" }] },
  () => "2026-09-22"
);
assert.equal(
  packetFileName("4410926000004288980"),
  "Corsicana_Trails_ORIGINAL_Phase_1_Proforma_Packet_2026-09-22.pdf",
  "PDF filenames must lead with the sanitized Pro Forma name and end with the generation date"
);
assert.equal(
  packetFileName("missing"),
  "Pro_Forma_Proforma_Packet_2026-09-22.pdf",
  "PDF filenames must remain useful when the record name is unavailable"
);
assert.ok(!packetFileName("4410926000004288980").includes("20260922_103315"), "PDF filenames must omit the compact server timestamp");

for (const [source, label] of [[build, "packet builder"], [endpoint, "download endpoint"], [approvalEmail, "approval email"]]) {
  assert.ok(source.includes('_Proforma_Packet_" + zoho.currentdate.toString("yyyy-MM-dd") + ".pdf"'), `${label} must use the canonical name and ISO generation date`);
  assert.ok(source.includes('replaceAll("[^A-Za-z0-9]+","_")'), `${label} must sanitize the Pro Forma name for filesystems`);
  assert.ok(!source.includes('"Proforma_Approval_Packet.pdf"'), `${label} must not retain the old generic fallback name`);
  assert.ok(!source.includes('zoho.currenttime.toString("yyyyMMdd_HHmmss")'), `${label} must not retain the compact timestamp`);
}

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

assert.ok(
  widget.includes('#edPanes.readonly .ed-pane:not([data-pane="approvals"]) textarea'),
  "Pro Forma read-only mode must leave authorized approval notes interactive"
);
assert.ok(
  widget.includes('#edPanes.input-lock .ed-pane:not([data-pane="loi"]):not([data-pane="approvals"]) textarea{'),
  "approval notes must not inherit the locked financial-input appearance"
);
assert.ok(
  !widget.includes('#edPanes.readonly textarea,'),
  "read-only styling must not disable every approval textarea globally"
);

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
  '"LAND PURCHASE / INSTALLMENTS"',
  '"PID / MUD REIMBURSEMENTS"',
  '"SITE INFO"',
  '"COSTS"',
  '"TIMELINE"',
  '"LOT SALES"',
  '"DEVELOPMENT ADD\'L COSTS"',
  '"CONSTRUCTION ADD\'L COSTS"',
  'inflowLabels = {"Gross Sales","MUD Revenue","Reimbursements","Reimbursed Fees","Land Sales (Other)"}',
  'outflowLabels = {"Land Cost","Engineering Base","Ent/Eng Add\'l","Construction Base","Construction Add\'l"}',
  'returnLabels = {"ROI","IRR","XIRR"}',
  'territoryHeader + " | Stage: " + stage + " | Status: " + statusValue',
  '"Purchase: " + purchaseLabel + " | Completion: " + completionLabel',
  "if(developmentItemCount < 12)",
  "if(constructionItemCount < 6)",
  'categoryText.trim().toLowerCase() == "reimbursements"',
  'previewInk = green;',
  '"Offer Summary"',
  '"SELLERS AND CONTACTS"',
  '"PROPERTY AND BUYER"',
  '"TIMING, DEPOSITS AND EXTENSIONS"',
  '"SPECIAL PROVISIONS"',
  '"LEGAL NOTE"',
  'if(pageStreams.size() < 2)'
]) {
  assert.ok(build.includes(required), `approval packet redesign is missing ${required}`);
}

assert.ok(build.includes('thisapp.PF_PDF_Flow_Pages(costBlocks,"Additional Costs, Reimbursements and Notes",pfName,3)'), 'full three-column cost and reimbursement details');
for (const forbidden of [
  '"LOI Terms"',
  '"LOI Timing, Deposits and Terms"',
  '"Sellers and Properties"',
  '"TOTAL ADDITIONAL COSTS"'
]) {
  assert.ok(!build.includes(forbidden), `approval packet still contains retired PDF copy ${forbidden}`);
}

for (const required of [
  'baseStreamContent.contains("% OFFER_WIDE_PAGE")',
  "pageWidth = 1224;",
  "pageHeight = 792;",
  '/MediaBox [0 0 " + pageWidth + " " + pageHeight'
]) {
  assert.ok(compile.includes(required), `mixed-size PDF compiler is missing ${required}`);
}

console.log("Pro Forma locked TerraVault link, approval packet, and readable filename checks passed.");
