(function(root){
  'use strict';
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const x='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const check='<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m3 8 3 3 7-7"/></svg>';
  const note="<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.4'><path d='M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z'/></svg>";
  const natural=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true,sensitivity:'base'});
  function create(options){
    const $=id=>document.getElementById(id),host=$('blocks'),selected=new Set(),collapsed=new Set(),saved=new Map();
    let layout='list',anchor='',visible=[],dialog=null,draftRows=[],trigger=null,inert=[],editing=false,lastRun=null,editMode=false,notePop=null,noteRow=null,noteTrigger=null,inlineRunning=false,inlineReview=null;
    const drafts=new Map(),inlineQueue=[];
    const dates=[{key:'Entered_Date',label:'Entered',type:'date'},{key:'Purchase_Date',label:'Purchase',type:'date'},{key:'Close_Date',label:'Close',type:'date'}];
    const columns=new Set(['Lot_Size','Base_Price','Earnest_Money','Appraised_Value','On_Hold']);
    function builders(){return (options.builders?options.builders():[]).filter(row=>row.Type1==='Builder').sort((a,b)=>natural(a.Builder_Name,b.Builder_Name));}
    function display(key,value){
      if(value==null||value==='')return '—';
      const field=LMLotEdit.fields.find(field=>field.key===key)||dates.find(field=>field.key===key);
      if(field?.type==='date')return LMTakedownModel.zoho(value)||String(value);
      if(field.type==='lookup'){try{const id=LMLotEdit.value(key,value),builder=(options.builders?options.builders():[]).find(row=>row.ID===id);return builder?.Builder_Name||value?.display_value||id||'—';}catch(ignore){return 'Unavailable';}}
      if(field.type==='boolean')return value===true||value==='true'?'Yes':'No';
      if(field.type==='money'){
        try{const text=LMLotEdit.value(key,value),parts=text.split('.'),negative=parts[0][0]==='-',whole=parts[0].replace('-','').replace(/\B(?=(\d{3})+(?!\d))/g,','),fraction=(parts[1]||'').padEnd(2,'0');return (negative?'−':'')+'$'+whole+'.'+fraction;}catch(ignore){return String(value);}
      }
      return String(value);
    }
    function selectedRows(){return layout==='list'?Array.from(selected).map(options.byId).filter(Boolean):options.gridSelection();}
    function clear(){selected.clear();anchor='';options.clearGridSelection();syncChecks();syncFooter();}
    function toggle(id,shift){
      if(options.locked()||editing)return;
      const row=options.byId(id);if(!LMLotEdit.editable(row))return;
      const ids=visible.filter(row=>LMLotEdit.editable(row)&&!collapsed.has(options.sid(row)+':'+options.block(row))).map(row=>row.ID),from=ids.indexOf(anchor),to=ids.indexOf(id),on=!selected.has(id);
      if(shift&&from>=0&&to>=0)ids.slice(Math.min(from,to),Math.max(from,to)+1).forEach(id=>on?selected.add(id):selected.delete(id));
      else{if(on)selected.add(id);else selected.delete(id);}anchor=id;syncChecks();syncFooter();
    }
    function choose(rows,on){if(options.locked()||editing)return;rows.filter(LMLotEdit.editable).forEach(row=>on?selected.add(row.ID):selected.delete(row.ID));syncChecks();syncFooter();}
    function syncChecks(){
      host.querySelectorAll('[data-lot-row]').forEach(node=>{const on=selected.has(node.dataset.lotRow);node.classList.toggle('ll-selected',on);node.setAttribute('aria-selected',String(on));const input=node.querySelector('[data-lot-check]');if(input)input.checked=on;});
      host.querySelectorAll('[data-block-check]').forEach(input=>{const ids=visible.filter(row=>options.sid(row)===input.dataset.sub&&options.block(row)===input.dataset.blockCheck&&LMLotEdit.editable(row)).map(row=>row.ID),count=ids.filter(id=>selected.has(id)).length;input.checked=ids.length>0&&count===ids.length;input.indeterminate=count>0&&count<ids.length;});
      const all=$('llSelectAll');if(all){const ids=visible.filter(LMLotEdit.editable).map(row=>row.ID),count=ids.filter(id=>selected.has(id)).length;all.checked=ids.length>0&&ids.length===count;all.indeterminate=count>0&&count<ids.length;}
    }
    function syncFooter(){
      const rows=selectedRows(),n=rows.length,locked=options.locked()||editing;
      const review=lastRun&&lastRun.rows.some(row=>row.state==='unknown');
      $('massUpdate').disabled=review?editor.pending()||editing:!n||locked||!editMode;$('massUpdate').textContent=review?'Check update status':n?'Mass update · '+n:'Mass update';
      if(layout!=='list')return;
      $('selectedCount').textContent=n?n+' lot'+(n===1?'':'s')+' selected':'No lots selected';$('selectionEmblem').textContent=n;
      $('selectionBar').classList.toggle('has-selection',!!n);$('selectedDetail').textContent=n?new Set(rows.map(row=>options.sid(row))).size+' subdivision'+(new Set(rows.map(row=>options.sid(row))).size===1?'':'s')+' · '+rows.filter(options.eligible).length+' available for takedown':'Shift-click to select a range';
      $('clear').disabled=!n||locked;
      $('create').disabled=!n||locked||!rows.every(options.eligible)||new Set(rows.map(row=>options.sid(row))).size!==1;
      $('create').title=n&&!rows.every(options.eligible)?'Select only available lots to create a takedown':'';
      const show=!options.isLots();$('lotsLayout').hidden=show;
    }
    function noteButton(row,can){
      const text=typeof row.Notes==='string'?row.Notes.trim():'',present=Object.prototype.hasOwnProperty.call(row,'Notes');
      return present&&(text||can)?'<button class="nbtn'+(text?' has':'')+'" type="button" data-note="'+esc(row.ID)+'" title="'+esc(text||'Add a note to this lot')+'" aria-label="'+(can?text?'Edit note':'Add note':'View note')+'">'+note+'</button>':'';
    }
    function cellHTML(row,field){
      const id=row.ID,own=Object.prototype.hasOwnProperty.call(row,field.key),value=display(field.key,row[field.key]),isSaved=saved.get(id)?.includes(field.key),can=editMode&&LMLotEdit.editable(row)&&options.ready()&&own;
      if(field.type==='boolean')return '<td class="ll-boolean"><div class="ll-hold-actions"><input type="checkbox" data-inline-lot="'+esc(id)+'" data-inline-field="On_Hold" aria-label="On hold for Lot '+esc(options.number(row))+'" '+(row.On_Hold===true||row.On_Hold==='true'?'checked ':'')+(can?'':'disabled')+'><span class="ll-save-mark" '+(isSaved?'':'hidden')+'>'+check+'</span><span class="ll-field-error" role="alert"></span></div></td>';
      if(!can||field.type==='date')return '<td class="ll-'+field.type+'"><span class="ll-read-value'+(isSaved?' ll-saved':'')+'" title="'+esc(value)+'">'+esc(value)+(isSaved?check:'')+'</span></td>';
      const attrs=' data-inline-lot="'+esc(id)+'" data-inline-field="'+field.key+'" aria-label="Edit '+esc(field.label)+' for Lot '+esc(options.number(row))+'"';
      let input;
      if(field.type==='lookup')input=inputHTML(field,row[field.key]).replace('id="llValue_'+field.key+'"','id="llInline_'+id+'_'+field.key+'"'+attrs);
      else input='<input class="ll-inline-input" type="text" inputmode="decimal" autocomplete="off" value="'+esc(LMLotEdit.value(field.key,row[field.key]))+'"'+attrs+'>';
      return '<td class="ll-'+field.type+'"><div class="ll-inline-cell'+(isSaved?' ll-saved':'')+'">'+input+'<span class="ll-save-mark" '+(isSaved?'':'hidden')+'>'+check+'</span><span class="ll-field-error" role="alert"></span></div></td>';
    }
    function rowHTML(row,fields){
      const id=row.ID,can=LMLotEdit.editable(row)&&!options.locked(),status=options.state(row),canNote=editMode&&LMLotEdit.editable(row)&&options.ready();
      return '<tr data-lot-row="'+esc(id)+'" aria-selected="'+selected.has(id)+'" class="'+(selected.has(id)?'ll-selected':'')+'"><td class="ll-check"><input type="checkbox" data-lot-check="'+esc(id)+'" aria-label="Select '+esc(row.Lot_Code||'Lot '+options.number(row))+'" '+(selected.has(id)?'checked ':'')+(can?'':'disabled')+'></td><td class="ll-note-cell">'+noteButton(row,canNote)+'<span class="ll-field-error" role="alert"></span></td><td class="ll-block-number">'+esc(options.block(row))+'</td><td class="ll-number"><button type="button" data-lot-select="'+esc(id)+'" '+(can?'':'disabled')+'>'+esc(options.number(row))+'</button></td><td class="ll-code">'+esc(row.Lot_Code)+'</td><td><span class="ll-status st-'+esc(status)+'">'+esc(options.label(status))+'</span></td>'+fields.map(field=>cellHTML(row,field)).join('')+'</tr>';
    }
    function render(rows){
      const scroll=host.querySelector('.ll-report'),top=scroll?scroll.scrollTop:0,horizontal=new Map(Array.from(host.querySelectorAll('[data-list-block]'),block=>[block.dataset.listBlock,block.querySelector('.ll-scroll')?.scrollLeft||0]));
      visible=rows.slice().sort((a,b)=>natural(options.subName(options.sid(a)),options.subName(options.sid(b)))||natural(options.block(a),options.block(b))||natural(options.number(a),options.number(b)));
      selected.forEach(id=>{const row=options.byId(id);if(!row||!options.scopeIds().includes(options.sid(row))||!LMLotEdit.editable(row))selected.delete(id);});
      const fields=LMLotEdit.fields.filter(field=>field.key==='Builder1'||columns.has(field.key)&&field.key!=='On_Hold').concat(dates,columns.has('On_Hold')?LMLotEdit.fields.filter(field=>field.key==='On_Hold'):[]),groups=new Map();
      visible.forEach(row=>{const sid=options.sid(row);if(!groups.has(sid))groups.set(sid,new Map());const blocks=groups.get(sid),b=options.block(row);if(!blocks.has(b))blocks.set(b,[]);blocks.get(b).push(row);});
      host.classList.add('ll-host');host.classList.toggle('ll-edit-mode',editMode);
      const tally=new Map();visible.forEach(row=>{const key=options.state(row);tally.set(key,(tally.get(key)||0)+1);});
      const title=groups.size===1?options.subName(groups.keys().next().value):groups.size+' subdivisions';
      host.innerHTML=(visible.length?'<div class="ll-summary"><div class="ll-summary-top"><div class="ll-identity"><strong>'+esc(title)+'</strong><span class="ll-total">'+visible.length+' lots</span></div><div class="ll-counts">'+Array.from(tally,([key,count])=>'<span class="ll-count st-'+esc(key)+'"><i></i>'+esc(options.label(key))+' <b>'+count+'</b></span>').join('')+'</div></div><div class="ll-tools"><label><input id="llSelectAll" type="checkbox" aria-label="Select all visible lots"> Select visible</label><nav class="ll-block-nav" aria-label="Jump to block">'+Array.from(groups,([sid,blocks])=>Array.from(blocks,([block,lots])=>'<button type="button" class="ll-block-pill" data-jump-block="'+esc(sid+':'+block)+'" aria-label="Jump to Block '+esc(block)+' in '+esc(options.subName(sid))+'">'+(groups.size>1?esc(options.subName(sid))+' · ':'')+'Block '+esc(block)+' <span>'+lots.length+'</span></button>').join('')).join('')+'</nav><label class="ll-mode-switch"><input id="llEditMode" type="checkbox" role="switch" aria-label="Edit mode" '+(editMode?'checked':'')+'><span class="ll-slider" aria-hidden="true"></span><b>Edit mode</b></label><button class="btn" id="llColumns" type="button" aria-expanded="false">Columns</button><div id="llColumnMenu" class="ll-column-menu" hidden>'+LMLotEdit.fields.filter(field=>!['Builder1','Address','Notes'].includes(field.key)).map(field=>'<label><input type="checkbox" data-lot-column="'+field.key+'" '+(columns.has(field.key)?'checked':'')+'> '+esc(field.label)+'</label>').join('')+'</div></div></div>':'')+'<div class="ll-report" tabindex="0" role="region" aria-label="Lots by block">'+
        Array.from(groups,([sid,blocks])=>'<section class="ll-subdivision"><div class="ll-sub-head"><strong>'+esc(options.subName(sid))+'</strong></div>'+Array.from(blocks,([block,lots])=>{
          const key=sid+':'+block,shut=collapsed.has(key),editable=lots.filter(LMLotEdit.editable);
          return '<section class="ll-block" data-list-block="'+esc(key)+'"><div class="ll-block-head"><button class="ll-disclosure" type="button" data-collapse="'+esc(key)+'" aria-expanded="'+!shut+'" aria-label="Toggle Block '+esc(block)+'"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 3 5 5-5 5"/></svg></button><input type="checkbox" data-block-check="'+esc(block)+'" data-sub="'+esc(sid)+'" aria-label="Select Block '+esc(block)+' in '+esc(options.subName(sid))+'" '+(editable.length?'':'disabled')+'><strong>Block '+esc(block)+'</strong><span>'+lots.length+' lots</span><button class="link" data-all="'+esc(block)+'" data-sub="'+esc(sid)+'" type="button" '+(lots.some(options.eligible)?'':'disabled')+'>Select available</button></div><div class="ll-scroll" '+(shut?'hidden':'')+'><table class="ll-table"><thead><tr><th class="ll-check"></th><th class="ll-note-cell"></th><th>Block</th><th>Lot</th><th>Lot code</th><th>Status</th>'+fields.map(field=>'<th class="ll-'+field.type+'">'+esc(field.label)+'</th>').join('')+'</tr></thead><tbody>'+lots.map(row=>rowHTML(row,fields)).join('')+'</tbody></table></div></section>';
        }).join('')+'</section>').join('')+'</div>';
      const report=host.querySelector('.ll-report');if(report){report.scrollTop=top;report.addEventListener('scroll',syncBlockPill,{passive:true});syncBlockPill();}
      host.querySelectorAll('[data-list-block]').forEach(block=>{block.querySelector('.ll-scroll').scrollLeft=horizontal.get(block.dataset.listBlock)||0;});
      restoreInlineDrafts();if(root.LMPickers)root.LMPickers.enhance(host);syncChecks();syncFooter();
    }
    function syncBlockPill(){const report=host.querySelector('.ll-report');if(!report)return;const edge=report.getBoundingClientRect().top;let key='';host.querySelectorAll('[data-list-block]').forEach(block=>{if(!key||block.getBoundingClientRect().top<=edge+45)key=block.dataset.listBlock;});host.querySelectorAll('[data-jump-block]').forEach(pill=>{if(pill.dataset.jumpBlock===key)pill.setAttribute('aria-current','location');else pill.removeAttribute('aria-current');});}
    function jumpBlock(key){const block=Array.from(host.querySelectorAll('[data-list-block]')).find(node=>node.dataset.listBlock===key),report=host.querySelector('.ll-report');if(!block||!report)return;collapsed.delete(key);block.querySelector('.ll-scroll').hidden=false;block.querySelector('[data-collapse]').setAttribute('aria-expanded','true');report.scrollTo({top:report.scrollTop+block.getBoundingClientRect().top-report.getBoundingClientRect().top,behavior:root.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});syncBlockPill();}
    function inlineKey(id,key){return id+':'+key;}
    function inlineNode(job){return job.field==='Notes'?host.querySelector('[data-note="'+CSS.escape(job.id)+'"]'):host.querySelector('[data-inline-lot="'+CSS.escape(job.id)+'"][data-inline-field="'+CSS.escape(job.field)+'"]');}
    function rawInput(node){return node.dataset.inlineField==='On_Hold'?node.checked:node.value;}
    function setInlineState(job,state,message){
      job.state=state;job.message=message||'';const node=inlineNode(job);if(!node)return;const cell=node.closest('td'),control=node._pickerButton||node;
      ['dirty','saving','saved-ok','save-error'].forEach(name=>{const on=name===(state==='error'||state==='unknown'?'save-error':state==='verified'?'saved-ok':state);node.classList.toggle(name,on);control.classList.toggle(name,on);});
      if(node.matches('input[type="text"]'))node.readOnly=state==='saving'||state==='unknown';else node.disabled=state==='saving'||state==='unknown';if(root.LMPickers&&node._pickerButton)root.LMPickers.refresh(node);
      node.setAttribute('aria-invalid',String(state==='error'||state==='unknown'));cell.classList.toggle('ll-saved',state==='verified');
      const mark=cell.querySelector('.ll-save-mark');if(mark)mark.hidden=state!=='verified';const error=cell.querySelector('.ll-field-error');if(error)error.textContent=message||'';
    }
    function controlLocks(){const lock=drafts.size>0||inlineRunning||inlineQueue.length>0||!!noteRow;const search=$('search');if(search)search.disabled=lock;const mode=$('llEditMode');if(mode)mode.disabled=lock||editing||editor.blocked();host.querySelectorAll('[data-lot-check]').forEach(input=>{input.disabled=lock||editing||editor.blocked()||!LMLotEdit.editable(options.byId(input.dataset.lotCheck));});syncFooter();}
    function markDraft(node){
      if(!editMode||!options.ready()||editing||!node.dataset.inlineField)return null;
      const id=node.dataset.inlineLot,field=node.dataset.inlineField,key=inlineKey(id,field),raw=rawInput(node);let job=drafts.get(key);
      if(job&&(job.queued||job.state==='saving'||job.state==='unknown'))return job;
      const row=node._lotBefore||JSON.parse(JSON.stringify(options.byId(id)));
      try{if(LMLotEdit.matches(row,{[field]:raw})){drafts.delete(key);node._lotBefore=null;setInlineState({id,field},saved.get(id)?.includes(field)?'verified':'');controlLocks();return null;}}catch(ignore){}
      if(!job)job={id,field,key,before:row,context:options.context(),generation:options.generation(),revision:root.LMSuccess?root.LMSuccess.begin(key):null};
      job.raw=raw;drafts.set(key,job);setInlineState(job,'dirty');controlLocks();return job;
    }
    function enqueueInline(node){const job=markDraft(node);if(job&&!job.queued&&job.state!=='saving'&&job.state!=='unknown')queueInline(job);}
    function queueInline(job){
      if(editor.blocked()&&!editor.pending()){setInlineState(job,'error','Check the previous update first.');return;}
      try{LMLotEdit.payload({[job.field]:job.raw});}catch(error){setInlineState(job,'error',error.message);if(root.LMSuccess)root.LMSuccess.clear();controlLocks();return;}
      job.queued=true;inlineQueue.push(job);setInlineState(job,'saving');controlLocks();processInlineQueue();
    }
    function patchSavedRow(row){
      const node=host.querySelector('[data-lot-row="'+CSS.escape(row.ID)+'"]');if(!node)return;
      const status=node.querySelector('.ll-status');if(status){const state=options.state(row);status.className='ll-status st-'+state;status.textContent=options.label(state);}
      node.querySelectorAll('td.ll-date').forEach((cell,index)=>{const value=display(dates[index].key,row[dates[index].key]),span=cell.querySelector('.ll-read-value');if(span){span.textContent=value;span.title=value;}});
      const noteCell=node.querySelector('.ll-note-cell');if(noteCell){const focus=noteCell.contains(document.activeElement);noteCell.innerHTML=noteButton(row,editMode&&LMLotEdit.editable(row))+'<span class="ll-field-error" role="alert"></span>';if(focus)noteCell.querySelector('button')?.focus({preventScroll:true});}
    }
    function finishInline(job){
      drafts.delete(job.key);job.queued=false;const row=options.byId(job.id);if(row)patchSavedRow(row);const node=inlineNode(job);if(node)node._lotBefore=null;setInlineState(job,'verified');controlLocks();if(node?._pickerButton&&document.activeElement?.closest('#lmPickerMenu'))node._pickerButton.focus({preventScroll:true});
      if(root.LMSuccess)root.LMSuccess.inline(job.key,job.field==='Notes'?'Lot note saved.':job.field==='On_Hold'?'Lot hold saved.':job.field==='Builder1'?'Lot builder saved.':'Lot '+LMLotEdit.fields.find(field=>field.key===job.field).label.toLowerCase()+' saved.','lot changes',()=>options.context()===job.context&&options.generation()===job.generation,job.revision);
    }
    async function processInlineQueue(){
      if(inlineRunning)return;inlineRunning=true;
      try{while(inlineQueue.length){
        const job=inlineQueue.shift();let run;
        try{if(!editMode||options.context()!==job.context||options.generation()!==job.generation)throw new Error('Session changed. Refresh before editing.');const operation=editor.capture([job.before],{[job.field]:job.raw});run=await editor.commit(operation);if(run.stage==='verified')finishInline(job);else{const unknown=run.rows.some(row=>row.state==='unknown');job.queued=false;if(unknown)inlineReview=job;setInlineState(job,unknown?'unknown':'error',run.error||run.rows[0].message||'Not saved.');if(root.LMSuccess)root.LMSuccess.clear();}}
        catch(error){job.queued=false;setInlineState(job,'error',error.message);if(root.LMSuccess)root.LMSuccess.clear();}
        if(!run||run.stage!=='verified'){inlineQueue.splice(0).forEach(next=>{next.queued=false;setInlineState(next,'error','Not sent. Press Enter to save, or Escape to discard.');});break;}
      }}finally{inlineRunning=false;controlLocks();}
    }
    function restoreInlineDrafts(){drafts.forEach(job=>{const node=inlineNode(job);if(!node)return;if(job.field==='On_Hold')node.checked=job.raw;else if(job.field!=='Notes')node.value=job.raw;setInlineState(job,job.state,job.message);});}
    function ensureNotePop(){
      if(notePop)return;notePop=document.createElement('div');notePop.id='notePop';notePop.className='pop notepop';notePop.setAttribute('role','dialog');notePop.setAttribute('aria-label','Lot note');
      notePop.innerHTML='<h4>Lot note</h4><p id="notePopSub"></p><textarea id="notePopVal" rows="3" placeholder="Add a note for this lot…"></textarea><div class="notepop-acts"><button class="btn sm ghost" id="notePopClear" type="button">Clear note</button><span style="flex:1"></span><button class="btn sm" id="notePopCancel" type="button">Cancel</button><button class="btn sm primary" id="notePopSave" type="button">Save</button></div>';
      document.body.appendChild(notePop);$('notePopSave').onclick=()=>commitNote($('notePopVal').value.trim());$('notePopClear').onclick=()=>commitNote('');$('notePopCancel').onclick=()=>closeNotePop(true,true);
      $('notePopVal').addEventListener('keydown',event=>{if(event.key==='Enter'&&(event.metaKey||event.ctrlKey)){event.preventDefault();commitNote($('notePopVal').value.trim());}});
      notePop.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeNotePop(true,true);}});
    }
    function openNotePop(button,row){
      if(!row)return;ensureNotePop();noteRow=JSON.parse(JSON.stringify(row));noteTrigger=button;
      const can=editMode&&LMLotEdit.editable(row)&&options.ready()&&!editor.blocked(),draft=drafts.get(inlineKey(row.ID,'Notes'));$('notePopSub').textContent=row.Lot_Code||'Lot '+options.number(row);$('notePopVal').value=draft?draft.raw:row.Notes||'';$('notePopVal').disabled=!can;$('notePopVal').placeholder=can?'Add a note for this lot…':'Read only';$('notePopSave').hidden=!can;$('notePopClear').hidden=!can;notePop.classList.add('show');
      const rect=button.getBoundingClientRect();notePop.style.top=Math.max(12,Math.min(root.innerHeight-notePop.offsetHeight-12,rect.bottom+8))+'px';notePop.style.left=Math.max(12,Math.min(root.innerWidth-312,rect.left-140))+'px';controlLocks();if(can)$('notePopVal').focus();else $('notePopCancel').focus();
    }
    function closeNotePop(focus,discard){if(!notePop)return;notePop.classList.remove('show');if(discard&&noteRow){const key=inlineKey(noteRow.ID,'Notes'),job=drafts.get(key);if(job?.state==='error'&&!job.queued){drafts.delete(key);setInlineState(job,'');}}noteRow=null;if(focus&&noteTrigger?.isConnected)noteTrigger.focus({preventScroll:true});controlLocks();}
    function commitNote(value){
      if(!noteRow||!editMode||!options.ready()||editor.blocked())return;const row=noteRow,key=inlineKey(row.ID,'Notes');closeNotePop(true);if(value===(row.Notes||''))return;
      const job={id:row.ID,field:'Notes',key,before:row,raw:value,context:options.context(),generation:options.generation(),revision:root.LMSuccess?root.LMSuccess.begin(key):null};drafts.set(key,job);queueInline(job);
    }
    host.addEventListener('focusin',event=>{const node=event.target;if(node.matches('[data-inline-field]')&&!drafts.has(inlineKey(node.dataset.inlineLot,node.dataset.inlineField)))node._lotBefore=JSON.parse(JSON.stringify(options.byId(node.dataset.inlineLot)));});
    host.addEventListener('input',event=>{if(event.target.matches('[data-inline-field]'))markDraft(event.target);});
    host.addEventListener('focusout',event=>{const node=event.target;if(node.matches('input[type="text"][data-inline-field]'))enqueueInline(node);});
    host.addEventListener('keydown',event=>{const node=event.target;if(!node.matches('[data-inline-field]'))return;if(event.key==='Enter'){event.preventDefault();enqueueInline(node);}if(event.key==='Escape'){const key=inlineKey(node.dataset.inlineLot,node.dataset.inlineField),job=drafts.get(key);if(job&&(job.queued||job.state==='saving'||job.state==='unknown'))return;event.preventDefault();const raw=options.byId(node.dataset.inlineLot)[node.dataset.inlineField];if(node.dataset.inlineField==='On_Hold')node.checked=LMLotEdit.value('On_Hold',raw);else node.value=LMLotEdit.value(node.dataset.inlineField,raw);drafts.delete(key);node._lotBefore=null;setInlineState({id:node.dataset.inlineLot,field:node.dataset.inlineField},saved.get(node.dataset.inlineLot)?.includes(node.dataset.inlineField)?'verified':'');controlLocks();}});
    document.addEventListener('mousedown',event=>{if(noteRow&&!event.target.closest('#notePop')&&!event.target.closest('[data-note]'))closeNotePop();});
    root.addEventListener('resize',()=>closeNotePop());
    function beginDialog(title,context){
      trigger=document.activeElement;inert=[];document.querySelectorAll('body > header,body > section,body > main,body > footer').forEach(node=>{inert.push([node,node.inert]);node.inert=true;});
      dialog=document.createElement('div');dialog.className='overlay open ll-overlay';dialog.id='lotUpdateDialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','llDialogTitle');dialog.tabIndex=-1;
      dialog.innerHTML='<div class="modal ll-modal"><div class="modal-head"><div><h2 id="llDialogTitle">'+esc(title)+'</h2><div id="llDialogContext">'+esc(context)+'</div></div><button class="x ll-close" id="llClose" type="button" aria-label="Close lot update">'+x+'</button></div><div id="llDialogBody" class="modal-body"></div><div class="modal-foot"><span id="llDialogStatus" role="status" aria-live="polite"></span><button class="btn" id="llCancel" type="button">Cancel</button><button class="btn primary" id="llApply" type="button">Save</button></div></div>';
      document.body.appendChild(dialog);$('llClose').onclick=closeDialog;$('llCancel').onclick=closeDialog;
      dialog.addEventListener('keydown',event=>{if(event.target.closest('.lm-picker-menu'))return;if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeDialog();}if(event.key==='Tab'){const nodes=Array.from(dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter(node=>node.getClientRects().length);if(!nodes.length){event.preventDefault();dialog.focus();return;}const first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog)){event.preventDefault();last.focus();}else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===dialog)){event.preventDefault();first.focus();}}});
      dialog.focus();
    }
    function closeDialog(){if(editor.pending())return;if(!dialog)return;const id=trigger?.dataset?.lotEdit,hold=trigger?.dataset?.lotHold,field=trigger?.dataset?.field;if(root.LMPickers)root.LMPickers.close(false);const pickerMenu=$('lmPickerMenu');if(pickerMenu&&dialog.contains(pickerMenu))document.body.appendChild(pickerMenu);dialog.remove();dialog=null;editing=false;inert.forEach(([node,value])=>node.inert=value);inert=[];options.render();const replacement=hold?host.querySelector('[data-lot-hold="'+CSS.escape(hold)+'"]'):id?host.querySelector('[data-lot-edit="'+CSS.escape(id)+'"]'+(field?'[data-field="'+CSS.escape(field)+'"]':':not([data-field])')):null;const target=trigger?.isConnected?trigger:replacement;if(target&&!target.disabled)target.focus({preventScroll:true});else $('lotsListMode').focus({preventScroll:true});}
    function inputHTML(field,initial){
      const key=field.key;if(field.type==='boolean')return '<label class="ll-hold"><input id="llValue_'+key+'" type="checkbox" '+(initial===true||initial==='true'?'checked':'')+'> On hold</label>';
      if(field.type==='lookup'){const id=LMLotEdit.value(key,initial),choices=builders(),current=(options.builders?options.builders():[]).find(row=>row.ID===id);return '<select id="llValue_'+key+'" aria-label="Builder"><option value="">Select…</option>'+(id&&!choices.some(row=>row.ID===id)?'<option value="'+esc(id)+'" selected disabled>'+esc(current?.Builder_Name||display(key,initial))+'</option>':'')+choices.map(row=>'<option value="'+esc(row.ID)+'" '+(row.ID===id?'selected':'')+'>'+esc(row.Builder_Name)+'</option>').join('')+'</select>';}
      if(key==='Notes')return '<textarea id="llValue_'+key+'" rows="3">'+esc(initial||'')+'</textarea>';
      return '<input id="llValue_'+key+'" type="text" '+(['money','integer'].includes(field.type)?'inputmode="decimal" ':'')+'value="'+esc(initial==null?'':String(initial))+'" autocomplete="off">';
    }
    function changes(){const data={};dialog.querySelectorAll('[data-change-field]:checked').forEach(input=>{const key=input.dataset.changeField,node=$('llValue_'+key);data[key]=LMLotEdit.fields.find(field=>field.key===key).type==='boolean'?node.checked:node.value;});return data;}
    function preview(){
      try{
        const raw=changes();if(!Object.keys(raw).length){$('llPreview').textContent='Choose fields to change';$('llApply').disabled=true;return;}
        const data=LMLotEdit.payload(raw),changed=draftRows.filter(row=>!LMLotEdit.matches(row,data)).length;
        $('llPreview').innerHTML=Object.keys(data).map(key=>{const field=LMLotEdit.fields.find(field=>field.key===key),values=Array.from(new Set(draftRows.map(row=>display(key,row[key]))));return '<div><strong>'+esc(field.label)+'</strong><span>'+esc(values.length===1?values[0]:'Mixed values')+' <span aria-hidden="true">→</span> <b>'+esc(display(key,data[key]))+'</b></span></div>';}).join('');
        $('llDialogStatus').textContent=changed+' of '+draftRows.length+' lots will change';$('llApply').textContent=draftRows.length===1?'Save lot':'Apply to '+draftRows.length+' lots';$('llApply').disabled=!changed;
      }catch(error){$('llPreview').textContent=error.message;$('llApply').disabled=true;}
    }
    function openEditor(rows,fieldKey){
      if(!editMode||options.locked()||editing||editor.blocked()||!rows.length)return;
      draftRows=rows.map(row=>({...row}));editing=true;
      const retained=lastRun&&lastRun.rows.some(row=>row.state!=='verified')&&lastRun.rows.length===rows.length&&lastRun.rows.every(entry=>rows.some(row=>row.ID===entry.id))?lastRun.operation.entries[0].payload:null;
      const subCount=new Set(rows.map(row=>options.sid(row))).size;
      beginDialog(rows.length===1?'Edit Lot '+options.number(rows[0]):'Mass update · '+rows.length+' lots',rows.length===1?options.subName(options.sid(rows[0]))+' · Block '+options.block(rows[0]):subCount+' subdivision'+(subCount===1?'':'s')+' → '+rows.length+' lots');
      const fields=fieldKey?LMLotEdit.fields.filter(field=>field.key===fieldKey):LMLotEdit.fields;
      $('llDialogBody').innerHTML='<div id="llEditError" class="ll-error" role="alert" hidden></div><details class="ll-destinations"><summary>'+rows.length+' selected lots</summary><div>'+rows.map(row=>esc(row.Lot_Code)).join(' · ')+'</div></details><div class="ll-edit-fields">'+fields.map(field=>{
        const present=rows.every(row=>Object.prototype.hasOwnProperty.call(row,field.key)),values=rows.map(row=>row[field.key]),same=values.every(value=>{try{return LMLotEdit.value(field.key,value)===LMLotEdit.value(field.key,values[0]);}catch(ignore){return false;}}),initial=same?values[0]:'';
        const hasDraft=retained&&Object.prototype.hasOwnProperty.call(retained,field.key);
        return '<div class="ll-edit-field"><label class="ll-field-label"><input type="checkbox" data-change-field="'+field.key+'" '+(fieldKey||hasDraft?'checked ':'')+(present?'':'disabled')+'> '+esc(field.label)+'</label>'+inputHTML(field,hasDraft?retained[field.key]:initial)+'<small>'+(present?same?'Current: '+esc(display(field.key,initial)):'Mixed values':'Field unavailable — refresh to recheck')+'</small></div>';
      }).join('')+'</div><div id="llPreview" class="ll-preview" aria-live="polite"></div>';
      dialog.querySelectorAll('[data-change-field]').forEach(input=>{const node=$('llValue_'+input.dataset.changeField);node.disabled=!input.checked;input.addEventListener('change',()=>{node.disabled=!input.checked;preview();});});
      if(root.LMPickers){root.LMPickers.enhance(dialog);const menu=$('lmPickerMenu');if(menu)dialog.appendChild(menu);}
      dialog.addEventListener('input',preview);dialog.addEventListener('change',preview);$('llApply').onclick=save;preview();syncFooter();
      const node=dialog.querySelector('[id^="llValue_"]:not(:disabled)');if(node){if(node._pickerButton)node._pickerButton.focus();else{node.focus();if(node.select)node.select();}}
    }
    function showProgress(operation){
      if(root.LMPickers)root.LMPickers.close(false);
      $('llDialogTitle').textContent='Updating '+operation.entries.length+' lot'+(operation.entries.length===1?'':'s');
      $('llDialogBody').innerHTML='<div class="ll-progress" role="progressbar" aria-label="Verified lot updates" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="llProgressBar"></div></div><div class="ll-stages"><div>1 · Check selected lots <b id="llStage0">Running</b></div><div>2 · Save changes <b id="llStage1">Up next</b></div><div>3 · Check saved values <b id="llStage2">Up next</b></div></div><div id="llRunError" class="ll-error" role="alert" hidden></div><div id="llRunResults">'+operation.entries.map((entry,index)=>'<div class="ll-result" id="llResult'+index+'"><strong>'+esc(entry.label)+'</strong><span>Up next</span></div>').join('')+'</div>';
      $('llCancel').hidden=true;$('llApply').disabled=true;$('llApply').textContent='Check status';$('llApply').hidden=true;$('llApply').onclick=async()=>{const run=await editor.recheck();if(run?.stage==='verified'&&run.rows.length===1){if(inlineReview){finishInline(inlineReview);inlineReview=null;}if(window.LMSuccess)LMSuccess.show('Lot saved.');closeDialog();}};$('llClose').disabled=true;dialog.focus();
    }
    function patchRun(run){
      lastRun=run;syncFooter();if(!run||!dialog||!$('llRunResults'))return;
      const verified=run.rows.filter(row=>row.state==='verified').length,pending=editor.pending(),done=run.finished&&!pending,unknown=run.rows.some(row=>row.state==='unknown'),percent=Math.round(verified/run.rows.length*100);
      $('llProgressBar').style.width=percent+'%';dialog.querySelector('[role="progressbar"]').setAttribute('aria-valuenow',String(percent));
      $('llStage0').textContent=run.checked?'Done':done?'Needs review':'Running';
      $('llStage1').textContent=!run.checked?'Up next':done?verified===run.rows.length?'Done':'Needs review':'Running';
      $('llStage2').textContent=done?verified===run.rows.length?'Done':'Needs review':verified?'Running':'Up next';
      run.rows.forEach((row,index)=>{const node=$('llResult'+index);node.dataset.state=row.state;node.querySelector('span').textContent=row.message;});
      $('llRunError').hidden=!run.error;$('llRunError').textContent=run.error;
      $('llDialogStatus').textContent=verified+' / '+run.rows.length+' verified'+(done&&verified!==run.rows.length?' · '+run.rows.filter(row=>row.state==='not-sent').length+' not sent':pending?' · '+(run.finished?'Waiting for outstanding request':'Saving and checking'):'');
      $('llClose').disabled=pending;$('llCancel').hidden=false;$('llCancel').disabled=pending;$('llCancel').textContent='Close';$('llApply').hidden=!unknown;$('llApply').disabled=pending;
    }
    const editor=LMLotEdit.create({report:options.report,context:options.context,generation:options.generation,ready:options.ready,read:options.read,allowedBuilder:id=>builders().some(row=>row.ID===id),validateBuilder:options.validateBuilder,
      publish(row){const entry=lastRun?.rows.find(entry=>entry.id===row.ID);saved.set(row.ID,entry?Object.keys(entry.payload):[]);options.publish(row);},changed:patchRun,error:options.error});
    async function save(){
      if(editor.pending()||editor.blocked())return;
      let operation;try{operation=editor.capture(draftRows,changes());}catch(error){$('llEditError').hidden=false;$('llEditError').textContent=error.message;return;}
      showProgress(operation);const run=await editor.commit(operation);if(run.stage==='verified'){if(window.LMSuccess)LMSuccess.show(run.rows.length===1?'Lot saved.':run.rows.length+' lots updated.');if(run.rows.length===1)closeDialog();}
    }
    host.addEventListener('click',event=>{
      if(layout!=='list')return;
      const checkbox=event.target.closest('[data-lot-check]'),number=event.target.closest('[data-lot-select]'),edit=event.target.closest('[data-lot-edit]'),all=event.target.closest('[data-all]'),disclosure=event.target.closest('[data-collapse]'),notes=event.target.closest('[data-note]'),jump=event.target.closest('[data-jump-block]');
      if(checkbox||number||edit||all||disclosure||notes||jump){event.stopImmediatePropagation();}
      if(jump)jumpBlock(jump.dataset.jumpBlock);
      if(notes)openNotePop(notes,options.byId(notes.dataset.note));
      if(checkbox||number)toggle((checkbox||number).dataset[checkbox?'lotCheck':'lotSelect'],event.shiftKey);
      if(edit&&editMode)openEditor([options.byId(edit.dataset.lotEdit)].filter(Boolean),edit.dataset.field);
      if(all)choose(visible.filter(row=>options.sid(row)===all.dataset.sub&&options.block(row)===all.dataset.all&&options.eligible(row)),true);
      if(disclosure){const key=disclosure.dataset.collapse;if(collapsed.has(key))collapsed.delete(key);else collapsed.add(key);const shut=collapsed.has(key);disclosure.setAttribute('aria-expanded',String(!shut));disclosure.closest('.ll-block').querySelector('.ll-scroll').hidden=shut;}
      if(event.target.closest('#llColumns')){const menu=$('llColumnMenu');menu.hidden=!menu.hidden;$('llColumns').setAttribute('aria-expanded',String(!menu.hidden));}
    },true);
    host.addEventListener('change',event=>{
      if(event.target.id==='llEditMode'){if(drafts.size||inlineRunning||inlineQueue.length||editor.blocked()||editing||options.locked()){event.target.checked=editMode;return;}closeNotePop();if(root.LMPickers)root.LMPickers.close(false);editMode=event.target.checked;render(visible);$('llEditMode')?.focus({preventScroll:true});}
      if(event.target.matches('[data-inline-field]'))enqueueInline(event.target);
      if(event.target.id==='llSelectAll')choose(visible,event.target.checked);
      if(event.target.matches('[data-block-check]'))choose(visible.filter(row=>options.sid(row)===event.target.dataset.sub&&options.block(row)===event.target.dataset.blockCheck),event.target.checked);
      if(event.target.matches('[data-lot-column]')){if(drafts.size||inlineRunning||editor.blocked()){event.target.checked=columns.has(event.target.dataset.lotColumn);return;}const key=event.target.dataset.lotColumn;if(event.target.checked)columns.add(key);else columns.delete(key);render(visible);$('llColumns')?.focus();}
    });
    $('massUpdate').addEventListener('click',()=>{if(lastRun&&lastRun.rows.some(row=>row.state==='unknown')&&!editor.pending()){editing=true;beginDialog('Lot update status',lastRun.rows.length+' lots');showProgress(lastRun.operation);patchRun(lastRun);return;}openEditor(selectedRows());});
    $('clear').addEventListener('click',event=>{if(layout==='list'){event.stopImmediatePropagation();if(!options.locked()&&!editing)clear();}},true);
    ['lotsListMode','lotsGridMode'].forEach((id,index)=>$(id).addEventListener('click',()=>{if(options.locked()||editing)return;layout=index?'grid':'list';$('lotsListMode').setAttribute('aria-pressed',String(layout==='list'));$('lotsGridMode').setAttribute('aria-pressed',String(layout==='grid'));if(layout==='grid')host.classList.remove('ll-host');options.render();}));
    document.addEventListener('click',event=>{if(!event.target.closest('.ll-tools')){const menu=$('llColumnMenu');if(menu)menu.hidden=true;$('llColumns')?.setAttribute('aria-expanded','false');}});
    return Object.freeze({render,syncFooter,selectedRows,layout:()=>layout,active:()=>editing||editor.blocked()||inlineRunning||inlineQueue.length>0||drafts.size>0||!!noteRow,hasDraft:()=>drafts.size>0||inlineRunning||inlineQueue.length>0||!!noteRow,editMode:()=>editMode,editor,display,clear,remove(id){selected.delete(id);syncChecks();syncFooter();}});
  }
  root.LMLotsList=Object.freeze({create});
})(typeof window==='undefined'?globalThis:window);
