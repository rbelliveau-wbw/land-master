import fs from 'node:fs';

const source = fs.readFileSync('widgets/land-master/src/app/widget.html', 'utf8');

function requireText(text, message) {
  if (!source.includes(text)) throw new Error(message);
}

function forbidText(text, message) {
  if (source.includes(text)) throw new Error(message);
}

function requireMatch(pattern, message) {
  if (!pattern.test(source)) throw new Error(message);
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
requireText('function finishExternalMappingSave(message,isError){if(!isError)S.mappingDraft=null;S.panelSaving=false;renderPanel();', 'Mapping saves must reconcile local state without reloading all Creator reports and must preserve failed drafts.');
requireText("permissionDenied=!!(failed&&failed.kind==='create'&&errorResponseCode(err)==='2899')", 'Only mapping-create code 2899 failures should use permission handling.');
requireText("diag(permissionDenied?'External mapping create permission denied':'External mapping batch save failed'", 'Permission failures must have a distinct audit label.');
requireText("operation:failed&&failed.kind,error:err});finishExternalMappingSave('',true)", 'Every mapping failure must be emailed while the visible panel message stays empty.');
forbidText('Ask a Creator admin to enable Create access for the External_System_Mapping form', 'Detailed permission guidance must not be shown in the user-facing editor.');
forbidText('},permissionDenied);', 'Permission failures must not bypass automatic widget-error email.');
requireText("op.row.isNew=false;op.row.originalSystem=op.row.system;op.row.originalCode=op.row.code", 'Successful creates must be reconciled into a retained draft.');
requireText('op.row.originalSystem=op.row.system;op.row.originalCode=op.row.code;', 'Successful updates must be reconciled into a retained draft.');
requireText('if(S.mappingDraft)S.mappingDraft.rows=S.mappingDraft.rows.filter(function(r){return r!==op.row;});', 'Successful deletes must be removed from a retained draft.');
requireText("function lookupChoiceRequired(){var type=S.lookupPopupMode==='field'?S.editorType:currentType();return type==='subdivision'&&S.lookupPopupField==='Company1';}", 'Subdivision Development Company must be treated as a required lookup in both editor modes.');
requireText("var h=lookupChoiceRequired()?'':'<button", 'Required lookup popups must omit the Clear selection action.');
requireText('if(!next&&lookupChoiceRequired())return closeLookupPopup();', 'Required lookup saves must defensively reject an empty selection before calling Creator.');
requireText("var hideSubtitle=!S.editorNew&&S.editorType==='subdivision'", 'Existing subdivision editors must hide the report subtitle.');
requireText("return finishExternalMappingSave('',false)", 'Successful mapping saves must clear the panel message.');
requireMatch(/relatedTable\('Milestones','milestone'.*?\{showActions:false\}\)/, 'Subdivision Milestones must omit the Actions column.');
requireMatch(/relatedTable\('Forecast Years','forecastYear'.*?\{showActions:false\}\)/, 'Subdivision Forecast Years must omit the Actions column.');
requireMatch(/relatedTable\('Monthly Forecasts','forecast'.*?\{showActions:false\}\)/, 'Subdivision Monthly Forecasts must omit the Actions column.');
requireMatch(/relatedTable\('Takedown Schedules','takedown'.*?\{showActions:false\}\)/, 'Subdivision Takedown Schedules must omit the Actions column.');
requireMatch(/relatedTable\('Builder Takedowns','builderTakedown'.*?\{showActions:false\}\)/, 'Subdivision Builder Takedowns must omit the Actions column.');
forbidText('Changes are staged here and sent to Creator only when Save changes is pressed.', 'The removed mapping helper copy must stay hidden.');
forbidText('data-mapping-add>+ Add mapping</button>', 'The mapping add action must not use the old label.');
forbidText("r.removed?'Will remove'", 'The mapping state must not use the old removal label.');
forbidText('errorApi: "reportProformaWidgetError"', 'Audit delivery must not use the Deluge function name as the Custom API link name.');
forbidText('return loadData().then(done)', 'Mapping saves must not reload the complete Land Master dataset.');
forbidText('deleteRecord({reportName:report,id:String(id)})', 'Creator deleteRecord does not accept an id configuration property.');
forbidText('All mapping changes saved.', 'Successful mapping saves must not show the removed confirmation copy.');
forbidText('function addExternalMapping(){', 'Mappings must not open the standalone record editor.');
forbidText('function removeExternalMapping(id)', 'Mappings must not delete immediately from a row action.');
forbidText('data-add-related="externalMapping"', 'The mapping tab must use its staged inline add control.');

console.log('Land Master staged external-mapping checks passed.');
