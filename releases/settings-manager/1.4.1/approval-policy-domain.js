/* Mirror of resolveApprovalRoute's exact, sequential policy contract. */
(function(root){
  "use strict";
  function fail(message){throw new Error(message);}
  function id(value){if(typeof value!=="string"||!/^\d+$/.test(value))fail("Identity must be a Creator ID string.");return value;}
  function cents(value){if(typeof value!=="string"||!/^\d+(?:\.\d{1,2})?$/.test(value))fail("Amount must be an exact currency string.");var p=value.split("."),n=BigInt(p[0]+(p[1]||"").padEnd(2,"0"));if(n>999999999999999n)fail("Currency exceeds Max Digits 16.");return n;}
  function currency(value){var n=cents(value);return String(n/100n)+'.'+String(n%100n).padStart(2,'0');}
  function date(value){if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value)||new Date(value).toISOString().slice(0,10)!==value)fail("Effective date must be YYYY-MM-DD.");return value;}
  function validAt(row,day){return (!row.effectiveFrom||date(row.effectiveFrom)<=day)&&(!row.effectiveTo||day<date(row.effectiveTo));}
  // Explicit precedence: territory+department > territory > company+department > company.
  function rank(row,ctx){if(row.companyId!==ctx.companyId||row.territory&&row.territory!==ctx.territory||row.department&&row.department!==ctx.department)return -1;return (row.territory?4:0)+(row.department?2:0);}
  function choose(rows,ctx,label){var matches=rows.map(function(row){return {row:row,rank:rank(row,ctx)};}).filter(function(x){return x.rank>=0;});if(!matches.length)fail("Missing "+label+" for this scope.");var best=Math.max.apply(null,matches.map(function(x){return x.rank;})),selected=matches.filter(function(x){return x.rank===best;});if(selected.length!==1)fail("Ambiguous "+label+" at the same override precedence.");return selected[0].row;}
  function validatePolicy(policy){
    id(policy.id);id(policy.companyId);
    if(!["Budget","Budget Modification","Pro Forma","Contract","Purchase Order"].includes(policy.workflow))fail("Unsupported workflow.");
    if(!Number.isSafeInteger(policy.version)||policy.version<1)fail("A positive policy version is required.");
    if(!["Allow","Deny"].includes(policy.selfApproval)||!["Separate steps","Reject"].includes(policy.duplicatePerson))fail("Choose self-approval and multiple-role rules before publication.");
    if(policy.workflow==="Purchase Order"&&(policy.selfApproval!=="Deny"||policy.duplicatePerson!=="Reject"))fail("Purchase Orders require distinct approvers and forbid submitter self-approval.");
    if(policy.effectiveFrom)date(policy.effectiveFrom);if(policy.effectiveTo)date(policy.effectiveTo);
    if(policy.effectiveFrom&&policy.effectiveTo&&policy.effectiveTo<=policy.effectiveFrom)fail("Effective end must follow start (end is exclusive).");
    if(!Array.isArray(policy.steps)||!policy.steps.length||policy.steps.length>30)fail("Enter 1–30 ordered steps.");
    var keys=new Set();policy.steps.forEach(function(step,index){if(typeof step.key!=="string"||!step.key||keys.has(step.key))fail("Step keys must be unique.");keys.add(step.key);id(step.roleId);if(step.order!==index+1)fail("Steps must have contiguous, unique order.");if(typeof step.enabled!=="boolean")fail("Each step needs an explicit enabled setting.");if(!["Always","Above","At or above","Budget modification attached"].includes(step.condition))fail("Choose a supported step condition.");if(["Pro Forma","Contract"].includes(policy.workflow)&&step.condition!=="Always")fail("Pro Forma and Contract use straight approval chains without amount thresholds.");if(step.condition==="Budget modification attached"&&policy.workflow!=="Purchase Order")fail("Linked budget modification conditions belong to Purchase Orders.");if(step.condition==="Above"||step.condition==="At or above")cents(step.threshold);});return policy;
  }
  function resolve(config,ctx){
    id(ctx.companyId);id(ctx.submitterId);var amount=["Pro Forma","Contract"].includes(ctx.workflow)?0n:cents(ctx.amount),day=date(ctx.effectiveDate);
    var policy=choose(config.policies.filter(function(p){return p.workflow===ctx.workflow&&p.status==="Published"&&validAt(p,day);}),ctx,"published policy");
    validatePolicy(policy);if(policy.enabled!==true)fail("Applicable published policy is disabled.");
    var route=[],excluded=[],people=new Set();
    policy.steps.forEach(function(step){
      var linked=step.condition==="Budget modification attached";
      if(linked&&typeof ctx.hasBudgetModification!=="boolean")fail("Linked PO budget modification context is required.");
      var threshold=step.condition==="Above"||step.condition==="At or above"?cents(step.threshold):null,applies=step.enabled&&(linked?ctx.hasBudgetModification:threshold===null||step.condition==="Above"&&amount>threshold||step.condition==="At or above"&&amount>=threshold);
      if(!applies){excluded.push({key:step.key,reason:!step.enabled?"Disabled":linked?"No budget modification is linked to this PO":step.condition+" threshold is not met"});return;}
      var roles=config.roles.filter(function(r){return r.id===step.roleId;});if(roles.length!==1||roles[0].active!==true)fail("Missing, ambiguous or inactive role for step "+step.order+".");
      var assignment=choose(config.assignments.filter(function(a){return a.roleId===step.roleId&&validAt(a,day);}),ctx,"assignment for "+roles[0].name);
      if(assignment.active!==true)fail("Assignment for "+roles[0].name+" is inactive.");id(assignment.id);id(assignment.userAccessId);
      var users=config.users.filter(function(u){return u.id===assignment.userAccessId;});if(users.length!==1||users[0].routingEnabled!==true||!users[0].user||typeof users[0].approverEmail!=="string"||!/^\S+@\S+\.\S+$/.test(users[0].approverEmail))fail("Missing, inactive or unroutable approver for "+roles[0].name+".");
      if(policy.selfApproval==="Deny"&&assignment.userAccessId===ctx.submitterId)fail("Policy forbids submitter self-approval.");
      if(policy.duplicatePerson==="Reject"&&people.has(assignment.userAccessId))fail("One person fills multiple required roles; policy rejects this overlap.");people.add(assignment.userAccessId);
      route.push({order:route.length+1,policyStepOrder:step.order,key:step.key,roleId:step.roleId,role:roles[0].name,assignmentId:assignment.id,userAccessId:assignment.userAccessId,name:users[0].name||'',email:users[0].approverEmail,reason:step.condition==="Always"?"Required step":linked?"A budget modification is linked to this PO":currency(ctx.amount)+" is "+step.condition.toLowerCase()+" "+currency(step.threshold)});
    });
    if(!route.length)fail("No enabled applicable approval steps.");
    // Detached submission evidence; configuration edits cannot mutate an active route.
    return JSON.parse(JSON.stringify({policyId:policy.id,policyVersion:policy.version,context:ctx,route:route,excluded:excluded,selfApproval:policy.selfApproval,duplicatePerson:policy.duplicatePerson}));
  }
  function assertPublish(candidate,policies){validatePolicy(candidate);var start=candidate.effectiveFrom||"0000-00-00",end=candidate.effectiveTo||"9999-12-31";policies.forEach(function(p){if(p.id!==candidate.id&&p.status==="Published"&&p.workflow===candidate.workflow&&p.companyId===candidate.companyId&&(p.territory||"")===(candidate.territory||"")&&(p.department||"")===(candidate.department||"")&&start<(p.effectiveTo||"9999-12-31")&&(p.effectiveFrom||"0000-00-00")<end)fail("Published policy effective windows overlap in the same scope.");});return candidate;}
  root.LMApprovalPolicy={resolve:resolve,validatePolicy:validatePolicy,assertPublish:assertPublish,currency:currency};
})(typeof globalThis!=="undefined"?globalThis:this);
