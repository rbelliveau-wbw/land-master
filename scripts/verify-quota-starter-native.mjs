// Focused native verifier for the starter package. Never writes native-before.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {normalizeNative, extractComponent} from './verify-workflow-quota-native.mjs';

export const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const task = 'creator/quota-starter-consolidation-2026-11-06';
const before = `${task}/native-before/production/production-v9_154-fresh`;
const functionRoles = ['frame', 'start', 'dispatch', 'capturedEnqueue', 'legacyEnqueue', 'claim', 'recover'];
const esc = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const relative = value => path.relative(repositoryRoot, value).replaceAll('\\', '/');
export function workspacePath(value) {
  const resolved = path.resolve(repositoryRoot, value), rel = path.relative(repositoryRoot, resolved);
  if (rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) throw Error('Configured path must remain within the repository.');
  return resolved;
}

export function defaultStarterConfig() {
  return {
    taskDirectory: task,
    functions: [
      ['frame', 'workflowStarterFrame'], ['start', 'workflowStarterStart'], ['dispatch', 'workflowStarterDispatch'],
      ['capturedEnqueue', 'workflowExportEnqueueCaptured'], ['legacyEnqueue', 'workflowExportEnqueue'],
      ['claim', 'workflowExportClaim'], ['recover', 'workflowExportRecover']
    ].map(([role, name]) => ({role, name, file: `creator/functions/${name}.dg`})),
    unchangedFunctions: ['workflowExportPlan', 'workflowRunLog'].map(name => ({name, baseline: `${before}/${name}.dg`})),
    unchangedSettingsFields: ['Next_Workflow_Run', 'Current_Batch'].map(name => ({name, baseline: `${before}/Settings.${name}.field.ds`})),
    probesDirectory: `${task}/probes`,
    forbiddenProbeNames: ['workflowStarterProbe', 'workflowQuotaChunkProbe'],
    lockField: {form: 'Workflow_Export_Lock', name: 'Cycle_State', definition: `${task}/schema/Cycle_State.field.ds`, baselineForm: `${before}/Workflow_Export_Lock.form.ds`},
    workflows: [
      {name: 'Next_Workflow_Run_Next_Ba', active: true, baseline: `${before}/Next_Workflow_Run_Next_Ba.ds`, action: `${task}/workflows/Next_Workflow_Run_Next_Ba.action-1.dg`, preserveBaselineAction: true},
      {name: 'Update_Budgets_w_Projects1', active: true, baseline: `${before}/Update_Budgets_w_Projects1.ds`, action: `${task}/workflows/Update_Budgets_w_Projects1.action-1.dg`},
      ...['Sync_Final_Acceptance_Due', 'Budgets_Check_HCSS_Budget1', 'Budgets_HCSS_Actuals_Batc', 'Budgets_GP_Construction_A', 'Budgets_GP_Development_Ac'].map(name => ({name, active: false, baseline: `${before}/${name}.ds`})),
      ...['Set_Close_Date_Lots1', 'Update_Sold_Contracted_Fo1', 'Update_Actual_Lots_Foreca1', 'Check_for_Stuck_Budget_Ap', 'Recalc_Budget_Modificatio'].map(name => ({name, active: true, baseline: `${before}/${name}.ds`}))
    ]
  };
}

export function loadStarterConfig(configPath) {
  const supplied = configPath ? JSON.parse(fs.readFileSync(workspacePath(configPath), 'utf8')) : {};
  const config = {...defaultStarterConfig(), ...supplied};
  if (!Array.isArray(config.functions) || config.functions.length !== 7) throw Error('Declare exactly the seven approved function roles.');
  if (new Set(config.functions.map(item => item.role)).size !== 7 || functionRoles.some(role => !config.functions.some(item => item.role === role))) throw Error('Starter function roles are missing or duplicated.');
  if (new Set(config.functions.map(item => item.name)).size !== 7) throw Error('Starter function names must be unique.');
  const functionRoot = workspacePath('creator/functions');
  for (const item of config.functions) {
    if (!/^\w+$/.test(item.name)) throw Error('Invalid configured Deluge function name.');
    const file = workspacePath(item.file), rel = path.relative(functionRoot, file);
    if (rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel) || path.extname(file) !== '.dg') throw Error('Source function files must be Deluge files under creator/functions.');
  }
  workspacePath(config.taskDirectory);
  const probes = workspacePath(config.probesDirectory), probesRoot = workspacePath(`${config.taskDirectory}/probes`);
  if (probes !== probesRoot && !probes.startsWith(probesRoot + path.sep)) throw Error('Probe sources must stay inside this task\'s probes directory.');
  return config;
}

export function declaredFunctionName(source) {
  return source.match(/^\s*\w+\s+(\w+)\s*\([^)]*\)\s*\{/m)?.[1] ?? null;
}

export function readStarterProbes(config) {
  const directory = workspacePath(config.probesDirectory);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).filter(name => name.endsWith('.dg')).sort().map(name => {
    const file = path.join(directory, name), source = fs.readFileSync(file, 'utf8'), declared = declaredFunctionName(source);
    if (!declared) throw Error(`Probe has no function declaration: ${relative(file)}`);
    return {name: declared, file, source};
  });
}

function functionExpression(name) { return new RegExp(`^\\s*\\w+\\s+${esc(name)}\\s*\\(.*\\)\\s*$`); }
function workflowExpression(name) { return new RegExp(`^\\s*${esc(name)}\\s+as\\s+"[^\"]+"\\s*$`); }
function findClosing(text, start, opening, closing) {
  let depth = 0, quote = null, block = false, line = false;
  for (let index = start; index < text.length; index++) {
    const value = text[index], pair = text.slice(index, index + 2);
    if (line) { if (value === '\n') line = false; continue; }
    if (block) { if (pair === '*/') { block = false; index++; } continue; }
    if (quote) { if (value === '\\') index++; else if (value === quote) quote = null; continue; }
    if (pair === '//') { line = true; index++; continue; }
    if (pair === '/*') { block = true; index++; continue; }
    if (value === '"' || value === "'") { quote = value; continue; }
    if (value === opening) depth++;
    else if (value === closing && --depth === 0) return index + 1;
  }
  throw Error('Unclosed native field/action delimiters.');
}
function actionRange(workflow) {
  const matches = Array.from(workflow.matchAll(/\bon load\s*\(/g));
  if (matches.length !== 1) throw Error(`Expected one schedule action, found ${matches.length}.`);
  const opening = workflow.indexOf('(', matches[0].index), end = findClosing(workflow, opening, '(', ')');
  return {start: opening + 1, end: end - 1, body: workflow.slice(opening + 1, end - 1)};
}
function workflowShell(workflow) {
  const range = actionRange(workflow);
  return normalizeNative((workflow.slice(0, range.start) + 'REVIEWED_ACTION' + workflow.slice(range.end)).replace(/^[ \t]*status\s*=\s*[^\r\n]+\r?\n/gm, ''));
}
function anchorBusinessPreserved(original, actual) {
  // The reviewed frame block freezes cycleDate before its independent API wait.
  // Permit only that captured-date substitution in the original atomic update.
  const oldDate = 'Next_Workflow_Run=settings.Next_Workflow_Run.addHour(3)';
  const frozenDate = 'Next_Workflow_Run=cycleDate.addHour(3)';
  if (actual.includes(frozenDate)) {
    if (original.split(oldDate).length !== 2) return false;
    original = original.replace(oldDate, frozenDate);
  }
  if (original === actual) return true;
  const addedLength = actual.length - original.length;
  if (addedLength <= 0) return false;
  let firstDifference = 0;
  for (; firstDifference < original.length && original[firstDifference] === actual[firstDifference]; firstDifference++);
  return original.slice(0, firstDifference).endsWith('currentBatch=settings.Current_Batch;')
    && original.slice(firstDifference).startsWith('nextBatch=0;')
    && actual.slice(firstDifference + addedLength) === original.slice(firstDifference);
}
function anchorFailureIsolation(action) {
  const normalized = normalizeNative(action);
  const call = normalized.indexOf('thisapp.workflowStarterFrame(');
  const capture = normalized.indexOf('cycleDate=settings.Next_Workflow_Run;');
  const tryAt = normalized.indexOf('try{');
  if (call < 0 || capture < 0 || capture >= call || tryAt < 0) return false;
  const tryEnd = findClosing(normalized, tryAt + 3, '{', '}');
  if (call <= tryAt || call >= tryEnd || !normalized.slice(tryEnd).startsWith('catch(')) return false;
  const catchOpen = normalized.indexOf('{', tryEnd);
  if (catchOpen < 0) return false;
  const catchEnd = findClosing(normalized, catchOpen, '{', '}');
  const update = normalized.indexOf('updatesettings[');
  return update > catchEnd
    && normalized.includes('Next_Workflow_Run=cycleDate.addHour(3)')
    && normalized.split('updatesettings[').length === 2;
}
function fieldRange(form, name) {
  const matches = Array.from(form.matchAll(new RegExp(`^[ \\t]*${esc(name)}[ \\t]*\\r?$`, 'gm')));
  if (matches.length !== 1) throw Error(`Expected one ${name} field, found ${matches.length}.`);
  const start = matches[0].index, opening = form.indexOf('(', start + matches[0][0].length), end = findClosing(form, opening, '(', ')');
  return {start, end, body: form.slice(start, end)};
}
function attributes(field) {
  return Object.fromEntries(Array.from(field.matchAll(/^[ \t]*([a-zA-Z_]\w*)\s*=\s*([^\r\n]+)/gm), match => [match[1], normalizeNative(match[2])]));
}

export function verifyStarterNative({source, environment, configPath, destination}) {
  if (!source || !['development', 'stage', 'production'].includes(environment)) throw Error('Native source and development/stage/production environment required.');
  const config = loadStarterConfig(configPath), sourceBytes = fs.readFileSync(path.resolve(source));
  const lines = sourceBytes.toString('utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
  const output = workspacePath(destination ?? `${config.taskDirectory}/native-after/${environment}`);
  const allowedOutput = workspacePath(`${config.taskDirectory}/native-after`);
  if (output !== allowedOutput && !output.startsWith(allowedOutput + path.sep)) throw Error('Native verification output must remain under this task\'s native-after directory.');
  fs.mkdirSync(output, {recursive: true});
  const checks = [];
  function check(name, kind, operation) {
    try { checks.push({name, kind, ...operation()}); }
    catch (error) { checks.push({name, kind, match: false, error: error.message}); }
  }
  function capture(name, expression, suffix) {
    const extracted = extractComponent(lines, name, expression), file = path.join(output, name + suffix);
    fs.writeFileSync(file, extracted.body, 'utf8');
    return {...extracted, file: relative(file), sha256: sha(extracted.body)};
  }
  for (const item of config.functions) check(item.name, 'selected_function', () => {
    const actual = capture(item.name, functionExpression(item.name), '.dg'), expected = fs.readFileSync(workspacePath(item.file), 'utf8');
    if (declaredFunctionName(expected) !== item.name) throw Error('Candidate file declares a different function.');
    return {...actual, role: item.role, expected_file: item.file, expected_sha256: sha(expected), match: normalizeNative(actual.body) === normalizeNative(expected)};
  });
  for (const item of config.unchangedFunctions ?? []) check(item.name, 'unchanged_function', () => {
    const actual = capture(item.name, functionExpression(item.name), '.dg'), expected = fs.readFileSync(workspacePath(item.baseline), 'utf8');
    return {...actual, baseline_file: item.baseline, match: normalizeNative(actual.body) === normalizeNative(expected)};
  });
  for (const item of config.unchangedSettingsFields ?? []) check(`Settings.${item.name}`, 'unchanged_settings_field', () => {
    // Read only the two required schema fields into output, never the full Settings schema.
    const settings = extractComponent(lines, 'Settings', /^\t\tform Settings\s*$/);
    const actual = fieldRange(settings.body, item.name).body, expected = fs.readFileSync(workspacePath(item.baseline), 'utf8');
    const file = path.join(output, `Settings.${item.name}.field.ds`);
    fs.writeFileSync(file, actual + '\n');
    return {file: relative(file), baseline_file: item.baseline, match: normalizeNative(actual) === normalizeNative(expected)};
  });
  const field = config.lockField;
  check(`${field.form}.${field.name}`, 'new_lock_field_and_scope', () => {
    const form = capture(field.form, new RegExp(`^\\t\\tform ${esc(field.form)}\\s*$`), '.form.ds');
    const actualField = fieldRange(form.body, field.name), definition = fs.readFileSync(workspacePath(field.definition), 'utf8');
    const expectedAttributes = attributes(definition), actualAttributes = attributes(actualField.body);
    if (!expectedAttributes.type) throw Error('Expected field definition does not declare its type.');
    const relevant = ['type', 'maxchar', 'displayname'].filter(key => key in expectedAttributes);
    const attributeMatch = relevant.every(key => actualAttributes[key] === expectedAttributes[key]);
    const unchangedForm = normalizeNative(form.body.slice(0, actualField.start) + form.body.slice(actualField.end)) === normalizeNative(fs.readFileSync(workspacePath(field.baselineForm), 'utf8'));
    fs.writeFileSync(path.join(output, `${field.form}.${field.name}.field.ds`), actualField.body + '\n');
    return {file: form.file, expected_definition: field.definition, expected_attributes: expectedAttributes, actual_attributes: actualAttributes, attributes_match: attributeMatch, other_lock_schema_unchanged: unchangedForm, match: attributeMatch && unchangedForm};
  });
  for (const item of config.workflows) check(item.name, 'schedule', () => {
    const actual = capture(item.name, workflowExpression(item.name), '.ds'), baseline = fs.readFileSync(workspacePath(item.baseline), 'utf8');
    const active = !/^[ \t]*status\s*=\s*inactive\s*$/m.test(actual.body), range = actionRange(actual.body);
    const stateMatch = active === item.active;
    const shellMatch = workflowShell(actual.body) === workflowShell(baseline);
    let actionMatch = normalizeNative(range.body) === normalizeNative(actionRange(baseline).body);
    if (item.action) actionMatch = normalizeNative(range.body) === normalizeNative(fs.readFileSync(workspacePath(item.action), 'utf8'));
    const originalBody = normalizeNative(actionRange(baseline).body);
    const originalPreserved = !item.preserveBaselineAction || anchorBusinessPreserved(originalBody, normalizeNative(range.body));
    const frameFailureIsolated = !item.preserveBaselineAction || anchorFailureIsolation(range.body);
    return {...actual, active, expected_active: item.active, state_match: stateMatch, timing_and_shell_unchanged: shellMatch, action_match: actionMatch, anchor_business_body_preserved: originalPreserved, anchor_frame_failure_isolated_from_clock_update: frameFailureIsolated, match: stateMatch && shellMatch && actionMatch && originalPreserved && frameFailureIsolated};
  });
  check('Settings starter group active count', 'schedule_group', () => {
    const scheduleChecks = checks.filter(item => item.kind === 'schedule');
    const active = scheduleChecks.filter(item => item.active === true).length;
    return {expected_definitions: 12, actual_definitions: scheduleChecks.length, expected_active: 7, actual_active: active, match: scheduleChecks.length === 12 && active === 7 && scheduleChecks.every(item => item.match)};
  });
  const probes = new Set([...(config.forbiddenProbeNames ?? []), ...readStarterProbes(config).map(item => item.name)]);
  if (environment !== 'development') for (const name of probes) check(name, 'probe_absent', () => {
    const occurrences = lines.filter(line => functionExpression(name).test(line)).length;
    return {occurrences, match: occurrences === 0};
  });
  const matched = checks.filter(item => item.match).length;
  const manifest = {environment, verified_at_utc: new Date().toISOString(), source_file: path.basename(source), source_sha256: sha(sourceBytes), config_file: configPath ?? null, normalization: 'Proven native normalization ignores comments/formatting outside quoted values; quoted content is preserved.', status: matched === checks.length ? 'passed' : 'mismatch', selected_function_count: 7, selected_function_matches: checks.filter(item => item.kind === 'selected_function' && item.match).length, matched, total: checks.length, checks};
  fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return {ok: matched === checks.length, environment, selected: manifest.selected_function_matches, selectedExpected: 7, matched, total: checks.length, destination: relative(output), mismatches: checks.filter(item => !item.match).map(({name, kind, error}) => ({name, kind, ...(error ? {error} : {})}))};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2), [source, environment] = args;
    let configPath, destination;
    for (let index = 2; index < args.length; index++) {
      if (args[index] === '--config') { configPath = args[++index]; if (!configPath) throw Error('--config requires a file.'); }
      else if (args[index] === '--out') { destination = args[++index]; if (!destination) throw Error('--out requires a directory.'); }
      else throw Error('Usage: node scripts/verify-quota-starter-native.mjs <export.ds> <environment> [--config file.json] [--out repository/path]');
    }
    const result = verifyStarterNative({source, environment, configPath, destination});
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
