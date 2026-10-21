/* Calendar-only scheduling and selections. No SDK calls, inferred source dates or writes. */
(function (root) {
  'use strict';
  const DAY=86400000;
  const STAGES=['Entitlements','Engineering Design','Municipal Review','Pre-Construction','Rough Cut','Sewer','Water','Storm Drain','Road Prep','Dry Utilities','Punch List','Closeout'];
  const SECTIONS=[
    {key:'rough',name:'Rough Cut',stages:['Rough Cut'],start:'Rough Cut',end:'Rough Cut',color:'#8054c7'},
    {key:'sewer',name:'Sewer–Storm Drain',stages:['Sewer','Water','Storm Drain'],start:'Sewer',end:'Storm Drain',color:'#ffffff'},
    {key:'road',name:'Road Prep–Closeout',stages:['Road Prep','Dry Utilities','Punch List','Closeout'],start:'Road Prep',end:'Closeout',color:'#9aa1ac'}
  ];
  const norm=v=>String(v==null?'':v).trim().replace(/\s+/g,' ').toLowerCase();
  const id=v=>{if(v&&typeof v==='object')v=v.ID??v.id;if(v==null)return '';if(typeof v==='number'&&!Number.isSafeInteger(v))throw new Error('An unsafe numeric record ID was returned.');return String(v);};
  function date(v){
    if(v==null||v==='')return null;
    const s=String(v),iso=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s),us=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
    if(!iso&&!us)return null;
    const y=Number(iso?iso[1]:us[3]),m=Number(iso?iso[2]:us[1]),d=Number(iso?iso[3]:us[2]);
    const dt=new Date(Date.UTC(y,m-1,d));
    return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d?dt.getTime()/DAY:null;
  }
  const iso=n=>n==null?'':new Date(n*DAY).toISOString().slice(0,10);
  const us=n=>n==null?'':iso(n).slice(5,7)+'/'+iso(n).slice(8)+'/'+iso(n).slice(0,4);
  function today(now=new Date()){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);const get=t=>parts.find(p=>p.type===t).value;return date(get('year')+'-'+get('month')+'-'+get('day'));}
  function months(n,count){const dt=new Date(n*DAY),d=dt.getUTCDate();dt.setUTCDate(1);dt.setUTCMonth(dt.getUTCMonth()+count);const last=new Date(Date.UTC(dt.getUTCFullYear(),dt.getUTCMonth()+1,0)).getUTCDate();dt.setUTCDate(Math.min(d,last));return dt.getTime()/DAY;}
  function monthTicks(from,to){let n=from;const out=[];while(n<to){const dt=new Date(n*DAY);const next=Date.UTC(dt.getUTCFullYear(),dt.getUTCMonth()+1,1)/DAY;out.push({start:n,end:Math.min(next,to),label:dt.toLocaleDateString('en-US',{timeZone:'UTC',month:'short',year:'numeric'})});n=next;}return out;}
  const duration=r=>r&&r.start!=null&&r.end!=null&&r.end>=r.start?r.end-r.start:null;
  const stage=name=>STAGES.find(s=>norm(s)===norm(name))||null; // Verified names from Milestones_Set_Sequence_N only.
  const locked=p=>[p.status,p.projectsStatus].some(v=>['completed','sold out','sold out (prev wfy)'].includes(norm(v)));
  const soldStatus=v=>['sold out','sold out (prev wfy)'].includes(norm(v));
  const sold=p=>[p.status,p.projectsStatus].some(soldStatus);
  const displayStatus=p=>p.projectsStatus||p.status||'Unknown';
  function defaults(){return {crews:[],phases:['assigned'],territories:[],sections:SECTIONS.map(s=>s.key),horizons:[12],showAll:false,table:{projects:[],codes:[],territories:[],statuses:[]}};}
  function normalize(data){
    const issues=[],phases=(data.subdivisions||[]).map(r=>({id:id(r.ID),name:String(r.Subdivision_Name||''),code:String(r.Subdivision_Code||''),phase:r.Phase??'',subphase:r.Subphase||'',parentId:id(r.Project),territory:String(r.Territory||''),status:String(r.Status||''),projectsStatus:String(r.Projects_Status||''),projectId:id(r.Project_ID),lots:r.Total_Lots??null,residentialLots:r.Lot_Total_Residential??null,records:{M:{},T:{}},crews:[]}));
    const byId=new Map(phases.map(p=>[p.id,p])),records=new Map();
    function add(rows,type){for(const raw of rows||[]){
      const phaseId=id(raw.Subdivision1),p=byId.get(phaseId),key=stage(type==='M'?raw.Milestone_Name:raw.Stage_Key),recordId=id(raw.ID);
      if(!p){issues.push('Unmatched '+type+' record '+recordId);continue;}
      if(!key){issues.push('Unmapped '+type+' stage: '+(raw.Milestone_Name||raw.Stage_Key||recordId));continue;}
      const r={id:recordId,phaseId,type,stage:key,start:date(raw.Start_Date),end:date(raw.End_Date),rawStart:raw.Start_Date||'',rawEnd:raw.End_Date||'',externalId:id(type==='M'?raw.Milestone_ID:raw.Source_Record_ID),projectId:id(raw.Project_ID),push:raw.Push_Update===true||norm(raw.Push_Update)==='true',writeEnabled:raw.Write_Enabled===true||norm(raw.Write_Enabled)==='true',source:raw.Source_System||'',sourceUpdated:raw.Source_Modified_At||''};
      if((raw.Start_Date&&r.start==null)||(raw.End_Date&&r.end==null))issues.push(p.name+' · '+key+': invalid source date');
      if(r.start!=null&&r.end!=null&&r.start>r.end){r.invalid=true;issues.push(p.name+' · '+type+' '+key+': reversed source dates');}
      if(type==='M'&&r.projectId&&p.projectId&&r.projectId!==p.projectId)issues.push(p.name+' · '+key+': milestone/phase external project IDs disagree; external synchronization requires review');
      if(Object.prototype.hasOwnProperty.call(p.records[type],key)){p.records[type][key]=null;issues.push(p.name+' · ambiguous '+type+' '+key+' records');}
      else p.records[type][key]=r;
      if(records.has(type+':'+recordId))throw new Error('Duplicate source record ID.');records.set(type+':'+recordId,r);
    }}
    add(data.milestones,'M');add(data.tasks,'T');
    const crews=new Map((data.crews||[]).filter(r=>r.Active===true||norm(r.Active)==='true').map(r=>[id(r.ID),{id:id(r.ID),code:String(r.Crew_Code||''),color:/^#[a-f\d]{6}$/i.test(r.Badge_Color||'')?r.Badge_Color:'#49688c'}]));
    return {phases,byId,records,crews,assignments:data.assignments||[],issues};
  }
  function assignments(model,day){
    model.phases.forEach(p=>p.crews=[]);
    for(const a of model.assignments){const d=date(a.Assignment_Date),p=model.byId.get(id(a.Subdivision1)),crew=model.crews.get(id(a.Crew));if(d!=null&&d>=day-7&&d<=day&&p&&crew&&!p.crews.some(c=>c.id===crew.id))p.crews.push(crew);}
    model.phases.forEach(p=>p.crews.sort((a,b)=>a.code.localeCompare(b.code)));
  }
  function restricted(p,f){return (!f.crews.length||p.crews.some(c=>f.crews.includes(c.id)))&&(!f.territories.length||f.territories.includes(p.territory));}
  function upcoming(model,f,day){return model.phases.filter(p=>{const r=p.records.M['Rough Cut'];return r&&!r.invalid&&r.start!=null&&r.start>=day&&r.start<=months(day,12)&&restricted(p,f);}).sort((a,b)=>a.records.M['Rough Cut'].start-b.records.M['Rough Cut'].start||a.name.localeCompare(b.name));}
  function selected(model,f){return model.phases.filter(p=>restricted(p,f)&&(f.phases.includes(p.id)||f.phases.includes('assigned')&&p.crews.length));}
  function tablePhases(model,f){const tf=f.table,statuses=tf.statuses.map(norm);return (f.showAll?model.phases:selected(model,f)).filter(p=>(!tf.projects.length||tf.projects.includes(p.id))&&(!tf.codes.length||tf.codes.includes(p.code))&&(!tf.territories.length||tf.territories.includes(p.territory))&&(statuses.length?(sold(p)?[p.status,p.projectsStatus].some(s=>soldStatus(s)&&statuses.includes(norm(s))):statuses.includes(norm(displayStatus(p)))):!sold(p)));}
  function tableStages(f){return f.showAll||SECTIONS.every(s=>f.sections.includes(s.key))?STAGES:STAGES.filter(key=>SECTIONS.some(s=>f.sections.includes(s.key)&&s.stages.includes(key)));}
  const visible=(visibility,key,field)=>!visibility.has(key+':'+field);
  function intervals(p,type,sections,visibility=new Set()){
    const out=[],missing=[];
    for(const s of SECTIONS.filter(s=>sections.includes(s.key))){
      const a=p.records[type][s.start],b=p.records[type][s.end];
      if(a&&!a.invalid&&b&&!b.invalid&&a.start!=null&&b.end!=null&&a.start<=b.end&&visible(visibility,s.start,'start')&&visible(visibility,s.end,'end')){
        out.push({section:s.key,start:a.start,end:b.end,startRecord:a,endRecord:b,grouped:true});continue;
      }
      missing.push(s.name+': grouped boundary missing, hidden or invalid');
      for(const key of s.stages){const r=p.records[type][key];if(!r||r.invalid)continue;const start=visible(visibility,key,'start')?r.start:null,end=visible(visibility,key,'end')?r.end:null;if(start==null&&end==null)continue;
        out.push({section:s.key,start,end,startRecord:r,endRecord:r,grouped:false});
      }
    }
    return {intervals:out,missing};
  }
  function overlaps(intervals){const out=[];for(let a=0;a<intervals.length;a++)for(let b=a+1;b<intervals.length;b++){const x=intervals[a],y=intervals[b];if(x.section===y.section||x.start==null||x.end==null||y.start==null||y.end==null)continue;const start=Math.max(x.start,y.start),end=Math.min(x.end,y.end);if(end>start)out.push({start,end,contributors:[x,y]});}return out;}
  function editable(p,r,field,permissions,day,origin='table'){
    if(!r)return 'No verified source record';if(locked(p))return 'This phase is locked';if(r.invalid)return 'Invalid source dates require source review';
    if(r.type==='M'&&!permissions.milestones||r.type==='T'&&!permissions.tasks)return 'Schedule editing is not permitted';
    if(r.type==='T'&&origin==='drag')return 'Task bars cannot be dragged';if(r.type==='T'&&(!r.writeEnabled||!r.externalId||!r.source))return 'Task source writes are not verified';
    if(r.push)return 'This milestone already has a pending Projects update';
    if(field&&r[field]!=null&&r[field]<day)return 'Existing past dates are protected';return '';
  }
  function validate(p,r,patch,permissions,day,origin){
    for(const field of Object.keys(patch)){if(!['start','end'].includes(field))throw new Error('Unknown date field');if(patch[field]===r[field])continue;const reason=editable(p,r,field,permissions,day,origin);if(reason)throw new Error(reason);if(patch[field]!=null&&(!Number.isInteger(patch[field])||patch[field]<day))throw new Error('Dates cannot move into the past');}
    const next={...r,...patch};if(next.start!=null&&next.end!=null&&next.start>next.end)throw new Error('Start must be on or before End');return next;
  }
  function change(r,patch){const fields={};for(const k of ['start','end'])if(Object.prototype.hasOwnProperty.call(patch,k)&&patch[k]!==r[k])fields[k]={before:iso(r[k])||null,after:iso(patch[k])||null};return {recordId:r.id,type:r.type,stage:r.stage,fields,expected:{start:iso(r.start)||null,end:iso(r.end)||null}};}
  function setDuration(p,r,days,permissions,day){if(!Number.isInteger(days)||days<0)throw new Error('Days must be a whole number of zero or more');let patch;if(r.start!=null)patch={end:r.start+days};else if(r.end!=null)patch={start:r.end-days};else throw new Error('Enter a Start or End date first');validate(p,r,patch,permissions,day,'duration');return change(r,patch);}
  function propagate(p,r,delta,direction,all,permissions,day,used=new Set()){
    if(!Number.isInteger(delta)||!delta)throw new Error('Change Days before using an arrow');const i=STAGES.indexOf(r.stage),keys=direction>0?STAGES.slice(i+1):STAGES.slice(0,i).reverse(),targets=all?keys:keys.slice(0,1),changes=[];
    for(const key of targets){if(used.has(key))throw new Error('This duration adjustment was already applied to '+key);const target=p.records[r.type][key];if(!target)continue;const patch={};for(const field of ['start','end'])if(target[field]!=null)patch[field]=target[field]+Math.abs(delta)*direction;if(!Object.keys(patch).length)continue;validate(p,target,patch,permissions,day,'arrow');changes.push(change(target,patch));}
    if(!changes.length)throw new Error('No saved dates in the requested stages');return changes;
  }
  root.CrewModel=Object.freeze({STAGES,SECTIONS,norm,id,date,iso,us,today,months,monthTicks,duration,stage,locked,soldStatus,sold,displayStatus,defaults,normalize,assignments,upcoming,selected,tablePhases,tableStages,visible,intervals,overlaps,editable,validate,change,setDuration,propagate});
})(typeof window==='undefined'?globalThis:window);
