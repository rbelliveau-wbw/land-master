/* Explicit new-module motion registry. Shared engines retain native business timing. */
(function(root){
 'use strict';
 root.CrewSurfaces={install(){
  const ready=()=>CrewApp.state.ready||root.CrewManager?.state.ready===true,actor=()=>LMRuntime.current().user+':'+CrewApp.state.epoch;
  LMInteractionSurfaces.install('crew-locations',{state:()=>CrewApp.state,ready,actor});
  LMMotion.start({module:'crew-locations-rows',root:document.getElementById('app'),ready,actor,lists:[
   {selector:'.gantt-grid',rows:'.gantt-row[data-phase]',key:node=>node.dataset.phase+':'+node.dataset.rowType,scope:'authorized-phases'},
   {selector:'#scheduleTable tbody',rows:'tr[data-phase]',key:node=>node.dataset.phase+':'+node.dataset.rowType,scope:'authorized-table-phases'},
   {selector:'#crewRoster',rows:'[data-cm-crew]',key:node=>node.dataset.cmCrew,scope:()=>root.CrewManager?.state.status+':'+root.CrewManager?.state.query},
   {selector:'.cm-assignment-table tbody',rows:'[data-cm-assignment]',key:node=>node.dataset.cmAssignment,hostKey:node=>node.closest('.cm-detail-section')?.querySelector('h4')?.textContent.replace(/\d+/g,'')||'earlier-work',scope:()=>root.CrewManager?.state.selected}
  ]});
 }};
})(window);
