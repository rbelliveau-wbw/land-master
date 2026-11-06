(function(root){
  'use strict';
  const baselineYears=Object.freeze(['2026','2027','2028']);
  const availableYears=Object.freeze(Array.from({length:28},(_,index)=>String(2018+index)));
  const lotTypes=new Set(['Lot','Lot (Master)','Lot (Amendment)']);
  const own=(row,key)=>Object.prototype.hasOwnProperty.call(row,key);
  function id(value){
    if(value&&typeof value==='object'){
      if(!own(value,'ID')&&!own(value,'id'))throw new Error('A Creator lookup is missing its record ID.');
      return id(value.ID??value.id);
    }
    if(typeof value==='number'&&!Number.isSafeInteger(value))throw new Error('A Creator record ID lost precision.');
    const text=String(value??'').trim();
    if(!text)return '';
    if(!/^\d+$/.test(text))throw new Error('A Creator lookup is missing its record ID.');
    return text;
  }
  // Same native ID/object/array lookup shapes used by Legal and Insights; never join names.
  function ids(value){
    if(value==null||value==='')return [];
    return [...new Set((Array.isArray(value)?value:[value]).map(id).filter(Boolean))];
  }
  function single(value){const values=ids(value);if(values.length>1)throw new Error('A single-record lookup contains multiple records.');return values[0]||'';}
  function required(rows,fields,report){
    if(!Array.isArray(rows))throw new Error(report+': records are unavailable.');
    const seen=new Set();
    for(const row of rows){
      if(!row||!id(row.ID)||seen.has(id(row.ID)))throw new Error(report+': missing or duplicate record ID.');
      seen.add(id(row.ID));
      for(const field of fields)if(!own(row,field))throw new Error(report+': '+field+' is unavailable.');
    }
  }
  function number(value){
    if(value==null||String(value).trim()==='')return null;
    const result=Number(String(value).replace(/,/g,''));
    return Number.isFinite(result)?result:null;
  }
  const truth=value=>value===true||['true','yes'].includes(String(value).trim().toLowerCase());
  const key=(subdivisionId,builderId)=>JSON.stringify([subdivisionId,builderId]);
  function monthWindow(today){
    const parsed=root.ForecastModel?.date(today);
    if(!parsed)throw new Error('The Creator application date is unavailable. Refresh Contract Review.');
    const year=parsed.getUTCFullYear(),month=parsed.getUTCMonth();
    const format=date=>String(date.getUTCMonth()+1).padStart(2,'0')+'/01/'+date.getUTCFullYear();
    return {from:format(new Date(Date.UTC(year,month,1))),to:format(new Date(Date.UTC(year,month+1,1))),label:parsed.toLocaleString('en-US',{month:'long',timeZone:'UTC'})+' Forecast'};
  }
  function monthly(data){
    required(data.months,['Subdivision1','Builder1','Forecasted_Lots'],'All_Forecasts');
    required(data.sold,['Subdivision','Builder1'],'All_Lots_All_Fields');
    const values=new Map();
    const get=(sub,builder)=>{const scope=key(sub,builder);if(!values.has(scope))values.set(scope,{forecast:0,sold:0});return values.get(scope);};
    for(const row of data.months)get(single(row.Subdivision1),single(row.Builder1)).forecast+=number(row.Forecasted_Lots)||0;
    for(const row of data.sold)get(single(row.Subdivision),single(row.Builder1)).sold++;
    return values;
  }
  function build(data,catalog){
    required(data.years,['Subdivision1','Builder1','Forecast_Year','Status'],'All_Forecast_Years');
    required(data.contracts,['Subdivision1','Builder','Contract_Type','Status','Archive'],'All_Contracts1');
    required(data.schedules,['Subdivisions','Builder1'],'All_Takedown_Schedules');
    required(data.subdivisions,['Project','Subdivision_Name','Subdivision_Code','Territory'],'All_Subdivisions');
    required(data.projects,['Project_Name'],'All_Projects');
    if(!Array.isArray(catalog?.subdivisions)||!Array.isArray(catalog?.builders))throw new Error('Forecast choices are unavailable.');
    const projects=new Map(data.projects.map(row=>[id(row.ID),row]));
    const subdivisions=new Map(data.subdivisions.map(row=>[id(row.ID),{name:String(row.Subdivision_Name||row.ID),code:String(row.Subdivision_Code||''),territory:String(row.Territory||'Unassigned'),projectId:single(row.Project)}]));
    const builders=new Map(catalog.builders.map(row=>[id(row.id),row]));
    const month=monthly(data);
    const contracts=data.contracts.filter(row=>lotTypes.has(row.Contract_Type)).map(row=>({
      id:id(row.ID),name:String(row.Contract_Name||row.ID),type:row.Contract_Type,status:String(row.Status||''),
      archived:truth(row.Archive),builderId:single(row.Builder),subdivisionIds:ids(row.Subdivision1),raw:row
    }));
    const contractById=new Map(contracts.map(row=>[row.id,row]));
    const matches=new Map();
    for(const row of contracts)for(const sub of row.subdivisionIds){
      if(!row.builderId)continue;
      const scope=key(sub,row.builderId);
      if(!matches.has(scope))matches.set(scope,[]);
      matches.get(scope).push(row);
    }
    const groups=new Map();
    function group(sub,builder,unassignedKey=''){
      const scope=sub&&builder?key(sub,builder):JSON.stringify([sub,builder,unassignedKey]);
      if(!groups.has(scope))groups.set(scope,{
        key:scope,subdivisionId:sub,builderId:builder,
        subdivision:subdivisions.get(sub)?.name||(sub?'Subdivision '+sub:'Unassigned Subdivision'),
        code:subdivisions.get(sub)?.code||'',territory:subdivisions.get(sub)?.territory||'Unassigned',
        projectId:subdivisions.get(sub)?.projectId||'',project:String(projects.get(subdivisions.get(sub)?.projectId)?.Project_Name||'Unassigned Project'),
        builder:builders.get(builder)?.name||(builder?'Builder '+builder:'Unassigned Builder'),
        month:month.get(key(sub,builder))||{forecast:0,sold:0},
        parents:[],contracts:sub&&builder?matches.get(key(sub,builder))||[]:[],schedules:[],issues:[]
      });
      return groups.get(scope);
    }
    for(const row of data.years){
      const year=String(row.Forecast_Year);
      if(row.Status!=='Builder'||!availableYears.includes(year))continue;
      const parent={id:id(row.ID),year,name:String(row.Forecast_Name||row.ID),forecast:number(row.Full_Year_Forecast)};
      group(single(row.Subdivision1),single(row.Builder1),'forecast:'+parent.id).parents.push(parent);
    }
    for(const row of data.schedules){
      const scheduleId=id(row.ID),builderId=single(row.Builder1),subdivisionIds=ids(row.Subdivisions),contractId=single(row.Add_Contract_Contract_Name);
      const schedule={id:scheduleId,code:String(row.Takedown_Schedule_Code||scheduleId),builderId,subdivisionIds,contractId,contractLinkKnown:own(row,'Add_Contract_Contract_Name'),contract:contractById.get(contractId)||null,raw:row,
        subdivisions:subdivisionIds.map(sub=>subdivisions.get(sub)?.name||'Subdivision '+sub)};
      for(const sub of subdivisionIds.length?subdivisionIds:[''])group(sub,builderId,'schedule:'+scheduleId).schedules.push(schedule);
    }
    const active=[],legacy=[];
    for(const row of groups.values()){
      const issues=[];
      if(!row.subdivisionId||!row.builderId)issues.push('Unassigned Record');
      if(!row.contracts.length)issues.push('No Contract Found');
      if(row.parents.length&&!row.schedules.length)issues.push('No Schedule');
      if(availableYears.some(year=>row.parents.filter(parent=>parent.year===year).length>1))issues.push('Duplicate Forecast Year');
      if(row.schedules.some(s=>s.contractLinkKnown&&!s.contractId))issues.push('Unlinked Schedule');
      if(row.schedules.some(s=>s.contractLinkKnown&&s.contractId&&!row.contracts.some(c=>c.id===s.contractId)))issues.push('Schedule Contract Mismatch');
      row.issues=issues;
      row.years=availableYears.filter(year=>row.parents.some(parent=>parent.year===year));
      if(row.parents.length)active.push(row);
      if(!baselineYears.some(year=>row.years.includes(year))&&row.schedules.length)legacy.push(row);
    }
    const sort=(a,b)=>a.subdivision.localeCompare(b.subdivision)||a.builder.localeCompare(b.builder)||a.key.localeCompare(b.key);
    return {active:active.sort(sort),legacy:legacy.sort(sort)};
  }
  function filter(rows,filters,attention=false,legacy=false){
    return rows.filter(row=>['territory','subdivision','builder'].every(field=>filters[field]===null||filters[field].includes(field==='subdivision'?row.subdivisionId:field==='builder'?row.builderId:row.territory))
      &&(legacy||row.years.some(year=>filters.years===null||filters.years.includes(year)))
      &&(!attention||row.issues.length));
  }
  function groupRows(rows,by){
    const groups=new Map(),kind=['territory','project','builder'].includes(by)?by:'project';
    for(const row of rows){
      const identity=kind==='territory'?row.territory:kind==='builder'?row.builderId:row.projectId;
      const name=kind==='territory'?row.territory:kind==='builder'?row.builder:row.project;
      if(!groups.has(identity))groups.set(identity,{key:JSON.stringify([kind,identity]),name,rows:[]});
      groups.get(identity).rows.push(row);
    }
    return [...groups.values()].sort((a,b)=>a.name.localeCompare(b.name)||a.key.localeCompare(b.key)).map(group=>({...group,rows:group.rows.slice().sort((a,b)=>a.subdivision.localeCompare(b.subdivision)||a.subdivisionId.localeCompare(b.subdivisionId)||a.builder.localeCompare(b.builder)||a.key.localeCompare(b.key))}));
  }
  function csv(active,legacy,years){
    const lines=[['Group','Builder','Builder ID','Subdivision','Subdivision ID','Forecast Years','Forecast Record IDs','Contract Found','Contract IDs','Contract Names','Contract Statuses','Archived Contract Included','Schedule ID','Schedule Code','Schedule Contract ID','Schedule Contract Link Available','Schedule Subdivision IDs','Total Lot Obligation','Initial Closing Date','Takedown Start Date','Initial Lots','Initial Delay Days','Second Closing Lots','Second Closing Days','Subsequent Lots','Subsequent Days','End Date','Last Takedown Date','Last Takedown Lots','Lots Sold','Lots Expected','Review']];
    for(const [group,rows] of [['Forecasts',active],['Legacy',legacy]])for(const row of rows){
      for(const schedule of row.schedules.length?row.schedules:[null]){
        const s=schedule?.raw||{},parents=row.parents.filter(parent=>years===null||years.includes(parent.year));
        lines.push([group,row.builder,row.builderId,row.subdivision,row.subdivisionId,[...new Set(parents.map(parent=>parent.year))].join(' | '),parents.map(parent=>parent.id).join(' | '),row.contracts.length?'Found':'Not Found',row.contracts.map(c=>c.id).join(' | '),row.contracts.map(c=>c.name).join(' | '),row.contracts.map(c=>c.status).join(' | '),row.contracts.some(c=>c.archived)?'Yes':'No',schedule?.id,schedule?.code,schedule?.contractId,schedule?(schedule.contractLinkKnown?'Yes':'No'):'',schedule?.subdivisionIds.join(' | '),s.Total_Lot_Obligation,s.Initial_Closing_Date,s.Takedown_Start_Date,s.Initial_Takedown,s.Initial_Delay_Days,s.Second_Closing_Lots,s.Second_Closing_Days,s.Continued_Takedown,s.Continued_Takedown_Delay_Days,s.Takedown_End_Date,s.Last_Takedown_Date,s.Last_Takedown_Amount,s.Lots_Sold,s.Lots_Expected,row.issues.join(' | ')]);
      }
    }
    const cell=value=>{const text=String(value??'');return '"'+(/^[\s]*[=+@-]/.test(text)?"'":'')+text.replace(/"/g,'""')+'"';};
    return '\ufeff'+lines.map(line=>line.map(cell).join(',')).join('\r\n');
  }
  root.ForecastReviewModel=Object.freeze({baselineYears,availableYears,id,ids,single,number,truth,monthWindow,build,filter,groupRows,csv});
})(typeof window==='undefined'?globalThis:window);
