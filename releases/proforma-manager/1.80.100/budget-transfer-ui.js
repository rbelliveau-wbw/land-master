(function(root){
"use strict";
var current=null, modal=null;
var esc=function(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});};
var number=function(n){return Number(n||0).toLocaleString("en-US",{maximumFractionDigits:2});};
var dollars=function(n){return (Number(n)<0?"-$":"$")+number(Math.abs(Number(n)||0));};
var rateDollars=function(n){return "$"+Number(n||0).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:2});};
var chevron='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
var checkIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5L19 7"/></svg>';
var closeIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
var runSteps=[{key:"validate",label:"Verify destination Budgets"},{key:"send",label:"Send costs to Budgets"},{key:"verify",label:"Confirm saved Budgets"}];
function itemCount(plan){return plan?plan.phases.reduce(function(n,p){return n+p.writes.length;},0):0;}
function headerSummary(s){
  var plan=s.plan,label=s.sent?"Transfer complete":s.uncertain?"Review required":s.busy?"Checking Budgets":!plan?"Select destination":plan.errors.length?"Needs attention":s.dirty?"Preview changed":s.ready&&s.token?"Ready to send":"Preview only";
  modal.querySelector(".pfbt-header-state").textContent=label;
  modal.querySelector(".pfbt-header-state").className="pfbt-header-state "+(s.sent?"complete":s.uncertain||plan&&plan.errors.length?"attention":"");
  modal.querySelector(".pfbt-header-total").innerHTML=plan?'<span>TRANSFER TOTAL</span><strong>'+totalDollars(plan.total)+'</strong><small>'+plan.phases.length+' Budgets <span aria-hidden="true">·</span> '+itemCount(plan)+' items</small>':'<span>PRELIMINARY BUDGETS</span><small>Select a Project to review costs</small>';
  modal.querySelector("[data-send]").textContent=s.sent?"Costs sent & verified":"Send Costs to Budgets";
}
var metrics=[["Lot_Total_Residential","Lots"],["Acres","Acres"],["Equiv_LF_of_Street","Equiv. LF"],["Lot_Price","Lot Price"],["Land_Cost","Land Cost"]];
function ungroup(value){return String(value).replace(/[$,]/g,"");}
function formatMetric(value,field){var raw=ungroup(value);if(editError(field,raw))return raw;var parts=raw.split(".");parts[0]=parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,",");if(field==="Lot_Price"||field==="Land_Cost")parts[1]=(parts[1]||"").padEnd(2,"0");return parts.join(".").replace(/\.0+$/,"");}
function hasValues(edits){return Object.keys(edits).some(function(p){return Object.keys(edits[p]).length>0;});}
function hasEdits(s){return hasValues(s.edits)||hasValues(s.notes);}
function unsupportedEdits(s){return hasValues(s.edits)&&s.version<2||hasValues(s.notes)&&s.version<3;}
function rebuild(s){s.dirty=true;s.token="";s.plan=root.PFBudgetTransfer.build(s.ctx,s.mapping,s.edits,s.notes);}
function editError(field,value){var raw=String(value).trim(),v=Number(raw);return !/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(raw)||!Number.isFinite(v)||v<0||(field==="Lot_Total_Residential"?!Number.isSafeInteger(v):v!==Math.round((v+Number.EPSILON)*100)/100);}
var pencil='<svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6Z M14 5l5 5"/></svg>';
function departmentClass(name){return {Engineering:"engineering",Construction:"construction",Development:"development"}[name]||"other";}
function matrix(s,p){
  var disabled=s.busy||s.sent||s.uncertain,groups=root.PFBudgetTransfer.review(s.ctx,p),rows="";
  groups.forEach(function(d){
    rows+='<tr class="pfbt-department '+departmentClass(d.name)+'"><th colspan="2" scope="rowgroup">'+esc(d.name)+'</th><td>'+dollars(d.total)+'</td></tr>';
    d.categories.forEach(function(c){var key=p.phase+":"+c.id,collapsed=!!s.collapsed[key];
      rows+='<tr class="pfbt-category"><th colspan="2" scope="rowgroup"><div class="pfbt-category-heading"><button type="button" data-category="'+esc(key)+'" aria-expanded="'+!collapsed+'" aria-controls="pfbt-category-'+esc(c.id)+'" aria-label="'+(collapsed?'Expand':'Collapse')+' '+esc(c.name)+'">'+chevron+'</button><b>'+esc(c.name)+'</b><span class="pfbt-dept-pill '+departmentClass(d.name)+'">'+esc(d.name)+'</span><span class="pfbt-category-code">'+esc(c.code)+'</span></div></th><td>'+dollars(c.total)+'</td></tr>';
      rows+='</tbody><tbody id="pfbt-category-'+esc(c.id)+'"'+(collapsed?' hidden':'')+'>';
      c.items.forEach(function(i){var label='Budget note for '+i.name+' ('+i.code+')';
        rows+='<tr class="pfbt-item"><td><div class="pfbt-item-content"><div class="pfbt-item-heading"><span>'+esc(i.name)+'</span><span class="pfbt-code">'+esc(i.code)+'</span></div>'+(i.notes?'<small class="pfbt-note-preview">'+esc(i.notes)+'</small>':'')+'</div><button type="button" class="pfbt-note-button'+(i.notes?' has-note':'')+'" data-note="'+esc(i.id)+'" aria-label="Edit '+esc(label.toLowerCase())+'" aria-haspopup="dialog" title="'+esc(i.notes||'Add Budget note')+'"'+(disabled?' disabled':'')+'>'+pencil+'</button></td><td><span class="pfbt-pricing">'+esc(i.unit?rateDollars(i.rate)+" / "+i.unit:"Allocated total")+'</span></td><td class="pfbt-amount'+(i.amount<0?' credit':'')+'">'+dollars(i.amount)+'</td></tr>';
      });
      rows+='</tbody><tbody>';
    });
  });
  return '<div class="pfbt-table-wrap"><table class="pfbt-matrix"><colgroup><col class="pfbt-item-col"><col class="pfbt-pricing-col"><col class="pfbt-total-col"></colgroup><thead><tr><th scope="col">Item</th><th scope="col">Pricing</th><th scope="col">Preliminary</th></tr></thead><tbody>'+rows+'</tbody></table>'+(groups.length?'':'<div class="pfbt-empty">No costs available for this Budget.</div>')+'</div>';
}
function totalDollars(value){return Number(value||0).toLocaleString("en-US",{style:"currency",currency:"USD",minimumFractionDigits:0,maximumFractionDigits:2});}
function footerSummary(s){
  var plan=s.plan,p=plan&&plan.phases.find(function(x){return x.phase===s.activePhase;}),state=s.sent?"Sent & verified":s.uncertain?"Check Budgets":s.busy?"Checking…":!plan?"Choose Project":plan.errors.length?"Needs attention":!s.api.canSend()?"Access required":!s.ready?"Transfer unavailable":unsupportedEdits(s)?"Edits unavailable":s.dirty?"Preview changed":!s.token?"Preview unverified":"Ready to send",kind=s.sent?"verified":s.uncertain||plan&&plan.errors.length?"attention":s.busy||!plan||s.dirty||!s.token?"pending":"ready";
  return '<div class="pfbt-footer-totals">'+(p?'<div class="pfbt-footer-phase"><span>Phase '+p.phase+' total</span><strong>'+totalDollars(p.total)+'</strong><small>'+p.writes.length+' Budget items</small></div><div class="pfbt-footer-all"><span>All phases</span><strong>'+totalDollars(plan.total)+'</strong><small>'+plan.phases.length+' Budgets</small></div>':'')+'</div><div class="pfbt-footer-state"><span class="pfbt-state-pill '+kind+'">'+esc(state)+'</span>'+(plan&&plan.outliers.length?'<span class="pfbt-skipped">'+plan.outliers.length+' not migrated</span>':'')+'</div>';
}
function openNoteEditor(s,itemId){
  if(current!==s||s.busy||s.sent||s.uncertain||s.openNote)return;
  var phase=s.plan.phases.find(function(p){return p.phase===s.activePhase;}),write=phase.writes.find(function(w){return w.itemId===itemId;});if(!write)return;
  var item=s.ctx.budgetItems.find(function(i){return String(i.ID)===itemId;})||{};s.openNote=itemId;
  var layer=modal.querySelector(".pfbt-note-overlay");
  layer.innerHTML='<section class="pfbt-note-dialog" role="dialog" aria-modal="true" aria-labelledby="pfbt-note-title" aria-describedby="pfbt-note-context" tabindex="-1"><header><div><span class="pfbt-note-kicker">DESTINATION BUDGET</span><h3 id="pfbt-note-title">Budget note</h3></div><button type="button" data-note-cancel aria-label="Close Budget note"><svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header><div class="pfbt-note-body"><p id="pfbt-note-context"><b>'+esc(item.Item_Name||"Budget Item")+'</b><span class="pfbt-code">'+esc(item.Cost_Code)+'</span><small>Phase '+s.activePhase+'</small></p><label for="pfbt-note-value">Note to send</label><textarea id="pfbt-note-value" aria-label="Destination Budget note" rows="5">'+esc(write.notes)+'</textarea></div><footer><button type="button" class="btn" data-note-cancel>Cancel</button><button type="button" class="btn primary" data-note-save>Save note</button></footer></section>';
  layer.hidden=false;modal.querySelector(".pfbt-box").inert=true;modal.querySelector(".pfbt-box").setAttribute("aria-hidden","true");
  layer.querySelectorAll("[data-note-cancel]").forEach(function(b){b.addEventListener("click",function(){closeNoteEditor(false);});});layer.querySelector("[data-note-save]").addEventListener("click",function(){closeNoteEditor(true);});
  layer.querySelector("textarea").focus();
}
function closeNoteEditor(save){
  var s=current;if(!s||!s.openNote)return;var key=s.openNote,layer=modal.querySelector(".pfbt-note-overlay");
  if(save){(s.notes[s.activePhase]||(s.notes[s.activePhase]={}))[key]=layer.querySelector("textarea").value;rebuild(s);}
  s.openNote="";layer.hidden=true;layer.innerHTML="";modal.querySelector(".pfbt-box").inert=false;modal.querySelector(".pfbt-box").removeAttribute("aria-hidden");
  if(save){render();showPlanStatus(s);}var button=modal.querySelector('[data-note="'+key+'"]');if(button)button.focus({preventScroll:true});
}
function picker(label,key,selected,options){
  options=options.slice().sort(function(a,b){return String(a.label).localeCompare(String(b.label),"en",{sensitivity:"base",numeric:true});});
  var chosen=options.find(function(o){return String(o.id)===String(selected);});
  return '<details class="pfbt-picker" data-picker="'+esc(key)+'"><summary aria-label="'+esc(label)+'">'+esc(chosen?chosen.label:label)+chevron+'</summary><div class="pfbt-options"><input aria-label="Search '+esc(label.toLowerCase())+'" placeholder="Search…"><div class="pfbt-option-list" role="listbox" aria-label="'+esc(label)+'">'+options.map(function(o){return '<button type="button" role="option" aria-selected="'+(String(o.id)===String(selected))+'" data-choice="'+esc(o.id)+'">'+esc(o.label)+'</button>';}).join("")+'</div></div></details>';
}
// Fixed panels escape the scrolling body and phase-card clipping without
// contributing to either card's height. The overlay is their containing block.
function positionPicker(d){
  if(!d.open)return;
  var anchor=d.querySelector("summary").getBoundingClientRect(),frame=modal.getBoundingClientRect(),panel=d.querySelector(".pfbt-options"),gap=6,edge=8;
  var below=frame.bottom-anchor.bottom-gap-edge,above=anchor.top-frame.top-gap-edge,up=below<180&&above>below;
  var height=Math.max(0,up?above:below);
  panel.style.width=anchor.width+"px";panel.style.left=(anchor.left-frame.left)+"px";panel.style.maxHeight=height+"px";
  panel.style.top="auto";panel.style.bottom="auto";
  if(up)panel.style.bottom=(frame.bottom-anchor.top+gap)+"px";
  else panel.style.top=(anchor.bottom-frame.top+gap)+"px";
}
function positionOpenPickers(){if(modal&&!modal.hidden)modal.querySelectorAll(".pfbt-picker[open]").forEach(positionPicker);}
root.addEventListener("resize",positionOpenPickers);
function status(text,error){modal.querySelector(".pfbt-status").textContent=text;modal.querySelector(".pfbt-status").classList.toggle("error",!!error);}
// Match the Contracts lot-run modal: start work immediately and pace only the
// display. Server-confirmed writes, never elapsed time, settle a progress step.
function bounded(promise,ms){return new Promise(function(resolve,reject){var timer=setTimeout(function(){reject(new Error("Creator did not return a confirmed result in time."));},ms);Promise.resolve(promise).then(function(value){clearTimeout(timer);resolve(value);},function(error){clearTimeout(timer);reject(error);});});}
function verifyTransferResult(result,plan){
  var expected=plan.phases.map(function(p){return String(p.budgetId);}).sort(),completed=(result&&result.completed||[]).map(String).sort();
  if(!result||result.action!=="budget_transfer_apply"||!(result.success===true||result.success==="true")||!expected.length||new Set(expected).size!==expected.length||JSON.stringify(completed)!==JSON.stringify(expected))throw new Error("The complete transfer could not be verified. Review the destination Budgets before trying again.");
  return completed;
}
function startRun(s){
  var layer=modal.querySelector(".pfbt-run-overlay"),steps={};runSteps.forEach(function(st){steps[st.key]={state:"pending",detail:""};});
  s.run={running:true,ok:false,steps:steps,queue:[],timer:0,at:"validate",completed:[],message:"Checking the current source and destination values.",plan:s.plan};
  layer.innerHTML='<section class="pfbt-run-dialog" role="dialog" aria-modal="true" aria-labelledby="pfbt-run-title" aria-describedby="pfbt-run-context" tabindex="-1"><header class="pfbt-run-head"><div><span class="pfbt-run-kicker">BUDGET TRANSFER</span><h2 id="pfbt-run-title">Sending costs to Budgets</h2><p id="pfbt-run-context">'+esc(s.api.name)+' <span aria-hidden="true">→</span> '+esc(projectName(s))+'</p></div><button type="button" class="pfbt-run-x" aria-label="Close transfer progress" data-run-close disabled>'+closeIcon+'</button><div class="pfbt-run-meter" role="progressbar" aria-label="Verified transfer steps" aria-valuemin="0" aria-valuemax="3" aria-valuenow="0"><i></i></div></header><div class="pfbt-run-body"><div class="pfbt-run-totals"><div><span>TRANSFER TOTAL</span><strong data-run-total></strong></div><div><b data-run-count></b><small>Preliminary Budget items</small></div></div><div class="pfbt-run-steps">'+runSteps.map(function(st,i){return '<div class="pfbt-run-step pending" data-run-step="'+st.key+'"><span class="pfbt-run-icon">'+(i+1)+'</span><div><b>'+st.label+'</b><small></small></div><span class="pfbt-run-chip">Waiting</span></div>';}).join("")+'</div><div class="pfbt-run-result" hidden></div><div class="pfbt-run-destinations" hidden></div></div><footer class="pfbt-run-foot"><span role="status" aria-live="polite"></span><div><button type="button" class="btn" data-run-review hidden>Review transfer</button><button type="button" class="btn primary" data-run-close disabled>Working…</button></div></footer></section>';
  layer.hidden=false;modal.querySelector(".pfbt-box").inert=true;modal.querySelector(".pfbt-box").setAttribute("aria-hidden","true");
  layer.querySelectorAll("[data-run-close]").forEach(function(b){b.addEventListener("click",function(){closeRun(true);});});layer.querySelector("[data-run-review]").addEventListener("click",function(){closeRun(false);});
  layer.querySelector(".pfbt-run-dialog").focus();runUpdate(s,"validate","run","Rechecking phase mappings, quantities and access.");
}
function projectName(s){var project=s.projects.find(function(p){return String(p.ID)===s.projectId;});return project&&(project.Project_Name||String(project.ID))||"Choose Project";}
function runUpdate(s,key,state,detail){if(!s.run)return;if(state==="run")s.run.at=key;s.run.queue.push({key:key,state:state,detail:detail||""});pumpRun(s);}
function endRun(s,ok,message){s.run.queue.push({end:true,ok:ok,message:message});pumpRun(s);}
function pumpRun(s){
  var r=s.run;if(current!==s||!r||r.timer||!r.queue.length)return;var update=r.queue.shift();
  if(update.end){r.running=false;r.ok=update.ok;r.message=update.message;s.busy=false;render();}else r.steps[update.key]={state:update.state,detail:update.detail};
  renderRun(s);
  if(r.queue.length||r.running)r.timer=setTimeout(function(){r.timer=0;pumpRun(s);},root.matchMedia&&root.matchMedia("(prefers-reduced-motion: reduce)").matches?0:560);
}
function renderRun(s){
  var r=s.run,layer=modal.querySelector(".pfbt-run-overlay"),done=0,next=false;runSteps.forEach(function(st,i){var step=r.steps[st.key],row=layer.querySelector('[data-run-step="'+st.key+'"]');if(step.state==="done")done++;var isNext=!next&&step.state==="pending";if(isNext)next=true;row.className="pfbt-run-step "+step.state+(isNext&&r.running?" next":"");row.querySelector(".pfbt-run-icon").innerHTML=step.state==="done"?checkIcon:step.state==="run"?'<i class="pfbt-run-spinner"></i>':step.state==="failed"?'!':String(i+1);row.querySelector("small").textContent=step.detail;row.querySelector(".pfbt-run-chip").textContent=step.state==="done"?"Done":step.state==="run"?"Running":step.state==="failed"?"Needs review":r.running&&isNext?"Up next":"Not started";});
  layer.querySelector(".pfbt-run-totals span").textContent=!r.running&&!r.ok?"PLANNED TOTAL":"TRANSFER TOTAL";layer.querySelector("[data-run-total]").textContent=totalDollars(r.plan.total);layer.querySelector("[data-run-count]").textContent=r.plan.phases.length+" Budgets · "+itemCount(r.plan)+" items";
  var meter=layer.querySelector(".pfbt-run-meter");meter.setAttribute("aria-valuenow",String(done));meter.querySelector("i").style.width=done*100/runSteps.length+"%";meter.className="pfbt-run-meter"+(!r.running?(r.ok?" success":" failed"):"");
  layer.querySelector("#pfbt-run-title").textContent=r.running?"Sending costs to Budgets":r.ok?"Costs sent & verified":s.uncertain?"Transfer needs review":"Transfer did not start";
  layer.querySelector(".pfbt-run-foot [role=status]").textContent=r.running?"Working · keep this open until the result is confirmed.":r.ok?"All destination Budgets verified.":"Review the result before trying again.";
  layer.querySelectorAll("[data-run-close]").forEach(function(b){b.disabled=r.running;if(!b.classList.contains("pfbt-run-x"))b.textContent=r.running?"Working…":r.ok?"Done":"Close";});layer.querySelector("[data-run-review]").hidden=r.running;
  var result=layer.querySelector(".pfbt-run-result");result.hidden=r.running;result.className="pfbt-run-result "+(r.ok?"success":"attention");result.innerHTML=r.running?"":'<span class="pfbt-run-result-icon">'+(r.ok?checkIcon:'!')+'</span><div><b>'+(r.ok?"Transfer complete":s.uncertain?"Some data may have been saved":"No costs were sent")+'</b><p>'+esc(r.message)+'</p></div>';
  var destinations=layer.querySelector(".pfbt-run-destinations");destinations.hidden=r.running;if(!r.running)destinations.innerHTML='<h3>DESTINATION BUDGETS</h3>'+r.plan.phases.map(function(p){var verified=r.completed.indexOf(String(p.budgetId))>=0;return '<div><span class="pfbt-run-phase">'+p.phase+'</span><div><b>'+esc(p.budget||p.subdivision)+'</b><small>'+esc(p.subdivision)+' · '+p.writes.length+' items</small></div><strong>'+(verified?'':'Planned ')+totalDollars(p.total)+'</strong><span class="pfbt-run-budget-state '+(verified?'verified':'')+'">'+(verified?checkIcon:'')+esc(verified?"Verified":s.uncertain?"Check Budget":"Not sent")+'</span></div>';}).join("");
}
function closeRun(done){var s=current;if(!s||!s.run||s.run.running)return;if(s.run.timer)clearTimeout(s.run.timer);s.run=null;var layer=modal.querySelector(".pfbt-run-overlay");layer.hidden=true;layer.innerHTML="";modal.querySelector(".pfbt-box").inert=false;modal.querySelector(".pfbt-box").removeAttribute("aria-hidden");if(done&&s.sent)close();else{modal.querySelector(".pfbt-box").focus();}}
function positionPhaseSlider(previous){
  if(!modal)return;
  var rail=modal.querySelector(".pfbt-tabs"),selected=rail&&rail.querySelector('[aria-selected="true"]'),slider=rail&&rail.querySelector(".pfbt-tab-slider");
  if(!slider||!selected)return;
  var buttonRect=selected.getBoundingClientRect(),railRect=rail.getBoundingClientRect();
  slider.style.left=(buttonRect.left-railRect.left-rail.clientLeft+rail.scrollLeft)+"px";slider.style.top=(buttonRect.top-railRect.top-rail.clientTop+rail.scrollTop)+"px";slider.style.width=buttonRect.width+"px";slider.style.height=buttonRect.height+"px";
  if(previous&&previous.phase!==selected.getAttribute("data-phase-tab")&&slider.animate&&!(root.matchMedia&&root.matchMedia("(prefers-reduced-motion: reduce)").matches)){
    var rect=slider.getBoundingClientRect();
    slider.animate([{transform:"translateX("+(previous.rect.left-rect.left)+"px) scaleX("+(previous.rect.width/rect.width)+")"},{transform:"translateX(0) scaleX(1)"}],{duration:280,easing:"cubic-bezier(.22,1,.36,1)"});
  }
}
root.addEventListener("resize",function(){positionPhaseSlider(null);});
function render(){
  if(!current)return;
  var s=current, plan=s.plan;
  var oldSlider=modal.querySelector(".pfbt-tab-slider"),oldTab=modal.querySelector('.pfbt-tabs [aria-selected="true"]'),previous=oldSlider&&oldTab?{rect:oldSlider.getBoundingClientRect(),phase:oldTab.getAttribute("data-phase-tab")}:null;
  var focus=document.activeElement,field=focus&&focus.getAttribute("data-metric"),focusValue=field?focus.value:null,start=field?focus.selectionStart:null,end=field?focus.selectionEnd:null;
  var bodyScroll=modal.querySelector(".pfbt-body").scrollTop,table=modal.querySelector(".pfbt-phase .pfbt-table-wrap"),tableScroll=table?table.scrollTop:0;
  modal.classList.toggle("busy",s.busy);
  modal.querySelector(".pfbt-project").innerHTML='<b>DESTINATION PROJECT</b>'+picker("Choose Project","project",s.projectId,s.projects.map(function(p){return {id:String(p.ID),label:p.Project_Name||String(p.ID)};}));
  var body="";
  if(plan){
    var options=(s.ctx.subdivisions||[]).map(function(sub){return {id:String(sub.ID),label:sub.Subdivision_Name||String(sub.ID)};});
    if(!plan.phases.some(function(p){return p.phase===s.activePhase;}))s.activePhase=plan.phases.length?plan.phases[0].phase:1;
    var phaseTabs='<div class="pfbt-tabs" role="tablist" aria-label="Budget phases"><span class="pfbt-tab-slider" aria-hidden="true"></span>'+plan.phases.map(function(p){return '<button type="button" role="tab" aria-selected="'+(p.phase===s.activePhase)+'" aria-controls="pfbt-phase-panel" tabindex="'+(p.phase===s.activePhase?0:-1)+'" id="pfbt-tab-'+p.phase+'" data-phase-tab="'+p.phase+'"'+(p.errors.length?' class="has-errors" title="Needs attention"':'')+'>Phase '+p.phase+'</button>';}).join("")+'</div>';
    plan.phases.filter(function(p){return p.phase===s.activePhase;}).forEach(function(p){
      body+='<section class="pfbt-phase"><div class="pfbt-destination"><div class="pfbt-destination-identity"><span>DESTINATION BUDGET</span><h3>'+esc(p.budget||"No Budget available")+'</h3><small>'+esc(s.mapping[p.phase]?p.subdivision:"No unique subdivision match")+'</small></div>';
      body+='<div class="pfbt-metrics">'+metrics.map(function(m){var value=s.edits[p.phase]&&Object.prototype.hasOwnProperty.call(s.edits[p.phase],m[0])?s.edits[p.phase][m[0]]:p.header[m[0]],invalid=editError(m[0],value),currency=m[0]==="Lot_Price"||m[0]==="Land_Cost",label=m[1]+" for Phase "+p.phase;return '<div class="pfbt-metric'+(invalid?' invalid':'')+'"><label for="pfbt-'+m[0]+'">'+m[1]+'</label><div class="pfbt-metric-input">'+(currency?'<span aria-hidden="true">$</span>':'')+'<input type="text" inputmode="'+(m[0]==="Lot_Total_Residential"?'numeric':'decimal')+'" id="pfbt-'+m[0]+'" data-metric="'+m[0]+'" data-metric-phase="'+p.phase+'" aria-label="'+label+'" aria-invalid="'+invalid+'" value="'+esc(value)+'"'+(s.busy||s.sent||s.uncertain?' disabled':'')+'></div></div>';}).join("")+'</div><button type="button" class="pfbt-reset" data-reset="'+p.phase+'"'+(s.busy||s.sent||s.uncertain?' disabled':'')+'>Reset values</button></div>';
      if(!s.automatic[p.phase])body+='<div class="pfbt-mapping"><b>Subdivision</b>'+picker("Subdivision for Phase "+p.phase,String(p.phase),s.mapping[p.phase],options)+'</div>';
      body+='<div class="pfbt-phase-switch">'+phaseTabs+'</div><div id="pfbt-phase-panel" role="tabpanel" aria-labelledby="pfbt-tab-'+p.phase+'">'+matrix(s,p)+'</div></section>';
    });
    if(plan.outliers.length)body+='<details class="pfbt-outliers"><summary>Not Migrated · '+plan.outliers.length+'</summary><div class="pfbt-table-wrap"><table><thead><tr><th>Item</th><th>Amount</th><th>Reason</th></tr></thead><tbody>'+plan.outliers.map(function(o){return '<tr><td>'+esc(o.code)+' — '+esc(o.source)+(o.notes?'<small>'+esc(o.notes)+'</small>':'')+'</td><td>'+dollars(o.amount)+'</td><td>'+esc(o.reason)+(o.phase?'<small>Phase '+o.phase+'</small>':'')+'</td></tr>';}).join("")+'</tbody></table></div></details>';
  }
  modal.querySelector(".pfbt-preview").innerHTML=body;
  positionPhaseSlider(previous);
  modal.querySelector(".pfbt-summary").innerHTML=footerSummary(s);
  headerSummary(s);
  modal.querySelector("[data-send]").disabled=s.busy||s.sent||s.uncertain||!s.api.canSend()||!s.ready||(!s.token&&!s.dirty)||unsupportedEdits(s)||!plan||!plan.canSend;
  modal.querySelector("[data-refresh]").disabled=s.busy||!s.projectId||s.sent||s.uncertain;
  modal.querySelectorAll("[data-close]").forEach(function(b){b.disabled=s.busy;});
  modal.querySelectorAll("[data-metric]").forEach(function(input){var f=input.getAttribute("data-metric");if(f!==field)input.value=formatMetric(input.value,f);input.addEventListener("blur",function(){input.value=formatMetric(input.value,f);});input.addEventListener("input",function(){if(s.busy||s.sent||s.uncertain)return;var p=input.getAttribute("data-metric-phase");(s.edits[p]||(s.edits[p]={}))[f]=ungroup(input.value);s.dirty=true;s.token="";s.plan=root.PFBudgetTransfer.build(s.ctx,s.mapping,s.edits,s.notes);render();showPlanStatus(s);});});
  modal.querySelectorAll("[data-reset]").forEach(function(button){button.addEventListener("click",function(){delete s.edits[button.getAttribute("data-reset")];s.dirty=true;s.token="";s.plan=root.PFBudgetTransfer.build(s.ctx,s.mapping,s.edits,s.notes);render();showPlanStatus(s);});});
  modal.querySelectorAll("[data-category]").forEach(function(button){button.addEventListener("click",function(){var key=button.getAttribute("data-category");s.collapsed[key]=!s.collapsed[key];render();modal.querySelector('[data-category="'+key+'"]').focus({preventScroll:true});});});
  modal.querySelectorAll("[data-note]").forEach(function(button){button.addEventListener("click",function(){openNoteEditor(s,button.getAttribute("data-note"));});});
  modal.querySelectorAll("[data-phase-tab]").forEach(function(b){
    function select(){s.activePhase=Number(b.getAttribute("data-phase-tab"));render();modal.querySelector("#pfbt-tab-"+s.activePhase).focus();}
    b.addEventListener("click",select);
    b.addEventListener("keydown",function(e){var tabs=plan.phases,index=tabs.findIndex(function(p){return p.phase===s.activePhase;});if(["ArrowLeft","ArrowRight","Home","End"].indexOf(e.key)<0)return;e.preventDefault();if(e.key==="Home")index=0;else if(e.key==="End")index=tabs.length-1;else index=(index+(e.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length;s.activePhase=tabs[index].phase;render();modal.querySelector("#pfbt-tab-"+s.activePhase).focus();});
  });
  modal.querySelectorAll(".pfbt-picker").forEach(function(d){
    d.addEventListener("toggle",function(){if(d.open){modal.querySelectorAll(".pfbt-picker[open]").forEach(function(other){if(other!==d)other.open=false;});positionPicker(d);d.querySelector("input").focus({preventScroll:true});}});
    d.querySelector("input").addEventListener("input",function(e){var q=e.target.value.trim().toLowerCase();d.querySelectorAll("[data-choice]").forEach(function(b){b.hidden=b.textContent.toLowerCase().indexOf(q)<0;});});
    d.querySelectorAll("[data-choice]").forEach(function(b){b.addEventListener("click",function(){if(s.busy||s.sent||s.uncertain)return;var key=d.getAttribute("data-picker"),value=b.getAttribute("data-choice");d.open=false;s.token="";if(key==="project"){s.projectId=value;s.activePhase=1;s.mapping={};s.automatic={};s.edits={};s.notes={};s.collapsed={};s.openNote="";s.dirty=false;s.plan=null;s.ctx=null;loadProject(s);}else{s.mapping[key]=value;delete s.notes[key];s.openNote="";refresh(s);} });});
  });
  modal.querySelector(".pfbt-body").scrollTop=bodyScroll;
  var newTable=modal.querySelector(".pfbt-phase .pfbt-table-wrap");if(newTable)newTable.scrollTop=tableScroll;
  if(field){var target=modal.querySelector('[data-metric="'+field+'"]');if(target&&!target.disabled){target.value=focusValue;target.focus({preventScroll:true});target.setSelectionRange(start,end);}}
}
function showPlanStatus(s){status(s.plan.errors.length?s.plan.errors.join("\n"):!s.ready?"Budget transfer connection unavailable.":unsupportedEdits(s)?"":s.dirty?"Preview updated. Values will be verified before sending.":"Ready to send to empty Budgets.",s.plan.errors.length>0||!s.ready);}
async function refresh(s){
  if(current!==s||s.busy||!s.ctx)return;
  s.busy=true;s.token="";render();status("Checking Budgets…",false);
  try{
    s.plan=root.PFBudgetTransfer.build(s.ctx,s.mapping,s.edits,s.notes);
    if(s.ready&&!unsupportedEdits(s)&&s.plan.canSend){var result=await s.api.preview(s.projectId,s.mapping,s.edits,s.notes);if(current!==s)return;s.plan=result.plan;s.token=result.token;s.dirty=false;}
    if(current!==s)return;
    showPlanStatus(s);
  }catch(e){if(current===s){s.token="";status(e.message||"Could not verify the preview.",true);}}
  finally{if(current===s){s.busy=false;render();}}
}
async function loadProject(s){
  s.busy=true;render();status("Loading Project subdivisions…",false);
  try{
    s.ctx=await s.api.loadContext(s.projectId);if(current!==s)return;
    // Automatically match unique saved phase numbers; retain a picker for unresolved assignments.
    (s.ctx.subdivisions||[]).forEach(function(sub){var p=Number(sub.Phase);if(Number.isInteger(p)&&p>0&&p<=Number(s.ctx.pf.Phases)&&s.ctx.subdivisions.filter(function(x){return Number(x.Phase)===p;}).length===1){s.mapping[p]=String(sub.ID);s.automatic[p]=true;}});
    s.busy=false;await refresh(s);
  }catch(e){if(current===s){s.busy=false;s.ctx=null;render();status(e.message||"Could not load the Project.",true);}}
}
function close(){if(!current||current.busy)return;if(current.run){closeRun(false);return;}if(current.openNote){closeNoteEditor(false);return;}var focus=current.focus;current=null;modal.hidden=true;if(focus&&focus.isConnected)focus.focus();}
async function send(){
  var s=current;if(!s||s.busy||s.uncertain||s.sent||!s.api.canSend()||!s.plan||!s.plan.canSend||unsupportedEdits(s))return;
  s.busy=true;render();startRun(s);var submitted=false;
  try{
    var preview=await bounded(s.api.preview(s.projectId,s.mapping,s.edits,s.notes),30000);if(current!==s)return;
    if(!preview||!preview.plan||!preview.plan.canSend||!preview.token)throw new Error(preview&&preview.plan&&preview.plan.errors.join(" ")||"The destination Budgets are not ready to receive costs.");s.plan=preview.plan;s.token=preview.token;s.dirty=false;s.run.plan=s.plan;
    runUpdate(s,"validate","done",s.plan.phases.length+" destination Budgets checked · "+itemCount(s.plan)+" items");runUpdate(s,"send","run","Saving quantities, preliminary costs and Budget notes.");submitted=true;
    var result=await bounded(s.api.apply(s.projectId,s.mapping,s.token,s.edits,s.notes),90000);if(current!==s)return;
    s.run.completed=verifyTransferResult(result,s.plan);runUpdate(s,"send","done",s.run.completed.length+" Budgets saved · "+totalDollars(s.plan.total));runUpdate(s,"verify","run","Checking Creator's destination confirmation.");runUpdate(s,"verify","done","Creator confirmed the destination Budgets.");
    s.sent=s.run.completed.length+" Budgets";s.token="";status("Transfer complete · "+s.sent+" · "+itemCount(s.plan)+" items · "+totalDollars(s.plan.total)+" sent and verified.",false);modal.querySelector(".pfbt-status").classList.add("complete");
    endRun(s,true,s.sent+" received "+itemCount(s.plan)+" preliminary Budget items. Your saved Pro Forma was unchanged.");if(s.api.success){try{s.api.success(s.projectId);}catch(callbackError){/* Persisted verification remains valid if a local refresh callback fails. */}}
  }catch(e){if(current===s){s.token="";s.uncertain=submitted;var partial=e.transferResult&&e.transferResult.completed||[];s.run.completed=(Array.isArray(partial)?partial:[]).map(String).filter(function(id){return s.run.plan.phases.some(function(p){return String(p.budgetId)===id;});});runUpdate(s,s.run.at,"failed",e.message||"The result could not be confirmed.");var message=(e.message||"Transfer result is unknown.")+(submitted?" Review the destination Budgets before sending again.":"");status(message,true);endRun(s,false,message);}}
}
async function open(api){
  if(!api||typeof api.canSend!=="function"||!api.canSend())return;
  if(current&&current.busy)return;
  if(!modal){modal=document.createElement("div");modal.className="pfbt";modal.hidden=true;modal.innerHTML='<section class="pfbt-box" role="dialog" aria-modal="true" aria-labelledby="pfbt-title" tabindex="-1"><header class="pfbt-head"><div class="pfbt-heading"><div class="pfbt-heading-kicker">PRO FORMA / BUDGET TRANSFER <span class="pfbt-header-state"></span></div><h2 id="pfbt-title">Send Costs to Budgets</h2></div><div class="pfbt-header-total"></div><button type="button" data-close aria-label="Close transfer">'+closeIcon+'</button></header><div class="pfbt-body"><div class="pfbt-route"><div class="pfbt-source"><span>SOURCE PRO FORMA</span><b class="pfbt-source-name"></b></div><svg class="pfbt-route-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg><div class="pfbt-project"></div></div><div class="pfbt-status" role="status" aria-live="polite"></div><div class="pfbt-preview"></div></div><footer class="pfbt-foot"><div class="pfbt-summary"></div><div class="pfbt-actions"><button class="btn sm" type="button" data-refresh>Refresh preview</button><button class="btn sm" type="button" data-close>Close</button><button class="btn sm primary" type="button" data-send>Send Costs to Budgets</button></div></footer></section><div class="pfbt-note-overlay" hidden></div><div class="pfbt-run-overlay" hidden></div>';document.body.appendChild(modal);modal.querySelectorAll("[data-close]").forEach(function(b){b.addEventListener("click",close);});modal.querySelector("[data-send]").addEventListener("click",send);modal.querySelector("[data-refresh]").addEventListener("click",function(){refresh(current);});
    modal.addEventListener("scroll",positionOpenPickers,true);
    modal.addEventListener("keydown",function(e){if(current&&current.run&&e.key==="Escape"){e.preventDefault();e.stopPropagation();closeRun(false);return;}if(current&&current.openNote&&e.key==="Escape"){e.preventDefault();e.stopPropagation();closeNoteEditor(false);return;}if(e.key==="Escape"){e.preventDefault();e.stopPropagation();var d=modal.querySelector("details[open]");if(d){d.open=false;d.querySelector("summary").focus();}else close();}if(e.key==="Tab"){var scope=current&&current.run?modal.querySelector(".pfbt-run-dialog"):current&&current.openNote?modal.querySelector(".pfbt-note-overlay"):modal.querySelector(".pfbt-box"),f=Array.from(scope.querySelectorAll("button:not(:disabled), summary, input:not(:disabled), textarea:not(:disabled)")).filter(function(x){return x.getClientRects().length>0&&!x.hidden&&x.tabIndex>=0;}),first=f[0],last=f[f.length-1];if(!f.length){e.preventDefault();scope.focus();}else if(e.shiftKey&&(document.activeElement===first||document.activeElement===scope)){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===scope)){e.preventDefault();first.focus();}}});
  }
  var s={api:api,focus:document.activeElement,projects:[],projectId:"",mapping:{},automatic:{},edits:{},notes:{},collapsed:{},openNote:"",run:null,dirty:false,version:0,ctx:null,plan:null,token:"",busy:true,ready:false,activePhase:1};current=s;modal.hidden=false;modal.querySelector(".pfbt-source-name").textContent=api.name;modal.querySelector(".pfbt-status").classList.remove("complete");render();status("Loading Projects…",false);modal.querySelector(".pfbt-box").focus();
  try{var result=await Promise.all([api.getProjects(),api.capabilities()]);if(current!==s)return;s.projects=result[0];s.version=Number(result[1])||0;s.ready=s.version>=1;s.busy=false;render();var linked=s.projects.filter(function(p){return String(p.Proforma&&p.Proforma.ID||p.Proforma||"")===api.id;});if(linked.length===1){s.projectId=String(linked[0].ID);await loadProject(s);}else status(s.projects.length?"Choose a Project.":"No Projects available.",!s.projects.length);}catch(e){if(current===s){s.busy=false;render();status(e.message||"Could not load Projects.",true);}}
}
root.PFBudgetTransferUI={open:open};
})(window);
