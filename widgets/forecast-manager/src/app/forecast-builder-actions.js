(function () {
  'use strict';
  const $=id=>document.getElementById(id);
  const pencil='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 12 7.5-7.5a1.8 1.8 0 0 1 2.5 2.5L7.5 14.5 4 16zM11.5 5.5l3 3"/></svg>';
  const contract='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M11 2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM11 2v6h6"/><path class="contract-yes" d="m6 12 2.5 2.5L14 10"/><path class="contract-no" d="m7 11 5 5m0-5-5 5"/><path class="contract-unknown" d="M7 13h6"/></svg>';
  let H;
  function placeholder(id) {const b=H.S.catalog.builders.find(row=>row.id===id);return !!b&&(b.placeholder===true||b.name.trim().toLowerCase()==='placeholder');}
  function parents(id) {return H.S.snapshot.years.filter(row=>row.builderId===id).sort((a,b)=>Number(a.year)-Number(b.year));}
  function available() {return H.S.snapshot&&H.S.snapshot.builderActionsVersion===1;}
  function blocked() {return H.busy()||H.changed()||H.creationReview()||!available();}
  function label(id) {
    const esc=H.esc, text=H.name(id), entries=parents(id), hasNote=entries.some(row=>String(row.note||'').trim()), isPlaceholder=placeholder(id), ready=available();
    const title=ready?'Assign this placeholder to a builder':'Builder actions require the Creator update';
    const identity=isPlaceholder?'<button class="builder-name assign-name" data-assign-name="'+esc(id)+'" title="'+title+'" aria-label="Assign '+esc(text)+' to builder"'+(blocked()?' disabled':'')+'>'+esc(text)+'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7 5 5 5-5"/></svg></button>':'<span class="builder-name" title="'+esc(text)+'">'+esc(text)+'</span>';
    const known=ready&&entries.every(row=>typeof row.hasLotContract==='boolean'), hasContract=known&&entries.some(row=>row.hasLotContract), state=known?hasContract?'yes':'no':'unknown';
    const contractTitle=known?(hasContract?'Found lot contract':'No lot contract.'):'Lot contract status unavailable until the Creator update';
    const noteTitle=hasNote?'View builder notes':ready?'Add builder note':'Builder notes require the Creator update';
    return identity+'<span class="builder-tools"><span class="contract-icon '+state+'" role="img" aria-label="'+esc(contractTitle)+'" title="'+esc(contractTitle)+'">'+contract+'</span>'+(isPlaceholder||hasNote?'<button class="note-icon'+(hasNote?' has-note':'')+'" data-builder-notes="'+esc(id)+'" aria-label="'+esc(noteTitle+' for '+text)+'" title="'+esc(noteTitle)+'"'+(blocked()?' disabled':'')+'>'+pencil+'</button>':'')+'</span>';
  }
  function lockDialog(active) {$('dialogClose').disabled=active;$('dialogCancel').disabled=active;}
  function terminal(message, error=false, recovery=false) {
    $('dialogStatus').textContent=message;$('dialogStatus').classList.toggle('error',error);lockDialog(false);
    $('dialogCancel').textContent='Close';$('dialogAction').hidden=!recovery;$('dialogAction').disabled=false;$('dialogAction').textContent='Check status';
    if(H.S.dialog)H.S.dialog.action=recovery?recheck:null;
    H.patch();H.controls();
  }
  function sameIds(actual,expected) {return Array.isArray(actual)&&actual.length===expected.length&&new Set(actual).size===expected.length&&expected.every(id=>actual.includes(id));}
  function planValid(plan,op) {return !!plan&&plan.sourceBuilderId===op.sourceBuilderId&&plan.destinationBuilderId===op.destinationBuilderId&&Array.isArray(plan.parentIds)&&plan.parentIds.length>0&&Array.isArray(plan.forecastIds)&&Array.isArray(plan.parents)&&plan.parents.length===plan.parentIds.length;}
  function progress(op,phase,message,result) {
    const stages=['Check all years','Assign builder','Update forecast pane'];
    const position=phase==='done'?3:phase==='review'?1:phase==='writing'?1:0;
    $('assignProgress').setAttribute('aria-valuenow',phase==='done'?'100':position?'35':'0');$('assignBar').style.width=(phase==='done'?100:position?35:0)+'%';
    $('assignStage').textContent=message;
    $('assignStages').innerHTML=stages.map((label,index)=>'<li><span>'+label+'</span><small>'+(phase==='review'?'Needs review':index<position?'Done':index===position?'Running':'Up next')+'</small></li>').join('');
    if(result){const confirmed=new Set(result.parentIds||[]);$('assignDestinations').innerHTML=op.plan.parents.map(parent=>'<li><span>WFY '+H.esc(parent.year)+' · '+parent.monthCount+' month'+(parent.monthCount===1?'':'s')+'</span><strong>'+((phase==='done'&&confirmed.has(parent.id))?'Assigned':'Needs review')+'</strong></li>').join('')+'<li><span>'+op.plan.forecastIds.length+' Forecast records</span><strong>'+(phase==='done'?'Assigned':'Needs review')+'</strong></li>';}
  }
  async function confirm(sourceBuilderId,destinationBuilderId) {
    if(blocked()||!destinationBuilderId||!placeholder(sourceBuilderId))return;
    const op={kind:'assign',phase:'checking',subdivisionId:H.S.sub,sourceBuilderId,destinationBuilderId};
    H.openDialog('Assign builder','PLACEHOLDER FORECASTS','<div class="assignment-route"><span>'+H.esc(H.name(sourceBuilderId))+'</span><span aria-hidden="true">→</span><strong>'+H.esc(H.name(destinationBuilderId))+'</strong></div><p>'+H.esc(H.S.snapshot.subdivision.name)+'</p><p id="assignScope" role="status">Checking all fiscal years…</p>',()=>assign(op),'Assign builder');
    const dialog=H.S.dialog;H.S.rowPending=true;lockDialog(true);$('dialogAction').disabled=true;H.controls();
    try {
      const data=await H.request({action:'assign_preview',subdivisionId:op.subdivisionId,sourceBuilderId,destinationBuilderId});
      if(H.S.dialog!==dialog)return;
      if(!planValid(data.assignment,op))throw new Error('The assignment scope is unavailable.');
      op.plan=data.assignment;H.applySnapshot(data);$('assignScope').textContent=op.plan.parentIds.length+' Forecast Years and '+op.plan.forecastIds.length+' Forecasts · all fiscal years';$('dialogAction').disabled=false;
    }catch(error){if(H.S.dialog===dialog){$('assignScope').textContent=error.message;$('assignScope').classList.add('error');}}
    finally {H.S.rowPending=false;lockDialog(false);H.controls();}
  }
  async function assign(op) {
    if(H.busy()||!op.plan||H.S.rowOperation?.phase==='unknown')return;
    H.S.rowOperation=op;op.phase='pending';H.S.rowPending=true;lockDialog(true);$('dialogAction').hidden=true;$('dialogCancel').hidden=true;
    $('dialogBody').innerHTML='<div class="assignment-route"><span>'+H.esc(H.name(op.sourceBuilderId))+'</span><span aria-hidden="true">→</span><strong>'+H.esc(H.name(op.destinationBuilderId))+'</strong></div><p>'+H.esc(H.S.snapshot.subdivision.name)+'</p><div id="assignProgress" class="assignment-progress" role="progressbar" aria-label="Builder assignment progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="assignBar"></span></div><p id="assignStage" role="status" aria-live="polite"></p><ol id="assignStages" class="assignment-stages"></ol><ul id="assignDestinations" class="assignment-results"></ul>';
    progress(op,'writing','Assigning '+op.plan.parentIds.length+' years and '+op.plan.forecastIds.length+' forecasts…');H.controls();H.patch();
    try {
      const data=await H.request({action:'assign',subdivisionId:op.subdivisionId,sourceBuilderId:op.sourceBuilderId,destinationBuilderId:op.destinationBuilderId,parentIds:op.plan.parentIds,forecastIds:op.plan.forecastIds},true);
      if(!data.assignment||data.assignment.acknowledged!==true||!sameIds(data.assignment.parentIds,op.plan.parentIds)||!sameIds(data.assignment.forecastIds,op.plan.forecastIds))throw new Error('The assignment destinations were not confirmed. Use Check status.');
      finishAssignment(op,data);
    }catch(error){op.phase=error.unknown===false?'failed':'unknown';progress(op,'review',error.message,{});H.S.rowPending=false;$('dialogCancel').hidden=false;terminal(error.message,true,op.phase==='unknown');}
  }
  function finishAssignment(op,data) {
    H.applySnapshot(data);if(H.S.builders){H.S.builders=H.S.builders.filter(id=>id!==op.sourceBuilderId);if(!H.S.builders.includes(op.destinationBuilderId))H.S.builders.push(op.destinationBuilderId);}
    op.phase='saved';H.S.rowPending=false;$('dialogCancel').hidden=false;H.render();
    $('modal').querySelector('.dialog').classList.add('assignment-success');
    $('dialogTitle').innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8"/><path d="m5.5 10 3 3 6-6"/></svg><span>Builder assigned</span>';
    const years=op.plan.parentIds.length,forecasts=op.plan.forecastIds.length;
    $('dialogBody').innerHTML='<p class="assignment-success-builder">'+H.esc(H.name(op.destinationBuilderId))+'</p><p class="assignment-success-subdivision">'+H.esc(H.S.snapshot.subdivision.name)+'</p><p class="assignment-success-count">'+years+' year'+(years===1?'':'s')+' · '+forecasts+' forecast'+(forecasts===1?'':'s')+' updated</p>';
    terminal('Builder assigned to all forecasts.');$('dialogCancel').focus();
  }
  function notes(builderId) {
    if(blocked())return;
    const editable=placeholder(builderId), entries=parents(builderId);
    H.openDialog('Builder notes',H.name(builderId),'<div class="builder-notes-list">'+entries.map(parent=>'<section class="builder-note-year"><label for="builder-note-'+H.esc(parent.id)+'">WFY '+H.esc(parent.year)+'</label><textarea id="builder-note-'+H.esc(parent.id)+'" data-note-parent="'+H.esc(parent.id)+'" aria-label="Builder note WFY '+H.esc(parent.year)+'" maxlength="10000"'+(editable?'':' readonly')+'>'+H.esc(parent.note||'')+'</textarea>'+(editable?'<button class="btn" data-note-save="'+H.esc(parent.id)+'">Save note</button>':'')+'</section>').join('')+'</div>',null,'');
    $('dialogCancel').textContent='Close';$('dialogBody').querySelectorAll('[data-note-save]').forEach(button=>button.addEventListener('click',()=>saveNote(builderId,button.dataset.noteSave)));
    $('dialogBody').querySelector('textarea')?.focus();
  }
  async function saveNote(builderId,parentId) {
    if(H.busy()||H.S.rowOperation?.phase==='unknown')return;
    const parent=parents(builderId).find(row=>row.id===parentId),input=$('builder-note-'+parentId);if(!parent||!input)return;
    const op={kind:'note',phase:'pending',subdivisionId:H.S.sub,builderId,parentId,note:input.value};H.S.rowOperation=op;H.S.rowPending=true;lockDialog(true);
    $('dialogBody').querySelectorAll('button,textarea').forEach(e=>{e.disabled=true;});$('dialogStatus').textContent='Saving note…';H.controls();H.patch();
    try {
      const data=await H.request({action:'note',subdivisionId:op.subdivisionId,parentId,note:op.note,expected:parent.note||''},true);
      if(data.savedNoteParentId!==parentId)throw new Error('The note destination was not confirmed. Use Check status.');
      H.applySnapshot(data);op.phase='saved';H.S.rowPending=false;H.render();$('dialogBody').querySelectorAll('button,textarea').forEach(e=>{e.disabled=false;});terminal('Note saved.');
    }catch(error){op.phase=error.unknown===false?'failed':'unknown';H.S.rowPending=false;if(op.phase==='failed')$('dialogBody').querySelectorAll('button,textarea').forEach(e=>{e.disabled=false;});terminal(error.message,true,op.phase==='unknown');}
  }
  async function recheck() {
    const op=H.S.rowOperation;if(!op||op.phase!=='unknown'||H.busy())return;
    if(!H.S.dialog){if(op.kind==='note')H.openDialog('Check builder note',H.name(op.builderId),'<p>Checking saved note…</p>',recheck,'Check status');else H.openDialog('Check builder assignment','PLACEHOLDER FORECASTS','<div id="assignProgress" class="assignment-progress" role="progressbar" aria-label="Builder assignment progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="assignBar"></span></div><p id="assignStage" role="status"></p><ol id="assignStages" class="assignment-stages"></ol><ul id="assignDestinations" class="assignment-results"></ul>',recheck,'Check status');}
    H.S.rowPending=true;lockDialog(true);$('dialogAction').disabled=true;$('dialogStatus').textContent='Checking saved records…';H.controls();H.patch();
    try {
      const body=op.kind==='assign'?{action:'assign_status',subdivisionId:op.subdivisionId,sourceBuilderId:op.sourceBuilderId,destinationBuilderId:op.destinationBuilderId,parentIds:op.plan.parentIds,forecastIds:op.plan.forecastIds}:{action:'snapshot',subdivisionId:op.subdivisionId};
      const data=await H.request(body);
      if(op.kind==='assign'){if(data.assignment?.verified!==true||!sameIds(data.assignment.parentIds,op.plan.parentIds)||!sameIds(data.assignment.forecastIds,op.plan.forecastIds))throw new Error('Some assignments still need review in Creator. Nothing was resent.');finishAssignment(op,data);}
      else {const parent=data.years.find(row=>row.id===op.parentId&&row.builderId===op.builderId);if(!parent||parent.note!==op.note)throw new Error('The note could not be confirmed. Nothing was resent.');H.applySnapshot(data);op.phase='saved';H.S.rowPending=false;H.render();$('dialogBody').querySelectorAll('button,textarea').forEach(e=>{e.disabled=false;});terminal('Saved note confirmed.');}
    }catch(error){H.S.rowPending=false;terminal(error.message,true,true);}
  }
  function connect(hooks) {H=hooks;document.addEventListener('click',event=>{const assign=event.target.closest('[data-assign-name]');if(assign&&!assign.disabled&&!blocked()){H.openPicker(assign,'assignBuilder');return;}const note=event.target.closest('[data-builder-notes]');if(note&&!note.disabled)notes(note.dataset.builderNotes);});}
  window.ForecastBuilderActions=Object.freeze({connect,label,confirm,recheck});
})();
