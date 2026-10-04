// Existing extracted business fixtures use the actual PF source guard and native
// controller. Only the startup SDK boundary is synthetic; readiness is not stubbed.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
export async function installPFReadiness(context){
 context.window=context;
 context.setTimeout??=setTimeout;context.clearTimeout??=clearTimeout;
 context.ZOHO={CREATOR:{UTIL:{getInitParams:async()=>({envUrlFragment:'',loginUser:'fixture@example.test'})}}};
 for(const file of ['runtime-context.js','creator-data.js','pf-controller.js'])vm.runInContext(fs.readFileSync('widgets/proforma-manager/src/app/'+file,'utf8'),context,{filename:file});
 context.PFTransport=context.LMPFPreparation.create({dirty:()=>!!(context.S.ed&&(context.S.ed.dirty||context.S.ed.loiDirty))});
 await context.PFTransport.start();
 context.S.coreReady=true;context.S.coreFailed=false;context.S.useMock=false;
 const source=fs.readFileSync('widgets/proforma-manager/src/app/widget.html','utf8'),start=source.indexOf('function pfPublicReady('),end=source.indexOf('\n',start);
 assert.ok(start>=0&&end>start);vm.runInContext(source.slice(start,end),context);
 assert.equal(context.pfPublicReady(),true);
 context.S.coreReady=false;assert.equal(context.pfPublicReady(),false);context.S.coreReady=true;
 assert.equal(context.PFTransport.noteDraft(),true);
}
