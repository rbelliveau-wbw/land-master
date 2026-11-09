import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {File} from 'node:buffer';

// Exercise the widget's real orchestration and workbook collector. Only the
// Creator transport, existing attachment uploader and surrounding UI are ports.
const html=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8');
const source=html.slice(html.indexOf('function runBudgetExcelSnapshot('),html.indexOf('function budgetApprovalStatus(',html.indexOf('function runBudgetExcelSnapshot(')));
assert.ok(source.startsWith('function runBudgetExcelSnapshot('));
const moduleSource=fs.readFileSync('widgets/budget-manager/src/app/full-budget-export.js','utf8');
const xlsxSource=fs.readFileSync('widgets/land-master/src/app/vendor/xlsx.full.min.js','utf8');
const budgetId='4410926000001744002';
const plain=value=>JSON.parse(JSON.stringify(value));
// The browser's File and XLSX share one realm; adapt only that boundary when
// passing the VM's ArrayBuffer to Node's File implementation.
class BrowserFile extends File {
  constructor(parts,name,options){super(parts.map(part=>Object.prototype.toString.call(part)==='[object ArrayBuffer]'?new Uint8Array(part):part),name,options);}
}
const labels=['(1) Labor','(2) Materials','(3) Equipment','(4) Subcontractor','(5) Other'];
const records=Array.from({length:227},(_,i)=>({
  id:String(4410926000005000000n+BigInt(i)),
  values:['North Austin','Lakeside at Granger - Phase 01','Construction','3100','Site','03101','Item '+i,'LF',null,0,0,i?100.1234:0,0,0,0,'Saved note'],
  elements:labels.map((label,index)=>({code:String(index+1),label,values:[label,0,0,index===0&&i?100.1234:0,0,index===0&&i?100.1234:0,null,null]}))
}));
const metadata={contract:'budget-snapshot-meta-v1',ok:true,budgetId,summary:{budgetLabel:'Lakeside at Granger - Phase 01',subdivisionCode:'001',territory:'North Austin',exportedDate:'05-Nov-2026',grandFinal:22627.8884},approvals:[{track:'Construction',role:'Manager',approver:'Julie King',status:'Pending',respondedDate:'',notes:''}]};

function harness(options={}){
  const requests=[],uploads=[],refreshes=[],messages=[],toasts=[],autosave=[],audits=[];
  const state={liveSDK:true,currentUser:'jking@wbdevelopment.com',view:'vEditor',edBudget:{ID:budgetId},exportBusy:false,attachmentBusy:false,attachmentUploadReview:null,attachmentModal:null};
  const runtime={environment:'production'},button={title:''};
  let generation=1,scope='original-session',permission=true,detailCalls=0;
  const ports={requests,uploads,refreshes,messages,toasts,autosave,audits,state,runtime,
    navigate(){generation++;},switchBudget(){state.edBudget={ID:'4410926000001744999'};},
    changeScope(){scope='new-session';},deny(){permission=false;}};
  const context=vm.createContext({
    File:BrowserFile,console,S:state,LMRuntime:{current:()=>runtime},attachmentAssociationReview:false,
    budgetNavigationToken:()=>generation,
    budgetNavigationCurrent:(token,view,id)=>token===generation&&state.view===view&&String(state.edBudget?.ID)===id,
    attachmentLinkScope:id=>runtime.environment+':'+state.currentUser+':'+id+':'+scope,
    canAddBudgetAttachment:()=>permission,$:()=>button,
    auditLog:(...entry)=>audits.push(entry),
    CFG:{reports:{categories:'All_Budget_Categories',items:'All_Budget_Items'}},
    rowBelongsToBudget:(row,id)=>row.Budget.ID===id,
    async sdkGetAllRecords(report,criteria,readOptions){
      assert.equal(readOptions.fresh,true);assert.equal(readOptions.isCancelled(),false);
      if(report==='All_Budget_Categories'){
        assert.equal(criteria,'(Budget == '+budgetId+')');
        return [{ID:'4410926000006000001',Budget:{ID:budgetId,display_value:'Phase 01'},Category_Code:'3100',Budget_Category_Name:'Site',Deparment:'Construction',Budget_Total:'22627.8884'}];
      }
      assert.equal(report,'All_Budget_Items');assert.equal(criteria,'(Budget_Category in [4410926000006000001])');
      return records.map(row=>({ID:row.id,Budget_Category:{ID:'4410926000006000001',display_value:'Site'}}));
    },
    async sdkRunBudgetFunction(name,args){
      assert.equal(name,'exportBudgetSnapshot');requests.push(plain(args));
      if(args.exportType==='SNAPSHOT_META'){
        const meta=plain(metadata);if(options.metadata)options.metadata(meta,ports);
        return {code:3000,result:JSON.stringify(meta)};
      }
      if(args.exportType==='SNAPSHOT_DETAIL'){
        detailCalls++;
        const cursor=JSON.parse(args.budgetId);assert.equal(cursor.budgetId,budgetId);
        const start=cursor.after==='0'?0:records.findIndex(row=>row.id===cursor.after)+1;
        assert.ok(start>=0);
        const rows=plain(records.slice(start,start+20));
        const page={contract:'budget-full-detail-v1',ok:true,budgetId,pageSize:20,total:records.length,rows,after:cursor.after,next:rows.at(-1)?.id||cursor.after,through:records.at(-1).id,hasMore:rows.length===20};
        if(options.page)await options.page(page,detailCalls,ports);
        return {code:3000,result:JSON.stringify(page)};
      }
      assert.fail('Manual exports must never invoke the expensive native PDF or EXCEL paths');
    },
    async uploadBudgetAttachments(files,requestContext,transfer){
      assert.equal(requestContext,null);uploads.push(files);
      transfer.started=true;
      if(options.upload)return options.upload(transfer,ports);
      transfer.saved=true;transfer.attachmentId='4410926000007999001';return true;
    },
    cleanVal:value=>String(value??'').trim(),setMsg:(...args)=>messages.push(args),
    budgetPerUnitNavigationAllowed:()=>true,budgetPricingExportIssue:()=>options.pricingIssue||'',
    closeExportDd:()=>{},updateExportButton:()=>{},toastShow:(...args)=>toasts.push(args),
    setEdAutosave:value=>autosave.push(value),
    budgetFunctionResultText:reply=>reply?.result||'',
    refreshBudgetAttachmentRecord:async id=>{refreshes.push(id);},
    shortErr:error=>error?.message||String(error)
  });
  vm.runInContext(moduleSource,context);vm.runInContext(xlsxSource,context);
  vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/budget-snapshot-pdf.js','utf8'),context);
  context.BudgetSnapshotPdf.render=async snapshot=>{
    context.BudgetSnapshotPdf.definition(snapshot);
    if(options.render)await options.render(ports);
    return new TextEncoder().encode('%PDF-fixture').buffer;
  };
  context.budgetWorkbookLibrary=async()=>context.XLSX;
  vm.runInContext(source,context);
  return {...ports,context,get detailCalls(){return detailCalls;},button};
}

const successful=harness();
const result=await successful.context.runExportBudgetSnapshot(budgetId,'EXCEL');
assert.equal(result.budgetId,budgetId);assert.equal(result.batchedBudgetExport,true);
assert.equal(result.attachmentId,'4410926000007999001');
assert.equal(successful.detailCalls,12,'227 saved items are read in twelve bounded detail calls');
assert.equal(successful.requests.length,13,'metadata is one separate read');
assert.equal(successful.uploads.length,1,'one completed workbook uses the established attachment upload');
assert.equal(successful.uploads[0].length,1);
assert.equal(successful.refreshes.length,0,'the confirmed upload is not invalidated by a second optional refresh');
assert.equal(successful.state.exportBusy,false);assert.equal(successful.autosave.at(-1),'saved');
assert.equal(successful.messages.length,0);
assert.equal(successful.requests[1].exportType,'SNAPSHOT_DETAIL');
assert.deepEqual(JSON.parse(successful.requests[1].budgetId),{after:'0',through:'0',budgetId});
for(let index=2;index<successful.requests.length;index++){
  const cursor=JSON.parse(successful.requests[index].budgetId);
  assert.equal(cursor.budgetId,budgetId);assert.equal(cursor.through,records.at(-1).id);
  assert.equal(cursor.after,records[(index-1)*20-1].id);
}
const file=successful.uploads[0][0];
assert.match(file.name,/^Budget_Export_Lakeside_at_Granger_-_Phase_01_\d{8}_\d{6}\.xlsx$/);
assert.equal(file.type,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
const workbook=successful.context.XLSX.read(Array.from(new Uint8Array(await file.arrayBuffer())),{type:'array'});
assert.deepEqual(plain(workbook.SheetNames),['Summary','Budget Detail','Budget Elements','Approval History']);
assert.equal(successful.context.XLSX.utils.sheet_to_json(workbook.Sheets['Budget Detail'],{header:1}).length,228);
assert.equal(successful.context.XLSX.utils.sheet_to_json(workbook.Sheets['Budget Elements'],{header:1}).length,1136);
assert.equal(workbook.Sheets['Budget Detail'].J2.v,0,'the selected snapshot retains saved all-zero items');

for(const [label,change,pattern] of [
  ['navigation',ports=>ports.navigate(),/user or environment changed/],
  ['budget',ports=>ports.switchBudget(),/user or environment changed/],
  ['actor',ports=>{ports.state.currentUser='another@wbdevelopment.com';},/user or environment changed/],
  ['environment',ports=>{ports.runtime.environment='development';},/user or environment changed/],
  ['session',ports=>ports.changeScope(),/user or environment changed/]
]){
  const test=harness({page:(_page,call,ports)=>{if(call===1)change(ports);}});
  await assert.rejects(()=>test.context.runBudgetExcelSnapshot(budgetId),pattern,label+' change aborts the read');
  assert.equal(test.uploads.length,0,label+' change cannot attach to a different context');
}
const revoked=harness({page:(_page,call,ports)=>{if(call===12)ports.deny();}});
await assert.rejects(()=>revoked.context.runBudgetExcelSnapshot(budgetId),/permission/);
assert.equal(revoked.uploads.length,0,'permission is checked again before the attachment write');

for(const [change,pattern] of [
  [meta=>{meta.budgetId='4410926000001744999';},/different budget/],
  [meta=>{delete meta.summary;},/Incomplete budget snapshot metadata/]
]){
  const test=harness({metadata:change});
  await assert.rejects(()=>test.context.runBudgetExcelSnapshot(budgetId),pattern);
  assert.equal(test.uploads.length,0,'wrong or incomplete metadata never reaches attachment creation');
}
for(const mutate of [
  page=>{page.budgetId='4410926000001744999';},
  page=>{page.rows[0].values[11]='100';},
  page=>{page.total++;},
  page=>{throw new Error('Native read failed');}
]){
  const test=harness({page:(page,call)=>{if(call===3)mutate(page);}});
  await assert.rejects(()=>test.context.runBudgetExcelSnapshot(budgetId));
  assert.equal(test.uploads.length,0,'failed or inconsistent detail cannot create a partial attachment');
}
for(const lock of ['attachmentBusy','attachmentUploadReview']){
  const test=harness();test.state[lock]=true;
  await assert.rejects(()=>test.context.runBudgetExcelSnapshot(budgetId),/Recheck the previous attachment action/);
  assert.equal(test.requests.length,0);assert.equal(test.uploads.length,0);
}
const otherModal=harness();otherModal.state.attachmentModal={budgetId:'4410926000001744999'};
await assert.rejects(()=>otherModal.context.runBudgetExcelSnapshot(budgetId),/other budget/);
assert.equal(otherModal.requests.length,0);

const ambiguous=harness({upload:(transfer,ports)=>{
  transfer.saved=false;transfer.safeRetry=false;transfer.message='Upload response was lost. Recheck the attachment.';
  ports.state.attachmentUploadReview={budgetId};return false;
}});
await assert.rejects(()=>ambiguous.context.runBudgetExcelSnapshot(budgetId),error=>error.noReplay===true&&/Recheck/.test(error.message));
assert.equal(ambiguous.uploads.length,1);
await assert.rejects(()=>ambiguous.context.runBudgetExcelSnapshot(budgetId),/Recheck the previous/);
assert.equal(ambiguous.uploads.length,1,'an uncertain upload is never replayed');

const pdf=harness();const pdfResult=await pdf.context.runExportBudgetSnapshot(budgetId,'PDF');
assert.equal(pdfResult.batchedBudgetExport,true);assert.equal(pdf.detailCalls,12);
assert.equal(pdf.uploads.length,1);assert.equal(pdf.uploads[0][0].type,'application/pdf');
assert.match(pdf.uploads[0][0].name,/^Budget_Export_.*\.pdf$/);
assert.equal(pdf.requests.some(request=>request.exportType==='PDF'||request.exportType==='EXCEL'),false);
assert.deepEqual(pdf.refreshes,[],'the shared confirmed upload does not require another acknowledgement');
for(const change of [ports=>ports.navigate(),ports=>ports.switchBudget(),ports=>{ports.state.currentUser='other@example.com';},ports=>{ports.runtime.environment='development';},ports=>ports.changeScope(),ports=>ports.deny()]){
  const test=harness({render:change});
  await assert.rejects(()=>test.context.runBudgetPdfSnapshot(budgetId));
  assert.equal(test.uploads.length,0,'context and permission changes during PDF layout prevent writes');
}
const failedPdf=harness({render:()=>{throw new Error('PDF renderer failed');}});
await assert.rejects(()=>failedPdf.context.runBudgetPdfSnapshot(budgetId),/PDF renderer failed/);assert.equal(failedPdf.uploads.length,0);
const ambiguousPdf=harness({upload:(transfer,ports)=>{transfer.saved=false;transfer.safeRetry=false;ports.state.attachmentUploadReview={budgetId};return false;}});
await assert.rejects(()=>ambiguousPdf.context.runBudgetPdfSnapshot(budgetId),error=>error.noReplay===true);
await assert.rejects(()=>ambiguousPdf.context.runBudgetPdfSnapshot(budgetId),/Recheck the previous/);assert.equal(ambiguousPdf.uploads.length,1);
const busy=harness();busy.state.exportBusy=true;await busy.context.runExportBudgetSnapshot(budgetId,'EXCEL');assert.equal(busy.requests.length,0);
const pending=harness({pricingIssue:'pending'});await pending.context.runExportBudgetSnapshot(budgetId,'EXCEL');assert.equal(pending.requests.length,0);assert.match(pending.messages[0][0],/finish saving/);
console.log('Budget batched export flow: actual widget and collector,227 items/12 reads/four-sheet XLSX and PDF/one upload; context/permission guards, read/renderer failures and no replay of uncertain uploads passed.');
