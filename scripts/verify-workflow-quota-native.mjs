// Compare a fresh native Creator DS export with the reviewed quota candidates.
// This writes native-after only. The independently captured native-before stays immutable.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const task = path.join(root, 'creator/quota-reduction-2026-11-05');
const functionNames = ['analyticsExportRows','workflowRunLog','workflowExportClaim','workflowExportDispatch','workflowExportEnqueue','workflowExportPlan','workflowExportRun','workflowExportTick','workflowExportWake','workflowPreparedExportRows','budgetActualImportRun','budgetPlanImportRun','workflowExportClaimRows','workflowExportRecover'];
const workflowNames = ['Workflow_Export_Wake','Workflow_Export_Continue','Workflow_Log_Timeout','Finalize_Workflow_Run_Log'];
const formNames = ['Workflow_Export_Lock','Workflow_Run_Log'];
const sha = value => crypto.createHash('sha256').update(value).digest('hex');

// Ignore formatter whitespace and comments, retaining every character inside
// quoted values. In particular, a changed space in a message/identity is visible.
export function normalizeNative(text) {
  let result = '', quote = null, block = false, line = false;
  for (let i=0; i<text.length; i++) {
    const char = text[i], pair = text.slice(i,i+2);
    if (line) {if (char==='\n') line=false; continue;}
    if (block) {if (pair==='*/') {block=false;i++;} continue;}
    if (quote) {
      result += char;
      if (char==='\\' && i+1<text.length) result += text[++i];
      else if (char===quote) quote=null;
      continue;
    }
    if (pair==='//') {line=true;i++;continue;}
    if (pair==='/*') {block=true;i++;continue;}
    if (char==='"' || char==="'") {quote=char;result+=char;continue;}
    if (!/\s/.test(char)) result += char;
  }
  if (quote || block) throw Error('Unclosed quoted value or block comment');
  return result;
}

// Same declaration matching and string/comment-aware brace walk as the proven
// capture-workflow-quota-baseline.mjs extractor, with duplicate/missing rejection.
export function extractComponent(lines, name, expression) {
  const matches = lines.flatMap((line,i) => expression.test(line) ? [i] : []);
  if (matches.length!==1) throw Error(`Expected one ${name}, found ${matches.length}`);
  const start = matches[0];
  let opening = start+1;
  while (opening<lines.length && !lines[opening].includes('{')) opening++;
  let depth=0, block=false, quote=null, end=opening;
  for (; end<lines.length; end++) {
    const line=lines[end];
    for (let i=0; i<line.length; i++) {
      if (block) {if (line.slice(i,i+2)==='*/') {block=false;i++;} continue;}
      if (quote) {if (line[i]==='\\') i++; else if (line[i]===quote) quote=null; continue;}
      if (line.slice(i,i+2)==='//') break;
      if (line.slice(i,i+2)==='/*') {block=true;i++;continue;}
      if (line[i]==='"' || line[i]==="'") {quote=line[i];continue;}
      if (line[i]==='{') depth++;
      if (line[i]==='}') depth--;
      if (depth<0) throw Error(`Unbalanced component ${name}`);
    }
    if (depth===0 && end>opening) break;
  }
  if (end>=lines.length || depth!==0 || quote || block) throw Error(`Unclosed component ${name}`);
  return {body:lines.slice(start,end+1).join('\n').trim()+'\n',line_start:start+1,line_end:end+1};
}

export function verifyNative({source, environment, destination}) {
  if (!source || !['development','stage','production'].includes(environment)) throw Error('Usage: node scripts/verify-workflow-quota-native.mjs <source.ds> <development|stage|production>');
  // Stage has no separate prechange capture. Production and Development's
  // eighteen original components were independently confirmed identical.
  const baselineReferenceEnvironment=environment==='stage'?'production':environment;
  const before = path.join(task,'native-before',baselineReferenceEnvironment);
  const output = path.resolve(destination ?? path.join(task,'native-after',environment));
  const beforeRoot=path.resolve(task,'native-before');
  if (output===beforeRoot || output.startsWith(beforeRoot+path.sep)) throw Error('Refusing to write into immutable native-before');
  const bytes=fs.readFileSync(path.resolve(source));
  const raw=bytes.toString('utf8').replace(/^\uFEFF/,'');
  const lines=raw.split(/\r?\n/);
  const patterns=functionNames.map(name=>({name,kind:'function',suffix:'.dg',expression:new RegExp(`^\\s*(?:string|map|list|bool|boolean)\\s+${name}\\s*\\(.*\\)\\s*$`),expected:path.join(root,'creator/functions',name+'.dg')}));
  for (const name of workflowNames) patterns.push({name,kind:'workflow',suffix:'.ds',expression:new RegExp(`^\\s*${name}\\s+as\\s+"[^\"]+"\\s*$`),expected:name==='Workflow_Log_Timeout'?path.join(task,'workflows',name+'.ds'):path.join(before,name+'.ds')});
  for (const name of formNames) patterns.push({name,kind:'form',suffix:'.form.ds',expression:new RegExp(`^\\t\\tform\\s+${name}\\s*$`),expected:path.join(before,name+'.form.ds')});
  fs.mkdirSync(output,{recursive:true});
  const components=[], mismatches=[];
  for (const {name,kind,suffix,expression,expected} of patterns) {
    const entry={name,kind,expected_file:path.relative(root,expected).replaceAll('\\','/')};
    try {
      const extracted=extractComponent(lines,name,expression);
      const file=path.join(output,name+suffix);
      fs.writeFileSync(file,extracted.body,'utf8');
      const expectedText=fs.readFileSync(expected,'utf8').replace(/^\uFEFF/,'');
      const actualNormalized=normalizeNative(extracted.body), expectedNormalized=normalizeNative(expectedText);
      Object.assign(entry,{file:path.relative(root,file).replaceAll('\\','/'),line_start:extracted.line_start,line_end:extracted.line_end,sha256:sha(extracted.body),normalized_sha256:sha(actualNormalized),expected_sha256:sha(expectedText),expected_normalized_sha256:sha(expectedNormalized),match:actualNormalized===expectedNormalized});
      if (!entry.match) {
        let firstDifference=0;
        while (firstDifference<Math.min(actualNormalized.length,expectedNormalized.length) && actualNormalized[firstDifference]===expectedNormalized[firstDifference]) firstDifference++;
        entry.first_normalized_difference=firstDifference;
        entry.actual_normalized_length=actualNormalized.length;
        entry.expected_normalized_length=expectedNormalized.length;
        mismatches.push({name,kind,error:'Native content differs from expected source',first_normalized_difference:firstDifference});
      }
    } catch (error) {
      entry.match=false;entry.error=error.message;
      mismatches.push({name,kind,error:error.message});
    }
    components.push(entry);
  }
  const manifest={environment,baseline_reference_environment:baselineReferenceEnvironment,status:mismatches.length?'mismatch':'passed',verified_at:new Date().toISOString(),source_file:path.basename(source),source_header:lines.slice(0,5),source_sha256:sha(bytes),normalization:'Remove comments and whitespace outside quoted values; preserve quoted whitespace and escapes.',expected_counts:{functions:14,workflows:4,forms:2},components,mismatches};
  fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n','utf8');
  return {ok:mismatches.length===0,environment,baseline_reference_environment:baselineReferenceEnvironment,components:components.length,matched:components.filter(entry=>entry.match).length,destination:output,mismatches};
}

if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const [source,environment]=process.argv.slice(2);
    const report=verifyNative({source,environment});
    console.log(JSON.stringify(report,null,2));
    if (!report.ok) process.exitCode=1;
  } catch (error) {
    console.error(error.message);
    process.exitCode=1;
  }
}
