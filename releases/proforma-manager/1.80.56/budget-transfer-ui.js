(function(root){
"use strict";
var current=null, modal=null;
var esc=function(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});};
var number=function(n){return Number(n||0).toLocaleString("en-US",{maximumFractionDigits:2});};
var dollars=function(n){return (Number(n)<0?"-$":"$")+number(Math.abs(Number(n)||0));};
var rateDollars=function(n){return "$"+Number(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});};
var chevron='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
var metrics=[["Lot_Total_Residential","Lots"],["Acres","Acres"],["Equiv_LF_of_Street","Equiv. LF"],["Lot_Price","Lot Price"],["Land_Cost","Land Cost"]];
function ungroup(value){return String(value).replace(/[$,]/g,"");}
function formatMetric(value,field){var raw=ungroup(value);if(editError(field,raw))return raw;var parts=raw.split(".");parts[0]=parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,",");if(field==="Lot_Price"||field==="Land_Cost")parts[1]=(parts[1]||"").padEnd(2,"0");return parts.join(".");}
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
      c.items.forEach(function(i){var open=s.openNote===i.id,label='Budget note for '+i.name+' ('+i.code+')';
        rows+='<tr class="pfbt-item"><td><div class="pfbt-item-heading"><span>'+esc(i.name)+'</span><span class="pfbt-code">'+esc(i.code)+'</span><button type="button" class="pfbt-note-button'+(i.notes?' has-note':'')+'" data-note="'+esc(i.id)+'" aria-label="Edit '+esc(label.toLowerCase())+'" aria-expanded="'+open+'" title="'+esc(i.notes||'Add Budget note')+'"'+(disabled?' disabled':'')+'>'+pencil+'</button></div>'+(i.notes?'<small class="pfbt-note-preview">'+esc(i.notes)+'</small>':'')+'</td><td><span class="pfbt-pricing">'+esc(i.unit?rateDollars(i.rate)+" / "+i.unit:"Allocated total")+'</span></td><td class="pfbt-amount'+(i.amount<0?' credit':'')+'">'+dollars(i.amount)+'</td></tr>';
        if(open)rows+='<tr class="pfbt-note-row"><td colspan="3"><label for="pfbt-note-value">Destination Budget note</label><textarea id="pfbt-note-value" data-note-edit="'+esc(i.id)+'" aria-label="'+esc(label)+'" rows="3"'+(disabled?' disabled':'')+'>'+esc(i.notes)+'</textarea><div class="pfbt-note-actions"><button type="button" data-note-reset="'+esc(i.id)+'"'+(disabled?' disabled':'')+'>Reset note</button><button type="button" data-note-done="'+esc(i.id)+'"'+(disabled?' disabled':'')+'>Done</button></div></td></tr>';
      });
      rows+='</tbody><tbody>';
    });
  });
  return '<div class="pfbt-table-wrap"><table class="pfbt-matrix"><colgroup><col class="pfbt-item-col"><col class="pfbt-pricing-col"><col class="pfbt-total-col"></colgroup><thead><tr><th scope="col">Item</th><th scope="col">Pricing</th><th scope="col">Preliminary</th></tr></thead><tbody>'+rows+'</tbody></table>'+(groups.length?'':'<div class="pfbt-empty">No costs available for this Budget.</div>')+'</div>';
}
function picker(label,key,selected,options){
  options=options.slice().sort(function(a,b){return String(a.label).localeCompare(String(b.label),"en",{sensitivity:"base",numeric:true});});
  var chosen=options.find(function(o){return String(o.id)===String(selected);});
  return '<details class="pfbt-picker" data-picker="'+esc(key)+'"><summary aria-label="'+esc(label)+'">'+esc(chosen?chosen.label:label)+chevron+'</summary><div class="pfbt-options"><input aria-label="Search '+esc(label.toLowerCase())+'" placeholder="Search…"><div class="pfbt-option-list" role="listbox" aria-label="'+esc(label)+'">'+options.map(function(o){return '<button type="button" role="option" aria-selected="'+(String(o.id)===String(selected))+'" data-choice="'+esc(o.id)+'">'+esc(o.label)+'</button>';}).join("")+'</div></div></details>';
}
function status(text,error){modal.querySelector(".pfbt-status").textContent=text;modal.querySelector(".pfbt-status").classList.toggle("error",!!error);}
function render(){
  if(!current)return;
  var s=current, plan=s.plan;
  var focus=document.activeElement,field=focus&&focus.getAttribute("data-metric"),noteField=focus&&focus.getAttribute("data-note-edit"),focusValue=field||noteField?focus.value:null,start=field||noteField?focus.selectionStart:null,end=field||noteField?focus.selectionEnd:null;
  var bodyScroll=modal.querySelector(".pfbt-body").scrollTop,table=modal.querySelector(".pfbt-phase .pfbt-table-wrap"),tableScroll=table?table.scrollTop:0;
  modal.classList.toggle("busy",s.busy);
  modal.querySelector(".pfbt-project").innerHTML='<b>Project</b>'+picker("Choose Project","project",s.projectId,s.projects.map(function(p){return {id:String(p.ID),label:p.Project_Name||String(p.ID)};}));
  var body="";
  if(plan){
    var options=(s.ctx.subdivisions||[]).map(function(sub){return {id:String(sub.ID),label:sub.Subdivision_Name||String(sub.ID)};});
    if(!plan.phases.some(function(p){return p.phase===s.activePhase;}))s.activePhase=plan.phases.length?plan.phases[0].phase:1;
    body+='<div class="pfbt-tabs" role="tablist" aria-label="Budget phases">'+plan.phases.map(function(p){return '<button type="button" role="tab" aria-selected="'+(p.phase===s.activePhase)+'" aria-controls="pfbt-phase-panel" tabindex="'+(p.phase===s.activePhase?0:-1)+'" id="pfbt-tab-'+p.phase+'" data-phase-tab="'+p.phase+'"'+(p.errors.length?' class="has-errors"':'')+'>Phase '+p.phase+'<small>'+number(p.header.Lot_Total_Residential)+' lots'+(p.errors.length?' · Needs attention':'')+'</small></button>';}).join("")+'</div>';
    plan.phases.filter(function(p){return p.phase===s.activePhase;}).forEach(function(p){
      body+='<section class="pfbt-phase" id="pfbt-phase-panel" role="tabpanel" aria-labelledby="pfbt-tab-'+p.phase+'"><div class="pfbt-destination"><div><span>DESTINATION BUDGET</span><h3>'+esc(p.budget||"No Budget available")+'</h3><small>'+esc(s.mapping[p.phase]?p.subdivision:"No unique subdivision match")+'</small></div><button type="button" class="pfbt-reset" data-reset="'+p.phase+'"'+(s.busy||s.sent||s.uncertain?' disabled':'')+'>Reset values</button></div>';
      if(!s.automatic[p.phase])body+='<div class="pfbt-mapping"><b>Subdivision</b>'+picker("Subdivision for Phase "+p.phase,String(p.phase),s.mapping[p.phase],options)+'</div>';
      body+='<div class="pfbt-metrics">'+metrics.map(function(m){var value=s.edits[p.phase]&&Object.prototype.hasOwnProperty.call(s.edits[p.phase],m[0])?s.edits[p.phase][m[0]]:p.header[m[0]],invalid=editError(m[0],value),currency=m[0]==="Lot_Price"||m[0]==="Land_Cost",label=m[1]+" for Phase "+p.phase;return '<div class="pfbt-metric'+(invalid?' invalid':'')+'"><label for="pfbt-'+m[0]+'">'+m[1]+'</label><div class="pfbt-metric-input">'+(currency?'<span aria-hidden="true">$</span>':'')+'<input type="text" inputmode="'+(m[0]==="Lot_Total_Residential"?'numeric':'decimal')+'" id="pfbt-'+m[0]+'" data-metric="'+m[0]+'" data-metric-phase="'+p.phase+'" aria-label="'+label+'" aria-invalid="'+invalid+'" value="'+esc(value)+'"'+(s.busy||s.sent||s.uncertain?' disabled':'')+'></div></div>';}).join("")+'</div>'+matrix(s,p)+'<div class="pfbt-phase-total"><span>'+p.writes.length+' Budget items</span><b>Phase total <strong>'+dollars(p.total)+'</strong></b></div></section>';
    });
    if(plan.outliers.length)body+='<details class="pfbt-outliers"><summary>Not Migrated · '+plan.outliers.length+'</summary><div class="pfbt-table-wrap"><table><thead><tr><th>Item</th><th>Amount</th><th>Reason</th></tr></thead><tbody>'+plan.outliers.map(function(o){return '<tr><td>'+esc(o.code)+' — '+esc(o.source)+(o.notes?'<small>'+esc(o.notes)+'</small>':'')+'</td><td>'+dollars(o.amount)+'</td><td>'+esc(o.reason)+(o.phase?'<small>Phase '+o.phase+'</small>':'')+'</td></tr>';}).join("")+'</tbody></table></div></details>';
  }
  modal.querySelector(".pfbt-preview").innerHTML=body;
  modal.querySelector(".pfbt-summary").textContent=s.sent?"Verified · "+s.sent:plan?dollars(plan.total)+" · "+plan.phases.length+" Budgets":"";
  modal.querySelector("[data-send]").disabled=s.busy||s.sent||s.uncertain||!s.api.canSend()||!s.ready||(!s.token&&!s.dirty)||unsupportedEdits(s)||!plan||!plan.canSend;
  modal.querySelector("[data-refresh]").disabled=s.busy||!s.projectId||s.sent||s.uncertain;
  modal.querySelectorAll("[data-close]").forEach(function(b){b.disabled=s.busy;});
  modal.querySelectorAll("[data-metric]").forEach(function(input){var f=input.getAttribute("data-metric");if(f!==field)input.value=formatMetric(input.value,f);input.addEventListener("blur",function(){input.value=formatMetric(input.value,f);});input.addEventListener("input",function(){if(s.busy||s.sent||s.uncertain)return;var p=input.getAttribute("data-metric-phase");(s.edits[p]||(s.edits[p]={}))[f]=ungroup(input.value);s.dirty=true;s.token="";s.plan=root.PFBudgetTransfer.build(s.ctx,s.mapping,s.edits,s.notes);render();showPlanStatus(s);});});
  modal.querySelectorAll("[data-reset]").forEach(function(button){button.addEventListener("click",function(){delete s.edits[button.getAttribute("data-reset")];s.dirty=true;s.token="";s.plan=root.PFBudgetTransfer.build(s.ctx,s.mapping,s.edits,s.notes);render();showPlanStatus(s);});});
  modal.querySelectorAll("[data-category]").forEach(function(button){button.addEventListener("click",function(){var key=button.getAttribute("data-category");s.collapsed[key]=!s.collapsed[key];render();modal.querySelector('[data-category="'+key+'"]').focus({preventScroll:true});});});
  modal.querySelectorAll("[data-note]").forEach(function(button){button.addEventListener("click",function(){s.openNote=button.getAttribute("data-note");render();modal.querySelector("[data-note-edit]").focus();});});
  modal.querySelectorAll("[data-note-edit]").forEach(function(input){input.addEventListener("input",function(){if(s.busy||s.sent||s.uncertain)return;(s.notes[s.activePhase]||(s.notes[s.activePhase]={}))[input.getAttribute("data-note-edit")]=input.value;rebuild(s);render();showPlanStatus(s);});});
  modal.querySelectorAll("[data-note-reset]").forEach(function(button){button.addEventListener("click",function(){if(s.notes[s.activePhase])delete s.notes[s.activePhase][button.getAttribute("data-note-reset")];rebuild(s);render();showPlanStatus(s);modal.querySelector("[data-note-edit]").focus({preventScroll:true});});});
  modal.querySelectorAll("[data-note-done]").forEach(function(button){button.addEventListener("click",function(){var key=button.getAttribute("data-note-done");s.openNote="";render();modal.querySelector('[data-note="'+key+'"]').focus({preventScroll:true});});});
  modal.querySelectorAll("[data-phase-tab]").forEach(function(b){
    function select(){s.activePhase=Number(b.getAttribute("data-phase-tab"));render();modal.querySelector("#pfbt-tab-"+s.activePhase).focus();}
    b.addEventListener("click",select);
    b.addEventListener("keydown",function(e){var tabs=plan.phases,index=tabs.findIndex(function(p){return p.phase===s.activePhase;});if(["ArrowLeft","ArrowRight","Home","End"].indexOf(e.key)<0)return;e.preventDefault();if(e.key==="Home")index=0;else if(e.key==="End")index=tabs.length-1;else index=(index+(e.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length;s.activePhase=tabs[index].phase;render();modal.querySelector("#pfbt-tab-"+s.activePhase).focus();});
  });
  modal.querySelectorAll(".pfbt-picker").forEach(function(d){
    d.addEventListener("toggle",function(){if(d.open){modal.querySelectorAll(".pfbt-picker[open]").forEach(function(other){if(other!==d)other.open=false;});d.querySelector("input").focus();}});
    d.querySelector("input").addEventListener("input",function(e){var q=e.target.value.trim().toLowerCase();d.querySelectorAll("[data-choice]").forEach(function(b){b.hidden=b.textContent.toLowerCase().indexOf(q)<0;});});
    d.querySelectorAll("[data-choice]").forEach(function(b){b.addEventListener("click",function(){if(s.busy||s.sent||s.uncertain)return;var key=d.getAttribute("data-picker"),value=b.getAttribute("data-choice");d.open=false;s.token="";if(key==="project"){s.projectId=value;s.activePhase=1;s.mapping={};s.automatic={};s.edits={};s.notes={};s.collapsed={};s.openNote="";s.dirty=false;s.plan=null;s.ctx=null;loadProject(s);}else{s.mapping[key]=value;delete s.notes[key];s.openNote="";refresh(s);} });});
  });
  modal.querySelector(".pfbt-body").scrollTop=bodyScroll;
  var newTable=modal.querySelector(".pfbt-phase .pfbt-table-wrap");if(newTable)newTable.scrollTop=tableScroll;
  if(field||noteField){var target=modal.querySelector(field?'[data-metric="'+field+'"]':'[data-note-edit="'+noteField+'"]');if(target&&!target.disabled){target.value=focusValue;target.focus({preventScroll:true});target.setSelectionRange(start,end);}}
}
function showPlanStatus(s){status(s.plan.errors.length?s.plan.errors.join("\n"):unsupportedEdits(s)?"Budget edits require the Creator transfer update.":s.dirty?"Preview updated. Values will be verified before sending.":s.ready?"Ready to send to empty Budgets.":"Creator transfer update required to send.",s.plan.errors.length>0);}
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
function close(){if(!current||current.busy)return;var focus=current.focus;current=null;modal.hidden=true;if(focus&&focus.isConnected)focus.focus();}
async function send(){
  var s=current;if(!s||s.busy||s.uncertain||s.sent||!s.api.canSend()||!s.plan||!s.plan.canSend||unsupportedEdits(s))return;
  if(s.dirty)await refresh(s);
  if(current!==s||s.busy||!s.token||!s.plan.canSend)return;
  s.busy=true;render();status("Sending and verifying Budget costs…",false);
  try{var result=await s.api.apply(s.projectId,s.mapping,s.token,s.edits,s.notes);if(current!==s)return;s.sent=(result.completed||[]).length+" Budgets";s.token="";status(result.message||"Budget costs verified.",false);if(s.api.success)s.api.success(s.projectId);}
  catch(e){if(current===s){s.token="";s.uncertain=true;status((e.message||"Transfer result is unknown.")+"\nInspect the target Budgets before reopening this transfer.",true);}}
  finally{if(current===s){s.busy=false;render();}}
}
async function open(api){
  if(!api||typeof api.canSend!=="function"||!api.canSend())return;
  if(current&&current.busy)return;
  if(!modal){modal=document.createElement("div");modal.className="pfbt";modal.hidden=true;modal.innerHTML='<section class="pfbt-box" role="dialog" aria-modal="true" aria-labelledby="pfbt-title" tabindex="-1"><header class="pfbt-head"><div><h2 id="pfbt-title">Send Costs to Budgets</h2><p></p></div><button type="button" data-close aria-label="Close transfer"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header><div class="pfbt-body"><div class="pfbt-project"></div><div class="pfbt-status" role="status" aria-live="polite"></div><div class="pfbt-preview"></div></div><footer class="pfbt-foot"><b class="pfbt-summary"></b><div class="pfbt-actions"><button class="btn sm" type="button" data-refresh>Refresh preview</button><button class="btn sm" type="button" data-close>Close</button><button class="btn sm primary" type="button" data-send>Send Costs to Budgets</button></div></footer></section>';document.body.appendChild(modal);modal.querySelectorAll("[data-close]").forEach(function(b){b.addEventListener("click",close);});modal.querySelector("[data-send]").addEventListener("click",send);modal.querySelector("[data-refresh]").addEventListener("click",function(){refresh(current);});
    modal.addEventListener("keydown",function(e){if(e.key==="Escape"){e.preventDefault();e.stopPropagation();var d=modal.querySelector("details[open]");if(d){d.open=false;d.querySelector("summary").focus();}else if(current.openNote){var note=current.openNote;current.openNote="";render();modal.querySelector('[data-note="'+note+'"]').focus();}else close();}if(e.key==="Tab"){var f=Array.from(modal.querySelectorAll("button:not(:disabled), summary, input:not(:disabled), textarea:not(:disabled)")).filter(function(x){return x.getClientRects().length>0&&!x.hidden&&x.tabIndex>=0;}),first=f[0],last=f[f.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===modal.querySelector(".pfbt-box"))){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
  }
  var s={api:api,focus:document.activeElement,projects:[],projectId:"",mapping:{},automatic:{},edits:{},notes:{},collapsed:{},openNote:"",dirty:false,version:0,ctx:null,plan:null,token:"",busy:true,ready:false,activePhase:1};current=s;modal.hidden=false;modal.querySelector(".pfbt-head p").textContent=api.name;render();status("Loading Projects…",false);modal.querySelector(".pfbt-box").focus();
  try{var result=await Promise.all([api.getProjects(),api.capabilities()]);if(current!==s)return;s.projects=result[0];s.version=Number(result[1])||0;s.ready=s.version>=1;s.busy=false;render();var linked=s.projects.filter(function(p){return String(p.Proforma&&p.Proforma.ID||p.Proforma||"")===api.id;});if(linked.length===1){s.projectId=String(linked[0].ID);await loadProject(s);}else status(s.projects.length?"Choose a Project.":"No Projects available.",!s.projects.length);}catch(e){if(current===s){s.busy=false;render();status(e.message||"Could not load Projects.",true);}}
}
root.PFBudgetTransferUI={open:open};
})(window);
