import assert from 'node:assert/strict';
import fs from 'node:fs';

// Deluge is hosted by Creator, so guard the source contract that caused the
// production failure: a fetch with zero rows is an empty record collection.
const source=fs.readFileSync('creator/functions/proforma_save.dg','utf8');
const saveStart=source.indexOf('if(op == "save_phase_sales")');
const finalizeStart=source.indexOf('if(op == "finalize_phase_sales")');
assert.ok(saveStart>=0 && finalizeStart>saveStart,'phase-sales operations exist');
const save=source.slice(saveStart,finalizeStart);
const finalize=source.slice(finalizeStart);

assert.match(save,/phasePf = Add_Pro_Forma\[ID == pfId\.toLong\(\)\];\s*if\(phasePf\.count\(\) == 0\)/,
  'a missing Pro Forma must be rejected before its fields are read');
assert.match(save,/ownedPhase = Proforma_Phase\[ID == rowId\.toLong\(\) && Pro_Forma == phasePf\.ID\];\s*if\(seenPhaseIds\.contains\(rowId\) \|\| ownedPhase\.count\(\) == 0\)/,
  'a supplied phase ID must belong to this Pro Forma');
assert.match(save,/phaseRec = Proforma_Phase\[ID == rowId\.toLong\(\) && Pro_Forma == phasePf\.ID\]/);
assert.match(save,/phaseRec = Proforma_Phase\[Pro_Forma == phasePf\.ID && Phase == phaseNumber\]/);
assert.match(save,/if\(phaseRec\.count\(\) == 0\)\s*\{\s*newPhaseId = insert into Proforma_Phase[\s\S]*?\}\s*else\s*\{\s*phaseRec\.Phase=phaseNumber;/,
  'a new phase inserts, while an existing phase updates');
assert.doesNotMatch(save,/Proforma_Phase\[[^\]]+\] == null|if\(phaseRec == null\)/,
  'record collections must not use null as the no-match test');
assert.match(finalize,/finalPf = Add_Pro_Forma\[ID == pfId\.toLong\(\)\];\s*if\(finalPf\.count\(\) == 0\)/,
  'finalization must reject a missing Pro Forma');
assert.match(source,/pf = Add_Pro_Forma\[ID == pfKey\];\s*if\(pf\.count\(\) == 0\)/,
  'a newly inserted Pro Forma must be found before the main save continues');
assert.match(source,/pf = Add_Pro_Forma\[ID == pfIdLong\];\s*if\(pf\.count\(\) == 0\)/,
  'a retry must reject a missing Pro Forma before it mutates child rows');
assert.doesNotMatch(source,/if\(pf == null\)/,
  'normal saves must test the fetched record collection rather than null');

console.log('Creator phase save: empty fetch inserts; owned IDs update; missing records reject safely.');
