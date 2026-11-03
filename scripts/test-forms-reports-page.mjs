import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildCatalogHtml,buildNativeSnippet,buildSnippetBody,routes} from './build-forms-reports-page.mjs';

const inventory=JSON.parse(fs.readFileSync('creator/catalog/forms-reports.inventory.json','utf8'));
const descriptions=JSON.parse(fs.readFileSync('creator/catalog/form-descriptions.json','utf8'));
const html=buildCatalogHtml(inventory,descriptions);
assert.equal((html.match(/data-form="/g)||[]).length,inventory.forms.length,'every actual form is rendered once');
assert.equal((html.match(/data-report="/g)||[]).length,inventory.reports.length,'every actual report is rendered once');
assert.equal((html.match(/data-f="/g)||[]).length,inventory.forms.reduce((n,f)=>n+f.fields.length,0),'every declared field is included');
assert.equal((html.match(/data-field-component="/g)||[]).length,inventory.counts.compound_components||0,'explicit compound parts are included beneath their parent field');
assert.equal((html.match(/data-system-field="/g)||[]).length,inventory.counts.report_system_fields||0,'only attested report system fields are included');
for(const form of inventory.forms){
  assert.ok(html.includes(`data-form="${form.link_name}"`));assert.ok(html.includes(`data-fields-for="${form.link_name}"`));
  assert.ok(html.includes(`aria-describedby="lm-tip-${form.link_name}"`));assert.ok(html.includes(`role="tooltip" id="lm-tip-${form.link_name}"`));
  for(const field of form.fields)for(const component of field.components||[])assert.ok(html.includes(`data-field-component="${field.link_name}.${component.link_name}"`));
  for(const field of form.report_system_fields||[])for(const reportKey of field.source_reports){const report=inventory.reports.find(r=>r.link_name===reportKey);assert.equal(report.source_form,form.link_name);assert.ok(report.system_fields.includes(field.link_name),'system field provenance belongs to this exact form');}
  const formRoutes=routes('Form',form.link_name);for(const url of Object.values(formRoutes))assert.ok(html.includes(`href="${url}"`),url);
}
for(const report of inventory.reports){for(const url of Object.values(routes('Report',report.link_name)))assert.ok(html.includes(`href="${url}"`),url);}
assert.match(html,/<input[^>]+id="lm-prod"[^>]+checked/);assert.doesNotMatch(html,/<input[^>]+id="lm-dev"[^>]+checked/);
assert.match(html,/\.lm-open\.dev\{display:none\}/);assert.match(html,/#lm-dev:checked~\.lm-section \.lm-open\.prod\{display:none\}/);
assert.match(html,/\.lm-name-help:hover \.lm-tip/);assert.match(html,/\.lm-name-help:focus \.lm-tip/);
assert.match(html,/details\.lm-motion-disclosure::details-content/,'native disclosures reuse shared motion CSS');assert.match(html,/prefers-reduced-motion:reduce/);
assert.doesNotMatch(html,/<script\b|\bonclick\s*=|\bonchange\s*=/i,'native HTML snippet does not depend on browser scripts');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'native IDs are unique');
assert.ok(buildSnippetBody(html).length<450000,'native snippet stays below Creator’s 450,000-character limit');
const native=buildNativeSnippet(html);assert.match(native,/^htmlpage html_snippet3\(\)\ncontent\n<%\{/);assert.ok(native.includes(html));assert.ok(native.endsWith('}%>\n'));
const fixture={forms:[{link_name:'Safe_Form',display_name:'<unsafe form>',fields:[{link_name:'Name',display_name:'<unsafe field>',type:'text',required:true,unique:true,referenced_form:'Related_Form'}],related_forms:['Related_Form']}],reports:[{link_name:'Safe_Report',display_name:'<unsafe report>',source_form:'Safe_Form'}]};
const escaped=buildCatalogHtml(fixture,{Safe_Form:'Executive purpose <script>unsafe</script> & connection.'});
assert.ok(escaped.includes('&lt;unsafe form&gt;'));assert.ok(escaped.includes('&lt;unsafe field&gt;'));assert.ok(escaped.includes('&lt;unsafe report&gt;'));assert.ok(escaped.includes('&lt;script&gt;unsafe&lt;/script&gt; &amp; connection.'));assert.doesNotMatch(escaped,/<unsafe|<script>unsafe/);assert.match(escaped,/Required Â· Unique/);assert.match(escaped,/Related Form/);
assert.throws(()=>buildCatalogHtml(fixture,{}),/description is required/);assert.throws(()=>routes('Form','wrong" onload="x'),/Invalid Creator/);
const output='creator/pages/forms-reports/';if(fs.existsSync(output+'forms-reports.html')){assert.equal(fs.readFileSync(output+'forms-reports.html','utf8'),html+'\n','committed HTML matches generator inputs');assert.equal(fs.readFileSync(output+'forms-reports.dg','utf8'),native,'committed native source matches generator inputs');assert.equal(fs.readFileSync(output+'forms-reports.snippet.dg','utf8'),buildSnippetBody(html),'editor-ready body matches the full native declaration');}
console.log(`Forms & Reports catalog: ${inventory.forms.length} forms, ${inventory.reports.length} reports, all declared fields, exact environment/builder links, Production default, keyboard/hover descriptions, escaping and deterministic native snippet passed.`);
