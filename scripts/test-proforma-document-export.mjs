import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const widget=fs.readFileSync('widgets/proforma-manager/src/app/widget.html','utf8');
function fn(name){const a=widget.indexOf('function '+name+'(');assert.ok(a>=0,name);const b=widget.indexOf('\nfunction ',a+1);return widget.slice(a,b);}
let reply,downloads=[],messages=[],requests=[];
const ctx=vm.createContext({Uint8Array,Blob,atob,Date,console,
  S:{ed:null,exportPfId:'123'},
  invokeApprovalPdfApi:async payload=>{requests.push(payload);return reply;},
  triggerBlobDownload:(blob,name)=>downloads.push({blob,name}),
  closeExportModal(){},toast(){},auditLog(){},errMeta:e=>e,
  exportStatus:(text,bad)=>messages.push({text,bad})});
vm.runInContext(fn('exportProformaDocx'),ctx);
reply={success:true,base64:Buffer.from('PK\x03\x04fixture').toString('base64'),mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',fileName:'Test.docx'};
await ctx.exportProformaDocx('123');
assert.equal(downloads.length,1);assert.equal(downloads[0].name,'Test.docx');
assert.equal(downloads[0].blob.type,reply.mimeType);assert.equal(requests[0].format,'docx');
assert.equal(await downloads[0].blob.text(),'PK\x03\x04fixture');
reply={success:true,pdfText:'%PDF-1.4'};await ctx.exportProformaDocx('123');
assert.equal(downloads.length,1,'old backend must not save a PDF as Word');
assert.ok(messages.at(-1).text.includes('Creator update'));
ctx.S.ed={id:'123',loiDirty:true};const count=requests.length;await ctx.exportProformaDocx('123');
assert.equal(requests.length,count,'unsaved Offer blocks export');
const endpoint=fs.readFileSync('creator/functions/Get_Proforma_Approval_PDF.dg','utf8');
const helper=fs.readFileSync('creator/functions/PF_Build_LOI_Document.dg','utf8');
const submit=fs.readFileSync('creator/functions/Create_LOI_Contract.dg','utf8');
assert.ok(endpoint.indexOf('sellerCount != 1 || propertyCount < 1')<endpoint.indexOf('PF_Build_LOI_Document'));
assert.ok(helper.includes('rCAD = propertyCadIds.toString(", ")'),'all Property parcel IDs are merged');
assert.ok(helper.includes('rPropCounty = propertyCounties.toString(", ")'),'duplicate parcel counties are collapsed');
assert.ok(helper.includes('rPropCity = propertyCities.toString(", ")'),'duplicate parcel cities are collapsed');
assert.ok(endpoint.indexOf('"format"')<endpoint.indexOf('if(approvalId == "")'),'Word export does not require approvals');
assert.ok(!/insert into|sendmail|\.Status\s*=/.test(helper+endpoint),'download never creates contracts or sends messages');
assert.ok(submit.includes('thisapp.PF_Build_LOI_Document(proformaId)'),'submission shares template merge implementation');
assert.ok(helper.includes('pf.Authorized_Signer_for_Seller'));
assert.ok(widget.includes('data-export="docx"'));
assert.ok(widget.includes('PRESERVE_EMPTY_HEADER_FIELDS={Authorized_Signer_for_Seller:1}'),'clearing signer stays in save payload');
assert.ok(widget.includes('k!=="Projected_Hard_Close_Date"'),'clearing hard-close stays in worksheet payload');
const saveFn=fs.readFileSync('creator/functions/proforma_save.dg','utf8');
assert.ok(saveFn.includes('pf.Authorized_Signer_for_Seller=header.get("Authorized_Signer_for_Seller")'),'blank signer clears server field');
assert.ok(saveFn.includes('loiRec.Projected_Hard_Close_Date=null'),'blank hard close clears server field');
assert.ok(saveFn.includes('loiRec.Assumed_Effective_Date=zoho.currentdate'),'blank effective date defaults on server');
console.log('Word download, old-backend handling, unsaved inputs, merge reuse and download-only boundaries passed.');
