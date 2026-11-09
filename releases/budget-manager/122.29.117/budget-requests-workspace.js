/* Global read-only index. Native readers, permissions and record actions stay in the host. */
(function(root){
  'use strict';
  const groups=[['date','Date'],['project','Project'],['territory','Territory'],['type','Request Type'],['status','Status'],['none','None']];
  const types=[['Purchase Order','Purchase Orders'],['Check','Checks'],['Wire','Wires'],['Bud Mod','Bud Mods']];
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function compare(a,b,order){
    const knownA=Number.isFinite(a.rank),knownB=Number.isFinite(b.rank);
    if(knownA!==knownB)return knownA?-1:1;
    const sign=order==='oldest'?1:-1;
    if(knownA&&a.rank!==b.rank)return sign*(a.rank-b.rank);
    const left=String(a.record.ID),right=String(b.record.ID);
    return sign*(left.length-right.length||left.localeCompare(right))||a.budgetId.localeCompare(b.budgetId);
  }
  function select(entries,ui){
    const q=ui.search.trim().toLowerCase();
    return entries.filter(e=>(!ui.types.length||ui.types.includes(e.type)||ui.types.includes('Bud Mod')&&e.children.length>0)&&(!ui.statuses.length||ui.statuses.includes(e.status))&&(!q||e.search.toLowerCase().includes(q))).sort((a,b)=>compare(a,b,ui.order));
  }
  function bucket(entries,by){
    const map=new Map();
    entries.forEach(entry=>{
      let key,label;
      if(by==='date'){
        key=Number.isFinite(entry.rank)?new Date(entry.rank).toISOString().slice(0,10):'unknown';
        label=key==='unknown'?'Date Unavailable':new Date(entry.rank).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
      }else if(by==='none'){key='all';label='All Requests';}
      else{key=entry[by+'Key']||entry[by]||'unknown';label=entry[by]||'Unavailable';}
      if(!map.has(key))map.set(key,{key,label,entries:[]});
      map.get(key).entries.push(entry);
    });
    const result=[...map.values()];
    // Date buckets follow chronological ordering; named groups follow established alphabetical grouping.
    if(!['date','none'].includes(by))result.sort((a,b)=>a.label.localeCompare(b.label,undefined,{numeric:true,sensitivity:'base'})||a.key.localeCompare(b.key));
    return result;
  }
  function create(options){
    const host=options.host,ui={search:'',by:'date',order:'newest',types:[],statuses:[]};
    let state={scope:'',status:'idle',generation:0,done:0,total:0,failed:[],loaded:[],mods:false,error:''},pending=null;
    let menu='',query='',actionBusy=false,retained=[];
    const closed=new Set();
    const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
    const scopeCurrent=()=>state.scope===options.scope();
    function entries(){if(!scopeCurrent())return [];if(state.status!=='loading')retained=options.entries(state.loaded,state.mods);return retained;}
    function choices(kind,rows){
      if(kind==='by')return groups;
      if(kind==='order')return [['newest','Newest First'],['oldest','Oldest First']];
      if(kind==='types')return types;
      if(kind==='phase')return options.phases();
      return [...new Set(rows.map(e=>e.status))].sort().map(value=>[value,value]);
    }
    function picker(kind,label,rows){
      const multi=kind==='types'||kind==='statuses',selected=multi?ui[kind]:[ui[kind]],items=choices(kind,rows);
      const title=kind==='phase'?'New Request':multi?(selected.length?selected.length+' Selected':'All '+label):items.find(pair=>pair[0]===ui[kind])?.[1]||label;
      return '<div class="landing-combo requests-picker '+(menu===kind?'open':'')+'" data-requests-picker="'+kind+'"><button class="landing-combo-toggle '+(kind==='phase'?'requests-new':'')+'" type="button" data-requests-toggle="'+kind+'" aria-haspopup="listbox" aria-expanded="'+(menu===kind)+'"><span>'+esc(title)+'</span>'+icon+'</button><div class="landing-combo-menu" data-lm-motion="popover"><div class="landing-combo-search"><input type="search" data-requests-picker-search="'+kind+'" aria-label="Search '+esc(label)+'" placeholder="Search '+esc(label.toLowerCase())+'…" value="'+esc(menu===kind?query:'')+'" autocomplete="off"></div><div class="landing-combo-options" role="listbox" aria-label="'+esc(label)+'"'+(multi?' aria-multiselectable="true"':'')+'>'+pickerOptions(kind,rows)+'</div></div></div>';
    }
    function pickerOptions(kind,rows){
      const multi=kind==='types'||kind==='statuses',selected=multi?ui[kind]:[ui[kind]],items=choices(kind,rows).filter(pair=>!query||pair[1].toLowerCase().includes(query.toLowerCase()));
      const mark='<span class="check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></span>';
      const option=(value,label,on)=>'<button class="landing-combo-option'+(on?' selected':'')+'" type="button" role="option" aria-selected="'+on+'" data-requests-option="'+esc(value)+'" data-requests-kind="'+kind+'">'+mark+'<span class="landing-combo-option-text">'+esc(label)+'</span></button>';
      return (multi?option('__all__','All '+(kind==='types'?'Types':'Statuses'),!selected.length):'')+items.map(pair=>option(pair[0],pair[1],selected.includes(pair[0]))).join('')||'<div class="requests-no-options">No matches</div>';
    }
    function coverage(){return state.status==='loading'?'Reading Requests · <strong data-requests-number="phases-done">'+state.done+'</strong> / <strong data-requests-number="phases-total">'+state.total+'</strong> Phases':'<strong data-requests-number="phases-loaded">'+state.loaded.length+'</strong> Phases';}
    function render(){
      if(!scopeCurrent()){host.replaceChildren();return;}
      const rows=entries(),visible=select(rows,ui),sections=bucket(visible,ui.by),linked=visible.reduce((n,e)=>n+e.children.length,0);
      const focus=document.activeElement,searchFocused=focus?.id==='allRequestsSearch',caret=searchFocused?focus.selectionStart:null;
      const busy=state.status==='loading';
      host.innerHTML='<div class="requests-workspace"><div class="requests-heading"><div><div class="requests-eyebrow">Budget Manager</div><h1>Requests</h1></div><div class="requests-heading-actions"><button type="button" class="btn" data-requests-refresh'+(busy?' disabled':'')+'>'+ (busy?'Loading…':'Refresh')+'</button>'+picker('phase','Phases',rows)+'</div></div><div class="requests-toolbar"><label class="budget-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input id="allRequestsSearch" type="search" aria-label="Search Requests" placeholder="Search requests, projects, or phases…" value="'+esc(ui.search)+'"></label><div class="requests-control"><span>Group By</span>'+picker('by','Grouping',rows)+'</div><div class="requests-control"><span>Type</span>'+picker('types','Types',rows)+'</div><div class="requests-control"><span>Status</span>'+picker('statuses','Statuses',rows)+'</div><div class="requests-control requests-order"><span>Order</span>'+picker('order','Order',rows)+'</div></div><div class="requests-caption"><span><strong data-requests-number="visible">'+visible.length+'</strong> Requests <span class="requests-dot">·</span> <strong data-requests-number="linked">'+linked+'</strong> Linked Bud Mods</span>'+((ui.search||ui.types.length||ui.statuses.length)?'<button type="button" class="requests-clear" data-requests-clear>Clear Filters</button>':'')+'<span class="requests-coverage" role="status" data-state="'+state.status+'">'+coverage()+'</span></div><div class="requests-notices">'+(state.error?'<div class="requests-warning" role="status">Bud Mods Unavailable. <button type="button" data-requests-refresh>Retry</button></div>':'')+(state.failed.length?'<div class="requests-warning" role="status">Requests unavailable for '+state.failed.length+' phase'+(state.failed.length===1?'':'s')+'. <button type="button" data-requests-refresh>Retry</button></div>':'')+(state.loaded.some(id=>options.reportDenied(id))?'<div class="requests-warning" role="status">Check / wire requests unavailable for this profile in some phases.</div>':'')+'</div><div id="allRequestsGroups" class="requests-groups" aria-busy="'+busy+'">'+(busy&&!rows.length?'<div class="requests-empty" role="status"><span class="requests-loading-dot"></span>Loading Requests…</div>':!visible.length?'<div class="requests-empty">'+(rows.length?'No Matching Requests':state.failed.length||state.error?'Requests Unavailable':'No Requests Available')+'</div>':sections.map(section=>'<details class="requests-section" data-request-section="'+esc(ui.by+':'+section.key)+'" open><summary><span class="requests-group-chevron">'+icon+'</span><strong>'+esc(section.label)+'</strong><span class="requests-group-count" data-requests-number="group:'+esc(ui.by+':'+section.key)+'">'+section.entries.length+'</span></summary><div class="request-rail-scroll"><ol class="request-rail-list" aria-label="'+esc(section.label)+'">'+section.entries.map(entry=>'<li class="request-rail-group" data-request-key="'+esc(entry.budgetId+':'+entry.kind+':'+entry.record.ID)+'" data-request-budget="'+esc(entry.budgetId)+'"><div class="requests-row-context"><button type="button" data-requests-open-phase="'+esc(entry.budgetId)+'" title="Open Phase Requests">'+esc(entry.project)+'<span>/</span>'+esc(entry.phase)+'</button><span>'+esc(entry.territory)+'</span></div>'+options.renderGroup(entry)+'</li>').join('')+'</ol></div></details>').join(''))+'</div></div>';
      host.querySelectorAll('[data-request-section]').forEach(node=>{if(closed.has(node.dataset.requestSection))node.open=false;});
      if(searchFocused){const input=host.querySelector('#allRequestsSearch');input.focus({preventScroll:true});try{input.setSelectionRange(caret,caret);}catch{}}
    }
    async function load(fresh){
      const key=options.scope();
      if(state.scope&&key!==state.scope)fresh=true;
      if(key!==state.scope){state={scope:key,status:'idle',generation:state.generation+1,done:0,total:0,failed:[],loaded:[],mods:false,error:''};pending=null;retained=[];closed.clear();host.replaceChildren();}
      if(pending)return pending;
      if(!fresh&&state.status==='loaded'){render();return;}
      const generation=++state.generation,budgets=options.budgets().slice();
      state.status='loading';state.done=0;state.total=budgets.length;state.failed=[];state.error='';menu='';
      const current=()=>scopeCurrent()&&generation===state.generation;
      render();
      pending=(async()=>{
        const loaded=[],failed=[];let next=0;
        const mods=Promise.resolve().then(()=>options.loadMods(fresh)).then(()=>true,error=>{if(current())state.error=String(error.message||error);return false;});
        async function worker(){
          for(;next<budgets.length&&current();){
            const budget=budgets[next++];
            try{await options.loadBudget(String(budget.ID),fresh);if(current())loaded.push(String(budget.ID));}
            catch(error){if(current()){failed.push(String(budget.ID));state.failed=failed.slice();retained=retained.filter(entry=>entry.budgetId!==String(budget.ID));if(options.visible())render();}}
            if(current()){state.done++;if(options.visible()){const coverageNode=host.querySelector('.requests-coverage');if(coverageNode)coverageNode.innerHTML=coverage();}}
          }
        }
        const results=await Promise.all([mods,...Array.from({length:Math.min(3,budgets.length)},worker)]);
        if(!current())return;
        state.loaded=loaded;state.failed=failed;state.mods=results[0];state.status='loaded';
        if(options.visible())render();
      })().finally(()=>{if(current())pending=null;});
      return pending;
    }
    host.addEventListener('input',event=>{
      if(event.target.id==='allRequestsSearch'){ui.search=event.target.value;render();}
      if(event.target.matches('[data-requests-picker-search]')){query=event.target.value;event.target.closest('.requests-picker').querySelector('.landing-combo-options').innerHTML=pickerOptions(event.target.dataset.requestsPickerSearch,entries());}
    });
    host.addEventListener('toggle',event=>{const node=event.target;if(node.isConnected&&node.dataset.requestSection){if(node.open)closed.delete(node.dataset.requestSection);else closed.add(node.dataset.requestSection);}},true);
    host.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&menu){const button=host.querySelector('[data-requests-toggle="'+menu+'"]');menu='';query='';render();host.querySelector('[data-requests-toggle="'+button.dataset.requestsToggle+'"]')?.focus();event.stopPropagation();}
      if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)&&event.target.closest('.requests-picker')){
        const pickerNode=event.target.closest('.requests-picker'),kind=pickerNode.dataset.requestsPicker;
        if(menu!==kind){menu=kind;query='';render();}
        const items=[...host.querySelectorAll('[data-requests-picker="'+kind+'"] [role="option"]')];if(!items.length)return;
        const index=items.indexOf(document.activeElement);items[event.key==='End'?items.length-1:event.key==='Home'?0:(index+(event.key==='ArrowUp'?-1:1)+items.length)%items.length].focus();event.preventDefault();
      }
    });
    host.addEventListener('click',event=>{
      const toggle=event.target.closest('[data-requests-toggle]'),option=event.target.closest('[data-requests-option]');
      if(toggle){const kind=toggle.dataset.requestsToggle;menu=menu===kind?'':kind;query='';render();if(menu)host.querySelector('[data-requests-picker-search="'+kind+'"]')?.focus();return;}
      if(option){const kind=option.dataset.requestsKind,value=option.dataset.requestsOption;if(kind==='phase'){menu='';options.openPhase(value,true);return;}
        if(kind==='types'||kind==='statuses')ui[kind]=value==='__all__'?[]:ui[kind].includes(value)?ui[kind].filter(v=>v!==value):[...ui[kind],value];else{ui[kind]=value;menu='';}query='';render();host.querySelector('[data-requests-toggle="'+kind+'"]')?.focus();return;}
      if(event.target.closest('[data-requests-refresh]')){load(true);return;}
      if(event.target.closest('[data-requests-clear]')){ui.search='';ui.types=[];ui.statuses=[];render();return;}
      const phase=event.target.closest('[data-requests-open-phase]');if(phase){options.openPhase(phase.dataset.requestsOpenPhase,false);return;}
      const action=event.target.closest('button[data-request-po-open],button[data-request-po-approvals],button[data-request-po-download],button[data-request-attachments],button[data-request-payment-open],button[data-request-po-children-retry],button[data-moddetail],button[data-modsubmit],button[data-modreopen],button[data-modresend],button[data-modedit],button[data-moddelete]');
      if(action){event.stopPropagation();if(actionBusy||!scopeCurrent())return;const bid=action.closest('[data-request-budget]').dataset.requestBudget;actionBusy=true;action.disabled=true;Promise.resolve(options.openAction(bid,action)).catch(options.onError).finally(()=>{actionBusy=false;if(action.isConnected)action.disabled=false;});}
    });
    document.addEventListener('click',event=>{if(menu&&!event.target.closest('.requests-picker')){menu='';query='';if(options.visible())render();}});
    return {open:()=>load(false),refresh:()=>load(true),render,ui,state:()=>state};
  }
  root.LMBudgetRequests={create,select,bucket,compare};
})(typeof window==='undefined'?globalThis:window);
