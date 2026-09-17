(function () {
  'use strict';
  const entries = new Map();
  let opened = null;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const labelOf = control => [...control.closest('label').childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
  function values(control) { return [...control.selectedOptions].map(o => o.value).filter(Boolean); }
  function setValues(control, selected) { [...control.options].forEach(o => { o.selected = selected.includes(o.value); }); }
  function close(restore = false) {
    if (!opened) return;
    const { panel, trigger } = opened; opened = null;
    panel.remove(); trigger.setAttribute('aria-expanded','false');
    if (restore) trigger.focus();
  }
  function position() {
    if (!opened) return;
    const {panel,trigger} = opened, rect = trigger.getBoundingClientRect();
    const width = Math.min(innerWidth - 16, Math.max(rect.width, opened.month ? 286 : 290));
    panel.style.width = width + 'px';
    panel.style.maxHeight = Math.max(100,innerHeight - 16) + 'px';
    const height = Math.min(panel.scrollHeight,innerHeight - 16);
    const top = rect.bottom + 5 + height <= innerHeight - 8 ? rect.bottom + 5 : Math.max(8,rect.top - height - 5);
    panel.style.left = Math.max(8,Math.min(rect.left,innerWidth-width-8)) + 'px';
    panel.style.top = top + 'px';
  }
  function makePanel(entry, month = false) {
    close();
    const panel = document.createElement('div');
    panel.className = 'insights-popover' + (month ? ' month-popover' : ''); panel.id = entry.control.id+'Popup';
    panel.setAttribute('role','dialog'); panel.setAttribute('aria-label',entry.label + (month ? ' month picker' : ' choices'));
    document.body.append(panel); entry.trigger.setAttribute('aria-expanded','true');
    opened = {...entry,panel,month}; return panel;
  }
  function commit(entry) {
    entry.sync(); entry.control.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function mountSelect(control) {
    const label = labelOf(control), multiple = control.multiple;
    const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'picker-trigger';
    trigger.id = control.id+'Picker'; trigger.setAttribute('aria-label',label); trigger.setAttribute('aria-haspopup','dialog');
    trigger.setAttribute('aria-expanded','false'); trigger.setAttribute('aria-controls',control.id+'Popup');
    control.hidden = true; control.after(trigger);
    const entry = {control,trigger,label,multiple,sync() {
      const selected = [...control.selectedOptions].filter(o=>o.value || !multiple);
      const text = selected.length ? selected[0].text : (control.querySelector('option[value=""]')?.text || 'All');
      trigger.innerHTML = '<span class="picker-value">'+esc(text)+'</span>'+(selected.length>1?'<span class="picker-count">+'+(selected.length-1)+'</span>':'')+'<span class="picker-caret" aria-hidden="true">⌄</span>';
      trigger.title = selected.map(o=>o.text).join(', ') || text; trigger.disabled = control.disabled;
      trigger.classList.toggle('has-selection',multiple && selected.length>0);
    }};
    function open() {
      if (opened?.trigger === trigger) { close(true); return; }
      const panel = makePanel(entry), listId = control.id+'Options';
      panel.innerHTML = '<div class="picker-search-row"><span aria-hidden="true">⌕</span><input type="search" class="picker-search" aria-label="Search '+esc(label)+'" placeholder="Search '+esc(label.toLowerCase())+'…" autocomplete="off"></div>'+
        '<div class="picker-options" id="'+listId+'" role="listbox" aria-label="'+esc(label)+'" aria-multiselectable="'+multiple+'"></div>'+
        '<div class="picker-actions">'+(multiple?'<button type="button" data-action="clear">Clear</button><button type="button" data-action="visible">Select visible</button>':'<span class="picker-single-hint">Choose one</span>')+'<button type="button" data-action="done" class="picker-done">Done</button></div>';
      const search = panel.querySelector('input'), list = panel.querySelector('.picker-options');
      let visible = [];
      function draw(focusValue) {
        const query = search.value.trim().toLowerCase();
        visible = [...control.options].filter(o=>!o.hidden && (!multiple || o.value) && o.text.toLowerCase().includes(query));
        list.innerHTML = visible.length ? visible.map(o=>'<button type="button" class="picker-option'+(o.selected?' selected':'')+'" role="option" aria-selected="'+o.selected+'" data-value="'+esc(o.value)+'"><span class="picker-check" aria-hidden="true">'+(o.selected?'✓':'')+'</span><span>'+esc(o.text)+'</span></button>').join('') : '<div class="picker-no-results">No matches</div>';
        if (focusValue !== undefined) [...list.querySelectorAll('[data-value]')].find(b=>b.dataset.value===focusValue)?.focus();
        position();
      }
      search.addEventListener('input',()=>draw());
      list.addEventListener('click',e=>{
        const button=e.target.closest('[data-value]');if(!button)return;
        const option=[...control.options].find(o=>o.value===button.dataset.value);if(!option)return;
        if(multiple){option.selected=!option.selected;const placeholder=control.querySelector('option[value=""]');if(placeholder)placeholder.selected=false;commit(entry);draw(option.value);}
        else {control.value=option.value;commit(entry);close(true);}
      });
      panel.querySelector('[data-action="done"]').addEventListener('click',()=>close(true));
      panel.querySelector('[data-action="clear"]')?.addEventListener('click',()=>{setValues(control,[]);commit(entry);draw();search.focus();});
      panel.querySelector('[data-action="visible"]')?.addEventListener('click',()=>{const selection=new Set(values(control));visible.forEach(o=>selection.add(o.value));setValues(control,[...selection]);commit(entry);draw();search.focus();});
      panel.addEventListener('keydown',e=>{
        const buttons=[...list.querySelectorAll('[role="option"]')],i=buttons.indexOf(document.activeElement);
        if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const n=e.key==='ArrowDown'?Math.min(i+1,buttons.length-1):i<0?buttons.length-1:Math.max(0,i-1);buttons[n]?.focus();}
        if(e.key==='Enter'&&document.activeElement===search){e.preventDefault();buttons[0]?.click();}
        if((e.key==='Home'||e.key==='End')&&i>=0){e.preventDefault();buttons[e.key==='Home'?0:buttons.length-1]?.focus();}
      });
      draw();search.focus();
    }
    trigger.addEventListener('click',open);trigger.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();open();}});
    control.addEventListener('change',entry.sync);new MutationObserver(entry.sync).observe(control,{childList:true,subtree:true,attributes:true});
    entries.set(control.id,entry);entry.sync();
  }
  function mountMonth(control) {
    const label=labelOf(control),trigger=document.createElement('button');trigger.type='button';trigger.className='picker-trigger month-trigger';
    trigger.id=control.id+'Picker';trigger.setAttribute('aria-label',label+' month');trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',control.id+'Popup');control.after(trigger);
    const entry={control,trigger,label,sync(){const [y,m]=control.value.split('-');trigger.innerHTML='<span class="picker-value">'+esc(y&&months[Number(m)-1]?months[Number(m)-1]+' '+y:'Choose month')+'</span><span aria-hidden="true">▦</span>';trigger.disabled=control.disabled;}};
    trigger.addEventListener('click',()=>{
      if(opened?.trigger===trigger){close(true);return;}
      const panel=makePanel(entry,true),today=new Date();let year=Number(control.value.slice(0,4))||today.getFullYear(),mode='months';
      function choose(month){control.value=year+'-'+String(month+1).padStart(2,'0');commit(entry);close(true);}
      function draw() {
        const start=Math.max(1900,Math.min(9988,Math.floor(year/12)*12)),yearMode=mode==='years';
        panel.innerHTML='<div class="month-picker-header"><button type="button" data-step="-1" aria-label="Previous '+(yearMode?'12 years':'year')+'">‹</button><button type="button" class="month-year" aria-label="Choose year">'+(yearMode?start+' – '+(start+11):year)+'</button><button type="button" data-step="1" aria-label="Next '+(yearMode?'12 years':'year')+'">›</button></div>'+
          '<div class="month-grid">'+(yearMode?Array.from({length:12},(_,i)=>'<button type="button" data-year="'+(start+i)+'"'+(year===start+i?' class="selected"':'')+'>'+(start+i)+'</button>').join(''):months.map((m,i)=>'<button type="button" data-month="'+i+'" aria-label="Choose '+m+' '+year+'" aria-pressed="'+(control.value===year+'-'+String(i+1).padStart(2,'0'))+'"'+(control.value===year+'-'+String(i+1).padStart(2,'0')?' class="selected"':'')+'>'+m.slice(0,3)+'</button>').join(''))+'</div>'+
          '<div class="picker-actions"><button type="button" data-today>This month</button><button type="button" class="picker-done" data-close>Close</button></div>';
        panel.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>{year=Math.max(1900,Math.min(9999,year+Number(b.dataset.step)*(yearMode?12:1)));draw();panel.querySelector('[data-step="'+b.dataset.step+'"]').focus();}));
        panel.querySelector('.month-year').addEventListener('click',()=>{mode=yearMode?'months':'years';draw();panel.querySelector('.month-grid .selected')?.focus();});
        panel.querySelectorAll('[data-month]').forEach(b=>b.addEventListener('click',()=>choose(Number(b.dataset.month))));
        panel.querySelectorAll('[data-year]').forEach(b=>b.addEventListener('click',()=>{year=Number(b.dataset.year);mode='months';draw();panel.querySelector('.month-grid button').focus();}));
        panel.querySelector('[data-today]').addEventListener('click',()=>{year=today.getFullYear();choose(today.getMonth());});
        panel.querySelector('[data-close]').addEventListener('click',()=>close(true));position();
      }
      panel.addEventListener('keydown',e=>{const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-3,ArrowDown:3}[e.key];if(!delta)return;const buttons=[...panel.querySelectorAll('.month-grid button')],index=buttons.indexOf(document.activeElement);if(index<0)return;e.preventDefault();buttons[Math.max(0,Math.min(11,index+delta))].focus();});
      draw();(panel.querySelector('.month-grid .selected')||panel.querySelector('.month-grid button')).focus();
    });
    entries.set(control.id,entry);entry.sync();
  }
  document.addEventListener('pointerdown',e=>{if(opened&&!opened.panel.contains(e.target)&&!opened.trigger.contains(e.target))close();});
  document.addEventListener('keydown',e=>{if(opened&&e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);}},true);
  document.addEventListener('focusin',e=>{if(opened&&!opened.panel.contains(e.target)&&e.target!==opened.trigger)close();});
  window.addEventListener('resize',position);document.addEventListener('scroll',position,true);
  document.querySelectorAll('#salesDashboard select').forEach(mountSelect);
  document.querySelectorAll('[data-month-picker]').forEach(mountMonth);
  window.InsightsControls=Object.freeze({values,setValues,syncAll:()=>entries.forEach(e=>e.sync()),close});
})();
