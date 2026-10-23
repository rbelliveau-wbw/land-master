import assert from 'node:assert/strict';
import {ready,harness,drain,ID,ACTION,SUB,ACCESS,NEW} from './test-contract-sdk-v2-foundation.mjs';

const PROJECT=(BigInt(NEW)+20n).toString(),LEGAL=(BigInt(NEW)+21n).toString(),TEMPLATE=(BigInt(NEW)+22n).toString(),FILE=(BigInt(NEW)+23n).toString();
const submit={ctEdit:false,ctPropose:false,ctApprove:false,ctTemplates:false,ctDeleteArchive:false,constructionSubmit:true,constructionEditAll:false};
const editor={...submit,constructionSubmit:false,constructionEditAll:true};
const writes=h=>h.calls.filter(call=>['add','update','delete'].includes(call.method));
function fixture(h,{pending=false,children=true}={}){
 const values={Work_Module:'Construction',Contract_Type:'Internal',Contract_Name:'Fixture construction request',Status:pending?'Proposed':'New',Territory:'Austin',Project:{ID:PROJECT,display_value:'Fixture Project'},Subdivision1:[{ID:SUB,display_value:'Fixture Phase'}],Construction_Plans:'First Round',MUD:false,Priority:'Medium',Date_Needed:'10/30/2026',Description:'Prepare the grading and paving budget.',Parent_Contract:'',Owner:[{ID:ACCESS}]};
 Object.assign(h.reports.All_Contracts1[0],values);Object.assign(h.c.findContract(ID),values);
 const legal={ID:LEGAL,Contract_Name:'Legal isolated fixture',Contract_Type:'DA',Status:'Proposed',Work_Module:'',Parent_Contract:'',Subdivision1:[]};h.reports.All_Contracts1.push(legal);h.c.S.contracts.push({...legal});
 const sub={ID:SUB,Subdivision_Name:'Fixture Phase',Project:{ID:PROJECT,display_value:'Fixture Project'},Territory:'Austin',Projects_Status:'Engineering',Company1:'',County:'Travis',City:'Austin',Status:'Active'};h.reports.All_Subdivisions[0]=sub;h.c.S.subdivisions=[{...sub}];h.c.S.subdivisionsAll=[{...sub}];
 h.reports.All_Projects=[{ID:PROJECT,Project_Name:'Fixture Project',Territory:'Austin'}];h.c.S.projects=h.reports.All_Projects.map(row=>({...row}));h.c.S.projectsLoaded=true;
 for(const row of [h.reports.All_Contract_Actions[0],h.c.findAction(ACTION)])Object.assign(row,{Template_Action:false,Type_field:'',Work_Module:'Construction'});
 if(!children){h.reports.All_Contract_Actions=[];h.c.S.actions=[];}
 const template={ID:TEMPLATE,Template_Action:true,Type_field:'Internal',Work_Module:'Construction',Contract1:'',Contract_Action:'Prepare construction budget',Sort_Order:'1',Complete:false};
 const legalTemplate={...template,ID:(BigInt(TEMPLATE)+10n).toString(),Work_Module:'',Contract_Action:'Legal-only task'};
 h.reports.All_Contract_Actions.push(template,legalTemplate);h.c.S.actions.push({...template},{...legalTemplate});
 h.c.renderAll();return values;
}
function draft(h){h.c.newContract();h.c.constructionPick('sub',SUB);h.c.constructionPick('type','Internal');h.c.constructionPick('plans','First Round');h.c.constructionPick('mud','No');h.c.constructionPick('priority','High');Object.assign(h.c.S.nc,{needed:'2026-10-30',description:'Prepare the Phase grading budget.'});return h.c.S.nc;}
function files(h){const base=h.api.invokeCustomApi;let creates=0,uploads=0;h.api.invokeCustomApi=async config=>{if(config.api_name!==h.c.CFG.customApis.createAttachment)return base(config);creates++;h.reports.All_Attachments.push({ID:FILE,Contract1:{ID:config.payload.contractId},Email_Attachment:false,File_field1:{},Added_User:'actual-actor'});return {code:3000,details:{output:JSON.stringify({ok:true,attachmentId:FILE})}};};h.c.ZOHO.CREATOR.FILE={uploadFile:async config=>{uploads++;const row=h.reports.All_Attachments.find(row=>row.ID===config.id);row.File_field1={filepath:'native_'+config.file.name};return {code:3000};}};return {creates:()=>creates,uploads:()=>uploads};}

{
 const h=await ready({accessFlags:editor,pageParams:{workMode:'construction'},realDOM:true});fixture(h);
 const otherSub=(BigInt(SUB)+89n).toString();
 const dates={CP_Release_Goal:'10/26/2026',CP_Release_Estimate:'2026-10-28',Construction_Start_Goal:'11/03/2026',Construction_Start_Estimate:'2026-11-05'};
 Object.assign(h.reports.All_Subdivisions[0],dates);
 h.reports.All_Subdivisions.push({...h.reports.All_Subdivisions[0],ID:otherSub,Subdivision_Name:'Other schedule phase',CP_Release_Goal:'',CP_Release_Estimate:'02/03/2027',Construction_Start_Goal:null,Construction_Start_Estimate:'not a date'});
 Object.assign(h.reports.All_Contracts1[0],{CP_Release_Goal:'01/01/2040',CP_Release_Estimate:'01/02/2040',Construction_Start_Goal:'01/03/2040',Construction_Start_Estimate:'01/04/2040'});
 assert.equal(await h.c.loadData(),true);
 const reads=h.calls.filter(call=>call.method==='records'&&call.config.report_name==='All_Subdivisions');
 assert.ok(reads.length>=2);assert.ok(reads.every(call=>call.config.field_config==='all'),'native startup and Refresh retain all persisted Subdivision dates');
 for(const [field,value]of Object.entries(dates))assert.equal(h.c.ncSubRecord(SUB)[field],value);
 function matrix(markup){const host=h.c.document.createElement('div');host.innerHTML=markup;return host.querySelector('.construction-dates table');}
 function cells(table){return Array.from(table.querySelectorAll('tbody tr'),row=>Array.from(row.querySelectorAll('th,td'),cell=>cell.textContent));}
 function checkHeaders(table){assert.equal(table.getAttribute('aria-label'),'Subdivision dates');assert.deepEqual(Array.from(table.querySelectorAll('thead th'),cell=>cell.textContent),['','Goal','Estimate']);assert.ok(table.querySelectorAll('tbody th').every(cell=>cell.getAttribute('scope')==='row'));}
 h.c.newContract();await drain();const draft=h.c.S.nc,subInput=h.node('construction_sub'),nameInput=h.node('construction_name');
 const context=h.node('nc_form').querySelector('.construction-context');
 assert.deepEqual(cells(matrix(h.c.constructionContextHTML(draft))),[['CP Release','Unavailable','Unavailable'],['Const Start','Unavailable','Unavailable']]);
 h.c.constructionPick('sub',SUB);checkHeaders(matrix(context.outerHTML));
 assert.deepEqual(cells(matrix(context.outerHTML)),[['CP Release','10/26/2026','10/28/2026'],['Const Start','11/03/2026','11/05/2026']],'Goal/Estimate cells read their selected Subdivision field, never similarly named Contract fields');
 assert.equal(h.node('construction_sub'),subInput);assert.equal(h.node('construction_name'),nameInput);
 h.c.constructionPick('sub',otherSub);
 assert.deepEqual(cells(matrix(context.outerHTML)),[['CP Release','Unavailable','02/03/2027'],['Const Start','Unavailable','Unavailable']],'selection replacement clears unavailable cells independently and cannot retain another phase\'s dates');
 h.c.constructionPick('sub','');assert.deepEqual(cells(matrix(context.outerHTML)),[['CP Release','Unavailable','Unavailable'],['Const Start','Unavailable','Unavailable']]);
 assert.equal(h.c.constructionCancelNew(),true);assert.equal(h.c.constructionEditOpen(ID),true);
 const editMatrix=h.node('construction_edit_form').querySelector('.construction-dates table');checkHeaders(editMatrix);
 assert.deepEqual(cells(editMatrix),[['CP Release','10/26/2026','10/28/2026'],['Const Start','11/03/2026','11/05/2026']],'Edit renders the request\'s current selected Subdivision dates');
 assert.doesNotMatch(editMatrix.textContent,/Milestone|Task|2040/);assert.equal(writes(h).length,0,'reading and changing schedule context never writes a Subdivision or request');
}

{
 const h=await ready({accessFlags:editor,pageParams:{workMode:'construction'},realDOM:true});fixture(h);h.c.newContract();
 assert.equal(h.node('nc_submit').textContent,'Submit');
 assert.match(h.c.constructionFields(),/type="button"[^>]+onclick="constructionSuggestName\(\)"[^>]+>Suggest<\/button>/);
 h.c.S.nc.name='Keep this draft';assert.equal(h.c.constructionSuggestName(),false);assert.equal(h.c.S.nc.name,'Keep this draft','missing subdivision cannot erase a typed name');
 const otherSub=(BigInt(SUB)+88n).toString(),otherParent=(BigInt(ID)+88n).toString();
 h.c.S.subdivisions.push({ID:otherSub,Subdivision_Name:'AAA Other Phase'});h.c.S.subdivisionsAll.push({ID:otherSub,Subdivision_Name:'AAA Other Phase'});
 h.c.S.contracts.push({...h.c.findContract(ID),ID:otherParent,Contract_Name:'Other subdivision request',Subdivision1:[{ID:otherSub}],Parent_Contract:''});
 const v=draft(h);const grouped=h.c.mselRows('constructionparent');assert.ok(grouped.indexOf('Fixture Phase')<grouped.indexOf('AAA Other Phase'),'current subdivision groups first');assert.match(grouped,/data-search="[^"]*fixture phase/);assert.match(grouped,/Other subdivision request/);assert.match(h.c.constructionFields(),/mselb_constructionparent/);
 const trigger=h.node('mselb_constructionparent');h.c.mselOpen({stopPropagation(){},currentTarget:trigger},'constructionparent');const search=h.node('mselSearch');search.value='aaa other phase';await search.fire('input');const choices=h.node('mselList').querySelectorAll('button.msel-opt').filter(node=>node.style.display!=='none');assert.equal(choices.length,1);assert.equal(choices[0].getAttribute('data-val'),otherParent);await h.c.document.querySelector('.msel-pop').fire('keydown',{key:'ArrowDown',preventDefault(){}});assert.equal(h.c.document.activeElement,choices[0]);h.c.mselToggle('constructionparent',otherParent);assert.equal(v.parent,otherParent);assert.equal(h.c.document.activeElement.id,'mselb_constructionparent');h.c.mselToggle('constructionparent',otherParent);assert.equal(v.parent,'');
 const robby=h.c.isRobby;h.c.isRobby=()=>true;h.c.kebabMenu({stopPropagation(){},currentTarget:h.node('mselb_constructionparent')},ID);const menu=h.c.document.querySelector('.kmenu');assert.match(menu.textContent,/Assign Parent Request/);assert.doesNotMatch(menu.textContent,/Open in Creator/);menu.remove();h.c.isRobby=robby;v.name='Custom request';const description=v.description,needed=v.needed;
 assert.equal(h.c.constructionSuggestName(),true);assert.equal(v.name,'Fixture Phase · Internal budget');assert.equal(h.node('construction_name').value,v.name);
 assert.equal(v.description,description);assert.equal(v.needed,needed);assert.equal(writes(h).length,0,'Suggest only changes the draft');
 const mounted=['construction_sub','construction_needed','construction_type','construction_plans','construction_name','construction_description'].map(id=>h.node(id));
 const originalType=h.node('construction_type');originalType.focus();
 v.name='Manually named request';h.c.constructionPick('type','Amenity');
 assert.deepEqual(['construction_sub','construction_needed','construction_type','construction_plans','construction_name','construction_description'].map(id=>h.node(id)),mounted,'type selection preserves mounted controls and drafts');
 assert.equal(h.c.document.activeElement,originalType,'selection preserves focus');
 assert.equal(h.node('construction_type').value,'Amenity');
assert.equal(v.name,'Manually named request','normal field changes preserve a manual name');
 h.c.constructionSuggestName();assert.equal(v.name,'Fixture Phase · Amenity budget','explicit Suggest replaces the manual name');
 let confirmation;h.c.confirmDialog=options=>{confirmation=options;};assert.equal(h.c.constructionConfirm(),true);assert.equal(confirmation.okLabel,'Submit');
 assert.equal(h.c.constructionEditOpen(ID),true);const edit=h.c.S.constructionEdit.draft;h.c.constructionSuggestName();assert.equal(edit.name,'Fixture Phase · Internal budget');assert.equal(h.c.findContract(ID).Contract_Name,'Fixture construction request','editing suggestion waits for Save');
 h.c.S.busy=true;edit.name='Busy draft';assert.equal(h.c.constructionSuggestName(),false);assert.equal(edit.name,'Busy draft');assert.equal(writes(h).length,0);
}

for(const options of [{},{accessFailure:true}]){
 const h=await ready({...options,realDOM:true});assert.equal(h.c.constructionAccess(),false);assert.equal(h.c.setWorkMode,undefined);assert.match(h.node('view').innerHTML,/New Legal Task/);
 fixture(h);assert.equal(h.c.mayEdit(ID),false,'Legal edit/degraded grants never authorize construction');await assert.rejects(h.c.updateRecord(ID,{Description:'Cross-module'}),/module page/);assert.equal(writes(h).length,0);
}
{
 const h=harness({accessFlags:submit,pageParams:{workMode:'construction'},realDOM:true});h.c.ZOHO.CREATOR.UTIL.getQueryParams=async()=>({workMode:'construction'});await drain();assert.equal(h.c.S.workMode,'construction','page variable selects construction after explicit grant');
 const token=harness({accessFlags:editor,pageParams:{workMode:'construction'},realDOM:true});token.c.ZOHO.CREATOR.UTIL.getQueryParams=async()=>({workMode:'construction',tokenId:'private-fixture'});await drain();assert.equal(token.c.S.workMode,'construction','token links cannot switch a Construction page to Legal');
 const native=harness({accessFlags:submit,pageParams:{workMode:'construction'},realDOM:true});native.c.document.referrer='https://creatorapp.zoho.com/wbdevelopment/land-master/#Page:Construction';await drain();assert.equal(native.c.S.workMode,'construction','native Construction page supplies a fallback when the SDK omits page variables');
 const explicit=harness({accessFlags:submit,pageParams:{workMode:'construction'},realDOM:true});explicit.c.document.referrer='https://creatorapp.zoho.com/wbdevelopment/land-master/#Page:Construction';explicit.c.ZOHO.CREATOR.UTIL.getQueryParams=async()=>({workMode:'legal'});await drain();assert.equal(explicit.c.S.workMode,'construction','native page identity cannot be switched through a query parameter');
}
{
 const h=await ready({accessFlags:submit,pageParams:{workMode:'construction'},realDOM:true});fixture(h,{pending:true});assert.equal(h.c.canPropose(),true);assert.equal(h.c.canEdit(),false);assert.equal(h.c.canApprove(),false);assert.equal(h.c.canTemplates(),false);
 assert.equal(h.c.setWorkMode,undefined);assert.doesNotMatch(h.node('view').innerHTML,/setWorkMode/);
 assert.match(h.node('view').innerHTML,/Pending Review/);assert.doesNotMatch(h.node('view').innerHTML,/showLOIReviews\(\)|showManageActions\(\)|Legal isolated fixture/);
 assert.deepEqual(Array.from(h.c.ncTypeChoices('')),['Internal','Offsite','Amenity','MUD Bid']);assert.equal(h.c.reviewCount(),1,'badge excludes the Legal pending request');assert.deepEqual(Array.from(h.c.templatesFor('Internal'),row=>row.Contract_Action),['Prepare construction budget']);
 const v=draft(h);await drain();const form=h.c.constructionFields();assert.match(form,/Project context|Fixture Project|Engineering/);assert.doesNotMatch(form,/nc_project_wrap|nc_territory|nc_builder_wrap|nc_owner_wrap/);assert.equal(v.sub.length,1);
 const needed=h.node('construction_needed');assert.equal(needed.value,'2026-10-30');assert.equal(needed.parentNode.querySelector('.dt-v').textContent,'10/30/2026');needed.value='2026-11-13';h.c.dtSync(needed);assert.equal(needed.parentNode.querySelector('.dt-v').textContent,'11/13/2026','Construction date remains numeric after picker synchronization');assert.equal(needed.value,'2026-11-13','visible formatting cannot replace the ISO date carrier');needed.value=v.needed;h.c.dtSync(needed);
 h.node('legal-date-fixture').innerHTML=h.c.dtCell({kind:'due',label:'Due',id:'legal_due_date',field:'Due_Date',aid:ACTION,value:'2026-10-30'});const legalDate=h.node('legal_due_date');legalDate.value='2026-11-14';h.c.dtSync(legalDate);assert.equal(legalDate.parentNode.querySelector('.dt-v').textContent,h.c.prettyDate('2026-11-14'),'unmarked Legal date keeps the existing human format');assert.doesNotMatch(legalDate.parentNode.querySelector('.dt-v').textContent,/\d{2}\/\d{2}\/\d{4}/);assert.equal(legalDate.value,'2026-11-14');
 assert.equal(h.c.constructionPayload(v,false).MUD,false,'native MUD checkbox uses a boolean');v.mud='';assert.throws(()=>h.c.constructionPayload(v,false),/Choose Yes or No/);v.mud='No';
 const result=await h.c.ncSubmit([{title:'Submitter must not seed this'}],[{email:'Legal must not receive approval'}]);assert.equal(result.error,null);assert.equal(writes(h).length,1,'submission creates only the request header');
 const created=h.reports.All_Contracts1.find(row=>row.ID===NEW);assert.equal(created.Status,'Proposed');assert.equal(created.Work_Module,'Construction');assert.equal(created.Project,PROJECT);assert.equal(created.Territory,'Austin');assert.deepEqual(created.Subdivision1,[SUB]);assert.equal(created.MUD,false);assert.equal(created.Priority,'High');
 assert.equal(h.c.ContractSetupUI.close(),true);assert.equal(h.c.mayEdit(NEW),false,'request ownership does not grant submitters editing');assert.ok(h.c.filteredContracts().some(row=>row.ID===NEW),'pending submissions stay discoverable');
 for(const operation of [()=>h.c.updateRecord(NEW,{Description:'Denied'}),()=>h.c.updateRecord(NEW,{Status:'New'}),()=>h.c.createRecord(h.c.CFG.forms.action,{Contract1:NEW,Contract_Action:'Denied task'}),()=>h.c.updateRecord(TEMPLATE,{Contract_Action:'Denied template'},h.c.CFG.reports.actions),()=>h.c.sdkDeleteById(h.c.CFG.reports.contracts,NEW)])await assert.rejects(operation());
 assert.equal(writes(h).length,1);assert.equal(h.c.constructionEditOpen(NEW),false);
 h.c.openContract(NEW);assert.doesNotMatch(h.node('view').innerHTML,/Drag ⠿|click a row to edit|Propose the first action|Submit access allows|Edit All Construction Requests access is required to edit/,'read-only Construction workspace omits editing instructions and the unsolicited permission notice');
 const moduleMenu=h.node('view').querySelector('.home-actions .home-switch');assert.match(moduleMenu.textContent,/Requests/);assert.doesNotMatch(moduleMenu.innerHTML,/Manage Task Templates|showLOIReviews/,'the restored page menu preserves submit-only permissions');assert.equal(h.c.document.querySelector('.topbar .home-switch'),null,'the menu stays above the filters rather than in the top header');
 let attachmentForm='';h.c.openParent=target=>{attachmentForm=target;};h.c.addFile();assert.equal(attachmentForm,'#Form:Attachment?Contract1='+NEW,'the Tasks Add File shortcut also permits submitters');
 await h.c.createRecord(h.c.CFG.forms.comment,{Contract1:NEW,Comment:'Submission discussion',User:'actual-actor'});assert.equal(h.reports.Comment_Log_Report.length,1,'submitters can add comments');
 const f=files(h);h.c.showAttachmentsModal(NEW);assert.match(h.node('overlays').textContent,/Choose Files/);assert.equal(h.c.canAddContractAttachments(NEW),true);assert.equal(h.c.S.busy,false);assert.equal(h.c.S.contractWorkflow,null);const uploaded=await h.c.addVersionFiles(NEW,[{name:'construction-plans.pdf',size:12}]);assert.equal(uploaded.error,null);assert.equal(f.creates(),1);assert.equal(f.uploads(),1);assert.equal(h.c.S.versions[0].Contract1.ID,NEW);
 assert.doesNotMatch(h.c.attachmentModalRows(NEW,h.c.S.versions),/deleteVersion|toggleEmailAttach/);assert.equal(await h.c.doDeleteVersion(FILE,NEW),false);assert.equal(writes(h).length,2,'only header and comment used ordinary CRUD');
}
{
 const h=await ready({accessFlags:editor,pageParams:{workMode:'construction'},realDOM:true});fixture(h,{pending:true,children:false});assert.equal(h.c.canEdit(),true);assert.equal(h.c.canTemplates(),true);assert.equal(h.c.canApprove(),true);assert.equal(h.c.canDeleteArchive(ID),true);assert.equal(h.c.canArchive(ID),true);
 assert.deepEqual(Array.from(h.c.allTypes()),['Amenity','Internal','MUD Bid','Offsite']);assert.ok(!h.c.allContractStatuses().includes('Awaiting WBW'));assert.match(h.c.homeNavigation('actions'),/Manage Task Templates/);assert.match(h.c.homeSwitch('actions'),/New Construction Task/);
 assert.equal(h.c.constructionEditOpen(ID),true);h.c.S.constructionEdit.draft.priority='ASAP';assert.equal(await h.c.constructionEditSave(),true);assert.equal(h.reports.All_Contracts1[0].Priority,'ASAP');
 await assert.rejects(h.c.updateRecord(LEGAL,{Contract_Name:'Construction grant cannot edit Legal'}));await assert.rejects(h.c.updateRecord(ID,{Work_Module:'Legal'}),/between modules/);assert.equal(h.c.contractParentOptions({workMode:'construction',type:'Internal',sub:[SUB],builder:''},ID).some(row=>row.v===LEGAL),false);
 const result=await h.c.pcRun(ID,true);assert.equal(result.error,null);assert.equal(h.reports.All_Contracts1[0].Status,'New');const actions=h.reports.All_Contract_Actions.filter(row=>row.Contract1===ID);assert.equal(actions.length,1);assert.equal(actions[0].Work_Module,'Construction');assert.equal(actions[0].Contract_Action,'Prepare construction budget');assert.equal(h.reports.All_Contract_Approvals.length,0);
 assert.equal(h.c.ContractSetupUI.close(),true);assert.equal(await h.c.pcRun(ID,true),false,'acceptance cannot seed a second time');
}
{
 const h=await ready({accessFlags:{...editor,ctEdit:true,ctTemplates:true},pageParams:{workMode:'construction'},realDOM:true});fixture(h);
 assert.equal(h.c.openContract(LEGAL),false);assert.equal(h.c.openContractTab(LEGAL,'edit'),false);assert.equal(await h.c.openLOIReview(LEGAL,''),false);assert.equal(h.c.S.workMode,'construction');assert.doesNotMatch(h.node('view').innerHTML,/Legal isolated fixture/);
 h.c.openContract(ID);assert.match(h.node('view').innerHTML,/Fixture construction request/);assert.doesNotMatch(h.node('view').innerHTML,/f_dm_|data-f="Dev_Mgr"|Assignee/);
 const action=h.c.findAction(ACTION);assert.doesNotMatch(h.c.actionRow(action),/f_dm_|Assignee/);assert.doesNotMatch(h.c.renderEditGrid(ID,[action]),/Dev_Mgr|Assignee/);assert.doesNotMatch(h.c.drillRow(h.c.findContract(ID)),/da_dm_|Assignee/);assert.equal(h.c.requireOwner(ACTION),true);
 h.c.quickComplete(ACTION);await drain();assert.equal(h.reports.All_Contract_Actions[0].Complete,true,'Construction completion does not require an assignment');assert.ok(!writes(h).some(call=>Object.hasOwn(call.config.payload?.data||{},'Dev_Mgr')),'completion preserves any existing assignment');
 h.c.ncApplyAccess({...h.flags,constructionEditAll:false,constructionSubmit:false});h.c.renderAll();assert.equal(h.c.S.workMode,'construction');assert.match(h.node('view').innerHTML,/Construction access required/);assert.doesNotMatch(h.node('view').innerHTML,/Legal isolated fixture|Fixture construction request/);
}
for(const options of [{accessFlags:{}},{accessFailure:true}]){
 const h=await ready({...options,pageParams:{workMode:'construction'},realDOM:true});fixture(h);assert.equal(h.c.S.workMode,'construction');assert.match(h.node('view').innerHTML,/Construction access required/);assert.equal(h.c.filteredContracts().length,0);assert.equal(h.c.openContract(LEGAL),false);assert.equal(writes(h).length,0);
}

for(const flags of [submit,editor]){
 const h=harness({accessFlags:flags,pageParams:{workMode:'construction',constructionReportScope:'construction'},realDOM:true});
 h.reports.All_Contracts1[0].Work_Module='Construction';h.reports.All_Contract_Actions[0].Work_Module='Construction';await drain();assert.equal(h.c.S.coreReady,true);fixture(h);
 assert.equal(h.c.CFG.reports.contracts,'Construction_Requests');assert.equal(h.c.CFG.reports.actions,'Construction_Actions');assert.equal(h.c.CFG.reports.versions,'Construction_Attachments');assert.equal(h.c.CFG.reports.comments,'Construction_Comments');
 assert.ok(!h.calls.some(call=>['All_Contracts1','All_Contract_Actions','All_Attachments','All_Contract_Approvals','Contract_Pricing_Report'].includes(call.config.report_name)),'scoped Construction boot never reads Legal reports or approvals/pricing');
 draft(h);const result=await h.c.ncSubmit([],[]);assert.equal(result.error,null);assert.ok(h.reports.All_Contracts1.some(row=>row.ID===NEW&&row.Work_Module==='Construction'));
}
{
 const h=await ready({actionsCount:0,accessFlags:editor,pageParams:{workMode:'construction',constructionReportScope:'construction'},realDOM:true});
 assert.equal(h.c.contractTemplateCapability(h.c.S.actions),'current','a counted empty current Construction report can start its first template');
 h.c.showManageActions();assert.match(h.node('view').innerHTML,/No template actions|Add action/);assert.doesNotMatch(h.node('view').innerHTML,/Action templates unavailable/);
 h.c.S.maType='Internal';h.c.S.maDraft=[{id:'',title:'First Construction template action'}];let confirmation;h.c.confirmDialog=options=>{confirmation=options;};h.c.maSave();assert.equal(confirmation.okLabel,'Save template');assert.equal(writes(h).length,0,'first template still waits for the normal save confirmation');
 const legal=await ready({actionsCount:0,realDOM:true});assert.equal(legal.c.contractTemplateCapability([]),'unavailable','the existing empty legacy/Legal schema guard stays intact');
}
{
 const h=harness({accessFlags:{...editor,ctEdit:true},pageParams:{workMode:'construction',constructionReportScope:'construction'},realDOM:true});h.c.document.referrer='https://creatorapp.zoho.com/wbdevelopment/land-master/#Page:Legal';await drain();assert.equal(h.c.S.workMode,'legal');assert.equal(h.c.CFG.reports.contracts,'All_Contracts1');assert.equal(h.c.setWorkMode,undefined);
}

// Signal rail uses the actual scoped/native priority/status saves, including completion.
{
 const h=harness({accessFlags:editor,pageParams:{workMode:'construction',constructionReportScope:'construction'},realDOM:true});h.reports.All_Contracts1[0].Work_Module='Construction';h.reports.All_Contract_Actions[0].Work_Module='Construction';await drain();fixture(h);
 const base=h.c.findContract(ID),cases=[['ASAP','New'],['High','Hold'],['Medium','Proposed'],['','New'],['Legacy <urgent>','Other <status>'],['constructor','New']];
 cases.forEach(([priority,status],i)=>{const row={...base,ID:(BigInt(NEW)+100n+BigInt(i)).toString(),Contract_Name:'Signal <request> '+i,Priority:priority,Status:status};h.c.S.contracts.push(row);h.reports.All_Contracts1.push({...row});});
 h.c.S.mode='board';h.c.renderAll();
 const lanes=h.c.document.querySelectorAll('.construction-board-lane');
 assert.deepEqual(Array.from(lanes,node=>node.getAttribute('data-priority')),['ASAP','High','Medium','constructor','Legacy <urgent>','']);
 assert.equal(h.c.document.querySelectorAll('.construction-board .bcard').length,cases.length+1,'every filtered Construction request appears once');
 assert.equal(h.c.document.querySelectorAll('.scope-count,.bcol-head .n,.review-n').length,0,'Construction board omits request counts');
 assert.ok(h.c.document.querySelector('.construction-board-cell[data-status="Hold"]'));
 assert.match(h.node('view').innerHTML,/Signal &lt;request&gt;|Legacy &lt;urgent&gt;/,'native strings are escaped');
 assert.equal(h.c.document.querySelectorAll('.construction-board .bcard-builder,.construction-board .lot-parent-label,.construction-board .contract-master-note').length,0,'Construction cards omit subdivision and family metadata');
 assert.equal(h.c.document.querySelector('.construction-board .bcard-needed').textContent,'10/30/2026','request cards show the saved Date Needed');
 assert.doesNotMatch(h.node('view').textContent,/\d+\/\d+ actions/,'request card footers replace action counts');
 const cell=(priority,status)=>h.c.document.querySelectorAll('.construction-board-cell').find(node=>node.getAttribute('data-priority')===priority&&node.getAttribute('data-status')===status);
 const drop=(priority,status,cid=ID)=>{h.c.S.bDrag=cid;h.c.bDrop({preventDefault(){},currentTarget:cell(priority,status)});};
 drop('Medium','Proposed');await drain();assert.equal(writes(h).length,0,'Review status is not a manual drop destination');
 drop('High','New');await drain();assert.equal(h.c.findContract(ID).Priority,'High');assert.equal(h.reports.All_Contracts1[0].Status,'New');assert.deepEqual(writes(h).at(-1).config.payload.data,{Priority:'High'},'vertical drag changes only Priority');
 drop('ASAP','Hold');await drain();assert.equal(h.c.findContract(ID).Status,'Hold');assert.equal(h.reports.All_Contracts1[0].Priority,'ASAP');
 const statusWrite=writes(h).at(-1);assert.equal(statusWrite.config.report_name,'Construction_Requests');assert.deepEqual(statusWrite.config.payload.data,{Status:'Hold',Priority:'ASAP'},'diagonal drop saves status and priority in one native update');
 drop('ASAP','New');await drain();assert.deepEqual(writes(h).at(-1).config.payload.data,{Status:'New'},'horizontal drag preserves Priority');
 let confirmation;h.c.confirmDialog=options=>{confirmation=options;};const before=writes(h).length;drop('High','Complete');assert.equal(writes(h).length,before);assert.equal(confirmation.okLabel,'Complete contract');confirmation.onConfirm();await drain();
 assert.equal(h.c.findContract(ID).Status,'Complete');assert.equal(h.c.findAction(ACTION).Complete,true,'board completion uses the existing action cascade');
 assert.equal(h.reports.All_Contracts1[0].Priority,'High','completion retains the requested priority in its existing final header save');
 const doneWrites=writes(h).length;drop('Medium','New');await drain();assert.equal(writes(h).length,doneWrites,'completed requests remain locked');
 const pending=h.c.S.contracts.find(c=>c.Status==='Proposed'&&c.Work_Module==='Construction');drop('High','Proposed',pending.ID);await drain();assert.equal(pending.Priority,'High');assert.equal(pending.Status,'Proposed');assert.deepEqual(writes(h).at(-1).config.payload.data,{Priority:'High'},'Pending Review allows priority editing without acceptance');
 const pendingWrites=writes(h).length;drop('High','New',pending.ID);drop('Legacy <urgent>','Proposed',pending.ID);await drain();assert.equal(writes(h).length,pendingWrites,'pending status and invalid legacy priority assignments remain guarded');
 h.c.S.bDrag=pending.ID;h.c.bDrop({preventDefault(){},currentTarget:h.c.document.querySelectorAll('.construction-priority-rail').find(node=>node.getAttribute('data-priority')==='ASAP')});await drain();assert.equal(pending.Priority,'ASAP');assert.equal(pending.Status,'Proposed','dropping on the rail preserves status');
 h.c.S.mode='list';h.c.renderAll();assert.ok(h.c.document.querySelector('.scope-count'),'list count is preserved');
}
{
 const h=await ready({accessFlags:submit,pageParams:{workMode:'construction'},realDOM:true});fixture(h);h.c.S.mode='board';h.c.renderAll();
 assert.equal(h.c.document.querySelectorAll('.construction-board .bcard[draggable]').length,0);
 const cell=h.c.document.querySelectorAll('.construction-board-cell').find(node=>node.getAttribute('data-priority')==='Medium'&&node.getAttribute('data-status')==='Hold');
 h.c.S.bDrag=ID;h.c.bDrop({preventDefault(){},currentTarget:cell});await drain();assert.equal(writes(h).length,0,'read-only forged drops are rejected');
 const legal=await ready({realDOM:true});legal.c.S.mode='board';legal.c.renderAll();assert.equal(legal.c.document.querySelectorAll('.construction-board').length,0);assert.ok(legal.c.document.querySelector('.bcol-head .n'),'Legal status counts are preserved');
}

{
 const h=await ready({accessFlags:editor,pageParams:{workMode:'construction'},realDOM:true});fixture(h);h.c.S.mode='board';h.c.renderAll();
 const native=h.api.updateRecordById;h.api.updateRecordById=async()=>{throw {code:2898,message:'Permission Denied'};};await h.c.setConstructionBoardPriority(ID,'High');await drain();assert.equal(h.c.findContract(ID).Priority,'Medium','failed priority save cannot optimistically move the request');assert.equal(h.c.S.busy,false);h.api.updateRecordById=native;
}

console.log('PASS Construction page isolation, native request/action saves, permissions and Signal rail: priority-only/pending/rail drops, atomic combined moves, preserved completion cascade, rejected read-only/locked/Review-status/invalid-priority moves, truthful failed saves, actual card facts and preserved Legal/list behavior.');
