/* Explicit quantitative surfaces only. Calendar dates, identifiers and editable inputs stay native. */
(function (global) {
  'use strict';
  global.PFNumberViews = function (getState, getMonthIndex) {
    const N = global.PFNumbers, $ = id => document.getElementById(id);
    const scope = side => {const state = getState()[side]; return N.key(side, state?.id || N.identity(state?.model));};
    const each = (selector, visit, root = document) => root?.querySelectorAll(selector).forEach(visit);
    const text = (node, id, mode, context) => N.decorate(node, N.key(id), mode, context);
    function list() {
      ['pfCount','pfCount2','pfApprCount'].forEach(id => text($(id), ['list',id]));
      each('#listBody tr[data-id]', row => each('td.num.mono', (cell,i) => text(cell,['list',row.dataset.id,i]), row));
      each('#listBody .grp-row', row => text(row.querySelector('.grp-n'),['territory',row.querySelector('.grp-name')?.textContent]));
      each('.msel-btn[data-msel]', button=>{
        const selected=button.dataset.msel==='territory'?getState().fTerritories:getState().fProbs;
        if(selected?.length>1){text(button.querySelector('.msel-txt'),['filter',button.dataset.msel,'selected']);text(button.querySelector('.msel-n'),['filter',button.dataset.msel,'badge']);}
      });
      badges();
    }
    function badges() {
      each('.rec-comment-count,.pf-attachment-count', node => {
        const button=node.closest('[data-actid],[data-comment-pf],[data-attachment-pf]');
        if(button)text(node,['badge',button.dataset.actid||button.dataset.commentPf||button.dataset.attachmentPf,button.className,node.className]);
      });
    }
    function heavy() {
      const s=scope('dash'), state=getState().dash;
      each('#beBody .be-row[data-hrjump]', row => {
        text(row.querySelector('b'),[s,'headroom',row.dataset.hrjump,'bound'],'money',state.hrMetric||'');
        text(row.querySelector('i'),[s,'headroom',row.dataset.hrjump,'room'],'money',state.hrMetric||'');
      });
      each('#tornBody .sens-row', row => each('.sens-val',(node,i)=>text(node,[s,'sensitivity',row.querySelector('.sens-driver-text b')?.textContent,i]),row));
    }
    function dashboard() {
      const s=scope('dash');
      each('#kpis .k-big', (node,i) => text(node,[s,'kpi',i]));
      each('#kpis .returns-columns .k-list', node => text(node,[s,'returns'],'ratio'));
      each('#kpis .k-rows>div', row => text(row.lastElementChild,[s,'component',row.firstElementChild?.textContent],'money'));
      each('#kpis .cash-position-columns .k-list', (node,i) => text(node,[s,'cash-position',i],'money'));
      // Mth is a derived duration; the calendar month/year beside it stays static.
      const positive=document.querySelector('.cash-position-secondary .k-list');
      if(positive && /^Mth \d+/.test(positive.textContent)) {
        const first=positive.firstChild;
        if(first?.nodeType===3){const match=first.data.match(/^Mth (\d+)/); if(match){const span=document.createElement('span');span.textContent=match[1];first.replaceWith(document.createTextNode('Mth '),span,document.createTextNode(first.data.slice(match[0].length)));text(span,[s,'positive-cash-month']);}}
      }
      each('#assump .a-row', row => {const label=row.querySelector('label')?.textContent;if(!/^(Project Start|Land Purchase|Engineering Start|Construction Start|Estimated Lot Sale Start|Estimated Completion)$/.test(label))text(row.querySelector('b'),[s,'assumption',label]);});
      each('#dealRoom .scenario-badge', node => text(node,[s,'scenario-count']));
      each('#dealRoom .ds-item', row => {const label=row.querySelector('span')?.textContent;text(row.querySelector('b'),[s,'delta',label,'value']);text(row.querySelector('.dd'),[s,'delta',label,'change']);});
      each('#dealRoom .cmp tbody tr', row => {
        const headers=[...row.closest('table').querySelectorAll('thead th')];
        [...row.cells].slice(1).forEach((cell,i)=>text(cell,[s,'comparison',row.cells[0].textContent,headers[i+1]?.querySelector('.pin-h')?.textContent||headers[i+1]?.textContent]));
      });
      const columns=[...document.querySelectorAll('#flowHead tr:first-child th')].slice(2).map(node=>node.innerText);
      let section='';
      each('#flowBody tr', row => {
        if(row.classList.contains('mth'))return;
        const label=row.cells[0]?.textContent;
        if(row.classList.contains('sect')){section=label;return;}
        [...row.cells].slice(1).forEach((cell,i)=>text(cell,[s,'flow',getState().dash.tab,section,row.dataset.xbucket||row.dataset.xof||'',label,i===0?'total':columns[i-1]]));
      });
      heavy();
    }
    function editor() {
      const state=getState().ed, m=state?.model; if(!m)return;
      const s=scope('ed'), phase=N.identity((m.phaseSales||[])[state.phaseSelected||0]);
      each('#vEdit [id^="lv"]', node=>{if(node.id!=='lvPane')text(node,[s,'live',node.id]);});
      each('#vEdit [data-calc]', node => {if(!/^(engineeringStart|constructionStart|lotSaleStart|estimatedCompletion)$/.test(node.dataset.calc)&&node.tagName!=='INPUT')text(node,[s,'calculated',node.closest('[data-pane]')?.dataset.pane||'header',node.dataset.calc]);});
      ['curveTotal','purchPill','salePill','pidPill','loiTotalAcres','loiEstimatedPrice','loiAcreHint','loiPriceHint'].forEach(id=>text($(id),[s,id]));
      text(document.querySelector('#loiStatusBox>b'),[s,'loi-status']);
      each('#vEdit .ps-nav [data-ps-select]', button => text(button.querySelector('small:not(.ps-card-window)'),[s,'phase-nav',N.identity((m.phaseSales||[])[Number(button.dataset.psSelect)])]));
      each('#vEdit .ps-balance', node=>text(node,[s,'phase-allocation']));
      each('#vEdit .ps-phase-detail,#vEdit [data-ps-base-price],#vEdit [data-ps-marked-price]', (node,i)=>text(node,[s,phase,'phase-detail',i]));
      each('#vEdit .ps-milestone', row=>{
        const title=row.querySelector('.ps-milestone-title')?.textContent.split(' (')[0];
        each('b,small,.ps-delay-badge', (node,i)=>text(node,[s,phase,'milestone',title,i]),row);
      });
      each('#vEdit .ps-summary-total>span', (node,i)=>text(node,[s,phase,'sales-summary',i]));
      each('#vEdit .ps-summary-foot', node=>text(node,[s,phase,'escalator'],'ratio'));
      each('#vEdit .ps-final-price-row', row=>text(row.querySelector('b'),[s,phase,'final-price',row.querySelector('span')?.textContent]));
      each('#vEdit .ps-final-price-change', (node,i)=>text(node,[s,phase,'price-change',i]));
      each('#vEdit .loi-need-chip:not(.ok)', node=>text(node,[s,'loi-missing',node.closest('[data-loi-sect]')?.dataset.loiSect]));
      each('#vEdit input[data-mixprice]', input=>N.readonly(input,N.key(s,'lotmix',N.identity(m.lotMix[Number(input.dataset.mixprice)]),'price')));
      each('#vEdit tr[data-kind="item"]', row=>{const input=row.querySelector('input[data-ik="Add_l_Cost"][readonly]');if(input)N.readonly(input,N.key(s,'item',N.identity(m.items[Number(row.dataset.i)]),'cost'));});
      each('#monthsPane table', (table,t)=> {
        const headers=[...table.querySelectorAll('thead th')].map(node=>node.textContent);
        each('tbody tr', row=>[...row.cells].forEach((cell,i)=>{
          if(i===0||headers[i]==='Date'||headers[i]==='Esc Start Date'||['CPh','EPh','LPh'].includes(headers[i]))return;
          text(cell,[s,'preview',t,row.cells[0].textContent,t===1?[2,3,4].map(j=>row.cells[j]?.textContent):'',headers[i]]);
        }),table);
      });
    }
    function months() {const state=getState().ed; text($('moSummary'),[scope('ed'),'selected-months',N.identity(state?.model?.items[getMonthIndex()])]);}
    const decorators={list,editor,dashboard,heavy,badges,months};
    const roots={list:()=>document,editor:()=>$('vEdit'),dashboard:()=>$('vDash'),heavy:()=>$('vDash'),badges:()=>document,months:()=>$('moModal')};
    // A render may call several child renderers. One outer frame retains their old values.
    let depth=0, pendingHeavy=null;
    function wrap(fn, group, carryHeavy = false) {
      return function () {
        if(depth++){try{return fn.apply(this,arguments);}finally{depth--;}}
        const root=roots[group](), before=N.capture(root);
        if(carryHeavy)pendingHeavy={scope:scope('dash'),values:before};
        try{return fn.apply(this,arguments);}finally{
          depth--;
          try {
            decorators[group]();
            if(group==='heavy'&&pendingHeavy?.scope===scope('dash')){pendingHeavy.values.forEach((v,k)=>{if(!before.has(k))before.set(k,v);});pendingHeavy=null;}
            N.apply(roots[group](),before);
          }catch(error){console.warn('Pro Forma number presentation:',error);}
        }
      };
    }
    // Native dispatch can run microtasks between capture and target listeners.
    // Finish after the real handler bubbles; a display-only next-task fallback covers stopped events.
    const events=new WeakMap();
    function finish(event){const pending=events.get(event);if(!pending)return;events.delete(event);clearTimeout(pending.timer);refresh('editor',pending.before);}
    ['input','change'].forEach(type=>{
      document.addEventListener(type,event=>{
        if(!event.target.closest?.('#edPanes'))return;
        events.set(event,{before:N.capture($('vEdit')),timer:setTimeout(()=>finish(event),0)});
      },true);
      document.addEventListener(type,finish);
    });
    function refresh(group,before){try{decorators[group]();N.apply(roots[group](),before||new Map());}catch(error){console.warn('Pro Forma number presentation:',error);}}
    return Object.freeze({wrap,refresh});
  };
})(window);
