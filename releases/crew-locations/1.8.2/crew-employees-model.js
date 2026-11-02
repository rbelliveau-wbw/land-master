/* BU identity is authoritative. Timecard names and codes never establish a join. */
(function(root){
  'use strict';
  const truth=v=>v===true||String(v).trim().toLowerCase()==='true';
  const guid=v=>String(v||'').trim().toUpperCase();
  function label(crew){
    const source=crew.name||crew.code;
    const match=/^(rough\s*cut|utility|finish|dry)(?:\s*crew)?\s*[- ]?\s*(\d+)$/i.exec(source);
    return match?({'roughcut':'RC',utility:'U',finish:'F',dry:'Dry'}[match[1].replace(/\s/g,'').toLowerCase()]+match[2]):crew.code;
  }
  function assignBadges(model,day){
    const M=root.CrewModel,employees=new Map(),ambiguous=new Set(),cards=new Set();
    for(const employee of model.employees){const key=guid(employee.BU_Employee_ID);if(!key)continue;if(employees.has(key))ambiguous.add(key);employees.set(key,employee);}
    for(const card of model.timecards){
      const key=guid(card.Timecard_ID),foremanId=guid(card.Foreman_ID),date=M.date(card.Work_Date);
      if(!key||cards.has(key)||truth(card.IsDeleted)||date==null||date<day-6||date>day)continue;
      cards.add(key);
      if(ambiguous.has(foremanId)){model.issues.push('Ambiguous foreman identity on timecard '+key);continue;}
      const employee=employees.get(foremanId);
      if(!employee||M.norm(employee.Labor_Type)!=='foreman')continue;
      const crew=model.crews.get(M.id(employee.Crew));if(!crew)continue;
      const phase=model.byId.get(M.id(card.Subdivision1));
      if(!phase){model.issues.push('Unmapped foreman timecard job: '+String(card.Job_Code||key));continue;}
      let badge=phase.crews.find(c=>c.id===crew.id);
      if(!badge){badge={...crew,label:label(crew),inactive:true,foremen:[]};phase.crews.push(badge);}
      const active=truth(employee.IsActive)&&crew.active;
      if(active)badge.inactive=false;
      const detail=String(employee.EmployeeName||'Foreman')+' · '+M.us(date)+(truth(employee.IsActive)?'':' · Inactive employee');
      if(!badge.foremen.includes(detail))badge.foremen.push(detail);
      badge.detail=badge.foremen.join('\n')+(!crew.active?'\nInactive crew':'');
    }
    model.phases.forEach(p=>p.crews.sort((a,b)=>a.label.localeCompare(b.label)));
  }
  function foremanGroups(employees,timecards,day){
    const M=root.CrewModel,byBU=new Map(),ambiguous=new Set(),groups=new Map(),seen=new Set();
    for(const employee of employees){const key=guid(employee.BU_Employee_ID);if(byBU.has(key))ambiguous.add(key);byBU.set(key,employee);}
    for(const card of timecards){
      const key=guid(card.Timecard_ID),date=M.date(card.Work_Date),foreman=guid(card.Foreman_ID);
      if(!key||seen.has(key)||truth(card.IsDeleted)||date==null||date<day-13||date>day||!foreman||ambiguous.has(foreman))continue;
      seen.add(key);
      let payload;try{payload=JSON.parse(card.Multi_Line||'{"members":[]}');}catch{throw new Error('Employee membership data needs a successful sync.');}
      const members=Array.isArray(payload)?payload:payload?.members;
      if(!Array.isArray(members)||members.some(v=>typeof v!=='string'))throw new Error('Employee membership data is incomplete.');
      const owner=byBU.get(foreman);if(!owner)continue; // Keep caller-scoped employee visibility.
      let group=groups.get(foreman);if(!group){group={key:foreman,foreman:owner,members:new Map(),dates:new Set(),jobs:new Set()};groups.set(foreman,group);}
      group.dates.add(date);if(card.Job_Code)group.jobs.add(String(card.Job_Code));
      for(const bu of new Set(members.map(guid))){
        const employee=byBU.get(bu);if(!employee||ambiguous.has(bu)||bu===foreman)continue;
        let member=group.members.get(bu);if(!member){member={employee,dates:new Set(),jobs:new Set()};group.members.set(bu,member);}
        member.dates.add(date);if(card.Job_Code)member.jobs.add(String(card.Job_Code));
      }
    }
    return [...groups.values()].sort((a,b)=>String(a.foreman.EmployeeName).localeCompare(String(b.foreman.EmployeeName)));
  }
  function crewStaffing(employees,timecards,crewId,day){
    const M=root.CrewModel,members=employees.filter(e=>M.id(e.Crew)===crewId).sort((a,b)=>String(a.EmployeeName).localeCompare(String(b.EmployeeName))),foremen=members.filter(e=>M.norm(e.Labor_Type)==='foreman');
    const byBU=new Map(),ambiguous=new Set();for(const e of employees){const key=guid(e.BU_Employee_ID);if(byBU.has(key))ambiguous.add(key);byBU.set(key,e);}
    const owners=new Set(foremen.map(e=>guid(e.BU_Employee_ID)).filter(key=>key&&!ambiguous.has(key))),seen=new Set(),recent=[];
    for(const card of timecards){const key=guid(card.Timecard_ID),date=M.date(card.Work_Date);if(!key||seen.has(key)||truth(card.IsDeleted)||date==null||date<day-6||date>day||!owners.has(guid(card.Foreman_ID)))continue;seen.add(key);recent.push({date,phaseId:M.id(card.Subdivision1),jobCode:String(card.Job_Code||'')});}
    const latest=recent.length?Math.max(...recent.map(r=>r.date)):null,jobs=new Map();for(const row of recent.filter(r=>r.date===latest))jobs.set(row.phaseId+':'+row.jobCode,row);
    return {members,foremen,latest,jobs:[...jobs.values()]};
  }
  root.CrewEmployeesModel=Object.freeze({assignBadges,foremanGroups,crewStaffing,label,truth,guid});
})(window);
