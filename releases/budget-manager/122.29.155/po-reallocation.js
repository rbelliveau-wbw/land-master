/* Exact, read-only planning for one signed PO modification per cost code. */
(function(root){
  'use strict';
  var CONTRACT='po-reallocation-v1',MAX=999999999999999n;
  var ELEMENTS=[{id:'1',label:'Labor'},{id:'2',label:'Materials'},{id:'3',label:'Equipment'},{id:'4',label:'Subcontractor'},{id:'5',label:'Other'}];
  function fail(message){throw new Error(message);}
  function id(value){if(typeof value!=='string'||!/^\d+$/.test(value))fail('Budget Item must be an exact Creator ID string.');return value;}
  function cents(value,label){if(typeof value!=='string'||! /^-?\d+$/.test(value))fail((label||'Component balance')+' is unavailable. Refresh the budget.');return BigInt(value);}
  function amount(value,label){
    if(typeof value!=='string'||! /^-?\d+(?:\.\d{1,2})?$/.test(value))fail((label||'Amount')+' must be an exact amount with up to two decimal places.');
    var negative=value[0]==='-',parts=(negative?value.slice(1):value).split('.');
    var result=BigInt(parts[0])*100n+BigInt((parts[1]||'').padEnd(2,'0'));
    if(result>MAX)fail((label||'Amount')+' exceeds supported currency capacity.');
    return negative?-result:result;
  }
  function money(value){var sign=value<0n?'-':'',absolute=value<0n?-value:value;return sign+String(absolute/100n)+'.'+String(absolute%100n).padStart(2,'0');}
  function max(a,b){return a>b?a:b;}
  function min(a,b){return a<b?a:b;}
  function zeroTotals(){return {increase:'0.00',decrease:'0.00',net:'0.00',gross:'0.00'};}
  function selected(opts){
    if(!opts||!Array.isArray(opts.lines)||!opts.lines.length)fail('Choose at least one PO budget item.');
    var groups=new Map();
    opts.lines.forEach(function(line){
      if(!line)fail('A PO line is unavailable.');
      var itemId=id(line.budgetItemId);
      if(typeof line.costElement!=='string'||! /^[1-5]$/.test(line.costElement))fail('Choose a cost element for every PO line.');
      var value=amount(line.finalAmount,'PO amount');if(value<0n)fail('PO amounts cannot be negative.');
      if(!groups.has(itemId))groups.set(itemId,Object.create(null));
      var group=groups.get(itemId);group[line.costElement]=(group[line.costElement]||0n)+value;
    });
    return groups;
  }
  function baseline(opts){
    var groups=selected(opts);
    if(opts.signedPending!==true)fail('Reallocation is unavailable until the current PO reallocation backend is published.');
    if(!Array.isArray(opts.balances))fail('Budget balances are unavailable. Refresh the budget.');
    return Array.from(groups.keys()).map(function(itemId){
      var matches=opts.balances.filter(function(balance){return balance&&balance.budgetItemId===itemId;});
      if(matches.length!==1)fail('A selected budget item has no unique current balance. Refresh the budget.');
      var balance=matches[0],parts=balance.componentBalances;
      if(balance.reallocationContract!==CONTRACT)fail('Reallocation is unavailable until the current PO reallocation backend is published.');
      if(balance.componentBaselineAvailable!==true)fail('Reallocation requires a saved budget breakdown for every selected cost code.');
      if(typeof balance.unallocatedModificationCount!=='number'||!Number.isSafeInteger(balance.unallocatedModificationCount)||balance.unallocatedModificationCount<0)fail('Existing modification allocation count is unavailable. Refresh the budget.');
      if(balance.unallocatedModificationCount>0)fail('Reallocation is unavailable while existing modifications lack cost elements.');
      if(cents(balance.unallocatedIssuedCents,'Existing PO allocation')!==0n||cents(balance.unallocatedModificationCents,'Existing modification allocation')!==0n||balance.issuedComponentsAllocated===false)fail('Reallocation is unavailable while existing POs or modifications lack cost elements.');
      if(!Array.isArray(parts)||parts.length!==5||parts.some(function(part){return !part||typeof part.costElement!=='string'||! /^[1-5]$/.test(part.costElement);})||new Set(parts.map(function(part){return part.costElement;})).size!==5)fail('All five component balances are required. Refresh the budget.');
      var own=Object.create(null),ownPending=Object.create(null),ownReductions=Object.create(null);
      (opts.reservedLines||[]).forEach(function(line){
        if(!line||line.budgetItemId!==itemId)return;
        if(typeof line.costElement!=='string'||! /^[1-5]$/.test(line.costElement))fail('This PO has a saved reservation without a cost element.');
        var value=amount(line.finalAmount,'Saved PO amount');if(value<0n)fail('Saved PO amounts cannot be negative.');
        own[line.costElement]=(own[line.costElement]||0n)+value;
      });
      (opts.reservedModifications||[]).forEach(function(modification){
        if(!modification||modification.budgetItemId!==itemId||modification.status==='Approved')return;
        var components=modification.componentReallocation===true?modification.signedComponents:modification.components;
        if(!components||ELEMENTS.some(function(element){return typeof components[element.id]!=='string';}))fail('This PO has a pending modification without a complete cost-element allocation.');
        ELEMENTS.forEach(function(element){var change=amount(components[element.id],'Saved modification component');ownPending[element.id]=(ownPending[element.id]||0n)+change;ownReductions[element.id]=(ownReductions[element.id]||0n)+max(0n,-change);});
      });
      var totals={final:0n,mods:0n,issued:0n,available:0n,pending:0n};
      var rows=ELEMENTS.map(function(element){
        var part=parts.find(function(candidate){return candidate.costElement===element.id;});
        var final=cents(part.finalCents),mods=cents(part.modCents),issued=cents(part.issuedCents),available=cents(part.availableCents),pending=cents(part.pendingModificationCents,'Pending component modification balance'),pendingReduction=cents(part.pendingReductionCents,'Pending component reduction balance');
        if(pendingReduction<0n)fail('Pending component reduction balance cannot be negative.');
        if(final<0n||final+mods<0n||issued<0n||final+mods-issued!==available)fail('Component balances do not reconcile. Refresh the budget.');
        if((own[element.id]||0n)>issued)fail('This PO reservation does not reconcile with the current component balance.');
        totals.final+=final;totals.mods+=mods;totals.issued+=issued;totals.available+=available;totals.pending+=pending;
        available+=own[element.id]||0n;pending-=ownPending[element.id]||0n;pendingReduction-=ownReductions[element.id]||0n;
        if(pendingReduction<0n)fail('This PO pending reduction does not reconcile with the current component balance.');
        var allocated=groups.get(itemId)[element.id]||0n;
        var required=allocated>0n?max(0n,allocated-available-pending):0n;
        if(required>MAX)fail('Required component increase exceeds supported currency capacity.');
        // Gross debit reservations remain protected even when other pending
        // credits offset them in the net component balance.
        var decrease=max(0n,min(available-allocated-pendingReduction,final+mods));
        return {costElement:element.id,label:element.label,final:final,mods:mods,allocated:allocated,available:available,pending:pending,pendingReduction:pendingReduction,minimumIncrease:required,maximumDecrease:decrease};
      });
      ['final','mods','issued','available','pending'].forEach(function(name){var field={final:'finalCents',mods:'modCents',issued:'issuedCents',available:'availableCents',pending:'pendingModificationCents'}[name];if(cents(balance[field],'Budget item '+name+' balance')!==totals[name])fail('Budget item and component balances do not reconcile. Refresh the budget.');});
      return {budgetItemId:itemId,rows:rows};
    });
  }
  function initial(items){return {contract:CONTRACT,items:items.map(function(item){var components={};item.rows.forEach(function(row){components[row.costElement]=money(row.minimumIncrease);});return {budgetItemId:item.budgetItemId,components:components,reason:''};})};}
  function shape(payload,items){
    if(!payload||payload.contract!==CONTRACT||!Array.isArray(payload.items)||payload.items.length!==items.length)fail('Reallocation must include every selected cost code exactly once.');
    var byId=new Map();
    payload.items.forEach(function(item){
      if(!item||byId.has(id(item.budgetItemId))||!items.some(function(selectedItem){return selectedItem.budgetItemId===item.budgetItemId;}))fail('Reallocation contains a duplicate or unrelated cost code.');
      if(!item.components||Array.isArray(item.components)||Object.keys(item.components).length!==5||ELEMENTS.some(function(element){return !Object.prototype.hasOwnProperty.call(item.components,element.id);}))fail('Reallocation requires all five signed component amounts.');
      if(typeof item.reason!=='string')fail('Enter a reason for each changed cost code.');
      var components={};ELEMENTS.forEach(function(element){components[element.id]=money(amount(item.components[element.id],element.label+' change'));});
      byId.set(item.budgetItemId,{budgetItemId:item.budgetItemId,components:components,reason:item.reason.trim()});
    });
    return {contract:CONTRACT,items:items.map(function(item){return byId.get(item.budgetItemId);})};
  }
  function projected(items,payload,check){
    var increase=0n,decrease=0n,error='';
    function issue(message){if(check)fail(message);if(!error)error=message;}
    var result=items.map(function(item,index){
      var changes=payload.items[index],itemIncrease=0n,itemDecrease=0n;
      var rows=item.rows.map(function(row){
        var change=amount(changes.components[row.costElement]);
        if(change>0n){itemIncrease+=change;if(change!==row.minimumIncrease)issue(row.label+' increase must equal the required '+money(row.minimumIncrease)+'.');}
        else if(row.minimumIncrease>0n)issue(row.label+' requires an increase of '+money(row.minimumIncrease)+'.');
        if(change<0n){itemDecrease-=change;if(-change>row.maximumDecrease)issue(row.label+' decrease cannot exceed '+money(row.maximumDecrease)+'.');}
        if(row.final+row.mods+change<0n)issue(row.label+' cannot have a negative revised budget.');
        var remaining=row.available+change-row.allocated;
        return {costElement:row.costElement,label:row.label,currentBudget:money(row.final+row.mods),finalBudget:money(row.final),allocated:money(row.allocated),available:money(row.available),pending:money(row.pending),pendingReduction:money(row.pendingReduction),minimumIncrease:money(row.minimumIncrease),maximumDecrease:money(row.maximumDecrease),change:money(change),revisedBudget:money(row.final+row.mods+change),revisedFinal:money(row.final+row.mods+change),revisedAvailable:money(row.available+change),remaining:money(remaining),fundedRemaining:money(remaining+row.pending)};
      });
      if(itemIncrease+itemDecrease>MAX)issue('Cost-code reallocation exceeds supported currency capacity.');
      if(itemIncrease+itemDecrease>0n&&!changes.reason)issue('Enter a reason for each changed cost code.');
      increase+=itemIncrease;decrease+=itemDecrease;
      return {budgetItemId:item.budgetItemId,rows:rows,components:changes.components,reason:changes.reason,increase:money(itemIncrease),decrease:money(itemDecrease),net:money(itemIncrease-itemDecrease),gross:money(itemIncrease+itemDecrease)};
    });
    return {available:true,valid:!error,error:error,contract:CONTRACT,items:result,increase:money(increase),decrease:money(decrease),net:money(increase-decrease),gross:money(increase+decrease),reallocation:payload};
  }
  function defaults(opts){return initial(baseline(opts));}
  function validate(payload,opts){if(payload==null)return null;var items=baseline(opts),canonical=shape(payload,items);projected(items,canonical,true);return canonical;}
  function plan(opts){
    var items;
    try{items=baseline(opts);}catch(error){return Object.assign({available:false,valid:false,error:error.message,contract:CONTRACT,items:[]},zeroTotals());}
    try{return projected(items,opts.reallocation==null?initial(items):shape(opts.reallocation,items),false);}catch(error){var result=projected(items,initial(items),false);result.valid=false;result.error=error.message;return result;}
  }
  root.LMPOReallocation={contract:CONTRACT,plan:plan,defaults:defaults,validate:validate};
})(typeof globalThis!=='undefined'?globalThis:this);
