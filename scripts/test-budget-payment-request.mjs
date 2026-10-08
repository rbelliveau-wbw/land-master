import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8');
function block(name){const start=source.indexOf('function '+name+'('),end=source.indexOf('\n}',start)+2;assert.ok(start>=0&&end>start,name);return source.slice(start,end);}
const budgetId='900000000000000001',itemId='900000000000000002',vendorId='900000000000000003';
const nodes={};const node=id=>nodes[id]||(nodes[id]={innerHTML:'',disabled:false,classList:{add(){},remove(){},toggle(name,on){this[name]=on;}}});
let nav=1,environment='PRODUCTION',response=[];const calls=[];
const c=vm.createContext({S:{startupReady:true,liveSDK:true,edBudget:{ID:budgetId}},Number,JSON,Promise,Error,
  cleanVal:v=>String(v??'').trim(),lookupId:v=>String(v?.ID||v||''),esc:v=>String(v??''),escAttr:v=>String(v??''),
  budgetCreateScope:()=>environment,budgetNavigationToken:()=>nav,renderModModal(){},shortErr:e=>e.message,
  $:node,CFG:{reports:{vendors:'All_Vendors'},creatorHost:'https://creatorapp.zoho.com',creatorOwner:'wbdevelopment',creatorApp:'land-master'},
  LMRuntime:{current:()=>({environment,appLinkName:'land-master'})},
  sdkGetAllRecords:(...args)=>{calls.push(args);return typeof response==='function'?response():Promise.resolve(response);},
  itemModAgg:()=>({approved:25.25})
});c.window=c;
for(const name of ['poDevelopment','requestModalScope','requestModalCurrent','requestVendorUrl','loadRequestVendors','requestVendorLocation','requestVendorDetails','requestVendorRows','requestFinancialValue','requestAmountNumber','requestPurchaseOrderTotal','requestBalanceSnapshot','fmtRequestMoney','fmtRequestMod','renderRequestBalance','loadRequestPurchaseOrders','previewPaymentRequest'])vm.runInContext(block(name),c);
function modal(){const m=c.S.modModal={requestFlow:true,budgetId,itemId,requestType:'Purchase Order',vendorId,requestAmount:'20.01',vendorState:'loaded',vendors:[],poState:'loaded',poItemId:itemId,poIssued:15.25};m.scope=c.requestModalScope(m);return m;}
const item={ID:itemId,Budget_Ttl:'500.25',PROJ_Actual:'100.25'};
let m=modal();assert.equal(c.requestBalanceSnapshot(m,item).after,490.24);
c.itemModAgg=()=>({approved:5});m.poIssued=75;m.requestAmount='30';
const example={ID:itemId,Budget_Ttl:'100',PROJ_Actual:'50'};
assert.equal(c.requestBalanceSnapshot(m,example).remaining,30,'100 + 5 - 75 leaves 30');
assert.equal(c.requestBalanceSnapshot(m,example).after,0,'new PO can use the entire available budget');
assert.equal(c.requestBalanceSnapshot(m,{...example,PROJ_Actual:'75'}).remaining,30,'paying/invoicing a PO does not release or double-deduct its commitment');
assert.equal(c.requestBalanceSnapshot(m,{...example,PROJ_Actual:undefined}).remaining,30,'missing reference GP data does not change issued-PO availability');
m.requestAmount='30.01';c.renderRequestBalance(example);assert.equal(node('requestPreviewBtn').disabled,true);
assert.doesNotMatch(node('requestBalance').innerHTML,/− GP Actuals/,'GP is a reference rather than a second deduction');
c.itemModAgg=()=>({approved:25.25});m=modal();
c.renderRequestBalance(item);assert.match(node('requestBalance').innerHTML,/Revised Final[\s\S]*\$525\.5<\/span>/);assert.match(node('requestBalance').innerHTML,/POs Issued[\s\S]*\$15.25/);
m.requestAmount='510.26';c.renderRequestBalance(item);assert.equal(node('requestPreviewBtn').disabled,true);assert.equal(node('requestBudgetGuard').classList.show,true);assert.match(node('requestBalance').innerHTML,/-\$0.01/);
m.requestAmount='510.25';c.renderRequestBalance(item);assert.equal(node('requestPreviewBtn').disabled,false,'exact balance is allowed');
m.poState='unavailable';c.renderRequestBalance(item);assert.equal(node('requestPreviewBtn').disabled,true);assert.doesNotMatch(node('requestBalance').innerHTML,/\$0(?:<|\.)/,'unavailable is never a zero balance');
m.poState='loaded';m.poItemId='another';assert.equal(c.requestBalanceSnapshot(m,item),null);m.poItemId=itemId;
assert.equal(c.requestBalanceSnapshot(m,{...item,Budget_Ttl:undefined}),null);assert.equal(c.requestBalanceSnapshot(m,{...item,PROJ_Actual:'invalid'}).actual,null);
for(const bad of ['20.001','-1','invalid','1e3'])assert.equal(c.requestAmountNumber(bad),0);assert.equal(c.requestAmountNumber('$1,250.25'),1250.25);
const po={ID:'900000000000000004',Budget:{ID:budgetId},Budget_Item:{ID:itemId},Request_Type:'Purchase Order',Request_Amount:'12.25'};
assert.equal(c.requestPurchaseOrderTotal([po,{...po,ID:'900000000000000005',Request_Amount:'20.50'}],budgetId,itemId),32.75);
assert.equal(c.requestPurchaseOrderTotal([],budgetId,itemId),0);
for(const bad of [{ID:900000000000000004},{Budget:{ID:'elsewhere'}},{Budget_Item:{ID:'elsewhere'}},{Request_Type:'Check'},{Request_Amount:undefined},{Request_Amount:''},{Request_Amount:'-1'},{Request_Amount:'invalid'}])assert.throws(()=>c.requestPurchaseOrderTotal([{...po,...bad}],budgetId,itemId));
assert.throws(()=>c.requestPurchaseOrderTotal([po,po],budgetId,itemId),/do not match/);
response=[{ID:vendorId,Vendor_Name:'Existing Vendor',City:'Georgetown',State:'TX',Contact_Name:'Vendor Contact'}];m=modal();await c.loadRequestVendors(m);assert.equal(m.vendors[0].ID,vendorId);assert.equal(calls.at(-1)[2].fresh,true);assert.deepEqual(Array.from(calls.at(-1)[2].fields),['ID','Vendor_Name','Vendor_ID','Contact_Name','Primary_Phone','Alternate_Phone','Address_Line_1','Address_Line_2','Address_Line_3','City','State','ZIP_Postal_Code','Country','Payment_Terms']);
m.vendorSearch='Georgetown';assert.match(c.requestVendorRows(m),/Existing Vendor/);
m.vendorSearch='Vendor Contact';assert.match(c.requestVendorRows(m),/Existing Vendor/);
assert.match(c.requestVendorDetails(response[0]),/Vendor Contact/);assert.match(c.requestVendorDetails(response[0]),/Not provided/);assert.doesNotMatch(c.requestVendorDetails(response[0]),/Email/);
m.vendorPreviewId=vendorId;response=[];await c.loadRequestVendors(m);assert.equal(m.vendorPreviewId,'','refresh removes a candidate that no longer exists');
response=[{ID:900000000000000003,Vendor_Name:'Rounded'}];await c.loadRequestVendors(m);assert.equal(m.vendorState,'unavailable');
let resolve;response=()=>new Promise(r=>resolve=r);m=modal();const dismissed=c.loadRequestVendors(m);c.S.modModal=null;resolve([{ID:vendorId,Vendor_Name:'Late'}]);await dismissed;assert.equal(c.S.modModal,null);
for(const change of [()=>nav++,()=>environment='DEVELOPMENT',()=>c.S.edBudget={ID:'different'},()=>c.S.startupReady=false]){
  environment='PRODUCTION';c.S.edBudget={ID:budgetId};c.S.startupReady=true;m=modal();const pending=c.loadRequestVendors(m);change();resolve([{ID:vendorId,Vendor_Name:'Late'}]);await pending;assert.equal(m.vendorState,'loading','stale scope cannot publish');
}
c.S.startupReady=true;environment='PRODUCTION';assert.equal(c.requestVendorUrl(),'https://creatorapp.zoho.com/wbdevelopment/land-master/#Form:Vendors');environment='DEVELOPMENT';assert.match(c.requestVendorUrl(),/\/environment\/development\/land-master\/#Form:Vendors/);
c.S.edBudget={ID:budgetId};c.CFG.reports.checkWireRequests='All_Wire_Requests';environment='STAGE';m=modal();response=[];
await c.loadRequestPurchaseOrders(m);assert.equal(m.poState,'loaded');assert.equal(m.poIssued,0);
assert.equal(calls.at(-1)[0],'All_Wire_Requests');assert.match(calls.at(-1)[1],new RegExp('Budget == '+budgetId));assert.match(calls.at(-1)[1],new RegExp('Budget_Item == '+itemId));assert.match(calls.at(-1)[1],/Request_Type == "Purchase Order"/);assert.equal(calls.at(-1)[2].fresh,true);
response=[po];await c.loadRequestPurchaseOrders(m);assert.equal(m.poState,'loaded');assert.equal(m.poIssued,12.25,'every issued PO reserves its full amount');
response=()=>new Promise(r=>resolve=r);m=modal();const latePO=c.loadRequestPurchaseOrders(m);m.itemId='900000000000000099';resolve([]);await latePO;assert.equal(m.poState,'loading','old line item replies cannot publish');
response=()=>Promise.reject(new Error('Incomplete count'));m=modal();await c.loadRequestPurchaseOrders(m);assert.equal(m.poState,'unavailable');assert.equal(c.requestBalanceSnapshot(m,item),null);
// Development and Production consume verified allocations, never parent headers twice.
environment='DEVELOPMENT';c.S.myAccessId='900000000000000007';
c.unwrapBudgetManageResponse=v=>v;
let native={contract:'po-v1',success:true,balances:[{budgetItemId:itemId,issuedCents:'725'}]};
c.sdkRunBudgetFunction=async(name,args)=>{assert.equal(name,'managePurchaseOrder');const request=JSON.parse(args.payload);assert.equal(request.action,'Balances');assert.equal(request.budgetId,budgetId);assert.equal(request.userAccessId,c.S.myAccessId);return native;};
for(const env of ['DEVELOPMENT','PRODUCTION']){environment=env;m=modal();await c.loadRequestPurchaseOrders(m);assert.equal(m.poState,'loaded');assert.equal(m.poIssued,7.25);}
for(const invalid of [{...native,success:false},{...native,balances:[]},{...native,balances:[native.balances[0],native.balances[0]]},{...native,balances:[{budgetItemId:itemId,issuedCents:'9007199254740992'}]},{...native,balances:[{budgetItemId:itemId,issuedCents:725}]}]){native=invalid;m=modal();await c.loadRequestPurchaseOrders(m);assert.equal(m.poState,'unavailable');}
console.log('Payment request vendor reads, string IDs, stale scope, receipt math, one-cent overspending and unavailable balances passed.');
