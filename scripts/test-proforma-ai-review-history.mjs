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
  const diagnosed = [];
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
    "diagnoseAiReviewHistory",
    "aiReviewRec",
    `${extractFunction("loadAiReviews")}\nreturn loadAiReviews;`
  )(
    S,
    CFG,
    sdkGetAll,
    (rows) => rows,
    (row) => (row ? { id: String(row.ID || ""), pfId: String(row.pf == null ? "" : row.pf) } : null),
    (level, message, meta) => logs.push({ level, message, meta }),
    (e) => ({ message: String((e && e.message) || e) }),
    (id) => { diagnosed.push(String(id)); return Promise.resolve(null); },
    () => null
  );
  return { loadAiReviews, reads, logs, S, diagnosed };
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
  assert.deepEqual(h.diagnosed, ["500"], "an unavailable history must run the audit-log diagnostic");
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


/* ── the diagnostic the audit log relies on ───────────────────────────────── */
{
  const calls = [];
  const logs = [];
  const answers = {
    All_Proforma_AI_Reviews: { data: [{ ID: "9", Pro_Forma: { ID: "500" }, Verdict: "Watch" }], code: 3000 },
  };
  const diagnose = new Function(
    "S",
    "CFG",
    "candidates",
    "REPORT_CAND_MEMO",
    "ZOHO",
    "responseBad",
    "lookupId",
    "auditLog",
    "errMeta",
    "PFW_VERSION",
    `${extractFunction("diagnoseAiReviewHistory")}\nreturn diagnoseAiReviewHistory;`
  )(
    { liveSDK: true, env: { name: "PRODUCTION" }, aiReviewsReportMissing: true },
    { reports: { aiReviews: "All_Proforma_AI_Reviews" }, aiReviewProformaField: "Pro_Forma" },
    () => ["All_Proforma_AI_Reviews", "All_AI_Reviews"],
    {},
    {
      CREATOR: {
        API: {
          getAllRecords: (p) => {
            calls.push({ report: p.reportName, criteria: p.criteria || "" });
            const a = answers[p.reportName];
            if (!a) return Promise.reject({ code: 2894, message: "No report named " + p.reportName });
            if (p.criteria) return Promise.reject({ code: 3330, message: "invalid criteria" });
            return Promise.resolve(a);
          },
        },
      },
    },
    (r) => !r || (r.code && r.code !== 3000),
    (v) => (v && typeof v === "object" ? v.ID : v),
    (level, message, meta) => logs.push({ level, message, meta }),
    (e) => ({ message: String((e && e.message) || e) }),
    "1.75.0-test"
  );

  const out = await diagnose("500");
  assert.deepEqual(
    calls.map((c) => c.report + "|" + c.criteria),
    ["All_Proforma_AI_Reviews|", "All_AI_Reviews|", "All_Proforma_AI_Reviews|(Pro_Forma == 500)"],
    "the diagnostic must bare-read every candidate report, then try the criteria read"
  );
  assert.equal(logs.length, 1, "the diagnostic must emit exactly one audit entry");
  assert.equal(logs[0].level, "warn", "the diagnostic must log at warn so it never sends the error email");
  assert.match(logs[0].message, /AI REVIEW HISTORY DIAGNOSTIC/, "the entry must be findable by name in the log");

  const bare = out.probes[0];
  assert.equal(bare.rows, 1, "a candidate that answers must report its row count");
  assert.equal(bare.proformaFieldPresent, true, "the probe must say whether the lookup column came back at all");
  assert.deepEqual(bare.resolvedPfIds, ["500"], "the probe must resolve each row's Pro Forma id");
  assert.ok(Array.isArray(bare.firstRowKeys) && bare.firstRowKeys.includes("Verdict"), "the probe must list the columns the report returns");

  assert.equal(out.probes[1].code, 2894, "a missing report must be reported with its Creator code");
  assert.equal(out.probes[2].code, 3330, "a refused criteria must be reported with its Creator code");
  assert.equal(out.env, "PRODUCTION", "the entry must say which environment it ran in");
  assert.equal(out.widget, "1.75.0-test", "the entry must say which widget build it ran from");
}

/* ── the diagnostic must actually be wired to both dead ends ──────────────── */
{
  const hasSrc = (re, message) => assert.ok(re.test(source), message);
  hasSrc(
    /if\(force\|\|!S\._aiDiagRan\)\{ S\._aiDiagRan=true; diagnoseAiReviewHistory\(id\); \}/,
    "an unavailable history must trigger the diagnostic once per session"
  );
  hasSrc(
    /rec\.AI_Review_Verdict[\s\S]{0,120}?diagnoseAiReviewHistory\(id\)/,
    "an empty history on a record that already carries a verdict must trigger the diagnostic too"
  );
  hasSrc(/loadAiReviews\(id,true\)/, "the Refresh button must force a reload, which re-runs the diagnostic");
}


/* ── the report link name, and the config wiring that hid it ──────────────── */
{
  function block(startMarker) {
    const i = source.indexOf(startMarker);
    assert.notEqual(i, -1, `${startMarker} must exist`);
    const open = source.indexOf("{", i);
    let depth = 0;
    for (let j = open; j < source.length; j += 1) {
      if (source[j] === "{") depth += 1;
      if (source[j] === "}") depth -= 1;
      if (depth === 0) return source.slice(open, j + 1);
    }
    throw new Error(`Could not parse ${startMarker}`);
  }
  const reports = block("\n  reports: {");
  const candidates = block("\n  reportCandidates: {");

  const reportValues = new Set([...reports.matchAll(/:\s*"([^"]+)"/g)].map((m) => m[1]));
  assert.ok(
    reportValues.has("All_Proforma_Ai_Reviews"),
    'the AI review report is All_Proforma_Ai_Reviews — Creator title-cased the form name, and report link names are case-sensitive to the record API'
  );

  /* candidates() looks the list up BY the configured report name. A key that matches no
     configured report is a fallback list that can never run — which is how the AI review
     history read lost its alternatives without anything failing loudly. */
  const candidateKeys = [...candidates.matchAll(/^\s{4}(\w+):\s*\[/gm)].map((m) => m[1]);
  assert.ok(candidateKeys.length >= 5, "reportCandidates must still list its report keys");
  for (const key of candidateKeys) {
    assert.ok(
      reportValues.has(key),
      `reportCandidates key "${key}" matches no value in CFG.reports, so candidates() can never find its fallback list — rename the key to the configured report name`
    );
  }
}

console.log("Pro Forma AI review history recovery, scoping, diagnostic, and report-name wiring checks passed.");
