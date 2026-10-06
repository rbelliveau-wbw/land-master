import assert from 'node:assert/strict';
import {ready,drain,deferred,ID,SUB,ACCESS,NEW} from './test-contract-sdk-v2-foundation.mjs';

const LOT1=(BigInt(NEW)+90n).toString(),LOT2=(BigInt(NEW)+91n).toString(),PRICE=(BigInt(NEW)+92n).toString(),PROJECT=(BigInt(NEW)+93n).toString(),BUILDER=(BigInt(NEW)+94n).toString();
const clone=value=>JSON.parse(JSON.stringify(value));
async function fixture({cached=0,price='1300',screen=null}={}){
 const h=await ready({realDOM:true}),c=h.c.findContract(ID),gate=deferred();
 Object.assign(c,{Contract_Type:'Lot (Master)',Contract_Name:'Pricing loading fixture',Status:'New',Owner:[{ID:ACCESS}],Lots1:[{ID:LOT1},{ID:LOT2}],Project:{ID:PROJECT},Parent_Contract:{},Territory:'Houston',Builder:{ID:BUILDER},Subdivision1:[{ID:SUB}],Number_of_Lots:2,Initial_Takedown:1,Initial_Takedown_Days:30,Second_Closing_Lots:1,Second_Closing_Days:45,Subsequent_Takedown_Lots:1,Subsequent_Takedown_Days:60});
 h.reports.All_Contracts1[0]=clone(c);
 const lots=[LOT1,LOT2].map((id,index)=>({ID:id,Subdivision:{ID:SUB},Lot_Size:'50',Status:'Open',Lot_Number:String(index+1),Block:'1',Contract1:{}}));
 const pricing={ID:PRICE,Contract1:{ID},Lot_Size:'50',Price_per_Ft:price,Base_Price:65000,Escalator:'5.25%'};
 h.reports.All_Active_Lots_Contracts_View=clone(lots);h.reports.Contract_Pricing_Report=[clone(pricing)];
 Object.assign(h.c.S,{lots:clone(lots.slice(0,cached)),pricing:[clone(pricing)],optionsLoaded:true,projectsLoaded:true,projects:[{ID:PROJECT,Project_Name:'Fixture project',Territory:'Houston'}],builders:[{ID:BUILDER,Builder_Name:'Fixture builder'}],subdivisions:[{ID:SUB,Subdivision_Name:'Fixture phase',Project:{ID:PROJECT},Territory:'Houston'}],lpLoading:false,lpLoadError:''});
 h.reports.All_Subdivisions=clone(h.c.S.subdivisions);h.c.S.subdivisionsAll=clone(h.c.S.subdivisions);
 if(screen){Object.assign(h.c.S,screen);h.c.renderAll();h.node('view').scrollTop=180;const inner=h.c.document.querySelector(screen.view==='detail'?'.detailwrap':screen.mode==='board'?'.boardwrap':'.tscroll');if(inner)inner.scrollTop=120;}
 const native=h.api.getRecords;let blocked=false;
 h.api.getRecords=config=>{if(config.report_name===h.c.CFG.reports.lots&&!blocked){blocked=true;return gate.promise.then(()=>native(config));}return native(config);};
 h.c.clpOpen(ID);
 return {h,gate,lots};
}
const section=h=>h.c.document.querySelector('#clp_body [data-seq="pricing"]');
const writes=h=>h.calls.filter(call=>['add','update','delete'].includes(call.method));

for(const cached of [0,1]){
 const {h,gate}=await fixture({cached}),initial=section(h),modal=initial.closest('.modal'),paints=modal.htmlWrites;
 assert.equal(initial.classList.contains('seq-arm'),false,'first paint cannot mark unresolved pricing yellow');
 assert.equal(initial.classList.contains('done'),false,'partial cached sizes cannot mark all pricing complete');
 assert.equal(initial.getAttribute('aria-busy'),'true');assert.match(initial.textContent,/Loading lot pricing/);
 assert.equal(initial.querySelector('.nc-price-per-ft'),null,'unresolved sizes are not shown as empty price fields');
 assert.doesNotMatch(initial.textContent,/carry no Lot Size/,'pending metadata is not a missing-size validation error');
 await drain();assert.equal(section(h).classList.contains('seq-arm'),false,'neutral state lasts for actual request, not a timer');
 gate.resolve();await drain();const loaded=section(h);
 assert.equal(loaded.closest('.modal'),modal,'load patches the mounted modal');assert.equal(modal.htmlWrites,paints,'load does not replay modal entrance');
 assert.equal(loaded.classList.contains('done'),true);assert.equal(loaded.classList.contains('seq-arm'),false);assert.equal(loaded.hasAttribute('aria-busy'),false);
 assert.equal(loaded.querySelector('.nc-price-per-ft').value,'$1,300.00');assert.equal(loaded.querySelector('.nc-escalator').value,'5.25');assert.equal(loaded.querySelector('.cnt').textContent,'2 lots');assert.equal(writes(h).length,0);
}
{
 const {h,gate}=await fixture({cached:2});assert.equal(section(h).classList.contains('done'),true,'fully cached pricing appears immediately during background refresh');assert.doesNotMatch(section(h).textContent,/Loading/);
 h.c.ncSetPpf('50','1400');gate.resolve();await drain();assert.equal(section(h).querySelector('.nc-price-per-ft').value,'$1,400.00','refresh preserves an entered price');assert.equal(writes(h).length,0);
}
{
 const {h,gate}=await fixture({price:''});assert.equal(section(h).classList.contains('seq-arm'),false);gate.resolve();await drain();assert.equal(section(h).classList.contains('seq-arm'),true,'genuinely missing saved price is highlighted after complete data');assert.equal(section(h).classList.contains('done'),false);
 h.c.ncSetPpf('50','1300');assert.equal(section(h).classList.contains('seq-arm'),false);assert.equal(section(h).classList.contains('done'),true);
}
{
 const {h,gate}=await fixture();await drain();gate.reject(new Error('Fixture lot read failed'));await drain();
 assert.equal(section(h).classList.contains('seq-arm'),false,'failed metadata read is not missing user input');assert.equal(section(h).hasAttribute('aria-busy'),false);assert.match(section(h).textContent,/Could not load complete lots/);assert.doesNotMatch(section(h).textContent,/Loading lot pricing|carry no Lot Size/);assert.equal(writes(h).length,0);
}
{
 const {h,gate}=await fixture();await drain();h.c.lpOpen();await drain();assert(h.c.document.getElementById('lp_body'));gate.resolve();await drain();assert(h.c.document.getElementById('lp_body'),'late editor load cannot replace the opened picker');assert.equal(h.c.document.getElementById('clp_body'),null);
}
{
 const {h,gate}=await fixture();await drain();h.c.clpCancel();gate.resolve();await drain();assert.equal(h.c.S.clp,null);assert.equal(h.c.document.getElementById('clp_body'),null,'late load cannot reopen a cancelled editor');assert.equal(writes(h).length,0);
}
console.log('PASS actual Lots & Pricing loading: cold/partial first paint stays neutral, saved values settle in mounted modal, cached values/edits stay visible, genuine missing pricing highlights, failed read stays truthful, late picker/cancel isolation, and no writes.');

const screenState=h=>clone(Object.fromEntries(['view','homeSection','selId','mode','detailTab','search','fTypes','fStatuses','fSubs','fBuilders','sortKey','sortDir','lotCollapsed','expanded'].map(key=>[key,h.c.S[key]])));
for(const screen of [
 {view:'home',homeSection:'contracts',selId:null,mode:'list'},
 {view:'home',homeSection:'contracts',selId:null,mode:'board'},
 {view:'detail',homeSection:'contracts',selId:ID,mode:'list',detailTab:'edit'}
]){
 const {h,gate}=await fixture({cached:2,screen:{...screen,search:'Pricing',fTypes:['Lot (Master)'],fStatuses:['New'],sortKey:'Contract_Name',sortDir:-1,lotCollapsed:{[ID]:true},expanded:{[ID]:true}}});gate.resolve();await drain();
 const state=screenState(h),scroll=h.c.captureScroll();h.c.ncSetPpf('50','1400');
 const result=await h.c.clpSave();assert.equal(result.error,null);assert.equal(result.rows.length,1);assert.equal(result.rows[0].state,'verified');
 assert.deepEqual(screenState(h),state,'pricing save preserves the originating view, filters and expansions');assert.deepEqual(clone(h.c.captureScroll()),clone(scroll),'pricing refresh preserves current scroll');
 assert.equal(h.reports.Contract_Pricing_Report[0].Price_per_Ft,'1400');assert.equal(h.reports.Contract_Pricing_Report[0].Base_Price,70000);assert.equal(writes(h).length,1,'one verified pricing write');
 assert.equal(h.c.S.clp,null);assert.equal(h.c.S.nc,null);assert.equal(h.c.S.contractWorkflow,null);assert.equal(h.c.document.querySelector('#clp_body'),null);
 const banner=h.c.document.querySelector('#banners .contract-pricing-banner');assert(banner,'actual verified pricing save uses its scoped larger success banner');assert.equal(banner.getAttribute('role'),'status');assert.equal(banner.textContent,'Contract saved.');assert.equal(banner.querySelector('svg').getAttribute('viewBox'),'0 0 24 24');
 assert.equal(h.c.document.querySelector('#contractSaveOverlay'),null,'no acknowledgement dialog after routine pricing save');assert.equal(h.c.document.querySelector('#banners button'),null,'success is nonblocking');
 h.tick(3500);assert.equal(h.node('banners').innerHTML,'','same auto-dismiss duration');
}
{
 const {h,gate}=await fixture({cached:2,screen:{view:'home',homeSection:'contracts',selId:null,mode:'list'}});gate.resolve();await drain();const state=screenState(h),draft=h.c.S.nc,native=h.api.updateRecordById;
 h.api.updateRecordById=async config=>{await native(config);return {code:3000,data:{ID:config.id},details:{code:2899}};};h.c.ncSetPpf('50','1400');
 const result=await h.c.clpSave();assert(result.error);assert.equal(result.rows[0].state,'unknown');assert.equal(h.c.S.nc,draft);assert.deepEqual(screenState(h),state);assert.doesNotMatch(h.node('banners').innerHTML,/contract-pricing-banner/,'unverified save cannot show success styling');assert.equal(writes(h).length,1);
 assert.equal(await h.c.clpSave(),true,'Check status uses read-only recovery from the same button');
 assert.equal(writes(h).length,1,'status check is read only');assert.deepEqual(screenState(h),state,'verified recheck also stays on the same screen');assert.equal(h.c.S.clp,null);assert.match(h.node('banners').innerHTML,/contract-pricing-banner.*Contract saved/);
 h.c.banner('ok','Other success');assert.doesNotMatch(h.node('banners').innerHTML,/contract-pricing-banner/,'other success implementations retain their current presentation');
 h.c.banner('err','Needs review',{pricingSaved:true});assert.doesNotMatch(h.node('banners').innerHTML,/contract-pricing-banner/,'errors cannot receive pricing success style');
 h.c.contractCreatedBanner(ID);assert.match(h.node('banners').innerHTML,/contract-created-banner/);assert.doesNotMatch(h.node('banners').innerHTML,/contract-pricing-banner/,'creation retains its existing scoped style');
}
console.log('PASS actual pricing save/recheck: stays on list, board or current detail with filters/scroll preserved; one verified write; scoped black success, normal dismissal, retained unknown draft and read-only recovery; other success/error styling unchanged.');

export {fixture,section};
