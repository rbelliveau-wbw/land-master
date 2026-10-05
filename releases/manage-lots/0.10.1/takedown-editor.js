(function(root){
  'use strict';
  const M=root.LMTakedownModel,$=id=>document.getElementById(id);
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=value=>Number.isFinite(value)?value.toLocaleString('en-US',{style:'currency',currency:'USD'}):'—';
  const x='<svg viewBox="0 0 20 20" width="12" height="12" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m5 5 10 10M15 5 5 15"/></svg>';
  const plus='<svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 4v12M4 10h12"/></svg>';
  let current=null,revision=0,rowSequence=0,calendar=null,calendarInput=null,calendarMonth='',returnFocus=null,inert=[];
  function field(label,id,type,value,extra){return '<div class="field '+(extra||'')+'"><label for="'+id+'">'+label+'</label><input id="'+id+'" type="'+type+'" value="'+esc(value)+'"'+(type==='number'?' step="any"':'')+(type==='text'&&/^(fEntered|fPurchase|fTaxDate|if|it)/.test(id)?' placeholder="YYYY-MM-DD" inputmode="numeric" data-td-date autocomplete="off"':'')+'></div>';}
  function select(label,id,options,value){return '<div class="field"><label for="'+id+'">'+label+'</label><select id="'+id+'" aria-label="'+label+'">'+options.map(option=>'<option value="'+esc(option[0])+'"'+(option[0]===value?' selected':'')+'>'+esc(option[1])+'</option>').join('')+'</select></div>';}
  const val=id=>$(id)?$(id).value.trim():'';
  function card(n,title,body,action){return '<section class="td-card"><div class="td-card-head"><span class="td-step">'+n+'</span><h3>'+title+'</h3>'+(action||'')+'</div>'+body+'</section>';}
  function lots(){return current?current.options.lots():[];}
  function rows(){const result=[];for(let i=1;i<=12;i++){if(val('ir'+i)||val('if'+i)||val('it'+i))result.push({rate:val('ir'+i),from:val('if'+i),to:val('it'+i),key:$('period'+i).dataset.key});}return result;}
  function items(){return current.items;}
  function draft(){return {purchase:val('fPurchase'),taxDate:val('fTaxDate'),taxMethod:val('fTaxMethod'),taxStatus:val('fTaxStatus'),taxPerLot:val('fTaxPerLot'),percent:val('fPercent'),fees:val('fFees'),subtract:['Interest','Tax'].filter(name=>$('subtract'+name).checked),periods:rows(),items:items()};}
  function updateName(){const builder=current.options.builders.find(b=>b.ID===val('fBuilder'));$('fName').value=(current.options.subdivision.Subdivision_Code||current.options.subdivision.Subdivision_Name)+' - '+(builder?builder.Builder_Name:'Choose builder')+' - '+(M.zoho(val('fPurchase'))||'Purchase date');}
  function writePeriods(periods){
    for(let i=1;i<=12;i++){const period=periods[i-1];$('ir'+i).value=period?period.rate:'';$('if'+i).value=period?period.from:'';$('it'+i).value=period?period.to:'';$('period'+i).hidden=!period;$('period'+i).dataset.key=period?(period.key||'period-'+(++rowSequence)):'';$('if'+i).readOnly=i>1;$('if'+i).setAttribute('aria-readonly',String(i>1));}
    current.count=periods.length;$('periodEmpty').hidden=!!periods.length;$('addPeriod').disabled=periods.length>=12;
    $('periodCount').textContent=periods.length+' / 12';refresh();
  }
  function synchronize(){
    for(let i=2;i<=current.count;i++)$('if'+i).value=val('it'+(i-1));
    refresh();
  }
  function renderItems(){
    $('additionalRows').innerHTML=current.items.map((item,i)=>{item.key=item.key||'item-'+(++rowSequence);return '<div class="td-item" data-key="'+item.key+'" data-item="'+i+'">'+select('Type','itemType'+i,[['Addition','Addition'],['Deduction','Deduction']],item.Item_Type)+field('Item','itemName'+i,'text',item.Name)+field('Quantity','itemQty'+i,'number',item.Quantity)+field('Amount','itemAmount'+i,'number',item.Amount)+'<div class="td-item-total" id="itemTotal'+i+'">'+money(M.itemTotal(item))+'</div><button type="button" class="td-remove" data-remove-item="'+i+'" aria-label="Remove '+esc(item.Name||'item')+'">'+x+'</button></div>';}).join('');
    if(root.LMPickers)root.LMPickers.enhance($('additionalRows'));
  }
  function readItems(){current.items.forEach((item,i)=>{item.Item_Type=val('itemType'+i);item.Name=val('itemName'+i);item.Quantity=val('itemQty'+i);item.Amount=val('itemAmount'+i);$('itemTotal'+i).textContent=money(M.itemTotal(item));});}
  function animateRemoval(action){
    const before=new Map();$('form').querySelectorAll('.td-period:not([hidden]),.td-item').forEach(node=>{before.set(node.dataset.key,node.getBoundingClientRect().top);});
    action();if(root.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    $('form').querySelectorAll('.td-period:not([hidden]),.td-item').forEach(node=>{const top=before.get(node.dataset.key),delta=top==null?0:top-node.getBoundingClientRect().top;if(delta&&node.animate)node.animate([{transform:'translateY('+delta+'px)'},{transform:'translateY(0)'}],{duration:260,easing:'ease-out'});});
  }
  function refresh(){
    if(!current)return;
    updateName();const d=draft(),r=M.receipt(lots(),d),sub=current.options.subdivision,ready=r.complete&&!current.loading&&!current.error&&current.loadedBuilder===val('fBuilder')&&!!val('fBuilder');
    $('taxFlat').hidden=d.taxMethod!=='Flat';$('taxPercent').hidden=d.taxMethod!=='Percentage of Appraisal';
    $('receiptBuilder').textContent=(current.options.builders.find(b=>b.ID===val('fBuilder'))||{}).Builder_Name||'Choose builder';
    $('receiptName').textContent=val('fName');$('receiptDate').textContent=M.zoho(d.purchase)||'—';$('receiptCounty').textContent=sub.County||'—';$('receiptLots').textContent=lots().length+' lots';
    ['base','earnest','fees','interest','tax','wbw','builder','total','items','grand'].forEach(key=>$('receipt'+key).textContent=ready?money(r.totals[key]):'—');
    $('receiptTaxLabel').textContent=d.taxStatus==='Taxes Paid'?'Builder tax · added':d.taxStatus==='Taxes Unpaid'?'WBW tax · deducted':'Total + WBW tax · deducted';
    const adjustment=d.taxStatus==='Taxes Paid'?r.totals.builder:d.taxStatus==='Taxes Unpaid'?-r.totals.wbw:-r.totals.tax-r.totals.wbw;
    $('receiptAdjustment').textContent=ready?money(adjustment):'—';
    $('receiptIssue').textContent=current.loading?'Loading builder terms…':current.error||(!val('fBuilder')?'Choose a builder':r.complete?'':('Complete: '+r.missing.join(', ')));$('receiptIssue').hidden=ready;
    $('receiptItemLines').innerHTML=d.items.map(item=>'<div class="td-receipt-line"><span>'+esc(item.Name||'Additional item')+' <small>'+esc(item.Quantity)+' × '+money(M.number(item.Amount))+'</small></span><strong>'+money(M.itemTotal(item))+'</strong></div>').join('');
    $('receiptLotRows').innerHTML=r.rows.map(row=>'<tr><td>'+esc(current.options.block(row.lot))+' / '+esc(current.options.lotNumber(row.lot))+'<small>'+esc(row.lot.Address||'')+'</small></td>'+['base','earnest','fees','interest','tax','wbw','builder','total'].map(key=>'<td>'+money(ready?row[key]:NaN)+'</td>').join('')+'</tr>').join('');
    $('selectedLotRows').innerHTML=lots().map(lot=>'<span class="td-lot-chip">Block '+esc(current.options.block(lot))+' · Lot '+esc(current.options.lotNumber(lot))+'<button class="td-remove" type="button" data-remove-lot="'+esc(lot.ID)+'" aria-label="Remove lot '+esc(current.options.lotNumber(lot))+'">'+x+'</button></span>').join('');
    $('selectedLotCount').textContent=lots().length;
    for(let i=1;i<=current.count;i++){const p={from:val('if'+i),to:val('it'+i)},count=M.date(p.from)&&M.date(p.to)?M.days(p.from,p.to)+(i===1&&!d.subtract.includes('Interest')?1:0):null;$('days'+i).textContent=count==null?'—':count+' days';}
    $('confirm').disabled=current.loading||!!current.error||!lots().length;
  }
  function status(text,error){$('templateStatus').textContent=text;$('templateStatus').classList.toggle('is-error',!!error);$('retryDefaults').hidden=!error;}
  function active(state,token,builder,context){return current===state&&revision===token&&val('fBuilder')===builder&&state.options.context()===context&&$('overlay').classList.contains('open');}
  async function loadDefaults(){
    if(!current)return;const state=current,builder=val('fBuilder'),token=++revision,context=state.options.context();
    state.loadedBuilder='';state.loading=true;state.error='';status(builder?'Loading template…':'Choose a builder');refresh();
    if(!builder){state.loading=false;state.error='Choose a builder to load terms.';refresh();return;}
    try{
      const templates=await state.options.read('All_Takedown_Templates','(Subdivision1 == '+state.options.subdivision.ID+') && (Builder1 == '+builder+')');
      if(!active(state,token,builder,context))return;
      templates.forEach(t=>{if(!Object.prototype.hasOwnProperty.call(t,'Archive'))throw new Error('Template archive state is unavailable.');if(typeof t.ID!=='string'||!/^\d+$/.test(t.ID)||root.LMManageLots.relation(t.Subdivision1).join(',')!==state.options.subdivision.ID||root.LMManageLots.relation(t.Builder1).join(',')!==builder)throw new Error('Template returned an unreadable or unexpected owner.');});
      const matches=templates.filter(t=>String(t.Archive).toLowerCase()!=='true');
      if(matches.length>1)throw new Error('Multiple templates match this builder and subdivision. Review in Creator.');
      const template=matches[0]||null;
      if(template){for(let i=1;i<=12;i++)for(const key of ['Interest_Rate_'+i,'From_'+i,'To_'+i])if(!Object.prototype.hasOwnProperty.call(template,key))throw new Error('Template field '+key+' is unavailable.');if(!Object.prototype.hasOwnProperty.call(template,'Subtract_Day_From'))throw new Error('Template day settings are unavailable.');}
      const itemRows=await state.options.read('All_Additional_Items',template?'(Takedown_Template1 == '+template.ID+')':'(Subdivision1 == '+state.options.subdivision.ID+')');
      if(!active(state,token,builder,context))return;
      const chosen=lots(),max=key=>Math.max(0,...chosen.map(lot=>M.number(lot[key]))),starts=chosen.map(lot=>M.date(lot.Escalator_Start_Date)).filter(Boolean).sort();
      const terms=template||{Additional_Fee_Type:chosen[0]&&chosen[0].Fee_Type||'',Additional_Fee:max('Additional_Fees'),Tax_Method:'Flat',Tax_Status:'Taxes Paid',Tax_Per_Lot:0,Percent_of_Appraisal:0};
      for(const [field,key] of [['fFeeType','Additional_Fee_Type'],['fFees','Additional_Fee'],['fTaxMethod','Tax_Method'],['fTaxStatus','Tax_Status'],['fTaxPerLot','Tax_Per_Lot'],['fPercent','Percent_of_Appraisal']]){
        if(template&&!Object.prototype.hasOwnProperty.call(template,key))throw new Error('Template field '+key+' is unavailable.');
        $(field).value=terms[key]==null?'':String(terms[key]);
      }
      const subtract=Array.isArray(terms.Subtract_Day_From)?terms.Subtract_Day_From:String(terms.Subtract_Day_From||'').split(',').map(s=>s.trim());
      $('subtractInterest').checked=subtract.includes('Interest');$('subtractTax').checked=subtract.includes('Tax');state.drh=terms.DRH_Subtract_Day===true||terms.DRH_Subtract_Day==='true';
      state.sourcePeriods=template?M.periods(template,true):starts.length?[{rate:String(max('Escalator')),from:starts[starts.length-1],to:''}]:[];
      state.ratesEdited=false;writePeriods(M.applicable(state.sourcePeriods,val('fPurchase')));
      state.items=itemRows.map(item=>{if(typeof item.ID!=='string'||!/^\d+$/.test(item.ID)||root.LMManageLots.relation(item[template?'Takedown_Template1':'Subdivision1']).join(',')!==(template?template.ID:state.options.subdivision.ID))throw new Error('Additional item returned an unreadable or unexpected owner.');for(const key of ['Item_Type','Name','Quantity','Amount'])if(!Object.prototype.hasOwnProperty.call(item,key))throw new Error('Additional item '+key+' is unavailable.');return {Item_Type:item.Item_Type,Name:item.Name,Quantity:item.Quantity,Amount:item.Amount};});renderItems();
      state.loading=false;state.loadedBuilder=builder;state.template=template;status(template?'Template applied · '+(template.Name||'Builder terms'):'Lot defaults applied');
      if(root.LMPickers)root.LMPickers.enhance($('form'));refresh();
    }catch(error){if(!active(state,token,builder,context))return;state.loading=false;state.error=error.message||String(error);status(state.error,true);refresh();}
  }
  function extraPayload(){const d=draft();return {Base_Price_Subtotal:M.receipt(lots(),d).totals.base,DRH_Subtract_Day:!!current.drh,Subtract_Day_From:d.subtract,Additional_Items:M.itemPayload(d.items)};}
  function validate(){
    if(!current)return '';
    if(current.loadedBuilder!==val('fBuilder')){if(!current.loading)loadDefaults();return 'Wait for the builder terms to finish loading.';}
    if(current.loading||current.error)return current.error||'Wait for the builder terms to finish loading.';
    if(!lots().length)return 'Select at least one lot.';
    if(!M.date(val('fEntered'))||!M.date(val('fPurchase'))||val('fTaxDate')&&!M.date(val('fTaxDate')))return 'Enter valid dates as YYYY-MM-DD.';
    for(const id of ['fTaxPerLot','fPercent','fFees'])if(!Number.isFinite(M.number(val(id)))||M.number(val(id))<0)return 'Enter a nonnegative value for '+$(id).previousElementSibling.textContent+'.';
    if(M.number(val('fPercent'))>100)return 'Percent of appraisal must be between 0 and 100.';
    const d=draft(),errors=M.validate(d.periods,d.purchase);if(errors.length)return errors[0];
    for(const item of d.items)if(!['Addition','Deduction'].includes(item.Item_Type)||!String(item.Name||'').trim()||String(item.Name).length>100||!Number.isFinite(M.number(item.Amount))||M.number(item.Amount)<0||!Number.isInteger(M.number(item.Quantity))||M.number(item.Quantity)<1||M.number(item.Quantity)>999)return 'Each additional item needs a name, amount and whole quantity from 1 to 999.';
    const r=M.receipt(lots(),d);if(!r.complete)return 'Complete or verify: '+r.missing.join(', ')+'.';return '';
  }
  function open(options){
    close();const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago'});current={options,items:[],count:0,loading:false,error:'',sourcePeriods:[],loadedBuilder:'',drh:false};returnFocus=document.activeElement;
    const body=card(1,'Takedown details','<div class="td-fields">'+select('Builder *','fBuilder',[['','Choose builder…']].concat(options.builders.slice().sort((a,b)=>String(a.Builder_Name).localeCompare(String(b.Builder_Name))).map(b=>[b.ID,b.Builder_Name])),'')+field('Status','fStatus','text','Active')+field('Entered date *','fEntered','text',today)+field('Purchase date *','fPurchase','text',today)+field('Receipt name','fName','text','','td-wide')+'</div><div class="td-template"><span id="templateStatus">Choose a builder</span><button type="button" class="link" id="retryDefaults" hidden>Retry</button></div>')+
      card(2,'Taxes & fees','<div class="td-fields">'+select('Tax method *','fTaxMethod',[['Flat','Flat'],['Percentage of Appraisal','Percentage of Appraisal']],'Flat')+select('Tax status *','fTaxStatus',[['Taxes Paid','Taxes Paid'],['Taxes Unpaid','Taxes Unpaid'],['Proration Taxes Unpaid','Proration Taxes Unpaid']],'Taxes Paid')+'<div id="taxFlat">'+field('Tax per lot','fTaxPerLot','number','0')+'</div><div id="taxPercent" hidden>'+field('Percent of appraisal','fPercent','number','0')+'</div>'+field('Tax proration date','fTaxDate','text','')+select('Additional fee type','fFeeType',[['','None'],['Mailbox','Mailbox'],['Water Tap','Water Tap'],['Other','Other']],'')+field('Additional fee per lot','fFees','number','0')+'</div><div class="td-checks"><span>Subtract one day from</span><label><input type="checkbox" id="subtractInterest"> Interest</label><label><input type="checkbox" id="subtractTax"> Tax</label></div>')+
      card(3,'Interest periods','<div class="td-period-head"><span>Rate (%)</span><span>From</span><span>To</span><span>Days</span><span></span></div><div id="periodRows">'+Array.from({length:12},(_,index)=>{const i=index+1;return '<div class="td-period" id="period'+i+'" hidden>'+field('Rate '+i,'ir'+i,'number','')+field('From '+i,'if'+i,'text','')+field('To '+i,'it'+i,'text','')+'<span id="days'+i+'" class="td-days">—</span><button class="td-remove" type="button" data-remove-period="'+i+'" aria-label="Remove interest period '+i+'">'+x+'</button></div>';}).join('')+'</div><div id="periodEmpty" class="td-empty">No interest periods</div><button type="button" class="btn td-add" id="addPeriod">'+plus+' Add period</button>','<span class="count-chip" id="periodCount">0 / 12</span>')+
      card(4,'Additional items','<div id="additionalRows"></div><button class="btn td-add" type="button" id="addItem">'+plus+' Add item</button>')+
      '<details class="td-card"><summary>Selected lots <span id="selectedLotCount" class="count-chip"></span></summary><div id="selectedLotRows" class="td-selected-lots"></div></details><details class="td-card"><summary>Notes</summary><textarea id="fNotes" aria-label="Notes" placeholder="Add a note to the receipt"></textarea></details>';
    $('form').innerHTML=body;$('fName').readOnly=true;$('fStatus').readOnly=true;
    $('receipt').innerHTML='<div class="td-receipt-head"><span class="td-kicker">LIVE RECEIPT</span><span class="td-preview">Preview</span><h3 id="receiptBuilder">Choose builder</h3><div id="receiptName"></div></div><div class="td-receipt-body"><div class="td-receipt-meta"><strong>'+esc(options.subdivision.Subdivision_Name)+'</strong><span><span id="receiptCounty"></span> · <span id="receiptLots"></span></span><span>Purchase · <b id="receiptDate"></b></span></div><div class="td-receipt-line"><span>Base price</span><strong id="receiptbase"></strong></div><div class="td-receipt-line credit"><span>Earnest money <small>deducted</small></span><strong id="receiptearnest"></strong></div><div class="td-receipt-line"><span>Additional fees</span><strong id="receiptfees"></strong></div><div class="td-receipt-line"><span>Interest</span><strong id="receiptinterest"></strong></div><div class="td-tax-breakdown"><div><span>Total tax</span><strong id="receipttax"></strong></div><div><span>WBW share</span><strong id="receiptwbw"></strong></div><div><span>Builder share</span><strong id="receiptbuilder"></strong></div></div><div class="td-receipt-line"><span id="receiptTaxLabel"></span><strong id="receiptAdjustment"></strong></div><div class="td-receipt-line subtotal"><span>Lots subtotal</span><strong id="receipttotal"></strong></div><div id="receiptItemLines"></div><div class="td-receipt-line"><span>Additional items · net</span><strong id="receiptitems"></strong></div><div id="receiptIssue" class="td-receipt-issue" role="status"></div><div class="td-grand"><span>Total due</span><strong id="receiptgrand"></strong></div><details class="td-lot-detail"><summary>View per-lot breakdown</summary><div class="td-receipt-table"><table><thead><tr>'+['Block / Lot','Base','Earnest','Fees','Interest','Tax','WBW','Builder','Total'].map(label=>'<th>'+label+'</th>').join('')+'</tr></thead><tbody id="receiptLotRows"></tbody></table></div></details><details class="td-wire"><summary>Wire transfer details</summary><div>First National Bank<br>'+esc(options.subdivision.Company_Name||'Account name unavailable')+'<br>Account · '+esc(options.subdivision.Account_Number||'Unavailable')+'<br>ABA · 111906271<br>901 E Central Texas Expy, Killeen, TX 76541</div></details></div>';
    if(root.LMPickers)root.LMPickers.enhance($('form'));
    $('formError').classList.remove('show');$('overlay').classList.add('open');$('modalSub').textContent=options.subdivision.Subdivision_Name+' · '+lots().length+' selected lots';
    document.querySelectorAll('header,.toolbar,.main,#selectionBar').forEach(node=>{inert.push([node,node.inert]);node.inert=true;});
    writePeriods([]);$('fBuilder').focus();
    const builderIds=lots().map(lot=>options.id(lot.Builder1)).filter(Boolean);if(builderIds.length===lots().length&&new Set(builderIds).size===1&&options.builders.some(b=>b.ID===builderIds[0])){$('fBuilder').value=builderIds[0];if(root.LMPickers)root.LMPickers.refresh($('fBuilder'));return loadDefaults();}
    return Promise.resolve();
  }
  function close(){revision++;closeCalendar();if(root.LMPickers)root.LMPickers.close(false);inert.forEach(pair=>pair[0].inert=pair[1]);inert=[];current=null;if(returnFocus&&returnFocus.isConnected)returnFocus.focus();}
  function closeCalendar(){if(calendar)calendar.remove();calendar=null;calendarInput=null;}
  function showCalendar(input,month){
    if(input.readOnly||input.disabled)return;closeCalendar();calendarInput=input;calendarMonth=month||M.date(input.value).slice(0,7)||new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago'}).slice(0,7);
    const [year,m]=calendarMonth.split('-').map(Number),first=new Date(Date.UTC(year,m-1,1)),length=new Date(Date.UTC(year,m,0)).getUTCDate();
    calendar=document.createElement('div');calendar.className='td-calendar';calendar.setAttribute('role','dialog');calendar.setAttribute('aria-label','Choose '+(input.getAttribute('aria-label')||input.id)+' date');
    calendar.innerHTML='<div class="td-calendar-head"><button type="button" data-month="-1" aria-label="Previous month">‹</button><strong>'+first.toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'})+'</strong><button type="button" data-month="1" aria-label="Next month">›</button></div><div class="td-calendar-grid">'+['S','M','T','W','T','F','S'].map(d=>'<span>'+d+'</span>').join('')+Array.from({length:first.getUTCDay()},()=>'<span></span>').join('')+Array.from({length},(_,i)=>'<button type="button" data-day="'+calendarMonth+'-'+String(i+1).padStart(2,'0')+'"'+(input.value===calendarMonth+'-'+String(i+1).padStart(2,'0')?' aria-current="date"':'')+'>'+String(i+1)+'</button>').join('')+'</div><div class="td-calendar-foot"><button type="button" data-clear-date>Clear</button><button type="button" data-close-date>Done</button></div>';
    document.body.appendChild(calendar);const rect=input.getBoundingClientRect(),width=280;calendar.style.left=Math.max(8,Math.min(rect.left,root.innerWidth-width-8))+'px';calendar.style.top=Math.max(8,Math.min(rect.bottom+6,root.innerHeight-calendar.offsetHeight-8))+'px';
    calendar.addEventListener('click',event=>{event.stopPropagation();const day=event.target.closest('[data-day]'),move=event.target.closest('[data-month]');if(move){const next=new Date(Date.UTC(year,m-1+Number(move.dataset.month),1));showCalendar(input,next.toISOString().slice(0,7));return;}if(day||event.target.closest('[data-clear-date]')){input.value=day?day.dataset.day:'';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));closeCalendar();input.focus();}else if(event.target.closest('[data-close-date]')){closeCalendar();input.focus();}});
    calendar.querySelector('[aria-current]')?.focus();if(!calendar.contains(document.activeElement))calendar.querySelector('[data-day]').focus();
  }
  function changed(event){
    if(!current||current.options.locked()||!$('form').contains(event.target))return;const id=event.target.id;
    if(id==='fBuilder'&&event.type==='change'){loadDefaults();return;}
    if(id==='fPurchase'){
      if(!current.ratesEdited)writePeriods(M.applicable(current.sourcePeriods,val('fPurchase')));
      else if(current.count){$('it'+current.count).value=val('fPurchase');synchronize();}
    }
    if(/^(ir|if|it)\d+$/.test(id)){current.ratesEdited=true;synchronize();}
    if(/^item/.test(id))readItems();refresh();
  }
  document.addEventListener('input',changed);document.addEventListener('change',changed);
  document.addEventListener('click',event=>{
    if(calendar&&!calendar.contains(event.target)&&event.target!==calendarInput)closeCalendar();
    if(!current||current.options.locked())return;
    if(event.target.matches&&event.target.matches('[data-td-date]')){showCalendar(event.target);return;}
    if(event.target.closest('#retryDefaults')){loadDefaults();return;}
    if(event.target.closest('#addPeriod')){
      const periods=rows();if(periods.length>=12)return;current.ratesEdited=true;
      if(periods.length){const last=periods[periods.length-1];if(!M.date(last.to)||last.to<=last.from){current.options.error('Set a valid end date before adding the next period.');return;}}
      periods.push({rate:'',from:periods.length?periods[periods.length-1].to:'',to:val('fPurchase')});writePeriods(periods);$('ir'+current.count).focus();return;
    }
    const period=event.target.closest('[data-remove-period]');if(period){animateRemoval(()=>{const periods=rows(),index=Number(period.dataset.removePeriod)-1;periods.splice(index,1);if(periods.length)periods[periods.length-1].to=val('fPurchase');current.ratesEdited=true;writePeriods(M.chain(periods));});return;}
    if(event.target.closest('#addItem')){readItems();current.items.push({Item_Type:'Addition',Name:'',Quantity:'1',Amount:'0'});renderItems();refresh();$('itemName'+(current.items.length-1)).focus();return;}
    const item=event.target.closest('[data-remove-item]');if(item){animateRemoval(()=>{readItems();current.items.splice(Number(item.dataset.removeItem),1);renderItems();refresh();});return;}
    const lot=event.target.closest('[data-remove-lot]');if(lot){current.options.removeLot(lot.dataset.removeLot);refresh();}
  });
  document.addEventListener('keydown',event=>{
    if(!current||!$('overlay').classList.contains('open')||current.options.locked())return;
    if(event.key==='Escape'){event.preventDefault();if(calendar){const input=calendarInput;closeCalendar();input.focus();}else{$('overlay').classList.remove('open');close();}return;}
    if(event.key==='ArrowDown'&&event.target.matches('[data-td-date]')){event.preventDefault();showCalendar(event.target);return;}
    if(calendar&&event.target.closest('.td-calendar')&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){const day=event.target.closest('[data-day]');if(day){event.preventDefault();const change={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[event.key],next=new Date(Date.parse(day.dataset.day+'T00:00:00Z')+change*86400000);if(next.toISOString().slice(0,7)!==calendarMonth)showCalendar(calendarInput,next.toISOString().slice(0,7));calendar.querySelector('[data-day="'+next.toISOString().slice(0,10)+'"]')?.focus();}return;}
    if(event.key==='Tab'){const scope=calendar||$('overlay'),focusable=Array.from(scope.querySelectorAll('button,input,select,textarea,summary')).filter(el=>!el.disabled&&!el.hidden&&el.getClientRects().length),first=focusable[0],last=focusable[focusable.length-1];if(first&&(event.shiftKey&&document.activeElement===first||!event.shiftKey&&document.activeElement===last)){event.preventDefault();(event.shiftKey?last:first).focus();}}
  });
  root.addEventListener('resize',closeCalendar);document.addEventListener('scroll',closeCalendar,true);
  root.LMTakedownEditor=Object.freeze({open,close,validate,extraPayload,loadDefaults,refresh,draft,writePeriods,prepare:function(){closeCalendar();if(root.LMPickers)root.LMPickers.close(false);}});
})(window);
