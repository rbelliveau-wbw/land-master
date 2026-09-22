import assert from "node:assert/strict";
import fs from "node:fs";

const widget = fs.readFileSync("widgets/proforma-manager/src/app/widget.html", "utf8");
const termsStart = widget.indexOf("var terms='<div class=\"fgrid\">'");
const termsEnd = widget.indexOf("var sellerRows=", termsStart);
const terms = widget.slice(termsStart, termsEnd);
const loadStart = widget.indexOf("function ensureLOIWorksheet(pfId)");
const loadEnd = widget.indexOf("function buildLOIWorksheetPayload", loadStart);
const loader = widget.slice(loadStart, loadEnd);

assert.ok(termsStart >= 0 && termsEnd > termsStart, "Offer terms renderer must be available");
for (const field of ["Response_Date", "Assumed_Effective_Date", "Projected_Hard_Close_Date"]) {
  assert.ok(
    terms.includes(`loiDateInput("${field}"`),
    `${field} must use the shared custom date picker`
  );
}
assert.ok(!terms.includes('loiInput("Response_Date","date")'), "Offer must not use Chromium's native date control");
assert.ok(widget.includes('id="loiDatePop"'), "custom calendar popover must be rendered outside the Offer grid");
assert.ok(widget.includes('data-loi-date-value="'), "calendar days must commit explicit ISO dates");
assert.ok(widget.includes('inp.dispatchEvent(new Event("input",{bubbles:true}))'), "date choices must use the existing Offer input pipeline");
assert.ok(widget.includes('["Response_Date","Response Date"],["Assumed_Effective_Date"'), "all three editable dates must receive ISO validation");
assert.ok(widget.includes('seed=raw&&loiValidDate(raw)?raw:loiToday()'), "a blank date must seed the calendar with today");
assert.ok(widget.includes('month<0||month>11'), "calendar initialization must reject invalid month indexes");
assert.ok(widget.includes('.loi-date-nav svg{display:block;width:12px;height:12px'), "calendar navigation must use centered SVG chevrons");
assert.ok(widget.includes('d="m15 18-6-6 6-6"'), "calendar must render the previous-month chevron");
assert.ok(widget.includes('d="m9 18 6-6-6-6"'), "calendar must render the next-month chevron");
assert.ok(!widget.includes('aria-label="Previous month">‹'), "calendar navigation must not rely on off-center font glyphs");

assert.ok(loader.includes("S.ed.loiDirty=false;"), "loading Offer defaults must leave the editor clean");
assert.ok(
  !loader.includes("S.ed.loiDirty=canEditLOI()"),
  "an absent stored effective date must not masquerade as a user edit"
);

assert.ok(terms.includes('<div class="loi-broker-pair">'), "Buyer and Seller Broker must share one layout row");
assert.ok(terms.includes('Enter \\u201CNone\\u201D if there is no buyer-side broker'), "Buyer Broker must explain its no-broker value");
assert.ok(terms.includes('Enter \\u201CNone\\u201D if there is no seller-side broker'), "Seller Broker must explain its no-broker value");
assert.ok(terms.includes("Optional — leave blank if not known"), "optional Offer inputs must explain that blank is valid");

console.log("Offer custom dates, calendar initialization, broker layout, optional guidance, and clean-load behavior passed.");
