import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

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

// Execute the actual Offer display expressions, calculation and save builder.
function offerFunction(name) {
  const start=widget.indexOf('function '+name+'('),end=widget.indexOf('\nfunction ',start+1);
  assert.ok(start>=0&&end>start,`${name} must be available`);
  return widget.slice(start,end).split('\n/*')[0];
}
const propertyId='4410926000004947003';
const offer={propertyIds:[propertyId],newProperties:[{Acres:'49.999998'}],Amount_Per_Acre:'15000.00',Assumed_Effective_Date:'2026-11-05'};
const offerContext=vm.createContext({S:{ed:{id:'4410926000004947002',loi:offer},properties:[{ID:propertyId,Acres:'50'}]},l:offer});
vm.runInContext(['num','round2','fmt$','fmtWhole$','stripMoney','byId','pendingPropertyRows','loiRecalcSummary','loiAgreementType','loiToday','dateToInputValue','dateToCreatorValue','buildLOIWorksheetPayload'].map(offerFunction).join('\n'),offerContext);
offerContext.loiRecalcSummary();
assert.equal(offer.Estimated_Price,'1499999.97','calculation retains the actual cent amount');
assert.equal(offer.Total_Acres,'99.999998','property acreage retains its precision');
const initialPrice=terms.match(/id="loiEstimatedPrice">'\+(.+?)\+'<\/div>'/);
assert.ok(initialPrice,'initial Estimated Price display must be available');
const livePrices=[...widget.matchAll(/\b(?:ep|nep|eep|cEp)\.textContent=([^;]+);/g)].map(match=>match[1]);
assert.equal(livePrices.length,4,'cover field input, new/existing property and company-picker display updates');
const displayExpressions=[initialPrice[1],...livePrices];
for(const [raw,display] of [['1499999.97','$1,500,000'],['1499999.49','$1,499,999']]){
  offer.Estimated_Price=raw;
  for(const expression of displayExpressions){
    assert.equal(vm.runInContext(expression,offerContext),display,'initial and refreshed Estimated Price displays round to the nearest dollar');
    assert.equal(offer.Estimated_Price,raw,'formatting must leave the raw amount unchanged');
  }
}
const offerPayload=offerContext.buildLOIWorksheetPayload(offer);
assert.equal(offer.Estimated_Price,'1499999.97','save calculation retains cents after display rounding');
assert.equal(offerPayload.Estimated_Price,'1499999.97','worksheet payload saves the actual cent amount');
assert.equal(offerPayload.Amount_Per_Acre,'15000.00','unit-price input precision is preserved');
assert.equal(offerPayload.Total_Acres,'99.999998','saved acreage precision is preserved');
assert.equal(offer.Amount_Per_Acre,'15000.00','display formatting does not rewrite the editable unit price');
console.log('Offer Estimated Price rounds only its initial/live displays; calculation and save payload preserve cents.');
