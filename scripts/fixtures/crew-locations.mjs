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
