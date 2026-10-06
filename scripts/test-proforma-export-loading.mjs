import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {harness,ID,held,drain,source} from './fixtures/proforma-sdk-v2-harness.mjs';

const testSource=(process.argv[2]?fs.readFileSync(process.argv[2],'utf8'):source).replace('window.__PFW_TEST__={','window.__PFW_TEST__={showView:showView,openExportModal:openExportModal,exportProformaXlsx:exportProformaXlsx,setDownload:function(fn){triggerBlobDownload=fn;},');
const xlsxContext=vm.createContext({});
vm.runInContext(fs.readFileSync('widgets/land-master/src/app/vendor/xlsx.full.min.js','utf8'),xlsxContext);
const X=xlsxContext.XLSX;
async function setup(options={}){
  const h=harness({...options,source:testSource});await h.c.__pfBoot;
  h.downloads=[];h.widget.setDownload((blob,name)=>h.downloads.push({blob,name}));h.widget.S.xlsxLib=X;
  return h;
}
function visible(h,view){
  assert.equal(h.widget.S.view,view);
  assert.equal(h.node('loadview').style.display,'none','loading screen is dismissed');
  assert.equal(h.node(view).classList.contains('show'),true,'originating screen is visible');
  assert.notEqual(h.node('statusTxt').textContent,'Loading record options…');
}
for(const view of ['vList','vDash','vEdit']){
  const gate=held(),h=await setup({read:async config=>{if(config.report_name==='All_Property')await gate.promise;}});
  if(view==='vEdit'){
    await h.widget.openEdit(ID);h.widget.S.ed.model.Name='Unsaved export draft';h.widget.S.ed.dirty=true;
  }else if(view==='vDash')await h.widget.openDashboard(ID);
  h.widget.showView(view);const draft=h.widget.S.ed.model,priorStatus=h.node('statusTxt').textContent;
  const report=h.node('vList').querySelector('tbody'),firstRow=report.children[0],reportWrites=report.htmlWrites;
  const headerReads=h.calls.filter(call=>call.config.report_name==='All_Pro_Formas_All_Fields').length;
  h.node('listSearch').value='kept search';report.scrollTop=120;
  h.widget.openExportModal(ID);const exporting=h.widget.exportProformaXlsx(ID);await drain();
  visible(h,view);assert.equal(h.downloads.length,0);
  assert.equal(h.node('statusTxt').textContent,priorStatus,'only the export dialog shows loading');
  assert.ok([...h.document.querySelectorAll('#exportModal .ex-choice')].every(button=>button.disabled));
  gate.resolve();await exporting;await drain();assert.equal(h.downloads.length,1,'file finishes downloading before the view check');
  visible(h,view);assert.equal(h.node('statusTxt').textContent,priorStatus);
  assert.equal(report.htmlWrites,reportWrites,'export never re-renders the report');
  assert.equal(report.children[0],firstRow,'mounted report rows stay in place');
  assert.equal(report.scrollTop,120);assert.equal(h.node('listSearch').value,'kept search');
  assert.equal(h.calls.filter(call=>call.config.report_name==='All_Pro_Formas_All_Fields').length,headerReads,'no main report refresh request');
  assert.equal(h.widget.S.ed.model,draft,'export preserves editor draft');
  if(view==='vEdit'){assert.equal(draft.Name,'Unsaved export draft');assert.equal(h.widget.S.ed.dirty,true);}
  assert.equal(h.node('exportModal').classList.contains('show'),false);
  assert.equal(h.downloads.length,1);assert.match(h.downloads[0].name,/\.xlsx$/);
  const workbook=X.read(new Uint8Array(await h.downloads[0].blob.arrayBuffer()),{type:'array'});
  assert.ok(workbook.SheetNames.includes('Inputs'),'actual workbook survives download');
  h.widget.openExportModal(ID);await h.widget.exportProformaXlsx(ID);visible(h,view);
  assert.equal(h.downloads.length,2,'repeat export with cached options succeeds');assert.equal(h.writes.length,0);
}
{
  let denied=true;const h=await setup({read:async config=>config.report_name==='All_Property'&&denied?{code:2898,message:'Denied'}:undefined});
  h.widget.showView('vEdit');h.widget.openExportModal(ID);
  assert.equal(await h.widget.exportProformaXlsx(ID),false);visible(h,'vEdit');
  assert.equal(h.downloads.length,0);assert.equal(h.widget.pfReferencesReady(),false);
  denied=false;await h.widget.exportProformaXlsx(ID);visible(h,'vEdit');assert.equal(h.downloads.length,1);
}
{
  const h=await setup();h.widget.openExportModal(ID);
  h.widget.S.xlsxLib={...X,write(){throw new Error('Workbook write failed');}};
  await h.widget.exportProformaXlsx(ID);visible(h,'vList');assert.equal(h.downloads.length,0);
  assert.equal(h.node('exportModal').classList.contains('show'),true);
  assert.match(h.node('exStatus').textContent,/Could not build the workbook/);
  assert.ok([...h.document.querySelectorAll('#exportModal .ex-choice')].every(button=>!button.disabled));
  h.widget.S.xlsxLib=X;await h.widget.exportProformaXlsx(ID);visible(h,'vList');assert.equal(h.downloads.length,1);
}
{
  const gate=held(),h=await setup({read:async config=>{if(config.report_name==='All_Property')await gate.promise;}});
  let actions=0;const pending=h.widget.pfReferenceAction(()=>{actions++;});await drain();
  h.widget.S.navigationGeneration++;h.widget.showView('vApprovals');h.node('statusTxt').textContent='Ready';gate.resolve();
  assert.equal(await pending,false);visible(h,'vApprovals');assert.equal(actions,0,'superseded action cannot navigate or export');
}
console.log('PASS PF export loading: cold/warm XLSX, unchanged mounted report/search/scroll/draft/status, dialog-only loading, failed-reference/workbook retry, no header refresh or writes.');
