import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

// Read-only review of an exported native List DTO. Never choose or mutate a recipient.
export function auditApprovalScopeMigration(snapshot){
  const config=snapshot.configuration||snapshot;
  for(const key of ['policies','assignments','audit'])if(!Array.isArray(config[key]))throw new Error(`Complete ${key} inventory is required.`);
  function exactId(value){if(typeof value!=='string'||!/^\d+$/.test(value))throw new Error('Inventory identities must be exact Creator ID strings.');return value;}
  function identity(row){return exactId(row.id);}
  const workflows=['Purchase Order','Budget','Budget Modification','Pro Forma','Contract'];
  for(const row of config.policies){identity(row);if(!workflows.includes(row.workflow)||!['Draft','Published'].includes(row.status))throw new Error('Every policy needs a supported workflow and explicit Draft/Published status.');}
  for(const row of config.assignments){identity(row);exactId(row.roleId);exactId(row.userAccessId);if(typeof row.active!=='boolean')throw new Error('Every assignment needs an explicit active setting.');}
  for(const row of [...config.policies,...config.assignments])for(const key of ['territory','department'])if(typeof row[key]!=='string')throw new Error('Complete string Territory and Department scope keys are required.');
  for(const row of config.audit){identity(row);exactId(row.actorId);if(!['Started','Complete','Rejected'].includes(row.status))throw new Error('Unknown configuration audit state cannot certify a safe schema migration.');}
  function scope(row,assignment){return JSON.stringify([assignment?row.roleId:row.workflow,row.territory||'',row.department||'']);}
  function collisions(rows,assignment){
    const groups=new Map();
    for(const row of rows){identity(row);const key=scope(row,assignment),group=groups.get(key)||[];group.push(row);groups.set(key,group);}
    return [...groups.entries()].filter(([,rows])=>rows.length>1).map(([key,rows])=>({scope:JSON.parse(key),records:rows.map(row=>({id:row.id,companyId:row.companyId||'',effectiveFrom:row.effectiveFrom||'',effectiveTo:row.effectiveTo||'',status:row.status||'',active:row.active===true,userAccessId:row.userAccessId||''}))}));
  }
  const publishedPolicyCollisions=collisions(config.policies.filter(row=>row.status==='Published'),false);
  const policyEditorCollisions=collisions(config.policies,false);
  const assignmentCollisions=collisions(config.assignments,true);
  const unfinishedAudits=config.audit.filter(row=>row.status==='Started').map(row=>({id:identity(row),action:row.action,actorId:row.actorId,token:row.token||''}));
  const locksKnown=Array.isArray(snapshot.locks);
  const retainedLocks=locksKnown?snapshot.locks.map(row=>({id:identity(row),lockKey:row.lockKey||row.Lock_Key||'',token:row.token||row.Operation_Token||''})):[];
  const blockers=[];
  if(publishedPolicyCollisions.length)blockers.push('Choose one policy for every colliding Published workflow/Territory/Department scope.');
  if(policyEditorCollisions.length)blockers.push('Resolve same-scope Draft/Published policy records before future policy edits.');
  if(assignmentCollisions.length)blockers.push('Choose one assignment for each colliding role/Territory/Department scope; disabling a duplicate does not resolve ambiguity.');
  if(unfinishedAudits.length)blockers.push('Resolve Started native configuration receipts with the old helper before deleting columns.');
  if(retainedLocks.length)blockers.push('Resolve each retained native configuration lock through its owning receipt.');
  if(!locksKnown)blockers.push('Read Approval_Config_Lock separately; List does not prove that no retained locks exist.');
  return {contract:'approval-scope-migration-v2',counts:{policies:config.policies.length,assignments:config.assignments.length,audit:config.audit.length},publishedPolicyCollisions,policyEditorCollisions,assignmentCollisions,unfinishedAudits,locksKnown,retainedLocks,blockers,readyForFieldDeletion:blockers.length===0};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  if(!process.argv[2])throw new Error('Usage: node scripts/audit-approval-scope-migration.mjs <exported-list-json>');
  const report=auditApprovalScopeMigration(JSON.parse(await readFile(resolve(process.argv[2]),'utf8')));
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(!report.readyForFieldDeletion)process.exitCode=2;
}
