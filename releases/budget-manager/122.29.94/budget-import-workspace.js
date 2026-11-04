/* Subdivision-scoped import review. Native reads/writes remain owned by the widget adapter. */
(function(global){
  'use strict';
  const SOURCE_KEYS=['budget','hcss','gp'];
  const SOURCE_LABELS={budget:'Construction Budget',hcss:'HCSS Actuals',gp:'GP Actuals'};
  const ELEMENTS=['Labor','Materials','Equipment','Subcontractor','Other'];
  function create(d){
    const S=d.state,ui=S.importUI;
    const root=()=>d.node('vImports');
    const esc=d.escape,attr=d.escapeAttr;
    const text=value=>d.clean(value);
    const numeric=value=>global.BudgetImportLedger.nullableNumber(value);
    const money=value=>value==null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:4}).format(value);
    const icon=name=>name==='close'?'<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8"/></svg>':'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';
    const scope=()=>String(d.scope());
    const selected=()=>text(ui.subdivision);
    const key=()=>scope()+'|'+selected().toLowerCase();
    function data(){const v=S.importWorkspaceData;return d.canView()&&selected()&&v&&v.key===key()?v:null;}
    function rows(){return data()?data().rows:[];}
    function items(){return data()?data().items:[];}
    function groups(input){
      const byId=Object.create(null);items().forEach(item=>{byId[String(item.ID)]=item;});
      return global.BudgetImportLedger.createGroups(input||rows(),{assigned:d.assigned,source:d.source,major:d.major,minor:d.minor,description:d.description,code:d.code,cost:r=>numeric(r.Cost),component:global.BudgetImportLedger.readComponent,itemById:byId,different:d.different});
    }
    function featureKey(){return 'import-workspace:'+key();}
    function active(){return S.view==='vImports'&&d.canView()&&!!selected();}
    function load(force){
      if(!active())return Promise.resolve(null);
      const capturedKey=key(),capturedScope=scope(),subdivision=selected(),feature=featureKey();
      const quoted=subdivision.replace(/\\/g,'\\\\').replace(/"/g,'\\"');
      const options={fresh:!!force,isCancelled:()=>!d.canView()||scope()!==capturedScope};
      const pending=d.loadFeature(feature,()=>Promise.allSettled([
        d.read(d.config.reports.importItems,'(Subdivision_Code == "'+quoted+'")',options),
        d.read(d.config.reports.items,'(Budget.Subdivision_Code == "'+quoted+'")',options)
      ]).then(results=>{
        if(results[0].status==='rejected')throw results[0].reason;
        const importRows=results[0].value||[],itemRows=results[1].status==='fulfilled'?results[1].value||[]:[];
        if(importRows.some(row=>text(d.subCode(row)).toLowerCase()!==subdivision.toLowerCase()))throw new Error('Import rows did not match the selected subdivision.');
        if(itemRows.some(row=>{const code=text(d.itemSubCode(row));return code&&code.toLowerCase()!==subdivision.toLowerCase();}))throw new Error('Budget Items did not match the selected subdivision.');
        return {key:capturedKey,subdivision,rows:importRows,items:itemRows,itemError:results[1].status==='rejected'?results[1].reason:null};
      }),null,!!force);
      render();
      return pending.then(value=>{
        if(active()&&key()===capturedKey&&scope()===capturedScope){S.importWorkspaceData=value;render();d.badge();}
        return value;
      }).catch(error=>{
        if(active()&&key()===capturedKey&&scope()===capturedScope){if(error&&error.permissionDenied)S.importWorkspaceData=null;render();d.badge();}
        throw error;
      });
    }
    function open(){render();return selected()?load(false):Promise.resolve(null);}
    function options(kind){
      if(kind==='subdivision'){
        const seen=new Set();return (S.subdivisions||[]).map(row=>{
          const value=text(row.Subdivision_Code);return {value,label:text(row.Subdivision_Name)||d.subName({Subdivision_Code:value})||value};
        }).filter(v=>v.value&&!seen.has(v.value.toLowerCase())&&seen.add(v.value.toLowerCase())).sort((a,b)=>a.label.localeCompare(b.label));
      }
      if(kind==='sort')return [{value:'code',label:'Budget Code'},{value:'status',label:'Mapping Status'}];
      const accessor=kind==='major'?d.major:kind==='minor'?d.minor:d.source;
      return [...new Set(rows().map(accessor).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).map(value=>({value,label:value}));
    }
    function picker(kind,label,placeholder){
      const opts=options(kind),current=String(ui[kind]||''),choice=opts.find(v=>v.value===current);
      const shown=choice?(kind==='subdivision'?choice.label+' · '+choice.value:choice.label):placeholder;
      return '<div class="il-picker-field"><span class="il-label">'+label+'</span><div class="landing-combo il-picker" data-import-picker="'+kind+'"><button class="landing-combo-toggle" type="button" data-import-picker-toggle="'+kind+'" aria-label="'+label+'" aria-haspopup="listbox" aria-expanded="false"><span class="landing-combo-label">'+esc(shown)+'</span><svg class="landing-combo-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg></button><div class="landing-combo-menu" data-lm-motion="popover"><div class="landing-combo-search"><input data-import-picker-search="'+kind+'" aria-label="Search '+label+'" placeholder="Search '+label+'" autocomplete="off"></div><div class="landing-combo-options" role="listbox" aria-label="'+label+' Options">'+pickerOptions(kind,'')+'</div></div></div></div>';
    }
    function pickerOptions(kind,query){
      const q=query.toLowerCase(),current=String(ui[kind]||'');
      const list=(kind==='subdivision'||kind==='sort'?[]:[{value:'',label:kind==='source'?'All Sources':kind==='major'?'All Majors':'All Minors'}]).concat(options(kind)).filter(v=>(v.label+' '+v.value).toLowerCase().includes(q));
      return list.length?list.map(v=>'<button type="button" class="landing-combo-option'+(current===v.value?' selected':'')+'" data-import-picker-option="'+kind+'" data-value="'+attr(v.value)+'" role="option" aria-selected="'+(current===v.value)+'"><span class="landing-combo-option-text">'+esc(v.label+(kind==='subdivision'?' · '+v.value:''))+'</span></button>').join(''):'<div class="landing-combo-empty">No Matches</div>';
    }
    function controls(){
      const subdivision=d.node('importsSubdivisionWrap');
      if(subdivision)subdivision.innerHTML=picker('subdivision','Subdivision','Select A Subdivision')+'<button class="il-clear" type="button" data-import-clear aria-label="Clear Subdivision" '+(!selected()?'disabled':'')+'>'+icon('close')+'</button>';
      const filters=d.node('importsFilters');
      if(filters)filters.innerHTML=data()?picker('major','Major','All Majors')+picker('minor','Minor','All Minors')+picker('source','Has Source','All Sources')+picker('sort','Sort','Budget Code'):'';
      const toolbar=d.node('importsToolbar');if(toolbar)toolbar.hidden=!data();
      ['Missing','Different'].forEach(kind=>{const btn=d.node('importFilter'+kind);if(btn){const on=kind==='Missing'?!!ui.missingOnly:!!ui.differentOnly;btn.dataset.on=on?'1':'0';btn.setAttribute('aria-pressed',String(on));}});
    }
    function filtered(){
      const q=text(ui.search).toLowerCase();
      return groups().filter(group=>{
        if(ui.missingOnly&&!group.missing)return false;
        if(ui.differentOnly&&!group.different)return false;
        return group.records.some(row=>(!ui.major||d.major(row)===ui.major)&&(!ui.minor||d.minor(row)===ui.minor)&&(!ui.source||d.source(row)===ui.source)&&(!q||[group.label,group.code,d.code(row),d.description(row),d.major(row),d.minor(row),d.source(row)].join(' ').toLowerCase().includes(q)));
      }).sort((a,b)=>ui.sort==='status'?(Number(b.missing)-Number(a.missing)||Number(b.different)-Number(a.different)||a.code.localeCompare(b.code)):a.code.localeCompare(b.code,undefined,{numeric:true}));
    }
    function count(value,keyName){return '<span data-import-number="'+attr(keyName)+'">'+value+'</span>';}
    function number(value,keyName){return '<span class="il-number" data-import-number="'+attr(keyName)+'">'+money(value)+'</span>';}
    function matrix(group,stored){
      const item=group.item,columns=SOURCE_KEYS.map(k=>({key:k,label:stored&&k==='budget'?'Final Budget':SOURCE_LABELS[k],source:group.sources[k]}));
      if(!stored)(group.otherSources||[]).forEach((s,i)=>columns.push({key:'extra'+i,label:s.label||s.source,source:s}));
      const value=(column,element)=>stored?numeric(item&&item[column.key==='budget'?element+'_Budget':(column.key==='hcss'?'HCSS':'GP')+'_'+element+'_Actuals']):column.source?column.source.elements[element]:null;
      return '<div class="il-table-wrap"><table class="il-elements"><thead><tr><th>Cost Element</th>'+columns.map(c=>'<th class="r">'+esc(c.label)+'</th>').join('')+'</tr></thead><tbody>'+ELEMENTS.map(e=>'<tr><th scope="row">'+e+(e==='Other'?'<small>HCSS: Misc 1</small>':'')+'</th>'+columns.map(c=>'<td class="r">'+number(value(c,e),group.key+'|matrix|'+c.key+'|'+e)+'</td>').join('')+'</tr>').join('')+'<tr class="il-total"><th scope="row">'+(stored?'Stored Total':'Source Total')+'</th>'+columns.map(c=>'<td class="r">'+number(stored?numeric(item&&item[c.key==='budget'?'Budget_Ttl':c.key==='hcss'?'HCSS_Actuals':'PROJ_Actual']):c.source?c.source.total:null,group.key+'|matrix|'+c.key+'|total')+'</td>').join('')+'</tr></tbody></table></div>';
    }
    function field(label,value,keyName){return '<div><dt>'+label+'</dt><dd'+(keyName?' data-import-number="'+attr(keyName)+'"':'')+'>'+esc(value==null||value===""?'—':value)+'</dd></div>';}
    function record(row){
      const lookup=d.assigned(row),assigned=lookup&&lookup.id?lookup:null,id=String(row.ID),canAssign=d.canEdit()&&data()&&!data().itemError;
      return '<details class="il-record" data-import-record="'+attr(id)+'"><summary><span>'+esc(d.source(row)||'Unspecified Source')+'</span><code>'+esc(d.code(row))+'</code>'+number(numeric(row.Cost),'record|'+id+'|Cost')+'</summary><dl class="il-fields">'+field('Import Code',d.code(row))+field('Original Description',d.description(row))+field('Subdivision',d.subCode(row))+field('Major Code',d.major(row))+field('Minor Code',d.minor(row))+field('Data Source',d.source(row))+field('Source Total',money(numeric(row.Cost)),'record|'+id+'|Cost|field')+ELEMENTS.map(e=>field(e,money(global.BudgetImportLedger.readComponent(row,e)),'record|'+id+'|'+e)).join('')+field('Percent Complete',numeric(row.Percent_Complete)==null?'—':String(numeric(row.Percent_Complete))+'%')+field('Cost To Complete',money(numeric(row.Cost_to_Complete)),'record|'+id+'|Cost_to_Complete')+field('External Cost Code ID',text(row.Cost_Code_ID))+field('Updated Date',text(row.Updated_Date))+field('Import Status',text(row.Import_Status))+field('Error Response',text(row.Error_Response))+'</dl><div class="il-record-mapping"><span class="il-label">Budget Item</span><div class="imp-assign-cell" data-imp-id="'+attr(id)+'">'+d.assignHtml(row,assigned,!assigned,!!canAssign)+'</div></div></details>';
    }
    function groupHtml(group){
      const open=!!(ui.expanded&&ui.expanded[group.key]),stored=!!(ui.stored&&ui.stored[group.key]),status=group.missing?'Unassigned':group.different?'Code Differs':'Assigned';
      const item=group.item,progress=numeric(item&&item.Percent_Complete),ctc=numeric(item&&item.Cost_to_Complete);
      return '<details class="il-line" data-import-ledger-key="'+attr(group.key)+'" '+(open?'open':'')+'><summary class="il-line-summary"><span class="il-identity">'+icon('chevron')+'<span><strong>'+esc(group.label||group.code||'Imported Line')+'</strong><small><code>'+esc(group.code||'—')+'</code> · '+count(group.records.length,group.key+'|record-count')+' Import Record'+(group.records.length===1?'':'s')+((group.otherSources||[]).length?' · Additional Sources':'')+'</small></span></span>'+SOURCE_KEYS.map(k=>'<span class="il-source-amount" data-label="'+SOURCE_LABELS[k]+'">'+number(group.sources[k]?group.sources[k].total:null,group.key+'|'+k+'|total')+'</span>').join('')+'<span class="il-status '+(group.missing||group.different?'warn':'ok')+'">'+status+'</span></summary><div class="il-line-body"><div class="il-detail-head"><h3>Element Breakdown</h3><div class="il-segments" data-lm-motion="tabs" role="tablist" aria-label="Element Records"><button type="button" role="tab" aria-selected="'+!stored+'" data-import-matrix="import" data-key="'+attr(group.key)+'">Imported</button><button type="button" role="tab" aria-selected="'+stored+'" data-import-matrix="stored" data-key="'+attr(group.key)+'">Budget Item</button></div></div><div data-lm-motion="panel">'+matrix(group,stored)+'</div><p class="il-caption">Source totals are independent of the five element amounts.</p><div class="il-progress"><span>Budget Item Progress <b data-import-number="'+attr(group.key+'|stored|Percent_Complete')+'">'+esc(progress==null?'—':progress+'%')+'</b></span><span>Cost To Complete '+number(ctc,group.key+'|stored|Cost_to_Complete')+'</span></div><details class="il-original"><summary>Original Import Records <small>'+count(group.records.length,group.key+'|original-record-count')+'</small></summary>'+group.records.map(record).join('')+'</details></div></details>';
    }
    function loading(){return '<div class="il-loading" role="status"><div class="il-loading-card"><span class="il-loading-emblem"><span class="il-loading-ring" aria-hidden="true"></span></span><strong>Loading Import Items…</strong></div></div>';}
    function empty(title,action){return '<div class="il-empty"><strong>'+title+'</strong>'+(action||'')+'</div>';}
    function render(){
      const host=d.node('importsTableWrap');if(!host)return;
      if(!d.canView()){S.importWorkspaceData=null;host.innerHTML=empty('Import Items Unavailable');const stats=d.node('importsStats');if(stats)stats.innerHTML='';return;}
      controls();const current=data(),state=selected()?d.feature(featureKey()):null;
      host.setAttribute('aria-busy',String(!!(state&&state.status==='loading')));
      const stats=d.node('importsStats'),allGroups=groups();
      if(stats)stats.innerHTML=current?'<span><b data-import-number="stats|records">'+rows().length+'</b> Import Records</span><span><b data-import-number="stats|mapped">'+allGroups.filter(g=>!g.missing).length+'</b> Mapped Lines</span><span class="il-review"><b data-import-number="stats|review">'+allGroups.filter(g=>g.missing||g.different).length+'</b> Need Review</span>':'';
      const missing=d.node('importMissingCt');if(missing){missing.setAttribute('data-import-number','filter|missing-count');missing.textContent=rows().filter(r=>{const a=d.assigned(r);return !a||!a.id;}).length;}
      const retry='<button class="btn" type="button" data-import-retry>Retry</button>';
      if(!selected()){host.innerHTML=empty('Select A Subdivision To View Import Items');return;}
      if(!current){host.innerHTML=state&&state.status==='error'?empty('Import Items Could Not Be Loaded',retry):loading();return;}
      const visible=filtered(),majors=[...new Set(visible.map(g=>g.major||''))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
      let html=current.itemError?'<div class="il-notice" role="status">Budget Item Details Unavailable '+retry+'</div>':'';
      if(state.status==='loading')html+='<div class="il-caption" role="status">Refreshing Import Items…</div>';
      if(state.status==='error')html+='<div class="il-notice" role="status">Refresh Failed. Showing Previous Data. '+retry+'</div>';
      html+=visible.length?majors.map(major=>{const list=visible.filter(g=>(g.major||'')===major);return '<section class="il-major"><header><h3>'+esc(major?'Major Code '+major:'Unspecified Major')+'</h3><small>'+count(list.length,'major|'+major+'|line-count')+' Line'+(list.length===1?'':'s')+'</small></header><div class="il-column-head"><span>Budget Item / Imported Line</span><span>Construction Budget</span><span>HCSS Actuals</span><span>GP Actuals</span><span>Mapping</span></div>'+list.map(groupHtml).join('')+'</section>';}).join(''):empty(rows().length?'No Matching Import Items':'No Import Items For This Subdivision');
      html+='<div class="il-footer"><span>'+count(visible.length,'visible|line-count')+' Lines · '+selected()+' Only</span><span>— No Value · $0.00 Reported Zero</span></div>';
      const focus=document.activeElement,focusKey=focus&&focus.dataset&&focus.dataset.importMatrix,focusGroup=focus&&focus.dataset&&focus.dataset.key;
      const scroll=host.closest('.main'),top=scroll?scroll.scrollTop:0;
      host.innerHTML=html;if(scroll)scroll.scrollTop=top;
      if(focusKey){const replacement=[...host.querySelectorAll('[data-import-matrix]')].find(b=>b.dataset.importMatrix===focusKey&&b.dataset.key===focusGroup);if(replacement)replacement.focus({preventScroll:true});}
    }
    function toggleFilter(kind){if(!active())return Promise.resolve();if(kind==='missing'){ui.missingOnly=!ui.missingOnly;ui.differentOnly=false;}else{ui.differentOnly=!ui.differentOnly;ui.missingOnly=false;}render();return Promise.resolve();}
    function closePickers(except){root().querySelectorAll('[data-import-picker].open').forEach(p=>{if(p!==except){p.classList.remove('open');p.querySelector('button').setAttribute('aria-expanded','false');}});}
    function onClick(event){
      const target=event.target.closest('[data-import-picker-toggle],[data-import-picker-option],[data-import-clear],[data-import-retry],[data-import-matrix]');
      if(!target){if(!event.target.closest('[data-import-picker]'))closePickers();return;}
      if(target.hasAttribute('data-import-picker-toggle')){const picker=target.closest('[data-import-picker]'),open=picker.classList.contains('open');closePickers(picker);picker.classList.toggle('open',!open);target.setAttribute('aria-expanded',String(!open));if(!open)picker.querySelector('input').focus();}
      if(target.hasAttribute('data-import-picker-option')){
        const kind=target.dataset.importPickerOption;ui[kind]=target.dataset.value;closePickers();
        if(kind==='subdivision'){S.importWorkspaceData=null;ui.search='';ui.major='';ui.minor='';ui.source='';ui.missingOnly=false;ui.differentOnly=false;ui.expanded={};ui.stored={};const search=d.node('importSearch');if(search)search.value='';load(false).catch(d.onError);}else render();
        root().querySelector('[data-import-picker-toggle="'+kind+'"]').focus({preventScroll:true});
      }
      if(target.hasAttribute('data-import-clear')){ui.subdivision='';S.importWorkspaceData=null;closePickers();render();d.badge();}
      if(target.hasAttribute('data-import-retry'))load(true).catch(d.onError);
      if(target.hasAttribute('data-import-matrix')){
        const stored=target.dataset.importMatrix==='stored',group=groups().find(g=>g.key===target.dataset.key),line=target.closest('.il-line');
        (ui.stored||(ui.stored={}))[target.dataset.key]=stored;
        if(group&&line){line.querySelectorAll('[data-import-matrix]').forEach(button=>button.setAttribute('aria-selected',String((button.dataset.importMatrix==='stored')===stored)));line.querySelector('[data-lm-motion="panel"]').innerHTML=matrix(group,stored);}
      }
    }
    function init(){
      const surface=root();if(!surface)return;
      surface.addEventListener('click',onClick);
      surface.addEventListener('input',event=>{const kind=event.target.dataset.importPickerSearch;if(kind)event.target.closest('[data-import-picker]').querySelector('.landing-combo-options').innerHTML=pickerOptions(kind,event.target.value);});
      surface.addEventListener('toggle',event=>{if(event.target.matches('.il-line'))(ui.expanded||(ui.expanded={}))[event.target.dataset.importLedgerKey]=event.target.open;},true);
      surface.addEventListener('keydown',event=>{
        if(event.key==='Escape'){const picker=event.target.closest('[data-import-picker]');closePickers();if(picker)picker.querySelector('button').focus();}
        if(event.key==='ArrowDown'||event.key==='ArrowUp'){const picker=event.target.closest('[data-import-picker].open');if(!picker)return;const buttons=[...picker.querySelectorAll('[role="option"]')];if(!buttons.length)return;event.preventDefault();let i=buttons.indexOf(document.activeElement);i=(i+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[i].focus();}
      });
    }
    init();return {load,open,rows,items,groups,render,toggleFilter,current:data};
  }
  global.BudgetImportWorkspace={create};
})(window);
