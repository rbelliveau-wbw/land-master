import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const widget = fs.readFileSync(path.join(root, "widgets/land-master/src/app/widget.html"), "utf8");

for (const required of [
  'version: "8.11.3-TERRAVAULT"',
  'F("TerraVault_URL","TerraVault URL","url",rec.TerraVault_URL,{full:1})',
  '{label:"TerraVault URL",key:"TerraVault_URL",edit:"url"}',
  'function externalHttpUrl(v)',
  'function urlOpenHTML(v,label)',
  'data-open-external',
  'target="_blank" rel="noopener noreferrer"',
  'type="url" placeholder="https://…"',
  "e.stopPropagation();return;"
]) {
  assert.ok(widget.includes(required), `Land Master TerraVault support is missing ${required}`);
}

const urlStart = widget.indexOf("function externalHttpUrl(v)");
const urlEnd = widget.indexOf("function urlOpenHTML(v,label)");
assert.ok(urlStart >= 0 && urlEnd > urlStart, "external URL sanitizer must be extractable");
const externalHttpUrl = new Function(`${widget.slice(urlStart, urlEnd)}; return externalHttpUrl;`)();

assert.equal(externalHttpUrl("https://terravault.example/property/1"), "https://terravault.example/property/1");
assert.equal(externalHttpUrl("terravault.example/property/1"), "https://terravault.example/property/1");
assert.equal(externalHttpUrl("javascript:alert(1)"), "");
assert.equal(externalHttpUrl(""), "");

console.log("Land Master TerraVault grid, editor, save, and safe-link checks passed.");
