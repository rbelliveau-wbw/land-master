import assert from 'node:assert/strict';
import fs from 'node:fs';

const widget=fs.readFileSync('widgets/proforma-manager/src/app/widget.html','utf8');
assert.ok(widget.includes('var rowCanEdit=rowHasEditAccess&&!approvalState.complete;'));
assert.ok(!widget.includes('rowCanEdit=rowHasEditAccess&&!approvalState.complete&&!rowClosed'));
assert.ok(widget.includes('var rowEditDisabledClass="edit-disabled";'));
assert.ok(widget.includes("(rowCanEdit?'primary':rowEditDisabledClass)"));
assert.ok(!widget.includes('Closed Pro Formas cannot be edited'));
assert.ok(widget.includes('if(approvalState&&approvalState.complete)return "Approved Pro Formas are read-only'));
const view=widget.indexOf('data-act="view"'), edit=widget.indexOf("(rowCanEdit?'primary':rowEditDisabledClass)"), comments=widget.indexOf("+pfListCommentAction(r)",edit);
assert.ok(view<edit&&edit<comments,'Edit remains between View and Comments');
console.log('Closed Won Edit follows record access while approved Pro Formas stay disabled.');
