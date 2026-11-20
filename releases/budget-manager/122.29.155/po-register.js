/* Read-only PO register; uses the existing permission-scoped Requests snapshot. */
(function(root){
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function family(entries){
    const rows=entries.filter(e=>e.type==='Purchase Order'),byId=new Map(rows.map(e=>[e.record.ID,e])),children=new Map();
    rows.forEach(e=>{const parent=e.record._poOriginalId;if(parent&&byId.has(parent)&&byId.get(parent).budgetId===e.budgetId&&!byId.get(parent).record._poOriginalId){if(!children.has(parent))children.set(parent,[]);children.get(parent).push(e);}});
    const nested=new Set([...children.values()].flat().map(e=>e.record.ID)),result=[];
    rows.filter(e=>!nested.has(e.record.ID)).forEach(e=>{result.push({entry:e,depth:0,missingParent:!!e.record._poOriginalId});(children.get(e.record.ID)||[]).sort((a,b)=>Number(a.record._poSupplementNumber)-Number(b.record._poSupplementNumber)||a.record.ID.localeCompare(b.record.ID)).forEach(child=>result.push({entry:child,depth:1,missingParent:false}));});
    return result;
  }
  function date(value){if(!value)return '';const text=String(value),match=text.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);return match?match[2]+'/'+match[3]+'/'+match[1]:text;}
  function select(entries,ui,selectRequests){
    const parents=new Map(entries.filter(e=>e.type==='Purchase Order'&&!e.record._poOriginalId).map(e=>[e.record.ID,e]));
    const query=ui.search.trim().toLowerCase();
    return selectRequests(entries,Object.assign({},ui,{search:'',types:['Purchase Order']})).filter(e=>{
      const parent=parents.get(e.record._poOriginalId),samePhase=parent&&parent.budgetId===e.budgetId;
      return !query||[e.search,e.record.PO_Number,samePhase?parent.record.PO_Number:'',samePhase?parent.record.ID:''].filter(Boolean).join(' ').toLowerCase().includes(query);
    }).map(e=>{const parent=parents.get(e.record._poOriginalId);return parent&&parent.budgetId===e.budgetId?Object.assign({},e,{record:Object.assign({},e.record,{_poOriginalNumber:parent.record.PO_Number||''})}):e;});
  }
  function approvals(record){
    if(!Array.isArray(record._poApprovals))return 'Unavailable';
    const approved=record._poApprovals.filter(row=>row.status==='Approved');
    return approved.length?approved.map(row=>'<div class="po-register-person">'+esc(row.name||row.email)+'<span>'+esc([row.role,date(row.respondedDate)].filter(Boolean).join(' · '))+'</span></div>').join(''):esc(record.PO_Approval_State==='Not Configured'?'Not Submitted':record.PO_Approval_State||'Not Recorded');
  }
  function render(entries,options){
    const rows=family(entries),amount=options.amount;
    if(!rows.length)return '<div class="requests-empty">No Purchase Orders Match</div>';
    const originals=new Map(rows.filter(row=>!row.entry.record._poOriginalId).map(row=>[row.entry.record.ID,row.entry.record]));
    return '<div class="po-register-scroll" tabindex="0" role="region" aria-label="Purchase Order Report"><table class="po-register"><thead><tr>'+['PO Number','PO Date','Vendor','Amount','Notes','Requested By','PO Approved By','Coding Approved By','Entered In GP','PO Closed'].map(label=>'<th scope="col">'+label+'</th>').join('')+'</tr></thead><tbody>'+rows.map(({entry:e,depth,missingParent})=>{const r=e.record,requester=options.requester(r),parent=originals.get(r._poOriginalId),number=r._poOriginalId?(parent&&parent.PO_Number||r._poOriginalNumber):r.PO_Number,id=(number||'Not Assigned')+(r._poOriginalId?' · Supplement '+r._poSupplementNumber:'');return '<tr data-request-key="'+esc(e.budgetId+':po-register:'+r.ID)+'" class="'+(depth?'po-register-supplement':'')+'"><th scope="row"><span class="po-register-reference">'+esc(id)+'</span>'+(!number?'<span class="po-register-meta">Reference: '+esc(r._poOriginalId||r.ID)+'</span>':'')+(missingParent?'<span class="po-register-meta">Original PO Outside Results</span>':'')+'</th><td>'+esc(date(r.Request_Date)||'Not Recorded')+'</td><td>'+esc(options.vendor(r)||'Unavailable')+'<span class="po-register-meta">'+esc(e.project+' / '+e.phase)+'</span></td><td class="po-register-amount" data-requests-number="po-register:'+esc(r.ID)+'">'+esc(amount(r.Request_Amount))+'</td><td>'+esc(r.PO_Description||'Not Recorded')+'</td><td>'+esc(requester||'Not Recorded')+'</td><td>'+approvals(r)+'</td><td>Not Recorded</td><td>Not Recorded</td><td>Not Recorded</td></tr>';}).join('')+'</tbody></table></div>';
  }
  root.LMPORegister={family,date,render,select};
})(typeof window==='undefined'?globalThis:window);
