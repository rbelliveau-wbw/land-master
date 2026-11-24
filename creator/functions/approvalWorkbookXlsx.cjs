const XLSX = require('xlsx.full.min.js');

module.exports = async function (context, basicIO) {
  const source = basicIO.getParameter('spreadsheetXml');
  if (typeof source !== 'string' || !source.startsWith('<?xml') || !source.endsWith('</Workbook>')) {
    throw new Error('Expected a Land Master approval workbook.');
  }

  // Match the in-app PO download. Normalize only XML attributes, preserving cell text.
  const xml = source.replace(/<[^>]*>/g, tag => tag.replace(/(\s[\w:.-]+)='([^']*)'/g,
    (_, name, value) => name + '="' + value.replace(/"/g, '&quot;') + '"'));
  const workbook = XLSX.read(xml, { type: 'string', cellNF: true, cellStyles: true });
  if (workbook.bookType !== 'xlml' || workbook.SheetNames.length === 0) {
    throw new Error('No sheets found in the approval workbook.');
  }

  const bytes = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', compression: true });
  basicIO.write(JSON.stringify({ base64: Buffer.from(bytes).toString('base64') }));
};
