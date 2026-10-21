(function (root) {
  'use strict';
  var TYPES = ['Land Investment', 'Development Company', 'Plat Recordation'];
  var STATUSES = ['Draft', 'Pending', 'Completed', 'Cancelled'];
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function id(v) { return typeof v === 'string' ? v : v && typeof v.ID === 'string' ? v.ID : Array.isArray(v) ? id(v[0]) : ''; }
  function parseDate(v) {
    var m = String(v || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/), y, month, day;
    if (m) { y = +m[1]; month = +m[2]; day = +m[3]; }
    else { m = String(v || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (!m) return ''; month = +m[1]; day = +m[2]; y = +m[3]; }
    var d = new Date(Date.UTC(y, month - 1, day));
    return y >= 1900 && y <= 9999 && d.getUTCFullYear() === y && d.getUTCMonth() === month - 1 && d.getUTCDate() === day ? y + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0') : '';
  }
  function dateLabel(v) { var iso = parseDate(v); return iso ? iso.slice(5, 7) + '/' + iso.slice(8) + '/' + iso.slice(0, 4) : ''; }
  function dateField(f, iso) {
    return '<div class="fg'+(f.full?' full':'')+'"><label class="fl" for="date_'+esc(f.k)+'">'+esc(f.label)+(f.req?' <span class="req-star">*</span>':'')+'</label><div class="pw-date"><input class="pf" type="hidden" id="f_'+esc(f.k)+'" data-field="'+esc(f.k)+'" data-ftype="date" data-original="'+esc(iso)+'" value="'+esc(iso)+'"'+(f.req?' data-req="1"':'')+'><input class="input" id="date_'+esc(f.k)+'" data-date-text="f_'+esc(f.k)+'" aria-label="'+esc(f.label)+'" placeholder="MM/DD/YYYY" autocomplete="off" value="'+esc(dateLabel(iso))+'"><button type="button" data-date-open="f_'+esc(f.k)+'" aria-label="Choose '+esc(f.label)+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3v4m8-4v4M4 10h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"/></svg></button></div><span class="pw-field-error" data-date-error="f_'+esc(f.k)+'" role="status"></span></div>';
  }
  function card(title, fields, render, cls) { return '<section class="pw-card '+(cls||'')+'"><h3>'+esc(title)+'</h3><div class="fgrid">'+fields.map(render).join('')+'</div></section>'; }
  function propertyHTML(fields, render) {
    var groups = [
      ['Property & location', ['Common_Name','Property_ID','Facility_ID','County','Land_Type','Subtype','Location','TerraVault_URL']],
      ['Ownership & relationships', ['Company1','Seller','Projects','Subdivisions','Proforma']],
      ['Acreage & financials', ['Acres','Original_Acres','Construction_Acres','cost_per_acre_FT','Purchase_Price','Purchase_Date']],
      ['Designation & coverage', ['Deed_To','New_Owner','Agree_with_Designation','Insured','Is_1031','Ag_Exempt']],
      ['Descriptions & notes', ['Legal_Description','Bruce_s_Description','Notes']]
    ], seen = {};
    var html = groups.map(function (g) { var selected = g[1].map(function (key) { return fields.find(function (f) { return f.k === key; }); }).filter(Boolean); selected.forEach(function (f) { seen[f.k] = true; }); return card(g[0], selected, render, g[0] === 'Descriptions & notes' ? 'pw-wide' : ''); }).join('');
    var remaining = fields.filter(function (f) { return !seen[f.k]; });
    return '<div class="pw-property-grid">'+html+(remaining.length?card('Additional details',remaining,render,'pw-wide'):'')+'</div>';
  }
  function transferFields(rec, F) {
    return [F('Property','Property','lookup',id(rec.Property),{lookup:'property',req:1,full:1}), F('From_Company','From Company','lookup',id(rec.From_Company),{lookup:'company',req:1}), F('To_Company','To Company','lookup',id(rec.To_Company),{lookup:'company',req:1}), F('Transfer_Date','Effective transfer date','date',rec.Transfer_Date,{req:1}), F('Transfer_Type','Transfer type','select',rec.Transfer_Type,{opts:TYPES,req:1}), F('Status','Status','select',rec.Status,{opts:STATUSES,req:1}), F('Transfer_Scope','Transfer scope','select',rec.Transfer_Scope,{opts:['Full','Partial'],req:1}), F('Amount_Unit','Measure by','select',rec.Amount_Unit,{opts:['Percentage','Acres']}), F('Amount_Transferred','Amount transferred','number',rec.Amount_Transferred), F('Notes','Notes','textarea',rec.Notes,{full:1})];
  }
  function transferHTML(fields, render, rec, audit) {
    var get = function (keys) { return keys.map(function (key) { return fields.find(function (f) { return f.k === key; }); }); };
    return '<div class="pw-transfer-layout"><div class="pw-transfer-main">'+card('Property & companies',get(['Property','From_Company','To_Company']),render)+card('Transfer details',get(['Transfer_Date','Transfer_Type','Status','Transfer_Scope']),render)+'<section class="pw-card pw-partial" data-transfer-amount'+(rec.Transfer_Scope==='Partial'?'':' hidden')+'><h3>Partial transfer</h3><div class="fgrid">'+get(['Amount_Unit','Amount_Transferred']).map(render).join('')+'</div></section>'+card('Notes',get(['Notes']),render)+'</div><aside class="pw-transfer-aside"><div class="pw-route-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4"/></svg></div><span class="pw-eyebrow">TRANSFER SUMMARY</span><div class="pw-route"><span>From</span><strong data-transfer-from>—</strong><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg><span>To</span><strong data-transfer-to>—</strong></div><div class="pw-transfer-facts"><span>Scope</span><b data-transfer-scope>Full</b><span>Status</span><b data-transfer-status>Draft</b><span>Amount</span><b data-transfer-total>Full property</b></div>'+audit(rec)+'</aside></div>';
  }
  function validateTransfer(values, properties, demo) {
    var required = ['Property','From_Company','To_Company','Transfer_Date','Transfer_Type','Status','Transfer_Scope'];
    for (var key of required) if (!String(values[key] || '').trim()) return {field:key,message:'Complete the required transfer fields.'};
    for (var key of ['Property','From_Company','To_Company']) if (typeof values[key] !== 'string' || (!demo && !/^\d+$/.test(values[key]))) return {field:key,message:'Select a valid record.'};
    if (values.From_Company === values.To_Company) return {field:'To_Company',message:'From Company and To Company must be different.'};
    if (!parseDate(values.Transfer_Date)) return {field:'Transfer_Date',message:'Enter a valid effective date as MM/DD/YYYY.'};
    if (!TYPES.includes(values.Transfer_Type)) return {field:'Transfer_Type',message:'Select a transfer type.'};
    if (!STATUSES.includes(values.Status)) return {field:'Status',message:'Select a status.'};
    if (!['Full','Partial'].includes(values.Transfer_Scope)) return {field:'Transfer_Scope',message:'Select Full or Partial.'};
    if (values.Transfer_Scope === 'Partial') {
      if (!['Percentage','Acres'].includes(values.Amount_Unit)) return {field:'Amount_Unit',message:'Choose Percentage or Acres.'};
      var amount = String(values.Amount_Transferred || '').trim();
      if (!/^\d+(?:\.\d{1,4})?$/.test(amount) || Number(amount) <= 0) return {field:'Amount_Transferred',message:'Enter a positive amount with up to four decimal places.'};
      if (values.Amount_Unit === 'Percentage' && Number(amount) >= 100) return {field:'Amount_Transferred',message:'A partial transfer must be less than 100%.'};
      var property = (properties || []).find(function (p) { return p.ID === values.Property; }), acres = property && Number(String(property.Acres || '').replace(/,/g,''));
      if (values.Amount_Unit === 'Acres' && acres > 0 && Number(amount) >= acres) return {field:'Amount_Transferred',message:'A partial transfer must be less than the property acreage.'};
    }
    return null;
  }
  function auditHTML(rec) {
    var rows = [['Entered by',rec.Added_User],['Date entered',rec.Added_Time],['Last updated by',rec.Modified_User],['Last updated',rec.Modified_Time]];
    if (!rows.some(function (r) { return r[1]; })) return '';
    return '<div class="pw-audit"><span class="pw-eyebrow">RECORD ACTIVITY</span>'+rows.map(function (r) { return '<div><span>'+esc(r[0])+'</span><b>'+esc(typeof r[1] === 'object' ? r[1] && (r[1].display_value || r[1].zc_display_value) || '—' : r[1] || '—')+'</b></div>'; }).join('')+'</div>';
  }
  function mount(host) {
    var panel = host.panel, dateMenu, dateAnchor, dateMonth, dateYear;
    function input(key) { return panel.querySelector('[data-field="'+key+'"]'); }
    function value(key) { var el=input(key); return el?el.value:''; }
    function summary() {
      if (!panel.querySelector('[data-transfer-from]')) return;
      [['from','From_Company'],['to','To_Company']].forEach(function (pair) { panel.querySelector('[data-transfer-'+pair[0]+']').textContent=host.lookupLabel('company',value(pair[1]))||'—'; });
      panel.querySelector('[data-transfer-scope]').textContent=value('Transfer_Scope')||'—';
      panel.querySelector('[data-transfer-status]').textContent=value('Status')||'—';
      panel.querySelector('[data-transfer-total]').textContent=value('Transfer_Scope')==='Full'?'Full property':value('Amount_Transferred')?(value('Amount_Transferred')+(value('Amount_Unit')==='Percentage'?'%':' acres')):'—';
    }
    function syncPartial(clear) {
      var section=panel.querySelector('[data-transfer-amount]');if(!section)return;
      section.hidden=value('Transfer_Scope')!=='Partial';
      ['Amount_Unit','Amount_Transferred'].forEach(function(key){var control=input(key),label=control.closest('.fg').querySelector('.fl'),star=label.querySelector('.req-star');if(section.hidden){control.removeAttribute('data-req');if(star)star.remove();}else{control.setAttribute('data-req','1');if(!star){star=document.createElement('span');star.className='req-star';star.textContent=' *';label.append(star);}}});
      if(clear&&section.hidden)['Amount_Unit','Amount_Transferred'].forEach(function(key){input(key).value='';input(key).dispatchEvent(new Event('input',{bubbles:true}));});
      summary();
    }
    function closeDate() { if(dateMenu){dateMenu.remove();dateMenu=null;} if(dateAnchor){dateAnchor.setAttribute('aria-expanded','false');dateAnchor=null;} }
    function renderCalendar() {
      var label=new Date(dateYear,dateMonth,1).toLocaleDateString('en-US',{month:'long',year:'numeric'}),first=new Date(dateYear,dateMonth,1).getDay(),last=new Date(dateYear,dateMonth+1,0).getDate();
      var html='<div class="pw-calendar-head"><button type="button" data-month="-1" aria-label="Previous month"><svg viewBox="0 0 20 20"><path d="m12 5-5 5 5 5"/></svg></button><b>'+esc(label)+'</b><button type="button" data-month="1" aria-label="Next month"><svg viewBox="0 0 20 20"><path d="m8 5 5 5-5 5"/></svg></button></div><div class="pw-calendar-grid">';
      'SMTWTFS'.split('').forEach(function(d){html+='<span>'+d+'</span>';});for(var n=0;n<first;n++)html+='<span></span>';
      for(var day=1;day<=last;day++){var iso=dateYear+'-'+String(dateMonth+1).padStart(2,'0')+'-'+String(day).padStart(2,'0');html+='<button type="button" data-day="'+iso+'"'+(dateAnchor&&document.getElementById(dateAnchor.dataset.dateOpen).value===iso?' class="selected" aria-current="date"':'')+'>'+day+'</button>';}
      dateMenu.innerHTML=html+'</div><div class="pw-calendar-footer"><button type="button" data-today>Today</button><button type="button" data-close-date>Done</button></div>';
    }
    function openDate(button) {
      closeDate();dateAnchor=button;button.setAttribute('aria-expanded','true');var selected=parseDate(document.getElementById(button.dataset.dateOpen).value),date=selected?new Date(selected+'T12:00:00'):new Date();dateMonth=date.getMonth();dateYear=date.getFullYear();
      dateMenu=document.createElement('div');dateMenu.className='pw-calendar';dateMenu.setAttribute('role','dialog');dateMenu.setAttribute('aria-label','Choose date');document.body.append(dateMenu);renderCalendar();var rect=button.getBoundingClientRect();dateMenu.style.left=Math.max(12,Math.min(rect.right-288,innerWidth-300))+'px';dateMenu.style.top=(rect.bottom+320>innerHeight?Math.max(12,rect.top-310):rect.bottom+7)+'px';
      dateMenu.addEventListener('click',function(e){var day=e.target.closest('[data-day]'),month=e.target.closest('[data-month]');if(month){var next=new Date(dateYear,dateMonth+Number(month.dataset.month),1);dateYear=next.getFullYear();dateMonth=next.getMonth();renderCalendar();dateMenu.querySelector('[data-month="'+month.dataset.month+'"]').focus();return;}if(day||e.target.closest('[data-today]')){var d=new Date(),iso=day?day.dataset.day:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),carrier=document.getElementById(dateAnchor.dataset.dateOpen),text=panel.querySelector('[data-date-text="'+carrier.id+'"]');text.value=dateLabel(iso);syncDate(text);var anchor=dateAnchor;closeDate();anchor.focus();}else if(e.target.closest('[data-close-date]')){var anchor=dateAnchor;closeDate();anchor.focus();}});
      dateMenu.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();var anchor=dateAnchor;closeDate();anchor.focus();}else if(e.key==='Tab'){var controls=Array.from(dateMenu.querySelectorAll('button')),first=controls[0],last=controls[controls.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}else if(/^Arrow/.test(e.key)&&e.target.dataset.day){e.preventDefault();var days=Array.from(dateMenu.querySelectorAll('[data-day]')),step={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[e.key],i=days.indexOf(e.target);days[Math.max(0,Math.min(days.length-1,i+step))].focus();}});
      var focus=dateMenu.querySelector('.selected')||dateMenu.querySelector('[data-day]');focus.focus();
    }
    function syncDate(text) {
      var carrier=document.getElementById(text.dataset.dateText),iso=parseDate(text.value),invalid=!!text.value.trim()&&!iso;carrier.value=iso;text.setAttribute('aria-invalid',String(invalid));panel.querySelector('[data-date-error="'+carrier.id+'"]').textContent=invalid?'Use MM/DD/YYYY.':'';carrier.dispatchEvent(new Event('input',{bubbles:true}));
    }
    panel.addEventListener('click',function(e){var button=e.target.closest('[data-date-open]');if(button&&!host.busy())openDate(button);});
    panel.addEventListener('input',function(e){if(e.target.dataset.dateText)syncDate(e.target);summary();});
    panel.addEventListener('change',function(e){if(e.target.dataset.field==='Transfer_Scope')syncPartial(true);if(e.target.dataset.field==='Property'&&host.isNewTransfer()){var property=host.properties().find(function(p){return p.ID===value('Property');}),company=input('From_Company'),next=id(property&&property.Company1);company.value=next;var button=panel.querySelector('[data-lookup-target="f_From_Company"] .lookup-label');if(button)button.textContent=host.lookupLabel('company',next)||'Select…';company.dispatchEvent(new Event('input',{bubbles:true}));}summary();});
    document.addEventListener('mousedown',function(e){if(dateMenu&&!dateMenu.contains(e.target)&&!dateAnchor.contains(e.target))closeDate();});window.addEventListener('resize',closeDate);document.addEventListener('scroll',function(e){if(dateMenu&&!dateMenu.contains(e.target))closeDate();},true);
    return {afterRender:function(){closeDate();syncPartial(false);summary();},closeDate:closeDate,validateDates:function(){var texts=Array.from(panel.querySelectorAll('[data-date-text]'));for(var text of texts)if(text.value.trim()&&!parseDate(text.value)){text.setAttribute('aria-invalid','true');text.focus();host.error('Enter a valid date as MM/DD/YYYY.');return false;}return true;}};
  }
  root.LMPropertyWorkspace=Object.freeze({types:TYPES,statuses:STATUSES,parseDate:parseDate,dateLabel:dateLabel,dateField:dateField,propertyHTML:propertyHTML,transferFields:transferFields,transferHTML:transferHTML,validateTransfer:validateTransfer,auditHTML:auditHTML,mount:mount});
})(window);
