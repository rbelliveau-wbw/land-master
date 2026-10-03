(function(w){
  "use strict";
  var config={widget:"Widget",version:"0",code:"WIDGET",apiCandidates:["Report_Proforma_Widget_Error"],getContext:function(){return{}}};
  var ready=false,queue=[],timer=null,sessionSent={},breadcrumbs=[];
  var DEDUPE_MS=600000;
  function clean(v){var s=typeof v==="string"?v:JSON.stringify(v||{});return s.replace(/("?(?:token|password|authorization|secret|cookie)[^:="]*"?\s*[:=]\s*)[^,}\s]+/gi,"$1[redacted]").slice(0,10000)}
  function key(message){return String(config.code)+"|"+String(message).slice(0,300)}
  function send(item){if(!ready||!w.ZOHO||!ZOHO.CREATOR)return;var k=key(item.message),now=Date.now();if(sessionSent[k]&&now-sessionSent[k]<DEDUPE_MS)return;sessionSent[k]=now;var body=["LLM FIX REQUEST","Widget: "+config.widget,"Version: "+config.version,"Error: "+item.message,"Details: "+clean(item.details),"Context: "+clean(config.getContext()),"Breadcrumbs: "+clean(breadcrumbs.slice(-20)),"Please diagnose the root cause and propose a minimal verified fix."].join("\n");var payload={payload:JSON.stringify({subject:"["+config.code+"] Critical widget error",body:body})};var api=config.apiCandidates[0]||"Report_Proforma_Widget_Error";var caller=ZOHO.CREATOR.API&&ZOHO.CREATOR.API.invokeCustomApi;if(caller)caller({api_name:api,payload:payload}).catch(function(){})}
  function flush(){timer=null;var items=queue.splice(0);items.forEach(send)}
  function breadcrumb(level,message,details,critical){breadcrumbs.push({time:new Date().toISOString(),level:level,message:message,details:details});if(breadcrumbs.length>50)breadcrumbs.shift();if(critical){queue.push({message:message,details:details});if(!timer)timer=setTimeout(flush,1000)}}
  w.LMCriticalErrors={configure:function(next){for(var k in next)config[k]=next[k]},markReady:function(){ready=true;if(queue.length&&!timer)timer=setTimeout(flush,100)},breadcrumb:breadcrumb,sessionSent:sessionSent};
  w.addEventListener("error",function(e){breadcrumb("error",e.message||"Unhandled window error",{file:e.filename,line:e.lineno},true)});
  w.addEventListener("unhandledrejection",function(e){breadcrumb("error","Unhandled promise rejection",{reason:clean(e.reason)},true)});
})(window);
