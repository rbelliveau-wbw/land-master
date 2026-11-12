(function(root){
  'use strict';
  var CONTRACT='po-activity-v1',OUTCOME='po-outcome-email-v1';
  var x='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var check='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12l4 4L19 6"/></svg>';
  function exactId(value){return typeof value==='string'&&/^[1-9][0-9]*$/.test(value);}
  function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function retryEligible(event){return !!event&&event.status==='Failed'&&event.canRetry===true&&event.retryAction==='RetryOutcomeEmail'&&exactId(event.id)&&exactId(event.objectId)&&typeof event.recipientKey==='string'&&!!event.recipientKey&&typeof event.revision==='string'&&!!event.revision;}
  function outcomeEvent(event){return !!event&&['Approved Email','Rejected Email'].includes(event.event)&&exactId(event.objectId)&&typeof event.recipientKey==='string'&&!!event.recipientKey&&typeof event.revision==='string'&&!!event.revision;}
  function normalizeEvents(rows,context){
    if(!Array.isArray(rows))throw new Error('PO email activity is unavailable.');
    var seen=new Set();
    return rows.map(function(row){
      if(!row||!exactId(row.id)||seen.has(row.id)||!exactId(row.objectId)||context.id&&row.objectId!==context.id||row.budgetId!=null&&row.budgetId!==context.budgetId||typeof row.event!=='string'||!['Preparing','Sending','Sent','Failed','Unknown','Skipped'].includes(row.status)||!Number.isInteger(row.attemptNo)||row.attemptNo<0)throw new Error('PO activity identities are unavailable.');
      for(var field of ['operationId','recipientKey','recipientEmail','recipientName','subject','startedAt','sentAt','error','revision'])if(row[field]!=null&&typeof row[field]!=='string')throw new Error('PO activity details are unavailable.');
      seen.add(row.id);return Object.assign({},row,{canRetry:retryEligible(row)});
    });
  }
  function page(response,context){
    if(!response||response.contract!=='po-v1'||response.activityContract!==CONTRACT||response.success!==true){var error=new Error(response&&response.error||'PO email activity needs the current Creator function update.');error.permissionDenied=!!(response&&response.permissionDenied)||/access|permission|authenticated|not authorized|denied|only .+ can view/i.test(error.message);throw error;}
    if(response.nextCursor!=null&&response.nextCursor!==''&&!exactId(response.nextCursor)||response.hasMore===true&&!exactId(response.nextCursor))throw new Error('PO activity paging is unavailable.');
    return {events:normalizeEvents(response.events,context),nextCursor:response.hasMore===true?response.nextCursor:null,outcomeNotification:response.outcomeNotification||null};
  }
  function createController(options){
    var context=Object.assign({},options.context),sequence=0;
    var state={events:[],nextCursor:null,loaded:false,readBusy:false,writeBusy:false,error:'',denied:false,operation:null,unresolved:[],outcomeNotification:null};
    function current(){return options.current()===true;}
    function emit(){if(options.onState)options.onState(state);}
    function invalidate(){sequence++;state.events=[];state.nextCursor=null;state.loaded=false;state.error='';state.operation=null;state.unresolved=[];state.outcomeNotification=null;emit();}
    function request(values){return Object.assign({budgetId:context.budgetId,userAccessId:context.userAccessId},values);}
    function denial(error){return !!(error&&error.permissionDenied)||/access|permission|authenticated|not authorized|denied|only .+ can view/i.test(error&&error.message||'');}
    function aggregateOperation(operation){return operation.initial||operation.event.recipientKey==='configuration';}
    function operationKey(operation){var event=operation.event;return [event.objectId,event.operationId,aggregateOperation(operation)?'*':event.recipientKey].join('|');}
    function unresolvedFor(event){return state.unresolved.find(function(operation){return operation.event.objectId===event.objectId&&operation.event.operationId===event.operationId&&(aggregateOperation(operation)||operation.event.recipientKey===event.recipientKey);});}
    function unresolvedPlan(notice){return state.unresolved.some(function(operation){return aggregateOperation(operation)&&operation.event.objectId===context.id&&operation.event.operationId===notice.operationId;});}
    function removeUnresolved(operation){var key=operationKey(operation);state.unresolved=state.unresolved.filter(function(previous){return operationKey(previous)!==key;});}
    function rememberUnresolved(operation){removeUnresolved(operation);state.unresolved.push(operation);}
    function canRetryEvent(event){return retryEligible(event)&&!unresolvedFor(event);}
    async function load(older){
      if(!current()||state.writeBusy||older&&state.readBusy||older&&!state.nextCursor)return;
      var own=++sequence,cursor=older?state.nextCursor:null;
      state.readBusy=true;state.error='';state.denied=false;emit();
      try{
        var payload=request({action:'Activity'});if(context.id)payload.id=context.id;if(cursor)payload.cursor=cursor;
        var response=await options.call(payload);if(!current()||own!==sequence)return;
        var result=page(response,context),ids=new Set(state.events.map(function(row){return row.id;}));
        if(older&&result.events.some(function(row){return ids.has(row.id);}))throw new Error('PO activity page overlaps the current list. Refresh before loading older activity.');
        state.events=older?state.events.concat(result.events):result.events;state.nextCursor=result.nextCursor;state.loaded=true;state.outcomeNotification=result.outcomeNotification;
      }catch(error){if(current()&&own===sequence){state.error=error.message||String(error);if(denial(error)){state.events=[];state.nextCursor=null;state.loaded=false;state.outcomeNotification=null;state.denied=true;}}}
      finally{if(current()&&own===sequence){state.readBusy=false;emit();}}
    }
    function acceptOutcome(response,operation){
      if(!response||response.contract!=='po-v1'||response.activityContract!==CONTRACT||response.success!==true){var failure=new Error(response&&response.error||'The email attempt could not be checked.');failure.permissionDenied=!!(response&&response.permissionDenied);throw failure;}
      var notice=response.outcomeNotification;
      if(!notice||notice.contract!==OUTCOME||typeof notice.emailSent!=='boolean'||!['Sent','Failed','Unknown','Preparing','Partial','Not Started'].includes(notice.state))throw new Error('The email result could not be checked.');
      if(notice.id!=null&&notice.id!==operation.event.objectId||notice.budgetId!=null&&notice.budgetId!==context.budgetId||notice.revision!=null&&notice.revision!==operation.event.revision)throw new Error('The PO email result belongs to another saved submission.');
      var events=normalizeEvents(response.events,Object.assign({},context,{id:operation.event.objectId}));
      // The targeted event must remain in its immutable submission revision.
      if(events.some(function(row){return row.revision!==operation.event.revision;}))throw new Error('The PO email submission changed. Refresh its activity.');
      var aggregate=operation.initial||operation.event.recipientKey==='configuration';
      if(operation.initial&&notice.state==='Not Started'&&!events.length&&notice.id===operation.event.objectId&&notice.revision===operation.event.revision){operation.status='Not Started';operation.unknown=false;operation.confirmedRead=true;operation.message=notice.message||'No outcome email attempt was recorded.';state.outcomeNotification=notice;return notice;}
      var matching=events.filter(function(row){return row.operationId===operation.event.operationId&&(aggregate||row.recipientKey===operation.event.recipientKey);});
      if(!matching.length)throw new Error('The targeted email attempt could not be found.');
      matching.sort(function(a,b){return b.attemptNo-a.attemptNo;});
      var latest=matching[0];
      operation.confirmedRead=true;
      operation.unknown=aggregate?['Preparing','Unknown'].includes(notice.state):['Preparing','Sending','Unknown'].includes(latest.status);
      operation.alreadySent=!aggregate&&latest.status==='Skipped'&&!!latest.sentAt;
      operation.status=aggregate?notice.state:operation.alreadySent?'Sent':latest.status;operation.message=aggregate?notice.message||'':latest.error||notice.message||'';operation.events=events;state.outcomeNotification=notice;
      if(!operation.unknown)removeUnresolved(operation);
      var replacements=new Map(events.map(function(row){return [row.id,row];}));
      state.events=state.events.map(function(row){var next=replacements.get(row.id);if(next)replacements.delete(row.id);return next||row;});
      state.events=Array.from(replacements.values()).concat(state.events).sort(function(a,b){return BigInt(a.id)===BigInt(b.id)?0:BigInt(a.id)>BigInt(b.id)?-1:1;});
      state.events.forEach(function(row){if(row.operationId===operation.event.operationId&&row.recipientKey===operation.event.recipientKey&&row.id!==latest.id)row.canRetry=false;});
      return notice;
    }
    function canStartOutcome(){var notice=state.outcomeNotification;return !!context.id&&state.loaded&&!state.readBusy&&notice&&notice.contract===OUTCOME&&notice.id===context.id&&notice.budgetId===context.budgetId&&notice.state==='Not Started'&&notice.canRetryEmail===true&&typeof notice.revision==='string'&&!!notice.revision&&['Approved','Rejected'].includes(notice.outcome)&&typeof notice.operationId==='string'&&!!notice.operationId&&!unresolvedPlan(notice);}
    function canResumeOutcome(){var notice=state.outcomeNotification;return !!context.id&&state.loaded&&!state.readBusy&&notice&&notice.contract===OUTCOME&&notice.id===context.id&&notice.budgetId===context.budgetId&&notice.canResumeEmail===true&&Number.isInteger(notice.missingCount)&&notice.missingCount>0&&exactId(notice.planId)&&typeof notice.revision==='string'&&!!notice.revision&&['Approved','Rejected'].includes(notice.outcome)&&typeof notice.operationId==='string'&&!!notice.operationId&&!unresolvedPlan(notice);}
    async function send(event,checking,initial){
      if(!current()||state.writeBusy)return;
      if(checking){if(!state.operation||!state.operation.unknown)return;}else{
        if(state.operation&&state.operation.unknown)return;
        if(initial){if(initial==='resume'?!canResumeOutcome():!canStartOutcome())return;var notice=state.outcomeNotification;event={id:initial==='resume'?notice.planId:'',objectId:context.id,event:notice.outcome+' Email',operationId:notice.operationId,revision:notice.revision,recipientEmail:'',recipientName:initial==='resume'?'Recipients Without An Attempt':'Outcome Recipients'};}
        else if(!canRetryEvent(event)||!state.events.some(function(row){return row===event&&canRetryEvent(row);}))return;
        state.operation={event:Object.assign({},event),initial:!!initial,resume:initial==='resume',status:'Preparing',unknown:false,message:'',events:[]};
      }
      sequence++;state.readBusy=false;var operation=state.operation;state.writeBusy=true;state.error='';operation.checking=!!checking;operation.confirmedRead=false;emit();
      var timer;
      try{
        var payload=request({action:checking?'CheckOutcomeEmail':'RetryOutcomeEmail',id:operation.event.objectId,activityId:operation.event.id,expectedRevision:operation.event.revision});
        var response=await Promise.race([Promise.resolve().then(function(){return options.call(payload);}),new Promise(function(resolve,reject){timer=setTimeout(function(){reject(new Error('The email reply was lost or timed out. Check Status before another send.'));},options.timeoutMs||90000);})]);
        if(!current()||state.operation!==operation)return;
        if(!checking&&response&&response.contract==='po-v1'&&response.writeState==='not-started'&&response.success!==true){operation.status='Failed';operation.unknown=false;operation.confirmedRead=true;operation.message=response.error||'The email was not sent. Refresh activity before retrying.';state.events.forEach(function(row){if(row.id===operation.event.id)row.canRetry=false;});state.events=state.events.slice();if(response.permissionDenied||denial({message:operation.message})){state.events=[];state.loaded=false;state.denied=true;state.error=operation.message;}}
        else acceptOutcome(response,operation);
      }catch(error){if(current()&&state.operation===operation){operation.status='Unknown';operation.unknown=true;operation.message=error.message||String(error);if(denial(error)){state.events=[];state.loaded=false;state.outcomeNotification=null;state.error=operation.message;state.denied=true;}}}
      finally{clearTimeout(timer);if(current()&&state.operation===operation){state.writeBusy=false;emit();}}
    }
    function dismissOperation(silent){
      if(state.writeBusy)return;var operation=state.operation;
      if(operation&&operation.unknown){
        removeUnresolved(operation);
        var uncertain=operation.confirmedRead&&operation.events?operation.events.filter(function(row){return ['Preparing','Sending','Unknown'].includes(row.status);}):[];
        if(uncertain.length)uncertain.forEach(function(row){rememberUnresolved({event:Object.assign({},row),status:row.status,unknown:true,message:row.error||'',events:[]});});else rememberUnresolved(operation);
      }
      state.operation=null;if(!silent)emit();
    }
    function checkEvent(event){if(!current()||state.writeBusy||state.operation||!outcomeEvent(event)||!state.events.includes(event))return;state.operation=unresolvedFor(event)||{event:Object.assign({},event),status:event.status,unknown:true,message:event.error||'',events:[]};return send(null,true);}
    function checkUnresolved(){if(!current()||state.writeBusy||state.operation||!state.unresolved.length)return;state.operation=state.unresolved[0];return send(null,true);}
    return {state:function(){return state;},load:load,retry:function(event){return send(event,false);},canRetryEvent:canRetryEvent,hasUnresolved:function(event){return !!unresolvedFor(event);},startOutcome:function(){return send(null,false,true);},resumeOutcome:function(){return send(null,false,'resume');},canStartOutcome:canStartOutcome,canResumeOutcome:canResumeOutcome,check:function(){return send(null,true);},checkEvent:checkEvent,checkUnresolved:checkUnresolved,dismissOperation:dismissOperation,invalidate:invalidate};
  }
  function create(options){
    var overlay=null,card=null,controller=null,context=null,trigger=null,inert=[],scopeTimer=null,renderedEvents=null,renderedOperation=null,settleTimer=null,visualBusy=false,startedAt=0,wasWriteBusy=false;
    var retained=new Map();
    function current(){return !!overlay&&context&&options.scope(context.budgetId)===context.scope;}
    function close(force){if(!overlay||!force&&(controller.state().writeBusy||visualBusy))return;clearInterval(scopeTimer);clearTimeout(settleTimer);scopeTimer=null;settleTimer=null;if(!force)controller.dismissOperation(true);if(!force&&controller.state().unresolved.length)retained.set(context.key,controller);else retained.delete(context.key);var oldOverlay=overlay;overlay=null;oldOverlay.remove();inert.forEach(function(pair){pair[0].inert=pair[1];});inert=[];if(trigger&&trigger.isConnected)trigger.focus();}
    function date(value){if(!value)return '—';var parsed=new Date(value);return Number.isNaN(parsed.getTime())?value:parsed.toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});}
    function status(row){return '<span class="po-activity-badge" data-state="'+esc(row.status.toLowerCase())+'">'+esc(row.status)+'</span>';}
    function rowHtml(row){return '<details class="po-activity-event" data-po-activity-id="'+esc(row.id)+'"><summary><time>'+esc(date(row.sentAt||row.startedAt))+'</time><span class="po-activity-kind"><strong>'+esc(row.event)+'</strong><small>PO '+esc(row.objectId)+' · Attempt '+row.attemptNo+'</small></span><span class="po-activity-recipient"><strong>'+esc(row.recipientName||row.recipientEmail||'Recipient unavailable')+'</strong>'+(row.recipientName&&row.recipientEmail?'<small>'+esc(row.recipientEmail)+'</small>':'')+'</span>'+status(row)+'<span class="po-activity-chevron" aria-hidden="true">⌄</span></summary><div class="po-activity-event-body"><dl><div><dt>Subject</dt><dd>'+esc(row.subject||'—')+'</dd></div><div><dt>Recipient</dt><dd>'+esc(row.recipientEmail||'Not Configured')+'</dd></div><div><dt>Attempt</dt><dd>'+row.attemptNo+'</dd></div>'+(row.sentAt?'<div><dt>Sent At</dt><dd>'+esc(date(row.sentAt))+'</dd></div>':'')+(row.error?'<div class="po-activity-error"><dt>Details</dt><dd>'+esc(row.error)+'</dd></div>':'')+'</dl>'+(controller.hasUnresolved(row)?'<p class="po-activity-unresolved-note">A later email reply needs a status check.</p>':'')+'<div class="po-activity-row-actions">'+(controller.canRetryEvent(row)?'<button type="button" class="mbtn neutral" data-po-activity-retry="'+esc(row.id)+'">Retry Email</button>':'')+(outcomeEvent(row)&&(['Unknown','Sending','Preparing'].includes(row.status)||controller.hasUnresolved(row))?'<button type="button" class="mbtn neutral" data-po-activity-check="'+esc(row.id)+'">Check Status</button>':'')+'</div></div></details>';}
    function renderProgress(state){
      var operation=state.operation,busy=state.writeBusy,sent=!busy&&operation.status==='Sent',unknown=!busy&&operation.unknown;
      renderedEvents=null;
      card.classList.add('is-progress');card.querySelector('[data-po-activity-title]').textContent=operation.checking?'Email Status':operation.resume?'Resume PO Emails':'Retry PO Email';
      card.querySelector('[data-po-activity-toolbar]').hidden=true;card.querySelector('[data-po-activity-close]').disabled=busy;
      if(renderedOperation!==operation){
        card.querySelector('[data-po-activity-content]').innerHTML='<div class="po-activity-progress"><div class="po-activity-meter" role="progressbar" aria-label="Email Attempt" aria-valuemin="0" aria-valuemax="3"><i data-lm-motion="meter"></i></div><ol>'+[0,1,2].map(function(){return '<li><span class="po-activity-stage-icon"></span><strong></strong><span></span></li>';}).join('')+'</ol><section class="po-activity-result" role="status" aria-live="polite"><h3></h3><p></p></section></div>';
        card.querySelector('footer').innerHTML='<span class="po-spacer"></span><button class="mbtn neutral" type="button" data-po-activity-operation-check hidden>Check Status</button><button class="mbtn neutral" type="button" data-po-activity-operation-done>Done</button>';renderedOperation=operation;
      }
      var panel=card.querySelector('.po-activity-progress'),meter=panel.querySelector('.po-activity-meter'),complete=sent||operation.checking&&operation.confirmedRead;panel.dataset.state=busy?'running':sent?'success':'warning';meter.setAttribute('aria-valuenow',busy?'1':complete?'3':'1');meter.querySelector('i').style.width=busy?'33.333%':complete?'100%':'33.333%';
      var labels=operation.checking?['Read PO Decision','Read Email Attempt','Confirm Email Status']:['Check Attempt','Send Email','Confirm Email'];
      panel.querySelectorAll('li').forEach(function(row,index){var done=!busy&&(sent||operation.confirmedRead&&(operation.checking||index===0));row.querySelector('.po-activity-stage-icon').innerHTML=done?check:busy&&index===0?'<span class="po-progress-spin"></span>':String(index+1);row.querySelector('strong').textContent=labels[index];row.lastElementChild.textContent=busy?index===0?'Checking':'Up Next':done?'Done':unknown?'Needs Review':'Not Sent';});
      panel.querySelector('h3').textContent=busy?operation.checking?'Checking Email Status…':'Sending Email…':sent?operation.alreadySent?'Email Already Sent':'Email Sent':unknown?'Email Status Needs Review':'Email Not Sent';panel.querySelector('p').textContent=busy?operation.event.recipientEmail||operation.event.recipientName:operation.message||operation.event.recipientEmail;
      card.querySelector('[data-po-activity-operation-check]').hidden=!unknown;card.querySelector('[data-po-activity-operation-check]').disabled=busy;var doneButton=card.querySelector('[data-po-activity-operation-done]');doneButton.disabled=busy;doneButton.className='mbtn '+(sent?'primary':'neutral');doneButton.textContent='Back To Activity';
      if(!busy&&(document.activeElement===card||!card.contains(document.activeElement)))card.querySelector(unknown?'[data-po-activity-operation-check]':'[data-po-activity-operation-done]').focus();
    }
    function render(){
      if(!current())return;var state=controller.state();
      if(state.denied){if(options.error)options.error(new Error(state.error||'PO email activity access is unavailable.'));close(true);return;}
      if(state.operation){
        if(state.writeBusy&&!wasWriteBusy){startedAt=Date.now();visualBusy=true;clearTimeout(settleTimer);card.focus();}wasWriteBusy=state.writeBusy;
        var reduced=!!(root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches),wait=!state.writeBusy&&visualBusy&&!reduced?Math.max(0,1120-(Date.now()-startedAt)):0;
        if(wait){clearTimeout(settleTimer);settleTimer=setTimeout(function(){if(current()&&controller.state()===state){visualBusy=false;render();}},wait);return;}
        visualBusy=state.writeBusy;renderProgress(state);return;
      }
      renderedOperation=null;wasWriteBusy=false;visualBusy=false;
      card.classList.remove('is-progress');card.querySelector('[data-po-activity-title]').textContent='PO Email Activity';card.querySelector('[data-po-activity-toolbar]').hidden=false;card.querySelector('[data-po-activity-close]').disabled=false;
      card.querySelector('[data-po-activity-refresh]').disabled=state.readBusy;card.querySelector('[data-po-activity-status]').textContent=state.error||(!state.loaded?'Loading activity…':state.readBusy?'Refreshing…':state.unresolved.length?'An email reply needs a status check.':'');card.querySelector('[data-po-activity-status]').dataset.state=state.error?'error':state.readBusy?'pending':'verified';
      var body=card.querySelector('[data-po-activity-content]'),list=body.querySelector('.po-activity-list');
      if(!list){body.innerHTML='<div class="po-activity-list" aria-label="PO Email Attempts"></div>';list=body.querySelector('.po-activity-list');renderedEvents=null;}
      if(renderedEvents!==state.events||!state.loaded){
        var scroll=body.scrollTop,open=new Set(Array.from(list.querySelectorAll('details[open]')).map(function(node){return node.dataset.poActivityId;})),active=document.activeElement&&document.activeElement.closest('[data-po-activity-id]'),focused=active&&active.dataset.poActivityId;
        list.innerHTML=state.events.length?state.events.map(rowHtml).join(''):'<p class="po-activity-empty">'+(state.readBusy&&!state.loaded?'Loading Activity…':state.loaded?state.nextCursor?'No Visible Activity On This Page':'No PO Email Activity Yet':'Activity Unavailable')+'</p>';renderedEvents=state.events;
        list.querySelectorAll('details').forEach(function(node){node.open=open.has(node.dataset.poActivityId);});body.scrollTop=scroll;if(focused){var node=Array.from(list.querySelectorAll('details')).find(function(row){return row.dataset.poActivityId===focused;});if(node)node.querySelector('summary').focus({preventScroll:true});}
      }
      card.querySelector('footer').innerHTML='<span class="po-activity-sent-note">Sent records a successful send request.</span><span class="po-spacer"></span>'+(state.unresolved.length?'<button class="mbtn neutral" type="button" data-po-activity-check-unresolved>Check Email Status</button>':'')+(controller.canStartOutcome()?'<button class="mbtn neutral" type="button" data-po-activity-start>Retry Outcome Email</button>':'')+(controller.canResumeOutcome()?'<button class="mbtn neutral" type="button" data-po-activity-resume>Resume Outcome Emails</button>':'')+(state.nextCursor?'<button class="mbtn neutral" type="button" data-po-activity-older '+(state.readBusy?'disabled':'')+'>Older Activity</button>':'')+'<button class="mbtn neutral" type="button" data-po-activity-close>Close</button>';
    }
    async function open(budget,source,id){
      if(overlay)return;if(!budget||!exactId(budget.ID)||id!=null&&!exactId(id))throw new Error('A saved Budget and PO are required.');
      trigger=source||document.activeElement;context={budgetId:String(budget.ID),userAccessId:options.userAccessId(),scope:options.scope(String(budget.ID)),id:id||null};if(!context.scope)throw new Error('Open a Budget phase before viewing PO email activity.');context.key=context.scope+'|'+(context.id||'all');renderedEvents=null;renderedOperation=null;wasWriteBusy=false;visualBusy=false;
      overlay=document.createElement('div');overlay.className='po-activity-overlay';overlay.setAttribute('data-lm-motion-exit','none');overlay.innerHTML='<section class="po-activity-card" role="dialog" aria-modal="true" aria-labelledby="po-activity-title" aria-describedby="po-activity-context" tabindex="-1"><header><div><h2 id="po-activity-title" data-po-activity-title>PO Email Activity</h2><p id="po-activity-context">'+esc(options.phaseName(budget))+(id?' · PO '+esc(id):'')+'</p></div><button type="button" class="po-x" data-po-activity-close aria-label="Close PO Email Activity">'+x+'</button></header><div class="po-activity-toolbar" data-po-activity-toolbar><p data-po-activity-status data-lm-motion="feedback" role="status" aria-live="polite"></p><button type="button" class="mbtn neutral" data-po-activity-refresh>Refresh</button></div><div class="po-activity-content" data-po-activity-content data-lm-motion="panel"></div><footer></footer></section>';
      document.body.appendChild(overlay);card=overlay.querySelector('.po-activity-card');inert=Array.from(document.body.children).filter(function(node){return node!==overlay&&node.tagName!=='SCRIPT'&&node.tagName!=='STYLE';}).map(function(node){var old=node.inert;node.inert=true;return [node,old];});
      var retainedController=retained.get(context.key),boundContext=context;
      controller=retainedController||createController({context:boundContext,current:function(){return current()&&context.key===boundContext.key&&context.userAccessId===boundContext.userAccessId;},call:options.call,onState:render});retained.delete(context.key);
      // Unknown targets retain their exact check/no-replay context, not a modal lock.
      overlay.addEventListener('click',function(event){if(!current()){close(true);return;}var target=event.target.closest('button');if(event.target===overlay||target&&target.hasAttribute('data-po-activity-close')){close();return;}if(!target)return;var state=controller.state();if(state.writeBusy||visualBusy)return;if(target.hasAttribute('data-po-activity-operation-done')){controller.dismissOperation();card.querySelector('[data-po-activity-close]').focus();controller.load(false);return;}if(target.hasAttribute('data-po-activity-operation-check')){controller.check();return;}if(state.operation)return;if(target.hasAttribute('data-po-activity-check-unresolved')){controller.checkUnresolved();return;}if(target.hasAttribute('data-po-activity-refresh')){controller.load(false);return;}if(target.hasAttribute('data-po-activity-older')){controller.load(true);return;}if(target.hasAttribute('data-po-activity-start')){controller.startOutcome();return;}if(target.hasAttribute('data-po-activity-resume')){controller.resumeOutcome();return;}var row=state.events.find(function(item){return item.id===(target.dataset.poActivityRetry||target.dataset.poActivityCheck);});if(!row)return;if(target.dataset.poActivityRetry)controller.retry(row);if(target.dataset.poActivityCheck)controller.checkEvent(row);});
      overlay.addEventListener('keydown',function(event){if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return;}if(event.key==='Tab'){var nodes=Array.from(card.querySelectorAll('button:not(:disabled),summary,[tabindex="0"]')).filter(function(node){return node.getClientRects().length;});var first=nodes[0],last=nodes[nodes.length-1];if(!first){event.preventDefault();card.focus();return;}if(event.shiftKey&&(document.activeElement===first||document.activeElement===card)){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
      scopeTimer=setInterval(function(){if(overlay&&!current()){controller.invalidate();close(true);}},500);
      render();card.querySelector('[data-po-activity-close]').focus();await controller.load(false);
    }
    return {open:open,close:close,isOpen:function(){return !!overlay;}};
  }
  root.LMPOActivity={create:create,createController:createController,normalizeEvents:normalizeEvents,page:page,retryEligible:retryEligible};
})(typeof globalThis!=='undefined'?globalThis:this);
