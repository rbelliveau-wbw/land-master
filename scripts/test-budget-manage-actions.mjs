import assert from 'node:assert/strict';
import fs from 'node:fs';

const widget=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8');
const backend=fs.readFileSync('creator/functions/manageBudget.dg','utf8');
const access=fs.readFileSync('creator/functions/getUserAccess.dg','utf8');

const menuAt=widget.indexOf("data-budget-menu='");
const viewAt=widget.indexOf("data-viewphase='");
assert.ok(menuAt>=0&&menuAt<viewAt,'the three-dot menu is rendered to the left of View');
assert.match(widget,/data-budget-manage='delete'/,'the menu exposes Delete');
assert.match(widget,/data-budget-manage='" \+ \(archived \? "restore" : "archive"\)/,'the menu toggles Archive and Restore');
assert.match(widget,/disabled aria-disabled='true'/,'users without permission still see disabled menu options');
assert.match(widget,/Delete_Archive_Budgets/,'the widget reads the Budget delete/archive permission');
for(const label of ['Budget items','Budget categories','Budget month schedules','Approval records','Budget modifications','Attachments and contract versions','Comments']) assert.ok(widget.includes('"'+label+'"'),'the delete modal lists '+label);

assert.match(access,/row\.Delete_Archive_Budgets == true/,'server access payload reads the new boolean');
assert.match(access,/result\.put\("budgetDeleteArchive",budgetDeleteArchive\)/,'server access payload exposes the new boolean');
assert.match(backend,/User_Access\[User == zoho\.loginuser\]/,'the mutation function resolves the signed-in user server-side');
assert.match(backend,/accessRow\.ID\.toString\(\) != accessIdText/,'the supplied access id must belong to the signed-in user');
assert.match(backend,/accessRow\.Delete_Archive_Budgets != true/,'the mutation function enforces permission server-side');
assert.match(backend,/budgetRow\.Archived=archiveValue/,'archive and restore persist Add_Budget.Archived');
for(const form of ['Budget_Approvals','Budget_Modification','Budget_Item','Budget_Category','Budget_Months','Contract_Version','Comment_Log']) assert.ok(backend.includes('delete from '+form+'['),'delete cascades '+form);
assert.ok(backend.indexOf('delete from Budget_Approvals')<backend.indexOf('delete from Budget_Modification'),'approval children are removed before modification parents');
assert.ok(backend.indexOf('delete from Budget_Item')<backend.indexOf('delete from Budget_Category'),'items are removed before categories');
assert.ok(backend.indexOf('delete from Comment_Log')<backend.indexOf('delete from Add_Budget'),'children are removed before the budget parent');
assert.match(backend,/importRow\.Budget_Item=null/,'import history is preserved while deleted item links are cleared');
console.log('Budget menu, permission, archive, and scoped delete checks passed.');
