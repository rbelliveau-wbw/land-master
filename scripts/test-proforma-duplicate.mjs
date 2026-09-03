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

const forkChildLists = (() => {
  const m = source.match(/var FORK_CHILD_LISTS=(\[[^\]]*\]);/);
  assert.ok(m, "FORK_CHILD_LISTS must exist");
  return JSON.parse(m[1].replace(/'/g, '"'));
})();

/* forkName and forkModel read S.proformas / S.myAccessId and the Edit Probability grant. */
function build(S, canEditProbability = true) {
  return new Function(
    "S",
    "canEditProbability",
    `${extractFunction("forkName")}\n${extractFunction("forkModel")}\n` +
      `var FORK_CHILD_LISTS=${JSON.stringify(forkChildLists)};\n` +
      `return { forkName: forkName, forkModel: forkModel };`
  )(S, () => canEditProbability);
}

/* ── naming ─────────────────────────────────────────────────────────────── */
{
  const { forkName } = build({ proformas: [{ Name: "Bell Sharkey" }], myAccessId: "9001" });
  assert.equal(forkName("Bell Sharkey"), "Bell Sharkey (Duplicate)", "the copy must be named with (Duplicate)");
  assert.equal(forkName(""), "Pro Forma (Duplicate)", "an unnamed source must still produce a usable name");
  assert.equal(forkName(null), "Pro Forma (Duplicate)", "a missing name must not produce 'null (Duplicate)'");
}
{
  const { forkName } = build({
    proformas: [{ Name: "Bell Sharkey" }, { Name: "Bell Sharkey (Duplicate)" }, { Name: "Bell Sharkey (Duplicate 2)" }],
    myAccessId: "9001",
  });
  assert.equal(forkName("Bell Sharkey"), "Bell Sharkey (Duplicate 3)", "names must not collide with existing Pro Formas");
  assert.equal(
    forkName("Bell Sharkey (Duplicate)"),
    "Bell Sharkey (Duplicate 3)",
    "duplicating a duplicate must not stack suffixes"
  );
  assert.equal(forkName("bell sharkey"), "bell sharkey (Duplicate 3)", "collision checks must be case-insensitive");
}

/* ── the fork must be additive: new rows only, source untouched ──────────── */
const sourceModel = {
  ID: "1001",
  Name: "Bell Sharkey",
  Status: "Approved",
  Lock_Inputs: "true",
  Owner: "7,8",
  Territory: "North Austin",
  Total_Acres: "146.7",
  purchaseDate: { y: 2026, m: 3 },
  _stored: { Net_Profit: 32663813, ROI: 1.0, IRR: 0.39, XIRR: 0.46 },
  purchaseInstallments: [{ ID: "i1", Installment: "1", Month1: "1", Cost: "5000000" }],
  saleInstallments: [{ ID: "i2", Installment: "1", Month1: "20", Cost: "1000000" }],
  pidMud: [{ ID: "i3", Month1: "24", Cost: "10211374" }],
  items: [{ ID: "it1", Item_Name: "Impact Fees", Add_l_Cost: "125000" }],
  curve: [{ ID: "c1", Month_Number: "1", Percent_Cost: "3" }],
  lotMix: [{ ID: "lm1", Lot_Size_Ft: "50", Lot_Count: "117", Price_LF: "1200" }],
};
const before = JSON.parse(JSON.stringify(sourceModel));

const { forkModel } = build({ proformas: [{ Name: "Bell Sharkey" }], myAccessId: "9001" });
const fork = forkModel(sourceModel);

assert.deepEqual(
  sourceModel,
  before,
  "duplicating must not mutate the source model — the source Pro Forma's rows must be left exactly as they were"
);

assert.equal(fork.ID, null, "the copy must have no record ID so Creator inserts instead of updating the source");
assert.equal(fork.Name, "Bell Sharkey (Duplicate)", "the copy must be renamed");
assert.equal(fork.Status, "Draft", "a copy of an approved Pro Forma must be born Draft");
assert.equal(fork.Lock_Inputs, "false", "a copy of a locked Pro Forma must be born unlocked");
assert.equal(fork.Owner, "9001", "the copy must be owned by whoever made it");
assert.equal(fork._stored, null, "stored server returns describe the source and must not be carried over");
assert.equal(fork.Territory, "North Austin", "every other header field must be copied verbatim");
assert.equal(fork.Total_Acres, "146.7", "every other header field must be copied verbatim");

for (const key of forkChildLists) {
  assert.ok(Array.isArray(fork[key]), `${key} must survive as an array`);
  assert.equal(fork[key].length, sourceModel[key].length, `${key} rows must all be copied`);
  fork[key].forEach((row, i) => {
    assert.equal(row.ID, null, `${key}[${i}] must lose its ID — a row ID would update the SOURCE's row`);
    assert.notEqual(row, sourceModel[key][i], `${key}[${i}] must be a distinct object from the source's row`);
  });
}
/* mutating the copy must not reach back into the source */
fork.purchaseInstallments[0].Cost = "1";
fork.items[0].Item_Name = "changed";
assert.equal(sourceModel.purchaseInstallments[0].Cost, "5000000", "editing the copy must not edit the source's rows");
assert.equal(sourceModel.items[0].Item_Name, "Impact Fees", "editing the copy must not edit the source's rows");

/* ── stage: a copy must not inherit a closed deal's stage, or one it cannot change ── */
{
  const S = { proformas: [], myAccessId: "9001" };
  assert.equal(build(S).forkModel({ Name: "A", Probability: "High" }).Probability, "High", "an open stage carries over");
  assert.equal(
    build(S).forkModel({ Name: "B", Probability: "Closed Won" }).Probability,
    "N/A",
    "a closed stage describes the deal that closed, not the copy"
  );
  assert.equal(
    build(S).forkModel({ Name: "C", Probability: "Closed Lost" }).Probability,
    "N/A",
    "a closed stage describes the deal that closed, not the copy"
  );
  assert.equal(
    build(S, false).forkModel({ Name: "D", Probability: "High" }).Probability,
    "N/A",
    "a user without Edit Probability must not be handed a stage they cannot correct"
  );
}

/* a source whose collections are missing entirely must not throw */
const sparse = forkModel({ ID: "2002", Name: "Sparse" });
forkChildLists.forEach((k) => assert.ok(Array.isArray(sparse[k]), `${k} must be normalised to an array`));

/* ── drift guard: every child collection must be declared in FORK_CHILD_LISTS ─ */
{
  const newModelSrc = extractFunction("newModel");
  const declared = new Set(forkChildLists);
  const collections = new Set();
  for (const m of newModelSrc.matchAll(/(\w+)\s*:\s*\[\]/g)) collections.add(m[1]);
  for (const m of newModelSrc.matchAll(/m\.(\w+)\s*=\s*\[\]/g)) collections.add(m[1]);
  assert.ok(collections.size >= 6, "newModel must still declare its child collections as array literals");
  for (const key of collections) {
    assert.ok(
      declared.has(key),
      `newModel creates the child collection "${key}" but FORK_CHILD_LISTS does not list it — ` +
        `Duplicate would copy those rows WITH their source IDs and overwrite the original Pro Forma's rows. ` +
        `Add "${key}" to FORK_CHILD_LISTS in widgets/proforma-manager/src/app/widget.html.`
    );
  }

  const payloadSrc = extractFunction("buildSavePayload");
  const returned = payloadSrc.slice(payloadSrc.lastIndexOf("return {"));
  /* `<key>: m.<collection>.map(...)` / `.filter(...)` — the trailing call is what makes it
     a row collection rather than a scalar like `id: m.ID||""`. */
  for (const m of returned.matchAll(/(\w+):\s*m\.(\w+)\s*\./g)) {
    assert.ok(
      declared.has(m[2]),
      `buildSavePayload sends the child collection "${m[2]}" but FORK_CHILD_LISTS does not list it — ` +
        `add it so Duplicate strips its row IDs.`
    );
  }
}

/* ── wiring and the guards that keep a save off the wrong record ─────────── */
/* assert.ok, not assert.match: a failing assert.match prints the whole 737KB widget. */
const has = (re, message) => assert.ok(re.test(source), message);
const lacks = (re, message) => assert.ok(!re.test(source), message);

has(/data-act="duplicate"/, "the row menu must expose a Duplicate button");
has(/act==="duplicate"\) duplicateProforma\(id\)/, "the row menu must route Duplicate to duplicateProforma");
has(/perms\(\)\.anyEdit\?'<button[^']*data-act="duplicate"/, "Duplicate must be hidden from read-only users");
has(
  /function writeLotMixViaSDK\(pfId\)\{[\s\S]{0,600}?if\(!pfId\)\{[\s\S]{0,200}?return Promise\.resolve/,
  "the lot mix writer must refuse to run without a record ID, or its diff would delete other records' rows"
);
has(
  /function deleteAllByCriteria[\s\S]{0,600}?Refused a delete with an incomplete criteria/,
  "deleteAllByCriteria must refuse a criteria whose record ID is missing"
);
has(
  /if\(!pfId\) throw \{message:"The save did not return a record ID/,
  "the save pipeline must stop before any id-keyed write when the create returned no ID"
);
lacks(
  /function duplicateProforma\([\s\S]{0,2600}?seedFromTemplates/,
  "a duplicate must not be seeded with template rows on top of the copied ones"
);

/* ── the copy must be unmistakably unsaved, and must not be silently discarded ─── */
has(/id="edDupBanner"/, "the editor must carry an unsaved-duplicate banner");
has(/Unsaved duplicate/, "the banner must name the state in plain words");
has(/function syncDuplicateBanner\(\)/, "the banner must be driven by state, not set once");
has(/updateDirtyChip\(\)\{[\s\S]{0,600}?syncDuplicateBanner\(\)/, "the banner must re-sync wherever the dirty state does");
has(/overlay\(true,"Creating duplicate"/, "clicking Duplicate must show progress, not a blank wait");
has(/edTitle"\)\.textContent="Duplicate of "\+srcName\+" \(unsaved\)"/, "the editor title must say the copy is unsaved");
has(/function unsavedEditorOpen\(viewName\)/, "an unsaved editor must have a single definition of 'has no record'");
has(
  /var recId=unsavedEditorOpen\(name\)\?"":/,
  "the record slider must not resolve a stale record id while an unsaved record is open"
);
has(
  /var pfId=unsavedEditorOpen\(S\.view\)\?"":/,
  "the record slider's click handler must not act on a stale record id"
);
has(
  /function duplicateProforma\([\s\S]{0,2600}?S\.dash\.id=null/,
  "staging a duplicate must clear the previously viewed record"
);
lacks(
  /function duplicateProforma\([\s\S]{0,2600}?syncRecordUrl\(/,
  "duplicateProforma must not touch the record URL — navigateParentURL would reload the page and drop the copy"
);
has(
  /if\(isNew && !apiMissing\)\{/,
  "a create must not be blind-retried: the payload carries id:\"\", so a retry inserts a second Pro Forma"
);
has(/pfId=createdRecordId\(resp\);/, "the SDK-fallback create must read the new record ID the same way the rest of the widget does");

console.log("Pro Forma Duplicate naming, additive-copy, source-immutability, drift-guard, and save-guard checks passed.");
