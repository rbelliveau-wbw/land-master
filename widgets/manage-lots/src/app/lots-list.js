(function(root){
  'use strict';
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const x='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const check='<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m3 8 3 3 7-7"/></svg>';
  const pencil='<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6Z M13 6l5 5"/></svg>';
  const natural=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true,sensitivity:'base'});
  function create(options){
    const $=id=>document.getElementById(id),host=$('blocks'),selected=new Set(),collapsed=new Set(),saved=new Map();
    let layout='list',anchor='',visible=[],dialog=null,draftRows=[],trigger=null,inert=[],editing=false,lastRun=null;
    const columns=new Set(['Lot_Size','Base_Price','Earnest_Money','Address','On_Hold']);
    function display(key,value){
      if(value==null||value==='')return '—';
      const field=LMLotEdit.fields.find(field=>field.key===key);
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
      $('massUpdate').disabled=review?editor.pending()||editing:!n||locked;$('massUpdate').textContent=review?'Check update status':n?'Mass update · '+n:'Mass update';
      if(layout!=='list')return;
      $('selectedCount').textContent=n?n+' lot'+(n===1?'':'s')+' selected':'No lots selected';$('selectionEmblem').textContent=n;
      $('selectionBar').classList.toggle('has-selection',!!n);$('selectedDetail').textContent=n?new Set(rows.map(row=>options.sid(row))).size+' subdivision'+(new Set(rows.map(row=>options.sid(row))).size===1?'':'s')+' · '+rows.filter(options.eligible).length+' available for takedown':'Shift-click to select a range';
      $('clear').disabled=!n||locked;
      $('create').disabled=!n||locked||!rows.every(options.eligible)||new Set(rows.map(row=>options.sid(row))).size!==1;
      $('create').title=n&&!rows.every(options.eligible)?'Select only available lots to create a takedown':'';
      const show=!options.isLots();$('lotsLayout').hidden=show;
    }
    function rowHTML(row,fields){
      const id=row.ID,can=LMLotEdit.editable(row)&&!options.locked(),status=options.state(row);
      return '<tr data-lot-row="'+esc(id)+'" aria-selected="'+selected.has(id)+'" class="'+(selected.has(id)?'ll-selected':'')+'"><td class="ll-check"><input type="checkbox" data-lot-check="'+esc(id)+'" aria-label="Select '+esc(row.Lot_Code||'Lot '+options.number(row))+'" '+(selected.has(id)?'checked ':'')+(can?'':'disabled')+'></td><td class="ll-number" title="'+esc(row.Lot_Code)+'"><button type="button" data-lot-select="'+esc(id)+'" '+(can?'':'disabled')+'>'+esc(options.number(row))+'</button></td><td><span class="ll-status st-'+esc(status)+'">'+esc(options.label(status))+'</span></td>'+fields.map(field=>{
        const own=Object.prototype.hasOwnProperty.call(row,field.key),value=display(field.key,row[field.key]),isSaved=saved.get(id)?.includes(field.key);
        return '<td class="ll-'+field.type+'"><button class="ll-cell'+(isSaved?' ll-saved':'')+'" type="button" data-lot-edit="'+esc(id)+'" data-field="'+field.key+'" aria-label="Edit '+esc(field.label)+' for Lot '+esc(options.number(row))+'" title="'+esc(own?value:'Field unavailable. Refresh to recheck.')+'" '+(can&&own?'':'disabled')+'><span>'+esc(value)+'</span>'+(isSaved?check:'')+'</button></td>';
      }).join('')+'<td class="ll-actions"><button class="ll-edit-all" type="button" data-lot-edit="'+esc(id)+'" aria-label="Edit Lot '+esc(options.number(row))+'" '+(can?'':'disabled')+'>'+pencil+'</button></td></tr>';
    }
    function render(rows){
      visible=rows.slice().sort((a,b)=>natural(options.subName(options.sid(a)),options.subName(options.sid(b)))||natural(options.block(a),options.block(b))||natural(options.number(a),options.number(b)));
      selected.forEach(id=>{const row=options.byId(id);if(!row||!options.scopeIds().includes(options.sid(row))||!LMLotEdit.editable(row))selected.delete(id);});
      const fields=LMLotEdit.fields.filter(field=>columns.has(field.key)),groups=new Map();
      visible.forEach(row=>{const sid=options.sid(row);if(!groups.has(sid))groups.set(sid,new Map());const blocks=groups.get(sid),b=options.block(row);if(!blocks.has(b))blocks.set(b,[]);blocks.get(b).push(row);});
      host.classList.add('ll-host');
      host.innerHTML=(visible.length?'<div class="ll-tools"><label><input id="llSelectAll" type="checkbox" aria-label="Select all visible lots"> Select visible</label><span>'+visible.length+' lots</span><button class="btn" id="llColumns" type="button" aria-expanded="false">Columns</button><div id="llColumnMenu" class="ll-column-menu" hidden>'+LMLotEdit.fields.map(field=>'<label><input type="checkbox" data-lot-column="'+field.key+'" '+(columns.has(field.key)?'checked':'')+'> '+esc(field.label)+'</label>').join('')+'</div></div>':'')+
        Array.from(groups,([sid,blocks])=>'<section class="ll-subdivision"><div class="ll-sub-head"><strong>'+esc(options.subName(sid))+'</strong></div>'+Array.from(blocks,([block,lots])=>{
          const key=sid+':'+block,shut=collapsed.has(key),editable=lots.filter(LMLotEdit.editable);
          return '<section class="ll-block" data-list-block="'+esc(key)+'"><div class="ll-block-head"><button class="ll-disclosure" type="button" data-collapse="'+esc(key)+'" aria-expanded="'+!shut+'" aria-label="Toggle Block '+esc(block)+'"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 3 5 5-5 5"/></svg></button><input type="checkbox" data-block-check="'+esc(block)+'" data-sub="'+esc(sid)+'" aria-label="Select Block '+esc(block)+' in '+esc(options.subName(sid))+'" '+(editable.length?'':'disabled')+'><strong>Block '+esc(block)+'</strong><span>'+lots.length+' lots</span><button class="link" data-all="'+esc(block)+'" data-sub="'+esc(sid)+'" type="button" '+(lots.some(options.eligible)?'':'disabled')+'>Select available</button></div><div class="ll-scroll" '+(shut?'hidden':'')+'><table class="ll-table"><thead><tr><th class="ll-check"></th><th>Lot</th><th>Status</th>'+fields.map(field=>'<th class="ll-'+field.type+'">'+esc(field.label)+'</th>').join('')+'<th class="ll-actions"></th></tr></thead><tbody>'+lots.map(row=>rowHTML(row,fields)).join('')+'</tbody></table></div></section>';
        }).join('')+'</section>').join('');
      syncChecks();syncFooter();
    }
    function beginDialog(title,context){
      trigger=document.activeElement;inert=[];document.querySelectorAll('body > header,body > section,body > main,body > footer').forEach(node=>{inert.push([node,node.inert]);node.inert=true;});
      dialog=document.createElement('div');dialog.className='overlay open ll-overlay';dialog.id='lotUpdateDialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','llDialogTitle');dialog.tabIndex=-1;
      dialog.innerHTML='<div class="modal ll-modal"><div class="modal-head"><div><h2 id="llDialogTitle">'+esc(title)+'</h2><div id="llDialogContext">'+esc(context)+'</div></div><button class="x ll-close" id="llClose" type="button" aria-label="Close lot update">'+x+'</button></div><div id="llDialogBody" class="modal-body"></div><div class="modal-foot"><span id="llDialogStatus" role="status" aria-live="polite"></span><button class="btn" id="llCancel" type="button">Cancel</button><button class="btn primary" id="llApply" type="button">Save</button></div></div>';
      document.body.appendChild(dialog);$('llClose').onclick=closeDialog;$('llCancel').onclick=closeDialog;
      dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeDialog();}if(event.key==='Tab'){const nodes=Array.from(dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter(node=>node.getClientRects().length);if(!nodes.length){event.preventDefault();dialog.focus();return;}const first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog)){event.preventDefault();last.focus();}else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===dialog)){event.preventDefault();first.focus();}}});
      dialog.focus();
    }
    function closeDialog(){if(editor.pending())return;if(!dialog)return;const id=trigger?.dataset?.lotEdit,field=trigger?.dataset?.field;dialog.remove();dialog=null;editing=false;inert.forEach(([node,value])=>node.inert=value);inert=[];options.render();const replacement=id?host.querySelector('[data-lot-edit="'+CSS.escape(id)+'"]'+(field?'[data-field="'+CSS.escape(field)+'"]':':not([data-field])')):null;const target=trigger?.isConnected?trigger:replacement;if(target&&!target.disabled)target.focus();else $('lotsListMode').focus();}
    function inputHTML(field,initial){
      const key=field.key;if(field.type==='boolean')return '<label class="ll-hold"><input id="llValue_'+key+'" type="checkbox" '+(initial===true||initial==='true'?'checked':'')+'> On hold</label>';
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
      if(options.locked()||editing||editor.blocked()||!rows.length)return;
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
      dialog.addEventListener('input',preview);dialog.addEventListener('change',preview);$('llApply').onclick=save;preview();syncFooter();
      const node=dialog.querySelector('[id^="llValue_"]:not(:disabled)');if(node){node.focus();if(node.select)node.select();}
    }
    function showProgress(operation){
      $('llDialogTitle').textContent='Updating '+operation.entries.length+' lot'+(operation.entries.length===1?'':'s');
      $('llDialogBody').innerHTML='<div class="ll-progress" role="progressbar" aria-label="Verified lot updates" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="llProgressBar"></div></div><div class="ll-stages"><div>1 · Check selected lots <b id="llStage0">Running</b></div><div>2 · Save changes <b id="llStage1">Up next</b></div><div>3 · Check saved values <b id="llStage2">Up next</b></div></div><div id="llRunError" class="ll-error" role="alert" hidden></div><div id="llRunResults">'+operation.entries.map((entry,index)=>'<div class="ll-result" id="llResult'+index+'"><strong>'+esc(entry.label)+'</strong><span>Up next</span></div>').join('')+'</div>';
      $('llCancel').hidden=true;$('llApply').disabled=true;$('llApply').textContent='Check status';$('llApply').hidden=true;$('llApply').onclick=async()=>{const run=await editor.recheck();if(run?.stage==='verified'&&run.rows.length===1){if(window.LMSuccess)LMSuccess.show('Lot saved.');closeDialog();}};$('llClose').disabled=true;dialog.focus();
    }
    function patchRun(run){
      lastRun=run;if(!run||!dialog||!$('llRunResults'))return;
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
    const editor=LMLotEdit.create({report:options.report,context:options.context,generation:options.generation,ready:options.ready,read:options.read,
      publish(row){const entry=lastRun?.rows.find(entry=>entry.id===row.ID);saved.set(row.ID,entry?Object.keys(entry.payload):[]);options.publish(row);},changed:patchRun,error:options.error});
    async function save(){
      if(editor.pending()||editor.blocked())return;
      let operation;try{operation=editor.capture(draftRows,changes());}catch(error){$('llEditError').hidden=false;$('llEditError').textContent=error.message;return;}
      showProgress(operation);const run=await editor.commit(operation);if(run.stage==='verified'){if(window.LMSuccess)LMSuccess.show(run.rows.length===1?'Lot saved.':run.rows.length+' lots updated.');if(run.rows.length===1)closeDialog();}
    }
    host.addEventListener('click',event=>{
      if(layout!=='list')return;
      const checkbox=event.target.closest('[data-lot-check]'),number=event.target.closest('[data-lot-select]'),edit=event.target.closest('[data-lot-edit]'),all=event.target.closest('[data-all]'),disclosure=event.target.closest('[data-collapse]');
      if(checkbox||number||edit||all||disclosure){event.stopImmediatePropagation();}
      if(checkbox||number)toggle((checkbox||number).dataset[checkbox?'lotCheck':'lotSelect'],event.shiftKey);
      if(edit)openEditor([options.byId(edit.dataset.lotEdit)].filter(Boolean),edit.dataset.field);
      if(all)choose(visible.filter(row=>options.sid(row)===all.dataset.sub&&options.block(row)===all.dataset.all&&options.eligible(row)),true);
      if(disclosure){const key=disclosure.dataset.collapse;if(collapsed.has(key))collapsed.delete(key);else collapsed.add(key);const shut=collapsed.has(key);disclosure.setAttribute('aria-expanded',String(!shut));disclosure.closest('.ll-block').querySelector('.ll-scroll').hidden=shut;}
      if(event.target.closest('#llColumns')){const menu=$('llColumnMenu');menu.hidden=!menu.hidden;$('llColumns').setAttribute('aria-expanded',String(!menu.hidden));}
    },true);
    host.addEventListener('change',event=>{
      if(event.target.id==='llSelectAll')choose(visible,event.target.checked);
      if(event.target.matches('[data-block-check]'))choose(visible.filter(row=>options.sid(row)===event.target.dataset.sub&&options.block(row)===event.target.dataset.blockCheck),event.target.checked);
      if(event.target.matches('[data-lot-column]')){const key=event.target.dataset.lotColumn;if(event.target.checked)columns.add(key);else columns.delete(key);render(visible);$('llColumns')?.focus();}
    });
    $('massUpdate').addEventListener('click',()=>{if(lastRun&&lastRun.rows.some(row=>row.state==='unknown')&&!editor.pending()){editing=true;beginDialog('Lot update status',lastRun.rows.length+' lots');showProgress(lastRun.operation);patchRun(lastRun);return;}openEditor(selectedRows());});
    $('clear').addEventListener('click',event=>{if(layout==='list'){event.stopImmediatePropagation();if(!options.locked()&&!editing)clear();}},true);
    ['lotsListMode','lotsGridMode'].forEach((id,index)=>$(id).addEventListener('click',()=>{if(options.locked()||editing)return;layout=index?'grid':'list';$('lotsListMode').setAttribute('aria-pressed',String(layout==='list'));$('lotsGridMode').setAttribute('aria-pressed',String(layout==='grid'));if(layout==='grid')host.classList.remove('ll-host');options.render();}));
    document.addEventListener('click',event=>{if(!event.target.closest('.ll-tools')){const menu=$('llColumnMenu');if(menu)menu.hidden=true;$('llColumns')?.setAttribute('aria-expanded','false');}});
    return Object.freeze({render,syncFooter,selectedRows,layout:()=>layout,active:()=>editing||editor.blocked(),editor,display,clear,remove(id){selected.delete(id);syncChecks();syncFooter();}});
  }
  root.LMLotsList=Object.freeze({create});
})(typeof window==='undefined'?globalThis:window);
