/* Read-only dashboard model. Fiscal dates and outlook values reuse Forecast Manager. */
(function(root){
  'use strict';
  const L=root.LotSalesModel,F=root.ForecastModel;
  const id=L.id,text=L.text,number=L.numeric;
  const checkedCount=(value,label,nullable=false)=>{if(value==null||String(value).trim()===''){if(nullable)return null;return 0;}const n=number(value);if(!Number.isSafeInteger(n)||n<0)throw new Error('Invalid '+label+' in forecast data.');return n;};
  const unique=(rows,label)=>{const result=new Map();for(const row of rows||[]){const key=id(row.ID);if(!key||result.has(key))throw new Error('Missing or duplicate '+label+' ID.');result.set(key,row);}return result;};
  function normalize(data){
    const subdivisions=unique(data.subdivisions,'subdivision'),projects=unique(data.projects,'project'),builders=unique(data.builders,'builder');
    const parentRows=unique(data.years,'forecast year'),monthRows=unique(data.months,'forecast month'),parents=new Map(),pairs=new Set(),slots=new Set();
    const phases=[...subdivisions].map(([subdivisionId,sub])=>{
      const projectId=id(sub.Project),project=projects.get(projectId);
      const total=number(sub.Total_Lots),sold=number(sub.Lots_Sold);
      return {id:subdivisionId,name:text(sub.Subdivision_Name)||text(sub.ID),projectId,project:text(project?.Project_Name)||text(sub.Project)||'Unassigned',territory:text(sub.Territory)||'Unassigned',projectStatus:text(sub.Projects_Status),soldOut:total>0&&sold>=total,totalLots:total,soldLots:sold};
    });
    const phaseMap=new Map(phases.map(p=>[p.id,p]));
    for(const [parentId,row]of parentRows){
      if(text(row.Status)!=='Builder')continue;
      const subdivisionId=id(row.Subdivision1),builderId=id(row.Builder1),year=Number(text(row.Forecast_Year)),phase=phaseMap.get(subdivisionId);
      if(!phase||!builders.has(builderId)||!Number.isInteger(year)||year<2018||year>2046)throw new Error('A forecast year has an unavailable subdivision, builder or fiscal year.');
      const pair=JSON.stringify([subdivisionId,builderId,year]);if(pairs.has(pair))throw new Error('Duplicate forecast years for '+phase.name+'.');pairs.add(pair);
      parents.set(parentId,{id:parentId,phase,builderId,builder:text(builders.get(builderId).Builder_Name)||'Unassigned',year,months:new Map()});
    }
    for(const [monthId,row]of monthRows){
      if(row.Delete_me===true||/^(true|yes|1)$/i.test(text(row.Delete_me)))continue;
      const parent=parents.get(id(row.Forecast_Year2));if(!parent)continue;
      const start=L.date(row.Forecast_Start_Date),index=F.months.indexOf(text(row.Forecast_Month));
      if(index<0||start!==F.start(parent.year,index)||id(row.Subdivision1)!==parent.phase.id||id(row.Builder1)!==parent.builderId||String(row.Forecast_Year)!==String(parent.year))throw new Error('Forecast relationship or month mismatch for '+parent.phase.name+'.');
      const slot=parent.id+':'+index;if(slots.has(slot))throw new Error('Duplicate forecast months for '+parent.phase.name+'.');slots.add(slot);
      parent.months.set(start.slice(0,7),{id:monthId,start,forecast:checkedCount(row.Forecasted_Lots,'Forecasted Lots',true),actual:checkedCount(row.Actual_Lots,'Actual Lots'),scheduled:checkedCount(row.Scheduled_Lots,'Scheduled Lots')});
    }
    for(const parent of parents.values())if(parent.months.size!==12)throw new Error('Incomplete forecast year for '+parent.phase.name+' / '+parent.builder+' / WFY '+parent.year+'.');
    return {phases,parents:[...parents.values()],availableYears:[...new Set([...parents.values()].map(p=>p.year))].sort((a,b)=>a-b),builders:[...builders].map(([id,row])=>({id,name:text(row.Builder_Name)||'Unassigned'}))};
  }
  function yearsFor(period,today,selected=[]){
    const current=F.currentYear(today);
    if(period==='custom'){const years=[...new Set(selected.map(Number))].sort((a,b)=>a-b);if(!years.length||years.some(y=>!Number.isInteger(y)||y<2018||y>2046))throw new Error('Choose at least one valid fiscal year.');return years;}
    return Array.from({length:period==='current'?1:period==='two'?3:2},(_,i)=>current+i);
  }
  const monthsFor=years=>years.flatMap(year=>F.months.map((name,index)=>({year,index,name,start:F.start(year,index),key:F.start(year,index).slice(0,7)})));
  function report(model,filters,today){
    if(!F.date(today))throw new Error('The Creator application date is unavailable. Refresh access.');
    const years=yearsFor(filters.period,today,filters.years),months=monthsFor(years),mode=filters.mode==='forecast'?'forecast':'outlook',q=String(filters.search||'').trim().toLowerCase();
    const chosen=(key,value)=>!filters[key]?.length||filters[key].includes(value);
    const phaseParents=new Map();model.parents.forEach(p=>{if(!phaseParents.has(p.phase.id))phaseParents.set(p.phase.id,[]);phaseParents.get(p.phase.id).push(p);});
    const rows=[];
    for(const phase of model.phases){
      if(!chosen('projectIds',phase.projectId)||!chosen('territories',phase.territory)||!chosen('projectStatuses',phase.projectStatus))continue;
      const allParents=phaseParents.get(phase.id)||[],builderMap=new Map();
      allParents.forEach(p=>{if(years.includes(p.year)&&chosen('builderIds',p.builderId)){if(!builderMap.has(p.builderId))builderMap.set(p.builderId,{id:p.builderId,name:p.builder,parents:new Map()});builderMap.get(p.builderId).parents.set(p.year,p);}});
      const builderRows=[...builderMap.values()];
      if(!builderRows.length&&filters.builderIds?.length)continue;
      const searchPhase=[phase.name,phase.project,phase.territory].some(v=>v.toLowerCase().includes(q));
      const visibleBuilders=builderRows.filter(b=>!q||searchPhase||b.name.toLowerCase().includes(q));
      if(q&&!searchPhase&&!visibleBuilders.length)continue;
      const parts=filters.groupBy==='builder'?visibleBuilders.map(builder=>[builder]):[visibleBuilders];
      if(filters.groupBy==='builder'&&!parts.length)parts.push([]);
      for(const part of parts){
        const builderCells=builders=>months.map(month=>{
          let value=0,known=0,missing=0,sold=0,forecast=0;
          if(!builders.length)missing++;
          for(const builder of builders){const record=builder.parents.get(month.year)?.months.get(month.key);if(!record){missing++;continue;}const v=F.displayValue(record,mode,today);if(v==null){missing++;continue;}known++;value+=v;if(mode==='outlook'&&F.isPast(record,today))sold+=v;else forecast+=v;}
          return {...month,value:known||!missing?value:null,knownValue:value,known,missing,sold,forecast};
        });
        const builderRows=part.length>1?part.map(builder=>({key:JSON.stringify([phase.id,'builder',builder.id]),builder:{id:builder.id,name:builder.name},cells:builderCells([builder])})):[];
        const cells=builderRows.length?aggregate(builderRows,months):builderCells(part);
        if(filters.hideEmpty&&!hasValues(cells))continue;
        const builder=part[0],groupId=filters.groupBy==='territory'?phase.territory:filters.groupBy==='builder'?builder?.id||'unassigned':phase.projectId||'unassigned';
        const groupName=filters.groupBy==='territory'?phase.territory:filters.groupBy==='builder'?builder?.name||'Unassigned':phase.project;
        rows.push({key:JSON.stringify([phase.id,filters.groupBy==='builder'?groupId:'all']),phase,builders:part,builderRows,groupId,groupName,cells});
      }
    }
    rows.sort((a,b)=>a.groupName.localeCompare(b.groupName)||a.phase.name.localeCompare(b.phase.name));
    const groups=[];for(const row of rows){let group=groups.find(g=>g.id===row.groupId);if(!group){group={id:row.groupId,name:row.groupName,rows:[]};groups.push(group);}group.rows.push(row);}
    return {years,months,rows,groups,mode,today,totals:aggregate(rows,months)};
  }
  function aggregate(rows,months){return months.map((month,index)=>{const values=rows.map(r=>r.cells[index]);const known=values.reduce((s,c)=>s+c.known,0),missing=values.reduce((s,c)=>s+c.missing,0),knownValue=values.reduce((s,c)=>s+c.knownValue,0);return {...month,known,missing,knownValue,value:known||!missing?knownValue:null,sold:values.reduce((s,c)=>s+c.sold,0),forecast:values.reduce((s,c)=>s+c.forecast,0)};});}
  function annual(cells,year){const selected=cells.filter(c=>c.year===year),known=selected.reduce((s,c)=>s+c.known,0),missing=selected.reduce((s,c)=>s+c.missing,0),knownValue=selected.reduce((s,c)=>s+c.knownValue,0);return {value:known||!missing?knownValue:null,known,knownValue,missing,sold:selected.reduce((s,c)=>s+c.sold,0),forecast:selected.reduce((s,c)=>s+c.forecast,0)};}
  const hasValues=cells=>cells.some(cell=>cell.value>0);
  root.ForecastInsightsModel=Object.freeze({normalize,yearsFor,monthsFor,report,aggregate,annual,hasValues});
})(typeof window==='undefined'?globalThis:window);
