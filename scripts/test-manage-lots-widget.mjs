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
const natural = (a, b) => scalar(a).localeCompare(scalar(b), undefined, { numeric: true, sensitivity: "base" });
const lotBlock = new Function("str", `return (${extractFunction("lotBlock")})`)(scalar);
const lotDetailParts = new Function("str", `return (${extractFunction("lotDetailParts")})`)(scalar);

assert.equal(lotBlock({ Block: "A" }), "A", "letter blocks must remain visible");
assert.equal(lotBlock({ Block: { display_value: "B2" } }), "B2", "Creator display objects must remain visible");
assert.equal(lotBlock({ Lot_Code: "AAA-B01-L012" }), "1", "missing report Block values must fall back to Lot_Code");
assert.equal(lotBlock({ Lot_Code: "AAA-BC-L12" }), "C", "letter blocks must be derived from Lot_Code");
assert.equal(lotBlock({ Lot_Code: "NO-BLOCK-DATA" }), "Unassigned", "unknown codes must use the explicit fallback group");
assert.deepEqual(lotDetailParts([{ display_value: "AAA01-B01-L15 - Sold" }, { display_value: "AAA01-B01-L16 - Open" }]), [
  { code: "AAA01-B01-L15", status: "Sold" },
  { code: "AAA01-B01-L16", status: "Open" },
], "lot relationship details must split into readable code and status values");

assert.match(source, /takedowns:\s*"All_Builder_Takedowns"/, "Builder Takedowns report must be loaded");
assert.match(source, /View only/, "Builder Takedowns view must remain read-only");
assert.match(source, /aria-multiselectable="true"/, "subdivision filtering must expose an accessible multi-select");
assert.match(source, /Search subdivisions/, "subdivision filtering must be searchable");
assert.match(source, /class="subdivision-row"/, "Builder Takedowns must include subdivision grouping rows");
assert.match(source, /class="lot-detail-chip"/, "lot details must render as scannable chips");
assert.match(source, /A takedown can include lots from one subdivision/, "cross-subdivision takedown selection must be prevented");
assert.match(source, /pointerdown/, "drag selection must start with pointer input");
assert.match(source, /pointermove/, "drag selection must cover lots crossed while holding");
assert.match(source, /\.lot\.chosen::after/, "selected lots must have a prominent selected marker");
assert.doesNotMatch(source, /ZOHO\.CREATOR\.API\.(updateRecord|deleteRecord)/, "the Builder Takedowns view must not expose editing APIs");

/* ── AI plat import ──
   Lot codes must match the Deluge "Set Lot Code if Manual Update" / Mass Create rules exactly:
   Subdivision_Code + "-B" + leftpad(block,2,"0") + "-L" + leftpad(lot,2,"0"). */
const padCode = new Function("str", `return (${extractFunction("padCode")})`)(scalar);
const buildLotCode = new Function("str", "padCode", `return (${extractFunction("buildLotCode")})`)(scalar, padCode);
const normBlock = new Function("str", `return (${extractFunction("normBlock")})`)(scalar);
const normLot = new Function("str", `return (${extractFunction("normLot")})`)(scalar);
const platNum = new Function(`return (${extractFunction("platNum")})`)();
const normalizePlatRows = new Function("str", "normBlock", "normLot", "platNum", `return (${extractFunction("normalizePlatRows")})`)(scalar, normBlock, normLot, platNum);
const mergePlatRows = new Function("natural", `return (${extractFunction("mergePlatRows")})`)(natural);
const blockGaps = new Function("natural", `return (${extractFunction("blockGaps")})`)(natural);
const platRowIssues = new Function("str", `return (${extractFunction("platRowIssues")})`)(scalar);
const platTileGrid = new Function(`return (${extractFunction("platTileGrid")})`)();

assert.equal(buildLotCode("TRB05", "1", "5"), "TRB05-B01-L05", "single digits are zero-padded like Deluge leftpad");
assert.equal(buildLotCode("TRB05", "12", "126"), "TRB05-B12-L126", "two-digit blocks and three-digit lots are left as printed");
assert.equal(buildLotCode("AAA", "A", "7"), "AAA-B0A-L07", "letter blocks pad to two characters exactly as leftpad does");
assert.equal(normBlock("Block 04"), "4", "block labels drop the word BLOCK and leading zeros");
assert.equal(normBlock(" c "), "C", "letter blocks are upper-cased");
assert.equal(normLot("Lot 007"), "7", "lot labels drop the word LOT and leading zeros");
assert.equal(normLot("17a"), "17A", "non-numeric lot labels survive for the reviewer to see");

const tileA = normalizePlatRows([
  { lot: "1", block: "4", area: 7187, width: 77 },
  { lot: 2, block: 4, area: "5,400", width: "45" },
  { lot: "", block: "4" },
  { lot: "3", block: null, area: null, width: null },
], 1);
assert.deepEqual(tileA, [
  { lot: "1", block: "4", area: 7187, width: 77, tile: 1 },
  { lot: "2", block: "4", area: 5400, width: 45, tile: 1 },
  { lot: "3", block: "", area: null, width: null, tile: 1 },
], "tile rows are normalised, blank lots dropped, unknown blocks kept as empty");

const merged = mergePlatRows(tileA.concat(normalizePlatRows([
  { lot: "2", block: "4", area: 5400, width: 45 },
  { lot: "1", block: "4", area: 7187, width: 55 },
  { lot: "10", block: "1", area: 5400, width: 45 },
], 2)));
assert.deepEqual(merged.map((r) => r.block + "|" + r.lot), ["|3", "1|10", "4|1", "4|2"], "overlapping tiles merge into one row per block+lot; unknown-block rows sort first so they get attention");
assert.equal(merged[2].seen, 2, "a lot reported by two tiles is seen twice");
assert.deepEqual(merged[2].conflicts, ["width=55"], "tiles that disagree on a value are flagged, first value kept");
assert.deepEqual(merged[2].tiles, [1, 2], "origin tiles are kept for the locate button");
assert.equal(merged[3].conflicts.length, 0, "agreeing tiles raise no conflict");

/* A lot seen without its block in one tile (label sat in another tile) folds into the one row
   that names the block; two candidate blocks keep the block-less row so a human decides. */
const folded = mergePlatRows(normalizePlatRows([
  { lot: "5", block: null, area: null, width: 50 },
  { lot: "6", block: null, area: null, width: 50 },
  { lot: "7", block: null, area: null, width: 50 },
], 1).concat(normalizePlatRows([
  { lot: "5", block: "18", area: null, width: 50 },
  { lot: "6", block: "18", area: null, width: 51.67 },
  { lot: "7", block: "18", area: null, width: null },
  { lot: "7", block: "12", area: null, width: null },
], 2)));
assert.deepEqual(folded.map((r) => r.block + "|" + r.lot), ["|7", "12|7", "18|5", "18|6", "18|7"], "block-less sightings fold into the single named row; an ambiguous lot keeps its unknown row");
assert.deepEqual(folded[2].tiles, [2, 1], "the folded row remembers both tiles");
assert.equal(folded[2].seen, 2, "the folded row counts both sightings");
assert.deepEqual(folded[3].conflicts, ["width=50"], "a width disagreement across the fold is flagged");
assert.equal(folded[4].width, null, "an ambiguous lot does not receive the block-less width");

assert.deepEqual(blockGaps([
  { block: "1", lot: "1" }, { block: "1", lot: "2" }, { block: "1", lot: "4" },
  { block: "2", lot: "3" }, { block: "", lot: "9" }, { block: "1", lot: "17A" },
]), [
  { block: "1", count: 3, min: 1, max: 4, missing: [3] },
  { block: "2", count: 1, min: 3, max: 3, missing: [] },
], "gap detection lists missing numbers per block and ignores unassigned or non-numeric lots");

const ctx = { existing: { "TRB05-B01-L01": {} }, dupes: { "TRB05-B01-L02": 2 } };
assert.deepEqual(platRowIssues({ block: "1", lot: "1", code: "TRB05-B01-L01", conflicts: [] }, ctx).map((x) => x.k + ":" + x.t), ["info:Already in Lots"]);
assert.deepEqual(platRowIssues({ block: "1", lot: "2", code: "TRB05-B01-L02", conflicts: [] }, ctx).map((x) => x.k), ["bad"], "duplicate staged rows are blocking");
assert.deepEqual(platRowIssues({ block: "", lot: "17A", code: "", conflicts: [] }, ctx).map((x) => x.t), ["Lot must be a whole number", "Block unknown"]);
assert.deepEqual(platRowIssues({ block: "ABC", lot: "1000", code: "X", conflicts: [] }, ctx).map((x) => x.t), ["Lot outside 1–999", "Block over 2 characters"], "Lots field limits (Block maxchar 2, Lot No maxchar 3) are enforced before insert");
assert.deepEqual(platRowIssues({ block: "1", lot: "5", code: "TRB05-B01-L05", width: 45, conflicts: ["area=6600"] }, ctx).map((x) => x.k), ["warn"], "tile disagreements warn but do not block");

const grid = platTileGrid(5731, 3656, 1024, 128);
assert.equal(grid.cols, 7);
assert.equal(grid.rows, 4);
assert.equal(grid.tiles.length, 28, "a 38x24in sheet at 150dpi cuts into 28 overlapping tiles");
assert.ok(grid.tiles.every((t) => t.x + t.w <= 5731 && t.y + t.h <= 3656 && t.w === 1024 && t.h === 1024), "tiles stay inside the page and keep the full tile size");
assert.equal(grid.tiles[grid.tiles.length - 1].x, 5731 - 1024, "the last column is clamped to the right edge");
const small = platTileGrid(800, 600, 1024, 128);
assert.deepEqual(small.tiles, [{ r: 0, c: 0, x: 0, y: 0, w: 800, h: 600 }], "a page smaller than a tile is one tile");

assert.match(source, /customApis:\{platIngest:"Ingest_Plat"\}/, "plat import must route through the Ingest_Plat custom API");
assert.match(source, /addRecord\(platPayload\(r,sub\),CFG\.lotsForm\)/, "staged lots must be inserted through the Lots form");
assert.match(source, /lotsForm:"Lots"/, "the Lots form link name must be declared");
assert.match(source, /piConfirm\(\{kicker:"Create lots"/, "creating lots must go through the in-widget confirm dialog");
assert.doesNotMatch(source, /window\.(confirm|alert|prompt)\(/, "no native browser dialogs inside the Creator iframe");
assert.match(source, /PF_Review|Settings page/, "the model/provider must be described as coming from the Settings page");
for (const field of ["Lot_Code", "Status", "Subdivision", "Subdivision_Code", "Phase", "Block", "Lot_Number", "City", "County", "Lot_Size"]) {
  assert.match(source, new RegExp(`\\b${field}\\b`), `Lots payload must carry ${field}`);
}

console.log("Manage Lots multi-subdivision, lot-detail, drag-selection, read-only takedown, and AI plat import checks passed.");
