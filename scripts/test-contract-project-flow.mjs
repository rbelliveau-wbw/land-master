import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {ready} from './test-contract-sdk-v2-foundation.mjs';

const source=fs.readFileSync('widgets/contract-management/src/app/widget.html','utf8');
function fn(name){const start=source.indexOf('function '+name+'(');assert.ok(start>=0,name);const end=source.indexOf('\n',start);return source.slice(start,source.slice(start,end).trim().endsWith('}')?end:source.indexOf('\n}',start)+2);}
const project='4410926000001234567',other='4410926000001234568';
const master={ID:'4410926000007654321',Contract_Type:'Lot (Master)',Project:{ID:project},Builder:{ID:'10'},Contract_Name:'Fox Creek Master'};
const h=await ready({realDOM:true}),ctx=h.c;
Object.assign(ctx.S,{projects:[{ID:project,Project_Name:'Fox Creek',Territory:'Waco',Company1:{ID:'co'},County:'Bell'},{ID:other,Project_Name:'Other',Territory:'Temple/Belton'}],subdivisions:[{ID:'s1',Subdivision_Name:'Fox Creek 1',Project:{ID:project},Territory:'Waco'},{ID:'s2',Project:{ID:project},Territory:'Waco'},{ID:'other',Project:{ID:other},Territory:'Temple/Belton'},{ID:'missing',Project:{ID:project}}],contracts:[master,{...master,ID:'4410926000007654322',Project:{ID:other}}],builders:[]});
Object.assign(ctx,{wireTplDrag:()=>{},lpPruneDisallowed:()=>{},ncRepaintForm:()=>{},mselBtn:key=>'<button id="'+key+'">'+key+'</button>',ncSel:id=>'<button id="'+id+'"></button>',ncNum:id=>'<input id="'+id+'">',ncActionsPreview:()=>'<div>Actions</div>',ncLotsBlock:()=>'<div>Lots and pricing</div>',ncTypeChoices:()=>[],ncPricingDone:()=>false});
const draft=()=>({type:'Lot (Master)',project:'',parent:'',sub:[],builder:'',name:'',territory:'',lotIds:[],ppf:{},wbw:[],owners:[],acts:[],status:'New'});
ctx.S.nc=draft();
let html=ctx.ncFields();assert.match(html,/nc_type/);assert.match(html,/ncproject/);assert.doesNotMatch(html,/ncbuilder|nc_name|nc_sub_wrap|nc_acts/,'Master initially asks only Type and Project');
assert.throws(()=>ctx.ncPayload(),/Choose a Project/);
ctx.S.nc.project=project;ctx.ncSyncContext();assert.equal(ctx.S.nc.territory,'Waco');
html=ctx.ncFields();assert.match(html,/ncbuilder/);assert.doesNotMatch(html,/nc_name/,'name follows builder');
ctx.S.nc.builder='10';html=ctx.ncFields();assert.match(html,/nc_name/);assert.match(html,/id="nc_scope_stage" hidden/,'optional subdivisions follow the name');
ctx.S.nc.name='Master';const data=ctx.ncPayload();assert.equal(data.Project,project);assert.equal(data.Territory,'Waco');assert.equal(data.Company_Entity,'co');assert.equal(data.Subdivision1,undefined);
ctx.S.nc.territory='invented';assert.equal(ctx.ncPayload().Territory,'Waco','only source records determine Territory');
ctx.S.nc={...draft(),type:'Lot (Amendment)',sub:['s1','s2'],builder:'10',name:'Amendment'};ctx.ncSyncContext();
assert.equal(ctx.S.nc.project,project);assert.equal(ctx.S.nc.parent,master.ID);assert.equal(ctx.ncPayload().Parent_Contract,master.ID);
assert.deepEqual(Array.from(ctx.lotParentOptions('10','',project),o=>o.v),[master.ID],'same builder in another Project cannot match');
assert.match(ctx.ncContextHead(),/Territory.*Waco.*Parent Master Contract.*Fox Creek Master/);
assert.doesNotMatch(ctx.ncFields(),/Parent Master Contract|nc_territory/,'derived fields are in the title card');
ctx.S.nc.sub=['other'];ctx.ncSyncContext();assert.equal(ctx.S.nc.parent,'4410926000007654322');assert.equal(ctx.S.nc.territory,'Temple/Belton','changing the subdivision replaces prior derived data');
ctx.S.nc.sub=[];ctx.ncSyncContext();assert.equal(ctx.S.nc.parent,'');assert.equal(ctx.S.nc.project,'');assert.equal(ctx.S.nc.territory,'');
ctx.S.nc.sub=['s1','other'];ctx.ncSyncContext();assert.match(ctx.ncContextError(ctx.S.nc),/one Project/);
ctx.S.nc.sub=['missing'];ctx.ncSyncContext();assert.equal(ctx.S.nc.territory,'Waco','missing subdivision Territory uses its actual Project');
ctx.S.nc.sub=['unknown'];ctx.ncSyncContext();assert.throws(()=>ctx.ncPayload(),/unavailable/,'unresolved source data cannot save');
ctx.S.nc={...draft(),project:project,sub:['s1'],builder:'10',name:'Master'};ctx.ncSetProject(other);assert.equal(ctx.S.nc.sub.length,0,'switching Project drops phases outside the new Project');
ctx.S.nc={...draft(),type:'Lot (Amendment)',sub:['s1'],builder:'10',name:'Amendment'};ctx.ncSyncContext();
h.reports[ctx.CFG.reports.contracts]=[{...master,Project:{ID:other}}];await assert.rejects(ctx.lotValidateParent(ctx.S.nc,''),/same Project/,'fresh read catches a Master moved to another Project');
ctx.S.nc.parent='';h.reports[ctx.CFG.reports.contracts]=[master];await ctx.lotRefreshMasterMatch(ctx.S.nc,'');assert.equal(ctx.S.nc.parent,master.ID,'a newly loaded unique Master auto-links');
ctx.S.nc.parent='';h.reports[ctx.CFG.reports.contracts]=[master,{...master,ID:'4410926000007654323'}];await assert.rejects(ctx.lotRefreshMasterMatch(ctx.S.nc,''),/Several Masters/,'multiple matches require a choice');
ctx.S.nc.parent='4410926000007654323';await ctx.lotRefreshMasterMatch(ctx.S.nc,'');assert.equal(ctx.S.nc.parent,'4410926000007654323','valid explicit choice survives refresh');
h.reports[ctx.CFG.reports.contracts]=[{ID:'999',Project:{ID:project},Territory:'Waco',Parent_Contract:{ID:master.ID}}];await ctx.ncVerifyContext('999',{Project:project,Territory:'Waco',Parent_Contract:master.ID});
h.reports[ctx.CFG.reports.contracts]=[{ID:'999',Territory:'Waco'}];await assert.rejects(ctx.ncVerifyContext('999',{Project:project,Territory:'Waco'}),/could not be verified/,'omitted report columns are not a verified save');
const nativeCount=h.api.getRecordCount;ctx.S.projectsLoaded=false;h.api.getRecordCount=async config=>{if(config.report_name===ctx.CFG.reports.projects)throw Error('permission denied');return nativeCount(config);};await ctx.ncLoadProjects();assert.equal(ctx.S.projectsLoaded,false);assert.match(ctx.S.projectsError,/permission denied$/);
h.api.getRecordCount=nativeCount;h.reports[ctx.CFG.reports.projects]=[{ID:project,Territory:'Waco'}];await ctx.ncLoadProjects();assert.equal(ctx.S.projectsLoaded,true);assert.equal(ctx.S.projectsError,'','failed project loads can retry');
console.log('Contract Project scope, derived Territory, parent matching, staged entry and persisted verification checks passed.');

// Exercise the actual seeded checklist and mounted form independently of identity steps.
{
  const {c}=await ready({realDOM:true});
  c.ncTintModal=()=>{}; // The deterministic DOM does not implement CSSStyleDeclaration.
  c.S.actions=['Lot (Master)','Lot (Amendment)'].flatMap((type,index)=>[
    ...Array.from({length:7},(_,i)=>({ID:String(90071992547411000n+BigInt(index*10+i)),Template_Action:true,Type_field:type,Contract1:'',Contract_Action:type+' action '+(i+1),Sort_Order:i+1})),
    {ID:String(90071992547412000n+BigInt(index)),Template_Action:false,Type_field:type,Contract1:'',Contract_Action:'Ordinary orphan',Sort_Order:0}
  ]);
  Object.assign(c.S,{actionTemplateSnapshot:null,actionTemplateRead:null,contractTemplatesStatus:'loaded',projects:[{ID:project,Project_Name:'Fox Creek',Territory:'Waco'}],projectsLoaded:true,subdivisions:[{ID:'s1',Subdivision_Name:'Fox Creek 1',Project:{ID:project},Territory:'Waco'}],builders:[{ID:'10',Builder_Name:'Fixture builder'}]});
  for(const type of ['Lot (Master)','Lot (Amendment)']){
    c.S.nc={...draft(),type:''};c.ncTypeChange(type);c.ncOpen();
    assert.equal(c.S.nc.seedSource,'template');
    assert.deepEqual(Array.from(c.S.nc.acts,row=>row.title),Array.from({length:7},(_,i)=>type+' action '+(i+1)),'checked templates seed their own type in order');
    for(const fields of [{},{project,sub:['s1'],builder:'10'},{name:'Named contract'}]){
      Object.assign(c.S.nc,fields);c.ncRepaintForm();
      const panel=c.document.getElementById('nc_actions_stage');
      assert.ok(panel);assert.equal(panel.hasAttribute('hidden'),false,'actions show before and after identity fields');assert.equal(panel.hidden,false);
      assert.equal(panel.querySelectorAll('.ma-act input').length,7);assert.ok(panel.textContent.includes(type+' template'));
    }
    c.S.nc.acts[0].title='Custom action';c.ncRepaintForm();
    const editedInput=c.document.querySelector('#nc_acts .ma-act input');
    c.S.nc.name='';c.ncSyncSteps();
    assert.equal(c.document.getElementById('nc_actions_stage').hidden,false,'name clearing never hides actions');
    assert.equal(c.document.querySelector('#nc_acts .ma-act input').value,'Custom action','stage updates preserve checklist edits');
    assert.equal(c.document.querySelector('#nc_acts .ma-act input'),editedInput,'stage updates keep the mounted action input');
    assert.equal(c.document.getElementById('nc_scope_stage')?.hidden??true,true,'scope still follows the name');
    assert.equal(c.document.getElementById('nc_terms_stage').hidden,true);assert.equal(c.document.getElementById('nc_lots_stage').hidden,true);
  }
  console.log('Both Lot types retain seven template actions throughout staged entry and name clearing.');
}
