(function(root){
  'use strict';
  function text(value){return value==null?'':String(value).trim();}
  function id(value){return value&&typeof value==='object'?text(value.ID):text(value);}
  function own(row,key){return Object.prototype.hasOwnProperty.call(row,key);}
  function plan(projects,subdivisions,choices){
    if(!Array.isArray(projects)||!Array.isArray(subdivisions)||!Array.isArray(choices)||!choices.length)throw new Error('Complete Project, Subdivision and live Territory choices are required.');
    var ids=new Set();
    return projects.map(function(project){
      var pid=id(project.ID);if(!/^\d+$/.test(pid)||ids.has(pid))throw new Error('Project IDs are missing or duplicated.');ids.add(pid);
      var children=subdivisions.filter(function(row){return id(row.Project)===pid;});
      var values=Array.from(new Set(children.map(function(row){return text(row.Territory);}).filter(Boolean)));
      var row={id:pid,name:text(project.Project_Name)||pid,before:project.Territory,territory:'',subdivisions:children.length,status:'',sources:children.map(function(child){return {id:id(child.ID),territory:child.Territory};})};
      if(!own(project,'Territory'))row.status='Project Territory unavailable';
      else if(text(project.Territory))row.status='Already filled';
      else if(children.some(function(child){return !own(child,'Territory');}))row.status='Subdivision Territory unavailable';
      else if(values.length>1)row.status='Conflicting subdivisions';
      else if(!values.length)row.status='No subdivision Territory';
      else if(choices.indexOf(values[0])<0)row.status='Territory outside global choices';
      else{row.status='Ready';row.territory=values[0];}
      row.values=values;return row;
    });
  }
  function captureScope(api){return typeof api.scope==='function'?api.scope():null;}
  function requireScope(api,captured){if(captured!==null&&captureScope(api)!==captured){var error=new Error('Project context changed. Close and reopen before continuing.');error.cancelled=true;error.noReplay=true;throw error;}}
  async function apply(rows,api,changed,captured){
    captured=captured===undefined?captureScope(api):captured;
    var targets=rows.filter(function(row){return row.status==='Ready';});
    for(var i=0;i<targets.length;i++){
      var row=targets[i];row.status='Checking';changed(row);
      try{
        requireScope(api,captured);
        var project=await api.project(row.id);requireScope(api,captured);
        var children=await api.subdivisions(row.id);requireScope(api,captured);
        var fresh=plan([project],children,api.choices())[0];
        if(fresh.status==='Already filled'){row.status=text(project.Territory)===row.territory?'Verified':'Preserved newer value';changed(row);continue;}
        if(fresh.status!=='Ready'||fresh.territory!==row.territory){row.status='Source changed — skipped';changed(row);continue;}
        row.status='Saving';changed(row);
        requireScope(api,captured);
        var writeError=null;try{await api.write(row.id,row.territory);}catch(error){writeError=error;}
        requireScope(api,captured);
        row.status='Verifying';changed(row);
        var saved=await api.project(row.id);requireScope(api,captured);
        if(id(saved.ID)!==row.id||!own(saved,'Territory')||text(saved.Territory)!==row.territory)throw writeError||new Error('Saved Territory was not confirmed.');
        row.status='Verified';api.saved(saved);changed(row);
      }catch(error){row.status='Needs review';row.error=error&&error.message||String(error);changed(row);return {rows:rows,unknown:true};}
    }
    return {rows:rows,unknown:false};
  }
  function mount(api){
    var dialog=null,rows=[],busy=false,applying=false,returnFocus=null,captured=null;
    var x='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
    function escape(value){return text(value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
    function message(value){dialog.querySelector('[data-pt-message]').textContent=value;}
    function exportJson(){var box=dialog.querySelector('[data-pt-json] textarea');if(box)box.value=JSON.stringify({at:new Date().toISOString(),environment:api.environment(),rows:rows},null,2);}
    function resultRows(){exportJson();dialog.querySelector('tbody').innerHTML=rows.map(function(row){return '<tr data-pt-id="'+row.id+'"><td>'+escape(row.name)+'</td><td>'+escape(row.territory||text(row.before)||row.values.join(' / ')||'—')+'</td><td data-pt-status>'+escape(row.status)+'</td></tr>';}).join('');}
    function busyState(value){busy=value;dialog.querySelectorAll('[data-pt-close]').forEach(function(button){button.disabled=value;});dialog.querySelector('[data-pt-apply]').disabled=value||!rows.some(function(row){return row.status==='Ready';});}
    function update(row){
      var cell=row&&dialog.querySelector('[data-pt-id="'+row.id+'"] [data-pt-status]');if(cell)cell.textContent=row.status;
      var verified=rows.filter(function(item){return item.status==='Verified';}).length;
      var total=Number(dialog.getAttribute('data-target-count')||0),pct=total?Math.round(verified/total*100):0;
      dialog.querySelector('[role=progressbar]').setAttribute('aria-valuenow',pct);dialog.querySelector('[data-pt-bar]').style.width=pct+'%';
      message(verified+' of '+total+' Project territories verified'+(row?': '+row.name+' · '+row.status:''));
      dialog.querySelector('[data-pt-stage="1"]').textContent='1 · Sources checked';
      dialog.querySelector('[data-pt-stage="2"]').textContent='2 · Fill blank Projects';
      dialog.querySelector('[data-pt-stage="3"]').textContent='3 · '+verified+' verified';
    }
    function close(){if(busy)return;dialog.remove();dialog=null;document.querySelectorAll('[data-pt-inert]').forEach(function(node){node.inert=false;node.removeAttribute('data-pt-inert');});if(returnFocus&&returnFocus.isConnected)returnFocus.focus();}
    async function open(){
      if(dialog||!api.available())return;
      applying=false;captured=captureScope(api);returnFocus=document.activeElement;
      dialog=document.createElement('div');dialog.className='pt-overlay';dialog.innerHTML='<section class="pt-dialog" role="dialog" aria-modal="true" aria-labelledby="pt-title"><header><div><div class="pt-kicker">Subdivision → Project</div><h2 id="pt-title">Fill Project territories</h2></div><button class="pt-x" data-pt-close aria-label="Close migration">'+x+'</button></header><div class="pt-body"><div class="pt-stages"><span data-pt-stage="1">1 · Check sources</span><span data-pt-stage="2">2 · Fill blank Projects</span><span data-pt-stage="3">3 · Verify saved values</span></div><div class="pt-track" role="progressbar" aria-label="Verified Project territories" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i data-pt-bar></i></div><p data-pt-message role="status" aria-live="polite">Reading Projects, Subdivisions and live Territory choices…</p><details data-pt-json><summary>Results JSON</summary><textarea aria-label="Project Territory results JSON" readonly style="width:100%;height:150px"></textarea></details><table><thead><tr><th>Project</th><th>Territory</th><th>Result</th></tr></thead><tbody></tbody></table></div><footer><button class="btn" data-pt-export disabled>Download results</button><button class="btn" data-pt-close>Close</button><button class="btn primary" data-pt-apply disabled>Fill territories</button></footer></section>';
      Array.from(document.body.children).filter(function(node){return !node.inert&&node.tagName!=='SCRIPT'&&node.tagName!=='STYLE';}).forEach(function(node){node.inert=true;node.setAttribute('data-pt-inert','1');});document.body.appendChild(dialog);
      dialog.querySelectorAll('[data-pt-close]').forEach(function(button){button.onclick=close;});
      dialog.addEventListener('keydown',function(event){if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}if(event.key==='Tab'){var buttons=Array.from(dialog.querySelectorAll('button:not(:disabled)'));if(!buttons.length){event.preventDefault();return;}var first=buttons[0],last=buttons[buttons.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
      dialog.querySelector('[data-pt-message]').setAttribute('tabindex','-1');dialog.querySelector('[data-pt-message]').focus();
      dialog.querySelector('[data-pt-export]').onclick=function(){var blob=new Blob([JSON.stringify({at:new Date().toISOString(),environment:api.environment(),rows:rows},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='project-territory-results.json';a.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);};
      dialog.querySelector('[data-pt-apply]').onclick=async function(){
        if(busy||applying||!rows.some(function(row){return row.status==='Ready';}))return;applying=true;busyState(true);dialog.setAttribute('data-target-count',rows.filter(function(row){return row.status==='Ready';}).length);update();
        var started=Date.now(),result=await apply(rows,api,update,captured);
        if(!root.matchMedia('(prefers-reduced-motion: reduce)').matches)await new Promise(function(resolve){setTimeout(resolve,Math.max(0,560-(Date.now()-started)));});
        busyState(false);dialog.querySelector('[data-pt-apply]').disabled=true;dialog.querySelector('[data-pt-apply]').textContent='Finished';
        message(result.unknown?'Stopped — saved values need review. Download results before continuing.':rows.filter(function(row){return row.status==='Verified';}).length+' Project territories verified. Other values preserved.');
        exportJson();if(captureScope(api)===captured)api.finished(rows);
      };
      busyState(true);
      try{requireScope(api,captured);var snapshot=await api.snapshot(function(){requireScope(api,captured);});requireScope(api,captured);rows=plan(snapshot.projects,snapshot.subdivisions,snapshot.choices);resultRows();busyState(false);dialog.querySelector('[data-pt-export]').disabled=false;var count=rows.filter(function(row){return row.status==='Ready';}).length;dialog.querySelector('[data-pt-apply]').textContent='Fill '+count+' Project territories';message(count+' ready · '+(rows.length-count)+' preserved or unresolved');}
      catch(error){rows=[];busyState(false);message(error&&error.message||'Migration sources unavailable.');}
    }
    return {open:open,busy:function(){return busy;},active:function(){return !!dialog;}};
  }
  root.LMProjectTerritory=Object.freeze({plan:plan,apply:apply,mount:mount});
})(window);
