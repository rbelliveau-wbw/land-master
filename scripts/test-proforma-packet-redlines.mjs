import assert from 'node:assert/strict';
import fs from 'node:fs';
import {packetRuntime} from './lib/deluge-pdf-test-runtime.mjs';

export const fixture={
  Add_Pro_Forma:[{ID:1,Name:'Corsicana Trails (test fixture)',Owner:[{ID:10},{ID:11}],Total_Acres:182,Land_Cost_Acre:21978,Land_Cost:3999996,Lots:675,Total_Street_LF:20896,Ft_St_per_Lot:30.96,Est_Lots_per_Acre:3.71,Total_Income:61134407,Total_Expenses:23808036,Net_Profit:37326371,Construction_Cost_Addl:4600000,Lots_per_Month:7}],
  User_Access:[{ID:10,Full_Name:'Paul Shepherd'},{ID:11,Full_Name:'Travis Moltz'}],
  Budget_Approvals:[{ID:2,Proforma:1,Title:'VP',Approver:'VP test'}],
  LOI_Worksheet:[{ID:3,Proforma:1,Is_Current:true,Earnest_Money:50000,Earnest_Money_Due_Days:90,Special_Provisions:'Minimum 70 acres at first closing.'}],
  Proforma_Item:Array.from({length:17},(_,i)=>({ID:100+i,Pro_Forma_Dev:1,Department:'Development',Category:'Amenities',Item_Name:'Cost item '+(i+1),Cost_Code:4000+i,Add_l_Cost:1000+i,Start_Phase:1,End_Phase:4,Cost_Application:'Construction End',Description:i%4===0?'Item-specific note '+(i+1):''})),
  Land_Installments:[...Array.from({length:24},(_,i)=>({ID:200+i,Pro_Forma_PID_MUD:1,Type1:'PID/MUD',Month1:26+i*12,Cost:1000+i})),{ID:300,Pro_Forma2:1,Type1:'Sale',Month1:30,Percent1:100,Cost:995253},{ID:301,Pro_Forma_PID_MUD:99,Type1:'PID/MUD',Month1:1,Cost:88888888}],
  Lot_Mix_Row:[{ID:350,Pro_Forma:1,Lot_Size_Ft:50,Lot_Count:450},{ID:351,Pro_Forma:1,Lot_Size_Ft:60,Lot_Count:225}],
  Comment_Log:[],Builder:[],Property:[]
};
export function buildFixture(data=fixture){
  const linked=structuredClone(data);
  for(const pf of linked.Add_Pro_Forma){
    pf.Additional_Costs_Development ??= (linked.Proforma_Item||[]).filter(item=>String(item.Pro_Forma_Dev)===String(pf.ID));
    pf.Additional_Costs_Construction ??= (linked.Proforma_Item||[]).filter(item=>String(item.Pro_Forma_Const)===String(pf.ID));
  }
  const r=packetRuntime(process.cwd(),linked);
  const result=r.run('thisapp.PF_Build_Proforma_Approval_PDF("1","2")');
  assert.equal(result.success,true,result.message);
  const pages=JSON.parse(JSON.stringify(r.run('capturedPages')));
  return {r,result,pages};
}
const {r,result,pages}=buildFixture();
const texts=r.draws.map(x=>x.text).join('\n');
assert.ok(texts.includes('Paul Shepherd, Travis'));
assert.ok(texts.includes('Moltz'));
assert.ok(!texts.includes('DEAL ECONOMICS'));
assert.ok(texts.includes('90 days after execution'));
assert.ok(texts.includes('Sep 21, 2026'),'missing stored Effective Date defaults to the packet generation date');
assert.ok(!texts.includes('Not provided (90'));
assert.equal(result.commentCount,0);
assert.ok(!texts.includes('Pro Forma Comment History'));
assert.equal(pages.length,4,'dashboard, three-column costs, reimbursements, Offer');
assert.ok(!texts.includes('$99,999,999')&&!texts.includes('$88,888,888'),'exclude wrong type and other Pro Forma');
assert.ok(texts.includes('$24,276'),'total only eligible installments');
assert.ok(r.draws.some(x=>x.x>=440&&x.text.includes('Cost item')),'costs flow beyond the first of three columns');
for(const label of ['LAND PURCHASE / INSTALLMENTS','PID / MUD REIMBURSEMENTS','FT. ST. / LOT','ESTIMATED PURCHASE','ENGINEERING START / DELAY','RECURRING TAKEDOWN','LOT MIX','CONST ADD\'L COST / LOT','LAND SALE INSTALLMENT DETAILS'])assert.ok(texts.includes(label),label);
assert.ok(texts.includes('7/month'),'recurring takedown remains monthly');
assert.ok(texts.includes('50s: 450, 60s: 225'),'lot mix is sourced from persisted child rows');
assert.ok(texts.includes('$6,815'),'construction additional cost per lot is Construction Add\'l divided by lots');
assert.ok(texts.includes('Comments')===false,'empty comments do not add a page');
for(const label of ['Authorized Signer','Buyer/Seller Brokers','Purchasing Company','Acquisition Email','Property/Location','County/City','CAD/Property ID','Parcel Acres','Seller Assignment','Initial Feasibility','Assumed Effective Date'])assert.ok(texts.includes(label),label);

const repeatedProperties=structuredClone(fixture);
repeatedProperties.Property=Array.from({length:4},(_,i)=>({ID:500+i,Proforma:1,Common_Name:'Parcel '+(i+1),Property_ID:String(48065+i),County:'Multiple',City:'Corsicana',Acres:45.5}));
const repeated=buildFixture(repeatedProperties),repeatedText=repeated.r.draws.map(x=>x.text).join('\n');
assert.ok(repeatedText.includes('Multiple / Corsicana'),'County/City displays each shared value once');
assert.ok(!repeatedText.includes('Multiple, Multiple')&&!repeatedText.includes('Corsicana, Corsicana'),'County/City removes repeated property values');
const missingDevelopment=structuredClone(fixture);
missingDevelopment.Add_Pro_Forma[0].Entitlement_Engineering_Addl=1119390;
missingDevelopment.Proforma_Item=[{ID:901,Pro_Forma_Const:1,Department:'Construction',Category:'Streets',Item_Name:'Roads',Add_l_Cost:4600000}];
const missingDevelopmentText=buildFixture(missingDevelopment).r.draws.map(x=>x.text).join('\n');
assert.ok(missingDevelopmentText.includes('DEVELOPMENT ADD\'L COSTS')&&missingDevelopmentText.includes('$1,119,390'),'persisted Development total survives absent child rows');
assert.ok(missingDevelopmentText.includes('Development item rows unavailable'),'missing detail is disclosed rather than invented');
assert.ok(!missingDevelopmentText.includes('Unitemized Development'),'never fabricate an unitemized Development cost');
assert.ok(!missingDevelopmentText.includes('No Development costs'),'nonzero Development costs are never described as absent');
const linkedDevelopment=structuredClone(fixture);
linkedDevelopment.Proforma_Item=[];
linkedDevelopment.Add_Pro_Forma[0].Entitlement_Engineering_Addl=1119390;
linkedDevelopment.Add_Pro_Forma[0].Additional_Costs_Development=[
  {ID:920,Department:'Development',Category:'Full Development',Item_Name:'Design',Cost_Code:4010,Add_l_Cost:119390},
  {ID:921,Department:'Development',Category:'Amenities-DEV',Item_Name:'Park',Cost_Code:4510,Add_l_Cost:1000000}
];
linkedDevelopment.Proforma_Item=linkedDevelopment.Add_Pro_Forma[0].Additional_Costs_Development;
const linkedDevelopmentText=buildFixture(linkedDevelopment).r.draws.map(x=>x.text).join('\n');
for(const name of ['Design','Park'])assert.ok(linkedDevelopmentText.includes(name),'linked Development item '+name+' renders');
assert.ok(!linkedDevelopmentText.includes('Unitemized Development'),'linked rows replace the unitemized fallback');
const engineeringDevelopment=structuredClone(fixture);
engineeringDevelopment.Proforma_Item=[{ID:902,Pro_Forma_Dev:1,Department:'Engineering',Category:'Engineering',Item_Name:'Site design',Add_l_Cost:75000}];
const engineeringDevelopmentText=buildFixture(engineeringDevelopment).r.draws.map(x=>x.text).join('\n');
assert.ok(engineeringDevelopmentText.includes('Site design')&&engineeringDevelopmentText.includes('$75,000'),'non-Construction costs linked to the Development side remain visible');
const groupedReimbursements=structuredClone(fixture);
groupedReimbursements.Add_Pro_Forma[0].Entitlement_Engineering_Addl=1119390;
groupedReimbursements.Proforma_Item=[
  {ID:910,Pro_Forma_Dev:1,Department:'Development',Category:'Full Development',Item_Name:'Design',Add_l_Cost:119390},
  {ID:911,Pro_Forma_Dev:1,Department:'Development',Category:'Amenities-DEV',Item_Name:'Park',Add_l_Cost:1000000},
  {ID:912,Pro_Forma_Dev:1,Department:'Development',Category:'Reimbursements',Item_Name:'Impact Fees: Water',Add_l_Cost:50000},
  {ID:913,Pro_Forma_Dev:1,Department:'Development',Category:'Reimbursements',Item_Name:'Oversizing Agreement',Add_l_Cost:1000000,Description:'Offsite lift station upgrade'},
  {ID:914,Pro_Forma_Const:1,Department:'Construction',Category:'Streets',Item_Name:'Roads',Add_l_Cost:4600000}
];
groupedReimbursements.Land_Installments=[
  {ID:915,Pro_Forma_PID_MUD:1,Type1:'PID/MUD',Month1:26,Cost:514955},
  {ID:916,Pro_Forma_PID_MUD:99,Type1:'PID/MUD',Month1:26,Cost:88888888}
];
const grouped=buildFixture(groupedReimbursements);
const pageHas=(page,value)=>page.includes(Buffer.from(value).toString('hex'));
const costPage=grouped.pages.find(page=>pageHas(page,'Additional Costs, Reimbursements and Notes'));
const pidPage=grouped.pages.find(page=>pageHas(page,'PID / MUD Reimbursements'));
assert.ok(costPage&&pidPage,'Additional Costs and PID/MUD keep separate pages');
for(const value of ['Impact Fees: Water','Oversizing Agreement','Offsite lift station upgrade','IMPACT FEES SUBTOTAL','REIMBURSEMENTS SUBTOTAL'])
  assert.ok(pageHas(costPage,value),value+' belongs on the Additional Costs page');
assert.ok(!pageHas(pidPage,'Impact Fees: Water')&&!pageHas(pidPage,'Oversizing Agreement'),'cost-row reimbursements do not repeat on PID/MUD page');
assert.ok(pageHas(pidPage,'PID / MUD SUBTOTAL')&&pageHas(pidPage,'$514,955'),'PID/MUD has its own scoped subtotal');
assert.ok(costPage.indexOf(Buffer.from('IMPACT FEES').toString('hex'))<costPage.indexOf(Buffer.from('LAND SALE INSTALLMENT DETAILS').toString('hex')),'reimbursements precede Land Sale');
assert.ok(!pageHas(costPage,'Unitemized Development additional cost'),'reimbursement rows do not inflate the Development reconciliation');
const wrapped=Array.from(r.run('thisapp.PF_PDF_Wrap("ABCDEFGHIJKLMNOPQRSTUVWXYZ end",5)'));
assert.equal(wrapped.join('').replaceAll(' ',''),'ABCDEFGHIJKLMNOPQRSTUVWXYZend');
assert.ok(wrapped.every(x=>x.length<=5));
const stress=structuredClone(fixture);
stress.Comment_Log=[{ID:400,Pro_Forma:1,Author_Name:'Test Author',Comment:'First line\n\n'+('Long comment content '.repeat(800))+' FINAL_COMMENT_SENTINEL',Edited:true},{ID:401,Pro_Forma:1,Author_Name:'Other Author',Deleted:true,Comment:'DO_NOT_PRINT_DELETED_CONTENT'},{ID:402,Pro_Forma:99,Author_Name:'Unrelated Author',Comment:'DO_NOT_PRINT_OTHER_PROFORMA'}];
stress.Proforma_Item[0].Description='Long note '.repeat(1000)+' FINAL_NOTE_SENTINEL';
stress.LOI_Worksheet[0].Special_Provisions='Long provision '.repeat(500)+' FINAL_PROVISION_SENTINEL';
const long=buildFixture(stress),longText=long.r.draws.map(x=>x.text).join('\n');
for(const value of ['FINAL_COMMENT_SENTINEL','FINAL_NOTE_SENTINEL','FINAL_PROVISION_SENTINEL','Deleted by user','(edited)'])assert.ok(longText.includes(value),value);
for(const value of ['DO_NOT_PRINT_DELETED_CONTENT','DO_NOT_PRINT_OTHER_PROFORMA'])assert.ok(!longText.includes(value),value);
assert.ok(long.r.draws.every(x=>(x.y>=44&&x.y<=764)||x.y===18), 'content stays above footer; footer is at 18');
assert.equal(long.result.commentCount,2);

const widget=fs.readFileSync('widgets/proforma-manager/src/app/widget.html','utf8');
function extract(name){let start=widget.indexOf('function '+name+'('),end=widget.indexOf('\nfunction ',start+1);return widget.slice(start,end);}
const helpers=new Function(extract('loiToday')+extract('loiValidDate')+'return {loiToday,loiValidDate};')();
assert.match(helpers.loiToday(),/^\d{4}-\d{2}-\d{2}$/);
assert.ok(helpers.loiValidDate('2028-02-29'));
assert.ok(!helpers.loiValidDate('2026-02-29'));
assert.ok(!helpers.loiValidDate('2026-13-01'));
assert.ok(helpers.loiValidDate(''));
console.log('Packet redlines: full fixtures, reimbursement scope, pagination, comments, long text and date validation passed.');
