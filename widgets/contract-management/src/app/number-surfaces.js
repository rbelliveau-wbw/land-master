/* Explicit module adoption map. No scans of arbitrary prose, identities, editable values or dates. */
(function(global){
  'use strict';
  const clean=node=>node?.textContent.replace(/\s+/g,' ').trim()||'';
  function install(module,options){
    if(!global.LMNumbers)return null;
    const N=global.LMNumbers;
    return N.start({module,ready:options.ready,actor:options.actor,collect(api){
      const s=options.state(),id=(...p)=>api.key(...p),each=api.each;
      function mark(selector,scope,mode='all',getKey){each(selector,(node,i)=>api.text(node,[scope,getKey?getKey(node,i):i],mode));}
      function label(node,selector){return clean(node.closest(selector)?.querySelector('label,.l,.rl,.stat-t,.ck-label,.si-name,.fdrop-label,.cdrop-label'));}
      function table(selector,scope,config={}){
        each(selector,(table,t)=>{
          const headers=[...table.querySelectorAll('thead tr:last-child th')].map(clean);
          each('tbody tr,tfoot tr',row=>{
            if(config.accept&&!config.accept(row))return;
            const rowId=config.row?config.row(row):row.dataset.id||row.dataset.lmRecord||row.dataset.contractId||row.dataset.iid||row.dataset.ctog||(row.parentElement.tagName==='TFOOT'?'footer':clean(row.cells[0]));
            [...row.cells].forEach((cell,c)=>{
              if(c<(config.skip??1)||config.cell&&!config.cell(cell,c,row))return;
              const column=config.column?config.column(cell,c,row):headers[c]||c;
              api.text(cell,[scope,t,rowId,column],config.mode||'all',config.context||'');
            });
          },table);
        });
      }
      function badges(selector,attribute){each(selector,button=>each('.comment-activity-count,.rec-comment-count,.att-count,.count',(node,i)=>api.text(node,['activity',attribute,button.getAttribute(attribute),i]),button));}
      if(module==='budget-manager'){
        const project=options.project?.(),scope=s.edPhaseIdx==='all'?id('project',project?.key):id('budget',s.edBudget?.ID);
        mark('#summaryMatrices .kpi .v,#summaryMatrices .kpi .s',scope);
        table('#summaryMatrices table',id(scope,'department-summary'));
        each('[data-budget-metric] .v',node=>api.text(node,[scope,'metric',node.parentElement.dataset.budgetMetric]));
        table('#mx',id(scope,'matrix'),{
          skip:s.edPhaseIdx==='all'?1:4,context:s.tier,
          row:row=>row.dataset.iid||row.dataset.ctog||(row.parentElement.tagName==='TFOOT'?'footer':clean(row.querySelector('.cn')||row.cells[0])),
          column:(cell,c)=>cell.dataset.budgetItemId|| (s.edPhaseIdx==='all'?(project?.phases?.[c-1]?.ID||'total'):c)
        });
        each('#mx tr[data-iid] input[readonly]',input=>api.readonly(input,[scope,'item',input.closest('tr').dataset.iid,input.dataset.f||'preliminary']));
        each('.proj-card[data-project-key]',card=>{
          const key=card.dataset.projectKey;
          each('.ptot .v,.proj-stats .v', (node,i)=>api.text(node,['project',key,'summary',i]),card);
          each('.proj-status-row .st',node=>api.text(node,['project',key,'status',clean(node).replace(/^\d+\s*/, '')]),card);
          each('.ptable tbody tr',row=>{
            const budget=row.querySelector('[data-budget-menu]')?.dataset.budgetMenu;
            [...row.cells].forEach((cell,c)=>{if(c>=3)api.text(cell,['phase-list',key,budget,c]);});
          },card);
        });
        const compare=id('compare',s.compare?.project?.key,s.compare?.proforma?.ID);
        mark('#compareBody .ck-value,#compareBody .ckm-v',compare);
        each('#compareBody .chm-value',node=>api.text(node,[compare,'metric',clean(node.closest('th')?.querySelector('.compare-phase-title,.compare-col-title')),clean(node.previousElementSibling)]));
        table('#compareBody table',compare,{skip:2,row:row=>id(clean(row.querySelector('.compare-desc-label,.compare-detail-label')),clean(row.querySelector('.compare-unit')),row.classList.contains('compare-detail-row'))});
        const mod=id('modification',s.modModal?.budgetId||s.edBudget?.ID,s.modModal?.itemId||s.modModal?.item?.ID||'',s.modModal?.id||'draft');
        mark('#requestBalance .rv,#requestGPReference .rv,#requestAmountMax',mod);
        mark('#modPreview .rv',mod);
        each('.po-overlay',overlay=>{
          const scope=id('po',api.identity(overlay));
          each('[data-po-total],[data-po-summary-total],[data-po-summary-count],[data-po-context] strong', (node,i)=>api.text(node,[scope,'summary',i]),overlay);
          each('[data-line]',row=>{
            const line=row.dataset.line;
            each('input[readonly][data-po-field="finalAmount"]',input=>api.readonly(input,[scope,line,'amount']),row);
          },overlay);
          each('[data-po-summary] tbody tr',row=>{const code=clean(row.querySelector('th strong'));[...row.querySelectorAll('td')].forEach((cell,i)=>api.text(cell,[scope,'allocation',code||clean(row),i],'money'));},overlay);
        });
        ['territoryFilterCount','statusFilterCount','apprCt','importCt','multiNotesCount'].forEach(name=>api.id(name,'budget-counts'));
        badges('[data-budget-attachments]','data-budget-attachments');badges('[data-budget-comments]','data-budget-comments');
      }else if(module==='manage-lots'){
        const selected=(s.subdivisionIds||[]).slice().sort(),scope=id('lots',selected),receipt=id('receipt',document.getElementById('overlay')?.dataset.lmNumberScope);
        ['selectionEmblem','selectedCount','availablePill','lockedPill','massUpdate','llInventoryBlocks','llInventorySelected'].forEach(name=>api.id(name,scope));
        const selectedDetail=document.getElementById('selectedDetail');if(/^\d+ subdivision/.test(clean(selectedDetail)))api.text(selectedDetail,[scope,'selection-detail']);
        each('[data-subdivision-option]',button=>each('.sub-stat',(node,i)=>api.text(node,['subdivision',button.dataset.subdivisionOption,i]),button));
        each('[data-subdivision-group]',group=>each('.subdivision-meta',(node,i)=>api.text(node,['subdivision',group.dataset.subdivisionGroup,i]),group));
        each('[data-block][data-subdivision]',block=>each('.block-count,.block-available,.selected-badge',(node,i)=>api.text(node,['block',block.dataset.subdivision,block.dataset.block,i]),block));
        mark('.ll-total,.ll-count b',scope,'all',node=>node.closest('.ll-count')?.className||'total');
        each('[data-jump-block]',button=>api.text(button.querySelector('span'),['block-count',button.dataset.jumpBlock]));
        each('[data-list-block]',block=>api.text(block.querySelector('.ll-block-head>span'),['block',block.dataset.listBlock,'count']));
        each('[data-lot-row]',row=>each('td.ll-money .ll-read-value,td.ll-number .ll-read-value',(node,i)=>api.text(node,['lot',row.dataset.lotRow,clean(row.closest('table')?.querySelectorAll('th')[node.closest('td').cellIndex])||i]),row));
        each('#lotHover[data-lm-record] .hv-r',row=>{const name=clean(row.querySelector('.hv-k'));if(name==='Size'||name==='Base price')api.text(row.querySelector('.hv-v'),['lot-hover',row.closest('#lotHover').dataset.lmRecord,name]);});
        ['receiptLots','selectedLotCount','periodCount','receiptbase','receiptearnest','receiptfees','receiptinterest','receipttax','receiptwbw','receiptbuilder','receipttotal','receiptitems','receiptgrand','receiptAdjustment'].forEach(name=>api.id(name,receipt));
        each('.td-period[data-key]',period=>each('[id^="days"]',node=>api.text(node,[receipt,'period',period.dataset.key,'days']),period));
        each('.td-item[data-key]',row=>api.text(row.querySelector('.td-item-total'),[receipt,'item',row.dataset.key]));
        each('#receiptItemLines [data-lm-item]',row=>{api.text(row.querySelector('small'),[receipt,'item-detail',row.dataset.lmItem]);api.text(row.querySelector('strong'),[receipt,'item-total',row.dataset.lmItem]);});
        each('#receiptLotRows tr[data-lm-record]',row=>[...row.cells].slice(1).forEach((cell,i)=>api.text(cell,[receipt,'lot',row.dataset.lmRecord,i])));
        each('#takedownsBody tr',row=>api.text(row.querySelector('.count-chip'),['takedown',row.querySelector('[data-takedown-detail]')?.dataset.takedownDetail,'lots']));
        const detail=id('takedown-detail',document.getElementById('takedownDetail')?.dataset.lmRecord);
        each('#takedownDetailBody .td-detail-field',row=>{const name=clean(row.querySelector('span'));if(name==='Lots'||['Base price','Interest','Total','With additional items','Tax per lot','Additional fees per lot'].includes(name))api.text(row.querySelector('strong'),[detail,name]);});
        mark('#takedownDetailBody .count-chip',detail);
        mark('#mlProgressStatus',scope,'counts');api.id('llDialogStatus',scope);
      }else if(module==='contract-management'){
        const scope=id('contracts',s.workMode,s.homeSection),detail=id('contract',s.selId);
        mark('.scope-count,.review-n',scope,'all',(node,i)=>[node.classList.contains('review-n')?'review':'matching',i]);
        each('.tgroup',row=>api.text(row.querySelector('.tgroup-n'),[scope,'type',clean(row.querySelector('.tgroup-name'))]));
        each('[data-contract-id]',row=>{
          const contract=row.dataset.contractId;
          each('.progress-n,.contract-master-note,.lot-closing-summary,.contract-lot-meta',(node,i)=>api.text(node,['contract',contract,node.className,i]),row);
        });
        each('.bcol[data-status]',column=>api.text(column.querySelector('.bcol-head .n'),[scope,'status',column.dataset.status]));
        each('.stat-cell',node=>api.text(node.querySelector('.stat-n'),[detail,'actions',clean(node.querySelector('.stat-t'))]));
        mark('.stats-prog-lbl b,.stats-prog-pct',detail);
        each('.info-field',field=>{const name=clean(field.querySelector('.info-lbl'));if(['Lots','Closings','Earnest / Total'].includes(name))api.text(field.querySelector('.info-val'),[detail,name]);});
        each('.contract-parent-fact .contract-master-note',node=>api.text(node,['parent-children',node.closest('[data-contract-id]')?.dataset.contractId||node.closest('tr[id]')?.id||s.selId]));
        const draft=id('contract-draft',api.identity(s.nc||s.clp||s));
        mark('#nc_lotsum,.lp-count',draft);
        each('.lot-count-warning',node=>api.text(node,['lot-count-warning',node.closest('[data-contract-id]')?.dataset.contractId||s.clp?.cid||draft]));
        each('.nc-szchip',(node,i)=>api.text(node,[draft,'lot-size-mix',clean(node).split('ft')[0],i]));
        mark('#ma_bar .ma-count,.bulk-count,.mass-selected',scope);
        each('#lrun_rows .lrun-det',node=>api.text(node,['lot-completion',s.lotRun?.cid,node.closest('[id]')?.id],'counts'));
        mark('.lrun-note',id('lot-completion',s.lotRun?.cid),'counts');
        badges('[data-contract-attachments]','data-contract-attachments');badges('[data-contract-comments]','data-contract-comments');
      }else if(module==='tax-center'){
        const basis=s.rowsLoaded?'loaded-portfolio':'server-matching',scope=id('tax',s.activeTab);
        ['kpiPortfolio','kpiProtests'].forEach(name=>api.id(name,[scope,basis]));
        ['kpiUntriaged','kpiPaid','tabParcelCnt','tabPropCnt','agCnt','fbulkCount','propBulkCount'].forEach(name=>api.id(name,scope));
        mark('#topPager .top-pagination-info,#propTopPager .top-pagination-info',scope);
        each('.sidebar-item',row=>api.text(row.querySelector('.si-cnt'),[scope,'sidebar',row.parentElement.id,clean(row.querySelector('.si-name'))]));
        each('.cdrop-item,.fdrop-item',row=>api.text(row.querySelector('.cdrop-cnt,.fdrop-cnt,.facet-count'),[scope,'facet',row.parentElement.id,clean(row.querySelector('.cdrop-name,.fdrop-name,.fdrop-label'))||clean(row).replace(/\d+$/,'')]));
        ['countyFacetCount','companyFacetCount','subdivFacetCount','statusFacetCount','arbFacetCount'].forEach(name=>api.id(name,scope));
        each('tr.subdiv-row',row=>{
          const sub=row.dataset.lmRecord||clean(row.querySelector('.subdiv-name'));
          api.text(row.querySelector('.subdiv-meta'),[scope,'subdivision',sub,'count']);
          [...row.cells].slice(1).forEach((cell,i)=>api.text(cell,[scope,'subdivision',sub,i],'money'));
        });
        each('tr[data-lm-record]',row=>each('td[data-lm-quantity]',cell=>api.text(cell,[scope,'row',row.dataset.lmRecord,cell.dataset.lmQuantity]),row));
        each('#modalBody .fg .fsub',node=>api.text(node,['parcel',s.modalId||s.selectedId,'prior-comparison',clean(node.parentElement.querySelector('.fl'))]));
        api.id('taxSaveCount',id('tax-ledger',s.taxLedgerId));
      }else if(module==='land-master'){
        const scope=id('land',s.scope),editor=id('editor',s.editorType,s.editorId||api.identity(s.editorDraft),s.modalTab);
        ['ctProps','ctSubs','ctCos','issueCt','scopeCount','pageInfo','pageNumber'].forEach(name=>api.id(name,scope));
        api.id('bulkMsgModal',[scope,'bulk',s.bulkField]);
        mark('#bulkbar .bulkbar>b:first-child',scope);
        const columns=options.columns?.()||[];
        each('tr.rec[data-id]',row=>columns.forEach((column,i)=>{if(column.num&&!/(^|_)(id|code|year|date|account|aba|ein|sequence)($|_)/i.test(column.key))api.text(row.cells[i+2],[scope,'record',row.dataset.id,column.key]);}));
        each('tr.ghead[data-group]',row=>api.text(row.querySelector('.gmeta'),[scope,'project',row.dataset.group]));
        api.id('resultLine',scope);
        each('#recordTabs [data-record-tab]',button=>api.text(button.querySelector('.record-tab-count'),[editor,'related',button.dataset.recordTab]));
        each('#panel input[readonly][type="number"]',input=>{if(!/id|code|year|date|account|aba|ein|sequence/i.test(input.dataset.field||''))api.readonly(input,[editor,'field',input.dataset.field]);});
        table('#panel table',editor,{cell:(cell,c,row)=>cell.classList.contains('num')&&!/id|code|year|date|account|ein/i.test(clean(row.closest('table')?.querySelectorAll('th')[c]))});
        mark('#panel [data-transfer-total]',editor);
        const imported=id('lot-import',clean(document.querySelector('.si-summary-file')));
        each('.si-summary-metric',metric=>api.text(metric.querySelector('b'),[imported,clean(metric.querySelector('span'))]));
        each('.si-block-total',block=>{const blockId=clean(block.querySelector('span'));api.text(block.querySelector('strong'),[imported,blockId,'total']);api.text(block.querySelector('small'),[imported,blockId,'selected']);});
        mark('.si-summary-warning,#siImportProgress .si-progress-heading>span',imported);
        mark('#siImportProgress>p',imported,'counts');
      }else if(module==='milestone-gantt'){
        const scope=id('gantt',s.selectedSubdivisionId);
        each('#summary .tag:not(:first-child)',(node,i)=>api.text(node,[scope,'summary',i]));
        each('.gantt-row[data-id]',row=>api.text(row.querySelector('.row-dates'),[scope,'milestone',row.dataset.id,'duration']));
        api.id('ganttSaveCount',scope);
        mark('#ganttSaveResults .gantt-save-result-count',scope,'counts');
      }else if(module==='settings-manager'){
        each('#sec-curve tr.grp',row=>{
          const group=clean(row).match(/^(\d+)-month|^No month count/),curve=group?.[1]||'unset';
          api.text(row.querySelector('.pill'),['settings',s.recId||'', 'curve',curve],'percent');
        });
        each('.card[id^="sec-"] .banner.warn b',node=>{if(/defaults are blank$/.test(clean(node)))api.text(node,['settings',node.closest('.card').id,'blank-defaults']);});
      }
    }});
  }
  global.LMNumberSurfaces=Object.freeze({install});
})(window);
