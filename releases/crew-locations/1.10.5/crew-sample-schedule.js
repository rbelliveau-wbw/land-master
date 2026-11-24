/* Fictional records and in-memory date edits for the sample schedule. */
(function (root) {
  'use strict';
  const permissions = Object.freeze({milestones:true, tasks:true});
  const sampleModels = new WeakSet();

  function create(day) {
    const M = root.CrewModel;
    const projects = [
      {name:'Sample Cedar Crossing', territory:'North', lots:82, offset:0},
      {name:'Sample Willow Ridge', territory:'South', lots:64, offset:24}
    ];
    const stages = [
      ['Rough Cut', 3, 24, 5, 27],
      ['Sewer', 20, 46, 23, 50],
      ['Water', 39, 62, 42, 66],
      ['Storm Drain', 58, 81, 61, 86],
      ['Road Prep', 77, 99, 80, 105],
      ['Dry Utilities', 93, 120, 97, 127],
      ['Punch List', 118, 136, 124, 141],
      ['Closeout', 136, 148, 142, 153]
    ];
    const data = {subdivisions:[], milestones:[], tasks:[], crews:[], assignments:[]};
    for (const [index, project] of projects.entries()) {
      const number = index + 1;
      const phaseId = 'sample-phase-' + number;
      const crewId = 'sample-crew-' + number;
      data.subdivisions.push({ID:phaseId, Subdivision_Name:project.name, Subdivision_Code:'SAMPLE-0'+number,
        Phase:'1', Project:{ID:'sample-project-'+number, display_value:project.name},
        Territory:project.territory, Status:'Active', Projects_Status:'Rough Cut', Total_Lots:project.lots});
      data.crews.push({ID:crewId, Crew_Code:'Crew '+number, Badge_Color:index===0?'#386f99':'#398375', Active:true});
      data.assignments.push({Subdivision1:phaseId, Crew:crewId, Assignment_Date:M.iso(day)});
      for (const [stage, start, end, taskStart, taskEnd] of stages) {
        const record = {ID:phaseId+'-'+stage.replaceAll(' ','-'), Subdivision1:phaseId, Source_System:'Sample Schedule'};
        const date = offset => M.iso(day + project.offset + offset);
        data.milestones.push({...record, Milestone_Name:stage, Start_Date:date(start), End_Date:date(end)});
        data.tasks.push({...record, Stage_Key:stage, Start_Date:date(taskStart), End_Date:date(taskEnd),
          Source_Record_ID:record.ID, Write_Enabled:true});
      }
    }
    const model = M.normalize(data);
    M.assignments(model, day);
    sampleModels.add(model);
    return model;
  }

  function apply(model, phase, changes, day, origin) {
    if (!sampleModels.has(model) || model.byId.get(phase.id) !== phase) throw Error('Choose a phase in the sample schedule.');
    const M = root.CrewModel;
    const updates = changes.filter(change => Object.keys(change.fields).length).map(change => {
      const record = model.records.get(change.type+':'+change.recordId);
      if (record?.phaseId !== phase.id) throw Error('This sample record is unavailable.');
      const patch = Object.fromEntries(Object.entries(change.fields).map(([field, value]) => [field, M.date(value.after)]));
      M.validate(phase, record, patch, permissions, day, origin);
      return {record, patch};
    });
    for (const {record, patch} of updates) Object.assign(record, patch);
    return updates.length;
  }

  root.CrewSampleSchedule = Object.freeze({create, apply, permissions});
})(window);
