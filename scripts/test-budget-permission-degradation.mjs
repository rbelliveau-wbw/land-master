import fs from 'node:fs';
import path from 'node:path';

// A Creator profile that cannot read All_External_System_Mappings gets a 403 / code 2898.
// sdkGetAllRecords already rejects with { permissionDenied: true } so callers can degrade
// quietly; auditLog("error", ...) fires an automatic critical-error email, so a
// permission-denied rejection must never be logged at error level.
const source = fs.readFileSync(
  path.join(process.cwd(), 'widgets', 'budget-manager', 'src', 'app', 'widget.html'),
  'utf8'
);

function block(fnName) {
  const start = source.indexOf(`function ${fnName}(`);
  if (start < 0) return '';
  const next = source.indexOf('\nfunction ', start + 1);
  return source.slice(start, next < 0 ? source.length : next);
}

const loadExternal = block('loadExternalMappings');
const heroMappings = block('renderHeroMappings');
const heroMods = block('renderHeroMods');

const expectations = [
  ['loadExternalMappings records the permission-denied flag',
    () => /S\.extMapDenied\s*=\s*!!\(err && err\.permissionDenied\)/.test(loadExternal)],
  ['loadExternalMappings does not log permission denial at error level',
    () => !/auditLog\("error"/.test(loadExternal) && /auditLog\(S\.extMapDenied \? "info" : "error"/.test(loadExternal)],
  ['loadExternalMappings still resolves so callers can re-render',
    () => /return S\.externalMappings;/.test(loadExternal)],
  ['renderHeroMappings hides the section when the report is unreadable',
    () => /if \(S\.extMapDenied\) \{ el\.innerHTML = ""; return; \}/.test(heroMappings)],
  ['renderHeroMods is not gated on the mappings permission flag',
    () => heroMods.length > 0 && !/extMapDenied/.test(heroMods)],
  ['extMapDenied is declared on the state object',
    () => /extMapDenied:\s*false/.test(source)]
];

const failures = expectations.filter(([, check]) => !check());
if (failures.length) {
  for (const [message] of failures) console.error(`Budget permission-degradation regression: ${message}.`);
  process.exit(1);
}

console.log('Budget permission-denied degradation checks passed.');
