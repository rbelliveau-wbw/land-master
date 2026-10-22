/* Explicit new-module motion registry. Shared engines retain native business timing. */
(function(root){
 'use strict';
 root.CrewSurfaces={install(){
  const ready=()=>CrewApp.state.ready,actor=()=>LMRuntime.current().user+':'+CrewApp.state.epoch;
  LMInteractionSurfaces.install('crew-locations',{state:()=>CrewApp.state,ready,actor});
  LMMotion.start({module:'crew-locations-rows',root:document.getElementById('app'),ready,actor,lists:[
   {selector:'.gantt-grid',rows:'.gantt-row[data-phase]',key:node=>node.dataset.phase+':'+node.dataset.rowType,scope:'authorized-phases'},
   {selector:'#scheduleTable tbody',rows:'tr[data-phase]',key:node=>node.dataset.phase+':'+node.dataset.rowType,scope:'authorized-table-phases'}
  ]});
 }};
})(window);
