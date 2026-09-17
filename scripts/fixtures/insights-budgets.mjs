// Synthetic fixtures only. Never publish in widget assets.
export function budgetFixture(references) {
  const data={...references,budgets:[],categories:[],items:[],modifications:[]};
  references.subdivisions.forEach((sub,i)=>{
    const id=String(1000+i),base=(i+1)*42000;
    data.budgets.push({ID:id,Budget_Name:sub.Subdivision_Name,Subdivision1:{ID:sub.ID},Project:sub.Project.display_value,Phase:'Phase '+(i%3+1),Status:i%5===0?'Active':'Development',Budget_Type:'Development',Const_Budget_Approval_Status:i%4===0?'Pending':'Approved',Development_Budget_Approval_Status:'Approved',Lot_Total_Residential:42+i,Added_Time:'01/10/2026 09:00:00'});
    ['Engineering','Development','Construction'].forEach((dept,k)=>{
      const cid=id+'c'+k,iid=id+'i'+k,final=base*(k+1);
      data.categories.push({ID:cid,Budget:{ID:id},Budget_Category_Name:dept+' costs',Deparment:dept,Budget_Total:final});
      data.items.push({ID:iid,Budget:{ID:id},Budget_Category:{ID:cid},PROJ_Actual:Math.round(final*(i%4===1?1.12:.2+(i%5)*.14)),HCSS_Actuals:Math.round(final*.42)});
      if(k===1)data.modifications.push({ID:id+'m',Budget:{ID:id},Budget_Item:{ID:iid},Budget_Category:{ID:cid},Modification_Type:'Increase',Amount:5000,Status:i%2===0?'Submitted':'Approved'});
    });
  });
  return data;
}
