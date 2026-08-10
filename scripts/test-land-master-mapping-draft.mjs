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
requireText("deleteRecord({reportName:report,criteria:'(ID == '+rid+')'})", 'Creator deletes must identify the mapping with a report criteria expression.');
requireText("if(!/^\\d+$/.test(rid))", 'Creator deletes must validate record IDs before building criteria.');
requireText('data-mapping-add>+ Add</button>', 'The mapping add action must use the compact + Add label.');
requireText("r.removed?'Removed'", 'A staged deletion must display Removed.');
requireText('errorApi: "Report_Proforma_Widget_Error"', 'Audit delivery must use the deployed Custom API link name.');
requireText('function invokeErrorApi(config)', 'Audit delivery must support the available Creator Custom API SDK surface.');
requireText('code==="9350"||code==="9360"', 'Missing or unpublished Custom APIs must not retry forever.');
requireText('S.tableRefreshPending=true;', 'Record saves must defer the expensive background-table refresh.');
requireText('function finishExternalMappingSave(message,isError){S.mappingDraft=null;S.panelSaving=false;renderPanel();', 'Mapping saves must reconcile local state without reloading all Creator reports.');
forbidText('Changes are staged here and sent to Creator only when Save changes is pressed.', 'The removed mapping helper copy must stay hidden.');
forbidText('data-mapping-add>+ Add mapping</button>', 'The mapping add action must not use the old label.');
forbidText("r.removed?'Will remove'", 'The mapping state must not use the old removal label.');
forbidText('errorApi: "reportProformaWidgetError"', 'Audit delivery must not use the Deluge function name as the Custom API link name.');
forbidText('return loadData().then(done)', 'Mapping saves must not reload the complete Land Master dataset.');
forbidText('deleteRecord({reportName:report,id:String(id)})', 'Creator deleteRecord does not accept an id configuration property.');
forbidText('function addExternalMapping(){', 'Mappings must not open the standalone record editor.');
forbidText('function removeExternalMapping(id)', 'Mappings must not delete immediately from a row action.');
forbidText('data-add-related="externalMapping"', 'The mapping tab must use its staged inline add control.');

console.log('Land Master staged external-mapping checks passed.');
