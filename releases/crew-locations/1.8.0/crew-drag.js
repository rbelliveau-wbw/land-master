/* Pointer presentation only. Native milestone validation and saves stay in CrewApp. */
(function(root){
 'use strict';
 const M=root.CrewModel,$=id=>document.getElementById(id);let A,frame=0,feedback=null,clearTimer=0;
 const key=r=>r.type+':'+r.id,scope=()=>A.scope(),allowed=()=>A.allowed();
 function panel(){return $('dragPreview');}
 function mount(d){
  clearTimeout(clearTimer);feedback=d;const n=panel();n.innerHTML='<strong class="drag-preview-title"></strong><div class="drag-preview-dates"><span></span><b></b></div><small class="drag-preview-detail"></small><small class="drag-preview-status"></small>';n.hidden=false;
  n.querySelector('strong').textContent=d.r.stage+' · '+(d.field==='start'?'Start':'End');
 }
 function anchor(d){return document.querySelector('.gantt-row.milestone[data-phase="'+d.p.id+'"] .lane');}
 const visibleLeft=(lane,clip)=>lane.previousElementSibling?.getBoundingClientRect().right??clip.left+272;
 function position(d){
  const lane=anchor(d);if(!lane||!allowed()||scope()!==d.scope){panel().hidden=true;return;}
  const box=lane.getBoundingClientRect(),clip=lane.closest('.gantt-scroll').getBoundingClientRect(),left=Math.max(8,visibleLeft(lane,clip)),right=Math.min(innerWidth-8,clip.right-8),x=box.left+d.axis.position(d.value)/100*box.width;
  const n=panel(),size=n.getBoundingClientRect();n.style.left=Math.max(left,Math.min(x-size.width/2,right-size.width))+'px';
  const y=box.top+21,top=y-size.height-8>=clip.top+49?y-size.height-8:y+26;n.style.top=Math.max(8,Math.min(top,clip.bottom-size.height-8))+'px';
  if(box.top<clip.top+49||box.top>clip.bottom)n.hidden=true;
 }
 function show(d,state,text){
  if(feedback!==d)mount(d);const n=panel();n.hidden=false;n.dataset.state=state;
  n.querySelector('.drag-preview-dates span').textContent=M.us(d.before)+' →';n.querySelector('.drag-preview-dates b').textContent=M.us(d.value);
  const delta=d.value-d.before,next={...d.r,[d.field]:d.value},days=M.duration(next);
  n.querySelector('.drag-preview-detail').textContent=(delta>0?'+':'')+delta+(Math.abs(delta)===1?' Day':' Days')+(days==null?'':' · '+days+(days===1?' Day Total':' Days Total'));
  n.querySelector('.drag-preview-status').textContent=text;position(d);
 }
 function valid(d){try{M.validate(d.p,d.r,{[d.field]:d.value},A.state.permissions,A.state.day,'drag');d.error='';}catch(e){d.error=e.message;}}
 function paint(d){
  const offset=d.x-d.startX+d.scroller.scrollLeft-d.startScroll;d.moved=d.moved||Math.abs(offset)>=3;
  d.value=d.axis.dayAt(d.axis.position(d.before)+offset/d.width*100);valid(d);
  const pos=d.axis.position;
  for(const item of d.bars){let start=Number(item.node.dataset.start),end=Number(item.node.dataset.end);if(d.field==='start')start=d.value;else end=d.value;
   const left=pos(Math.min(start,end)),right=pos(Math.max(start,end));item.node.style.left=left+'%';item.node.style.width=Math.max(0,right-left)+'%';item.node.classList.toggle('drag-invalid',!!d.error);item.node.querySelector('.bar-label').textContent=String(end-start);
  }
  for(const item of d.edges)item.node.style.left=pos(d.value)+'%';
  d.guide.style.left=pos(d.value)+'%';d.guide.classList.toggle('drag-invalid',!!d.error);
  // Recompute hatching from a draft phase; never mutate the saved source model.
  const draft={...d.p,records:{...d.p.records,M:{...d.p.records.M,[d.r.stage]:{...d.r,[d.field]:d.value}}}},intervals=M.intervals(draft,'M',A.state.filters.sections,A.state.hidden).intervals;
  d.overlays.replaceChildren();for(const overlap of M.overlaps(intervals,false)){if(overlap.end<d.axis.ticks[0].start||overlap.start>d.axis.ticks.at(-1).end)continue;const n=document.createElement('span');n.className='overlap'+(overlap.cross?'':' same-section');n.style.left=pos(overlap.start)+'%';n.style.width=(pos(overlap.end)-pos(overlap.start))+'%';d.overlays.append(n);}
  show(d,d.error?'error':'dragging',d.error||'Release to Save · Esc to Cancel');
 }
 function eligible(d){return scope()===d.scope&&allowed()&&A.state.model?.records.get(key(d.r))===d.r&&!A.state.busy&&!A.state.loading&&!A.state.managementBusy&&!A.state.managementUnknown&&!A.state.operation?.unknown;}
 function tick(time){
  const d=A.state.drag;if(!d)return;if(!eligible(d)){cancel();return;}
  const clip=d.scroller.getBoundingClientRect(),left=visibleLeft(d.lane,clip),right=clip.right,dt=Math.min(40,time-(d.time||time));d.time=time;
  if(d.moved&&d.y>=clip.top&&d.y<=clip.bottom){const edge=40,speed=d.x<left+edge?-Math.min(1,(left+edge-d.x)/edge):d.x>right-edge?Math.min(1,(d.x-right+edge)/edge):0,before=d.scroller.scrollLeft;d.scroller.scrollLeft+=speed*360*dt/1000;if(d.scroller.scrollLeft!==before)paint(d);}
  frame=requestAnimationFrame(tick);
 }
 function begin(event){
  const h=event.target.closest('[data-drag]'),s=A.state;if(!h||event.button!==0||event.isPrimary===false||s.drag||!s.ready||s.busy||s.loading||s.managementBusy||s.managementUnknown||s.operation?.unknown||!allowed())return;
  const r=s.model?.records.get(h.dataset.record),p=r&&s.model.byId.get(r.phaseId),field=h.dataset.drag;if(!r||!['start','end'].includes(field)||M.editable(p,r,field,s.permissions,s.day,'drag'))return;
  const lane=h.closest('.lane'),scroller=lane.closest('.gantt-scroll'),bar=h.closest('.bar'),source=key(r),d={handle:h,pointerId:event.pointerId,r,p,field,lane,scroller,axis:s.axis,width:lane.getBoundingClientRect().width,startX:event.clientX,x:event.clientX,y:event.clientY,startScroll:scroller.scrollLeft,value:r[field],before:r[field],scope:scope(),moved:false,bars:[],edges:[],overlaps:[]};
  try{h.setPointerCapture(event.pointerId);}catch{return;}
  for(const node of lane.querySelectorAll('.bar'))if(node.dataset[field==='start'?'startRecord':'endRecord']===source){d.bars.push({node,css:node.style.cssText,label:node.querySelector('.bar-label').innerHTML});node.classList.add('is-resizing');}
  for(const node of lane.querySelectorAll('[data-edge-record]'))if(node.dataset.edgeRecord===source&&node.dataset.edgeField===field)d.edges.push({node,css:node.style.cssText});
  for(const node of lane.querySelectorAll('.overlap')){d.overlaps.push({node,hidden:node.hidden});node.hidden=true;}
  const origin=document.createElement('span');origin.className='drag-origin';origin.style.left=bar.style.left;origin.style.width=bar.style.width;lane.append(origin);d.origin=origin;
  d.guide=document.createElement('span');d.guide.className='drag-guide';lane.append(d.guide);d.overlays=document.createElement('div');d.overlays.className='drag-overlaps';lane.append(d.overlays);
  s.drag=d;document.body.classList.add('crew-dragging');lane.classList.add('is-dragging');mount(d);paint(d);A.controls();$('dragAnnounce').textContent=r.stage+' '+field+' selected. Drag to change the date; Escape cancels.';frame=requestAnimationFrame(tick);event.preventDefault();
 }
 function move(event){const d=A.state.drag;if(!d||event.pointerId!==d.pointerId)return;if(!eligible(d)){cancel();return;}d.x=event.clientX;d.y=event.clientY;paint(d);event.preventDefault();}
 function release(d){
  cancelAnimationFrame(frame);frame=0;A.state.drag=null;
  for(const item of d.bars){item.node.style.cssText=item.css;item.node.classList.remove('is-resizing','drag-invalid');item.node.querySelector('.bar-label').innerHTML=item.label;}
  for(const item of d.edges)item.node.style.cssText=item.css;for(const item of d.overlaps)item.node.hidden=item.hidden;
  d.origin.remove();d.guide.remove();d.overlays.remove();d.lane.classList.remove('is-dragging');document.body.classList.remove('crew-dragging');
  try{if(d.handle.hasPointerCapture(d.pointerId))d.handle.releasePointerCapture(d.pointerId);}catch{}A.controls();
 }
 function cancel(){const d=A?.state.drag;if(d)release(d);feedback=null;panel().hidden=true;clearTimeout(clearTimer);if(d)$('dragAnnounce').textContent='Drag cancelled. Dates unchanged.';}
 async function end(event){
  const d=A.state.drag;if(!d||event.pointerId!==d.pointerId)return;
  if(event.type!=='pointerup'||!eligible(d)){cancel();return;}d.x=event.clientX;d.y=event.clientY;paint(d);release(d);
  if(!d.moved||d.value===d.r[d.field]){cancel();return;}
  if(d.error){show(d,'error',d.error);$('dragAnnounce').textContent=d.error+'. Dates unchanged.';return;}
  show(d,'saving','Saving…');requestAnimationFrame(()=>{if(feedback===d)position(d);});
  try{const result=await A.commit(d.p,[M.change(d.r,{[d.field]:d.value})],'drag');if(scope()!==d.scope||!allowed()){cancel();return;}if(result){d.value=A.state.model.records.get(key(d.r))?.[d.field]??d.value;show(d,'saved','Saved');$('dragAnnounce').textContent=d.r.stage+' '+d.field+' saved as '+M.us(d.value)+'.';clearTimer=setTimeout(()=>{if(feedback===d){feedback=null;panel().hidden=true;}},3500);}}
  catch(e){if(scope()===d.scope&&allowed()){show(d,e.unknown?'unknown':'error',e.message);$('dragAnnounce').textContent=e.message;}else cancel();}
 }
 function install(adapter){
  A=adapter;document.addEventListener('pointerdown',begin);document.addEventListener('pointermove',move);document.addEventListener('pointerup',end);document.addEventListener('pointercancel',end);document.addEventListener('lostpointercapture',e=>{if(A.state.drag?.pointerId===e.pointerId)cancel();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&A.state.drag){e.preventDefault();cancel();}});window.addEventListener('blur',()=>{if(A.state.drag)cancel();});window.addEventListener('pagehide',cancel);window.addEventListener('resize',cancel);document.addEventListener('scroll',()=>{if(feedback)position(feedback);},true);
  document.addEventListener('crew:management-ready',()=>{if(feedback&&scope()!==feedback.scope)cancel();});
  document.addEventListener('click',e=>{if(feedback&&!A.state.drag&&!A.state.busy&&!e.target.closest('[data-drag]'))cancel();});
 }
 root.CrewDrag=Object.freeze({install,cancel,begin,move,end});
})(window);
