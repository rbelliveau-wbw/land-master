(function(root){
  'use strict';
  function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function signed(value){return value&&value[0]==='-'?-root.LMPO.money(value.slice(1)):root.LMPO.money(value||'0.00');}
  function create(options){
    var host=options.host,key='',lineKey='',view=null,showZero=false;
    function model(){return options.model();}
    function opts(){var m=model();return {lines:m.lines,balances:m.balances,reservedLines:m.reservedLines,reservedModifications:m.approvalBundle&&m.approvalBundle.modifications,signedPending:m.reallocationContract==='po-reallocation-v1',reallocation:m.reallocation};}
    function currentPlan(){return root.LMPOReallocation.plan(opts());}
    function locked(){return options.locked()||options.busy();}
    function patchVisibility(blurred){
      var toggle=host.querySelector('[data-po-rea-show-zero]');if(toggle){toggle.setAttribute('aria-checked',String(showZero));toggle.classList.toggle('on',showZero);}
      var plan=view||currentPlan(),focus=root.document&&root.document.activeElement;
      plan.items.forEach(function(item){item.rows.forEach(function(row){var node=host.querySelector('[data-po-rea-row="'+item.budgetItemId+'|'+row.costElement+'"]');if(!node)return;var empty=plan.available&&['finalBudget','currentBudget','revisedBudget','allocated','available','pending','pendingReduction','change','minimumIncrease'].every(function(field){return row[field]!=null&&signed(row[field])===0n;});node.hidden=!showZero&&empty&&!(focus&&focus!==blurred&&node.contains&&node.contains(focus));});});
    }
    function editItem(itemId){
      var m=model(),fresh=root.LMPOReallocation.plan(Object.assign(opts(),{reallocation:null}));
      if(!fresh.available)throw new Error(fresh.error||'Reallocation unavailable.');
      var draft=m.reallocation||root.LMPOReallocation.defaults(opts()),item=draft.items.find(function(row){return row.budgetItemId===itemId;});
      if(!item)return null;
      m.reallocation=draft;return item;
    }
    function metric(value,item,element,name){return '<strong data-po-rea-value data-budget-item="'+esc(item)+'" data-element="'+esc(element||'')+'" data-metric="'+name+'">'+options.money(value)+'</strong>';}
    function sync(){
      var m=model(),fresh=root.LMPOReallocation.plan(Object.assign(opts(),{reallocation:null}));
      var signature=JSON.stringify([m.id,m.revision,m.lines.map(function(l){return [l.budgetItemId,l.costElement,l.finalAmount];}),m.balanceState,m.balances]);
      if(m.reallocation&&!options.locked()&&fresh.available&&lineKey&&lineKey!==signature){
        var old=m.reallocation.items;
        m.reallocation.items=fresh.items.map(function(item){var prior=old.find(function(p){return p.budgetItemId===item.budgetItemId;}),components={};item.rows.forEach(function(row){var previous=prior&&prior.components[row.costElement]||'0.00',positive=/^\d+(?:\.\d{1,2})?$/.test(previous)&&signed(previous)>0n;components[row.costElement]=signed(row.minimumIncrease)>0n?row.minimumIncrease:positive?'0.00':previous;});return {budgetItemId:item.budgetItemId,components:components,reason:prior&&prior.reason||''};});key='';
      }
      if(!m.reallocation&&!options.locked()&&lineKey&&lineKey!==signature)key='';
      lineKey=signature;return fresh;
    }
    function patch(){
      var m=model();view=currentPlan();
      var reset=host.querySelector('[data-po-rea-reset]');if(reset){reset.hidden=!m.reallocation||options.locked();reset.disabled=options.busy();}
      patchVisibility();
      var notice=host.querySelector('[data-po-rea-notice]');
      if(notice){var saved=options.locked()&&m.reallocation;notice.textContent=m.reallocation?(view.available?view.error:view.error||'Reallocation unavailable.'):'';notice.dataset.state=!saved&&m.reallocation&&!view.valid?'error':'ready';notice.hidden=!!saved||!m.reallocation||view.valid;}
      if(options.locked()&&m.reallocation){
        var increases=0n,decreases=0n;m.reallocation.items.forEach(function(item){Object.values(item.components).forEach(function(value){var n=signed(value);if(n>0n)increases+=n;else decreases-=n;});});
        var savedTotals=host.querySelector('[data-po-rea-totals]');if(savedTotals)savedTotals.innerHTML=totalsHtml({increase:root.LMPO.currency(increases),decrease:root.LMPO.currency(decreases),net:root.LMPO.currency(increases-decreases)});
      }else if(view.available){
        view.items.forEach(function(item){item.rows.forEach(function(row){var el=host.querySelector('[data-po-rea-projection="'+item.budgetItemId+'|'+row.costElement+'"]');if(el)el.innerHTML='<span>Budget '+metric(row.currentBudget,item.budgetItemId,row.costElement,'current')+'</span><span>Revised '+metric(row.revisedBudget,item.budgetItemId,row.costElement,'revised')+'</span>';});});
        var totals=host.querySelector('[data-po-rea-totals]');if(totals)totals.innerHTML=totalsHtml(view);
      }
      options.changed(view);
    }
    function totalsHtml(totals){return '<span>Increases '+metric(totals.increase,'total','','increase')+'</span><span>Decreases '+metric(totals.decrease,'total','','decrease')+'</span><span>Net Change '+metric(totals.net,'total','','net')+'</span>';}
    function update(){
      var m=model(),fresh=sync(),saved=m.reallocation,readonly=options.locked(),items=saved&&readonly?saved.items:(fresh.available?fresh.items:[]),active=!!saved;
      var unavailable=m.balanceState==='loading'?'Checking budgets…':m.reallocationContract!=='po-reallocation-v1'?'Reallocation requires the Creator update.':m.lines.some(function(line){return !line.budgetItemId||!line.costElement||!/^\d+(?:\.\d{1,2})?$/.test(line.finalAmount||'');})?'Complete the PO lines to edit reallocation.':fresh.error;
      host.hidden=m.loadState!=='loaded'||options.hidden();if(host.hidden)return;
      var shape=JSON.stringify([m.id,m.revision,items.map(function(item){return item.budgetItemId;}),readonly,m.reallocationContract,m.balanceState,fresh.available,readonly&&saved]);
      // Keep the actual inputs mounted while calculations and line amounts change.
      if(shape===key){patch();return;}key=shape;
      host.innerHTML='<header><div class="po-rea-title-row"><h2 id="po-reallocation-title">Reallocation</h2><button type="button" class="po-rea-show-zero" data-po-rea-show-zero role="switch" aria-checked="false"><span class="tgl" aria-hidden="true"></span>Show $0</button><button type="button" class="po-rea-refresh" data-po-refresh aria-label="Refresh Budget" title="Refresh Budget" '+(m.balanceState==='loading'?'disabled':'')+'>Refresh</button></div></header><div class="po-reallocation-body">'+(readonly&&!saved?'<div class="po-rea-empty">No reallocation.</div>':!fresh.available&&!saved?'<div class="po-rea-empty" role="status">'+esc(unavailable)+'</div>':items.map(function(item){
        var info=options.items().find(function(row){return row.id===item.budgetItemId;}),draft=saved&&saved.items.find(function(row){return row.budgetItemId===item.budgetItemId;}),rows=fresh.items.find(function(row){return row.budgetItemId===item.budgetItemId;});
        return '<section class="po-rea-item" data-po-rea-item="'+esc(item.budgetItemId)+'"><h3>'+esc(info&&info.code||'Cost Code')+'<span>'+esc(info&&info.name||item.budgetItemId)+'</span></h3>'+root.LMPO.elements.map(function(element){var row=rows&&rows.rows.find(function(r){return r.costElement===element.id;}),value=draft?draft.components[element.id]:row&&row.minimumIncrease||'0.00',negative=value[0]==='-',disabled=readonly||!fresh.available;
          return '<div class="po-rea-row" data-po-rea-row="'+esc(item.budgetItemId+'|'+element.id)+'"><div class="po-rea-row-title"><strong>'+esc(element.label)+'</strong><span>'+(readonly?'Saved Change':row&&signed(row.minimumIncrease)>0n?'Required '+options.money(row.minimumIncrease):row?'Up To '+options.money(row.maximumDecrease):'')+'</span></div><div class="po-rea-controls"><div class="po-rea-direction" role="group" aria-label="'+esc(element.label)+' Change Direction">'+['Increase','Decrease'].map(function(direction){return '<button type="button" data-po-rea-direction="'+direction+'" data-item="'+item.budgetItemId+'" data-element="'+element.id+'" aria-pressed="'+((direction==='Decrease')===negative)+'" '+(disabled?'disabled':'')+' title="'+esc(direction+' '+element.label)+'" aria-label="'+esc(direction+' '+(info&&info.code||'Cost Code')+' '+element.label)+'"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="'+(direction==='Increase'?'M12 6v12M6 12h12':'M6 12h12')+'"/></svg></button>';}).join('')+'</div><input aria-label="'+esc((info&&info.code||'Cost Code')+' '+element.label+' Reallocation Amount')+'" data-po-rea-amount data-item="'+item.budgetItemId+'" data-element="'+element.id+'" data-negative="'+negative+'" inputmode="decimal" value="'+esc(root.LMPO.formatDecimal(negative?value.slice(1):value))+'" '+(disabled?'readonly':'')+'></div>'+(!readonly?'<div class="po-rea-projection" data-po-rea-projection="'+item.budgetItemId+'|'+element.id+'"></div>':'')+'</div>';
        }).join('')+'<label class="po-field po-rea-reason"><span>Reason</span><textarea aria-label="'+esc((info&&info.code||'Cost Code')+' Reallocation Reason')+'" data-po-rea-reason data-item="'+item.budgetItemId+'" maxlength="1000" rows="2" '+(readonly||!fresh.available?'readonly':'')+'>'+esc(draft&&draft.reason||'')+'</textarea></label></section>';
      }).join(''))+'<div class="po-rea-notice" role="status" data-lm-motion="feedback" data-po-rea-notice></div></div><footer><div class="po-rea-totals" data-po-rea-totals></div>'+(!readonly?'<button type="button" class="po-rea-toggle" data-po-rea-reset '+(!active?'hidden':'')+'>Reset Changes</button>':'')+'</footer>';
      patch();
    }
    host.addEventListener('click',function(event){
      var target=event.target.closest('button');if(!target)return;if(target.hasAttribute('data-po-rea-show-zero')){showZero=!showZero;patchVisibility();return;}if(locked())return;var m=model();
      if(target.hasAttribute('data-po-rea-reset')){if(!m.reallocation)return;m.reallocation=null;key='';update();var focus=host.querySelector('[data-po-rea-amount]')||host.querySelector('[data-po-refresh]');if(focus&&focus.focus)focus.focus();return;}
      if(target.dataset.poReaDirection){try{var item=editItem(target.dataset.item);if(!item)return;var input=target.closest('.po-rea-controls').querySelector('input'),negative=target.dataset.poReaDirection==='Decrease';input.dataset.negative=String(negative);item.components[target.dataset.element]=(negative?'-':'')+root.LMPO.editDecimal(input.value||'0.00');target.parentElement.querySelectorAll('button').forEach(function(button){button.setAttribute('aria-pressed',String(button===target));});patch();}catch(e){options.error(e.message);}}
    });
    host.addEventListener('input',function(event){if(locked())return;var target=event.target;if(!target.hasAttribute('data-po-rea-reason')&&!target.hasAttribute('data-po-rea-amount'))return;try{var item=editItem(target.dataset.item);if(!item)return;if(target.hasAttribute('data-po-rea-reason'))item.reason=target.value;else item.components[target.dataset.element]=(target.dataset.negative==='true'?'-':'')+root.LMPO.editDecimal(target.value);patch();}catch(e){options.error(e.message);}});
    host.addEventListener('focusin',function(event){if(event.target.hasAttribute('data-po-rea-amount')&&!locked())event.target.value=root.LMPO.editDecimal(event.target.value);});
    host.addEventListener('focusout',function(event){if(event.target.hasAttribute('data-po-rea-amount')){event.target.value=root.LMPO.formatDecimal(event.target.value);patchVisibility(event.target);}});
    return {update:update,plan:currentPlan,payload:function(){if(!model().reallocation)return null;if(model().reallocationContract!=='po-reallocation-v1')throw new Error('Reallocation requires the Creator update before this PO can be saved.');return root.LMPOReallocation.validate(model().reallocation,opts());}};
  }
  root.LMPOReallocationUI={create:create};
})(typeof globalThis!=='undefined'?globalThis:this);
