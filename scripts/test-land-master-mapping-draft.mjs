import fs from 'node:fs';

const source = fs.readFileSync('widgets/land-master/src/app/widget.html', 'utf8');

function requireText(text, message) {
  if (!source.includes(text)) throw new Error(message);
}

function forbidText(text, message) {
  if (source.includes(text)) throw new Error(message);
}

requireText('function externalMappingsEditor(', 'External mappings must render in the subdivision tab.');
requireText('function saveExternalMappings()', 'External mappings must have a staged batch save.');
requireText("if(S.editorType==='subdivision'&&S.modalTab==='externalMappings')return saveExternalMappings();", 'The panel Save button must route mapping drafts through the batch save.');
requireText("createRecord('externalMapping'", 'Batch save must create staged mapping rows.');
requireText("updateRecord(op.row.id,op.data,'All_External_System_Mappings')", 'Batch save must update staged mapping rows.');
requireText("deleteRecord('externalMapping'", 'Batch save must delete staged mapping rows.');
requireText('Changes are staged here and sent to Creator only when Save changes is pressed.', 'The UI must explain staged save behavior.');
forbidText('function addExternalMapping(){', 'Mappings must not open the standalone record editor.');
forbidText('function removeExternalMapping(id)', 'Mappings must not delete immediately from a row action.');
forbidText('data-add-related="externalMapping"', 'The mapping tab must use its staged inline add control.');

console.log('Land Master staged external-mapping checks passed.');
