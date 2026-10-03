// Creator SDK2 complete reads, captured writes and persisted verification.
(function (root) {
  'use strict';
  function create(options) {
    const reports=options.reports,forms=options.forms;
    const references=['companies','rawLand','subdivisions','jurisdictions','projects'];
    let actor='',connected=false,initGeneration=0,referenceGeneration=0,scopeGeneration=0,pending=0,nativeWrites=0,verificationReads=0,editEpoch=0,countTail=Promise.resolve();
    let referenceState='idle',scopeState='idle',scopeIds=new Set(),propertyIds=new Set(),referenceRows={},scopeRows=[],scopeCriteria='',expected=null;
    const reviews=new Map(),drafts=new Map(),ledgers=new Map(),pendingKeys=new Set();let batchSequence=0,batchActive=null,progressOpen=null;
    const api=()=>root.ZOHO&&root.ZOHO.CREATOR&&root.ZOHO.CREATOR.DATA;
    const identity=()=>JSON.stringify(root.LMRuntime.current());
    const own=(value,key)=>Object.prototype.hasOwnProperty.call(value||{},key);
    const safeId=value=>typeof value==='string'&&/^\d+$/.test(value);
    const copy=value=>JSON.parse(JSON.stringify(value));
    function freeze(value){if(value&&typeof value==='object'){Object.keys(value).forEach(key=>freeze(value[key]));Object.freeze(value);}return value;}
    function protocolNodes(value){const nodes=[],seen=new Set();function visit(current,structured){if(structured&&typeof current==='string'&&/^[{[]/.test(current.trim())){try{current=JSON.parse(current);}catch(ignore){return;}}if(!current||typeof current!=='object'||seen.has(current))return;seen.add(current);if(Array.isArray(current)){current.forEach(item=>visit(item,false));return;}nodes.push(current);['result','details','response','output'].forEach(key=>{if(own(current,key))visit(current[key],true);});if(current.data&&typeof current.data==='object'&&!Array.isArray(current.data))visit(current.data,false);}visit(value,false);return nodes;}
    function nativeFailureCode(value){const node=protocolNodes(value).find(item=>item.code!=null&&String(item.code)!=='3000');return node&&node.code;}
    function error(message,raw,cause){const failure=new Error(message);failure.raw=raw;failure.response=raw;failure.cause=cause||raw;const native=nativeFailureCode(raw||cause)||root.LMData.failureCode(raw||cause);if(native!=null&&native!=='')failure.code=native;return failure;}
    function failed(value){return !value||typeof value!=='object'||Array.isArray(value)||!!value.error||value.success===false||/^(error|failed|failure)$/i.test(String(value.status||'').trim())||value.code!=null&&String(value.code)!=='3000';}
    function firstFailure(value){return protocolNodes(value).find(failed)||null;}
    function competingProtocol(value){return protocolNodes(value).some(item=>['details','response','output'].some(key=>own(item,key))||item!==value&&own(item,'result'));}
    function acknowledge(response,id){
      const hasResult=own(response,'result'),record=hasResult&&Array.isArray(response.result)&&response.result.length===1?response.result[0]:!hasResult?response:null;
      if(failed(response)||firstFailure(response)||competingProtocol(response)||String(response.code)!=='3000'||hasResult&&own(response,'data')||!record||own(record,'result')||failed(record)||String(record.code)!=='3000'||failed(record.data)||!safeId(record.data.ID)||id&&record.data.ID!==id){
        const failure=error('Creator did not confirm the exact record change.',response,firstFailure(response));failure.noReplay=true;throw failure;
      }
      return record.data.ID;
    }
    function candidateId(response){const ids=new Set();let malformed=false;for(const item of protocolNodes(response)){if(own(item,'id'))malformed=true;if(own(item,'ID')){if(!safeId(item.ID))malformed=true;else ids.add(item.ID);}}return !malformed&&ids.size===1?Array.from(ids)[0]:'';}
    function definiteRejection(raw){const hasResult=own(raw,'result'),single=hasResult&&String(raw.code)==='3000'&&!own(raw,'data')&&Array.isArray(raw.result)&&raw.result.length===1,record=single?raw.result[0]:raw;if(!raw||typeof raw!=='object'||Array.isArray(raw)||competingProtocol(raw)||hasResult&&!single||!record||typeof record!=='object'||Array.isArray(record)||own(record,'result')||!/^(1060|2894|2898|2899|2945)$/.test(String(record.code||'')))return false;return !protocolNodes(raw).some(item=>own(item,'ID')||own(item,'id'))&&(!own(record,'data')||record.data==null||typeof record.data==='object'&&!Array.isArray(record.data));}
    function decimal(value,currency,percentage){
      if(value==null||value==='')return '';
      if(typeof value!=='string'&&typeof value!=='number')throw new Error('A numeric Creator value has an unsupported representation.');
      let text=String(value).trim();if(currency)text=text.replace(/^\$\s*/, '');if(percentage)text=text.replace(/%$/, '').trim();
      if(text.includes(',')){if(!/^[+-]?\d{1,3}(,\d{3})*(\.\d+)?$/.test(text))throw new Error('A formatted numeric value is malformed.');text=text.replace(/,/g,'');}
      if(!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(text))throw new Error('A numeric Creator value is malformed.');
      const negative=text[0]==='-';text=text.replace(/^[+-]/,'');let [whole,fraction='']=text.split('.');whole=(whole||'0').replace(/^0+(?=\d)/,'');fraction=fraction.replace(/0+$/,'');const canonical=whole+(fraction?'.'+fraction:'');return negative&&canonical!=='0'?'-'+canonical:canonical;
    }
    function date(value){
      if(value==null||value==='')return '';if(typeof value!=='string')throw new Error('A Creator date is not a string.');
      let year,month,day;const iso=value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/),native=value.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/),app=value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if(iso){year=+iso[1];month=+iso[2];day=+iso[3];}else if(native){year=+native[3];month=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(native[2].toLowerCase())+1;day=+native[1];}else if(app){year=+app[3];month=+app[1];day=+app[2];}else throw new Error('A Creator date format is not recognized.');
      const check=new Date(Date.UTC(year,month-1,day));if(!month||check.getUTCFullYear()!==year||check.getUTCMonth()!==month-1||check.getUTCDate()!==day)throw new Error('A Creator date is invalid.');return String(year).padStart(4,'0')+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
    }
    function lookup(value){if(value==null||value==='')return '';const id=value&&typeof value==='object'&&!Array.isArray(value)?value.ID:value;if(!safeId(id))throw new Error('A Creator lookup ID is not a decimal string.');return id;}
    function strict(value){if(Array.isArray(value))return value.map(strict);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,strict(value[key])]));return value;}
    function comparable(report,field,value){
      const meta=(options.fieldsByReport&&options.fieldsByReport[report]||{})[field];if(!meta)return strict(value);
      if(typeof meta.values==='string'&&/\.ID$/.test(meta.values)){
        if(meta.type==='list'){if(value==null||value==='')return [];if(!Array.isArray(value))throw new Error('A Creator multi-lookup value is not an array.');const ids=value.map(lookup);if(ids.some(id=>!id)||new Set(ids).size!==ids.length)throw new Error('A Creator multi-lookup ID is empty or duplicated.');return ids.sort();}
        return lookup(value);
      }
      if(meta.type==='USD')return decimal(value,true,false);if(/^(decimal|number|percentage)$/.test(meta.type))return decimal(value,false,meta.type==='percentage');if(meta.type==='date')return date(value);
      if(meta.type==='checkbox'){if(value===true||value==='true')return true;if(value===false||value==='false')return false;if(value==null||value==='')return '';throw new Error('A Creator checkbox representation is malformed.');}
      if(value==null)return '';if(typeof value!=='string')throw new Error('A Creator text or choice value is not a string.');return value;
    }
    function matches(row,payload,report){return Object.keys(payload).every(field=>own(row,field)&&JSON.stringify(comparable(report,field,row[field]))===JSON.stringify(comparable(report,field,payload[field])));}
    function session(){if(!connected||identity()!==actor)throw new Error('A fresh, recognized Creator session is required.');}
    function changing(){return pending>0||!!batchActive||!!progressOpen||drafts.size>0||reviews.size>0||!!(options.isDirty&&options.isDirty())||!!(options.navigationDirty&&options.navigationDirty());}
    function interactionAllowed(){return connected&&identity()===actor&&referenceState!=='loading'&&scopeState!=='loading'&&pending===0&&!batchActive&&!progressOpen&&!reviews.size;}
    function notify(){if(options.onState)options.onState(snapshot());}
    function snapshot(){return {connected,referenceState,scopeState,pending,nativeWrites,verificationReads,editEpoch,referenceGeneration,scopeGeneration,expected,rows:scopeRows.length,batchActive:batchActive&&batchActive.id,progressOpen:progressOpen&&progressOpen.id,interactionBlocked:!interactionAllowed(),reviews:Array.from(reviews.values()).map(review=>({key:review.key,id:review.id,report:review.report,pending:!!review.nativePending||!!review.verificationPending,payload:copy(review.payload)}))};}
    function cancelled(check){if(check&&check())throw Object.assign(new Error('Load superseded.'),{cancelled:true});session();}
    async function nativeCount(report,criteria,check,max){
      const job=countTail.catch(()=>{}).then(async()=>{cancelled(check);const result=await api().getRecordCount({report_name:report,...(criteria?{criteria}:{})});cancelled(check);const raw=result&&result.result&&result.result.records_count,value=Number(raw);if(root.LMData.responseFailed(result)||failed(result)||firstFailure(result)||String(result.code)!=='3000'||failed(result.result)||(typeof raw!=='number'&&typeof raw!=='string')||typeof raw==='string'&&!/^\d+$/.test(raw.trim())||!Number.isSafeInteger(value)||value<0)throw error('Creator count is unavailable.',result,firstFailure(result));if(max!=null&&value>max)throw error('Narrow the search below '+max+' parcel years.',result);return {result,value};});
      countTail=job;return job;
    }
    async function count(report,criteria,check){session();return root.LMData.request(report+':tax-count',()=>nativeCount(report,criteria,check)).then(value=>value.value);}
    async function read(report,criteria,check,progress,max){
      session();let readExpected=null;
      const bridge={getRecordCount:async config=>{const answer=await nativeCount(report,criteria,check,max);readExpected=answer.value;return answer.result;},getRecords:config=>{cancelled(check);return api().getRecords(config);}};
      const rows=await root.LMData.readAll({reportName:report,criteria,fresh:true,api:bridge,isCancelled:check,onProgress:info=>{cancelled(check);if(progress)progress(info);}});
      cancelled(check);if(rows.some(row=>!row||!safeId(row.ID)))throw new Error('Creator returned a non-string record ID.');
      const after=await root.LMData.request(report+':tax-count-final',()=>nativeCount(report,criteria,check,max));
      if(after.value!==readExpected)throw new Error('The Creator record count changed during the complete read.');
      cancelled(check);return {rows,expected:readExpected};
    }
    async function start(){
      if(pending||nativeWrites||verificationReads||batchActive||progressOpen||reviews.size||drafts.size||options.isDirty&&options.isDirty()||options.navigationDirty&&options.navigationDirty())throw new Error('Finish or recheck the captured Tax operation before reconnecting.');const generation=++initGeneration;connected=false;referenceGeneration++;scopeGeneration++;referenceState='idle';scopeState='idle';propertyIds=new Set();scopeIds=new Set();notify();let timer,settled=false;
      return new Promise((resolve,reject)=>{
        timer=root.setTimeout(()=>{if(settled)return;settled=true;reject(new Error('Creator initialization timed out.'));},options.initTimeoutMs||5000);
        Promise.resolve().then(()=>{const creator=root.ZOHO&&root.ZOHO.CREATOR;if(!creator||!creator.UTIL||typeof creator.UTIL.getInitParams!=='function')throw new Error('Creator SDK2 session bridge is unavailable.');return creator.UTIL.getInitParams();}).then(params=>{
          if(settled||generation!==initGeneration)return;const runtime=root.LMRuntime.apply(params);if(!runtime.user||runtime.user==='(unknown)'||runtime.environment==='UNKNOWN')throw new Error('Creator did not identify a connected user and environment.');actor=identity();connected=true;settled=true;root.clearTimeout(timer);notify();resolve(runtime);
        }).catch(failure=>{if(settled||generation!==initGeneration)return;settled=true;root.clearTimeout(timer);connected=false;notify();reject(failure);});
      });
    }
    async function reloadReferences(){
      session();if(changing())return {published:false,blocked:true};const generation=++referenceGeneration,epoch=editEpoch;referenceState='loading';notify();
      const check=()=>generation!==referenceGeneration||epoch!==editEpoch||pending>0||referenceState!=='loading';
      try{const completed={};await Promise.all(references.map(async name=>{try{completed[name]=(await read(reports[name],'',check,info=>{if(options.onReferenceProgress)options.onReferenceProgress(name,info);})).rows;}catch(failure){if(name!=='projects')throw failure;completed.projects=null;completed.projectError=failure;}}));cancelled(check);if(changing())throw new Error('A draft started while reference data was loading.');referenceRows=completed;propertyIds=new Set(completed.rawLand.map(row=>row.ID));referenceState='ready';scopeState='idle';scopeIds=new Set();if(options.publishReferences)options.publishReferences(completed);notify();return {published:true,rows:completed};}catch(failure){if(generation!==referenceGeneration)return {published:false,superseded:true};const superseded=check();referenceState='error';notify();if(superseded)return {published:false,superseded:true,error:failure};throw failure;}
    }
    async function search(criteria){
      session();if(referenceState!=='ready'||changing())return {published:false,blocked:true};const generation=++scopeGeneration,epoch=editEpoch;scopeState='loading';expected=null;notify();
      const check=()=>generation!==scopeGeneration||epoch!==editEpoch||pending>0||referenceState!=='ready'||!!(options.scopeKey&&options.scopeKey()!==criteria);
      try{const loaded=await read(reports.parcelYears,criteria,check,info=>{if(options.onSearchProgress)options.onSearchProgress(info);},options.maxAutoRows||800);cancelled(check);if(changing())throw new Error('A draft started while parcel rows were loading.');scopeRows=loaded.rows;scopeCriteria=criteria;scopeIds=new Set(scopeRows.map(row=>row.ID));expected=loaded.expected;scopeState='ready';if(options.publishScope)options.publishScope(scopeRows,expected,criteria);notify();return {published:true,rows:scopeRows,expected};}catch(failure){if(generation!==scopeGeneration)return {published:false,superseded:true};scopeState='error';notify();if(check())return {published:false,superseded:true,error:failure};throw failure;}
    }
    function canEdit(report,id){return interactionAllowed()&&referenceState==='ready'&&(report===reports.rawLand?propertyIds.has(id):report===reports.parcelYears&&scopeState==='ready'&&scopeIds.has(id)&&(!options.scopeKey||options.scopeKey()===scopeCriteria));}
    function publishVerified(operation,row){
      const collection=operation.report===reports.rawLand?referenceRows.rawLand:scopeRows,index=collection.findIndex(value=>value.ID===operation.id);
      if(index>=0)collection[index]=copy(row);
      if(options.onRecovery)options.onRecovery(operation,row);
    }
    async function verify(operation,expired){session();if(operation.actor!==actor)throw new Error('The Creator actor changed.');if(!operation.id)throw new Error('The created record ID is unknown; this insert cannot be repeated.');const fresh=await read(operation.report,'(ID == '+operation.id+')',()=>identity()!==operation.actor||!!(expired&&expired()));if(fresh.rows.length!==1||fresh.rows[0].ID!==operation.id||!matches(fresh.rows[0],operation.payload,operation.report))throw new Error('Fresh Creator data did not verify the exact saved fields.');return fresh.rows[0];}
    function verifyBounded(operation){
      return new Promise((resolve,reject)=>{
        let settled=false,expired=false;operation.verificationPending=true;verificationReads++;notify();
        const finish=(ok,value)=>{if(settled)return;settled=true;root.clearTimeout(timer);(ok?resolve:reject)(value);};
        const timer=root.setTimeout(()=>{expired=true;const failure=error('Fresh Creator data did not settle before the verification deadline. The captured fields need review.');failure.timedOut=true;failure.noReplay=true;finish(false,failure);},options.verificationTimeoutMs||30000);
        Promise.resolve().then(()=>verify(operation,()=>expired)).then(row=>{operation.verificationPending=false;verificationReads--;notify();finish(true,row);},failure=>{operation.verificationPending=false;verificationReads--;notify();finish(false,failure);});
      });
    }
    // The caller gets a bounded unknown result; the adapter retains its native slot
    // until Creator actually settles. A timeout never cancels an applied write.
    function send(operation,kind,onDispatch){
      return new Promise((resolve,reject)=>{
        let settled=false,timer;
        const finish=(ok,value)=>{if(settled)return;settled=true;if(timer)root.clearTimeout(timer);(ok?resolve:reject)(value);};
        root.LMData.request('tax:'+operation.key,()=>{
          session();if(operation.actor!==actor)throw new Error('Creator session changed before writing.');
          onDispatch();operation.nativePending=true;nativeWrites++;notify();
          timer=root.setTimeout(()=>{const failure=error('Creator did not settle this write before the deadline. The captured fields need review.');failure.timedOut=true;failure.noReplay=true;finish(false,failure);},options.mutationTimeoutMs||30000);
          const native=Promise.resolve().then(()=>kind==='update'?api().updateRecordById({report_name:operation.report,id:operation.id,payload:{data:operation.payload}}):api().addRecords({form_name:operation.form,payload:{data:operation.payload}}));
          const completed=native.then(value=>{operation.nativePending=false;nativeWrites--;notify();return value;},failure=>{operation.nativePending=false;nativeWrites--;notify();throw failure;});
          // Return the original completion, not the deadline, to the bounded queue.
          return completed;
        }).then(value=>finish(true,value),failure=>finish(false,failure));
      });
    }
    async function mutate(kind,id,payload,report,form,batchPermit,entry,ledger){
      session();id=id||'';const withinBatch=batchPermit&&batchPermit===batchActive,ready=connected&&identity()===actor&&referenceState==='ready'&&scopeState!=='loading'&&(report===reports.rawLand?propertyIds.has(id):report===reports.parcelYears&&scopeState==='ready'&&scopeIds.has(id));if(kind==='update'&&(!ready||!withinBatch&&(!canEdit(report,id)||batchActive))||kind==='create'&&(referenceState!=='ready'||!interactionAllowed()))throw new Error('This Tax resource is not ready for editing.');
      const key=kind==='create'?'create:'+form:'update:'+report+':'+id;if(reviews.has(key))throw Object.assign(new Error('Recheck the retained operation before another write.'),{noReplay:true});
      if(!payload||typeof payload!=='object'||Array.isArray(payload)||!Object.keys(payload).length)throw new Error('No captured Tax field changes are available.');Object.keys(payload).forEach(field=>comparable(report,field,payload[field]));
      if(kind==='update'){const baseline=(report===reports.rawLand?referenceRows.rawLand:scopeRows).find(row=>row.ID===id);if(!baseline||!Object.keys(payload).every(field=>own(baseline,field)))throw new Error('The complete loaded record did not include every requested field.');}
      if(pendingKeys.has(key))throw new Error('This destination already has a pending write.');const operation={key,id,report,form,payload:freeze(copy(payload)),actor,generation:referenceGeneration,scope:scopeGeneration};pending++;pendingKeys.add(key);drafts.set(key,operation);notify();
      let dispatched=false;
      try{const response=await send(operation,kind,()=>{dispatched=true;if(entry){entry.phase='sending';if(options.onBatchProgress)options.onBatchProgress(ledgerView(ledger));}});operation.id=acknowledge(response,kind==='update'?id:null);if(entry){entry.phase='verifying';if(options.onBatchProgress)options.onBatchProgress(ledgerView(ledger));}const row=await verifyBounded(operation);if(operation.generation!==referenceGeneration||operation.scope!==scopeGeneration)throw new Error('The Tax data generation changed.');publishVerified(operation,row);drafts.delete(key);return {code:3000,data:{ID:operation.id},verifiedRow:row};}catch(failure){const raw=failure.response||failure.raw||failure;if(dispatched&&!definiteRejection(raw)){operation.id=operation.id||candidateId(raw);operation.error=failure;reviews.set(key,operation);failure.noReplay=true;failure.uncertain=true;}throw failure;}finally{pending--;pendingKeys.delete(key);notify();}
    }
    async function recheck(key){const operation=reviews.get(key);if(!operation||pending||nativeWrites||verificationReads||batchActive)return false;pending++;notify();try{const row=await verifyBounded(operation);publishVerified(operation,row);for(const ledger of ledgers.values())if(ledger.report===operation.report)for(const entry of ledger.entries)if(entry.state==='unknown'&&entry.id===operation.id&&matches(row,entry.payload,operation.report)){entry.state='verified';entry.phase='verified';entry.verifiedRow=row;if(options.onBatchProgress)options.onBatchProgress(ledgerView(ledger));}reviews.delete(key);drafts.delete(key);return true;}catch(failure){operation.error=failure;return false;}finally{pending--;notify();}}
    async function runLedger(ledger,entries){
      if(pending||batchActive||progressOpen||reviews.size)throw new Error('Finish or recheck the previous Tax operation.');const token={id:ledger.id};batchActive=token;ledger.finished=false;ledger.stage='preflight';if(options.onBatchOpen){progressOpen=ledger;options.onBatchOpen(ledgerView(ledger));}notify();let next=0,stopSending=false;
      const check=()=>ledger.actor!==identity()||ledger.referenceGeneration!==referenceGeneration||ledger.scopeGeneration!==scopeGeneration;
      async function worker(){while(!stopSending&&next<entries.length){const entry=entries[next++];try{session();cancelled(check);entry.state='pending';entry.phase='queued';notify();const result=await mutate('update',entry.id,entry.payload,ledger.report,null,token,entry,ledger);entry.state='verified';entry.phase='verified';entry.verifiedRow=result.verifiedRow;}catch(failure){entry.error=failure;entry.state=failure.uncertain?'unknown':'rejected';entry.phase=entry.state;if(failure.uncertain){stopSending=true;ledger.error=failure;}}if(options.onBatchProgress)options.onBatchProgress(ledgerView(ledger));}}
      try{const baseline=ledger.report===reports.rawLand?referenceRows.rawLand:scopeRows,fresh=await read(ledger.report,ledger.report===reports.rawLand?'':scopeCriteria,check,null,ledger.report===reports.parcelYears?options.maxAutoRows||800:null),freshIds=new Set(fresh.rows.map(row=>row.ID));if(freshIds.size!==baseline.length||baseline.some(row=>!freshIds.has(row.ID)))throw new Error('The complete Tax scope changed before the batch. Reload before editing.');for(const entry of entries){const before=baseline.find(row=>row.ID===entry.id),now=fresh.rows.find(row=>row.ID===entry.id),captured=Object.fromEntries(Object.keys(entry.payload).map(field=>[field,before[field]]));if(!now||!matches(now,captured,ledger.report))throw new Error('A selected Tax field changed before the batch. Reload before editing.');}ledger.stage='sending';if(options.onBatchProgress)options.onBatchProgress(ledgerView(ledger));await Promise.all(Array.from({length:Math.min(3,entries.length)},worker));}catch(failure){ledger.error=failure;for(const entry of entries)if(entry.state==='not-sent'){entry.error=failure;entry.phase='not-sent';}}finally{batchActive=null;ledger.finished=true;if(options.onBatchFinish)await options.onBatchFinish(ledgerView(ledger));notify();}return ledgerView(ledger);
    }
    function ledgerView(ledger){return {id:ledger.id,report:ledger.report,stage:ledger.stage,finished:!!ledger.finished,error:ledger.error&&ledger.error.message,rows:ledger.entries.map(entry=>({id:entry.id,state:entry.state,phase:entry.phase,payload:copy(entry.payload),code:entry.error&&entry.error.code,message:entry.error&&entry.error.message}))};}
    async function batch(report,intents){
      session();if(pending||batchActive||progressOpen||reviews.size||referenceState!=='ready'||scopeState==='loading'||options.isDirty&&options.isDirty())throw new Error('The full Tax scope is not ready for a batch.');const ids=new Set(),collection=report===reports.rawLand?propertyIds:report===reports.parcelYears&&scopeState==='ready'?scopeIds:null,baseline=report===reports.rawLand?referenceRows.rawLand:scopeRows;
      if(!collection||!Array.isArray(intents)||!intents.length)throw new Error('No complete Tax selection is available.');const entries=intents.map(intent=>{if(!intent||!safeId(intent.id)||ids.has(intent.id)||!collection.has(intent.id))throw new Error('A batch destination is missing, duplicated or outside the complete scope.');const row=baseline.find(value=>value.ID===intent.id);if(!row||!intent.payload||!Object.keys(intent.payload).length||!Object.keys(intent.payload).every(field=>own(row,field)))throw new Error('The full batch selection did not include every requested field.');Object.keys(intent.payload).forEach(field=>comparable(report,field,intent.payload[field]));ids.add(intent.id);return {id:intent.id,payload:freeze(copy(intent.payload)),state:'not-sent',phase:'not-sent'};});
      const ledger={id:'tax-batch-'+(++batchSequence),report,actor,referenceGeneration,scopeGeneration,entries};ledgers.set(ledger.id,ledger);return runLedger(ledger,entries);
    }
    async function retryBatch(id){const ledger=ledgers.get(id);if(!ledger)throw new Error('Tax batch is unavailable.');if(ledger.entries.some(entry=>entry.state==='unknown'))throw new Error('Recheck uncertain destinations before a retry.');const entries=ledger.entries.filter(entry=>entry.state==='rejected'||entry.state==='not-sent');return entries.length?runLedger(ledger,entries):ledgerView(ledger);}
    return Object.freeze({start,reloadReferences,search,count,snapshot,canEdit,interactionAllowed,navigationAllowed:()=>interactionAllowed()&&!changing(),update:(id,data,report)=>mutate('update',id,data,report||reports.parcelYears),create:(form,data)=>mutate('create','',data,form===forms.property?reports.rawLand:reports.parcelYears,form),recheck,batch,retryBatch,ledger:id=>ledgers.has(id)?ledgerView(ledgers.get(id)):null,closeProgress(id){if(!progressOpen||progressOpen.id!==id||!progressOpen.finished||pending||batchActive)return false;const ledger=progressOpen;progressOpen=null;if(options.onBatchClose)options.onBatchClose(ledgerView(ledger));notify();return true;},discardDraft(key){if(reviews.has(key)||pending)return false;drafts.delete(key);notify();return true;},noteDraft(){editEpoch++;notify();}});
  }
  root.LMTaxPreparation=Object.freeze({create});
})(typeof window==='undefined'?globalThis:window);
