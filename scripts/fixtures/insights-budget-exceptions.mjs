/* Native Creator-shaped, disposable fixtures. Never included in widget releases. */
export function budgetExceptionsFixture() {
  let sequence = 9000000000000000000n;
  const next = () => String(++sequence);
  const data = { projects:[{ID:'8000000000000000001',Project_Name:'Example Project'}],subdivisions:[],budgets:[],categories:[],items:[],approvals:[] };
  const keys = {};
  function phase(name, { final=null,gp=0,hcss=0,status='Not Sent',owner='Example Owner' }={}) {
    const sid=next(),bid=next(),cid=next(),iid=next();
    data.subdivisions.push({ID:sid,Subdivision_Name:name,Project:{ID:data.projects[0].ID,display_value:'Example Project'},Territory:'Example Territory'});
    data.budgets.push({ID:bid,Budget_Name:name,Subdivision1:{ID:sid,display_value:name},Project:'Example Project',Phase:'Phase 01',Status:'Active',Budget_Type:'Development',Budget_Owner:{ID:next(),display_value:owner},Archived:false,Added_Time:'11/01/2026 09:00:00',Const_Budget_Approval_Status:status,Development_Budget_Approval_Status:status});
    data.categories.push({ID:cid,Budget:{ID:bid,display_value:name},Budget_Category_Name:'Streets',Deparment:'Construction',Category_Code:'3000',Budget_Total:final,Template_Item:false});
    data.items.push({ID:iid,Budget:{ID:bid},Budget_Category:{ID:cid,display_value:'Streets'},Item_Name:'Street Infrastructure',Budget_Code:name+'-3100',Cost_Code:'3100',Budget_Ttl:final,PROJ_Actual:gp,HCSS_Actuals:hcss,Template_Item:false});
    return {sid,bid,cid,iid};
  }
  keys.missing=phase('No Final',{final:0,gp:'$1,864.20',hcss:'2,031.80'});
  keys.persisted=phase('Persisted Final',{final:100,gp:120,hcss:80,status:'Pending'});
  keys.zero=phase('Approved Zero',{final:0,gp:10,hcss:2,status:'Approved'});
  keys.hcss=phase('HCSS Only',{final:'',gp:0,hcss:50});
  keys.prior=phase('Prior Approved',{final:100,gp:110,hcss:105,status:'Approved'});
  const oldBudget=data.budgets.find(row=>row.ID===keys.prior.bid),newBid=next(),newCid=next(),newIid=next();
  oldBudget.Added_Time='10/01/2026';
  data.budgets.push({...oldBudget,ID:newBid,Added_Time:'11/02/2026',Const_Budget_Approval_Status:'Pending'});
  data.categories.push({...data.categories.find(row=>row.ID===keys.prior.cid),ID:newCid,Budget:{ID:newBid},Budget_Total:0});
  data.items.push({...data.items.find(row=>row.ID===keys.prior.iid),ID:newIid,Budget:{ID:newBid},Budget_Category:{ID:newCid},Budget_Code:'Prior Approved Revision-3100',Budget_Ttl:0,PROJ_Actual:120,HCSS_Actuals:118});
  keys.prior.latestBid=newBid;
  keys.unbudgeted=phase('Unbudgeted Line',{final:200,gp:50,hcss:40,status:'Approved'});
  data.items.push({ID:next(),Budget:{ID:keys.unbudgeted.bid},Budget_Category:{ID:keys.unbudgeted.cid},Item_Name:'Water Extension',Budget_Code:'Water-3200',Cost_Code:'3200',Budget_Ttl:'',PROJ_Actual:20,HCSS_Actuals:18,Template_Item:false});
  keys.partial=phase('Partial Final',{final:100,gp:120,hcss:110,status:'Approved'});
  const partialBudget=data.budgets.find(row=>row.ID===keys.partial.bid);partialBudget.Development_Budget_Approval_Status='Pending';
  const missingCategory=next(),unusedCategory=next();
  data.categories.push({ID:missingCategory,Budget:{ID:keys.partial.bid},Budget_Category_Name:'Engineering',Deparment:'Engineering',Category_Code:'1000',Budget_Total:'',Template_Item:false});
  data.categories.push({ID:unusedCategory,Budget:{ID:keys.partial.bid},Budget_Category_Name:'Development',Deparment:'Development',Category_Code:'2000',Budget_Total:1000,Template_Item:false});
  data.items.push({ID:next(),Budget:{ID:keys.partial.bid},Budget_Category:{ID:missingCategory},Item_Name:'Engineering',Budget_Code:'Partial Engineering-1100',Cost_Code:'1100',Budget_Ttl:'',PROJ_Actual:0,HCSS_Actuals:0,Template_Item:false});
  data.items.push({ID:next(),Budget:{ID:keys.partial.bid},Budget_Category:{ID:unusedCategory},Item_Name:'Land Development',Budget_Code:'Partial Development-2100',Cost_Code:'2100',Budget_Ttl:1000,PROJ_Actual:0,HCSS_Actuals:0,Template_Item:false});
  const approval=(bid,values={})=>data.approvals.push({ID:next(),Budget:{ID:bid},Type1:'Construction',Status:'Pending',Sent_Date:'10/01/2026',Budget_Modification:'',Proforma:'',...values});
  approval(keys.persisted.bid);
  approval(newBid,{Sent_Date:'10/25/2026'});
  approval(keys.persisted.bid,{Type1:'Modification',Sent_Date:'01/01/2026',Budget_Modification:{ID:next()}});
  approval(keys.persisted.bid,{Proforma:{ID:next()},Sent_Date:'01/01/2026'});
  approval(keys.zero.bid,{Sent_Date:'01/01/2026'});
  approval(keys.partial.bid,{Type1:'Development',Sent_Date:''});
  return {data,keys};
}
