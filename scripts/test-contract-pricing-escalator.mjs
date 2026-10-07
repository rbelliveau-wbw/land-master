import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ready,drain,ID,SUB,ACCESS,NEW} from './test-contract-sdk-v2-foundation.mjs';

const LOT=(BigInt(NEW)+90n).toString(),PRICE=(BigInt(NEW)+91n).toString(),PROJECT=(BigInt(NEW)+92n).toString(),BUILDER=(BigInt(NEW)+93n).toString();
const clone=value=>JSON.parse(JSON.stringify(value));
const writes=h=>h.calls.filter(call=>['add','update','delete'].includes(call.method));
const pricingWrites=h=>writes(h).filter(call=>call.config.form_name==='Contract_Pricing'||call.config.report_name==='Contract_Pricing_Report');

async function fixture({escalator=null,create=false,missingField=false}={}){
 const h=await ready({realDOM:true}),c=h.c.findContract(ID);
 const parent={Contract_Type:'Lot (Master)',Contract_Name:'Escalator fixture',Status:'New',Owner:[{ID:ACCESS}],Lots1:create?[]:[{ID:LOT}],Project:{ID:PROJECT},Parent_Contract:{},Territory:'Austin',Builder:{ID:BUILDER},Subdivision1:[{ID:SUB}],Number_of_Lots:1,Initial_Takedown:1,Initial_Takedown_Days:30,Second_Closing_Lots:1,Second_Closing_Days:45,Subsequent_Takedown_Lots:1,Subsequent_Takedown_Days:30};
 Object.assign(c,parent);Object.assign(h.reports.All_Contracts1[0],clone(parent));
 const sub={ID:SUB,Subdivision_Name:'Escalator fixture phase',Subdivision_Code:'ESC',Project:{ID:PROJECT},Territory:'Austin',Status:'Active'};
 const lot={ID:LOT,Subdivision:{ID:SUB},Lot_Size:'50',Contract1:{},Contract_Schedule:{},Builder1:{},Base_Price:null,Escalator:null,Close_Date:null,Purchase_Date:null,Status:'Open',Lot:'1',Block:'A'};
 h.reports.All_Subdivisions=[sub];h.reports.All_Active_Lots_Contracts_View=[clone(lot)];
 Object.assign(h.c.S,{projects:[{ID:PROJECT,Project_Name:'Fixture project',Territory:'Austin'}],projectsLoaded:true,optionsLoaded:true,builders:[{ID:BUILDER,Builder_Name:'Fixture builder'}],subdivisions:[clone(sub)],subdivisionsAll:[clone(sub)],lots:[clone(lot)],lpLoading:false,lpLoadError:''});
 const price={ID:PRICE,Contract1:{ID},Lot_Size:'50',Price_per_Ft:'100',Base_Price:'5000',...(!missingField?{Escalator:escalator}:{})};
 h.reports.Contract_Pricing_Report=create?[]:[clone(price)];h.c.S.pricing=clone(h.reports.Contract_Pricing_Report);
 if(create){
  h.c.S.nc={type:'Lot (Master)',project:PROJECT,parent:'',sub:[SUB],wbw:[],builder:BUILDER,name:'Created escalator fixture',territory:'Austin',status:'Proposed',acts:[],seedSource:'default',owners:[ACCESS],lotIds:[LOT],ppf:{'50':'100'},esc:{},totalLots:'1',emPerLot:'',initLots:'1',initDays:'30',secondLots:'1',secondDays:'45',contLots:'1',contDays:'30'};
  h.c.ncOpen();
 }else{
  h.c.clpOpen(ID);await drain();
  assert(h.c.S.clp,'actual Change Lots & Pricing editor mounted');
 }
 return h;
}
function setEsc(h,value){const input=h.c.document.querySelector('.nc-escalator');assert(input,'shared escalator input exists');input.value=value;assert.equal(h.c.ncSetEsc('50',value,input),true);return input;}

{
 const h=await fixture({create:true});
 for(const [raw,value] of [['5','5'],['5.25','5.25'],['0','0'],['0.00','0'],['.5','0.5'],['','']])assert.equal(h.c.ncEscalatorValue(raw,'50'),value);
 const grid=h.c.document.querySelector('.nc-size-head');assert.deepEqual(grid.children.map(child=>child.textContent),['Size','Lots','Price / ft','Escalator %','Base price']);
 const input=setEsc(h,'');assert.equal(input.classList.contains('nc-focus'),false,'optional blank is not highlighted as missing price');
 setEsc(h,'0');assert.equal(input.classList.contains('nc-focus'),false,'explicit zero is valid and optional');
 for(const raw of ['5.001','-1','5%','invalid','1e2','Infinity','5,25']){
  setEsc(h,raw);assert.equal(input.getAttribute('aria-invalid'),'true');
  assert.match(h.c.document.getElementById(h.c.ncEscalatorErrorId('50')).textContent,/up to 2 decimal places/);
  assert.throws(()=>h.c.contractCapturedPricing(h.c.S.nc,[{size:'50'}],ID),/nonnegative percentage/);
 }
 setEsc(h,'5.25');assert.equal(input.getAttribute('aria-invalid'),'false');assert.equal(h.c.document.getElementById(h.c.ncEscalatorErrorId('50')).hidden,true);
}

for(const raw of ['5','5.25','0','']){
 const h=await fixture({create:true});setEsc(h,raw);
 const native=h.api.addRecords;
 h.api.addRecords=async config=>{const out=await native(config);if(config.form_name==='Contract_Pricing'&&raw==='5')h.reports.Contract_Pricing_Report.find(row=>row.ID===out.result[0].data.ID).Escalator='5.00 %';return out;};
 const result=await h.c.ncSubmit([],[]);assert.equal(result.error,null,'actual create verified '+raw);
 const sent=pricingWrites(h);assert.equal(sent.length,1);const data=sent[0].config.payload.data;
 assert.equal(data.Price_per_Ft,'100');assert.equal(data.Base_Price,5000);
 if(raw==='')assert.equal(Object.hasOwn(data,'Escalator'),false,'blank creation omits optional percentage');else assert.equal(data.Escalator,raw,'native create stores percentage points without division by 100');
 assert.equal(h.c.ContractSetupUI.close(),true,'dismiss verified creation result before opening pricing');h.c.clpOpen(NEW);await drain();assert(h.c.S.clp,'new parent can reopen actual pricing editor');
 const reopened=h.c.document.querySelector('.nc-escalator').value;
 assert.equal(h.c.contractPercentComparable(reopened),h.c.contractPercentComparable(raw),'verified native percentage string reopens as entered points');
 assert.equal(reopened.includes('%'),false,'input contains percentage points without the report suffix');
 h.c.clpCancel();
}

{
 const h=await fixture({escalator:'3.00 %'});assert.equal(h.c.document.querySelector('.nc-escalator').value,'3.00');setEsc(h,'5.25');
 const native=h.api.updateRecordById;h.api.updateRecordById=async config=>{const out=await native(config);if(config.report_name==='Contract_Pricing_Report')h.reports.Contract_Pricing_Report[0].Escalator='5.2500%';return out;};
 const result=await h.c.clpSave();assert.equal(result.error,null);assert.equal(pricingWrites(h).length,1);assert.deepEqual(pricingWrites(h)[0].config.payload.data,{Escalator:'5.25'},'changing only percentage makes one native Escalator update');
 h.c.clpOpen(ID);await drain();assert.equal(h.c.S.nc.esc['50'],'5.2500');assert.equal(h.c.document.querySelector('.nc-escalator').value,'5.2500');h.c.clpCancel();
}

for(const [previous,next,payload] of [[null,'0','0'],[0,'',''],['5.25%','','']]){
 const h=await fixture({escalator:previous});setEsc(h,next);
 const native=h.api.updateRecordById;h.api.updateRecordById=async config=>{const out=await native(config);if(config.report_name==='Contract_Pricing_Report'&&payload==='')h.reports.Contract_Pricing_Report[0].Escalator=null;return out;};
 const result=await h.c.clpSave();assert.equal(result.error,null);assert.equal(pricingWrites(h).length,1);assert.deepEqual(pricingWrites(h)[0].config.payload.data,{Escalator:payload},'blank and zero differ in actual update');
 h.c.clpOpen(ID);await drain();assert.equal(h.c.document.querySelector('.nc-escalator').value,next);h.c.clpCancel();
}

for(const escalator of [null,0,'5.00%','5.555%']){
 const h=await fixture({escalator});const result=await h.c.clpSave();assert.equal(result.error,null);assert.equal(writes(h).length,0,'unchanged loaded percentage does not rewrite pricing '+escalator);
}
{
 const h=await fixture({escalator:'5.00%'});setEsc(h,'5');const result=await h.c.clpSave();assert.equal(result.error,null);assert.equal(writes(h).length,0,'semantic trailing-zero equivalence avoids native writes');
}
{
 const h=await fixture({escalator:'5.555%'});h.reports.Contract_Pricing_Report[0].Escalator='7.125%';h.c.ncSetPpf('50','150');
 const result=await h.c.clpSave();assert.equal(result.error,null);assert.equal(pricingWrites(h).length,1);assert.deepEqual(pricingWrites(h)[0].config.payload.data,{Price_per_Ft:'150',Base_Price:7500},'unrelated price edit omits untouched native percentage');assert.equal(h.reports.Contract_Pricing_Report[0].Escalator,'7.125%','fresh backend percentage survives unrelated price save');
}

for(const create of [true,false])for(const raw of ['5.001','-1','bad']){
 const h=await fixture({create,escalator:3});setEsc(h,raw);const result=await(create?h.c.ncSubmit([],[]):h.c.clpSave());assert.equal(result,false);assert.equal(writes(h).length,0,'invalid percentage stopped before all native mutations');assert.match(h.node('banners').textContent,/nonnegative percentage/);
}
for(const raw of ['5.000','5%','$5']){
 const h=await fixture({escalator:5});setEsc(h,raw);assert.equal(h.c.document.querySelector('.nc-escalator').getAttribute('aria-invalid'),'true','edited text must obey strict format even when numerically equivalent');
 assert.equal(await h.c.clpSave(),false);assert.equal(writes(h).length,0,'equivalent invalid input still stops before native writes');
}
{
 const h=await fixture({missingField:true});setEsc(h,'5');const result=await h.c.clpSave();assert(result.error);assert.equal(writes(h).length,0,'missing fresh Escalator fails before the native update');
}
for(const missing of [false,true]){
 const h=await fixture({escalator:3});setEsc(h,'5');const native=h.api.updateRecordById;
 h.api.updateRecordById=async config=>{const out=await native(config);if(config.report_name==='Contract_Pricing_Report'){if(missing)delete h.reports.Contract_Pricing_Report[0].Escalator;else h.reports.Contract_Pricing_Report[0].Escalator='0.05%';}return out;};
 const result=await h.c.clpSave();assert(result.error,'wrong/missing fresh percentage cannot be verified');assert.equal(h.c.contractHasReviews(),true);assert.equal(pricingWrites(h).length,1);await h.c.clpSave();assert.equal(pricingWrites(h).length,1,'uncertain percentage update is never replayed');
}

{
 const h=await fixture({escalator:'5.25%'}),c=h.c.findContract(ID),lot=h.c.S.lots[0],price={Lot_Size:50,Base_Price:5000,Escalator:5.25};
 assert.equal(h.c.lotMissingWrites(lot,c,price,BUILDER,'999').Escalator,5.25,'eligible null Lot receives percentage points');
 for(const value of [0,3,'7.25%'])assert.equal(Object.hasOwn(h.c.lotMissingWrites({...lot,Escalator:value},c,price,BUILDER,'999'),'Escalator'),false,'populated or explicit zero Lot rate preserved');
 for(const Status of ['Sold','Contracted','Scheduled'])assert.deepEqual(clone(h.c.lotMissingWrites({...lot,Status},c,price,BUILDER,'999')),{},'protected lifecycle Lot receives no fields');
 const preview=h.c.lotCompletionPreview(c,h.c.S.pricing,h.c.S.lots,[]);assert.match(h.c.lotCompletionSummaryHtml(preview),/5\.25% escalator/);
 const backend=fs.readFileSync(new URL('../creator/functions/Complete_Lot_Contract.dg',import.meta.url),'utf8');
 assert.match(backend,/if\(lotRow\.Escalator == null && pr\.Escalator != null\)/,'existing backend requires a null Lot percentage');
 assert.match(backend,/update Lots\[[^\r\n]*\(Escalator == null\)\]\s*\[\s*Escalator=pr\.Escalator/,'backend writes only a null rate and copies native points without scaling');
}
console.log('PASS actual Contract Pricing Escalator: shared optional UI, native create/update/reopen, 5 means 5%, 2decimal validation before writes, blank/zero distinction, Escalator-only saves, untouched legacy/fresh preservation, formatted percentage verification, missing/wrong readback quarantine/no replay, completion preview and existing null-only Lot transfer.');

export {fixture,setEsc,LOT,PRICE,PROJECT,BUILDER};
