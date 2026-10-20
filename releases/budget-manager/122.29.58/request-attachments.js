(function(root){
  'use strict';
  var x='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  var draftSequence=0;
  function draft(model,scope){return model.attachmentDraft||(model.attachmentDraft={scope:scope,entries:[],busy:false,target:null,error:''});}
  function addDraft(q,files){
    if(q.busy||q.entries.some(function(e){return e.status==='unknown';}))return false;
    files=Array.from(files||[]);var invalid=files.findIndex(function(f){return !f||f.size>50*1024*1024;});
    if(invalid>=0){q.error=(files[invalid]&&files[invalid].name||'File')+' exceeds the 50 MB file limit.';return false;}
    files.forEach(function(file){if(!q.entries.some(function(e){return e.file.name===file.name&&e.file.size===file.size&&e.file.lastModified===file.lastModified;}))q.entries.push({key:'queued-file-'+(++draftSequence),file:file,status:'queued',error:''});});q.error='';return true;
  }
  function draftSummary(q){var saved=q.entries.filter(function(e){return e.status==='saved';}).length;return {total:q.entries.length,saved:saved,complete:saved===q.entries.length,unknown:q.entries.some(function(e){return e.status==='unknown';}),message:saved+' of '+q.entries.length+' attachments saved'};}
  async function flushDraft(q,context,adapter){
    if(q.busy)return draftSummary(q);
    if(!context||!['payment','modification'].includes(context.kind)||typeof context.id!=='string'||!/^\d+$/.test(context.id)||typeof context.budgetId!=='string'||!/^\d+$/.test(context.budgetId))throw new Error('Save the request before uploading files.');
    if(q.target&&['kind','id','budgetId'].some(function(key){return q.target[key]!==context[key];}))throw new Error('These files belong to another request.');
    q.target=Object.assign({},context);q.busy=true;
    try{
      for(var entry of q.entries){
        if(entry.status==='saved')continue;
        if(entry.status==='unknown')break;
        if(!adapter.current(q.scope)||!adapter.allowed()){entry.error='Attachment access changed. Reopen the saved request.';entry.status='blocked';break;}
        entry.status='uploading';entry.error='';if(adapter.changed)adapter.changed();
        var result;
        try{result=await adapter.upload(entry.file,q.target);}catch(error){result={success:false,unknown:true,message:error.message};}
        entry.attachmentId=result&&result.attachmentId||'';
        entry.status=result&&result.success?'saved':result&&result.safeRetry?'failed':'unknown';
        entry.error=entry.status==='saved'?'':result&&result.message||'Upload needs review.';
        if(adapter.changed)adapter.changed();if(entry.status!=='saved')break;
      }
    }finally{q.busy=false;if(adapter.changed)adapter.changed();}
    return draftSummary(q);
  }
  function create(options){
    var surfaces=[],picker=null,sequence=0;
    function current(s){return s.root.isConnected&&s.scope===options.scope(s.budget)&&s.isCurrent();}
    function files(s){return options.files(s.budget).filter(function(f){return s.requestContext.kind==='modification'?f.modificationId===s.requestContext.id&&!f.paymentRequestId:f.paymentRequestId===s.requestContext.id&&!f.modificationId;});}
    function update(s){
      if(!current(s))return;
      var q=s.model.attachmentDraft,known=options.loaded(s.budget),count=s.requestContext.id&&known?files(s).length:!s.requestContext.id&&q?q.entries.length:null;
      s.nav.querySelector('[data-ra-count]').textContent=count==null?(s.requestContext.id&&s.loading?'…':'—'):String(count);
      s.details.hidden=s.model.attachmentTab==='files';s.pane.hidden=!s.details.hidden;
      s.nav.querySelectorAll('[role=tab]').forEach(function(b){var selected=b.dataset.raTab===s.model.attachmentTab;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});
      if(!s.requestContext.id){renderDraft(s);return;}
      if(s.loading&&!known){s.content.innerHTML='<div class="request-attachment-empty" role="status">Loading attachments…</div>';return;}
      if(s.error){s.content.innerHTML='<div class="request-attachment-empty" role="status">'+esc(s.error)+' <button type="button" class="btn" data-ra-retry>Retry</button></div>';return;}
      options.renderFiles(s.budget,s.content,s);
      if(q&&q.entries.some(function(e){return e.status!=='saved';}))renderDraft(s,true);
    }
    function renderDraft(s,saved){
      var q=s.model.attachmentDraft||draft(s.model,options.draftScope?options.draftScope(s.budget):s.scope),allowed=options.canStage&&options.canStage(s.budget),locked=q.busy||options.busy()||!!s.model.createUnknown;
      if(q.scope!==(options.draftScope?options.draftScope(s.budget):s.scope)){s.content.innerHTML='<div class="request-attachment-empty">Attachment context changed. Reopen this request.</div>';return;}
      var labels={queued:'Ready to upload',uploading:'Uploading…',saved:'Saved',failed:'Upload failed',unknown:'Check upload status',blocked:'Access changed'};
      var html='<section class="request-attachment-draft"><strong>'+ (saved?'Pending attachments':'Attachments')+'</strong><p class="request-attachment-hint">'+(saved?'The request is saved. Finish the remaining files here.':s.model.requestFlow?'Files upload when this request is saved. This is a preview draft.':'Files upload when you save this request.')+'</p>';
      if(allowed)html+='<div class="attachment-page-drop" data-ra-draft-drop><span>Drop files here · 50 MB per file</span><button type="button" class="btn" data-ra-draft-choose '+(locked||q.entries.some(function(e){return e.status==='unknown';})?'disabled':'')+'>Choose Files</button><input type="file" multiple hidden data-ra-draft-input></div>';
      else html+='<p class="request-attachment-hint">Attachment upload permission is required.</p>';
      html+='<div class="request-attachment-draft-list" data-lm-row-list="request-attachment-files">'+q.entries.map(function(e){return '<div class="attachment-page-row request-attachment-draft-row" data-record-id="'+e.key+'"><div><strong>'+esc(e.file.name)+'</strong><small>'+esc(labels[e.status])+(e.error?' · '+esc(e.error):'')+'</small></div>'+(['queued','failed','blocked'].includes(e.status)?'<button type="button" class="request-attachment-remove" data-ra-draft-remove="'+e.key+'" aria-label="Remove '+esc(e.file.name)+'" '+(locked?'disabled':'')+'>'+x+'</button>':'')+'</div>';}).join('')+'</div>';
      html+='<div role="status" data-lm-motion="feedback">'+esc(q.error||s.model.createUnknown&&'Request creation is unverified. Check saved requests before creating another.'||'')+'</div>';
      if(saved&&q.entries.some(function(e){return e.status!=='saved';}))html+='<button type="button" class="btn" data-ra-draft-retry '+(locked||!allowed?'disabled':'')+'>'+(q.entries.some(function(e){return e.status==='unknown';})?'Check upload status':'Upload remaining files')+'</button>';
      html+='</section>';if(saved)s.content.insertAdjacentHTML('afterbegin',html);else s.content.innerHTML=html;
    }
    function load(s){
      if(!current(s)||!s.requestContext.id)return Promise.resolve(false);
      s.loading=true;s.error='';update(s);
      return options.load(s.budget).then(function(){if(!current(s))return false;s.loading=false;update(s);return true;},function(e){if(current(s)){s.loading=false;s.error=e.message||'Attachments unavailable.';update(s);}return false;});
    }
    function mount(config){
      var old=surfaces.find(function(s){return s.root===config.root;});
      if(old)unmount(old.root);
      surfaces=surfaces.filter(function(s){return s!==old&&s.root.isConnected;});
      var nav=document.createElement('div'),pane=document.createElement('div'),key='request-attachment-'+(++sequence),model=config.model;
      if(config.trap&&!model.trigger&&!config.root.contains(document.activeElement))model.trigger=document.activeElement;
      model.attachmentTab=model.attachmentTab==='files'?'files':'details';
      nav.className='request-attachment-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Request sections');nav.setAttribute('data-lm-motion','tabs');
      nav.innerHTML='<button type="button" role="tab" id="'+key+'-details-tab" aria-controls="'+key+'-details" data-ra-tab="details">Details</button><button type="button" role="tab" id="'+key+'-files-tab" aria-controls="'+key+'-files" data-ra-tab="files">Attachments <span data-ra-count>—</span></button>';
      pane.className='request-attachment-pane';pane.id=key+'-files';pane.setAttribute('role','tabpanel');pane.setAttribute('aria-labelledby',key+'-files-tab');pane.setAttribute('data-lm-motion','panel');
      pane.innerHTML='<div data-ra-content></div>'+(!config.footer?'<div class="request-attachment-footer"><button type="button" class="mbtn neutral" data-ra-close>Close</button></div>':'');
      config.details.id=config.details.id||key+'-details';nav.querySelector('[data-ra-tab="details"]').setAttribute('aria-controls',config.details.id);
      config.details.setAttribute('role','tabpanel');config.details.setAttribute('aria-labelledby',key+'-details-tab');
      config.root.insertBefore(nav,config.details);config.root.insertBefore(pane,config.footer||config.details.nextSibling);
      var s={root:config.root,details:config.details,pane:pane,content:pane.querySelector('[data-ra-content]'),nav:nav,model:model,budget:config.budget,scope:options.scope(config.budget),isCurrent:config.current,requestContext:{kind:config.kind,id:String(config.id||''),budgetId:String(config.budget.ID)},requestTitle:config.title,loading:false,error:''};
      s.current=function(){return current(s);};s.render=function(){update(s);};
      if(config.trap){
        s.host=config.root.closest('#modOverlay');s.host.setAttribute('data-lm-motion-exit','none');
        s.background=Array.from(document.body.children).filter(function(node){return node!==s.host&&!['SCRIPT','STYLE'].includes(node.tagName);}).map(function(node){var before=node.inert;node.inert=true;return [node,before];});
        s.key=function(e){if(options.isNested&&options.isNested()||picker)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();config.close();return;}if(e.key!=='Tab')return;var nodes=Array.from(s.host.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')).filter(function(node){return node.getClientRects().length;});if(!nodes.length)return;var first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&(document.activeElement===first||!s.host.contains(document.activeElement))){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||!s.host.contains(document.activeElement))){e.preventDefault();first.focus();}};
        s.host.addEventListener('keydown',s.key);requestAnimationFrame(function(){if(current(s)&&!s.host.contains(document.activeElement))s.nav.querySelector('[aria-selected=true]').focus();});
      }
      nav.addEventListener('click',function(e){var b=e.target.closest('[data-ra-tab]');if(!b||!current(s))return;model.attachmentTab=b.dataset.raTab;update(s);});
      nav.addEventListener('keydown',function(e){if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;var buttons=Array.from(nav.querySelectorAll('[role=tab]')),at=buttons.indexOf(document.activeElement);if(at<0)return;e.preventDefault();var next=e.key==='Home'?0:e.key==='End'?1:1-at;buttons[next].click();buttons[next].focus();});
      pane.addEventListener('click',function(e){
        var q=s.model.attachmentDraft;
        if(e.target.closest('[data-ra-draft-choose]')){pane.querySelector('[data-ra-draft-input]').click();return;}
        var remove=e.target.closest('[data-ra-draft-remove]');if(remove&&q&&!q.busy&&!options.busy()){q.entries=q.entries.filter(function(f){return f.key!==remove.dataset.raDraftRemove||!['queued','failed','blocked'].includes(f.status);});update(s);var choose=pane.querySelector('[data-ra-draft-choose]');if(choose)choose.focus();return;}
        if(e.target.closest('[data-ra-draft-retry]')&&options.flushDraft){options.flushDraft(s.model,s.budget,s.requestContext,true).then(function(){if(current(s))load(s);});return;}
        if(e.target.closest('[data-ra-retry]'))load(s);if(e.target.closest('[data-ra-close]'))config.close();if(e.target.closest('[data-ra-existing]'))openPicker({surface:s,budget:s.budget,mode:'existing',trigger:e.target.closest('button')});if(e.target.closest('[data-ra-budget]')&&!options.busy()){config.close();options.openBudget(s.budget);}
      });
      function chooseDraft(selected){if(!current(s)||!options.canStage||!options.canStage(s.budget)||options.busy()||s.model.createUnknown)return;addDraft(s.model.attachmentDraft||draft(s.model,options.draftScope?options.draftScope(s.budget):s.scope),selected);update(s);}
      pane.addEventListener('change',function(e){if(e.target.matches('[data-ra-draft-input]'))chooseDraft(e.target.files);});
      pane.addEventListener('dragover',function(e){if(e.target.closest('[data-ra-draft-drop]'))e.preventDefault();});
      pane.addEventListener('drop',function(e){if(e.target.closest('[data-ra-draft-drop]')){e.preventDefault();e.stopPropagation();chooseDraft(e.dataTransfer.files);}});
      surfaces.push(s);update(s);load(s);return s;
    }
    function refresh(){surfaces.slice().forEach(function(s){if(current(s))update(s);else unmount(s.root);});}
    function unmount(node){surfaces=surfaces.filter(function(s){if(s.root!==node)return true;s.nav.remove();s.pane.remove();s.details.hidden=false;s.details.removeAttribute('role');s.details.removeAttribute('aria-labelledby');if(s.host)s.host.removeEventListener('keydown',s.key);if(s.background)s.background.forEach(function(pair){pair[0].inert=pair[1];});return false;});}
    function find(node){return surfaces.find(function(s){return current(s)&&s.pane.contains(node);})||null;}
    function closePicker(){if(!picker||picker.busy)return;var p=picker;picker=null;p.dialog.close();p.dialog.remove();if(p.trigger&&p.trigger.isConnected)p.trigger.focus();else if(p.surface&&current(p.surface))p.surface.nav.querySelector('[aria-selected="true"]').focus();}
    async function openPicker(config){
      if(picker||options.busy())return;
      var dialog=document.createElement('dialog'),p=Object.assign({dialog:dialog,busy:false,scope:options.scope(config.budget),rows:[],review:options.review()},config);picker=p;
      dialog.className='request-attachment-picker';dialog.setAttribute('aria-labelledby','request-attachment-picker-title');dialog.setAttribute('data-lm-motion','dialog');
      dialog.innerHTML='<header><strong id="request-attachment-picker-title">Link to Record</strong><button type="button" class="request-attachment-x" data-ra-picker-close aria-label="Close association picker">'+x+'</button></header><div class="request-attachment-picker-body"><strong class="request-attachment-picker-context" data-ra-context>'+esc(p.mode==='existing'?p.surface.requestTitle:p.file.name)+'</strong><p class="request-attachment-hint" data-ra-hint>'+(p.mode==='existing'?'Choose a Budget file to also show on this request.':'Choose a request to link this attachment to.')+'</p><input type="search" placeholder="'+(p.mode==='existing'?'Search Budget files…':'Search requests…')+'" aria-label="Search files or requests"><div data-ra-options></div><div class="request-attachment-picker-status" role="status" data-lm-motion="feedback"></div></div><footer class="request-attachment-footer"><button type="button" class="btn" data-ra-picker-close>Cancel</button><button type="button" class="btn primary" data-ra-save-link disabled>Save</button></footer>';
      document.body.appendChild(dialog);dialog.showModal();dialog.querySelector('input').focus();
      dialog.addEventListener('cancel',function(e){if(p.busy)e.preventDefault();else{e.preventDefault();closePicker();}});
      dialog.addEventListener('keydown',function(e){e.stopPropagation();if(e.key==='Escape'){e.preventDefault();closePicker();}});
      dialog.addEventListener('close',function(){if(picker===p){picker=null;dialog.remove();}});
      dialog.addEventListener('input',function(){paintPicker(p);});
      dialog.addEventListener('click',function(e){if(e.target.closest('[data-ra-picker-close]'))closePicker();var b=e.target.closest('[data-ra-option]');if(b&&!p.busy&&!p.review){var choice=b.dataset.raOption;p.selected=p.rows[Number(choice)];paintPicker(p);var selectedChoice=dialog.querySelector('[data-ra-option="'+choice+'"]');if(selectedChoice)selectedChoice.focus();}if(e.target.closest('[data-ra-save-link]')&&p.selected&&!p.busy&&!p.review)saveAssociation(p,p.selected);if(e.target.closest('[data-ra-check-association]'))checkAssociation(p);});
      status(p,'Loading…');
      try{
        await options.load(p.budget);if(picker!==p||p.scope!==options.scope(p.budget))return closePicker();
        p.rows=p.mode==='existing'?options.files(p.budget).filter(function(f){return !f.paymentRequestId&&!f.modificationId;}).map(function(f){return {label:f.name,detail:'Budget only',file:f,kind:p.surface.requestContext.kind,id:p.surface.requestContext.id};}):[{label:'Budget only · no request link',detail:'Keep this file in the Budget without linking it to a request.',kind:'',id:''}].concat(await options.choices(p.budget));
        status(p,'');paintPicker(p);
      }catch(e){status(p,e.message||'Associations unavailable.',true);}
    }
    function status(p,text,error){var node=p.dialog.querySelector('.request-attachment-picker-status');node.textContent=text;node.dataset.state=error?'error':p.busy?'pending':'idle';}
    function paintPicker(p){
      var q=p.dialog.querySelector('input').value.trim().toLowerCase();
      if(p.selected&&q&&!(p.selected.label+' '+p.selected.detail).toLowerCase().includes(q))p.selected=null;
      p.dialog.querySelector('[data-ra-options]').innerHTML=p.rows.map(function(row,i){return (!q||(row.label+' '+row.detail).toLowerCase().includes(q))?'<button type="button" class="request-attachment-choice" aria-pressed="'+(p.selected===row)+'" data-ra-option="'+i+'" '+(p.busy||p.review?'disabled':'')+'><strong>'+esc(row.label)+'</strong><small>'+esc(row.detail)+'</small></button>':'';}).join('')||'<div class="request-attachment-empty">No matches</div>';
      if(p.review)p.dialog.querySelector('[data-ra-options]').innerHTML='<div class="request-attachment-empty">Association needs review. <button type="button" class="btn" data-ra-check-association '+(p.busy?'disabled':'')+'>Check status</button></div>';
      var selected=p.selected;
      p.dialog.querySelectorAll('[data-ra-picker-close]').forEach(function(b){b.disabled=p.busy;});p.dialog.querySelector('[data-ra-save-link]').disabled=p.busy||!!p.review||!selected;p.dialog.querySelector('input').disabled=p.busy||!!p.review;
    }
    async function saveAssociation(p,row){
      if(p.scope!==options.scope(p.budget)||p.surface&&!current(p.surface))return;
      p.busy=true;paintPicker(p);status(p,'Saving association…');
      try{await options.associate(p.budget,row.file||p.file,{kind:row.kind,id:row.id});p.busy=false;closePicker();refresh();}
      catch(e){p.busy=false;p.review=options.review();status(p,e.message||'Association could not be saved.',true);paintPicker(p);}
    }
    async function checkAssociation(p){if(p.busy)return;p.busy=true;paintPicker(p);status(p,'Checking association…');try{await options.recheck();p.review=null;p.busy=false;closePicker();refresh();}catch(e){p.busy=false;status(p,e.message,true);paintPicker(p);}}
    return {mount:mount,unmount:unmount,refresh:refresh,find:find,openPicker:openPicker,closePicker:closePicker,active:function(){return surfaces.find(current)||null;},isPickerOpen:function(){return !!picker;}};
  }
  root.LMRequestAttachments={create:create,Draft:{get:draft,add:addDraft,flush:flushDraft,summary:draftSummary}};
})(window);
