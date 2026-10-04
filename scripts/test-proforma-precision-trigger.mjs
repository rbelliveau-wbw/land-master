import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { ready, ID } from "./fixtures/proforma-sdk-v2-harness.mjs";

const source = fs.readFileSync("widgets/proforma-manager/src/app/widget.html", "utf8");
const report = "All_Pro_Formas_All_Fields";
const precision = { code: 3002, error: { Sale_Price_FF: "Round off the Sale Price $ / FF field value to 0 decimal places" } };

async function runSdk(nativeUpdate, payload = { Name: "QA", Sale_Price_FF: "1444.45" }) {
  const h = await ready({ update: nativeUpdate });
  try { return { h, result: await h.widget.sdkUpdate(report, ID, payload) }; }
  catch (error) { return { h, error }; }
}

// The real SDK2 wrapper must preserve fractional input and verify the exact
// same record's persisted fields before accepting a successful acknowledgement.
const accepted = await runSdk((config, apply) => { apply(); return { code: 3000, data: { ID: config.id } }; });
assert.equal(accepted.result.code, 3000);
assert.equal(accepted.h.writes.length, 1);
assert.equal(accepted.h.writes[0].id, ID);
assert.deepEqual(accepted.h.writes[0].payload, { data: { Name: "QA", Sale_Price_FF: "1444.45" } });
assert.equal(accepted.h.writes[0].skip_workflow, undefined);
assert.equal(accepted.h.writes[0].payload.skip_workflow, undefined);
assert.ok(accepted.h.calls.some(call => call.method === "records" && call.config.criteria === "(ID == " + ID + ")"));
assert.equal(accepted.h.widget.PFTransport.snapshot().ledger[0].state, "verified");

for (const nativeResponse of [precision, { code: 3001, error: [{ alert_message: ["Workflow outcome unconfirmed"] }] }, { code: 3000 }, { code: 3000, data: { ID: "90071992547419999" } }, { code: 3000, data: { ID: Number(ID) } }]) {
  const rejected = await runSdk(() => nativeResponse);
  assert.equal(rejected.error.noReplay, true);
  assert.equal(rejected.h.writes.length, 1);
  assert.equal(rejected.h.widget.PFTransport.snapshot().reviews.length, 1);
  await assert.rejects(rejected.h.widget.sdkUpdate(report, ID, { Name: "QA", Sale_Price_FF: "1444.45" }), error => error.noReplay === true);
  assert.equal(rejected.h.writes.length, 1, "an unknown native outcome must not probe another envelope/report or accept another Save");
}

const serverError = await runSdk(() => { throw Object.assign(new Error("Native HTTP 500"), { status: 500 }); });
assert.equal(serverError.error.noReplay, true);
assert.equal(serverError.h.writes.length, 1);

// A valid ID with stale fields still cannot claim a successful precision write.
const stale = await runSdk(config => ({ code: 3000, data: { ID: config.id } }));
assert.equal(stale.error.noReplay, true);
assert.equal(stale.h.widget.PFTransport.snapshot().ledger[0].state, "unknown");

const touchStart = source.indexOf("var headerTouch={Name:m.Name,Lock_Inputs:savedInputLock(m)};");
const touchEnd = source.indexOf("return engineTouch.then(function(){", touchStart);
assert.ok(touchStart >= 0 && touchEnd > touchStart);
const touchBlock = source.slice(touchStart, touchEnd) + "\nengineTouch;";
const precisionStart = source.indexOf("function isSalePricePrecisionRejection(");
const precisionEnd = source.indexOf("\nfunction sdkUpdate(", precisionStart);
assert.ok(precisionStart >= 0 && precisionEnd > precisionStart);

async function runTouch(salePrice, nativeUpdate) {
  const h = await ready({ update: nativeUpdate });
  const context = vm.createContext({
    Promise,
    m: { Name: "QA", Sale_Price_FF: salePrice },
    pfId: ID,
    savedInputLock: () => false,
    round2: n => Math.round(n * 100) / 100,
    num: n => Number(n),
    loiAuditSnapshot: () => ({}),
    auditLog: () => {},
    sdkUpdate: h.widget.sdkUpdate,
    CFG: { reports: { proformas: report } }
  });
  vm.runInContext(source.slice(precisionStart, precisionEnd), context);
  const engineTouch = vm.runInContext(touchBlock, context);
  try { await engineTouch; return { h }; }
  catch (error) { return { h, error }; }
}

const successfulUpdate = (config, apply) => { apply(); return { code: 3000, data: { ID: config.id } }; };
const exact = await runTouch("1444.45", () => precision);
assert.equal(exact.h.writes.length, 1, "the actual engine-touch catch must honor SDK2 noReplay instead of trying the alternate report");
assert.equal(exact.h.writes[0].report_name, report);
assert.equal(exact.h.writes[0].payload.data.Sale_Price_FF, "1444.45");
assert.equal(exact.error.noReplay, true);

const whole = await runTouch("1444", successfulUpdate);
assert.equal(whole.error, undefined);
assert.equal(whole.h.writes.length, 1);
assert.equal(Object.hasOwn(whole.h.writes[0].payload.data, "Sale_Price_FF"), false);

const precise = await runTouch("1444.4567", successfulUpdate);
assert.equal(precise.error, undefined);
assert.equal(precise.h.writes[0].payload.data.Sale_Price_FF, "1444.4567", "the engine trigger must not round the stored price");
assert.equal(precise.h.widget.PFTransport.snapshot().ledger[0].state, "verified");

const unrelated = await runTouch("1444.45", () => ({ code: 3002, error: { Name: "Name is required" } }));
assert.equal(unrelated.h.writes.length, 1);
assert.equal(unrelated.error.noReplay, true);

console.log("Pro Forma SDK2 explicit-price/engine trigger preserves precision, exact-ID fresh readback and single-send unknown outcomes.");
