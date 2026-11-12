// Actual attachment loaders/controller/renderer with a manually ordered sample
// transport for desktop verification in the agent-owned in-app browser.
import fs from 'node:fs';
import http from 'node:http';
const app='widgets/budget-manager/src/app/',html=fs.readFileSync(app+'widget.html','utf8');
function source(name){const start=html.indexOf('function '+name+'('),line=html.indexOf('\n',start);return html.slice(start,html.slice(start,line).trimEnd().endsWith('}')?line:html.indexOf('\n}',start)+2);}
const methods=['budgetFeature','invalidateBudgetFeature','loadBudgetFeature','attachmentLinksReady','ensureRequestAttachments','loadBudgetAttachments','budgetAttachments','canAddBudgetAttachment','requestAttachmentWritesLocked','requestAttachmentContextMatches','renderAttachmentPage','attachmentExt','attachmentIconSvg','attachmentInlineStateHtml','esc','escAttr','cleanVal','requestAttachmentSurfaceCurrent','attachmentSurfaceCurrent','renderAttachmentSurface'];
const fixture=`<!doctype html><meta charset="utf-8"><title>PO Attachment Read Race Verification</title>
<style>${html.match(/<style>([\s\S]*?)<\/style>/)[1]}
body{display:block;padding:32px;font-size:14px;background:#edf2f8}main{max-width:960px;margin:auto}h1{font-size:24px}nav{display:flex;gap:10px;flex-wrap:wrap;margin:20px 0}#surface{background:white;border:1px solid #c9d8ec;border-radius:12px;overflow:hidden;min-height:420px}#surface h2{margin:0;padding:22px;background:#143663;color:white;font-size:22px}#log{white-space:pre-wrap;margin-top:16px}.request-attachment-footer{display:none}</style>
<link rel="stylesheet" href="/request-attachments.css"><script src="/request-attachments.js"></script>
<main><h1>Construction Budgeting · PO attachments</h1><p>Sample transport, shipped loaders and interface. No Creator writes.</p>
<nav><button class="btn" id="cap">Resolve access</button><button class="btn" id="old">Resolve older read</button><button class="btn" id="latest">Resolve current read</button><button class="btn" id="refresh">Refresh files</button><button class="btn" id="fail">Fail current read</button></nav>
<div id="surface"><h2>Purchase Order · ACT Pipe &amp; Supply</h2><div id="details">Eagle Prairie · Phase 01</div></div><div id="log" role="status"></div></main><script>
var S={features:{},myAccessId:'19',edBudget:{ID:'4410926000002289002'},attachmentsByBudget:{},attachmentBusy:false},attachmentLinkStates={},attachmentAssociationReview=null,reads=[],capResolve;
var CFG={reports:{attachments:'All_Attachments'},attachmentBudgetField:'Budget',attachmentFileField:'File_field1'};
var canEditBudget=()=>false,canActApproval=()=>false,attachmentLinkScope=()=> 'production|construction',budgetBadgeScope=()=> 'production|construction',budgetNavigationToken=()=>1,phaseName=()=> 'Eagle Prairie · Phase 01';
var syncBudgetAttachmentButtons=()=>{},syncRequestAttachmentCounts=()=>{if(ui)ui.refresh();};
var attachmentRecordBudgetId=row=>row.Budget.ID,normalizeBudgetAttachmentRecord=row=>({...row,budgetId:row.Budget.ID});
var callAttachmentLink=()=>new Promise(resolve=>{capResolve=resolve;});
function report(){document.querySelector('#log').textContent=reads.map((r,i)=>(i+1)+': '+(r.done?'settled':'pending')+(r.options.fields.includes('Payment_Request')?' · request fields':' · Budget fields')).join('\\n');}
var sdkGetAllRecords=(reportName,criteria,options)=>new Promise((resolve,reject)=>{reads.push({resolve,reject,options,done:false});report();});
${methods.map(source).join('\n')}
var ui=LMRequestAttachments.create({scope:()=> 'production|construction',files:budgetAttachments,loaded:b=>attachmentLinksReady(b.ID)&&budgetFeature('attachments:'+b.ID).status==='loaded',canStage:canAddBudgetAttachment,busy:()=>false,renderFiles:renderAttachmentPage,load:ensureRequestAttachments});
var file={ID:'91',Budget:{ID:S.edBudget.ID},recordId:'91',paymentRequestId:'71',modificationId:'',name:'S101438367-0001.pdf',addedUser:'Samuel Spears',addedTime:'11/11/2026'};
var older=loadBudgetAttachments(S.edBudget.ID,false).catch(e=>{document.querySelector('#log').textContent+='\\nERROR: '+e.message;});
var surface=ui.mount({root:document.querySelector('#surface'),details:document.querySelector('#details'),model:{attachmentTab:'files'},budget:S.edBudget,kind:'payment',id:'71',requestType:'Purchase Order',current:()=>true});
function settle(row,fail){if(!row||row.done)return;row.done=true;if(fail)row.reject(Error('Permission denied by sample transport'));else row.resolve([file]);report();}
document.querySelector('#cap').onclick=()=>capResolve({ok:true,budgetId:S.edBudget.ID,canWrite:false,canAttachPO:true});
document.querySelector('#old').onclick=()=>settle(reads[0]);document.querySelector('#latest').onclick=()=>settle(reads[reads.length-1]);document.querySelector('#fail').onclick=()=>settle(reads[reads.length-1],true);
document.querySelector('#refresh').onclick=()=>{loadBudgetAttachments(S.edBudget.ID,true).catch(()=>{});ui.refresh();};
</script>`;
http.createServer((req,res)=>{const name=req.url.slice(1).split('?')[0];if(!name){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fixture);}else if(/^request-attachments\.(js|css)$/.test(name)){res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':'text/css');res.end(fs.readFileSync(app+name));}else{res.writeHead(404);res.end();}}).listen(32197,'127.0.0.1',()=>console.log('PO attachment race verification: http://127.0.0.1:32197'));
