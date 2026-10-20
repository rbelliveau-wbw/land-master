(function(root){
  'use strict';
  var check='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12l4 4L19 6"/></svg>';
  function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function describe(run){
    var action=run.payload&&run.payload.action||'Save',preserving=!!(run.payload&&run.payload.preserveApproval),snapshot=run.snapshot,bundle=snapshot&&snapshot.approvalBundle;
    var completed=!!(snapshot||run.deleted),warning=!!(snapshot&&snapshot.status==='Submitted'&&snapshot.approvalState==='Pending'&&!(bundle&&bundle.emailSent));
    var state=completed?(warning?'warning':'success'):run.rejected?'error':'unknown';
    var title=run.deleted?'Purchase order deleted':!completed?'Purchase order needs review':preserving?'Purchase order updated':action==='RetryEmail'?'Approval notification updated':action==='Reject'?'Purchase order rejected':action==='Approve'?(snapshot.approvalState==='Approved'?'Purchase order approved':'Approval recorded'):snapshot.status==='Submitted'?'Purchase order submitted':'Draft saved';
    var active=bundle&&bundle.rows.find(function(row){return row.status==='Pending';});
    var message=run.deleted?'PO and associated records removed.':!completed?'Check the saved status before trying again.':preserving?'Current approval chain and decisions kept.':snapshot.approvalState==='Rejected'?'Budget reservation retained.':snapshot.approvalState==='Approved'?'Approval chain complete.':snapshot.status==='Submitted'?(active?'Awaiting '+active.role+' approval.':'Budget reserved.')+(warning?' Email needs attention.':bundle&&bundle.emailSent?' Approval email sent.':''):'No budget reserved.';
    if(run.attachmentResult&&(run.attachmentResult.total||!run.attachmentResult.complete)){message+=' '+(run.attachmentResult.message||'Attachments need review')+'.';if(!run.attachmentResult.complete){state='warning';title='PO saved · attachments need attention';message+=' Review PO to finish the remaining files.';warning=true;}}
    return {state:state,title:title,message:message,completed:completed,warning:warning};
  }
  function mount(options){
    var card=options.card,overlay=options.overlay,model=options.model,action=options.action||'Save';
    overlay.classList.add('po-progress-mode');
    card.querySelector('#po-title').textContent=action==='Approve'?'Approving purchase order':action==='Reject'?'Rejecting purchase order':action==='RetryEmail'?'Sending approval notification':action==='Delete'?'Deleting purchase order':action==='Submit'?'Submitting purchase order':'Saving purchase order';
    var labels=action==='Delete'?['Check deletion details','Delete PO and associated records','Confirm records removed']:['Approve','Reject','RetryEmail'].includes(action)?['Check approval decision','Record decision and update chain','Confirm approval and notification']:['Check purchase order details','Save PO and budget changes','Confirm saved purchase order'];
    var vendor=model.vendors.find(function(row){return row.ID===model.vendorId;});
    card.querySelector('#po-context').textContent=model.phase+' · '+(vendor&&vendor.Vendor_Name||model.vendorName||'Vendor')+' · '+options.money(model.amount);
    card.querySelector('.po-heading').insertAdjacentHTML('beforeend','<div class="po-progress-bar" role="progressbar" aria-label="Purchase order progress" aria-valuemin="0" aria-valuemax="3" aria-valuenow="1"><i style="width:33.333%"></i></div>');
    card.querySelector('.po-body').innerHTML='<ol class="po-progress-steps">'+labels.map(function(label,i){return '<li class="po-progress-step '+(i===0?'done':i===1?'run':'next')+'"><span class="po-progress-icon" aria-hidden="true">'+(i===0?check:i===1?'<span class="po-progress-spin"></span>':'3')+'</span><strong class="po-progress-name">'+esc(label)+'</strong><span class="po-progress-chip">'+(i===0?'Done':i===1?'Running':'Up next')+'</span></li>';}).join('')+'</ol><section class="po-progress-outcome" data-po-outcome hidden><span class="po-progress-outcome-icon" aria-hidden="true"></span><div><h3 data-po-outcome-title></h3><p data-po-outcome-message></p></div></section><div class="po-error" data-po-error role="alert" hidden></div><details class="po-progress-details" hidden><summary>Saved items</summary><div data-po-results></div></details>';
    card.querySelector('footer').innerHTML='<p data-po-status role="status" aria-live="polite" aria-atomic="true">'+(action==='Delete'?'Deleting purchase order…':['Approve','Reject','RetryEmail'].includes(action)?'Updating approval…':'Saving purchase order…')+'</p><div class="po-progress-actions"><button class="mbtn neutral" data-po-check hidden>Check status</button><button class="mbtn neutral" data-po-done hidden>Review PO</button><button class="mbtn primary" data-po-finish disabled>Done</button></div>';
    card.querySelector('[data-po-close]').disabled=true;
  }
  function update(options){
    var card=options.card,run=options.run,settled=options.settled;
    var result=settled?describe(run):null,state=result?result.state:'running';
    var bar=card.querySelector('.po-progress-bar');bar.className='po-progress-bar '+state;
    bar.setAttribute('aria-valuenow',result&&result.completed?'3':'1');bar.querySelector('i').style.width=result&&result.completed?'100%':'33.333%';
    card.querySelectorAll('.po-progress-step').forEach(function(row,i){
      var phase=result?(result.completed?(result.warning&&i===2?'warning':'done'):i===0?'done':i===1?'warning':'pending'):i===0?'done':i===1?'run':'next';
      row.className='po-progress-step '+phase;row.querySelector('.po-progress-icon').innerHTML=phase==='done'?check:phase==='run'?'<span class="po-progress-spin"></span>':String(i+1);
      row.querySelector('.po-progress-chip').textContent={done:'Done',run:'Running',next:'Up next',pending:'Waiting',warning:result&&run.rejected?'Not saved':'Needs review'}[phase];
    });
    card.querySelector('[data-po-outcome]').hidden=!settled;
    card.querySelector('[data-po-close]').disabled=!settled;
    card.querySelector('[data-po-finish]').disabled=!settled;
    card.querySelector('[data-po-finish]').textContent=result&&result.state==='success'?'Done':'Close';
    card.querySelector('[data-po-check]').hidden=!(settled&&run.unknown);card.querySelector('[data-po-check]').disabled=!settled;
    card.querySelector('[data-po-done]').hidden=!(settled&&(run.snapshot||run.rejected));card.querySelector('[data-po-done]').disabled=!settled;card.querySelector('[data-po-done]').textContent=run.snapshot?'Review PO':run.deletion?'Back to PO':'Back to draft';
    if(result){
      card.querySelector('#po-title').textContent=run.decision?'Purchase order approval':'Purchase order';
      var outcome=card.querySelector('[data-po-outcome]');outcome.className='po-progress-outcome '+result.state;
      card.querySelector('.po-progress-outcome-icon').innerHTML=result.state==='success'?check:'!';
      card.querySelector('[data-po-outcome-title]').textContent=result.title;card.querySelector('[data-po-outcome-message]').textContent=result.message;
      card.querySelector('[data-po-status]').textContent=result.state==='success'?'Complete':result.warning?'Email needs attention':run.unknown?'Saved status needs review':'Not saved';
    }else card.querySelector('[data-po-status]').textContent=options.stage==='checking'?'Checking saved status…':'Working…';
    return result;
  }
  function clear(options){options.overlay.classList.remove('po-progress-mode');var bar=options.card.querySelector('.po-progress-bar');if(bar)bar.remove();}
  root.LMPOProgress={mount:mount,update:update,describe:describe,clear:clear};
})(typeof globalThis!=='undefined'?globalThis:this);
