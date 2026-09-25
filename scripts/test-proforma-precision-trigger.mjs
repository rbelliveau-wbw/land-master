import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("widgets/proforma-manager/src/app/widget.html", "utf8");
const start = source.indexOf("function sdkUpdate(");
const end = source.indexOf("\n/* Creator lookup", start);
assert.ok(start >= 0 && end > start);

async function run(responses, opts) {
  const payloads = [];
  const context = vm.createContext({
    Promise,
    S: { liveSDK: true },
    candidates: () => ["All_Pro_Formas_All_Fields"],
    ZOHO: { CREATOR: { API: { updateRecord: async payload => {
      payloads.push(payload);
      return responses[payloads.length - 1];
    } } } },
    responseBad: response => response.code !== 3000,
    isTerminalRejection: response => response.code === 3002,
    isSalePricePrecisionRejection: response => response.code === 3002 &&
      /0 decimal places/.test(response.error?.Sale_Price_FF || ""),
    creatorErrorMessage: response => Object.values(response.error || {}).join(" "),
    auditLog: () => {}
  });
  vm.runInContext(source.slice(start, end), context);
  const result = await context.sdkUpdate("All_Pro_Formas_All_Fields", "4410926000004947002",
    { Name: "QA", Lock_Inputs: false }, opts);
  return { result, payloads };
}

const precision = { code: 3002, error: { Sale_Price_FF: "Round off the Sale Price $ / FF field value to 0 decimal places" } };
const success = { code: 3000, message: "Data Updated Successfully" };
const retried = await run([precision, success], { retrySalePricePrecision: true });
assert.equal(retried.result.code, 3000);
assert.equal(retried.payloads.length, 2);
assert.deepEqual(JSON.parse(JSON.stringify(retried.payloads[0].data)), { data: { Name: "QA", Lock_Inputs: false } });
assert.deepEqual(JSON.parse(JSON.stringify(retried.payloads[1].data)), { Name: "QA", Lock_Inputs: false });

await assert.rejects(run([precision], undefined), error =>
  error.terminal === true && /0 decimal places/.test(error.message));
await assert.rejects(run([{ code: 3002, error: { Name: "Name is required" } }],
  { retrySalePricePrecision: true }), error =>
  error.terminal === true && /Name is required/.test(error.message));
console.log("Pro Forma precision-specific engine trigger retry checks passed.");
