import assert from 'node:assert/strict';
import {ready,ID,drain} from './fixtures/proforma-sdk-v2-harness.mjs';

function activate(h){h.widget.S.dash={id:ID};h.document.getElementById('vDash').classList.add('show');}
const reads=h=>h.calls.filter(c=>c.method==='records'&&c.config.report_name==='Comment_Log_Report'&&c.config.criteria==='(Pro_Forma == '+ID+')').length;
for(const env of ['DEVELOPMENT','PRODUCTION']){
 const h=await ready({env,read:cfg=>{if(cfg.report_name==='Comment_Log_Report')throw {responseText:'{"code":3100,"message":"No records found matching the given criteria."}'};}});
 activate(h);
 assert.deepEqual(JSON.parse(JSON.stringify(await h.widget.loadPfComments(ID,false))),[]);
 for(let i=0;i<100;i++)h.widget.syncPfCommentButton();await drain();
 assert.equal(reads(h),1,'A verified empty thread is cached through repeated badge renders.');
 assert.equal(h.document.getElementById('recCommentCount').textContent,'0');
 assert.equal(Object.hasOwn(h.widget.S.commentRowsByPf,ID),true);
 assert.equal(h.widget.S.commentErrors[ID],undefined);
}
for(const code of [2898,500]){
 let denied=true;
 const h=await ready({read:cfg=>{if(cfg.report_name==='Comment_Log_Report'&&cfg.criteria&&denied)throw {responseText:JSON.stringify({code,message:'Unavailable'})};}});
 activate(h);
 await assert.rejects(h.widget.loadPfComments(ID,false));
 for(let i=0;i<100;i++)h.widget.syncPfCommentButton();await drain();
 assert.equal(reads(h),1,'A failed badge read cannot recursively exhaust the request budget.');
 assert.equal(h.document.getElementById('recCommentCount').textContent,'—');
 assert.equal(Object.hasOwn(h.widget.S.commentRowsByPf,ID),false,'A denial is not cached as zero comments.');
 await assert.rejects(h.widget.loadPfComments(ID,false));assert.equal(reads(h),1);
 denied=false;
 assert.deepEqual(JSON.parse(JSON.stringify(await h.widget.loadPfComments(ID,true))),[],'Explicitly reopening the conversation can retry.');
 assert.equal(reads(h),2);assert.equal(h.widget.S.commentErrors[ID],undefined);
 h.widget.syncPfCommentButton();assert.equal(h.document.getElementById('recCommentCount').textContent,'0');
}
console.log('PASS empty PF conversations cache once; genuine failures stop automatic retries; explicit reopen recovers in Dev and Prod.');
