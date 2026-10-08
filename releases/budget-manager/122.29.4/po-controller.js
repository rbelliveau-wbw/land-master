(function(root){
  "use strict";
  function verify(snapshot,wanted){
    if(!snapshot||typeof snapshot.id!=="string"||!/^\d+$/.test(snapshot.id)||snapshot.revision!==wanted.token)throw new Error("PO identity or revision was not verified.");
    var status=wanted.action==="Submit"?"Submitted":"Draft",commitment=wanted.action==="Submit"?"Reserved":"None";
    if(snapshot.status!==status||snapshot.commitmentState!==commitment||snapshot.approvalState!=="Not Configured")throw new Error("PO state was not verified.");
    if(wanted.id&&snapshot.id!==wanted.id)throw new Error("Another PO was returned.");
    for(var key of ["budgetId","vendorId","amount","requestDate","dateNeeded"])if(snapshot[key]!==wanted[key])throw new Error("Header "+key+" was not verified.");
    if((snapshot.budgetModificationId==null?null:snapshot.budgetModificationId)!==(wanted.budgetModificationId==null?null:wanted.budgetModificationId))throw new Error("Linked budget modification was not verified.");
    if(!Array.isArray(snapshot.lines)||snapshot.lines.length!==wanted.lines.length)throw new Error("PO line count was not verified.");
    var ids=new Set();snapshot.lines.forEach(function(line,index){if(typeof line.ID!=="string"||!/^\d+$/.test(line.ID)||ids.has(line.ID))throw new Error("Unique saved line IDs were not verified.");ids.add(line.ID);for(var field of ["key","budgetItemId","description","costElement","pricingMode","quantity","unitPrice","finalAmount"])if(line[field]!==wanted.lines[index][field])throw new Error("Line "+(index+1)+" "+field+" was not verified.");});return snapshot;
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
      var payload=check?{action:"Check",budgetId:captured.payload.budgetId,userAccessId:captured.payload.userAccessId,token:captured.payload.token}:captured.payload;
      captured.busy=true;options.onState(captured,check?"checking":"saving");
      var timer;
      return Promise.race([Promise.resolve().then(function(){return options.call(payload);}),new Promise(function(resolve,reject){timer=setTimeout(function(){reject(new Error("Response was lost or timed out. The PO may have been saved."));},options.timeoutMs||90000);})]).then(function(receipt){
        if(!receipt||receipt.contract!=="po-v1")throw new Error("PO verification is unavailable in this environment.");
        if(receipt.success!==true||receipt.writeState!=="verified"){
          if(!check&&receipt.writeState==="not-started") { captured.unknown=false;captured.rejected=true;captured.error=receipt.error||"PO was not saved.";options.onState(captured,"rejected");return null; }
          throw new Error(receipt.error||"Saved PO could not be verified.");
        }
        captured.snapshot=verify(receipt.snapshot,captured.payload);captured.unknown=false;captured.error="";options.onState(captured,"verified");return captured.snapshot;
      }).catch(function(error){captured.unknown=true;captured.error=error.message||String(error);options.onState(captured,"unknown");return null;}).finally(function(){clearTimeout(timer);captured.busy=false;options.onState(captured,"settled");});
    }
    function check(){if(!run||run.busy||!run.unknown)return Promise.resolve(null);return execute(true);}
    return {begin:begin,check:check,state:state,verify:verify};
  }
  root.LMPOController={create:create,verify:verify};
})(typeof globalThis!=="undefined"?globalThis:this);
