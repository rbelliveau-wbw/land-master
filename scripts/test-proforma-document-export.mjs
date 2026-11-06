import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {translate} from './lib/deluge-pdf-test-runtime.mjs';
const widget=fs.readFileSync('widgets/proforma-manager/src/app/widget.html','utf8');
function fn(name){const a=widget.indexOf('function '+name+'(');assert.ok(a>=0,name);const b=widget.indexOf('\nfunction ',a+1);return widget.slice(a,b);}
let reply,downloads=[],messages=[],requests=[];
const ctx=vm.createContext({Uint8Array,Blob,atob,Date,console,pfReferencesReady:()=>true,
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
// Writer is an app integration: another authorized submitter must not need a personal Writer login.
// Assert both external requests use the existing shared admin authorization; no user fallback.
const writerRequests=[...helper.matchAll(/invokeurl\s*\[([^\]]+)\]/g)].map(match=>match[1]).filter(body=>body.includes('zohoapis.com/writer/'));
assert.equal(writerRequests.length,2,'Template fields and DOCX merge must use the same shared Writer connection');
for(const request of writerRequests)assert.match(request,/connection\s*:\s*"zoho_writer_admin"/);
assert.doesNotMatch(helper,/connection\s*:\s*"zoho_writer"/,'Personal Writer authorization cannot be the shared submission path');
assert.match(submit,/legalAccess\.Submit_to_Legal_Module != true/,'Shared Writer authorization retains the Submit to Legal permission gate');
assert.ok(helper.includes('pf.Authorized_Signer_for_Seller'));
assert.ok(widget.includes('data-export="docx"'));
assert.ok(widget.includes('PRESERVE_EMPTY_HEADER_FIELDS={Authorized_Signer_for_Seller:1}'),'clearing signer stays in save payload');
assert.ok(widget.includes('k!=="Projected_Hard_Close_Date"'),'clearing hard-close stays in worksheet payload');
const saveFn=fs.readFileSync('creator/functions/proforma_save.dg','utf8');
assert.ok(saveFn.includes('pf.Authorized_Signer_for_Seller=header.get("Authorized_Signer_for_Seller")'),'blank signer clears server field');
assert.ok(saveFn.includes('loiRec.Projected_Hard_Close_Date=null'),'blank hard close clears server field');
assert.ok(saveFn.includes('loiRec.Assumed_Effective_Date=zoho.currentdate'),'blank effective date defaults on server');
// Execute the checked-in template-selection, field-validation and money blocks.
// Creator Save remains the compiler gate; these fixtures validate business routing.
const routing=helper.slice(helper.indexOf('        agreementType = "PSA";'),helper.indexOf('        if(writerDocumentId == null'));
const expected=helper.slice(helper.indexOf('        expectedWriterFields = List();'),helper.indexOf('        if(writerFieldCheckSucceeded == true)'));
const missing=helper.slice(helper.indexOf('            missingWriterFields = List();'),helper.indexOf('            if(missingWriterFields.size() > 0)'));
const money=helper.slice(helper.indexOf('        // The PSA template owns'),helper.indexOf('        fileBaseName = '));
const filename=helper.split('\n').find(line=>line.includes('fileBaseName = '));
for(const [label,block] of Object.entries({routing,expected,missing,money,filename}))assert.ok(block?.trim(),label+' source block exists');
const writerContext=vm.createContext({});
vm.runInContext(`
 function ifnull(v,f){return v==null?f:v;}
 function Map(){const values={};return {put(k,v){values[k]=v;},get(k){return values[k]??null;},keys(){return Object.keys(values);}};}
 function List(){return [];}
 Array.prototype.add=function(v){this.push(v);};
 Array.prototype.size=function(){return this.length;};
 Array.prototype.contains=function(v){return this.includes(v);};
 Number.prototype.round=function(n){const scale=10**n;return Math.round(this*scale)/scale;};
 Number.prototype.floor=function(){return Math.floor(this);};
 Number.prototype.toLong=function(){return Math.trunc(this);};
 Number.prototype.toWords=function(locale){if(locale!=='en-us')throw Error('Unexpected words locale');return '[words:'+Number(this)+']';};
 String.prototype.replaceAll=function(pattern,replacement){return this.replace(new RegExp(pattern,'g'),replacement);};
 var zoho={currentdate:{toString(){return '20261105';}}};
`,writerContext);
for(const source of [
 `map writerSelection(map loiRec){${routing} result=Map();result.put("type",agreementType);result.put("id",writerDocumentId);return result;}`,
 `list templateFields(string agreementType){${expected}return expectedWriterFields;}`,
 `list missingFields(list writerFieldIds,string agreementType){${expected}${missing}return missingWriterFields;}`,
 `map moneyWords(string agreementType,decimal amount){vAmtAcre=amount;vLandCost=amount;vEarnest=amount;vAmtExt=amount;mergeRow=Map();mergeRow.put("Land_Cost_Written","existing LOI price");mergeRow.put("Earnest_Money_Written","existing LOI earnest");mergeRow.put("Amount_per_Extension_Written","existing LOI extension");${money}return mergeRow;}`,
 `string mergeFilename(map pf,string agreementType){${filename}return fileBaseName;}`
])vm.runInContext(translate(source).js.replace(/\.length\(\)/g,'.length'),writerContext);
const loiTemplate='6kuqna9b27e6fe95b4f75a3920de1ff048543';
const psaTemplate=writerContext.writerSelection({Agreement_Type:'PSA'}).get('id');
assert.match(psaTemplate,/^[a-z0-9]{37}$/,'PSA has a real Writer document ID');
assert.doesNotMatch(helper,/PURCHASE_AGREEMENT_WRITER_ID_PENDING/,'pending template placeholders cannot ship');
assert.notEqual(psaTemplate,loiTemplate,'PSA has its own Writer template');
for(const row of [null,{}, {Agreement_Type:null},{Agreement_Type:''},{Agreement_Type:'PSA'},{Agreement_Type:'unexpected'}]){
 const selected=writerContext.writerSelection(row);assert.equal(selected.get('type'),'PSA');assert.equal(selected.get('id'),psaTemplate);
}
const loiSelection=writerContext.writerSelection({Agreement_Type:'LOI'});
assert.equal(loiSelection.get('type'),'LOI');assert.equal(loiSelection.get('id'),loiTemplate);
assert.match(widget,/S\.ed\.loi\.Agreement_Type=value/,'Offer slider persists the same worksheet selector used by Writer');
assert.match(saveFn,/loiRec\.Agreement_Type=agreementType/);
const psaFields=['Seller','Buying_Entity','Property_County','CAD_ID','Property_City','Total_Acres','Amount_per_Acre_Written','Amount_per_Acre','Land_Cost_Written','Land_Cost','Earnest_Money_Written','Earnest_Money','Initial_Feasibility_Days_Written','Initial_Feasibility_Days','Extensions_Written','Extensions','Days_per_Extension_Written','Days_per_Extension','Amount_per_Extension_Written','Amount_per_Extension','Broker_Buyer','Broker_Seller','Closing_Days_Feas_Written','Closing_Days_Feas','Acquisition_Email','Street_Address','Seller_City_State_ZIP','Seller_Email','Seller_Phone','Special_Provisions','Authorized_Signer_for_Seller'];
const nativeFields=fields=>vm.runInContext(JSON.stringify(fields),writerContext);
assert.deepEqual(Array.from(writerContext.templateFields('PSA')).sort(),psaFields.slice().sort(),'PSA validates actual purchase-agreement fields');
assert.deepEqual(Array.from(writerContext.templateFields('LOI')).sort(),psaFields.filter(field=>field!=='Amount_per_Acre_Written').concat('Response_Date').sort(),'existing LOI field contract stays intact');
assert.equal(writerContext.missingFields(nativeFields(psaFields),'PSA').length,0,'PSA does not require unused LOI Response_Date');
assert.deepEqual(Array.from(writerContext.missingFields(nativeFields(psaFields.filter(field=>field!=='Seller_Phone')),'PSA')),['Seller_Phone'],'omitted PSA field is rejected');
assert.deepEqual(Array.from(writerContext.missingFields(nativeFields(psaFields.filter(field=>field!=='Amount_per_Acre_Written').concat('Price_Per_Acre_Alpha')),'PSA')),['Amount_per_Acre_Written'],'old alias cannot silently leave purchase-price words unmerged');
const writtenMoneyFields=['Amount_per_Acre_Written','Land_Cost_Written','Earnest_Money_Written','Amount_per_Extension_Written'];
for(const [value,words] of [[null,''],[0,'[words:0] and 00/100'],[12345.67,'[words:12345] and 67/100'],[12345.05,'[words:12345] and 05/100'],[12345.999,'[words:12346] and 00/100'],[-12345.67,'negative [words:12345] and 67/100']]){
 const row=writerContext.moneyWords('PSA',value);for(const field of writtenMoneyFields)assert.equal(row.get(field),words,field+' preserves cents: '+value);
}
const originalLOI=writerContext.moneyWords('LOI',12345.67);
assert.equal(originalLOI.get('Amount_per_Acre_Written'),null);
assert.equal(originalLOI.get('Land_Cost_Written'),'existing LOI price');
assert.equal(originalLOI.get('Earnest_Money_Written'),'existing LOI earnest');
assert.equal(originalLOI.get('Amount_per_Extension_Written'),'existing LOI extension');
for(const [field,value] of [['Land_Cost_Written','vLandCost'],['Earnest_Money_Written','vEarnest'],['Amount_per_Extension_Written','vAmtExt']])assert.ok(helper.includes('mergeRow.put("'+field+'",if('+value+' != null,'+value+'.round(0).toWords("en-us"),""));'),'original LOI words expression retained');
for(const type of ['PSA','LOI'])assert.equal(writerContext.mergeFilename({Name:'Example / Acreage'},type),'Example_Acreage_'+type+'_20261105');
const confirmations=[],legalContext=vm.createContext({S:{loiSubmitting:{},ed:null},canSubmitPfToLegal:()=>true,loiMergeContext:()=>({autoMerge:true,sellerCount:1,propertyCount:1}),auditLog(){},uiConfirm:value=>{confirmations.push(value);return Promise.resolve(false);}});
vm.runInContext(fn('loiAgreementType')+'\n'+fn('confirmAndSubmitLOI'),legalContext);
for(const type of ['PSA','LOI']){
 legalContext.confirmAndSubmitLOI('123',{Name:'Example Acreage'},{ready:true,missing:[]},{Agreement_Type:type});
 const confirmation=confirmations.at(-1);
 assert.equal(confirmation.title,'Submit this '+type+' to Legal?');
 assert.ok(confirmation.steps[0].includes('ACQ ('+type+')'));
 assert.ok(confirmation.steps[1].startsWith('The '+type+' will be generated'));
}
console.log('Word download, shared PSA/LOI selection, template field contracts, fractional price words and download-only boundaries passed.');
