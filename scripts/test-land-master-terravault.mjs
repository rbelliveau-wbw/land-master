import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const widget = fs.readFileSync(path.join(root, "widgets/land-master/src/app/widget.html"), "utf8");

for (const required of [
  'version: "8.11.4-TERRAVAULT-HTTPS"',
  'F("TerraVault_URL","TerraVault URL","url",rec.TerraVault_URL,{full:1})',
  '{label:"TerraVault URL",key:"TerraVault_URL",edit:"url"}',
  'function normalizeWebUrl(v)',
  'function externalHttpUrl(v)',
  'function urlOpenHTML(v,label)',
  'data-open-external',
  'target="_blank" rel="noopener noreferrer"',
  'type="url" placeholder="https://…"',
  "e.stopPropagation();return;",
  "inputRaw(el,ftype),orig=String(el.getAttribute('data-original')||'')",
  "if(ftype==='url'){var normalized=normalizeWebUrl(raw)",
  "else if(ftype==='url')rec[field]=payloadValue('url',raw)"
]) {
  assert.ok(widget.includes(required), `Land Master TerraVault support is missing ${required}`);
}

const urlStart = widget.indexOf("function normalizeWebUrl(v)");
const urlEnd = widget.indexOf("function urlOpenHTML(v,label)");
assert.ok(urlStart >= 0 && urlEnd > urlStart, "external URL sanitizer must be extractable");
const urls = new Function(`${widget.slice(urlStart, urlEnd)}; return {normalizeWebUrl,externalHttpUrl};`)();

assert.equal(urls.normalizeWebUrl("www.test.com"), "https://www.test.com/");
assert.equal(urls.normalizeWebUrl("terravault.example/property/1"), "https://terravault.example/property/1");
assert.equal(urls.externalHttpUrl("https://terravault.example/property/1"), "https://terravault.example/property/1");
assert.equal(urls.externalHttpUrl("javascript:alert(1)"), "");
assert.equal(urls.externalHttpUrl("ftp://terravault.example/property/1"), "");
assert.equal(urls.externalHttpUrl(""), "");

console.log("Land Master TerraVault grid, editor, save, and safe-link checks passed.");
