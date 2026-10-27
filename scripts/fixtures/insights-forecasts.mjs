export function forecastFixture(){
  const subdivisions=[{ID:'900000000000000001',Subdivision_Name:'Alta Vista - Phase 1',Project:{ID:'900000000000000011',display_value:'Alta Vista'},Territory:'Fort Hood',Projects_Status:'Active',Total_Lots:'100',Lots_Sold:'70'},{ID:'900000000000000002',Subdivision_Name:'Meadow Creek - Phase 1',Project:{ID:'900000000000000012'},Territory:'Austin',Projects_Status:'Complete',Total_Lots:'50',Lots_Sold:'50'},{ID:'900000000000000003',Subdivision_Name:'No Forecast - Phase 1',Project:{ID:'900000000000000013'},Territory:'Fort Hood',Projects_Status:'Planning',Total_Lots:'90',Lots_Sold:'0'}];
  const projects=[{ID:'900000000000000011',Project_Name:'Alta Vista'},{ID:'900000000000000012',Project_Name:'Meadow Creek'},{ID:'900000000000000013',Project_Name:'No Forecast'}];
  const builders=[{ID:'900000000000000021',Builder_Name:'Adams Homes',Type1:'Builder'},{ID:'900000000000000022',Builder_Name:'D.R. Horton',Type1:'Builder'}];
  const years=[],months=[],names=['February','March','April','May','June','July','August','September','October','November','December','January'];
  for(const year of [2026,2027,2028])for(const [s,b]of [[0,0],[0,1],[1,0]]){
    const parentId=`900000000000${year}${s}${b}`;
    years.push({ID:parentId,Subdivision1:{ID:subdivisions[s].ID},Builder1:{ID:builders[b].ID},Forecast_Year:String(year),Status:'Builder'});
    for(let i=0;i<12;i++)months.push({ID:parentId+String(i).padStart(2,'0'),Forecast_Year2:{ID:parentId},Subdivision1:{ID:subdivisions[s].ID},Builder1:{ID:builders[b].ID},Forecast_Year:String(year),Forecast_Month:names[i],Forecast_Start_Date:`${i===11?year+1:year}-${String(i===11?1:i+2).padStart(2,'0')}-01`,Forecasted_Lots:s===0?String(10+b):'0',Actual_Lots:s===0?String(2+b):'0',Scheduled_Lots:'1',Delete_me:false});
  }
  return {subdivisions,projects,builders,years,months};
}
