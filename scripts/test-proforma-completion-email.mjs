import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the actual function bodies offline; sendmail and Creator records are fixtures.
// This verifies behavior but is not a substitute for Creator compilation.
const adapter = fs.readFileSync('scripts/lib/deluge-pdf-test-runtime.mjs', 'utf8');
const translate = vm.runInNewContext(adapter.slice(adapter.indexOf('function translate('), adapter.indexOf('export function packetRuntime')) + ';translate');
function runtime(rows, status = 'Pending Approval', failMail = false) {
  const context = vm.createContext({ rows: structuredClone(rows), parent: { ID: 1, Name: 'Test <Pro Forma>', Status: status }, failMail });
  vm.runInContext(`
    var mails=[], thisapp={};
    function ifnull(v,f){return v==null?f:v;}
    function List(){return [];}
    function Map(){return {put(k,v){this[k]=v;},get(k){return this[k]??null;}};}
    Array.prototype.add=function(v){this.push(v);};
    Array.prototype.size=Array.prototype.count=function(){return this.length;};
    Array.prototype.contains=function(v){return this.includes(v);};
    Array.prototype.toString=function(sep){return this.join(sep??',');};
    String.prototype.toLong=function(){return Number(this);};
    String.prototype.contains=function(v){return this.includes(v);};
    String.prototype.replaceAll=function(a,b){return this.replace(new RegExp(a,'g'),b);};
    String.prototype.toFile=function(name){return {name,content:this.toString()};};
    function query(form,predicate,sort){
      let records=Array.from(form==='Add_Pro_Forma'?[parent]:form==='Budget_Approvals'?rows:[]).filter(predicate);
      if(sort)records.sort((a,b)=>a[sort]-b[sort]);
      return new Proxy(records,{
        get(a,k){return k in a || typeof k==='symbol'?a[k]:a[0]?.[k]??null;},
        set(a,k,v){a[0][k]=v;return true;}
      });
    }
    var zoho={adminuserid:'admin@example.com',currenttime:{toString(){return 'Sep 30, 2026 12:00';}},currentdate:{toString(){return '2026-09-30';}}};
    thisapp.PF_Packet_Escape=v=>v.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
    thisapp.PF_Packet_Money=v=>'$'+v;
    thisapp.PF_Packet_Number=v=>v;
    thisapp.PF_Get_Proforma_LOI_Snapshot=()=>{let m=Map();m.put('success',true);return m;};
    thisapp.PF_Build_Proforma_Approval_PDF=()=>{let m=Map();m.put('success',true);m.put('pdfText','PDF');return m;};
    function sendMail(to,subject,message,attachment){if(failMail)throw Error('Mail unavailable');mails.push({to,subject,message,attachment});}
  `, context);
  for (const name of ['Send_Proforma_Approval_Email_With_Context', 'Handle_Proforma_Approval_Action']) {
    let source = fs.readFileSync(`creator/functions/${name}.dg`, 'utf8');
    source = source.replace(/sendmail\s*\[([\s\S]*?)\]/g, (_, body) => {
      const field = key => body.match(new RegExp(`(?:^|\\n)\\s*${key}\\s*:(.*)`))[1].trim();
      const attachment = body.match(/Attachments\s*:file:(.*)/)?.[1].trim() ?? 'null';
      return `sendMail(${field('to')},${field('subject')},${field('message')},${attachment});`;
    });
    const compiled = translate(source);
    vm.runInContext(compiled.js + `;thisapp.${name}=${name};`, context);
  }
  return { context, run: code => vm.runInContext(code, context) };
}
const row = (id, order, status, email = `person${id}@example.com`) => ({ ID:id, Proforma:1, Sort_Order:order, Status:status, Title:`Role <${id}>`, Approver:email, Sent_Date:'original', Responded_Date:null });
const invoke = rt => rt.run('thisapp.Handle_Proforma_Approval_Action("1","3","Approve","")');
let rt = runtime([row(1,1,'Approved',' SAME@example.com '),row(2,2,'Approved','same@example.com'),row(3,3,'Pending')]);
let result = invoke(rt);
assert.equal(result.success, true);
assert.equal(result.completionEmailSent, true, JSON.stringify(result));
assert.equal(rt.context.parent.Status, 'Approved');
assert.equal(rt.context.mails.length, 1);
assert.deepEqual(Array.from(rt.context.mails[0].to), ['same@example.com','person3@example.com']);
const mail = rt.context.mails[0];
assert.match(mail.subject, /fully approved.*Ready for Legal Module/);
assert.match(mail.message, /ready to be submitted to the <b>Legal Module/);
assert.match(mail.message, /Test &lt;Pro Forma&gt;/);
for (const id of [1,2,3]) assert.ok(mail.message.includes(`Role &lt;${id}&gt;`));
assert.match(mail.message, /Sep 30, 2026 12:00/);
assert.match(mail.message, /Open Pro Forma/);
assert.doesNotMatch(mail.message, /action1=Approve|action1=Deny|now pending with you|Approve records/);
assert.ok(mail.attachment);
assert.equal(rt.context.rows[2].Sent_Date, 'original', 'Completion must preserve the request delivery stamp');
assert.equal(invoke(rt).success, false);
assert.equal(rt.context.mails.length, 1, 'Replaying final approval must not send another email');

rt = runtime([row(1,1,'Approved'),row(3,2,'Pending'),row(4,3,'Not Sent')]);
result = invoke(rt);
assert.equal(result.success, true);
assert.equal(rt.context.parent.Status, 'Pending Approval');
assert.equal(rt.context.mails.length, 1);
assert.equal(rt.context.mails[0].to, 'person4@example.com');
assert.match(rt.context.mails[0].message, /action1=Approve/);
assert.doesNotMatch(rt.context.mails[0].subject, /fully approved/);

rt = runtime([row(1,1,'Not Sent'),row(3,3,'Pending')]);
assert.equal(invoke(rt).success, false);
assert.equal(rt.context.parent.Status, 'Pending Approval');
assert.equal(rt.context.rows[1].Status, 'Pending');
assert.equal(rt.context.mails.length, 0);

for (const missingEmail of [false,true]) {
  rt = runtime([row(1,1,'Approved',missingEmail?'':'person1@example.com'),row(3,2,'Pending')], 'Pending Approval', !missingEmail);
  result = invoke(rt);
  assert.equal(result.success, true);
  assert.equal(result.completionEmailSent, false);
  assert.ok(result.notificationWarning);
  assert.equal(rt.context.parent.Status, 'Approved');
  assert.equal(rt.context.rows[1].Status, 'Approved');
  assert.equal(rt.context.mails.length, 0);
  assert.equal(invoke(rt).success, false);
}
console.log('Pro Forma completion email regression checks passed.');
