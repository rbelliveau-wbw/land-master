import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const vendor = fs.readFileSync('widgets/land-master/src/app/vendor/xlsx.full.min.js', 'utf8');
const XLSX = vm.runInNewContext(vendor + ';XLSX');
const cloud = { exports: {} };
vm.runInNewContext(fs.readFileSync('creator/functions/approvalWorkbookXlsx.cjs', 'utf8'), {
  module: cloud,
  Buffer,
  require(name) {
    assert.equal(name, 'xlsx.full.min.js');
    return XLSX;
  }
});

export function approvalXlsxFixture(spreadsheetXml, name) {
  let base64;
  cloud.exports({}, {
    getParameter: key => key === 'spreadsheetXml' ? spreadsheetXml : undefined,
    write: result => { base64 = JSON.parse(result).base64; }
  });
  assert.equal(typeof base64, 'string');
  return { name, base64, sourceXml: spreadsheetXml };
}

export function readApprovalXlsx(attachment) {
  const bytes = Buffer.from(attachment.base64, 'base64');
  assert.equal(bytes.subarray(0, 4).toString('hex'), '504b0304');
  const book = XLSX.read(Array.from(bytes), { type: 'array', cellNF: true, cellStyles: true });
  assert.equal(book.bookType, 'xlsx');
  return book;
}

export const approvalSheetRows = sheet => XLSX.utils.sheet_to_json(sheet, { header: 1 });
