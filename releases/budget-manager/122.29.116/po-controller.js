(function(root){
  "use strict";
  var REALLOCATION_CONTRACT='po-reallocation-v1',ELEMENT_KEYS=['1','2','3','4','5'];
  function signedAmount(value){
    if(typeof value!=='string'||! /^-?\d+(?:\.\d{1,2})?$/.test(value))throw new Error('PO reallocation component amount was not verified.');
    return value[0]==='-'?-root.LMPO.money(value.slice(1)):root.LMPO.money(value);
  }
  function completeComponents(components){return components&&!Array.isArray(components)&&Object.keys(components).length===5&&ELEMENT_KEYS.every(function(key){return Object.prototype.hasOwnProperty.call(components,key);});}
  function verifyReallocation(snapshot,wanted){
    var request=wanted.reallocation,bundle=snapshot.approvalBundle;
    if(wanted.reallocationContract!==REALLOCATION_CONTRACT||!request||request.contract!==REALLOCATION_CONTRACT||!Array.isArray(request.items)||!bundle||bundle.reallocationContract!==REALLOCATION_CONTRACT||!Array.isArray(bundle.modifications))throw new Error('PO reallocation contract was not verified.');
    var selected=Object.keys(root.LMPO.validate(wanted,true).grouped),plans=new Map(),expected=new Map();
    if(request.items.length!==selected.length)throw new Error('PO reallocation cost-code count was not verified.');
    request.items.forEach(function(item){
      if(!item||typeof item.budgetItemId!=='string'||!/^\d+$/.test(item.budgetItemId)||selected.indexOf(item.budgetItemId)<0||plans.has(item.budgetItemId)||!completeComponents(item.components)||typeof item.reason!=='string')throw new Error('PO reallocation cost-code identity was not verified.');
      var net=0n,gross=0n,components={};ELEMENT_KEYS.forEach(function(key){var value=signedAmount(item.components[key]);net+=value;gross+=value<0n?-value:value;components[key]=root.LMPO.currency(value);});
      var plan={net:net,gross:gross,components:components,reason:item.reason.trim()};plans.set(item.budgetItemId,plan);
      if(gross>0n){if(!plan.reason)throw new Error('PO reallocation reason was not verified.');expected.set(item.budgetItemId,plan);}
    });
    var seenItems=new Set(),seenIds=new Set();
    bundle.modifications.forEach(function(mod){
      var plan=mod&&expected.get(mod.budgetItemId);
      if(!plan||typeof mod.id!=='string'||!/^\d+$/.test(mod.id)||seenIds.has(mod.id)||seenItems.has(mod.budgetItemId)||mod.status!=='Submitted'||mod.componentReallocation!==true||mod.modificationType!==(plan.net<0n?'Decrease':'Increase')||mod.amount!==root.LMPO.currency(plan.net<0n?-plan.net:plan.net)||mod.reason!==plan.reason||!completeComponents(mod.components)||!completeComponents(mod.signedComponents))throw new Error('PO reallocation modification was not verified.');
      ELEMENT_KEYS.forEach(function(key){
        var actual=signedAmount(plan.components[key]),normalized=plan.net<0n?-actual:actual;
        if(mod.signedComponents[key]!==plan.components[key]||mod.components[key]!==root.LMPO.currency(normalized))throw new Error('PO reallocation component allocation was not verified.');
      });
      seenItems.add(mod.budgetItemId);seenIds.add(mod.id);
    });
    if(seenItems.size!==expected.size||(snapshot.budgetModificationId||null)!==(bundle.modifications.length?bundle.modifications[0].id:null))throw new Error('Linked PO reallocation bundle was not verified.');
    return snapshot;
  }
  function verify(snapshot,wanted,compareFields){
    if(!snapshot||typeof snapshot.id!=="string"||!/^\d+$/.test(snapshot.id)||snapshot.revision!==wanted.token)throw new Error("PO identity or revision was not verified.");
    var status=wanted.action==="Submit"||wanted.preserveReservation||wanted.preserveApproval===true?"Submitted":"Draft",commitment=status==="Submitted"?"Reserved":"None",approval=wanted.action==="Submit"||wanted.preserveApproval===true?"Pending":wanted.preserveReservation?"Rejected":"Not Configured";
    if(snapshot.status!==status||snapshot.commitmentState!==commitment||snapshot.approvalState!==approval)throw new Error("PO state was not verified.");
    if(wanted.id&&snapshot.id!==wanted.id)throw new Error("Another PO was returned.");
    if(snapshot.budgetId!==wanted.budgetId)throw new Error("Another Budget was returned.");
    if(compareFields)for(var key of ["vendorId","amount","requestDate","dateNeeded"])if(snapshot[key]!==wanted[key])throw new Error("Header "+key+" was not verified.");
    if(wanted.preserveApproval===true){
      var retained=snapshot.approvalBundle;
      if(!retained||!Array.isArray(retained.rows)||!Array.isArray(wanted.retainedApprovalIds)||retained.rows.length!==wanted.retainedApprovalIds.length||retained.rows.some(function(row,i){return row.id!==wanted.retainedApprovalIds[i];})||retained.rows.filter(function(row){return row.status==='Pending';}).length!==1||retained.rows.some(function(row){return !['Approved','Pending','Not Sent'].includes(row.status);}))throw new Error('Retained approval identities were not verified.');
      if(!Array.isArray(retained.modifications)||retained.modifications.some(function(mod){return typeof mod.id!=='string'||!/^\d+$/.test(mod.id)||mod.status!=='Submitted';})||(snapshot.budgetModificationId||null)!==(retained.modifications.length?retained.modifications[0].id:null))throw new Error('Retained PO modification identities were not verified.');
      if(wanted.reallocation!=null)verifyReallocation(snapshot,wanted);
    }else if(wanted.action==='Submit'&&wanted.automaticModifications===true){
      var bundle=snapshot.approvalBundle;
      if(!bundle||!Array.isArray(bundle.modifications)||!Array.isArray(bundle.rows)||!bundle.rows.length||bundle.rows[0].status!=='Pending'||bundle.rows.slice(1).some(function(row){return row.status!=='Not Sent';}))throw new Error('Combined PO approval chain was not verified.');
      if(wanted.reallocation!=null){verifyReallocation(snapshot,wanted);}else{
      var planned=root.LMPO.validate(wanted,true).grouped,plannedComponents=Object.create(null),expected={},seen=new Set();
      wanted.lines.forEach(function(line){var key=line.budgetItemId+'|'+line.costElement;plannedComponents[key]=(plannedComponents[key]||0n)+root.LMPO.money(line.finalAmount);});
      Object.keys(planned).forEach(function(id){
        if(!wanted.expectedBalances||typeof wanted.expectedBalances[id]!=='string'||!wanted.expectedPendingModifications||typeof wanted.expectedPendingModifications[id]!=='string')throw new Error('Submission item balance was not verified.');
        var amount=planned[id]-BigInt(wanted.expectedBalances[id])-BigInt(wanted.expectedPendingModifications[id]);
        var keys=Object.keys(plannedComponents).filter(function(key){return key.split('|')[0]===id;}),componentBalances=wanted.expectedComponentBalances,componentPending=wanted.expectedComponentPendingModifications;
        // Native baselines reserve and modify each selected element separately.
        // Legacy items carry no component expectations and keep the item total.
        var hasComponents=keys.some(function(key){return componentBalances&&Object.prototype.hasOwnProperty.call(componentBalances,key)||componentPending&&Object.prototype.hasOwnProperty.call(componentPending,key);});
        if(hasComponents){
          amount=0n;
          keys.forEach(function(key){
            var pendingPattern=wanted.reallocationContract===REALLOCATION_CONTRACT?/^-?\d+$/:/^\d+$/;
            if(!componentBalances||typeof componentBalances[key]!=='string'||! /^-?\d+$/.test(componentBalances[key])||!componentPending||typeof componentPending[key]!=='string'||!pendingPattern.test(componentPending[key]))throw new Error('Submission component balance was not verified.');
            var shortfall=plannedComponents[key]-BigInt(componentBalances[key])-BigInt(componentPending[key]);
            if(shortfall>0n)amount+=shortfall;
          });
        }
        if(amount>0n)expected[id]=root.LMPO.currency(amount);
      });
      bundle.modifications.forEach(function(mod){if(typeof mod.id!=='string'||!/^\d+$/.test(mod.id)||seen.has(mod.budgetItemId)||expected[mod.budgetItemId]!==mod.amount||mod.status!=='Submitted')throw new Error('Automatic budget modification was not verified.');seen.add(mod.budgetItemId);});
      if(seen.size!==Object.keys(expected).length||(snapshot.budgetModificationId||null)!==(bundle.modifications.length?bundle.modifications[0].id:null))throw new Error('Linked budget modification bundle was not verified.');
      }
      if(bundle.modifications.length&&!bundle.rows.some(function(row){return row.role.toUpperCase()!=='CFO';}))throw new Error('Required budget modification approver was not verified.');
    }else if((snapshot.budgetModificationId==null?null:snapshot.budgetModificationId)!==(wanted.budgetModificationId==null?null:wanted.budgetModificationId))throw new Error("Linked budget modification was not verified.");
    if(compareFields&&wanted.description!=null&&snapshot.description!==wanted.description)throw new Error("PO Description was not verified.");
    if(!Array.isArray(snapshot.lines)||snapshot.lines.length!==wanted.lines.length)throw new Error("PO line count was not verified.");
    var ids=new Set();snapshot.lines.forEach(function(line,index){if(typeof line.ID!=="string"||!/^\d+$/.test(line.ID)||ids.has(line.ID))throw new Error("Unique saved line IDs were not verified.");ids.add(line.ID);if(compareFields)for(var field of ["key","budgetItemId","description","costElement","uom","costCode","pricingMode","quantity","unitPrice","finalAmount"])if(line[field]!==wanted.lines[index][field])throw new Error("Line "+(index+1)+" "+field+" was not verified.");});return snapshot;
  }
  function verifyDecision(snapshot,wanted,compareFields){
    if(!snapshot||snapshot.id!==wanted.id||snapshot.revision!==wanted.expectedRevision||snapshot.budgetId!==wanted.budgetId||snapshot.commitmentState!=='Reserved'||!snapshot.approvalBundle)throw new Error('PO approval identity and reservation were not verified.');
    var row=snapshot.approvalBundle.rows.find(function(row){return row.id===wanted.approvalId;});var status=wanted.action==='Reject'?'Rejected':'Approved';
    if(wanted.action==='RetryEmail'){if(!row||!row.sentDate)throw new Error('Approval email delivery was not verified.');return snapshot;}
    if(!row||row.status!==status||!row.respondedDate)throw new Error('PO approval decision was not verified.');
    if(compareFields&&row.notes!==wanted.note)throw new Error('PO approval note was not verified.');
    if(status==='Rejected'&&snapshot.approvalState!=='Rejected')throw new Error('PO rejection was not verified.');
    if(status==='Approved'&&!['Pending','Approved'].includes(snapshot.approvalState))throw new Error('PO approval route was not verified.');
    return snapshot;
  }
  function create(options){
    var run=null;
    function state(){return run;}
    function begin(payload){
      if(run&&(run.busy||run.unknown))return Promise.reject(new Error("A PO operation is active or unresolved. Use read-only Check."));
      var validated=root.LMPO.validate(payload,payload.action==="Submit");
      payload=Object.assign({},payload,{amount:validated.amount,budgetModificationId:validated.budgetModificationId,lines:validated.lines.map(function(line){return Object.assign({},line,{unitPrice:line.unitPrice===null?null:root.LMPO.currency(root.LMPO.money(line.unitPrice))});})});
      run={payload:JSON.parse(JSON.stringify(payload)),busy:true,unknown:false,snapshot:null,error:""};options.onState(run,"prepared");
      return execute(false);
    }
    function execute(check){
      var captured=run;
      var payload=check?(captured.deletion?Object.assign({},captured.payload,{action:'CheckDelete'}):captured.decision?Object.assign({},captured.payload,{action:'CheckDecision',decision:captured.payload.action}):{action:"Check",budgetId:captured.payload.budgetId,userAccessId:captured.payload.userAccessId,token:captured.payload.token}):captured.payload;
      captured.readOnlyCheck=check;captured.busy=true;options.onState(captured,check?"checking":"saving");
      var timer;
      return Promise.race([Promise.resolve().then(function(){return options.call(payload);}),new Promise(function(resolve,reject){timer=setTimeout(function(){reject(new Error(captured.deletion?"Response was lost or timed out. The PO may have been deleted.":"Response was lost or timed out. The PO may have been saved."));},options.timeoutMs||90000);})]).then(function(receipt){
        if(!receipt||receipt.contract!=="po-v1")throw new Error("PO verification is unavailable in this environment.");
        if(receipt.success!==true||receipt.writeState!=="verified"){
          if(!check&&receipt.writeState==="not-started") { captured.unknown=false;captured.rejected=true;captured.error=receipt.error||"PO was not saved.";options.onState(captured,"rejected");return null; }
          throw new Error(receipt.error||"Saved PO could not be verified.");
        }
        if(captured.deletion){captured.deleted=verifyDeleted(receipt,captured.payload);}else{captured.snapshot=(captured.decision?verifyDecision:verify)(receipt.snapshot,captured.payload,check);}captured.unknown=false;captured.error="";options.onState(captured,"verified");return captured.deleted||captured.snapshot;
      }).catch(function(error){captured.unknown=true;captured.error=error.message||String(error);options.onState(captured,"unknown");return null;}).finally(function(){clearTimeout(timer);captured.busy=false;options.onState(captured,"settled");});
    }
    function check(){if(!run||run.busy||!run.unknown)return Promise.resolve(null);return execute(true);}
    function decide(payload){if(run&&(run.busy||run.unknown))return Promise.reject(new Error('A PO operation is active or unresolved. Use read-only Check.'));run={payload:JSON.parse(JSON.stringify(payload)),decision:true,busy:true,unknown:false,snapshot:null,error:''};options.onState(run,'prepared');return execute(false);}
    function remove(payload){if(run&&(run.busy||run.unknown))return Promise.reject(new Error('A PO operation is active or unresolved. Use read-only Check.'));validateDeletePlan(payload.deletePlan,payload);run={payload:JSON.parse(JSON.stringify(payload)),deletion:true,busy:true,unknown:false,snapshot:null,deleted:null,error:''};options.onState(run,'prepared');return execute(false);}
    return {begin:begin,decide:decide,remove:remove,check:check,state:state,verify:verify};
  }
  function validateDeletePlan(plan,wanted){if(!plan||plan.id!==wanted.id||plan.budgetId!==wanted.budgetId||plan.revision!==wanted.expectedRevision||typeof plan.proof!=='string'||!plan.proof)throw new Error('Deletion preview identity was not verified.');['items','operations','snapshots','approvals','modifications','rollupItems'].forEach(function(key){if(!Array.isArray(plan[key])||plan[key].some(function(id){return typeof id!=='string'||!/^\d+$/.test(id);})||new Set(plan[key]).size!==plan[key].length)throw new Error('Deletion record identities were not verified.');});return plan;}
  function verifyDeleted(receipt,wanted){var plan=validateDeletePlan(receipt.deleted,wanted);if(receipt.remaining!==0||plan.proof!==wanted.deletePlan.proof||['items','operations','snapshots','approvals','modifications','rollupItems','status','commitmentState','approvalState'].some(function(key){return JSON.stringify(plan[key])!==JSON.stringify(wanted.deletePlan[key]);}))throw new Error('PO and associated record deletion was not verified.');return plan;}
  root.LMPOController={create:create,verify:verify,verifyDecision:verifyDecision,validateDeletePlan:validateDeletePlan,verifyDeleted:verifyDeleted};
})(typeof globalThis!=="undefined"?globalThis:this);
