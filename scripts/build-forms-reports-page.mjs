import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const componentKey=value=>{if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value))throw Error('Invalid Creator component link name: '+value);return value;};
const display=value=>String(value??'').replace(/_/g,' ');
const typeLabels={text:'Text',textarea:'Long Text',plaintext:'Display Text',richtext:'Rich Text',name:'Name',address:'Address',autonumber:'Automatic Number',number:'Number',decimal:'Decimal',currency:'Currency',USD:'Currency',percent:'Percent',percentage:'Percent',date:'Date',datetime:'Date And Time',time:'Time',boolean:'Yes / No',checkbox:'Checkbox',checkboxes:'Multiple Choices',radiobuttons:'Single Choice',picklist:'Choice',list:'Multiple Choices',grid:'Subform',subform:'Subform',file:'File','upload file':'File',image:'Image',section:'Section',formula:'Formula',email:'Email',url:'Website',phone:'Phone',phonenumber:'Phone',submit:'Submit Button',cancel:'Cancel Button',reset:'Reset Button'};

export function routes(kind,key){
  componentKey(key);if(!['Form','Report'].includes(kind))throw Error('Invalid Creator component type');
  return {production:`https://creatorapp.zoho.com/wbdevelopment/land-master/#${kind}:${key}`,development:`https://creatorapp.zoho.com/wbdevelopment/environment/development/land-master/#${kind}:${key}`,edit:`https://creator.zoho.com/appbuilder/wbdevelopment/land-master/${kind==='Form'?'formbuilder':'reportbuilder'}/${key}/edit`};
}

function actions(kind,key){
  const link=routes(kind,key),name=escapeHtml(key);
  return `<div class="lm-actions"><a class="lm-btn lm-open prod" href="${link.production}" target="_blank" rel="noopener" aria-label="Open In Production">Open</a><a class="lm-btn lm-open dev" href="${link.development}" target="_blank" rel="noopener" aria-label="Open In Development">Open</a><a class="lm-btn lm-edit" href="${link.edit}" target="_blank" rel="noopener" title="Edit In Development" aria-label="Edit In Development">Edit</a></div>`;
}

export function buildCatalogHtml(inventory,descriptions,{motionCss=fs.readFileSync(path.join(root,'shared/interaction-motion.css'),'utf8')}={}){
  if(!Array.isArray(inventory.forms)||!Array.isArray(inventory.reports))throw Error('The inventory must contain complete forms and reports arrays.');
  const forms=inventory.forms.slice().sort((a,b)=>(a.display_name||a.link_name).localeCompare(b.display_name||b.link_name,'en'));
  const reports=inventory.reports.slice().sort((a,b)=>(a.display_name||a.link_name).localeCompare(b.display_name||b.link_name,'en'));
  const byForm=new Map(forms.map(f=>[componentKey(f.link_name),f]));
  for(const form of forms){
    if(!Array.isArray(form.fields))throw Error(`Fields are missing for ${form.link_name}`);
    if(typeof descriptions[form.link_name]!=='string'||!descriptions[form.link_name].trim())throw Error(`A plain-English description is required for ${form.link_name}`);
  }
  const fieldCount=forms.reduce((n,f)=>n+f.fields.length,0),componentCount=forms.reduce((n,f)=>n+f.fields.reduce((sum,field)=>sum+(field.components||[]).length,0),0),formName=key=>byForm.get(key)?.display_name||display(key);
  const formCards=forms.map(form=>{
    const key=componentKey(form.link_name),title=escapeHtml(form.display_name||display(key)),tipId=`lm-tip-${key}`;
    const fields=form.fields.map(field=>{
      const target=field.referenced_form||'',type=target?(field.relationship_kind==='subform'||/subform|grid/i.test(field.type)?'Subform':'Lookup'):typeLabels[field.type]||display(field.type||'Field').replace(/\b\w/g,c=>c.toUpperCase());
      const flags=[field.required?'Required':'',field.unique?'Unique':'',field.configuration?.visibility==='false'?'Hidden':''].filter(Boolean);
      const children=(field.components||[]).map(child=>{const childKey=field.link_name+'.'+child.link_name,hidden=child.configuration?.visibility==='false';return `<tr class="lm-component" data-field-component="${escapeHtml(childKey)}"><th >${escapeHtml(child.display_name||display(child.link_name))}<small class="lm-field-flags">Part Of ${escapeHtml(field.display_name||display(field.link_name))}${hidden?' · Hidden':''}</small></th><td>${escapeHtml(childKey)}</td><td>${field.type==='name'?'Name Part':field.type==='address'?'Address Part':escapeHtml(display(child.type))}</td><td>—</td></tr>`;}).join('');
      return `<tr data-f=""><th >${escapeHtml(field.display_name||display(field.link_name))}${flags.length?`<small class="lm-field-flags">${flags.join(' · ')}</small>`:''}</th><td>${escapeHtml(field.link_name)}</td><td>${escapeHtml(type)}</td><td>${target?escapeHtml(formName(target)):'—'}</td></tr>`+children;
    }).join('');
    const compactFields=fields.replace(/<\/(?:th|td|tr)>/g,'');
    const systemFields=(form.report_system_fields||[]).length?'<tr class="lm-field-group"><th colspan="4">System Fields In Exported Reports</th></tr>'+form.report_system_fields.map(field=>`<tr data-system-field="${escapeHtml(field.link_name)}" title="Included In: ${escapeHtml(field.source_reports.join(', '))}"><th >${escapeHtml(field.display_name)}</th><td>${escapeHtml(field.link_name)}</td><td>System Field</td><td>—</td></tr>`).join(''):'';
    const linked=[...new Set(form.related_forms||[])].filter(Boolean);
    return `<li class="lm-card" data-form="${key}"><div class="lm-card-head"><div class="lm-row-main"><span class="lm-name-help" tabindex="0" aria-describedby="${tipId}"><span class="lm-name">${title}</span><svg class="lm-info" viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="10" cy="10" r="7.5"/><path d="M10 9v5m0-8v1"/></svg><span class="lm-tip" role="tooltip" id="${tipId}">${escapeHtml(descriptions[key])}</span></span><span class="lm-link">${key}</span></div>${actions('Form',key)}</div><details class="lm-fields lm-motion-disclosure" data-fields-for="${key}"><summary><svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true" data-lm-disclosure-icon><path d="m6 3 5 5-5 5"/></svg><span>View Fields</span><span class="lm-count">${form.fields.length}</span></summary><div class="lm-fields-body">${linked.length?`<p class="lm-connections"><b>Connected Forms</b> ${linked.map(f=>escapeHtml(formName(f))).join(' · ')}</p>`:''}<div class="lm-field-scroll"><table><thead><tr><th>Field</th><th>Link Name</th><th>Type</th><th>Connects To</th></tr></thead><tbody>${compactFields}${systemFields}</tbody></table></div></div></details></li>`;
  }).join('\n');
  const reportCards=reports.map(report=>{
    const key=componentKey(report.link_name),source=report.source_form;
    return `<li class="lm-card lm-report" data-report="${key}"><div class="lm-card-head"><div class="lm-row-main"><span class="lm-name">${escapeHtml(report.display_name||display(key))}</span><span class="lm-link">${key}</span><span class="lm-report-source">${source?`Source: ${escapeHtml(formName(source))}`:'Source form unavailable'}</span></div>${actions('Report',key)}</div></li>`;
  }).join('\n');
  return `<div id="lm-nav" data-catalog-version="2">
<style>
${motionCss}
#lm-nav{--text:#173354;--muted:#6c8098;--line:#dbe5f0;--blue:#2356ac;--ease:cubic-bezier(.22,.7,.25,1);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:var(--text);background:#f5f8fc;padding:22px;line-height:1.4;max-width:1440px;margin:0 auto;box-sizing:border-box}
#lm-nav *,#lm-nav *::before,#lm-nav *::after{box-sizing:border-box}
#lm-nav .lm-envradio{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
#lm-nav .lm-toolbar{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:14px}
#lm-nav .lm-title{margin:0;font-size:22px;letter-spacing:-.025em;color:#112d50}
#lm-nav .lm-sub{margin:4px 0 0;font-size:12px;color:var(--muted)}
#lm-nav .lm-env-switch{position:relative;isolation:isolate;display:flex;flex:none;border:1px solid #cddbea;background:#e9f0f8;padding:3px;border-radius:9px}
#lm-nav .lm-env-switch label{position:relative;z-index:1;width:116px;padding:7px 10px;text-align:center;font-size:12px;font-weight:650;cursor:pointer;transition:color 190ms var(--ease)}
#lm-nav .lm-env-rail{position:absolute;left:3px;top:3px;bottom:3px;width:116px;background:var(--blue);border-radius:6px}
#lm-nav #lm-dev:checked~.lm-toolbar .lm-env-rail{transform:translateX(100%)}
#lm-nav #lm-prod:checked~.lm-toolbar label[for=lm-prod],#lm-nav #lm-dev:checked~.lm-toolbar label[for=lm-dev]{color:white}
#lm-nav #lm-prod:focus-visible~.lm-toolbar label[for=lm-prod],#lm-nav #lm-dev:focus-visible~.lm-toolbar label[for=lm-dev]{outline:2px solid #7195d1;outline-offset:2px;border-radius:6px}
#lm-nav .lm-note{margin:0 0 20px;padding-bottom:14px;border-bottom:1px solid var(--line);font-size:12px;color:var(--muted)}
#lm-nav .lm-section+.lm-section{margin-top:26px}
#lm-nav .lm-sec-head{display:flex;align-items:center;gap:8px;margin:0 0 10px}
#lm-nav .lm-sec-head h3{margin:0;font-size:15px}
#lm-nav .lm-count{display:inline-flex;align-items:center;justify-content:center;min-width:22px;padding:1px 7px;border-radius:5px;background:#eaf0f8;color:#587394;font-size:11px;font-weight:650}
#lm-nav .lm-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;align-items:start}
#lm-nav .lm-card{position:relative;min-width:0;background:white;border:1px solid var(--line);border-radius:10px;box-shadow:0 1px 2px #18395906}
#lm-nav .lm-card:focus-within,#lm-nav .lm-card:hover{z-index:2}
#lm-nav .lm-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px}
#lm-nav .lm-row-main{min-width:0;display:flex;flex-direction:column;gap:2px}
#lm-nav .lm-name{min-width:0;font-size:13px;font-weight:700;overflow-wrap:anywhere}
#lm-nav .lm-link{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:10px;color:var(--muted);overflow-wrap:anywhere}
#lm-nav .lm-actions{display:flex;gap:6px;flex:none}
#lm-nav .lm-btn{display:inline-flex;align-items:center;justify-content:center;padding:6px 11px;text-decoration:none;border:1px solid transparent;border-radius:6px;font-size:11px;font-weight:650;white-space:nowrap;transition:background-color 160ms,color 160ms,border-color 160ms}
#lm-nav .lm-open{color:white;background:var(--blue)}
#lm-nav .lm-open:hover{background:#153f8a}
#lm-nav .lm-edit{color:#57708f;border-color:#d3dfec;background:#f8fbff}
#lm-nav .lm-edit:hover{background:#eaf1fb;color:#214e89}
#lm-nav a:focus-visible,#lm-nav summary:focus-visible,#lm-nav .lm-name-help:focus-visible{outline:2px solid #7195d1;outline-offset:3px;border-radius:4px}
#lm-nav .lm-open.dev{display:none}
#lm-nav #lm-dev:checked~.lm-section .lm-open.prod{display:none}
#lm-nav #lm-dev:checked~.lm-section .lm-open.dev{display:inline-flex}
#lm-nav .lm-name-help{position:relative;display:inline-flex;align-items:center;gap:5px;max-width:100%;width:fit-content;cursor:help}
#lm-nav .lm-info{flex:none;color:#8ca2bc}
#lm-nav .lm-tip{position:absolute;top:calc(100% + 9px);left:-2px;z-index:10;width:340px;max-width:70vw;padding:12px 14px;border:1px solid #bccfe8;border-radius:8px;background:#112f54;color:#f5f9ff;box-shadow:0 9px 25px #0d2b502b;font-size:12px;font-weight:400;line-height:1.55;pointer-events:none;opacity:0;visibility:hidden;transition:opacity 150ms ease,visibility 150ms ease}
#lm-nav .lm-name-help:hover .lm-tip,#lm-nav .lm-name-help:focus .lm-tip{opacity:1;visibility:visible}
#lm-nav .lm-fields{border-top:1px solid #edf2f8}
#lm-nav .lm-fields summary{display:flex;align-items:center;gap:6px;padding:8px 14px;list-style:none;font-size:11px;font-weight:650;color:#416994;cursor:pointer}
#lm-nav .lm-fields summary::-webkit-details-marker{display:none}
#lm-nav .lm-fields summary .lm-count{margin-left:auto;font-size:10px}
#lm-nav .lm-fields-body{padding:0 12px 12px}
#lm-nav .lm-connections{margin:3px 0 9px;font-size:10px;color:var(--muted);overflow-wrap:anywhere}
#lm-nav .lm-connections b{display:block;margin-bottom:2px;color:#4b6584;font-weight:650}
#lm-nav .lm-field-scroll{max-height:370px;overflow:auto;border:1px solid #e0e8f2;border-radius:7px;scrollbar-width:thin}
#lm-nav table{border-collapse:collapse;width:100%;font-size:10px;table-layout:auto}
#lm-nav thead{position:sticky;top:0;z-index:1;background:#eaf1f9}
#lm-nav th,#lm-nav td{text-align:left;padding:7px 8px;vertical-align:top;border-bottom:1px solid #edf2f7;overflow-wrap:anywhere}
#lm-nav tbody th{font-weight:600;min-width:110px}
#lm-nav tbody tr:nth-child(even){background:#f7faff}
#lm-nav tbody td:nth-child(2){font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:#6d8199;font-size:9px}
#lm-nav .lm-field-flags{display:block;margin-top:2px;font-size:9px;color:#7c91aa;font-weight:400}
#lm-nav .lm-component th{padding-left:20px;font-weight:400}
#lm-nav .lm-field-group th{background:#eaf1f9;color:#567594;font-size:10px}
#lm-nav .lm-report-source{margin-top:3px;font-size:10px;color:#6681a0}
@media(prefers-reduced-motion:reduce){#lm-nav .lm-env-switch label,#lm-nav .lm-tip,#lm-nav .lm-btn{transition:none}}
</style>
<input type="radio" name="lmenv" id="lm-prod" class="lm-envradio" checked aria-label="Production"><input type="radio" name="lmenv" id="lm-dev" class="lm-envradio" aria-label="Development">
<div class="lm-toolbar"><div><h2 class="lm-title">Forms &amp; Reports</h2><p class="lm-sub">${forms.length} Forms · ${reports.length} Reports · ${fieldCount.toLocaleString('en-US')} Fields${componentCount?' · '+componentCount+' Field Parts':''}</p></div><div class="lm-env-switch" role="group" aria-label="Open Environment"><span class="lm-env-rail lm-motion-rail" aria-hidden="true"></span><label for="lm-prod">Production</label><label for="lm-dev">Development</label></div></div>
<p class="lm-note">Open uses the selected environment. Edit opens Development. Hover over a form name for its purpose.</p>
<section class="lm-section" aria-labelledby="lm-forms-title"><div class="lm-sec-head"><h3 id="lm-forms-title">Forms</h3><span class="lm-count">${forms.length}</span></div><ul class="lm-grid">${formCards}</ul></section>
<section class="lm-section" aria-labelledby="lm-reports-title"><div class="lm-sec-head"><h3 id="lm-reports-title">Reports</h3><span class="lm-count">${reports.length}</span></div><ul class="lm-grid">${reportCards}</ul></section>
</div>`;
}

export function buildSnippetBody(html){return `<%{\n\t%>\n${html}\n<%\n\n}%>\n`;}
export function buildNativeSnippet(html){return `htmlpage html_snippet3()\ncontent\n${buildSnippetBody(html)}`;}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const options={inventory:'creator/catalog/forms-reports.inventory.json',descriptions:'creator/catalog/form-descriptions.json',output:'creator/pages/forms-reports'};
  for(let n=2;n<process.argv.length;n+=2){const key=process.argv[n].replace(/^--/,'');if(!Object.hasOwn(options,key)||!process.argv[n+1])throw Error('Usage: node scripts/build-forms-reports-page.mjs [--inventory path] [--descriptions path] [--output directory]');options[key]=process.argv[n+1];}
  const inventory=JSON.parse(fs.readFileSync(path.resolve(root,options.inventory),'utf8')),descriptions=JSON.parse(fs.readFileSync(path.resolve(root,options.descriptions),'utf8'));
  const html=buildCatalogHtml(inventory,descriptions),directory=path.resolve(root,options.output);fs.mkdirSync(directory,{recursive:true});
  fs.writeFileSync(path.join(directory,'forms-reports.html'),html+'\n');fs.writeFileSync(path.join(directory,'forms-reports.dg'),buildNativeSnippet(html));fs.writeFileSync(path.join(directory,'forms-reports.snippet.dg'),buildSnippetBody(html));
  console.log(`Forms & Reports: ${inventory.forms.length} forms, ${inventory.reports.length} reports, ${inventory.forms.reduce((n,f)=>n+f.fields.length,0)} fields; ${Buffer.byteLength(html).toLocaleString('en-US')} bytes. Production is the default.`);
}
