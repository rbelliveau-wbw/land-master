import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('creator/functions/exportBudgetSnapshot.dg', 'utf8');
const approvedWrapper = fs.readFileSync('creator/functions/generateApprovedBudgetPDF.dg', 'utf8');
const widget = fs.readFileSync('widgets/budget-manager/src/app/widget.html', 'utf8');

function section(start, end, sourceText = source) {
  const first = sourceText.indexOf(start);
  assert.ok(first >= 0, `missing start: ${start}`);
  const last = sourceText.indexOf(end, first + start.length);
  assert.ok(last > first, `missing end: ${end}`);
  return sourceText.slice(first, last);
}

function pdfHeadings(block) {
  return [...block.matchAll(/<th style='width:(\d+)%;[^']*'>([^<]+)<\/th>/g)]
    .map(([, width, label]) => ({ width: Number(width), label }));
}

const pdfHeader = section('pdfHtml = pdfHtml + "<thead><tr>";', 'pdfHtml = pdfHtml + "</tr></thead><tbody>";');
const branchStart = pdfHeader.indexOf('if(isApprovedExport == false)');
const branchElse = pdfHeader.indexOf('else', branchStart);
assert.ok(branchStart >= 0 && branchElse > branchStart, 'PDF column layouts must branch by export type');
const regularHeadings = pdfHeadings(pdfHeader.slice(branchStart, branchElse));
const approvedHeadings = pdfHeadings(pdfHeader.slice(branchElse));
assert.deepEqual(regularHeadings.map(x => x.label), [
  'Code', 'Budget Item', 'Unit', 'Cost per Unit', 'Preliminary', 'Unapproved',
  'Final', 'HCSS Actuals', 'GP Actuals', 'Notes'
]);
assert.equal(regularHeadings.reduce((sum, x) => sum + x.width, 0), 100, 'regular PDF widths fill the table');
assert.deepEqual(approvedHeadings, [
  { width: 8, label: 'Code' }, { width: 22, label: 'Budget Item' },
  { width: 11, label: 'Preliminary' }, { width: 11, label: 'Unapproved' },
  { width: 11, label: 'Final' }, { width: 11, label: 'HCSS Actuals' },
  { width: 11, label: 'GP Actuals' }, { width: 15, label: 'Notes' }
], 'approved PDF keeps its previous eight columns and widths');

const pdfRows = section('categoryItems = Budget_Item[Budget_Category == cat.ID] sort by Cost_Code;',
  'pdfHtml = pdfHtml + "</tbody></table></div>";');
const pdfUnitGuard = section('if(isApprovedExport == false)', 'pdfHtml = pdfHtml + "<td class=\'money\'>" + prelimDisplay', pdfRows);
assert.ok(pdfUnitGuard.includes('"<td style=\'text-align:left;\'>" + unitSafe'), 'unit cell stays in regular PDF guard');
assert.ok(pdfUnitGuard.includes('"<td class=\'money\'>" + perUnitDisplay'), 'cost cell stays in regular PDF guard');
assert.equal([...pdfRows.matchAll(/pdfHtml = pdfHtml \+ "<td/g)].length, 10,
  'regular PDF has ten item cells; approved PDF omits the guarded two');
assert.ok(pdfRows.includes('perUnitDisplay = "";') && pdfRows.includes('if(item.Per_Unit != null)'),
  'manual items leave the PDF cost cell blank');
assert.ok(pdfRows.includes('unitSafe = unitSafe.replaceAll("&","&amp;")'),
  'unit text is escaped for PDF HTML');

const excel = section('/********* BUDGET DETAIL WORKSHEET *********/',
  '/********* APPROVAL HISTORY WORKSHEET *********/');
const excelHeader = section('excelXml = excelXml + "<Row ss:StyleID=\'Header\'>";',
  'excelXml = excelXml + "</Row>";', excel);
const excelLabels = [...excelHeader.matchAll(/<Cell><Data ss:Type='String'>([^<]+)<\/Data><\/Cell>/g)]
  .map(([, label]) => label);
assert.deepEqual(excelLabels, [
  'Department', 'Category Code', 'Category', 'Cost Code', 'Budget Item',
  'Unit', 'Cost per Unit', 'Preliminary', 'Unapproved', 'Final',
  'HCSS Actuals', 'GP Actuals', 'Notes'
]);
assert.equal([...excel.matchAll(/<Column ss:Width='/g)].length, 13,
  'Excel detail declares one width per field');
const excelItemRows = section('for each  item in categoryItems',
  'excelXml = excelXml + "</Row>";', excel);
const dataCells = [...excelItemRows.matchAll(/excelXml = excelXml \+ "<Cell/g)].length;
assert.equal(dataCells + 1, excelLabels.length, 'Excel detail rows align with headers including dynamic cost cell');
assert.ok(excelItemRows.includes('perUnitPriceCellXml = "<Cell/>";') &&
  excelItemRows.includes('if(item.Per_Unit != null)') &&
  excelItemRows.includes('ss:Type=\'Number\'>" + item.Per_Unit.toDecimal()'),
  'manual rows have a blank cost cell and priced rows have numeric currency');
assert.ok(excelItemRows.includes('unitXml = unitXml.replaceAll("&","&amp;")'),
  'unit text is escaped for Excel XML');

assert.ok(approvedWrapper.includes('thisapp.exportBudgetSnapshot(budgetId,"APPROVED_PDF")'),
  'approved export reaches the guarded PDF path');
assert.ok(widget.includes('sdkRunBudgetFunction("exportBudgetSnapshot", { budgetId:bid, exportType:typ })'),
  'widget dropdown still calls the same Creator export function');

console.log('Budget PDF, Excel, blank manual item, and approved PDF export structure passed.');
