import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const context=vm.createContext({});
vm.runInContext(fs.readFileSync('shared/creator-data.js','utf8'),context);
const {confirmDeletion}=context.LMData,ID='90071992547409941',OTHER='90071992547409942';
for(const response of [{code:3000,data:{ID}},{code:3000,result:[{code:3000,data:{ID}}]}]){
  assert.equal(await confirmDeletion(response,[ID],()=>{throw Error('Normal acknowledgement must not reread');}),response);
}
const ids=Array.from({length:200},(_,index)=>(BigInt(ID)+BigInt(index)).toString()),batch={code:3000,result:ids.map(ID=>({code:3000,data:{ID}}))};
assert.equal(await confirmDeletion(batch,ids,()=>{throw Error('Exact 200-ID acknowledgement must not reread');}),batch);
// Captured from the successful Development deletion on November 11, 2026:
// Creator returned the record ID as an unsafe number, losing its final digits.
{
  const captured='4410926000005950006',response={result:[{code:3000,data:{ID:4410926000005950000},message:'Record Deleted Successfully'}],code:3000};
  assert.equal(Number.isSafeInteger(response.result[0].data.ID),false);
  assert.notEqual(String(response.result[0].data.ID),captured);
  let reads=0;
  assert.equal(await confirmDeletion(response,[captured],targets=>{reads++;assert.deepEqual(Array.from(targets),[captured],'Absence recovery must keep the original exact string ID');return true;}),response);
  assert.equal(reads,1,'Unsafe numeric native IDs require identity recovery');
  await assert.rejects(confirmDeletion(response,[captured],()=>false),error=>error.noReplay&&error.uncertain&&error.raw===response,'A rounded acknowledgement is insufficient while the exact target still exists');
}
for(const response of [{code:3000},{code:3000,result:[]},{code:3000,data:{ID:Number(ID)}},{code:3000,data:{ID:OTHER}},{code:3000,result:[{code:3000,data:{ID}},{code:3000,data:{ID}}]}]){
  let reads=0;
  assert.equal(await confirmDeletion(response,[ID],captured=>{reads++;assert.deepEqual(Array.from(captured),[ID]);return true;}),response);
  assert.equal(reads,1);
  for(const result of [false,undefined,[],0])await assert.rejects(confirmDeletion(response,[ID],()=>result),error=>error.noReplay&&error.uncertain&&error.raw===response&&error.response===response);
  const unavailable=new Error('Read unavailable');
  await assert.rejects(confirmDeletion(response,[ID],()=>{throw unavailable;}),error=>error.verificationError===unavailable&&error.response===response&&error.noReplay);
}
for(const response of [null,undefined,[],JSON.stringify({code:3000}),{code:2899,message:'Denied'},{code:3000,result:[{code:2899,message:'Denied'}]},{code:3000,result:[{code:3000,data:{ID,error:'Workflow denied'}}]},{code:3000,output:JSON.stringify({code:2899})},{code:3000,details:{response:{success:false}}}]){
  let reads=0;await assert.rejects(confirmDeletion(response,[ID],()=>{reads++;return true;}),error=>error.raw===response&&error.noReplay&&error.uncertain);assert.equal(reads,0,'Explicit failure cannot be turned into success by absence');
}
await assert.rejects(confirmDeletion({code:3000,result:[{code:2899}]},[ID],()=>true),error=>String(error.code)==='2899');
for(const targets of [[],[Number(ID)],[ID,ID],['invalid'],Array(201).fill(ID)])await assert.rejects(confirmDeletion({code:3000},targets,()=>true));
console.log('PASS deletion acknowledgement: exact IDs without reread, ambiguous native success with exact absence only, native failures and read failures preserved without replay.');
