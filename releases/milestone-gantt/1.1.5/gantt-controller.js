(function (root) {
  'use strict';
  function create(options) {
    const state = options.state, config = options.config, dates = options.dates;
    let activeRun = null, starting = null, bound = false, nativePending = 0;
    const view = options.view || createProgressView(root.document, {close: closeRun, recheck});
    Object.assign(state, {ready:false, nativeReady:false, loadGeneration:0, saveInProgress:false, saveReview:null});
    const sdk = () => root.ZOHO && root.ZOHO.CREATOR;
    const mark = (name, meta) => { if (root.LMPerf) root.LMPerf.mark('gantt:' + name, meta); };
    const dirty = () => options.dirty();
    const unresolved = () => state.saveReview && state.saveReview.items.some(item => item.status === 'unknown');
    function canEdit() { return state.ready && !state.loading && !state.saveInProgress && !nativePending && !unresolved() && !(activeRun && activeRun.open); }
    function controls() {
      const document = root.document;
      if (!document) return;
      const blocked = !canEdit();
      ['gantt','unscheduled'].forEach(id => { const node=document.getElementById(id); if(node)node.inert=blocked; });
      ['subdivisionSelect','resetBtn'].forEach(id => { const node=document.getElementById(id); if(node)node.disabled=blocked; });
      const refresh=document.getElementById('refreshBtn');if(refresh)refresh.disabled=state.loading||state.saveInProgress||!!nativePending||!!unresolved()||!!(activeRun&&activeRun.open);
      const save=document.getElementById('saveBtn');if(save){save.textContent=unresolved()?'Recheck Saved Dates':'Save Changes';save.disabled=unresolved()?state.saveInProgress||!!nativePending||!!(activeRun&&activeRun.open):blocked||!!state.drag||!dirty().length;}
      document.querySelectorAll('[data-zoom]').forEach(node => {node.disabled=blocked;});
    }
    function render() { options.render(); controls(); }
    function readAll(reportName, generation) { return root.LMData.readAll({reportName,fresh:true,isCancelled:()=>generation!==state.loadGeneration}); }
    function reload() {
      if (!state.nativeReady) return Promise.reject(new Error('Creator is not connected.'));
      if (state.saveInProgress || nativePending || unresolved() || activeRun&&activeRun.open || state.drag || dirty().length) {options.message('Finish or reset edits before refreshing.','warn');return Promise.resolve(false);}
      const generation=++state.loadGeneration;
      state.loading=true;state.ready=false;controls();options.message('Loading Creator data…');render();mark('load-start',{generation});
      return Promise.all([readAll(config.reports.subdivisions,generation),readAll(config.reports.milestones,generation)]).then(results=>{
        if(generation!==state.loadGeneration)return false;
        if(state.drag||dirty().length)throw new Error('An edit began during refresh. Finish it before refreshing.');
        const subdivisions=results[0].map(options.mapSubdivision).sort((a,b)=>(a.name||'').toLowerCase().localeCompare((b.name||'').toLowerCase()));
        const milestones=results[1].map(options.mapMilestone).sort(options.sortMilestones);
        state.subdivisions=subdivisions;state.milestones=milestones;
        options.loaded();state.loading=false;state.ready=true;
        const staged=options.syncDates();
        options.message(staged?'Dry Utilities / Punch List sync is staged; click Save Changes to update Creator.':'Loaded '+subdivisions.length+' subdivisions and '+milestones.length+' milestones.',staged?'warn':'ok');
        mark('data-ready',{generation,subdivisions:subdivisions.length,milestones:milestones.length});render();mark('first-usable',{generation});return true;
      }).catch(error=>{
        if(generation!==state.loadGeneration||error&&error.cancelled)return false;
        state.loading=false;state.ready=false;options.message('Failed to load: '+options.describe(error),'err');options.diag('Load error',error);render();mark('load-failed',{generation,code:error&&error.code});throw error;
      });
    }
    function deadline(promise, milliseconds, message) {
      let timer;
      return new Promise((resolve,reject)=>{
        let settled=false;
        timer=root.setTimeout(()=>{if(settled)return;settled=true;const error=new Error(message);error.uncertain=true;reject(error);},milliseconds);
        Promise.resolve(promise).then(value=>{if(settled)return;settled=true;root.clearTimeout(timer);resolve(value);},error=>{if(settled)return;settled=true;root.clearTimeout(timer);reject(error);});
      });
    }
    function start() {
      if(!bound){options.bind();view.bind();bound=true;}
      if(starting)return starting;
      state.loading=true;state.ready=false;controls();mark('init-start');
      let settled=false,timer;
      const handshake=new Promise((resolve,reject)=>{
        timer=root.setTimeout(()=>{if(settled)return;settled=true;reject(new Error('Creator initialization timed out.'));},5000);
        Promise.resolve().then(()=>{
          const creator=sdk();if(!creator||!creator.DATA||!creator.UTIL||typeof creator.UTIL.getInitParams!=='function'||!root.LMData)throw new Error('Creator SDK v2 is unavailable.');
          return creator.UTIL.getInitParams();
        }).then(params=>{
          if(settled)return;
          if(!params||typeof params!=='object'||Array.isArray(params))throw new Error('Creator context is unavailable.');
          const runtime=root.LMRuntime.apply(params);
          if(!runtime||runtime.environment==='UNKNOWN'||!runtime.user||runtime.user==='(unknown)'||runtime.user==='[object Object]')throw new Error('Creator did not identify the connected user and environment.');
          options.connected(runtime);settled=true;root.clearTimeout(timer);resolve();
        }).catch(error=>{if(settled)return;settled=true;root.clearTimeout(timer);reject(error);});
      });
      starting=handshake.then(()=>{state.nativeReady=true;mark('init-ready');return reload();}).catch(error=>{
        state.nativeReady=false;state.loading=false;state.ready=false;options.message('Creator connection failed: '+options.describe(error),'err');options.diag('Creator init error',error);render();mark('init-failed',{code:error&&error.code});return false;
      }).finally(()=>{starting=null;});return starting;
    }
    function capture(milestone) {
      const baseline=options.baseline(milestone);
      const sent={id:String(milestone.id),name:milestone.name,generation:state.loadGeneration,startDay:dates.day(milestone.draftStart),endDay:dates.day(milestone.draftEnd),baselineStart:baseline.start?dates.day(baseline.start):null,baselineEnd:baseline.end?dates.day(baseline.end):null,payload:Object.freeze({Start_Date:dates.format(milestone.draftStart),End_Date:dates.format(milestone.draftEnd)})};
      if(!/^\d+$/.test(sent.id)||!Number.isSafeInteger(sent.startDay)||!Number.isSafeInteger(sent.endDay)||sent.endDay<sent.startDay)throw new Error('Milestone dates or record ID are invalid.');
      return Object.freeze(sent);
    }
    function confirmation(response,id) {
      if(!response||typeof response!=='object'||Array.isArray(response)||String(response.code)!=='3000')throw response||new Error('Creator did not confirm this update.');
      function reject(cause,message) {
        const error=new Error(cause&&(cause.message||cause.description)||message);
        error.code=cause&&cause.code!=null&&String(cause.code)!=='3000'?cause.code:'MALFORMED_MUTATION_RESPONSE';
        error.raw=response;error.response=response;error.cause=cause;error.uncertain=true;throw error;
      }
      const hasResult=Object.prototype.hasOwnProperty.call(response,'result');
      if(response.error||response.success===false||/^(error|failed|failure)$/i.test(String(response.status||'').trim()))reject(response,'Creator returned an error with the update response.');
      if(hasResult&&Object.prototype.hasOwnProperty.call(response,'data'))reject(response,'Creator returned competing write results.');
      if(hasResult&&(!Array.isArray(response.result)||response.result.length!==1)){
        const failed=Array.isArray(response.result)&&response.result.find(item=>item&&String(item.code)!=='3000');
        reject(failed||response,'Creator did not confirm this update.');
      }
      const items=hasResult?response.result:[response];
      for(const item of items){
        if(!item||typeof item!=='object'||Array.isArray(item)||String(item.code)!=='3000'||item.error||item.success===false||/^(error|failed|failure)$/i.test(String(item.status||'').trim())||hasResult&&Object.prototype.hasOwnProperty.call(item,'result'))reject(item,'Creator rejected this update.');
        if(item.data&&(item.data.error||item.data.success===false||/^(error|failed|failure)$/i.test(String(item.data.status||'').trim())||item.data.code!=null&&String(item.data.code)!=='3000'))reject(item.data,'Creator returned a failure beside the milestone ID.');
        if(!item.data||typeof item.data!=='object'||Array.isArray(item.data)||typeof item.data.ID!=='string'||item.data.ID!==id)reject(item,'Creator did not confirm the expected milestone ID.');
      }
      return response;
    }
    function knownRejection(error) { return !!error && !error.uncertain && ['2898','2899','2945'].includes(String(error.code)); }
    function range(row) {
      if(!row||typeof row.ID!=='string'||!Object.prototype.hasOwnProperty.call(row,'Start_Date')||!Object.prototype.hasOwnProperty.call(row,'End_Date'))throw new Error('Creator did not return the milestone date fields.');
      const start=dates.parse(row.Start_Date),end=dates.parse(row.End_Date);
      if(row.Start_Date&&!start||row.End_Date&&!end)throw new Error('Creator returned an unreadable milestone date.');
      return {start:start?dates.day(start):null,end:end?dates.day(end):null};
    }
    function readRange(sent) {
      return deadline(root.LMData.readAll({reportName:config.reports.milestones,criteria:'(ID == '+sent.id+')',fields:['ID','Start_Date','End_Date'],fresh:true}),20000,'Milestone verification timed out.').then(rows=>{
        if(rows.length!==1||rows[0].ID!==sent.id)throw new Error('Creator did not return this milestone.');
        return range(rows[0]);
      });
    }
    function matches(sent,saved) { return saved.start===sent.startDay&&saved.end===sent.endDay; }
    function applyVerified(sent) {
      if(sent.generation!==state.loadGeneration)throw new Error('Milestone data changed while saving. Refresh to verify.');
      const current=options.find(sent.id);if(!current)throw new Error('The verified milestone is no longer loaded.');
      current.start=dates.from(sent.startDay);current.end=dates.from(sent.endDay);
      if(current.raw){current.raw.Start_Date=sent.payload.Start_Date;current.raw.End_Date=sent.payload.End_Date;}
    }
    function update(sent) {
      nativePending++;controls();
      const native=root.LMData.request('gantt:update:'+sent.id,()=>sdk().DATA.updateRecordById({report_name:config.reports.milestones,id:sent.id,payload:{data:{Start_Date:sent.payload.Start_Date,End_Date:sent.payload.End_Date}}}));
      const tracked=Promise.resolve(native).finally(()=>{nativePending=Math.max(0,nativePending-1);controls();if(activeRun)view.patch(activeRun);});
      return deadline(tracked,30000,'Milestone update outcome is unknown. Recheck saved dates before trying again.').then(response=>confirmation(response,sent.id));
    }
    function emit(run) { if(activeRun===run)view.patch(run); }
    function phase(run,stage) {run.targetStage=stage;run.stages[stage]='running';view.advance(run);emit(run);}
    function verify(run,item) {
      item.status='verifying';emit(run);
      return readRange(item.sent).then(saved=>{
        if(!matches(item.sent,saved)){const error=new Error('Saved dates do not match the submitted range.');error.uncertain=true;throw error;}
        applyVerified(item.sent);item.status='verified';item.message='Saved dates verified';
      }).catch(error=>{item.status='unknown';item.message=options.describe(error);item.error=error;options.diag('Milestone verification failed',{id:item.sent.id,error});}).then(()=>emit(run));
    }
    function finish(run) {
      const verified=run.items.filter(item=>item.status==='verified').length;
      state.saveReview=run.items.some(item=>item.status==='unknown')?run:null;
      run.finished=true;run.targetStage=3;run.message=verified+' of '+run.items.length+' milestone date ranges verified';run.outcome=verified===run.items.length?'success':'review';
      if(!run.preflightFailed)run.stages[2]=run.outcome==='success'?'done':'review';
      if(run.outcome==='success')run.stages=['done','done','done'];
      mark('save-settled',{verified,intended:run.items.length,unknown:run.items.filter(item=>item.status==='unknown').length});
      options.message(run.outcome==='success'?'Milestone dates verified':'Milestone dates need review',run.outcome==='success'?'ok':'err');
      return view.finish(run).then(()=>{state.saveInProgress=false;render();emit(run);return {verified,items:run.items};});
    }
    function save() {
      if(unresolved()){if(nativePending||state.saveInProgress||activeRun&&activeRun.open)return Promise.resolve(false);return recheck();}
      if(!canEdit()||state.drag)return Promise.resolve(false);
      let snapshots;
      try{snapshots=dirty().filter(m=>m.draftStart&&m.draftEnd&&m.id).map(capture);}catch(error){options.message(options.describe(error),'err');return Promise.resolve(false);}
      if(!snapshots.length){options.message('No changes to save.','ok');return Promise.resolve(false);}
      const run={items:snapshots.map(sent=>({sent,status:'pending',message:''})),stages:['running','waiting','waiting'],open:true,finished:false,targetStage:0,displayStage:0,nativePending:()=>nativePending,trigger:root.document&&root.document.activeElement};
      activeRun=run;state.saveInProgress=true;view.open(run);controls();mark('save-start',{intended:run.items.length});
      let preflightFailed=false;
      return run.items.reduce((promise,item)=>promise.then(()=>{
        item.status='checking';emit(run);
        return readRange(item.sent).then(saved=>{
          if(matches(item.sent,saved)){applyVerified(item.sent);item.status='verified';item.message='Already saved; verified';return;}
          if(saved.start!==item.sent.baselineStart||saved.end!==item.sent.baselineEnd)throw new Error('Dates changed in Creator. Review this milestone before saving.');
          item.status='ready';item.message='Ready to update';
        }).catch(error=>{preflightFailed=true;item.status='failed';item.message=options.describe(error);item.error=error;options.diag('Milestone preflight failed',{id:item.sent.id,error});}).then(()=>emit(run));
      }),Promise.resolve()).then(()=>{
        run.preflightFailed=preflightFailed;run.stages[0]=preflightFailed?'review':'done';
        if(preflightFailed){run.stages[1]='not_sent';run.stages[2]='not_sent';run.items.forEach(item=>{if(item.status==='ready'){item.status='not_sent';item.message='No update sent';}});return;}
        phase(run,1);let stopped=false;
        return run.items.reduce((promise,item)=>promise.then(()=>{
          if(item.status==='verified')return;
          if(stopped){item.status='not_sent';item.message='No update sent';emit(run);return;}
          item.status='sending';item.message='Updating dates';emit(run);
          return update(item.sent).then(()=>{item.status='acknowledged';item.message='Update acknowledged; verification pending';}).catch(error=>{
            item.status=knownRejection(error)?'failed':'unknown';item.message=options.describe(error);item.error=error;item.mutationError=error;if(item.status==='unknown')stopped=true;options.diag('Milestone update failed',{id:item.sent.id,error});
          }).then(()=>emit(run));
        }),Promise.resolve());
      }).then(()=>{
        if(!preflightFailed){run.stages[1]=run.items.some(item=>['failed','unknown','not_sent'].includes(item.status))?'review':'done';phase(run,2);}else{run.targetStage=2;view.advance(run);emit(run);}
        return run.items.reduce((promise,item)=>promise.then(()=>item.status==='acknowledged'||item.status==='unknown'&&!nativePending?verify(run,item):undefined),Promise.resolve());
      }).then(()=>finish(run)).catch(error=>{
        run.items.forEach(item=>{if(!['verified','failed','not_sent'].includes(item.status)){item.status='unknown';item.message=options.describe(error);}});options.diag('Milestone save failed',error);return finish(run);
      });
    }
    function recheck() {
      const run=state.saveReview;
      if(!run||state.saveInProgress||nativePending)return Promise.resolve(false);
      activeRun=run;run.open=true;run.finished=false;run.outcome=null;run.targetStage=2;run.displayStage=2;run.stages[2]='running';state.saveInProgress=true;view.open(run);controls();mark('recheck-start',{intended:run.items.length});
      return run.items.reduce((promise,item)=>promise.then(()=>item.status==='unknown'?verify(run,item):undefined),Promise.resolve()).then(()=>finish(run));
    }
    function closeRun() {
      if(!activeRun||!activeRun.finished||state.saveInProgress)return false;
      activeRun.open=false;view.close(activeRun);render();return true;
    }
    return Object.freeze({start,reload,readAll,canEdit,controls,save,recheck,closeRun,capture,readRange,confirmation,run:()=>activeRun});
  }

  const checkIcon='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function createProgressView(document,actions) {
    let current=null,mounted=null,pacing=null,resolveFinished=null;
    const $=id=>document.getElementById(id);
    const reduced=()=>root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function bind() {
      $('ganttSaveClose').addEventListener('click',actions.close);$('ganttSaveX').addEventListener('click',actions.close);$('ganttSaveRecheck').addEventListener('click',actions.recheck);
      document.addEventListener('keydown',event=>{
        if(!current||!current.open)return;
        if(event.key==='Escape'){event.preventDefault();if(current.finished)actions.close();return;}
        if(event.key!=='Tab')return;
        const buttons=Array.from($('ganttSaveDialog').querySelectorAll('button')).filter(button=>!button.disabled&&!button.hidden);
        const first=buttons[0],last=buttons[buttons.length-1];
        if(!first){event.preventDefault();$('ganttSaveDialog').focus();return;}
        if(event.shiftKey&&(document.activeElement===first||document.activeElement===$('ganttSaveDialog'))){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      });
    }
    function open(run) {
      current=run;run.displayDone=false;$('ganttSaveOverlay').hidden=false;$('ganttApp').inert=true;
      if(mounted!==run){
        $('ganttSaveResults').textContent='';run.items.forEach(item=>{
          const row=document.createElement('li');row.className='gantt-save-result';
          const name=document.createElement('strong'),range=document.createElement('span'),status=document.createElement('b'),detail=document.createElement('small');
          name.textContent=item.sent.name;range.textContent=item.sent.payload.Start_Date+' → '+item.sent.payload.End_Date;
          row.appendChild(name);row.appendChild(range);row.appendChild(status);row.appendChild(detail);$('ganttSaveResults').appendChild(row);item.nodes={row,status,detail};
        });mounted=run;
      }
      patch(run);$('ganttSaveDialog').focus();
    }
    function patch(run) {
      if(current!==run)return;
      const verified=run.items.filter(item=>item.status==='verified').length,terminal=run.finished&&run.displayDone;
      $('ganttSaveTitle').textContent=terminal?(run.outcome==='success'?'Milestone dates saved':'Milestone dates need review'):'Saving milestone dates';
      $('ganttSaveContext').textContent='Gantt drafts → Creator milestones · '+run.items.length+' records';
      $('ganttSaveBarFill').style.width=Math.round(verified*100/run.items.length)+'%';$('ganttSaveBar').setAttribute('aria-valuenow',String(verified));$('ganttSaveBar').setAttribute('aria-valuemax',String(run.items.length));
      $('ganttSaveCount').textContent=verified+' / '+run.items.length+' verified';
      const labels=['Verify milestones','Send date updates','Verify saved dates'];
      labels.forEach((label,index)=>{
        const node=$('ganttSaveStage'+index),result=run.stages[index],status=terminal||result==='review'||result==='not_sent'?result:index<run.displayStage?result:index===run.displayStage?'running':'waiting';
        node.className='gantt-save-stage '+status;node.querySelector('.gantt-save-stage-icon').innerHTML=status==='done'?checkIcon:String(index+1);node.querySelector('.gantt-save-stage-chip').textContent=status==='done'?'Done':status==='review'?'Needs review':status==='not_sent'?'Not sent':status==='running'?'Running':'Up next';
      });
      const statusNames={pending:'Waiting',checking:'Checking',ready:'Ready',sending:'Updating',acknowledged:'Verification pending',verifying:'Verifying',verified:'Verified',failed:'Failed',unknown:'Needs review',not_sent:'Not sent'};
      run.items.forEach(item=>{if(!item.nodes)return;item.nodes.row.className='gantt-save-result '+item.status;item.nodes.status.textContent=statusNames[item.status];item.nodes.detail.textContent=item.message||'';});
      $('ganttSaveStatus').textContent=terminal?run.message:['Checking current milestone dates','Sending date updates','Reading saved dates back'][Math.min(run.displayStage,2)];
      $('ganttSaveClose').disabled=!terminal;$('ganttSaveX').disabled=!terminal;
      $('ganttSaveClose').textContent=terminal&&run.outcome==='success'?'Done':'Close';
      $('ganttSaveRecheck').hidden=!terminal||!run.items.some(item=>item.status==='unknown');$('ganttSaveRecheck').disabled=!!run.nativePending();
    }
    function pump(run) {
      if(current!==run||pacing)return;
      const tick=()=>{
        pacing=null;if(current!==run)return;
        if(run.displayStage<Math.min(run.targetStage,2))run.displayStage++;
        else if(run.finished){run.displayDone=true;patch(run);const resolve=resolveFinished;resolveFinished=null;if(resolve)resolve();$('ganttSaveClose').focus();return;}
        patch(run);pump(run);
      };
      if(run.displayStage<Math.min(run.targetStage,2)||run.finished&&!run.displayDone){if(reduced())tick();else pacing=root.setTimeout(tick,560);}
    }
    function finish(run) {return new Promise(resolve=>{resolveFinished=resolve;pump(run);});}
    function close(run) {if(current!==run)return;$('ganttSaveOverlay').hidden=true;$('ganttApp').inert=false;if(run.trigger&&run.trigger.isConnected&&typeof run.trigger.focus==='function')run.trigger.focus();}
    return {bind,open,patch,advance:pump,finish,close};
  }
  root.LMGantt=Object.freeze({create,createProgressView});
})(window);
