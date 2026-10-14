/* Mirror of resolveApprovalRoute's exact, sequential policy contract. */
(function(root){
  "use strict";
  function fail(message){throw new Error(message);}
  function id(value){if(typeof value!=="string"||!/^\d+$/.test(value))fail("Identity must be a Creator ID string.");return value;}
  function cents(value){if(typeof value!=="string"||!/^\d+(?:\.\d{1,2})?$/.test(value))fail("Amount must be an exact currency string.");var p=value.split("."),n=BigInt(p[0]+(p[1]||"").padEnd(2,"0"));if(n>999999999999999n)fail("Currency exceeds Max Digits 16.");return n;}
  function currency(value){var n=cents(value);return String(n/100n)+'.'+String(n%100n).padStart(2,'0');}
  // Explicit precedence: territory+department > territory > department > all.
  function rank(row,ctx){if(row.territory&&row.territory!==ctx.territory||row.department&&row.department!==ctx.department)return -1;return (row.territory?4:0)+(row.department?2:0);}
  function choose(rows,ctx,label){var matches=rows.map(function(row){return {row:row,rank:rank(row,ctx)};}).filter(function(x){return x.rank>=0;});if(!matches.length)fail("Missing "+label+" for this scope.");var best=Math.max.apply(null,matches.map(function(x){return x.rank;})),selected=matches.filter(function(x){return x.rank===best;});if(selected.length!==1)fail("Ambiguous "+label+" at the same override precedence.");return selected[0].row;}
  function validatePolicy(policy){
    id(policy.id);
    if(!["Budget","Budget Modification","Pro Forma","Contract","Purchase Order"].includes(policy.workflow))fail("Unsupported workflow.");
    if(!["Allow","Deny"].includes(policy.selfApproval))fail("Choose the self-approval rule before publication.");
    if(policy.workflow==="Purchase Order"&&policy.selfApproval!=="Deny")fail("Purchase Orders forbid submitter self-approval.");
    if(!Array.isArray(policy.steps)||!policy.steps.length||policy.steps.length>30)fail("Enter 1–30 ordered steps.");
    var keys=new Set();policy.steps.forEach(function(step,index){if(typeof step.key!=="string"||!step.key||keys.has(step.key))fail("Step keys must be unique.");keys.add(step.key);id(step.roleId);if(step.order!==index+1)fail("Steps must have contiguous, unique order.");if(typeof step.enabled!=="boolean")fail("Each step needs an explicit enabled setting.");if(!["Always","Above","At or above","Budget modification attached"].includes(step.condition))fail("Choose a supported step condition.");if(["Pro Forma","Contract"].includes(policy.workflow)&&step.condition!=="Always")fail("Pro Forma and Contract use straight approval chains without amount thresholds.");if(step.condition==="Budget modification attached"&&policy.workflow!=="Purchase Order")fail("Budget modification conditions belong to Purchase Orders.");if(step.condition==="Above"||step.condition==="At or above")cents(step.threshold);
      if(step.poTestCFO!=null){
        var test=step.poTestCFO;
        if(!test||typeof test!=="object"||Array.isArray(test)||policy.workflow!=="Purchase Order"||policy.steps.length!==1||step.enabled!==true||step.condition!=="Always")fail("Test CFO requires one enabled Always step on a Purchase Order policy.");
        id(test.budgetId);id(test.userAccessId);
        if(typeof test.email!=="string"||!/^[^\s@,;<>\"]+@[^\s@,;<>\"]+\.[^\s@,;<>\"]+$/.test(test.email)||test.allowSelfApproval!==true)fail("Test CFO needs one email and explicit scoped self-approval.");
        var maximum=cents(test.maxAmount);if(maximum<=0n||maximum>5500n)fail("Test CFO maximum must be positive and at most 55.00.");
      }
    });if(policy.workflow==='Purchase Order'){var required=policy.steps.filter(function(step){return step.condition==='Always'&&step.enabled===true;});if(required.length!==1)fail('Exactly one enabled CFO must approve every purchase order.');policy.steps.forEach(function(step){if(step.condition!=='Always'&&step.condition!=='Budget modification attached')fail('Additional PO approvers are used only when the PO creates budget modifications.');});}return policy;
  }
  function resolve(config,ctx){
    id(ctx.submitterId);var amount=["Pro Forma","Contract"].includes(ctx.workflow)?0n:cents(ctx.amount);
    var policy=choose(config.policies.filter(function(p){return p.workflow===ctx.workflow&&p.status==="Published";}),ctx,"published policy");
    validatePolicy(policy);if(policy.enabled!==true)fail("Applicable published policy is disabled.");
    if(policy.workflow==='Purchase Order'){var cfoRoles=config.roles.filter(function(role){return role.name==='CFO';}),cfoSteps=policy.steps.filter(function(step){return cfoRoles.some(function(role){return role.id===step.roleId;});});if(cfoSteps.length!==1||cfoSteps[0].condition!=='Always'||cfoSteps[0].enabled!==true)fail('Exactly one enabled CFO must approve every purchase order.');policy.steps.forEach(function(step){if(step!==cfoSteps[0]&&step.condition!=='Budget modification attached')fail('Additional PO approvers are used only when the PO creates budget modifications.');});}
    var route=[],excluded=[];
    policy.steps.forEach(function(step){
      var linked=step.condition==="Budget modification attached";
      if(linked&&typeof ctx.hasBudgetModification!=="boolean")fail("Linked PO budget modification context is required.");
      var threshold=step.condition==="Above"||step.condition==="At or above"?cents(step.threshold):null,applies=step.enabled&&(linked?ctx.hasBudgetModification:threshold===null||step.condition==="Above"&&amount>threshold||step.condition==="At or above"&&amount>=threshold);
      if(!applies){excluded.push({key:step.key,reason:!step.enabled?"Disabled":linked?"No budget modification is linked to this PO":step.condition+" threshold is not met"});return;}
      var roles=config.roles.filter(function(r){return r.id===step.roleId;});if(roles.length!==1||roles[0].active!==true)fail("Missing, ambiguous or inactive role for step "+step.order+".");
      if(policy.workflow==='Purchase Order'&&(roles[0].name==='CFO'?(step.condition!=='Always'||!step.enabled):step.condition!=='Budget modification attached'))fail('CFO is always required; other PO roles apply only to budget modifications.');
      var assignment,test=step.poTestCFO,assignments;
      if(test){
        if(roles[0].name!=="CFO")fail("Test CFO must use the active CFO role.");
        if(typeof ctx.budgetId!=="string"||ctx.budgetId!==test.budgetId||amount>cents(test.maxAmount)||ctx.hasBudgetModification!==false||ctx.hasBudgetOverrun!==false)fail("This PO is outside the Test CFO budget, amount or no-overrun scope.");
        assignment={id:'',userAccessId:test.userAccessId,active:true};
      }else if(roles[0].name==='Dev Mgr'){
        var devTerritories=(config.territories||[]).filter(function(t){return t.id===ctx.territory;});
        if(devTerritories.length!==1)fail('The territory must identify one Territory record with Dev Mgr users.');
        var devIds=Array.from(new Set(devTerritories[0].devMgrUserAccessIds||[]));
        if(!devIds.length)fail('Configure at least one Dev Mgr on the Territory record.');
        assignments=devIds.map(function(person){return {id:'',userAccessId:id(person),active:true};});
      }else if(ctx.workflow==="Purchase Order"&&roles[0].name==="VP"){
        var territories=(config.territories||[]).filter(function(t){return t.id===ctx.territory;});
        if(territories.length!==1)fail("The PO territory must identify one Territory record with a VP.");
        var vpIds=Array.from(new Set(territories[0].vpUserAccessIds||[]));
        if(vpIds.length!==1)fail("Configure exactly one VP on the PO Territory record.");
        assignment={id:'',userAccessId:id(vpIds[0]),active:true};
      }else assignment=choose(config.assignments.filter(function(a){return a.roleId===step.roleId;}),ctx,"assignment for "+roles[0].name);
      (assignments||[assignment]).forEach(function(assignment){
      if(assignment.active!==true)fail("Assignment for "+roles[0].name+" is inactive.");if(assignment.id!=='')id(assignment.id);id(assignment.userAccessId);
      var users=config.users.filter(function(u){return u.id===assignment.userAccessId;});if(users.length!==1||!users[0].user||!test&&(users[0].routingEnabled!==true||typeof users[0].approverEmail!=="string"||!/^\S+@\S+\.\S+$/.test(users[0].approverEmail)))fail("Missing, inactive or unroutable approver for "+roles[0].name+".");
      if(policy.selfApproval==="Deny"&&assignment.userAccessId===ctx.submitterId&&!(test&&test.allowSelfApproval===true))fail("Policy forbids submitter self-approval.");
      var resolved={order:route.length+1,policyStepOrder:step.order,key:assignments&&assignments.length>1?step.key+'-'+assignment.userAccessId:step.key,roleId:step.roleId,role:roles[0].name,assignmentId:assignment.id,userAccessId:assignment.userAccessId,name:users[0].name||'',email:test?test.email:users[0].approverEmail,reason:test?"PO test CFO":step.condition==="Always"?"Required step":linked?"A budget modification is linked to this PO":currency(ctx.amount)+" is "+step.condition.toLowerCase()+" "+currency(step.threshold)};
      if(test)resolved.poTestCFO=test;route.push(resolved);
      });
    });
    if(!route.length)fail("No enabled applicable approval steps.");
    // Detached submission evidence; configuration edits cannot mutate an active route.
    return JSON.parse(JSON.stringify({policyId:policy.id,context:ctx,route:route,excluded:excluded,selfApproval:policy.selfApproval}));
  }
  function assertPublish(candidate,policies){validatePolicy(candidate);if(candidate.steps.some(function(step){return step.poTestCFO!=null;}))fail("Budget-specific CFO test overrides are no longer supported. Configure the CFO assignment for all budgets.");policies.forEach(function(p){if(p.id!==candidate.id&&p.status==="Published"&&p.workflow===candidate.workflow&&(p.territory||"")===(candidate.territory||"")&&(p.department||"")===(candidate.department||""))fail("A published policy already exists in this scope. Edit that policy.");});return candidate;}
  root.LMApprovalPolicy={resolve:resolve,validatePolicy:validatePolicy,assertPublish:assertPublish,currency:currency};
})(typeof globalThis!=="undefined"?globalThis:this);
