import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Feed the actual native workbook producer's response through the actual widget
// download handler and reopen the resulting ZIP/OOXML bytes with the XLSX reader.
export async function verifyPODownload(native,options={}){
  const source=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8');
  const start=source.indexOf('async function downloadSavedPurchaseOrder(');
  const handler=source.slice(start,source.indexOf('\n}',start)+2),downloads=[],calls=[];
  const c=vm.createContext({Blob,Set,console,requireBudgetRequestDetail:()=>true,budgetCreateScope:()=> 'production:actor',savedPurchaseOrderRequest:()=>true,
    S:{edBudget:{ID:native.budgetId},edPhaseIdx:0,myAccessId:'actor-id',checkWireRequestsByBudget:{[native.budgetId]:[{ID:native.id}]},checkWireRequestState:{[native.budgetId]:'loaded'}},
    poDownloads:new Set(),unwrapBudgetManageResponse:value=>value,sdkRunBudgetFunction:async(name,args)=>{calls.push([name,JSON.parse(args.payload)]);return {...native,contract:'po-v1'};},
    triggerBlobDownload:(blob,name)=>downloads.push({blob,name}),toastShow:message=>{throw new Error(message);}});
  vm.runInContext(fs.readFileSync('widgets/land-master/src/app/vendor/xlsx.full.min.js','utf8'),c);
  c.budgetWorkbookLibrary=async()=>c.XLSX;
  vm.runInContext(handler,c);
  const button={innerHTML:'download',isConnected:true,setAttribute(){},removeAttribute(){}};
  await c.downloadSavedPurchaseOrder(native.id,button);
  assert.deepEqual(calls,[['managePurchaseOrder',{action:'Download',id:native.id,budgetId:native.budgetId,userAccessId:'actor-id'}]]);
  assert.equal(downloads.length,1);assert.equal(button.disabled,false);
  const file=downloads[0],bytes=Buffer.from(await file.blob.arrayBuffer());
  assert.equal(file.name,'Purchase_Order_'+native.id+'.xlsx');assert.equal(bytes.subarray(0,4).toString('hex'),'504b0304');
  assert.equal(file.blob.type,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  const round=c.XLSX.read(Array.from(bytes),{type:'array',cellNF:true,cellStyles:true});
  assert.equal(round.bookType,'xlsx');assert.ok(round.SheetNames.includes('Purchase Order'));
  if(options.revised){
    assert.deepEqual(Array.from(round.SheetNames),['Purchase Order','Original Lines','Original Budget Elements']);const consolidated=round.Sheets['Purchase Order'];assert.equal(consolidated.A1.v,'Revised Purchase Order '+native.id);assert.equal(consolidated.I2.v,options.approvedTotal);assert.equal(consolidated.A4.v,native.id);assert.equal(consolidated.A4.t,'s');assert.equal(consolidated.B4.v,options.costCode);assert.equal(consolidated.B5.v,options.costCode,'A supplement can reuse the exact original cost code');assert.match(consolidated.A5.v,/Supplement 1/);assert.equal(consolidated.D5.v,'More work on the original cost code $& scope');assert.equal(consolidated.D5.t,'s');assert.equal(round.Sheets['Original Lines'].B5.v,options.originalTotal);return;
  }
  const sheet=round.Sheets['Purchase Order'];assert.equal(sheet.E3.t,'s');assert.equal(sheet.E3.v,native.id,'Creator identity remains text');
  assert.equal(sheet.B5.v,55);assert.match(sheet.B5.z,/0\.00/,'Currency formatting survives');
  assert.equal(sheet.A8.v,'C_CAR01-4410-5');assert.equal(sheet.B8.v,'Tanks & valves');assert.equal(sheet.C8.v,"Changed <description> O'Brien scope='literal'",'Attribute normalization never rewrites user text');
  assert.equal(sheet.C9.v,'=1+1');assert.equal(sheet.C9.t,'s');assert.equal(sheet.C9.f,undefined,'Descriptions cannot turn into formulas');
  assert.equal(sheet.F8.v,'(5) Other');assert.equal(sheet.D8.v,2);assert.equal(sheet.G8.v,10);assert.equal(sheet.H8.v,20);assert.equal(sheet.H9.v,35);
  assert.equal(sheet.D9,undefined,'Blank quantity stays blank');assert.equal(sheet.G9,undefined,'Blank unit price stays blank');
  assert.equal(sheet.H10.f,'SUM($H$8:$H$9)');assert.equal(sheet.H10.v,55,'Saved exact total and SUM formula survive');
  assert.equal(sheet['!merges'][0].e.c,7);assert.equal(sheet['!rows'][0].hpt,22,'Compact row height survives');
  assert.ok(sheet['!cols'][0].wpx>100,'Column widths survive');assert.match(sheet.B4.z,/mm\/dd\/yy/,'Native dates remain formatted numeric dates');
  if(native.content.includes('(1) Labor')){
    assert.ok(round.SheetNames.includes('Budget Elements'));
    const values=c.XLSX.utils.sheet_to_json(round.Sheets['Budget Elements'],{header:1});
    assert.deepEqual(Array.from(values[0]),['Budget Item','Element','Final','Approved Mods','Modified Budget','Existing POs','Available','Current Bud Mod','This PO','Remaining']);
    for(const row of values.slice(1))if(row[6]!=null&&row[7]!=null&&row[8]!=null&&row[9]!=null)assert.ok(Math.abs(row[9]-(row[6]+row[7]-row[8]))<0.000001,'XLSX Remaining includes Current Bud Mod');
    for(const label of ['(1) Labor','(2) Materials','(3) Equipment','(4) Subcontractor','(5) Other'])assert.ok(values.some(row=>row.includes(label)),label);
  }
  if(process.env.LM_PO_DOWNLOAD_FIXTURE)fs.writeFileSync(process.env.LM_PO_DOWNLOAD_FIXTURE,bytes);
  return {bytes,round};
}
