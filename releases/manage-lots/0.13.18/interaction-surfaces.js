/* Explicit adoption of the repository interaction language. Native handlers remain owners. */
(function(global){
  'use strict';
  function install(module,options={}){
    if(!global.LMMotion)return null;
    const M=global.LMMotion,$=id=>document.getElementById(id),state=()=>options.state?.()||{};
    const text=node=>node?.textContent.replace(/\s+/g,' ').trim()||'';
    const tabs=[],panels=[],lists=[],feedback=[],meters=[];
    const tab=(selector,items,panel,extra={})=>tabs.push({selector,items,panel,...extra});
    const list=(selector,rows,key,scope,extra={})=>lists.push({selector,rows,key,scope,...extra});
    const surfaceExtra=[];
    const saved=node=>node.matches('.saved,.saved-ok,.ll-saved,[data-state="saved"],[data-state="verified"]');
    const status=(selector,row,key)=>feedback.push({selector,row,key,state:node=>[node.dataset.state,node.className.replace(/\blm-motion-\S+/g,''),node.getAttribute('aria-invalid')].join('|'),verified:saved});
    const recordScope=()=>state().ed?.id||M.identity(state().ed?.model);
    if(module==='proforma-manager'){
      tab('.topbar .tabs','a','#vList');
      tab('#edTabs','button[data-pane]','#edPanes',{scope:recordScope});
      tab('#loiAgreement','button',null,{scope:recordScope});
      tab('#flowSeg','button','#flowBody',{rail:false}); // Existing native slider.
      
      tab('.ps-nav','[data-ps-select]',null,{rail:false});
      panels.push({selector:'#vList,#vEdit,#vDash,.ed-pane'});
      list('#listBody','tr[data-id]',row=>row.dataset.id,()=>state().view||'list');
      list('#edPanes [data-lm-row-list]','tbody>tr',row=>{
        const kind=row.dataset.kind,index=Number(row.dataset.i),model=state().ed?.model;
        if(!kind){const input=row.querySelector('[data-loi-seller],[data-loi-new-seller],[data-loi-property],[data-loi-new-property]');if(!input)return null;const data=input.dataset;return M.key('loi',data.loiSeller||data.loiNewSeller||data.loiProperty||data.loiNewProperty);}
        const source=kind==='lotmix'?model?.lotMix:kind==='item'?model?.items:kind==='pid'?model?.pidMud:kind==='curve'?model?.curve:kind==='purchase'?model?.purchaseInstallments:kind==='sale'?model?.saleInstallments:model?.[kind];
        return source?.[index]?M.key(kind,M.identity(source[index])):null;
      },()=>M.key(recordScope(),state().ed?.pane,state().ed?.addlTab),{hostKey:host=>host.dataset.lmRowList,resize:true});
      surfaceExtra.push('.mo-box,.air-box,.msel-pop,.pfm-month-popover,.addl-note-pop');
      status('.pf-appr-config-tile','.pf-appr-config-tile',node=>node.dataset.apprKey||node.id||M.identity(node));
      meters.push('#ovBar');
    }else if(module==='budget-manager'){
      tab('#tabs','a[data-tab]',null);
      tab('#modeSwitch','button','#editor');
      tab('.tier-filter-bar','.cfpill','#mx');
      panels.push({selector:'#vBudgets,#vEditor,#vApprovals,#vImports'});
      list('#mx','tr.irow[data-iid],tr.irow[data-budget-item-ids]',row=>row.dataset.iid||row.dataset.budgetItemIds,()=>state().edBudget?.ID||options.project?.()?.key,{visibility:true});
      list('#projList','.proj-card[data-project-key]',row=>row.dataset.projectKey,'projects');
      surfaceExtra.push('.pop');
      status('[data-project-proforma-wrap]','.proj-card',node=>node.dataset.projectProformaWrap);
      status('#autosave');
      meters.push('.aq-progress-fill');
      list('[data-lm-row-list="request-attachment-files"]','.attachment-page-row[data-record-id]',row=>row.dataset.recordId,()=>state().edBudget?.ID||'budget-files');
    }else if(module==='manage-lots'){
      tab('nav.tabs','[data-view]',null);
      tab('#lotsLayout','#lotsListMode,#lotsGridMode',null);
      panels.push({selector:'#lotsView,#takedownsView'});
      list('#blocks','tr[data-lot-row]',row=>row.dataset.lotRow,()=>M.key(state().subdivisionIds||[]));
      // The native takedown editor already owns keyed row FLIP.
      surfaceExtra.push('#notePop,.lm-picker-menu,#lotHover');
      status('[data-lot-row] td','tr[data-lot-row]',node=>M.key(node.closest('[data-lot-row]')?.dataset.lotRow,node.cellIndex));
      
    }else if(module==='contract-management'){
      tab('.mode-seg:not(#aprTabs)','button','#view');
      tab('#aprTabs','button','#overlays');
      // Legal owns its existing FLIP and drag/drop; do not apply a second transform.
      panels.push({selector:'#view'});
      surfaceExtra.push('#overlays .modal,.msel-pop,.kmenu');
      status('.dt,.apr-in,.cbo','tr',node=>M.key(node.closest('tr')?.id,node.dataset.field||node.id||M.identity(node)));
      meters.push('.stats-prog .progress>i');
    }else if(module==='tax-center'){
      tab('.tab-bar','.tab-btn',null);
      panels.push({selector:'#tableWrap,#propPanel'});
      list('#tableBody','tr[data-lm-record]',row=>row.dataset.lmRecord,()=>state().activeTab);
      surfaceExtra.push('.modal-overlay>.modal');
      status('.cell-input,.cell-select,input[type=checkbox]','tr[data-lm-record]',node=>M.key(node.closest('[data-lm-record]')?.dataset.lmRecord,node.dataset.field||node.id||M.identity(node)));
      
    }else if(module==='land-master'){
      tab('#scopeSeg','[data-scope]','#tableScroll');
      tab('#recordTabs','[data-record-tab]','#panel');
      list('#tableScroll','tr.rec[data-id]',row=>row.dataset.id,()=>state().scope);
      panels.push({selector:'#panel'});
      surfaceExtra.push('.record-modal .record-dialog,.audit-modal .audit-dialog,.lookup-popup,.project-popup,.lm-picker-menu');
      status('#tableScroll .table-editor,#tableScroll .table-project-btn','tr.rec[data-id]',node=>M.key(node.closest('[data-id]')?.dataset.id,node.dataset.field||node.querySelector('input')?.dataset.field));
      
    }else if(module==='milestone-gantt'){
      list('#gantt','.gantt-row[data-id]',row=>row.dataset.id,()=>state().selectedSubdivisionId);
      surfaceExtra.push('.gantt-save-dialog');
      status('.gantt-row[data-id]','.gantt-row[data-id]',node=>node.dataset.id);
      meters.push('#ganttSaveBarFill');
    }else if(module==='settings-manager'){
      tab('#nav','[data-jump]',null);
      tab('.ap-tabs','[data-ap-tab]',null);
      list('#sec-curve','tr[data-crow]',row=>row.dataset.crow,()=>state().recId);
      surfaceExtra.push('.settings-dialog,.ap-card');
      status('.ap-inline-status');
      feedback.push({selector:'[data-frow] .tick',row:'[data-frow]',key:node=>node.closest('[data-frow]').dataset.frow,state:node=>node.innerHTML,verified:node=>!!node.querySelector('.stick.show')});
    }else if(module==='lot-sales-explorer'){
      
      list('#matrixBody','tr[data-motion-row]',row=>row.dataset.motionRow,()=>state().groupBy||'sales',{highlight:false});
      list('#fcBody','tr[data-motion-row]',row=>row.dataset.motionRow,()=>state().forecastGroupBy||'project',{highlight:false,visibility:true});
      surfaceExtra.push('#subdivisionCard,.insights-popover,#fcInfoCard');
      panels.push({selector:'#salesDashboard,#forecastsDashboard,#detailBody'});
      status('#connection');
    }else if(module==='forecast-manager'){
      tab('.segments','[data-view]','#matrixScroll');
      list('#matrix','tbody tr[data-builder]',row=>row.dataset.builder,()=>state().sub);
      surfaceExtra.push('.popover,.dialog');
      status('#saveStatus');
      status('.month-cell','.month-cell',node=>node.dataset.monthId||node.id||M.identity(node));
      meters.push('.fs-month-fill,.subdivision-card-progress-track>span,.progress-fill');
    }
    // New features use semantic roles or explicit annotations; legacy names stay above.
    tabs.push({selector:'[data-lm-motion="tabs"]',items:'[role="tab"]'});
    panels.push({selector:'[data-lm-motion="panel"]'});
    feedback.push({selector:'[data-lm-motion="feedback"],[role="status"]',state:node=>node.dataset.state||node.textContent});
    meters.push('[data-lm-motion="meter"],progress,[role="progressbar"]>i,[role="progressbar"]>span');
    return M.start({module,ready:options.ready,actor:options.actor,tabs,panels,lists,feedback,meters,
      surfaces:[{selector:['dialog','[role="dialog"]','[role="listbox"]','[role="menu"]','[data-lm-motion="popover"]',...surfaceExtra].join(',')}]});
  }
  global.LMInteractionSurfaces=Object.freeze({install});
})(window);
