(function(root){
  'use strict';
  function create(options){
    const $=id=>document.getElementById(id);let background=[],trigger=null,rows=new Map(),ledger=null;
    function start(input,label){
      ledger=null;rows=new Map();
      const modal=$('bulkModal');background=Array.from(document.body.children).filter(node=>node!==modal&&node.tagName!=='SCRIPT').map(node=>({node,inert:node.inert}));background.forEach(item=>{item.node.inert=true;});
      $('bulkField').closest('.fg').hidden=true;$('bulkValueWrap').hidden=true;modal.querySelector('.bulk-warning').hidden=true;
      $('bulkProgress').hidden=false;$('bulkResults').replaceChildren();$('bulkContext').textContent=label;
      input.ids.forEach(id=>{const row=document.createElement('li'),name=document.createElement('strong'),status=document.createElement('span'),detail=document.createElement('div');name.textContent=options.name(input.type,id);status.textContent='Waiting';detail.hidden=true;row.append(name,status,detail);$('bulkResults').appendChild(row);rows.set(id,{row,status,detail});});
      $('bulkApplyBtn').hidden=true;$('bulkCancelBtn').disabled=true;$('bulkClose').disabled=true;
      $('bulkModal').querySelector('[role="dialog"]').setAttribute('tabindex','-1');$('bulkModal').querySelector('[role="dialog"]').focus();
    }
    function patch(value){
      ledger=value;const saved=value.entries.filter(entry=>entry.state==='saved').length,total=value.entries.length;
      $('bulkProgressBar').setAttribute('aria-valuemax',String(total));$('bulkProgressBar').setAttribute('aria-valuenow',String(saved));$('bulkProgressFill').style.width=(saved/total*100)+'%';
      const stage=value.finished?'Saved '+saved+' of '+total:value.stage==='checking'?'Checking records…':value.stage==='refreshing'?'Refreshing saved records…':'Saving changes…';
      $('bulkMsgModal').textContent=stage;$('bulkProgressStatus').textContent=value.error||value.refreshError||'';$('bulkProgressStatus').hidden=!value.error&&!value.refreshError;
      $('bulkStages').textContent=value.finished?(saved===total?'Complete':'Needs Review'):value.stage==='checking'?'Checking Records':value.stage==='refreshing'?'Refreshing Records':'Saving Changes';
      value.entries.forEach(entry=>{const ui=rows.get(entry.id);if(!ui)return;ui.status.textContent={saved:'Saved',rejected:'Failed',unknown:'Needs Review',saving:'Saving…','not-sent':value.finished?'Not Sent':'Waiting'}[entry.state];ui.row.dataset.state=entry.state;ui.detail.textContent=entry.error&&entry.error.message||'';ui.detail.hidden=!entry.error;});
      if(value.finished){$('bulkCancelBtn').disabled=false;$('bulkCancelBtn').textContent='Close';$('bulkClose').disabled=false;$('bulkCancelBtn').focus();}
    }
    function release(){background.forEach(item=>{item.node.inert=item.inert;});const wasOpen=background.length>0;background=[];const target=trigger&&trigger.isConnected&&trigger.getClientRects().length?trigger:$('checkVisible');if(wasOpen&&target)target.focus();ledger=null;}
    function reset(){release();trigger=document.activeElement;$('bulkField').closest('.fg').hidden=false;$('bulkValueWrap').hidden=false;$('bulkModal').querySelector('.bulk-warning').hidden=false;$('bulkProgress').hidden=true;$('bulkApplyBtn').hidden=false;$('bulkCancelBtn').textContent='Cancel';}
    document.addEventListener('keydown',event=>{
      if(!background.length||!$('bulkModal').classList.contains('show'))return;
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();if(ledger&&ledger.finished)options.close();return;}
      if(event.key!=='Tab')return;
      const dialog=$('bulkModal').querySelector('[role="dialog"]'),buttons=Array.from(dialog.querySelectorAll('button')).filter(node=>!node.disabled&&!node.hidden&&node.getClientRects().length),first=buttons[0],last=buttons[buttons.length-1];
      if(!first){event.preventDefault();dialog.focus();}else if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog)){event.preventDefault();last.focus();}else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===dialog)){event.preventDefault();first.focus();}
    },true);
    return {start,patch,release,reset};
  }
  root.LMMassUpdateUI={create};
})(window);
