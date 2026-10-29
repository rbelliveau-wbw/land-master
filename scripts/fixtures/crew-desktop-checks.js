// Actual widget geometry, isolated synthetic data; never included in releases.
(async function(){
 const $=selector=>document.querySelector(selector),all=selector=>[...document.querySelectorAll(selector)],frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))),near=(a,b)=>Math.abs(a-b)<2;
 async function wait(predicate){for(let i=0;i<400;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,25));}throw new Error('Timed out waiting for desktop fixture');}
 async function run(){
  const checks=[],metrics={viewport:innerWidth+' × '+innerHeight};
  function assert(ok,name,detail){checks.push({name,ok:!!ok,...(ok?{}:{detail})});}
  parent.postMessage({crewDesktopQA:{status:'running',...metrics,stage:'Waiting for schedule data'}},location.origin);
  $('#browser-checks').innerHTML='<li>Running desktop checks…</li>';
  try{
   await wait(()=>{if($('#connection')?.dataset.state==='error'&&!CrewApp.state.loading)throw new Error($('#connection').textContent);return CrewApp.state.ready&&!CrewApp.state.loading;});window.CrewManager?.switchWorkspace('schedule');await frame();
   const gantt=$('.gantt-scroll'),table=$('#tableScroll');
   assert(all('.gantt-row.milestone').length===38,'38 synthetic phases rendered');
   assert(document.documentElement.scrollWidth<=innerWidth+1,'No horizontal page overflow',document.documentElement.scrollWidth);
   assert(all('.filters').every(node=>node.scrollWidth<=node.clientWidth+1),'Filters stay inside their cards');
   metrics.timelineHeight=gantt.clientHeight;metrics.scheduleHeight=table.clientHeight;
   assert(gantt.scrollHeight<=gantt.clientHeight+1,'Timeline grows to fit all selected phase rows');
   assert(table.clientHeight<=Math.max(320,Math.min(innerHeight*.58,640))+1,'Editor has a bounded desktop height');
   assert(table.scrollHeight>table.clientHeight,'Editor retains all phases through vertical scrolling');
   assert(all('.gantt-row.task-unavailable').length===38&&all('#scheduleTable tr.task-unavailable').length===38,'Unavailable Tasks preserve every phase pair');
   assert(all('#scheduleTable .task-unavailable input').length===0,'Unavailable Tasks omit disabled empty inputs');
   assert(all('.task-unavailable .source-unavailable').length===76,'Unavailable Tasks carry explicit source labels');
   const taskHeight=$('.gantt-row.task-unavailable').getBoundingClientRect().height;
   metrics.unavailableTaskHeight=taskHeight;assert(taskHeight<48,'Unavailable Task rows stay compact',taskHeight);
   $('[data-filter="horizons"]').click();await frame();$('[data-option="24"]').click();$('[data-picker-done]').click();await frame();
   const timeline=$('.gantt-scroll');timeline.scrollTop=420;timeline.scrollLeft=250;await frame();
   const timelineBox=timeline.getBoundingClientRect(),phaseHead=$('.phase-head').getBoundingClientRect(),axis=$('.gantt-head').getBoundingClientRect(),label=all('.gantt-row.milestone .gantt-label')[5].getBoundingClientRect();
   const horizontalRange=timeline.scrollWidth-timeline.clientWidth;
   assert(horizontalRange<=1?timeline.scrollLeft===0:timeline.scrollLeft>0,'Timeline scrolls when its calendar exceeds the viewport',{range:horizontalRange,reached:timeline.scrollLeft});
   assert(near(axis.top,timelineBox.top),'Calendar axis stays visible while scrolling');
   assert(near(phaseHead.left,timelineBox.left)&&near(label.left,timelineBox.left),'Timeline phase labels stay frozen horizontally');
   const frozenLabel=all('.gantt-row.milestone .gantt-label')[5],focusedBar=frozenLabel.parentElement.querySelector('.bar'),handle=focusedBar?.querySelector('.handle');
   handle?.focus({preventScroll:true});await frame();
   assert(parseInt(getComputedStyle(frozenLabel).zIndex)>parseInt(getComputedStyle(focusedBar).zIndex),'Frozen phase names stay above focused timeline bars');
   handle?.blur();
   document.querySelector('a[href="#schedule"]').click();await frame();
   const editorTitle=$('#scheduleTitle').getBoundingClientRect();
   assert(editorTitle.top>=0&&editorTitle.bottom<=innerHeight,'Edit Schedule navigation brings the editor heading into view',editorTitle.toJSON());
   table.scrollTop=350;table.scrollLeft=500;await frame();
   const tableBox=table.getBoundingClientRect(),first=$('#scheduleTable thead tr:first-child .group').getBoundingClientRect(),second=$('#scheduleTable thead tr:nth-child(2) th').getBoundingClientRect(),frozen=$('#scheduleTable thead .phase-column').getBoundingClientRect();
   assert(near(first.top,tableBox.top)&&near(second.top,tableBox.top+50),'Both table heading levels remain pinned during vertical scrolling',{first:first.top,second:second.top,viewport:tableBox.top});
   assert(near(frozen.left,tableBox.left),'Schedule phase column stays frozen horizontally');
   $('#jumpStage').click();await frame();
   const picker=$('#picker').getBoundingClientRect();
   assert(picker.left>=0&&picker.top>=0&&picker.right<=innerWidth+1&&picker.bottom<=innerHeight+1,'Stage picker fits the viewport',picker.toJSON());
   $('[data-option="Closeout"]').click();await frame();
   const stage=$('[data-stage="Closeout"]'),stageBox=stage?.getBoundingClientRect(),phaseRight=$('#scheduleTable thead .phase-column').getBoundingClientRect().right;
   assert($('#picker').hidden,'Choosing a stage dismisses its picker');
   assert(stageBox&&stageBox.left>=phaseRight-2&&stageBox.right<=table.getBoundingClientRect().right+2,'Jump to stage exposes the intended heading',{stage:stageBox?.toJSON(),phaseRight});
   table.scrollLeft=0;table.scrollTop=0;$('.gantt-scroll').scrollTop=0;$('.gantt-scroll').scrollLeft=0;document.querySelector('a[href="#timeline"]').click();await frame();
   $('[data-filter="phases"]').click();await frame();
   const phasePicker=$('#picker').getBoundingClientRect(),list=$('#picker [role="listbox"]');
   assert(phasePicker.top>=0&&phasePicker.bottom<=innerHeight+1,'Long phase picker fits the viewport',phasePicker.toJSON());
   assert(list.scrollHeight>list.clientHeight,'Long picker options scroll inside the fixed search and footer');
   $('[data-picker-done]').click();
   const audit=JSON.parse($('#fixture-audit').textContent);assert(audit.requests.every(request=>!['prepare','apply'].includes(request.action)),'Desktop checks perform no schedule writes');
   window.scrollTo(0,0);await frame();
  }catch(error){checks.push({name:'Desktop fixture completed',ok:false,detail:error.message});}
  const result={passed:checks.every(check=>check.ok),...metrics,checks};
  window.CrewDesktopQA=result;const list=$('#browser-checks');list.innerHTML=checks.map(check=>'<li data-result="'+(check.ok?'pass':'fail')+'">'+(check.ok?'PASS ':'FAIL ')+check.name+(check.detail?' · '+JSON.stringify(check.detail):'')+'</li>').join('');list.dataset.finished=result.passed?'passed':'failed';document.title=(result.passed?'PASS':'FAIL')+' — Crew desktop '+innerWidth+' × '+innerHeight;parent.postMessage({crewDesktopQA:result},location.origin);
 }
 try{await wait(()=>$('#fixture-tools')&&window.CrewApp);const button=document.createElement('button');button.textContent='Run Desktop Checks';button.id='run-desktop-checks';button.onclick=run;$('#fixture-tools').appendChild(button);await run();}catch(error){const result={passed:false,viewport:innerWidth+' × '+innerHeight,checks:[{name:'Desktop fixture startup',ok:false,detail:error.message}]};document.title='FAIL — Crew desktop startup';if($('#browser-checks')){$('#browser-checks').textContent=error.message;$('#browser-checks').dataset.finished='failed';}parent.postMessage({crewDesktopQA:result},location.origin);}
})();
