import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("widgets/proforma-manager/src/app/widget.html", "utf8");
const sdkStart = source.indexOf("function sdkUpdate(");
const sdkEnd = source.indexOf("\n/* Creator lookup", sdkStart);
assert.ok(sdkStart >= 0 && sdkEnd > sdkStart);

const precision = { code: 3002, error: { Sale_Price_FF: "Round off the Sale Price $ / FF field value to 0 decimal places" } };
const success = { code: 3000, message: "Data Updated Successfully" };

async function runSdk(response) {
  const payloads = [];
  const context = vm.createContext({
    Promise,
    S: { liveSDK: true },
    candidates: () => ["All_Pro_Formas_All_Fields"],
    ZOHO: { CREATOR: { API: { updateRecord: async payload => {
      payloads.push(payload);
      return response;
    } } } },
    responseBad: r => r.code !== 3000,
    isTerminalRejection: r => r.code === 3002,
    creatorErrorMessage: r => Object.values(r.error || {}).join(" "),
    auditLog: () => {}
  });
  vm.runInContext(source.slice(sdkStart, sdkEnd), context);
  try {
    const result = await context.sdkUpdate("All_Pro_Formas_All_Fields", "4410926000004947002",
      { Name: "QA", Sale_Price_FF: "1444.45" });
    return { result, payloads };
  } catch (error) {
    return { error, payloads };
  }
}

const accepted = await runSdk(success);
assert.equal(accepted.result.code, 3000);
assert.deepEqual(JSON.parse(JSON.stringify(accepted.payloads[0].data)),
  { data: { Name: "QA", Sale_Price_FF: "1444.45" } });

const rejected = await runSdk(precision);
assert.equal(rejected.error.terminal, true);
assert.equal(rejected.payloads.length, 1, "v1 must not retry Creator's invalid direct-data envelope");

const touchStart = source.indexOf("var headerTouch={Name:m.Name,Lock_Inputs:savedInputLock(m)};");
const touchEnd = source.indexOf("return engineTouch.then(function(){", touchStart);
assert.ok(touchStart >= 0 && touchEnd > touchStart);
const touchBlock = source.slice(touchStart, touchEnd) + "\nengineTouch;";

async function runTouch(salePrice, firstResponse, secondResponse) {
  const calls = [];
  const context = vm.createContext({
    Promise,
    m: { Name: "QA", Sale_Price_FF: salePrice },
    pfId: "4410926000004947002",
    savedInputLock: () => false,
    round2: n => Math.round(n * 100) / 100,
    num: n => Number(n),
    loiAuditSnapshot: () => ({}),
    auditLog: () => {},
    isSalePricePrecisionRejection: e => e?.response?.code === 3002 &&
      !!e.response.error?.Sale_Price_FF,
    sdkUpdate: (report, id, data) => {
      calls.push({ report, id, data: { ...data } });
      const response = calls.length === 1 ? firstResponse : secondResponse;
      return response instanceof Error || response?.response ? Promise.reject(response) : Promise.resolve(response);
    },
    CFG: { reports: { proformas: "All_Pro_Formas_All_Fields" } }
  });
  const engineTouch = vm.runInContext(touchBlock, context);
  try { await engineTouch; return { calls }; }
  catch (error) { return { calls, error }; }
}

const precisionError = { response: precision };
const exact = await runTouch("1444.45", precisionError, success);
assert.equal(exact.calls.length, 2);
assert.equal(exact.calls[0].report, "All_Pro_Formas_All_Fields");
assert.equal(exact.calls[1].report, "All_Pro_Formas");
assert.equal(exact.calls[0].data.Sale_Price_FF, "1444.45");
assert.equal(exact.calls[1].data.Sale_Price_FF, "1444.45");

const whole = await runTouch("1444", success);
assert.equal(whole.calls.length, 1);
assert.equal(Object.hasOwn(whole.calls[0].data, "Sale_Price_FF"), false);

const otherError = { response: { code: 3002, error: { Name: "Name is required" } } };
const unrelated = await runTouch("1444.45", otherError, success);
assert.equal(unrelated.calls.length, 1);
assert.equal(unrelated.error, otherError);

console.log("Pro Forma explicit-price and alternate-report engine trigger checks passed.");
