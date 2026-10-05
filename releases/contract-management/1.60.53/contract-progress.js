// PRIVATE PREPARATION ONLY. Mounted progress and source-entry UI adapter; no live SDK access.
(function(root){
  'use strict';
  function create(options){
    const document=root.document,$=id=>document.getElementById(id),areas=['overlays','view'];
    let epoch=0,current=null,mounted=null,finishedResolve=null,pacing=null;const disabled=new Map(),background=new Map();
    const reduced=()=>root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function capture(kind){return{kind,epoch,actor:JSON.stringify(root.LMRuntime.current())};}
    function owns(request){return request&&request.epoch===epoch&&request.actor===JSON.stringify(root.LMRuntime.current());}
    function invalidate(){epoch++;}
    function controls(snapshot){
      const blocked=snapshot.interactionBlocked;
      areas.forEach(id=>{const node=$(id);if(node)node.inert=blocked;});
      ['tabParcels','tabProperties','runSearchBtn','bulkApplyBtn','bulkEditApplyBtn','modalSaveBtn'].forEach(id=>{const node=$(id);if(!node)return;if(blocked){if(!disabled.has(node))disabled.set(node,!!node.disabled);node.disabled=true;}else if(disabled.has(node)){node.disabled=disabled.get(node);disabled.delete(node);}});
      if(snapshot.referenceState==='error'||snapshot.scopeState==='error'){
        const table=$('tableWrap');if(table)table.inert=true;
        const bulk=$('bulkBar');if(bulk)bulk.inert=true;
        if(snapshot.referenceState==='error'){const prop=$('propPanel');if(prop)prop.inert=true;}
      }
      if(current)patch(current.ledger);
    }
    function node(tag,id,parent,text){const element=document.createElement(tag);if(id)element.id=id;if(text!=null)element.textContent=text;if(parent)parent.appendChild(element);return element;}
    function icon(parent,kind){const namespace='http://www.w3.org/2000/svg',svg=document.createElementNS(namespace,'svg'),path=document.createElementNS(namespace,'path');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.style.width='20px';svg.style.height='20px';path.setAttribute('d',kind==='check'?'M5 12l4 4L19 6':'M6 6l12 12M18 6L6 18');path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','2.5');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');svg.appendChild(path);parent.appendChild(svg);}
    function mount(){
      if($('contractSaveOverlay'))return;
      const style=node('style','contractSaveStyle',document.head,`.contract-save-overlay{position:fixed;inset:0;background:#0e2039a8;z-index:1000;display:flex;align-items:center;justify-content:center;padding:18px}.contract-save-overlay[hidden]{display:none}.contract-save-dialog{width:min(720px,100%);max-height:calc(100dvh - 36px);display:flex;flex-direction:column;overflow:hidden;background:white;border-radius:14px;box-shadow:0 22px 90px #09234255;font:14px system-ui;color:#18324e}.contract-save-header{background:linear-gradient(120deg,#112b49,#26476e);color:white;padding:20px 24px;display:flex;gap:18px;align-items:center}.contract-save-header h2{margin:0 0 5px;font-size:21px}.contract-save-header p{margin:0;color:#d5e3ef}.contract-save-x{margin-left:auto;display:grid;place-items:center;width:36px;height:36px;border:0;border-radius:8px;color:white;background:#ffffff15}.contract-save-body{overflow:auto;padding:20px 24px}.contract-save-bar{height:6px;background:#e7edf3;border-radius:6px;overflow:hidden;margin:12px 0 20px}.contract-save-bar i{display:block;height:100%;background:#2c865b;width:0}.contract-save-stage{display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid #edf1f5}.contract-save-stage em{margin-left:auto;font-size:11px;font-style:normal;background:#eaf0f6;border-radius:12px;padding:4px 9px}.contract-save-stage b{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:#eaf0f6}.contract-save-results{list-style:none;padding:0;margin:18px 0 0}.contract-save-results li{padding:8px 0;border-bottom:1px solid #edf1f5;display:grid;grid-template-columns:1fr auto;gap:3px 14px}.contract-save-results small{grid-column:1 / -1;color:#687d92}.contract-save-footer{display:flex;gap:10px;align-items:center;padding:16px 24px;border-top:1px solid #dbe4ec;background:#f6f9fc}.contract-save-footer p{margin:0;flex:1}.contract-save-footer button{border:1px solid #bdcad8;border-radius:8px;background:white;padding:9px 15px}.contract-save-footer button:disabled,.contract-save-x:disabled{opacity:.45}.contract-save-result.verified b{color:#287b51}.contract-save-result.unknown b,.contract-save-stage.review em{color:#9f6220}`);
      style.dataset.privatePreparation='true';const overlay=node('div','contractSaveOverlay',document.body);overlay.className='contract-save-overlay';overlay.hidden=true;
      const dialog=node('section','contractSaveDialog',overlay);dialog.className='contract-save-dialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','contractSaveTitle');dialog.setAttribute('aria-describedby','contractSaveContext');dialog.tabIndex=-1;
      const header=node('header','',dialog);header.className='contract-save-header';const titles=node('div','',header);node('h2','contractSaveTitle',titles);node('p','contractSaveContext',titles);const x=node('button','contractSaveX',header);x.type='button';x.className='contract-save-x';x.setAttribute('aria-label','Close progress');icon(x,'x');
      const body=node('div','',dialog);body.className='contract-save-body';node('p','contractSaveCount',body);const bar=node('div','contractSaveBar',body);bar.className='contract-save-bar';bar.setAttribute('role','progressbar');bar.setAttribute('aria-label','Persisted Contract destinations verified');bar.setAttribute('aria-valuemin','0');node('i','contractSaveBarFill',bar);
      ['Verify complete selection','Send fields to Creator','Verify persisted fields'].forEach((label,index)=>{const row=node('div','contractSaveStage'+index,body);row.className='contract-save-stage';node('b','contractSaveStageIcon'+index,row,String(index+1));node('strong','',row,label);node('em','contractSaveStageChip'+index,row,'Up next');});
      const results=node('ol','contractSaveResults',body);results.className='contract-save-results';const footer=node('footer','',dialog);footer.className='contract-save-footer';const status=node('p','contractSaveStatus',footer);status.setAttribute('aria-live','polite');node('button','contractSaveRecheck',footer,'Recheck Saved Fields');node('button','contractSaveClose',footer,'Close');
      x.addEventListener('click',close);$('contractSaveClose').addEventListener('click',close);$('contractSaveRecheck').addEventListener('click',()=>{if(current&&current.displayDone&&options.recheck)options.recheck(current.ledger);});
      document.addEventListener('focusin',event=>{if(current&&current.open&&!dialog.contains(event.target))dialog.focus();});
      document.addEventListener('keydown',event=>{
        if(!current||!current.open)return;if(event.key==='Escape'){event.preventDefault();if(current.displayDone)close();return;}if(event.key!=='Tab')return;
        const buttons=Array.from(dialog.querySelectorAll('button')).filter(button=>!button.disabled&&!button.hidden),first=buttons[0],last=buttons[buttons.length-1];
        if(!first){event.preventDefault();dialog.focus();return;}if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog)){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      });
    }
    function inertBackground(on){Array.from(document.body.children).forEach(child=>{if(child.id==='contractSaveOverlay'||child.id==='contractSaveStyle')return;if(on){if(!background.has(child))background.set(child,!!child.inert);child.inert=true;}else if(background.has(child)){child.inert=background.get(child);background.delete(child);}});}
    function open(ledger){
      mount();current={id:ledger.id,ledger,open:true,displayStage:0,targetStage:0,displayDone:false,trigger:document.activeElement,rows:new Map()};inertBackground(true);$('contractSaveOverlay').hidden=false;
      if(mounted!==ledger.id){$('contractSaveResults').textContent='';ledger.rows.forEach(entry=>{const li=node('li','',$('contractSaveResults'));li.className='contract-save-result';node('strong','',li,options.label?options.label(ledger.report,entry.id):entry.id);const status=node('b','',li,'Not sent'),detail=node('small','',li);current.rows.set(entry.id,{li,status,detail});});mounted=ledger.id;}
      patch(ledger);$('contractSaveDialog').focus();return true;
    }
    function patch(ledger){
      if(!current||current.id!==ledger.id)return;current.ledger=ledger;const verified=ledger.rows.filter(row=>row.state==='verified').length,terminal=ledger.finished&&current.displayDone,unknown=ledger.rows.some(row=>row.state==='unknown'),allVerified=!ledger.error&&ledger.rows.length>0&&verified===ledger.rows.length;
      if(ledger.stage==='sending')current.targetStage=ledger.rows.some(row=>row.phase==='verifying'||row.state==='verified')?2:1;
      $('contractSaveTitle').textContent=terminal?(allVerified?'Contract fields saved':'Contract fields need review'):'Saving Contract fields';$('contractSaveContext').textContent='Captured selection → '+ledger.report+' · '+ledger.rows.length+' records';$('contractSaveCount').textContent=verified+' / '+ledger.rows.length+' persisted destinations verified';
      $('contractSaveBarFill').style.width=(ledger.rows.length?verified*100/ledger.rows.length:0)+'%';$('contractSaveBar').setAttribute('aria-valuenow',String(verified));$('contractSaveBar').setAttribute('aria-valuemax',String(ledger.rows.length));
      for(let index=0;index<3;index++){let state=index<current.displayStage?'done':index===current.displayStage?'running':'waiting';if(terminal){if(ledger.stage==='preflight')state=index===0?'review':'not-sent';else state=index===0?'done':allVerified?'done':'review';}const row=$('contractSaveStage'+index),symbol=$('contractSaveStageIcon'+index);row.className='contract-save-stage '+state;$('contractSaveStageChip'+index).textContent={done:'Done',running:'Running',waiting:'Up next',review:'Needs review','not-sent':'Not sent'}[state];symbol.textContent=state==='done'?'':String(index+1);if(state==='done'&&!symbol.querySelector('svg'))icon(symbol,'check');}
      const names={'not-sent':'Not sent',pending:'Queued',verified:'Verified',rejected:'Rejected',unknown:'Needs review',sending:'Sending',verifying:'Verification pending'};
      ledger.rows.forEach(entry=>{if(!current.rows.has(entry.id)){const li=node('li','',$('contractSaveResults'));li.className='contract-save-result';node('strong','',li,options.label?options.label(ledger.report,entry.id):entry.id);const status=node('b','',li,'Not sent'),detail=node('small','',li);current.rows.set(entry.id,{li,status,detail});}const nodes=current.rows.get(entry.id);nodes.li.className='contract-save-result '+entry.state;nodes.status.textContent=names[entry.phase]||names[entry.state];nodes.detail.textContent=entry.message||Object.keys(entry.payload).join(', ');});
      $('contractSaveStatus').textContent=terminal?(ledger.error||verified+' verified'+(allVerified?'':'; review retained destinations before another send.')):['Checking the complete current selection','Sending captured fields','Reading saved fields back'][current.displayStage];
      $('contractSaveClose').disabled=!terminal;$('contractSaveX').disabled=!terminal;$('contractSaveClose').textContent=terminal&&allVerified?'Done':'Close';$('contractSaveRecheck').hidden=!terminal||!unknown;$('contractSaveRecheck').disabled=!!(options.recheckPending?options.recheckPending():options.pending&&options.pending());pump();
    }
    function pump(){
      if(!current||pacing)return;const run=current;if(run.displayStage>=run.targetStage&&(!run.ledger.finished||run.displayDone))return;
      const tick=()=>{pacing=null;if(current!==run)return;if(run.displayStage<run.targetStage)run.displayStage++;else if(run.ledger.finished){run.displayDone=true;patch(run.ledger);const resolve=finishedResolve;finishedResolve=null;if(resolve)resolve();$('contractSaveClose').focus();return;}patch(run.ledger);};
      if(reduced())tick();else pacing=root.setTimeout(tick,560);
    }
    function finish(ledger){if(!current||current.id!==ledger.id)return Promise.resolve();return new Promise(resolve=>{finishedResolve=resolve;patch(ledger);});}
    function close(){if(!current||!current.displayDone||options.pending&&options.pending())return false;if(options.close&&!options.close(current.id))return false;const run=current;run.open=false;current=null;mounted=null;$('contractSaveOverlay').hidden=true;inertBackground(false);if(options.snapshot)controls(options.snapshot());if(run.trigger&&run.trigger.isConnected&&typeof run.trigger.focus==='function')run.trigger.focus();return true;}
    return Object.freeze({controls,capture,owns,invalidate,open,patch,finish,close,progress:()=>current&&{id:current.id,displayDone:current.displayDone,displayStage:current.displayStage,open:current.open}});
  }
  root.LMContractUIPreparation=Object.freeze({create});
})(typeof window==='undefined'?globalThis:window);
