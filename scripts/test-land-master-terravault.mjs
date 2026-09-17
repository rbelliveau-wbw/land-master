import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const widget = fs.readFileSync(path.join(root, "widgets/land-master/src/app/widget.html"), "utf8");
const config = JSON.parse(fs.readFileSync(path.join(root, "widgets/land-master/widget.config.json"), "utf8"));

for (const required of [
  `version: "${config.version}-TERRAVAULT-COMPOSITE"`,
  'F("TerraVault_URL","TerraVault URL","url",rec.TerraVault_URL,{full:1})',
  '{label:"TerraVault URL",key:"TerraVault_URL",edit:"url"}',
  'function normalizeWebUrl(v)',
  'function creatorUrlPayload(v)',
  'function externalHttpUrl(v)',
  'function urlOpenHTML(v,label)',
  'data-open-external',
  'target="_blank" rel="noopener noreferrer"',
  'type="url" placeholder="https://…"',
  "e.stopPropagation();return;",
  "inputRaw(el,ftype),orig=String(el.getAttribute('data-original')||'')",
  "if(ftype==='url'){var normalized=normalizeWebUrl(raw)",
  "if(ftype==='url')return creatorUrlPayload(raw)",
  "else if(ftype==='url')rec[field]=normalizeWebUrl(raw)"
]) {
  assert.ok(widget.includes(required), `Land Master TerraVault support is missing ${required}`);
}

const urlStart = widget.indexOf("function unwrapPastedWebUrl(v)");
const urlEnd = widget.indexOf("function urlOpenHTML(v,label)");
assert.ok(urlStart >= 0 && urlEnd > urlStart, "external URL sanitizer must be extractable");
const urls = new Function(`${widget.slice(urlStart, urlEnd)}; return {normalizeWebUrl,externalHttpUrl,creatorUrlPayload};`)();

assert.equal(urls.normalizeWebUrl("www.test.com"), "https://www.test.com/");
assert.equal(urls.normalizeWebUrl("terravault.example/property/1"), "https://terravault.example/property/1");
assert.equal(urls.normalizeWebUrl("[Land Projects](https://creatorapp.zoho.com/wbdevelopment/land-master/#Page:Land_Projects)"), "https://creatorapp.zoho.com/wbdevelopment/land-master/#Page:Land_Projects");
assert.equal(urls.normalizeWebUrl("[Land Projects](https://creatorapp.zoho.com/wbdevelopment/land-master/#Page:Land\\_Projects)"), "https://creatorapp.zoho.com/wbdevelopment/land-master/#Page:Land_Projects");
assert.equal(urls.normalizeWebUrl({value:"Google",url:"https://google.com/",title:"Google"}), "https://google.com/");
assert.equal(urls.normalizeWebUrl('<a href="https://google.com/" title="Google">Google</a>'), "https://google.com/");
assert.deepEqual(urls.creatorUrlPayload("www.test.com"), {value:"https://www.test.com/",url:"https://www.test.com/",title:"TerraVault"});
assert.deepEqual(urls.creatorUrlPayload("test.com"), {value:"https://test.com/",url:"https://test.com/",title:"TerraVault"});
assert.equal(urls.externalHttpUrl("https://terravault.example/property/1"), "https://terravault.example/property/1");
assert.equal(urls.externalHttpUrl("javascript:alert(1)"), "");
assert.equal(urls.externalHttpUrl("ftp://terravault.example/property/1"), "");
assert.equal(urls.externalHttpUrl(""), "");

console.log("Land Master TerraVault grid, editor, save, and safe-link checks passed.");
