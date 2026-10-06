import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {ready,ID,ACCESS} from './test-contract-sdk-v2-foundation.mjs';
const user={id:ACCESS,label:'jking_wbdevelopment',email:'jking@wbdevelopment.com',fullName:' Jean_Marie King '};
const {c}=await ready({realDOM:true});c.S.users=[user];
assert.equal(c.ncUserLabel(ACCESS),'Jean_Marie King');
const row={...c.findContract(ID),Owner:[{ID:ACCESS,display_value:user.label}],Subdivision1:[]};
assert.deepEqual(Array.from(c.ownerNames(row)),['Jean_Marie King']);
assert.match(c.ownerCell(row),/Jean_Marie King/);assert.equal(c.ncOwnerOptions()[0].v,ACCESS);
assert.equal(c.ncOwnerOptions()[0].label,'Jean_Marie King');
c.ownerEdit(ID);assert.match(c.document.getElementById('overlays').innerHTML,/Jean_Marie King/);
assert.doesNotMatch(c.drillRow(row),/<span>Subdivision<\/span>/);
assert.match(c.drillRow({...row,Subdivision1:[{ID:'s',display_value:'Selected phase'}]}),/<span>Subdivision<\/span>/);
assert.equal(user.label,'jking_wbdevelopment','identity label unchanged');
assert.equal(c.ncRosterName({...user,fullName:''}),'jking');
assert.equal(c.ncRosterName({...user,fullName:'',Full_Name:{first_name:'Jean',last_name:'King'}}),'Jean King');
function load(slug,names){
 const source=fs.readFileSync('widgets/'+slug+'/src/app/widget.html','utf8');
 const context=vm.createContext({S:{users:[user],accessUsers:[user],currentUser:'other',myAccessId:''}});
 for(const name of names){const start=source.indexOf('function '+name+'(');assert.ok(start>=0,name);const firstEnd=source.indexOf('\n',start);const end=source.slice(start,firstEnd).trim().endsWith('}')?firstEnd:source.indexOf('\n}',start)+2;vm.runInContext(source.slice(start,end),context);}
 return context;
}
const b=load('budget-manager',['rosterFullName','ownerShort','budgetOwnerName','ownerLabelForId','ownerEmailForId','availableOwnerUsers']);
assert.equal(b.ownerLabelForId(ACCESS),'Jean_Marie King');assert.equal(b.ownerEmailForId(ACCESS),'jking@wbdevelopment.com');
assert.equal(b.availableOwnerUsers()[0].id,ACCESS);assert.equal(b.budgetOwnerName({...user,fullName:''}),'jking');
assert.equal(b.budgetOwnerName({...user,fullName:'',Full_Name:'Jane Doe'}),'Jane Doe');
const p=load('proforma-manager',['rosterFullName','ownerDisplayName','ownerRosterName','ownerLabel']);
assert.equal(p.ownerLabel(ACCESS),'Jean_Marie King');assert.equal(p.ownerRosterName({...user,fullName:''}),'jking');
assert.equal(p.ownerRosterName({...user,fullName:'',Full_Name:{first_name:'Jane',last_name:'Doe'}}),'Jane Doe');
for(const name of ['getUserAccess','getUserAccessLean'])assert.match(fs.readFileSync('creator/functions/'+name+'.dg','utf8'),/m.put\("fullName",ifnull\(r.Full_Name/);
console.log('PASS full User Access names across Contracts/Budget/Pro Forma owner displays and pickers, exact IDs/raw email identity, fallback names and optional Subdivision facts.');
