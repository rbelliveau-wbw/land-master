(function(root){
  "use strict";
  function verify(snapshot,wanted){
    if(!snapshot||typeof snapshot.id!=="string"||!/^\d+$/.test(snapshot.id)||snapshot.revision!==wanted.token)throw new Error("PO identity or revision was not verified.");
    var status=wanted.action==="Submit"||wanted.preserveReservation?"Submitted":"Draft",commitment=status==="Submitted"?"Reserved":"None",approval=wanted.action==="Submit"?"Pending":wanted.preserveReservation?"Rejected":"Not Configured";
    if(snapshot.status!==status||snapshot.commitmentState!==commitment||snapshot.approvalState!==approval)throw new Error("PO state was not verified.");
    if(wanted.id&&snapshot.id!==wanted.id)throw new Error("Another PO was returned.");
    for(var key of ["budgetId","vendorId","amount","requestDate","dateNeeded"])if(snapshot[key]!==wanted[key])throw new Error("Header "+key+" was not verified.");
    if(wanted.action==='Submit'&&wanted.automaticModifications===true){
      var bundle=snapshot.approvalBundle;
      if(!bundle||!Array.isArray(bundle.modifications)||!Array.isArray(bundle.rows)||!bundle.rows.length||bundle.rows[0].status!=='Pending'||bundle.rows.slice(1).some(function(row){return row.status!=='Not Sent';}))throw new Error('Combined PO approval chain was not verified.');
      var planned=root.LMPO.validate(wanted,true).grouped,expected={},seen=new Set();
      Object.keys(planned).forEach(function(id){if(!wanted.expectedBalances||typeof wanted.expectedBalances[id]!=='string'||!wanted.expectedPendingModifications||typeof wanted.expectedPendingModifications[id]!=='string')throw new Error('Submission item balance was not verified.');var amount=planned[id]-BigInt(wanted.expectedBalances[id])-BigInt(wanted.expectedPendingModifications[id]);if(amount>0n)expected[id]=root.LMPO.currency(amount);});
      bundle.modifications.forEach(function(mod){if(typeof mod.id!=='string'||!/^\d+$/.test(mod.id)||seen.has(mod.budgetItemId)||expected[mod.budgetItemId]!==mod.amount||mod.status!=='Submitted')throw new Error('Automatic budget modification was not verified.');seen.add(mod.budgetItemId);});
      if(seen.size!==Object.keys(expected).length||(snapshot.budgetModificationId||null)!==(bundle.modifications.length?bundle.modifications[0].id:null))throw new Error('Linked budget modification bundle was not verified.');
      if(bundle.modifications.length&&!bundle.rows.some(function(row){return row.role.toUpperCase()==='COO';}))throw new Error('Required COO step was not verified.');
    }else if((snapshot.budgetModificationId==null?null:snapshot.budgetModificationId)!==(wanted.budgetModificationId==null?null:wanted.budgetModificationId))throw new Error("Linked budget modification was not verified.");
    if(!Array.isArray(snapshot.lines)||snapshot.lines.length!==wanted.lines.length)throw new Error("PO line count was not verified.");
    var ids=new Set();snapshot.lines.forEach(function(line,index){if(typeof line.ID!=="string"||!/^\d+$/.test(line.ID)||ids.has(line.ID))throw new Error("Unique saved line IDs were not verified.");ids.add(line.ID);for(var field of ["key","budgetItemId","description","costElement","uom","costCode","pricingMode","quantity","unitPrice","finalAmount"])if(line[field]!==wanted.lines[index][field])throw new Error("Line "+(index+1)+" "+field+" was not verified.");});return snapshot;
  }
  function verifyDecision(snapshot,wanted){
    if(!snapshot||snapshot.id!==wanted.id||snapshot.revision!==wanted.expectedRevision||snapshot.budgetId!==wanted.budgetId||snapshot.commitmentState!=='Reserved'||!snapshot.approvalBundle)throw new Error('PO approval identity and reservation were not verified.');
    var row=snapshot.approvalBundle.rows.find(function(row){return row.id===wanted.approvalId;});var status=wanted.action==='Reject'?'Rejected':'Approved';
    if(wanted.action==='RetryEmail'){if(!row||!row.sentDate)throw new Error('Approval email delivery was not verified.');return snapshot;}
    if(!row||row.status!==status||row.notes!==wanted.note||!row.respondedDate)throw new Error('PO approval decision was not verified.');
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
      var payload=check?(captured.decision?Object.assign({},captured.payload,{action:'CheckDecision',decision:captured.payload.action}):{action:"Check",budgetId:captured.payload.budgetId,userAccessId:captured.payload.userAccessId,token:captured.payload.token}):captured.payload;
      captured.busy=true;options.onState(captured,check?"checking":"saving");
      var timer;
      return Promise.race([Promise.resolve().then(function(){return options.call(payload);}),new Promise(function(resolve,reject){timer=setTimeout(function(){reject(new Error("Response was lost or timed out. The PO may have been saved."));},options.timeoutMs||90000);})]).then(function(receipt){
        if(!receipt||receipt.contract!=="po-v1")throw new Error("PO verification is unavailable in this environment.");
        if(receipt.success!==true||receipt.writeState!=="verified"){
          if(!check&&receipt.writeState==="not-started") { captured.unknown=false;captured.rejected=true;captured.error=receipt.error||"PO was not saved.";options.onState(captured,"rejected");return null; }
          throw new Error(receipt.error||"Saved PO could not be verified.");
        }
        captured.snapshot=(captured.decision?verifyDecision:verify)(receipt.snapshot,captured.payload);captured.unknown=false;captured.error="";options.onState(captured,"verified");return captured.snapshot;
      }).catch(function(error){captured.unknown=true;captured.error=error.message||String(error);options.onState(captured,"unknown");return null;}).finally(function(){clearTimeout(timer);captured.busy=false;options.onState(captured,"settled");});
    }
    function check(){if(!run||run.busy||!run.unknown)return Promise.resolve(null);return execute(true);}
    function decide(payload){if(run&&(run.busy||run.unknown))return Promise.reject(new Error('A PO operation is active or unresolved. Use read-only Check.'));run={payload:JSON.parse(JSON.stringify(payload)),decision:true,busy:true,unknown:false,snapshot:null,error:''};options.onState(run,'prepared');return execute(false);}
    return {begin:begin,decide:decide,check:check,state:state,verify:verify};
  }
  root.LMPOController={create:create,verify:verify,verifyDecision:verifyDecision};
})(typeof globalThis!=="undefined"?globalThis:this);
