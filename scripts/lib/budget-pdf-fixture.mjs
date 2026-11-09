export function budgetPdfFixture(){
  const budgetId='4410926000001671002',labels=['(1) Labor','(2) Materials','(3) Equipment','(4) Subcontractor','(5) Other'];
  const categories=Array.from({length:21},(_,i)=>({ID:String(4410926000006000001n+BigInt(i)),Budget:{ID:budgetId,display_value:'Phase 01'},Category_Code:String(100+i),Budget_Category_Name:'Category '+i,Deparment:'Construction',Budget_Total:i===0?'1,234,567.89':String(i*100.125)}));
  const rows=[],elementRows=[],itemIds=[],items=[];
  for(let i=0;i<227;i++){
    const cat=categories[i%20],id=String(4410926000008000001n+BigInt(i)),credit=i===1?-100.1234:i===2?0:i+0.1234;
    itemIds.push(id);items.push({ID:id,Budget_Category:{ID:cat.ID,display_value:cat.Budget_Category_Name}});
    const values=['North Austin','Large Budget Fixture - Phase 01',cat.Deparment,cat.Category_Code,cat.Budget_Category_Name,String(i).padStart(6,'0'),i===0?'Curb & Gutter - Jos\u00e9 <Literal>':'Item '+i,'LF',i===0?null:0,0,0,credit,i===1?-10.4321:0,0,0,i===0?'Saved note\nSecond line':i===226?'Long note '.repeat(1500):'Note '+i];
    rows.push(values);
    labels.forEach((label,element)=>elementRows.push(values.slice(0,7).concat([label,element===0?null:0,0,element===0?credit:0,element===0&&i===1?-10.4321:0,element===0?credit+(i===1?-10.4321:0):0,null,element===0?0:null],[values[15]])));
  }
  return {budgetId,rows,elementRows,itemIds,structure:{categories,items},meta:{contract:'budget-snapshot-meta-v1',ok:true,budgetId,summary:{budgetLabel:'Large Budget Fixture - Phase 01',subdivisionCode:'0001',territory:'North Austin',exportedDate:'11/09/2026 12:00 PM',grandFinal:1188716.1234},approvals:[{track:'Construction',role:'CFO',approver:'Approver Example',status:'Pending',respondedDate:'',notes:'Saved approval<br>Second line'},{track:'Development',role:'Manager',approver:'Other Example',status:'Approved',respondedDate:'11/01/2026',notes:null}]}};
}
