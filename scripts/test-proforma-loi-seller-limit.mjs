import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const widget = fs.readFileSync(path.join(root, "widgets/proforma-manager/src/app/widget.html"), "utf8");
const saveFn = fs.readFileSync(path.join(root, "creator/functions/proforma_save.dg"), "utf8");

const config = JSON.parse(fs.readFileSync(path.join(root, "widgets/proforma-manager/widget.config.json"), "utf8"));
assert.ok(widget.includes(`var PFW_VERSION="${config.version}";`));
assert.ok(widget.includes('function creatorText(v,max){return String(v==null?"":v).trim().slice(0,max);}'));
assert.ok(widget.includes('Builder_Name:creatorText(r.Builder_Name,50)'));
assert.equal((widget.match(/maxlength="50" title="Seller names may contain up to 50 characters"/g) || []).length, 2);
assert.equal((saveFn.match(/\.length\(\) > 50/g) || []).length, 2);
assert.equal((saveFn.match(/\.subString\(0,50\)/g) || []).length, 2);

const helperStart = widget.indexOf("function creatorText(v,max)");
const helperEnd = widget.indexOf("function sellerName", helperStart);
const creatorText = new Function(`${widget.slice(helperStart, helperEnd)}; return creatorText;`)();
assert.equal(creatorText(`  ${"A".repeat(55)}  `, 50), "A".repeat(50));

console.log("Pro Forma LOI seller-name field and server-boundary limits passed.");
