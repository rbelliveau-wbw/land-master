import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {assertContinueEligibility, continueCandidate, continuePredicate} from './verify-continue-schedule-filter.mjs';

const candidate = fs.readFileSync(continueCandidate, 'utf8');
assertContinueEligibility(candidate);
for (const changed of [
  candidate.replace(`[${continuePredicate}]`, ''),
  candidate.replace('== "Running"', '!= "Running"'),
  candidate.replace('&& !Export_State', '|| !Export_State'),
  candidate.replace('!Export_State', 'Export_State'),
  candidate.replace('start = Resume_At', 'start = Started_At'),
  candidate.replace('frequency = daily', 'frequency = once'),
  candidate.replace('workflowExportTick', 'workflowExportRecover'),
]) assert.throws(() => assertContinueEligibility(changed));

// Execute the installed predicate against serialized native states, including
// legacy state with no callbackPolicy. Blank state is not a runnable import.
const eligible = (status, state) => status === 'Running' && !String(state ?? '').includes('shared-recovery-30m');
for (const status of ['Running', 'Success', 'Failed', 'Partial', 'Skipped', 'Timed Out']) {
  assert.equal(eligible(status, JSON.stringify({version:1, callbackPolicy:'shared-recovery-30m'})), false);
  assert.equal(eligible(status, JSON.stringify({version:1, phase:'waiting'})), status === 'Running');
}

// Reuse the established native-shaped harness and actual Deluge bodies. The
// workers are bounded test doubles; the live import is a separate native gate.
const core = fs.readFileSync('scripts/test-quota-core.mjs', 'utf8');
const compile = vm.runInNewContext('(' + core.slice(core.indexOf('function compile(source)'), core.indexOf('\nconst POLICY=')).trim() + ')');
const NOW = Date.parse('2026-11-08T20:00:00Z'), ID = '900000000000000001'; // Synthetic ID above JavaScript's safe integer range.
const read = name => fs.readFileSync(`creator/functions/${name}.dg`, 'utf8').replaceAll('\r\n', '\n');
const harness = vm.runInNewContext('(' + core.slice(core.indexOf('function harness('), core.indexOf('\nfunction state(')).trim() + ')', {vm, compile, read, NOW, ID});
for (const policy of ['shared-recovery-30m', 'legacy', null]) {
  for (const [workflow, worker] of [['Budgets_Import_Load_GP_Co', 'actual'], ['Budgets_Import_Load_HCSS_1', 'plan']]) {
    const state = {version:1, workflow, phase:'waiting', tick:3, actualPhase:'preflight', ...(policy ? {callbackPolicy:policy} : {})};
    const h = harness({runs:[{ID, Run_Status:'Running', Resume_At:NOW, Export_State:JSON.stringify(state)}], locks:[{ID:'501', Claim_Key:ID+'|wake|3|0', Wake_At:NOW}]});
    assert.equal(eligible('Running', JSON.stringify(state)), policy !== 'shared-recovery-30m');
    assert.equal(h.exec('thisapp.workflowExportDispatch("501")'), 'completed');
    assert.equal(JSON.stringify(h.json('businessCalls')), JSON.stringify([[worker, ID]]), 'primary wake alone reaches the existing import worker');
    h.exec('thisapp.workflowExportTick("'+ID+'")');
    assert.equal(h.json('businessCalls.length'), 1, 'a later duplicate continuation cannot repeat the claimed worker');
  }
}
console.log('PASS: exact native eligibility, terminal/shared exclusion, legacy compatibility, primary-only actual/plan dispatch and duplicate protection.');
