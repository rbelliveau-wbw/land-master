// Desktop geometry and keyboard checks only. No native record writes.
(async function(){
 const $=selector=>document.querySelector(selector),all=selector=>[...document.querySelectorAll(selector)],checks=[];
 const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 async function wait(predicate){for(let i=0;i<500;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,25));}throw new Error('Timed out waiting for crew desktop fixture');}
 const assert=(condition,name,detail)=>checks.push({name,ok:!!condition,...(condition?{}:{detail})});
 const fits=node=>{const box=node.getBoundingClientRect();return box.left>=-1&&box.top>=-1&&box.right<=innerWidth+1&&box.bottom<=innerHeight+1;};
 try{
  await wait(()=>window.CrewManager?.state.ready&&!CrewManager.state.loading&&$('#fixture-audit'));
  // The outer harness identifies this as isolated; its extra in-frame banner
  // does not exist inside Creator and must not consume measured content height.
  if($('#fixture-warning'))$('#fixture-warning').hidden=true;
  if($('#fixture-tools'))$('#fixture-tools').hidden=true;
  $('#crewsTab').click();
  await frame();window.scrollTo(0,0);
  $('[data-cm-crew="90071992547408001"]').click();await frame();
  assert($('#app').dataset.workspace==='crews','Crews workspace opens first');
  assert(document.documentElement.scrollWidth<=innerWidth+1,'No horizontal page overflow',document.documentElement.scrollWidth);
  const roster=$('.cm-roster-panel').getBoundingClientRect(),detail=$('#cmDetail').getBoundingClientRect();
  assert(roster.right<=detail.left+2&&roster.width>=190&&detail.width>=450,'Compact roster and detail fit side by side',{roster:roster.toJSON(),detail:detail.toJSON()});
  assert(parseFloat(getComputedStyle($('#crewSearch')).fontSize)>=13,'Search remains readable');
  assert(all('.cm-roster-code').every(node=>parseFloat(getComputedStyle(node).fontSize)>=11),'Compact crew codes remain readable');
  assert(document.documentElement.scrollHeight<=innerHeight+1,'Crew workspace fits the iframe with no outer vertical scrollbar',document.documentElement.scrollHeight);
  assert(all('.cm-actions').every(node=>node.scrollWidth<=node.clientWidth+1),'Crew actions fit their containers');
  assert(all('#cmDetail .cm-assignment-table').every(node=>node.parentElement.scrollWidth>=node.parentElement.clientWidth),'Assignment tables retain their horizontal contents');
  const firstUpcoming=$('#cmDetail .cm-assignment-table tbody tr');assert(firstUpcoming&&fits(firstUpcoming),'First upcoming assignment is visible at desktop content height',firstUpcoming?.getBoundingClientRect().toJSON());
  $('#crewSearch').value='U2';$('#crewSearch').dispatchEvent(new Event('input',{bubbles:true}));await frame();assert(all('[data-cm-crew]').length===1,'Roster search keeps selection reachable');$('#crewSearch').value='';$('#crewSearch').dispatchEvent(new Event('input',{bubbles:true}));
  $('#crewsTab').focus();$('#crewsTab').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));await frame();assert(document.activeElement===$('#scheduleTab')&&$('#app').dataset.workspace==='schedule','Arrow keys move workspace focus and panel together');
  $('#editorView').click();await frame();assert($('#timeline').hidden&&!$('#schedule').hidden,'Editor replaces the visible timeline without unmounting it');assert(document.documentElement.scrollHeight<=innerHeight+1,'Editor workspace fits the iframe',document.documentElement.scrollHeight);$('#timelineView').click();await frame();assert(!$('#timeline').hidden&&$('#schedule').hidden,'Timeline replaces the visible date grid');assert(document.documentElement.scrollHeight<=innerHeight+1,'Timeline workspace fits the iframe',document.documentElement.scrollHeight);
  $('#scheduleTab').dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}));await frame();assert(document.activeElement===$('#employeesTab')&&$('#app').dataset.workspace==='employees','Home restores the first workspace tab');$('#crewsTab').click();await frame();
  $('#cmNewCrew').click();await frame();assert($('#cmEditorDialog').open&&fits($('#cmEditorDialog')),'Crew editor fits desktop viewport',$('#cmEditorDialog').getBoundingClientRect().toJSON());assert(document.activeElement===$('#cmCode'),'New crew editor focuses its required code');assert(fits($('#cmSave'))&&fits($('#cmCancel')),'Crew editor committing controls remain visible');
  const xButton=$('#cmClose'),svg=xButton.querySelector('svg'),buttonBox=xButton.getBoundingClientRect(),svgBox=svg.getBoundingClientRect();assert(Math.abs((buttonBox.left+buttonBox.right-svgBox.left-svgBox.right)/2)<1&&Math.abs((buttonBox.top+buttonBox.bottom-svgBox.top-svgBox.bottom)/2)<1,'Close SVG is centered in its actual button',{button:buttonBox.toJSON(),svg:svgBox.toJSON()});$('#cmCancel').click();await frame();
  $('#cmNewAssignment').click();await frame();assert($('#cmEditorDialog').open&&fits($('#cmEditorDialog')),'Assignment editor fits desktop viewport',$('#cmEditorDialog').getBoundingClientRect().toJSON());assert(document.activeElement===$('#cmCrewPicker'),'Assignment editor gives initial focus to crew');$('#cmPhasePicker').click();await frame();assert(fits($('#cmPicker')),'Searchable phase picker fits viewport',$('#cmPicker').getBoundingClientRect().toJSON());const search=$('#cmPicker input'),options=all('#cmPicker [data-cm-option]:not(:disabled)');assert(document.activeElement===search,'Picker starts at its search input');search.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));assert(document.activeElement===options[0],'ArrowDown moves into first available phase');document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert($('#cmPicker').hidden&&document.activeElement===$('#cmPhasePicker'),'Escape closes picker and restores initiating focus');$('#cmCancel').click();await frame();
  assert(!all('#cmForm select,#cmForm input[type=date]').length,'No native select or date picker replaces the custom controls');assert(JSON.parse($('#fixture-audit').textContent).nativeAttempts.length===0,'Desktop geometry performs no native writes');assert(document.documentElement.scrollWidth<=innerWidth+1,'No horizontal page overflow after editor and picker use');
 }catch(error){checks.push({name:'Crew desktop fixture completed',ok:false,detail:error.message});}
 const result={passed:checks.every(check=>check.ok),workspace:'crews',viewport:innerWidth+' × '+innerHeight,checks};window.CrewManagementDesktopQA=result;const list=$('#browser-checks');if(list){list.innerHTML=checks.map(check=>'<li data-result="'+(check.ok?'pass':'fail')+'">'+(check.ok?'PASS ':'FAIL ')+check.name+(check.detail?' · '+JSON.stringify(check.detail):'')+'</li>').join('');list.dataset.finished=result.passed?'passed':'failed';}document.title=(result.passed?'PASS':'FAIL')+' — Crew Management desktop '+innerWidth+' × '+innerHeight;parent.postMessage({crewDesktopQA:result},location.origin);
})();
