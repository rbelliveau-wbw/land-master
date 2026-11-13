import assert from 'node:assert/strict';
import fs from 'node:fs';
import {packetRuntime} from './lib/deluge-pdf-test-runtime.mjs';

const fixture={
  Add_Pro_Forma:[{ID:1,Name:'Ed Poe Duplexes',Status:'Approved',Owner:[{ID:10}],Lots:42,Total_Acres:24.31,Land_Cost:500008,Total_Income:2898000,Total_Expenses:1415658,Net_Profit:1482342}],
  User_Access:[{ID:10,Full_Name:'Max Turner'},
    {ID:11,Full_Name:'Alex Morgan',Approver_Email:'alex@example.com'},
    {ID:12,Full_Name:'Jamie Taylor',User:'jamie@example.com'},
    {ID:13,Full_Name:'Casey Lee',Approver_Email:'casey@example.com'}],
  Budget_Approvals:[
    {ID:2,Proforma:1,Sort_Order:1,Title:'VP',Approver:'alex@example.com',Status:'Approved'},
    {ID:3,Proforma:1,Sort_Order:2,Title:'CFO',Approver:'jamie@example.com',Status:'Approved'},
    {ID:4,Proforma:1,Sort_Order:3,Title:'CEO',Approver:'casey@example.com',Status:'Approved'},
    {ID:99,Proforma:99,Sort_Order:1,Title:'WRONG ROUTE',Approver:'wrong@example.com',Status:'Approved'}],
  Proforma_Item:[],LOI_Worksheet:[],Builder:[],Property:[],Land_Installments:[],Lot_Mix_Row:[],Comment_Log:[]
};
function build(data){const r=packetRuntime(process.cwd(),data);const result=r.run('thisapp.PF_Build_Proforma_Approval_PDF("1","2")');assert.equal(result.success,true,result.message);return {r,result};}
let {r,result}=build(fixture);
const find=text=>r.draws.find(x=>x.text===text);
assert.deepEqual([find('VP - Alex Morgan').x,find('CFO - Jamie Taylor').x,find('CEO - Casey Lee').x],[244,350,244]);
assert.equal(find('VP - Alex Morgan').y,find('CFO - Jamie Taylor').y);
assert.equal(find('CEO - Casey Lee').y,find('VP - Alex Morgan').y-19);
assert.equal(find('Approved By:').size,8.4);
assert.equal(find('VP - Alex Morgan').size,find('Approved By:').size);
assert.ok(find('Fully Approved'));
assert.ok(!r.draws.some(x=>x.text.includes('WRONG ROUTE')));
const pending=structuredClone(fixture);pending.Add_Pro_Forma[0].Status='Pending Approval';pending.Budget_Approvals[2].Status='Pending';
const pendingBuild=build(pending);assert.ok(pendingBuild.r.draws.some(x=>x.x===244&&x.y===707.5&&x.text==='Pending'));
assert.ok(!pendingBuild.r.draws.some(x=>x.text==='Fully Approved'));
const overflow=structuredClone(fixture);
overflow.Budget_Approvals=Array.from({length:8},(_,i)=>({ID:2+i,Proforma:1,Sort_Order:1+i,Title:'Approver '+(i+1),Approver:'avery.long.approver.address.'+i+'@example.com',Status:i===7?'Rejected':'Approved'}));
const full=build(overflow);
assert.ok(full.r.draws.some(x=>x.text==='Approval Details - Approver 8'));
assert.ok(full.r.draws.some(x=>x.text.includes('avery.long.approver.address.7@example.com')));
const header=full.r.draws.filter(x=>x.x>=244&&x.x<=350&&x.y>=682&&x.y<=748&&x.size===8.4);
assert.equal(header.filter(x=>x.text.endsWith('...')).length,6);
assert.ok(header.every(x=>x.y>=688.5));
console.log('Approved By: two columns, metadata size, names, actual status, route scope and overflow passed.');
if(process.env.PF_APPROVAL_PREVIEW)fs.writeFileSync(process.env.PF_APPROVAL_PREVIEW,result.pdfText,'binary');
