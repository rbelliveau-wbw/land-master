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
  root.CrewEmployeesModel=Object.freeze({assignBadges,label,truth,guid});
})(window);
