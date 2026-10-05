(function (root) {
  'use strict';
  const clock = () => root.performance && typeof root.performance.now === 'function' ? root.performance.now() : Date.now();
  const starts = new Map(), events = [], requests = [];
  const loadedAt = root.performance && typeof root.performance.now === 'function' ? 0 : clock();
  let active = 0, concurrency = 3, maxRequestsPerMinute = 0, readRetryOnThrottle = false, rateTimer;
  const dispatches = new Map(), cooldowns = new Map(), rateWindow = 61000;
  const queue = [], inFlight = new Map(), cache = new Map(), reads = new Set();
  function bytes(value) { try { const text = JSON.stringify(value); return typeof TextEncoder === 'function' ? new TextEncoder().encode(text).length : text.length; } catch { return 0; } }
  function snapshot() {
    return {schema:1,elapsedMs:Math.round(clock()-loadedAt),concurrency,active,queued:queue.length,pendingReads:reads.size,inFlightReads:inFlight.size,cachedReads:cache.size,requestCount:requests.length,responseBytes:requests.reduce((sum,r)=>sum+(r.responseBytes||0),0),events:events.slice(),requests:requests.slice()};
  }
  function publish() {
    if (!root.document) return;
    const parent = root.document.body || root.document.head;
    if (!parent) return;
    let node = root.document.getElementById('lm-performance');
    if (!node) { node = root.document.createElement('script'); node.id = 'lm-performance'; node.type = 'application/json'; parent.appendChild(node); }
    node.textContent = JSON.stringify(snapshot());
  }
  function mark(name,meta) { events.push({name,atMs:Math.round(clock()-loadedAt),...(meta||{})}); if(events.length>250)events.shift();publish(); }
  function start(name,meta) { starts.set(name,clock());mark(name+':start',meta); }
  function end(name,meta) { const began=starts.get(name);starts.delete(name);mark(name,{durationMs:began===undefined?null:Math.round(clock()-began),...(meta||{})}); }
  async function timed(name,fn,meta) { start(name,meta);try {const value=await fn();end(name,{ok:true,...(meta||{})});return value;}catch(error){end(name,{ok:false,...(meta||{})});throw error;} }
  function pump() {
    if(rateTimer){root.clearTimeout(rateTimer);rateTimer=null;}
    while(active<concurrency&&queue.length){
      const now=Date.now(),key=context(),recent=(dispatches.get(key)||[]).filter(at=>now-at<rateWindow);
      dispatches.set(key,recent);
      const wait=Math.max(0,(cooldowns.get(key)||0)-now,maxRequestsPerMinute&&recent.length>=maxRequestsPerMinute?recent[0]+rateWindow-now:0);
      if(wait){rateTimer=root.setTimeout(pump,wait);return;}
      recent.push(now);
      const job=queue.shift();active++;publish();
      const began=clock();
      Promise.resolve().then(job.fn).then(value=>{requests.push({task:job.task,queuedMs:Math.round(began-job.queuedAt),durationMs:Math.round(clock()-began),ok:true,responseBytes:bytes(value)});job.resolve(value);},error=>{requests.push({task:job.task,queuedMs:Math.round(began-job.queuedAt),durationMs:Math.round(clock()-began),ok:false,code:code(error)});job.reject(error);}).finally(()=>{active--;if(requests.length>500)requests.shift();publish();pump();});
    }
  }
  function request(task,fn,options){
    const enqueue=()=>new Promise((resolve,reject)=>{queue.push({task:String(task),fn:readRetryOnThrottle&&options&&options.readOnly?()=>Promise.resolve().then(fn).then(value=>{if(failureCode(value)==='2955')throw failure(task,value);return value;}):fn,resolve,reject,queuedAt:clock()});pump();});
    if(!readRetryOnThrottle)return enqueue();
    return enqueue().catch(error=>{
      // Only an explicitly read-only request may retry. A write is never replayed.
      if(!readRetryOnThrottle||failureCode(error)!=='2955')throw error;
      cooldowns.set(context(),Date.now()+rateWindow);
      if(!options||!options.readOnly)throw error;
      mark('creator:read-throttled',{task:String(task)});
      return enqueue();
    });
  }
  function code(value){const seen=new Set();for(let depth=0;value&&depth<=16;depth++){if(seen.has(value))return '';seen.add(value);if(value.code!==undefined)return String(value.code);if(value.result&&value.result.code!==undefined)return String(value.result.code);value=value.cause;}return '';}
  // Native envelope containers only: report data and business fields stay opaque.
  function scanEnvelope(value,includeCause){
    const queue=[{value,depth:0,parents:[]}],seen=new Set();let failed=false,firstCode='',failedCode='';
    function enqueue(value,entry,parents){if(queue.length>=128){failed=true;return;}queue.push({value,depth:entry.depth+1,parents});}
    for(let index=0;index<queue.length;index++){
      const entry=queue[index];let item=entry.value;
      if(typeof item==='string'){
        const text=item.trim();if(!/^[{[]/.test(text))continue;
        try{item=JSON.parse(text);}catch(ignore){failed=true;continue;}
      }
      if(!item||typeof item!=='object')continue;
      if(entry.parents.includes(item)||entry.depth>16){failed=true;continue;}
      if(seen.has(item))continue;seen.add(item);
      const parents=entry.parents.concat([item]);
      if(Array.isArray(item)){for(const child of item){if(queue.length>=128){failed=true;break;}enqueue(child,entry,parents);}continue;}
      if(item.code!=null){const native=String(item.code);if(!firstCode)firstCode=native;if(native!=='3000'){failed=true;if(!failedCode)failedCode=native;}}
      if(item.error||item.success===false||/^(error|failed|failure)$/i.test(String(item.status||'').trim()))failed=true;
      for(const key of includeCause?['result','details','response','output','responseText','cause']:['result','details','response','output','responseText'])if(Object.prototype.hasOwnProperty.call(item,key))enqueue(item[key],entry,parents);
    }
    return {failed,code:failedCode||firstCode};
  }
  function responseFailed(value){return !value||typeof value!=='object'||Array.isArray(value)||scanEnvelope(value,false).failed;}
  function failureCode(value){return scanEnvelope(value,true).code;}
  function failure(report,value,message){let native=value;try{if(value&&value.responseText)native=JSON.parse(value.responseText);}catch(ignore){}const error=new Error(message||report+': '+(native&&(native.message||native.description)||'Creator did not return a readable response.'));error.code=failureCode(value);error.permissionDenied=error.code==='2898'||!!(value&&value.permissionDenied);error.response=value;error.cause=value;return error;}
  function context(){const c=root.LMRuntime&&root.LMRuntime.current?root.LMRuntime.current():{};return String(c.environment||'UNKNOWN')+'|'+String(c.user||'')+'|'+String(c.appLinkName||'');}
  function invalidate(predicate){
    const match=predicate||(()=>true), cached=[], pending=[];
    // Resolve the entire scope first: a throwing predicate must not partly invalidate it.
    for(const [key,value] of cache)if(match(value.options,key))cached.push(key);
    for(const read of reads)if(match(read.options,read.key))pending.push(read);
    for(const key of cached)cache.delete(key);
    for(const read of pending){read.invalidated=true;const entry=inFlight.get(read.key);if(entry&&entry.read===read)inFlight.delete(read.key);}
    mark('cache:invalidated',{cached:cached.length,pending:pending.length});
  }
  function readAll(options){
    options={...(options||{})};
    const api=options.api||(root.ZOHO&&root.ZOHO.CREATOR&&root.ZOHO.CREATOR.DATA);
    const report=options.reportName||options.report_name;
    if(!report||!api||typeof api.getRecords!=='function'||typeof api.getRecordCount!=='function')return Promise.reject(failure(report,null,'Creator SDK v2 data bridge is unavailable.'));
    const check=()=>{if(options.isCancelled&&options.isCancelled()){const error=failure(report,null,'Load superseded.');error.cancelled=true;throw error;}};
    try{check();}catch(error){return Promise.reject(error);}
    const fields=Array.isArray(options.fields)?options.fields.join(','):options.fields;
    options.reportName=report;
    if(Array.isArray(options.fields))options.fields=Object.freeze(options.fields.slice());
    Object.freeze(options);
    const key=JSON.stringify([context(),report,options.criteria||'',fields||'',options.cacheKey||'',...(options.countAtEnd?['count-at-end']:[])]);
    const existing=cache.get(key);
    if(!options.fresh&&existing&&existing.expires>Date.now())return Promise.resolve(existing.rows);
    if(!options.fresh&&inFlight.has(key)&&!options.isCancelled)return inFlight.get(key).promise;
    // A newer authoritative read may finish first; older reads may resolve, but cannot overwrite its cache.
    for(const previous of reads)if(previous.key===key)previous.invalidated=true;
    if(options.fresh){cache.delete(key);inFlight.delete(key);}
    const read={key,options,invalidated:false};reads.add(read);
    const query=options.criteria?{criteria:options.criteria}:{};
    const promise=(async()=>{
      check();
      async function counted(){let countResponse;try{countResponse=await request(report+':count',()=>{check();return api.getRecordCount({report_name:report,...query});},{readOnly:true});}catch(error){check();if(error&&error.cancelled)throw error;throw failure(report,error);}check();const rawCount=countResponse&&countResponse.result&&countResponse.result.records_count,number=Number(rawCount);if(code(countResponse)!=='3000'||responseFailed(countResponse)||(typeof rawCount!=='number'&&typeof rawCount!=='string')||(typeof rawCount==='string'&&!/^\d+$/.test(rawCount.trim()))||!Number.isSafeInteger(number)||number<0)throw failure(report,countResponse);return number;}
      let expected;
      if(!options.countAtEnd){
        let countResponse;
        try{countResponse=await request(report+':count',()=>{check();return api.getRecordCount({report_name:report,...query});},{readOnly:true});}catch(error){check();if(error&&error.cancelled)throw error;throw failure(report,error);}check();
        const rawCount=countResponse&&countResponse.result&&countResponse.result.records_count;
        expected=Number(rawCount);
        if(code(countResponse)!=='3000'||responseFailed(countResponse)||(typeof rawCount!=='number'&&typeof rawCount!=='string')||(typeof rawCount==='string'&&!/^\d+$/.test(rawCount.trim()))||!Number.isSafeInteger(expected)||expected<0)throw failure(report,countResponse);
      }
      const rows=[],ids=new Set(),cursors=new Set();let cursor='';
      const finish=(response)=>{check();if(rows.length!==expected)throw failure(report,response,report+': loaded '+rows.length+' of '+expected+' records. Refresh to retry a complete snapshot.');if(options.onProgress)options.onProgress({report,page:pages,count:rows.length,expected,done:true});if(options.ttlMs>0&&!read.invalidated)cache.set(key,{options,rows,expires:Date.now()+options.ttlMs});return rows;};
      const complete=options.countAtEnd?async response=>{expected=await counted();return finish(response);}:finish;
      let pages=0;
      if(expected===0)return finish();
      for(pages=1;pages<=(options.countAtEnd?10000:Math.ceil(expected/200)+1);pages++){
        check();const config={report_name:report,max_records:1000,field_config:fields?'custom':'all',...query};if(fields)config.fields=fields;if(cursor)config.record_cursor=cursor;
        let response;try{response=await request(report+':records',()=>{check();return api.getRecords(config);},{readOnly:true});}catch(error){check();if(code(error)==='3100'||code(error)==='9280')return complete(error);if(error&&error.cancelled)throw error;throw failure(report,error);}
        check();if(code(response)==='3100'||code(response)==='9280')return complete(response);
        if(code(response)!=='3000'||responseFailed(response)||!Array.isArray(response.data))throw failure(report,response);
        for(const row of response.data){const rawId=row&&row.ID,id=rawId==null?'':String(rawId);if(!id.trim()||(typeof rawId==='number'&&!Number.isSafeInteger(rawId))||ids.has(id))throw failure(report,response,report+': missing, unsafe, or duplicate record ID across pages. Refresh to retry.');ids.add(id);rows.push(row);}
        if(options.onProgress)options.onProgress({report,page:pages,count:rows.length,expected,done:false});
        const next=response.record_cursor||(response.headers&&response.headers.record_cursor)||'';
        if(!next)return complete(response);if(cursors.has(String(next)))throw failure(report,response,report+': repeated pagination cursor.');cursors.add(String(next));cursor=String(next);
      }
      throw failure(report,null,report+': pagination did not complete.');
    })();
    if(!options.isCancelled)inFlight.set(key,{promise,read});
    const cleanup=()=>{reads.delete(read);const entry=inFlight.get(key);if(entry&&entry.promise===promise)inFlight.delete(key);publish();};
    promise.then(cleanup,cleanup);
    return promise;
  }
  root.LMPerf=Object.freeze({mark,start,end,timed,snapshot});
  root.LMData=Object.freeze({readAll,request,invalidate,code,failure,responseFailed,failureCode,configure(options){if(options&&Number.isInteger(options.concurrency)&&options.concurrency>0&&options.concurrency<=6)concurrency=options.concurrency;if(options&&Number.isInteger(options.maxRequestsPerMinute)&&options.maxRequestsPerMinute>=0&&options.maxRequestsPerMinute<=50)maxRequestsPerMinute=options.maxRequestsPerMinute;if(options&&typeof options.readRetryOnThrottle==='boolean')readRetryOnThrottle=options.readRetryOnThrottle;pump();}});
  mark('adapter:ready');
})(typeof window==='undefined'?globalThis:window);
