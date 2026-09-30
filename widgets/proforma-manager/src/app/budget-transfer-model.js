(function(root){
"use strict";
var money=function(v){return Math.round((Number(v)+Number.EPSILON)*100)/100;};
var n=function(v){return Number(String(v==null?"":v).replace(/[$,]/g,""))||0;};
var id=function(v){return String(v&&typeof v==="object"?v.ID||"":v==null?"":v);};
var yes=function(v){return v===true||String(v).toLowerCase()==="true";};
var dept=function(r){return String(r.Department||r.Deparment||r.Dept||({1:"Development",2:"Engineering",3:"Construction"}[n(r.Dept_Code)])||"");};
function build(ctx,mapping){
  var pf=ctx.pf||{}, count=n(pf.Phases), errors=[], outliers=[], phases=[], seen=[];
  var subs=ctx.subdivisions||[], budgets=ctx.budgets||[], cats=ctx.categories||[], targets=ctx.budgetItems||[];
  var sourcePhases=ctx.phases||[], items=ctx.items||[];
  if(!Number.isInteger(count)||count<1||count>100){errors.push("PF must have between 1 and 100 phases.");count=0;}
  if(count!==subs.length)errors.push("PF has "+count+" phases; Project has "+subs.length+" subdivisions.");
  if(sourcePhases.length!==count||sourcePhases.some(function(p){return !Number.isInteger(n(p.Phase))||n(p.Phase)<1||n(p.Phase)>count;})||new Set(sourcePhases.map(function(p){return n(p.Phase);})).size!==count)errors.push("Save one Proforma Phase record for every PF phase.");
  if(sourcePhases.some(function(p){return !Number.isInteger(n(p.Total_Lots))||n(p.Total_Lots)<0;})||sourcePhases.reduce(function(s,p){return s+n(p.Total_Lots);},0)!==n(pf.Lots))errors.push("Saved Proforma Phase lot counts must total "+n(pf.Lots)+" lots.");
  function exclude(row,reason,phase){outliers.push({sourceId:id(row.ID),source:row.Item_Name||"Additional Cost",code:String(row.Cost_Code||""),amount:n(row.Add_l_Cost),unit:row.Unit||"",rate:n(row.Per_Unit),notes:row.Description||"",phase:phase||null,reason:reason});}
  for(var p=1;p<=count;p++){
    var sid=String(mapping&&mapping[p]||""), sub=subs.find(function(s){return id(s.ID)===sid;});
    var ph=sourcePhases.filter(function(s){return n(s.Phase)===p;})[0];
    var matching=budgets.filter(function(b){return id(b.Subdivision1)===sid&&!yes(b.Archived);});
    var b=matching.length===1?matching[0]:null;
    var phase={phase:p,subdivisionId:sid,subdivision:sub&&sub.Subdivision_Name||"Choose subdivision",budgetId:b?id(b.ID):"",budget:b&&b.Budget_Name||"",lines:[],writes:[],errors:[],header:{Lot_Total_Residential:n(ph&&ph.Total_Lots),Acres:money(n(pf.Total_Acres)/count),Equiv_LF_of_Street:money(n(pf.Total_Street_LF)/count),Lot_Price:money(n(pf.Lot_Size_Ft)*n(pf.Sale_Price_FF)),Land_Cost:n(pf.Land_Cost_Acre)}};
    phases.push(phase);
    if(!sub){phase.errors.push("Choose a subdivision for Phase "+p+".");continue;}
    if(seen.indexOf(sid)>=0)phase.errors.push("Each subdivision must be used once.");
    seen.push(sid);
    if(!b){phase.errors.push(matching.length?"More than one active Budget exists for this subdivision.":"An existing Budget is required.");continue;}
    if(b._canEdit===false)phase.errors.push("Budget edit access is required.");
    if((ctx.modifications||[]).some(function(m){return id(m.Budget)===id(b.ID)&&(n(m.Amount)!==0||(m.Status&&m.Status!=="Draft"));}))phase.errors.push("Budget has existing modifications.");
    var its=targets.filter(function(i){return id(i.Budget)===id(b.ID)&&!yes(i.Template_Item);});
    var cs=cats.filter(function(c){return id(c.Budget)===id(b.ID)&&!yes(c.Template_Item);});
    if(yes(b.Lock_Prelim_Budget)||yes(b.Lock_Final_Budget)||[b.Development_Budget_Approval_Status,b.Const_Budget_Approval_Status].some(function(s){return s&&s!=="Not Sent";})||cs.some(function(c){return yes(c.Lock_Category);})||(ctx.approvals||[]).some(function(a){return id(a.Budget)===id(b.ID)&&a.Status&&a.Status!=="Not Sent";}))phase.errors.push("Budget is locked or has started approvals.");
    if(["Prelim_Budget_Grand_Total","Unapproved_Final_Budget_Grand_Total","Budget_Grand_Total","Const_Cost_to_Date"].some(function(f){return n(b[f])!==0;})||cs.some(function(c){return ["Prelim_Budget_Total","Unapproved_Final_Budget_Total","Budget_Total","Actual_Total","Add_l_Cost_Total"].some(function(f){return n(c[f])!==0;});})||its.some(function(i){return ["Prelim_Budget_Ttl","Unapproved_Final_Budget_Ttl","Budget_Ttl","Add_l_Cost","PROJ_Actual","HCSS_Actuals","Cost_to_Complete","Per_Unit"].some(function(f){return n(i[f])!==0;})||!!i.Unit;}))phase.errors.push("Only empty Budgets can receive costs.");
    function mapLine(src,code,department,amount,unit,rate,notes,base){
      var found=its.filter(function(i){return n(i.Cost_Code)===n(code)&&dept(i)===department;});
      var target=found.length===1?found[0]:null;
      var cat=target&&cs.find(function(c){return id(c.ID)===id(target.Budget_Category);});
      if(!target||!cat){var why=found.length>1?"Multiple matching Budget Item lines.":"Matching Budget Item/category is missing.";if(base)phase.errors.push(code+" â€” "+why);else exclude(src,why,p);return;}
      var credit=String(code).charAt(0)==="8"||String(target.Category||"").toLowerCase().indexOf("reimbursement")>=0;
      amount=credit?-Math.abs(amount):amount;
      var existing=phase.writes.find(function(w){return w.itemId===id(target.ID);});
      if(existing&&(unit||existing.unit)){exclude(src,"Per-unit and other costs share this Budget line.",p);return;}
      if(unit&&!(n({Lot:phase.header.Lot_Total_Residential,Acre:phase.header.Acres,LF:phase.header.Equiv_LF_of_Street}[unit])>0)){exclude(src,"Target Budget has no "+unit+" quantity.",p);return;}
      var merged=String(target.Description||"");
      if(notes&&merged.indexOf(notes)<0)merged+=(merged?"\n\n":"")+notes;
      if(existing){existing.amount=money(existing.amount+amount);if(notes&&existing.notes.indexOf(notes)<0)existing.notes+=(existing.notes?"\n\n":"")+notes;}
      else phase.writes.push({itemId:id(target.ID),categoryId:id(cat.ID),amount:money(amount),unit:unit||"",rate:rate||0,notes:merged});
      phase.lines.push({source:src.Item_Name,code:String(code),target:target.Item_Name,amount:money(amount),unit:unit||"",rate:rate||0,notes:notes||""});
    }
    mapLine({Item_Name:"Entitlement & Eng"},"2101","Engineering",money(n(pf.Engineering_Cost_Lot)*n(pf.Lots)/count),"",0,"",true);
    mapLine({Item_Name:"Construction Base"},"3100","Construction",money(n(pf.Const_Cost_FF)*n(pf.Total_Street_LF)/count),"",0,"",true);
    items.forEach(function(row){
      if(yes(row.Template_Item)||(!n(row.Add_l_Cost)&&!n(row.Per_Unit)&&!row.Unit))return;
      var impact=String(row.Category||"").trim().toLowerCase()==="reimbursements"&&String(row.Item_Name||"").trim().toLowerCase().startsWith("impact fees");
      var app=impact?"Across Phases":String(row.Cost_Application||""), sp=impact?1:n(row.Start_Phase), ep=impact?count:n(row.End_Phase);
      if(["Across Phases","Engineering End","Construction Start","Construction End"].indexOf(app)<0){if(p===1)exclude(row,app==="Specific Months"?"Specific Months has no unambiguous phase allocation.":"Cost Application has no unambiguous phase allocation.");return;}
      if(!Number.isInteger(sp)||!Number.isInteger(ep)||sp<1||ep<sp||ep>count){if(p===1)exclude(row,"Phase range is missing or invalid.");return;}
      if(p<sp||p>ep)return;
      var unit=String(row.Unit||""), rate=n(row.Per_Unit);
      if((unit||rate)&&(["Lot","Acre","LF"].indexOf(unit)<0||rate<=0)){exclude(row,"Per-unit pricing is incomplete.",p);return;}
      var qty=n({Lot:phase.header.Lot_Total_Residential,Acre:phase.header.Acres,LF:phase.header.Equiv_LF_of_Street}[unit]);
      mapLine(row,row.Cost_Code,dept(row),money(unit?rate*qty:n(row.Add_l_Cost)/(ep-sp+1)),unit,rate,row.Description||"",false);
    });
  }
  phases.forEach(function(p){p.errors.forEach(function(e){errors.push("Phase "+p.phase+": "+e);});p.total=money(p.writes.reduce(function(s,w){return s+w.amount;},0));});
  return {phases:phases,errors:errors,outliers:outliers,canSend:errors.length===0,total:money(phases.reduce(function(s,p){return s+p.total;},0))};
}
root.PFBudgetTransfer={build:build};
})(typeof window!=="undefined"?window:globalThis);
