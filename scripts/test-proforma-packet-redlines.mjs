import assert from 'node:assert/strict';
import fs from 'node:fs';
import {packetRuntime} from './lib/deluge-pdf-test-runtime.mjs';

export const fixture={
  Add_Pro_Forma:[{ID:1,Name:'Corsicana Trails (test fixture)',Owner:[{ID:10},{ID:11}],Total_Acres:182,Land_Cost_Acre:21978,Land_Cost:3999996,Lots:675,Total_Income:61134407,Total_Expenses:23808036,Net_Profit:37326371}],
  User_Access:[{ID:10,Full_Name:'Paul Shepherd'},{ID:11,Full_Name:'Travis Moltz'}],
  Budget_Approvals:[{ID:2,Proforma:1,Title:'VP',Approver:'VP test'}],
  LOI_Worksheet:[{ID:3,Proforma:1,Is_Current:true,Earnest_Money:50000,Earnest_Money_Due_Days:90,Special_Provisions:'Minimum 70 acres at first closing.'}],
  Proforma_Item:Array.from({length:17},(_,i)=>({ID:100+i,Pro_Forma_Dev:1,Department:'Development',Category:'Amenities',Item_Name:'Cost item '+(i+1),Cost_Code:4000+i,Add_l_Cost:1000+i,Start_Phase:1,End_Phase:4,Cost_Application:'Construction End',Description:i%4===0?'Item-specific note '+(i+1):''})),
  Land_Installments:[...Array.from({length:24},(_,i)=>({ID:200+i,Pro_Forma_PID_MUD:1,Type1:'PID/MUD',Month1:26+i*12,Cost:1000+i})),{ID:300,Pro_Forma_PID_MUD:1,Type1:'Purchase',Month1:1,Cost:99999999},{ID:301,Pro_Forma_PID_MUD:99,Type1:'PID/MUD',Month1:1,Cost:88888888}],
  Comment_Log:[],Builder:[],Property:[]
};
export function buildFixture(data=fixture){
  const r=packetRuntime(process.cwd(),data);
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
assert.ok(!texts.includes('Not provided (90'));
assert.equal(result.commentCount,0);
assert.ok(!texts.includes('Pro Forma Comment History'));
assert.equal(pages.length,4,'dashboard, two-column costs, reimbursements, Offer');
assert.ok(!texts.includes('$99,999,999')&&!texts.includes('$88,888,888'),'exclude wrong type and other Pro Forma');
assert.ok(texts.includes('$24,276'),'total only eligible installments');
assert.ok(r.draws.some(x=>x.x===640&&x.text.includes('Cost item')),'costs reach right column');
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
