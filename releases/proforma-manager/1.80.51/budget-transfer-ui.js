(function(root){
"use strict";
var current=null, modal=null;
var esc=function(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});};
var number=function(n){return Number(n||0).toLocaleString("en-US",{maximumFractionDigits:2});};
var dollars=function(n){return (Number(n)<0?"-$":"$")+number(Math.abs(Number(n)||0));};
var rateDollars=function(n){return "$"+Number(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});};
var chevron='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
function picker(label,key,selected,options){
  var chosen=options.find(function(o){return String(o.id)===String(selected);});
  return '<details class="pfbt-picker" data-picker="'+esc(key)+'"><summary aria-label="'+esc(label)+'">'+esc(chosen?chosen.label:label)+chevron+'</summary><div class="pfbt-options"><input aria-label="Search '+esc(label.toLowerCase())+'" placeholder="Search…"><div class="pfbt-option-list" role="listbox" aria-label="'+esc(label)+'">'+options.map(function(o){return '<button type="button" role="option" aria-selected="'+(String(o.id)===String(selected))+'" data-choice="'+esc(o.id)+'">'+esc(o.label)+'</button>';}).join("")+'</div></div></details>';
}
function status(text,error){modal.querySelector(".pfbt-status").textContent=text;modal.querySelector(".pfbt-status").classList.toggle("error",!!error);}
function render(){
  if(!current)return;
  var s=current, plan=s.plan;
  modal.classList.toggle("busy",s.busy);
  modal.querySelector(".pfbt-project").innerHTML='<b>Project</b>'+picker("Choose Project","project",s.projectId,s.projects.map(function(p){return {id:String(p.ID),label:p.Project_Name||String(p.ID)};}));
  var body="";
  if(plan){
    var options=(s.ctx.subdivisions||[]).map(function(sub){return {id:String(sub.ID),label:sub.Subdivision_Name||String(sub.ID)};});
    if(!plan.phases.some(function(p){return p.phase===s.activePhase;}))s.activePhase=plan.phases.length?plan.phases[0].phase:1;
    body+='<div class="pfbt-tabs" role="tablist" aria-label="Budget phases">'+plan.phases.map(function(p){return '<button type="button" role="tab" aria-selected="'+(p.phase===s.activePhase)+'" aria-controls="pfbt-phase-panel" tabindex="'+(p.phase===s.activePhase?0:-1)+'" id="pfbt-tab-'+p.phase+'" data-phase-tab="'+p.phase+'"'+(p.errors.length?' class="has-errors"':'')+'>Phase '+p.phase+'<small>'+number(p.header.Lot_Total_Residential)+' lots'+(p.errors.length?' · Needs attention':'')+'</small></button>';}).join("")+'</div>';
    plan.phases.filter(function(p){return p.phase===s.activePhase;}).forEach(function(p){
      body+='<section class="pfbt-phase" id="pfbt-phase-panel" role="tabpanel" aria-labelledby="pfbt-tab-'+p.phase+'"><div class="pfbt-phase-head"><h3>Phase '+p.phase+'</h3>'+picker("Subdivision for Phase "+p.phase,String(p.phase),s.mapping[p.phase],options)+'</div><div class="pfbt-budget">'+esc(p.budget||"No Budget selected")+'</div><div class="pfbt-metrics">'+[["Lots",number(p.header.Lot_Total_Residential)],["Acres",number(p.header.Acres)],["Equiv. LF",number(p.header.Equiv_LF_of_Street)],["Lot Price",dollars(p.header.Lot_Price)],["Land Cost",dollars(p.header.Land_Cost)]].map(function(m){return '<div class="pfbt-metric"><label>'+m[0]+'</label><strong>'+m[1]+'</strong></div>';}).join("")+'</div><div class="pfbt-table-wrap"><table><thead><tr><th>PF Cost</th><th>Budget Item</th><th>Pricing</th><th>Preliminary</th></tr></thead><tbody>'+p.lines.map(function(l){return '<tr><td>'+esc(l.source)+(l.notes?'<small>'+esc(l.notes)+'</small>':'')+'</td><td>'+esc(l.code)+' — '+esc(l.target)+'</td><td>'+esc(l.unit?rateDollars(l.rate)+" / "+l.unit:"Allocated total")+'</td><td>'+dollars(l.amount)+'</td></tr>';}).join("")+'<tr class="pfbt-total"><td colspan="3">Phase total</td><td>'+dollars(p.total)+'</td></tr></tbody></table></div></section>';
    });
    if(plan.outliers.length)body+='<details class="pfbt-outliers"><summary>Not Migrated · '+plan.outliers.length+'</summary><div class="pfbt-table-wrap"><table><thead><tr><th>PF Cost</th><th>Amount</th><th>Reason</th></tr></thead><tbody>'+plan.outliers.map(function(o){return '<tr><td>'+esc(o.code)+' — '+esc(o.source)+(o.notes?'<small>'+esc(o.notes)+'</small>':'')+'</td><td>'+dollars(o.amount)+'</td><td>'+esc(o.reason)+(o.phase?'<small>Phase '+o.phase+'</small>':'')+'</td></tr>';}).join("")+'</tbody></table></div></details>';
  }
  modal.querySelector(".pfbt-preview").innerHTML=body;
  modal.querySelector(".pfbt-summary").textContent=s.sent?"Verified · "+s.sent:plan?dollars(plan.total)+" · "+plan.phases.length+" Budgets":"";
  modal.querySelector("[data-send]").disabled=s.busy||s.sent||s.uncertain||!s.api.canSend()||!s.ready||!s.token||!plan||!plan.canSend;
  modal.querySelector("[data-refresh]").disabled=s.busy||!s.projectId||s.sent||s.uncertain;
  modal.querySelectorAll("[data-close]").forEach(function(b){b.disabled=s.busy;});
  modal.querySelectorAll("[data-phase-tab]").forEach(function(b){
    function select(){s.activePhase=Number(b.getAttribute("data-phase-tab"));render();modal.querySelector("#pfbt-tab-"+s.activePhase).focus();}
    b.addEventListener("click",select);
    b.addEventListener("keydown",function(e){var tabs=plan.phases,index=tabs.findIndex(function(p){return p.phase===s.activePhase;});if(["ArrowLeft","ArrowRight","Home","End"].indexOf(e.key)<0)return;e.preventDefault();if(e.key==="Home")index=0;else if(e.key==="End")index=tabs.length-1;else index=(index+(e.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length;s.activePhase=tabs[index].phase;render();modal.querySelector("#pfbt-tab-"+s.activePhase).focus();});
  });
  modal.querySelectorAll(".pfbt-picker").forEach(function(d){
    d.addEventListener("toggle",function(){if(d.open){modal.querySelectorAll(".pfbt-picker[open]").forEach(function(other){if(other!==d)other.open=false;});d.querySelector("input").focus();}});
    d.querySelector("input").addEventListener("input",function(e){var q=e.target.value.toLowerCase();d.querySelectorAll("[data-choice]").forEach(function(b){b.hidden=b.textContent.toLowerCase().indexOf(q)<0;});});
    d.querySelectorAll("[data-choice]").forEach(function(b){b.addEventListener("click",function(){if(s.busy||s.sent||s.uncertain)return;var key=d.getAttribute("data-picker"),value=b.getAttribute("data-choice");d.open=false;s.token="";if(key==="project"){s.projectId=value;s.activePhase=1;s.mapping={};s.plan=null;s.ctx=null;loadProject(s);}else{s.mapping[key]=value;refresh(s);} });});
  });
}
async function refresh(s){
  if(current!==s||s.busy||!s.ctx)return;
  s.busy=true;s.token="";render();status("Checking Budgets…",false);
  try{
    s.plan=root.PFBudgetTransfer.build(s.ctx,s.mapping);
    if(s.ready){var result=await s.api.preview(s.projectId,s.mapping);if(current!==s)return;s.plan=result.plan;s.token=result.token;}
    if(current!==s)return;
    status(s.plan.errors.length?s.plan.errors.join("\n"):s.ready?"Ready to send to empty Budgets.":"Creator transfer update required to send.",s.plan.errors.length>0);
  }catch(e){if(current===s){s.token="";status(e.message||"Could not verify the preview.",true);}}
  finally{if(current===s){s.busy=false;render();}}
}
async function loadProject(s){
  s.busy=true;render();status("Loading Project subdivisions…",false);
  try{
    s.ctx=await s.api.loadContext(s.projectId);if(current!==s)return;
    // Suggest only unique numeric phase labels; the user can choose any one-to-one assignment.
    (s.ctx.subdivisions||[]).forEach(function(sub){var p=Number(sub.Phase);if(Number.isInteger(p)&&p>0&&p<=Number(s.ctx.pf.Phases)&&s.ctx.subdivisions.filter(function(x){return Number(x.Phase)===p;}).length===1)s.mapping[p]=String(sub.ID);});
    s.busy=false;await refresh(s);
  }catch(e){if(current===s){s.busy=false;s.ctx=null;render();status(e.message||"Could not load the Project.",true);}}
}
function close(){if(!current||current.busy)return;var focus=current.focus;current=null;modal.hidden=true;if(focus&&focus.isConnected)focus.focus();}
async function send(){
  var s=current;if(!s||s.busy||s.uncertain||s.sent||!s.api.canSend()||!s.plan||!s.plan.canSend||!s.token)return;
  s.busy=true;render();status("Sending and verifying Budget costs…",false);
  try{var result=await s.api.apply(s.projectId,s.mapping,s.token);if(current!==s)return;s.sent=(result.completed||[]).length+" Budgets";s.token="";status(result.message||"Budget costs verified.",false);if(s.api.success)s.api.success(s.projectId);}
  catch(e){if(current===s){s.token="";s.uncertain=true;status((e.message||"Transfer result is unknown.")+"\nInspect the target Budgets before reopening this transfer.",true);}}
  finally{if(current===s){s.busy=false;render();}}
}
async function open(api){
  if(!api||typeof api.canSend!=="function"||!api.canSend())return;
  if(current&&current.busy)return;
  if(!modal){modal=document.createElement("div");modal.className="pfbt";modal.hidden=true;modal.innerHTML='<section class="pfbt-box" role="dialog" aria-modal="true" aria-labelledby="pfbt-title" tabindex="-1"><header class="pfbt-head"><div><h2 id="pfbt-title">Send Costs to Budgets</h2><p></p></div><button type="button" data-close aria-label="Close transfer"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header><div class="pfbt-body"><div class="pfbt-project"></div><div class="pfbt-status" role="status" aria-live="polite"></div><div class="pfbt-preview"></div></div><footer class="pfbt-foot"><b class="pfbt-summary"></b><div class="pfbt-actions"><button class="btn sm" type="button" data-refresh>Refresh preview</button><button class="btn sm" type="button" data-close>Close</button><button class="btn sm primary" type="button" data-send>Send Costs to Budgets</button></div></footer></section>';document.body.appendChild(modal);modal.querySelectorAll("[data-close]").forEach(function(b){b.addEventListener("click",close);});modal.querySelector("[data-send]").addEventListener("click",send);modal.querySelector("[data-refresh]").addEventListener("click",function(){refresh(current);});
    modal.addEventListener("keydown",function(e){if(e.key==="Escape"){e.preventDefault();e.stopPropagation();var d=modal.querySelector("details[open]");if(d){d.open=false;d.querySelector("summary").focus();}else close();}if(e.key==="Tab"){var f=Array.from(modal.querySelectorAll("button:not(:disabled), summary, input")).filter(function(x){return x.getClientRects().length>0&&!x.hidden&&x.tabIndex>=0;}),first=f[0],last=f[f.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===modal.querySelector(".pfbt-box"))){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
  }
  var s={api:api,focus:document.activeElement,projects:[],projectId:"",mapping:{},ctx:null,plan:null,token:"",busy:true,ready:false,activePhase:1};current=s;modal.hidden=false;modal.querySelector(".pfbt-head p").textContent=api.name;render();status("Loading Projects…",false);modal.querySelector(".pfbt-box").focus();
  try{var result=await Promise.all([api.getProjects(),api.capabilities()]);if(current!==s)return;s.projects=result[0];s.ready=result[1];s.busy=false;render();var linked=s.projects.filter(function(p){return String(p.Proforma&&p.Proforma.ID||p.Proforma||"")===api.id;});if(linked.length===1){s.projectId=String(linked[0].ID);await loadProject(s);}else status(s.projects.length?"Choose a Project.":"No Projects available.",!s.projects.length);}catch(e){if(current===s){s.busy=false;render();status(e.message||"Could not load Projects.",true);}}
}
root.PFBudgetTransferUI={open:open};
})(window);
