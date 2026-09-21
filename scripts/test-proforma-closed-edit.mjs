import assert from 'node:assert/strict';
import fs from 'node:fs';

const widget=fs.readFileSync('widgets/proforma-manager/src/app/widget.html','utf8');
assert.ok(widget.includes('rowClosed=proformaLifecycleStatus(r)==="Closed" || isClosedStage(r.Probability)'));
assert.ok(widget.includes('rowHasEditAccess&&rowClosed'));
assert.ok(widget.includes('class="btn rowact closed-disabled" disabled aria-disabled="true"'));
assert.ok(widget.includes('Closed Pro Formas cannot be edited'));
assert.ok(widget.includes('.btn.rowact.closed-disabled,.btn.rowact.closed-disabled:hover'));
const view=widget.indexOf('data-act="view"'), edit=widget.indexOf('class="btn rowact closed-disabled"'), comments=widget.indexOf("+pfListCommentAction(r)",edit);
assert.ok(view<edit&&edit<comments,'disabled Edit remains between View and Comments');
console.log('Closed Pro Forma Edit action remains aligned and visibly disabled.');
