/* Whole-subdivision header totals reuse the Manager's existing display rules. */
(function(root){
  'use strict';
  function build(snapshot){
    const M=root.ForecastModel,source=snapshot.overview||{},inventory=snapshot.inventory?.counts;
    const builders=[...new Set(snapshot.years.map(parent=>parent.builderId))];
    const years=[...new Set(snapshot.years.map(parent=>String(parent.year)))];
    const rows=M.visibleMatrix(snapshot,builders,years);
    const available=rows.flatMap(row=>row.years).filter(year=>year.parent||year.issue);
    const complete=available.every(year=>!year.issue&&year.months.every(month=>month.id&&!month.issue));
    const displayTotal=complete?available.reduce((sum,year)=>sum+year.outlook,0):null;
    const count=value=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?value:null;
    const projectsLots=count(source.projectsLots),lmLots=count(source.lmLots??inventory?.Total);
    return {...source,...(Object.hasOwn(source,'projectsLots')?{projectsLots}:{}),lmLots,displayTotalLabel:'Sold + Forecast',displayTotal,
      projectsDifference:projectsLots==null||displayTotal==null?null:projectsLots-displayTotal,
      lmDifference:lmLots==null||lmLots===0||displayTotal==null?null:lmLots-displayTotal};
  }
  root.ForecastOverview=Object.freeze({build});
})(typeof window==='undefined'?globalThis:window);
