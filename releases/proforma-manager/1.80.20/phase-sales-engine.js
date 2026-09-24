/* Phase-level lot sales. Version 2 is opt-in; callers must not run this for legacy records. */
(function(root){
  "use strict";
  function finite(v, label){
    if(v===null || v===undefined || String(v).trim()==="") throw Error(label+" is required.");
    var n=Number(String(v).replace(/,/g,""));
    if(!Number.isFinite(n)) throw Error(label+" must be a number.");
    return n;
  }
  function integer(v,label,min){
    var n=finite(v,label);
    if(!Number.isInteger(n) || n<min) throw Error(label+" must be a whole number of at least "+min+".");
    return n;
  }
  function monthOf(value){
    if(value && typeof value==="object" && Number.isInteger(value.y) && Number.isInteger(value.m) && value.m>=1 && value.m<=12)
      return {y:value.y,m:value.m};
    var s=String(value||"").trim(), a=s.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/);
    if(a) return +a[2]>=1 && +a[2]<=12 ? {y:+a[1],m:+a[2]} : null;
    a=s.match(/^(\d{1,2})\/\d{1,2}\/(\d{4})$/);
    if(a) return +a[1]>=1 && +a[1]<=12 ? {y:+a[3],m:+a[1]} : null;
    a=s.match(/^\d{1,2}-([A-Za-z]{3})-(\d{4})$/);
    if(a){var j=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(a[1].toLowerCase());return j<0?null:{y:+a[2],m:j+1};}
    return null;
  }
  function addMonth(d, offset){
    var n=d.y*12+d.m-1+offset;
    return {y:Math.floor(n/12),m:n%12+1};
  }
  function monthDiff(a,b){return (a.y-b.y)*12+a.m-b.m;}
  /* Match Deluge round(0), including a negative half-dollar markup. */
  function roundDollar(v){return Math.sign(v)*Math.floor(Math.abs(v)+0.5+Number.EPSILON);}
  function allocatedLots(total,count){
    total=integer(total,"Project lots",1);
    count=integer(count,"Phase count",1);
    if(count>total) throw Error("There cannot be more active phases than lots.");
    /* Legacy default: round earlier phases up, with the last phase taking the
       remainder. Reserve one lot per remaining phase for sparse projects. */
    var each=Math.ceil(total/count), remaining=total, out=[];
    for(var i=0;i<count;i++){
      var lots=i===count-1 ? remaining : Math.min(each,remaining-(count-i-1));
      out.push(lots);
      remaining-=lots;
    }
    return out;
  }
  /* Scenario-only adjustment. Never use this to rewrite a user's saved allocations. */
  function scenarioLots(phases,total){
    total=integer(total,"Scenario project lots",1);
    if(!Array.isArray(phases) || !phases.length) throw Error("Scenario phases are required.");
    if(total<phases.length) throw Error("Scenario lots cannot be fewer than active phases.");
    var weights=phases.map(function(p,i){return integer(p.Total_Lots,"Phase "+(i+1)+" lots",1);});
    var sum=weights.reduce(function(a,b){return a+b;},0);
    var remaining=total-phases.length;
    var shares=weights.map(function(w){return remaining*w/sum;});
    var lots=shares.map(function(s){return 1+Math.floor(s);});
    var extra=total-lots.reduce(function(a,b){return a+b;},0);
    var rank=shares.map(function(s,i){return {i:i,f:s-Math.floor(s)};})
      .sort(function(a,b){return b.f-a.f || a.i-b.i;});
    for(var j=0;j<extra;j++) lots[rank[j].i]++;
    return phases.map(function(p,i){
      var oldInitial=integer(p.Initial_Take_Lots,"Phase "+(i+1)+" initial take",1);
      var initial=Math.max(1,Math.min(lots[i],Math.round(lots[i]*oldInitial/weights[i])));
      return Object.assign({},p,{Total_Lots:String(lots[i]),Initial_Take_Lots:String(initial)});
    });
  }
  function plan(input){
    input=input||{};
    var total=integer(input.totalLots,"Project lots",1), count=integer(input.phaseCount,"Phase count",1);
    if(count>total) throw Error("There cannot be more active phases than lots.");
    var engDelay=integer(input.engineeringDelay,"Engineering delay",0);
    var engLen=integer(input.engineeringLength,"Engineering length",1);
    var constDelay=integer(input.constructionDelay,"Construction delay",0);
    var constLen=integer(input.constructionLength,"Construction length",1);
    var purchase=monthOf(input.purchaseDate);
    if(!purchase) throw Error("A valid purchase date is required.");
    var baseUnit=finite(input.baseUnitPrice,"Base unit price");
    if(baseUnit<0) throw Error("Base unit price cannot be negative.");
    var settings=input.phases||[];
    if(settings.length!==count) throw Error("A saved input row is required for each phase.");
    var phaseRows=[],events=[],allocated=0,previousFinal=0;
    for(var i=0;i<count;i++){
      var raw=settings[i]||{}, n=i+1, label="Phase "+n;
      var phaseNo=integer(raw.Phase==null?n:raw.Phase,label+" number",1);
      if(phaseNo!==n) throw Error("Phase rows must be unique and ordered 1 through "+count+".");
      var lots=integer(raw.Total_Lots,label+" lots",1);
      allocated+=lots;
      var initial=integer(raw.Initial_Take_Lots,label+" initial take",1);
      if(initial>lots) throw Error(label+" initial take exceeds its lot allocation.");
      var delay=integer(raw.Initial_Delay_Months,label+" initial delay",0);
      var remains=lots-initial;
      var firstDelay=remains ? integer(raw.First_Recurring_Delay_Months,label+" first recurring delay",1) : 0;
      var perTake=remains ? integer(raw.Lots_Per_Take,label+" lots per take",1) : 0;
      var frequency=String(raw.Take_Frequency||"Monthly");
      if(frequency!=="Monthly" && frequency!=="Quarterly") throw Error(label+" frequency must be Monthly or Quarterly.");
      var enabled=raw.Escalator_Enabled===true || String(raw.Escalator_Enabled).toLowerCase()==="true";
      var rate=raw.Annual_Escalator_Pct==null || raw.Annual_Escalator_Pct==="" ? 0 : finite(raw.Annual_Escalator_Pct,label+" annual escalator");
      if(rate<0) throw Error(label+" annual escalator cannot be negative.");
      var markup=raw.Additional_Markup_Pct==null || raw.Additional_Markup_Pct==="" ? 0 : finite(raw.Additional_Markup_Pct,label+" additional markup");
      var escStart=monthOf(raw.Esc_Start_Date);
      if(enabled && rate>0 && !escStart) throw Error(label+" needs an Esc Start Date for its enabled rate.");
      var engStart,engEnd,constStart,constEnd;
      if(i===0){
        engStart=engDelay+1;engEnd=engStart+engLen-1;
        constStart=engEnd+constDelay+1;constEnd=constStart+constLen-1;
      }else{
        constEnd=previousFinal;constStart=constEnd-constLen+1;
        engEnd=constStart-constDelay-1;engStart=engEnd-engLen+1;
        if(engStart<1) throw Error(label+" engineering starts before project month 1.");
      }
      var anchor=constEnd+1+delay,month=anchor,takeNo=0,remaining=lots;
      function emit(quantity){
        if(month>600) throw Error(label+" has a sale after the 600-month limit.");
        var saleDate=addMonth(purchase,month-1);
        var elapsed=enabled && rate>0 && escStart ? Math.max(0,monthDiff(saleDate,escStart)) : 0;
        var basis=quantity*baseUnit;
        var base=roundDollar(basis),extra=roundDollar(basis*markup/100);
        var escalator=roundDollar(basis*rate*elapsed/1200);
        events.push({Phase:n,Month1:month,Date:saleDate,Take:++takeNo,Lots_Sold:quantity,
          Base_Lot_Sales:base,Additional_Markup_Income:extra,Escalator_Interest_Accrued:escalator,
          Escalator_Percentage:enabled?rate:0,Escalator_Elapsed_Months:elapsed,
          Escalator_Applied_Pct:enabled?rate*elapsed/12:0,
          Finished_Lot_Sales:base+extra+escalator});
        remaining-=quantity;
      }
      emit(initial);
      if(remaining>0){
        month=anchor+firstDelay;
        while(remaining>0){emit(Math.min(perTake,remaining));month+=frequency==="Quarterly"?3:1;}
      }
      var last=events[events.length-1].Month1;
      phaseRows.push({ID:raw.ID||null,Phase:n,Total_Lots:lots,
        Initial_Take_Lots:initial,Initial_Delay_Months:delay,
        First_Recurring_Delay_Months:firstDelay,Lots_Per_Take:perTake,Take_Frequency:frequency,
        Escalator_Enabled:enabled,Annual_Escalator_Pct:rate,Esc_Start_Date:raw.Esc_Start_Date||"",
        Additional_Markup_Pct:markup,Eng_Start_Month:engStart,Eng_End_Month:engEnd,
        Const_Start_Month:constStart,Const_End_Month:constEnd,
        Lot_Sale_Start_Month:anchor,Lot_Sale_End_Month:last,Lot_Closing_Length:last-anchor+1,
        Take_Count:takeNo});
      previousFinal=last;
    }
    if(allocated!==total) throw Error("Phase allocations are "+(allocated>total?allocated-total+" over":total-allocated+" under")+" project lots.");
    var first=Math.min.apply(null,events.map(function(e){return e.Month1;}));
    var final=Math.max.apply(null,events.map(function(e){return e.Month1;}));
    return {phases:phaseRows,events:events,summary:{totalLots:total,allocatedLots:allocated,
      firstSaleMonth:first,finalSaleMonth:final,takeCount:events.length,
      baseSales:events.reduce(function(s,e){return s+e.Base_Lot_Sales;},0),
      markupIncome:events.reduce(function(s,e){return s+e.Additional_Markup_Income;},0),
      escalatorIncome:events.reduce(function(s,e){return s+e.Escalator_Interest_Accrued;},0),
      finishedLotSales:events.reduce(function(s,e){return s+e.Finished_Lot_Sales;},0)}};
  }
  var api={plan:plan,allocatedLots:allocatedLots,scenarioLots:scenarioLots,monthOf:monthOf,addMonth:addMonth,monthDiff:monthDiff};
  root.PhaseSalesEngine=api;
  if(typeof module!=="undefined" && module.exports) module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
