// Actual Contract/Construction access path with native-shaped SDK2 responses.
// The shared harness executes local fixtures only; this test makes no live calls.
import assert from 'node:assert/strict';
import {ready,drain,deferred,ACCESS} from './test-contract-sdk-v2-foundation.mjs';

const copy=value=>JSON.parse(JSON.stringify(value));
const wrapped=flags=>({code:3000,data:{users:[]},details:{responseText:JSON.stringify({result:[{output:JSON.stringify(flags)}]})}});

{
  const h=await ready({accessFlags:{ctTemplates:true}});
  assert.equal(h.c.ncParseAccess({users:[],myId:ACCESS}),null,'a roster-only wrapper cannot become an all-denied permission answer');
  assert.equal(h.c.ncParseAccess(wrapped(copy(h.flags))).ctTemplates,true,'array/string/native responseText envelopes resolve actual flags');
  const cycle={};cycle.response=cycle;
  assert.equal(h.c.ncParseAccess(cycle),null,'malformed cycles stay bounded');
}

{
  const h=await ready({pageParams:{workMode:'construction'},accessFailure:true});
  assert.equal(h.c.S.usersLoaded,false,'a failed access read is retryable rather than permanently cached');
  assert.equal(h.c.canTemplates(),false,'Construction template rights require an explicit native grant');
  let calls=0;
  Object.assign(h.flags,{constructionEditAll:true,constructionSubmit:true});
  h.api.invokeCustomApi=async()=>{calls++;return wrapped(copy(h.flags));};
  await h.c.ncLoadUsers();
  assert.equal(calls,1,'normal access loading retries a previous failure');
  assert.equal(h.c.canTemplates(),true,'a completed retry restores the granted Manage Templates action');
  await h.c.ncLoadUsers();assert.equal(calls,1,'a successful same-actor access snapshot can be reused');
  h.flags.constructionEditAll=false;
  await h.c.loadData();
  assert.equal(calls,2,'the in-widget Refresh always re-reads access, even after a cached success');
  assert.equal(h.c.canTemplates(),false,'a real fresh revocation removes template management');
}

{
  const h=await ready({accessFlags:{ctTemplates:true}});
  h.api.invokeCustomApi=async()=>({code:3000,data:{users:[],myId:ACCESS}});
  await h.c.ncLoadUsers(true);
  assert.equal(h.c.S.usersLoaded,false,'a malformed/partial response is not cached as a valid permission snapshot');
  assert.equal(h.c.S.acc.known,false);
  assert.equal(h.c.canTemplates(),false,'unknown replies cannot grant template access');
  h.api.invokeCustomApi=async()=>wrapped(copy(h.flags));
  await h.c.ncLoadUsers();assert.equal(h.c.canTemplates(),true);
}

{
  const h=await ready(),first=deferred(),second=deferred();let calls=0;
  h.api.invokeCustomApi=()=>++calls===1?first.promise:second.promise;
  const old=h.c.ncLoadUsers(true);const oldResult=old.then(()=>null,error=>error);
  await drain();
  assert.equal(h.c.ncLoadUsers(),old,'ordinary callers await the currently pending refresh instead of old cached grants');
  const current=h.c.ncLoadUsers(true);await drain();
  second.resolve(wrapped({...copy(h.flags),ctTemplates:true}));await current;
  first.resolve(wrapped({...copy(h.flags),ctTemplates:false}));
  const rejected=await oldResult;assert.match(rejected.message,/older Creator session or refresh/);
  assert.equal(h.c.canTemplates(),true,'an older same-actor reply cannot overwrite newer permissions');
  assert.equal(h.c.S.contractAccessPromise,null,'an older finally callback cannot strand or replace the current request');
}

{
  const h=await ready({accessFlags:{ctTemplates:true}});let calls=0;
  const freshId='90071992547419934';
  h.c.LMRuntime.apply({envUrlFragment:'',loginUser:'different-actor@example.test'});
  h.api.invokeCustomApi=async()=>{calls++;return wrapped({...copy(h.flags),myId:freshId,ctTemplates:false,users:[{id:freshId,label:'Different actor',email:'different-actor'}]});};
  await h.c.ncLoadUsers();
  assert.equal(calls,1,'a new actor never reuses a previous actor’s access cache');
  assert.equal(h.c.S.myAccessId,freshId);
  assert.equal(h.c.S.acc.templates,false);
}

console.log('Contract/Construction access: native nested flags, retryable unknown reads, fresh Refresh, explicit template grants/revocation, scoped cache and stale-response exclusion passed.');
