// Isolated fixture records. Never loaded by deployable widget code or written to Creator.
export function crewFixture(){
 const phases=[
  {ID:'90071992547409931',Subdivision_Name:'Creekside Hills - Phase 05',Subdivision_Code:'CH05',Phase:'5',Subphase:'',Territory:'Fort Hood',Status:'Active',Projects_Status:'Road Prep',Total_Lots:124,Project:{ID:'90071992547409001'},Project_ID:'80000000000001'},
  {ID:'90071992547409932',Subdivision_Name:'Turnbo Ranch - Phase 01A',Subdivision_Code:'TR01A',Phase:'1',Subphase:'A',Territory:'Waco',Status:'Active',Projects_Status:'Utility Installation',Total_Lots:85,Project:{ID:'90071992547409002'},Project_ID:'80000000000002'},
  {ID:'90071992547409933',Subdivision_Name:'Turnbo Ranch - Phase 01B',Subdivision_Code:'TR01B',Phase:'1',Subphase:'B',Territory:'Waco',Status:'Active',Projects_Status:'',Total_Lots:91,Project:{ID:'90071992547409002'},Project_ID:'80000000000003'},
  {ID:'90071992547409934',Subdivision_Name:'Closed Phase',Subdivision_Code:'CP02',Phase:'2',Territory:'Fort Hood',Status:'Active',Projects_Status:' Sold Out (Prev WFY) ',Total_Lots:72,Project_ID:'80000000000004'},
  {ID:'90071992547409935',Subdivision_Name:'Earlier Work',Subdivision_Code:'EW01',Phase:'1',Territory:'Temple',Status:'Active',Projects_Status:'',Total_Lots:18,Project_ID:'80000000000005'},
  {ID:'90071992547409936',Subdivision_Name:'Later Development',Subdivision_Code:'LD01',Phase:'1',Territory:'Temple',Status:'Active',Projects_Status:'',Total_Lots:31,Project_ID:'80000000000006'}
 ];
 let count=100;const milestones=[],tasks=[];
 function record(p,stage,start,end,type='M'){const r={ID:'9007199254740'+String(++count),Subdivision1:{ID:phases[p].ID},Milestone_Name:stage,Stage_Key:stage,Start_Date:start,End_Date:end,Milestone_ID:'80000000'+count,Project_ID:phases[p].Project_ID,Push_Update:false,Source_System:'ISOLATED FIXTURE',Source_Record_ID:'fixture-'+count,Write_Enabled:true};(type==='M'?milestones:tasks).push(r);return r;}
 record(0,'Rough Cut','08/01/2026','09/01/2026');record(0,'Road Prep','10/25/2026','11/09/2026');record(0,'Dry Utilities','11/15/2026','01/20/2027');record(0,'Closeout','','');
 record(0,'Road Prep','10/22/2026','11/09/2026','T');record(0,'Dry Utilities','11/10/2026','01/20/2027','T');record(0,'Closeout','','','T');
 const stages=['Entitlements','Engineering Design','Municipal Review','Pre-Construction','Rough Cut','Sewer','Water','Storm Drain','Road Prep','Dry Utilities','Punch List','Closeout'];
 const dates=[['10/23/2026','10/26/2026'],['10/26/2026','10/29/2026'],['10/29/2026','11/01/2026'],['11/01/2026','11/05/2026'],['11/05/2026','12/01/2026'],['11/20/2026','12/10/2026'],['12/10/2026','01/10/2027'],['01/10/2027','02/15/2027'],['02/01/2027','03/01/2027'],['03/01/2027','03/15/2027'],['03/01/2027','03/20/2027'],['03/20/2027','04/01/2027']];
 stages.forEach((s,i)=>{record(1,s,...dates[i]);record(1,s,...dates[i],'T');});
 record(2,'Rough Cut','05/01/2027','05/20/2027');record(2,'Sewer','','06/10/2027');record(3,'Rough Cut','11/01/2026','12/01/2026');record(4,'Rough Cut','06/01/2025','07/01/2025');record(5,'Rough Cut','12/01/2027','01/01/2028');
 const crews=[{ID:'90071992547408001',Crew_Code:'U2',Badge_Color:'#386f99',Active:true},{ID:'90071992547408002',Crew_Code:'U1',Badge_Color:'#398375',Active:true}];
 const assignments=[{ID:'90071992547407001',Subdivision1:{ID:phases[0].ID},Crew:{ID:crews[0].ID},Assignment_Date:'10/14/2026'},
 {ID:'90071992547407002',Subdivision1:{ID:phases[0].ID},Crew:{ID:crews[0].ID},Assignment_Date:'10/20/2026'},
 {ID:'90071992547407003',Subdivision1:{ID:phases[1].ID},Crew:{ID:crews[0].ID},Assignment_Date:'10/21/2026'},
 {ID:'90071992547407004',Subdivision1:{ID:phases[1].ID},Crew:{ID:crews[1].ID},Assignment_Date:'10/20/2026'},
 {ID:'90071992547407005',Subdivision1:{ID:phases[4].ID},Crew:{ID:crews[1].ID},Assignment_Date:'10/20/2026'},
 {ID:'90071992547407006',Subdivision1:{ID:phases[2].ID},Crew:{ID:crews[1].ID},Assignment_Date:'10/13/2026'}];
 return {subdivisions:phases,milestones,tasks,crews,assignments};
}

// Large desktop-only preview. Every row is synthetic and stays in the harness.
export function crewDesktopFixture(count=38){
 const original=crewFixture(),base=original.subdivisions[1],subdivisions=[],milestones=[],tasks=[],assignments=[];
 for(let i=0;i<count;i++){
  const phaseId='990719925474'+String(i+1).padStart(4,'0'),code='DQ'+String(i+1).padStart(2,'0');
  subdivisions.push({...base,ID:phaseId,Subdivision_Name:(i%3===0?'Long Meadow Crossing at the River':'Desktop QA Development')+' - Phase '+String(i+1).padStart(2,'0'),Subdivision_Code:code,Phase:String(i+1),Subphase:'',Project_ID:'8800000000'+String(i).padStart(4,'0'),Territory:i%2?'Fort Hood':'Waco'});
  for(const [type,rows,target] of [['M',original.milestones,milestones],['T',original.tasks,tasks]])for(const [j,row] of rows.filter(r=>r.Subdivision1.ID===base.ID).entries())target.push({...row,ID:(type==='M'?'9807199254':'9707199254')+String(i*100+j).padStart(6,'0'),Subdivision1:{ID:phaseId},Project_ID:subdivisions.at(-1).Project_ID,Source_Record_ID:'desktop-'+type+'-'+i+'-'+j});
  assignments.push({ID:'960719925474'+String(i).padStart(4,'0'),Subdivision1:{ID:phaseId},Crew:{ID:original.crews[i%2].ID},Assignment_Date:'10/21/2026'});
 }
 return {subdivisions,milestones,tasks,crews:original.crews,assignments};
}

// Management has deliberately native-shaped strings, lookups and checkbox data.
// Fixture records are private to one served document and never enter a release.
export function crewManagementFixture(){
 const data=crewFixture();
 data.crews=[
  {ID:'90071992547408001',Crew_Code:'U2',Crew_Name:'Utility Two',Badge_Color:'#ffffff',Active:'true',Source_System:'MANUAL_QA',Source_Record_ID:'fixture-crew-u2'},
  {ID:'90071992547408002',Crew_Code:'U1',Crew_Name:'Utility One',Badge_Color:'#398375',Active:true,Source_System:'MANUAL_QA',Source_Record_ID:'fixture-crew-u1'},
  {ID:'90071992547408003',Crew_Code:'RC',Crew_Name:'Road Crew',Badge_Color:'#8054c7',Active:'false',Source_System:'MANUAL_WIDGET',Source_Record_ID:'fixture-crew-rc'},
  {ID:'90071992547408004',Crew_Code:'IMP',Crew_Name:'Imported Crew',Badge_Color:'#a16c2e',Active:true,Source_System:'EXTERNAL',Source_Record_ID:'upstream-crew-imp'}
 ];
 data.assignments.forEach((row,index)=>Object.assign(row,{Crew:{...row.Crew,display_value:data.crews.find(crew=>crew.ID===row.Crew.ID).Crew_Code},Subdivision1:{...row.Subdivision1,display_value:data.subdivisions.find(phase=>phase.ID===row.Subdivision1.ID).Subdivision_Name},Source_System:'MANUAL_QA',Source_Record_ID:'fixture-assignment-'+index,Source_Key:'MANUAL_QA:fixture-assignment-'+index}));
 data.assignments.push(
  {ID:'90071992547407011',Subdivision1:{ID:data.subdivisions[1].ID,display_value:data.subdivisions[1].Subdivision_Name},Crew:{ID:data.crews[0].ID,display_value:'U2'},Assignment_Date:'11/04/2026',Source_System:'MANUAL_WIDGET',Source_Record_ID:'fixture-future-1',Source_Key:'MANUAL_WIDGET:fixture-future-1'},
  {ID:'90071992547407012',Subdivision1:{ID:data.subdivisions[2].ID,display_value:data.subdivisions[2].Subdivision_Name},Crew:{ID:data.crews[0].ID,display_value:'U2'},Assignment_Date:'12/01/2026',Source_System:'EXTERNAL',Source_Record_ID:'fixture-imported-1',Source_Key:'EXTERNAL:fixture-imported-1'},
  {ID:'90071992547407013',Subdivision1:{ID:data.subdivisions[3].ID,display_value:data.subdivisions[3].Subdivision_Name},Crew:{ID:data.crews[1].ID,display_value:'U1'},Assignment_Date:'10/19/2026',Source_System:'MANUAL_QA',Source_Record_ID:'fixture-sold-1',Source_Key:'MANUAL_QA:fixture-sold-1'}
 );
 return data;
}
