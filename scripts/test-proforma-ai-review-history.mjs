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

/* Drives the real loadAiReviews against a scripted sdkGetAll. `reads` records every
   (report, criteria) pair so a test can assert the unfiltered retry actually happened. */
function harness(responses) {
  const reads = [];
  const logs = [];
  const S = { aiReviewsByPf: {}, aiReviewsLoading: {}, aiReviewsReportMissing: false };
  const CFG = { reports: { aiReviews: "All_Proforma_AI_Reviews" }, aiReviewProformaField: "Pro_Forma" };
  const sdkGetAll = (report, criteria) => {
    reads.push({ report, criteria });
    const next = responses.shift();
    if (!next) throw new Error("unexpected extra read: " + report + " / " + criteria);
    return next.reject ? Promise.reject(next.reject) : Promise.resolve(next.rows);
  };
  const loadAiReviews = new Function(
    "S",
    "CFG",
    "sdkGetAll",
    "aiSortReviews",
    "normalizeAiReview",
    "auditLog",
    "errMeta",
    `${extractFunction("loadAiReviews")}\nreturn loadAiReviews;`
  )(
    S,
    CFG,
    sdkGetAll,
    (rows) => rows,
    (row) => (row ? { id: String(row.ID || ""), pfId: String(row.pf == null ? "" : row.pf) } : null),
    (level, message, meta) => logs.push({ level, message, meta }),
    (e) => ({ message: String((e && e.message) || e) })
  );
  return { loadAiReviews, reads, logs, S };
}

const rowsFor = (...pf) => pf.map((p, i) => ({ ID: "air" + i, pf: p }));

/* ── the ordinary path ─────────────────────────────────────────────────────── */
{
  const h = harness([{ rows: rowsFor("500", "500") }]);
  const out = await h.loadAiReviews("500");
  assert.equal(out.length, 2, "a working criteria read returns its rows");
  assert.equal(h.reads.length, 1, "a working criteria read must not trigger a second read");
  assert.equal(h.reads[0].criteria, "(Pro_Forma == 500)", "history is scoped by the Pro_Forma lookup");
  assert.ok(!out.unavailable, "a working read is not 'unavailable'");
}

/* ── the reported failure: report exists, criteria rejected ────────────────── */
{
  const h = harness([
    { reject: { message: "All report candidates failed for All_Proforma_AI_Reviews", notFound: false } },
    { rows: rowsFor("500", "777", "500", "") },
  ]);
  const out = await h.loadAiReviews("500");
  assert.equal(h.reads.length, 2, "a rejected criteria read must be retried without criteria");
  assert.equal(h.reads[1].criteria, "", "the retry must drop the criteria, not change report");
  assert.equal(h.reads[1].report, "All_Proforma_AI_Reviews", "the retry must ask the same report again");
  assert.equal(out.length, 2, "the unfiltered rows must be scoped to this Pro Forma in the widget");
  assert.ok(
    out.every((r) => r.pfId === "500"),
    "an unfiltered read must drop every row that cannot prove it belongs to this Pro Forma"
  );
  assert.ok(!out.unavailable, "recovering from a criteria failure is not an unavailable history");
}

/* ── the report genuinely does not exist here ──────────────────────────────── */
{
  const h = harness([{ reject: { message: "no report named", notFound: true } }]);
  const out = await h.loadAiReviews("500");
  assert.equal(h.reads.length, 1, "a missing report must not be re-read without criteria");
  assert.equal(out.length, 0, "a missing report is an empty history");
  assert.equal(out.unavailable, true, "a missing report is reported as unavailable");
  assert.equal(h.S.aiReviewsReportMissing, true, "a missing report must stop the widget asking again");
}

/* ── report exists but its quick view has no Pro_Forma column ──────────────── */
{
  const h = harness([
    { reject: { message: "3330 invalid criteria", notFound: false } },
    { rows: rowsFor("", "", "") },
  ]);
  const out = await h.loadAiReviews("500");
  assert.equal(out.unavailable, true, "rows that name no Pro Forma cannot be shown as this record's history");
  assert.match(
    out.reason,
    /Pro_Forma is not in the All_Proforma_AI_Reviews quick view/,
    "the empty state must say what to fix in Creator, not just that it failed"
  );
  assert.ok(
    h.logs.some((l) => /quick view/.test(l.message)),
    "the audit log must name the missing quick-view column"
  );
}

/* ── an empty history is still an empty history, not a failure ─────────────── */
{
  const h = harness([{ rows: [] }]);
  const out = await h.loadAiReviews("500");
  assert.equal(out.length, 0, "no reviews is an empty list");
  assert.ok(!out.unavailable, "no reviews must read as 'No AI reviews yet', not 'unavailable'");
}

const has = (re, message) => assert.ok(re.test(source), message);
has(
  /list\.unavailable&&list\.reason\?' title="'\+esc\(list\.reason\)/,
  "the unavailable empty state must carry its reason as a tooltip"
);

console.log("Pro Forma AI review history criteria-failure recovery and scoping checks passed.");
