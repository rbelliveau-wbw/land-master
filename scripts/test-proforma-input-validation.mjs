import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {output} from './build-proforma-input-rules.mjs';
import {saveFixture} from './fixtures/proforma-sdk-v2-save-fixture.mjs';

assert.equal(fs.readFileSync('widgets/proforma-manager/src/app/pf-input-rules.js','utf8'),output,'generated rules match the Creator catalog');
const ctx=vm.createContext({URL,Date,TextEncoder});ctx.window=ctx;
for(const name of ['pf-input-rules.js','pf-input-validation.js'])vm.runInContext(fs.readFileSync('widgets/proforma-manager/src/app/'+name,'utf8'),ctx);
const v=ctx.LMPFInputValidation;
for(const value of ['max@example.com','max+offer@example.co.uk',"o'brien@example.com",'', '  max@example.com  '])assert.equal(v.email(value),true,value);
for(const value of ['max','max@','max@example','Max <max@example.com>','a@b.com;b@c.com','a@b.com, b@c.com','a b@example.com','a..b@example.com','.a@example.com','a@-example.com','a@example..com'])assert.equal(v.email(value),false,value);
for(const value of ['(817) 235-3666','+1 817-235-3666','', '8172353666'])assert.equal(v.phone(value),true,value);
for(const value of ['123','8172353666123','call me','8172353666 ext 2'])assert.equal(v.phone(value),false,value);
for(const value of ['2028-02-29','11/03/2026',''])assert.equal(v.date(value),true,value);
for(const value of ['2026-02-29','2026-04-31','2026-13-01','not a date'])assert.equal(v.date(value),false,value);
assert.equal(v.record('Builder',{Email:'a'.repeat(70)+'@example.com'}).length,1);
assert.equal(v.record('Property',{TerraVault_URL:'javascript:alert(1)'}).length,1);
assert.equal(v.record('Property',{TerraVault_URL:'https://tx.terravault.land/app/wbw-development?x=1&y=2'}).length,0);
assert.equal(v.record('LOI_Worksheet',{Special_Provisions:'é'.repeat(32768)}).length,1,'byte limit, not character count');

function loi(){return {Buyer_Broker:'None',Seller_Broker:'None',Acquisition_Email:'max@example.com',sellerIds:[],propertyIds:[],companyIds:[],propertyAssignments:{},newSellers:[],newProperties:[],_editedSellers:{},_editedProperties:{}};}
const scenarios=[
  ['invalid header number',h=>h.model.Land_Cost_Acre='12abc',/valid number/],
  ['nonfinite money',h=>h.model.Earnest_Money='Infinity',/valid number/],
  ['exponent input',h=>h.model.Land_Sale='1e3',/valid number/],
  ['oversized name',h=>h.model.Name='x'.repeat(256),/255 characters/],
  ['unsafe integer',h=>h.model.Total_Street_LF='9007199254740993',/too large/],
  ['invalid project month',h=>h.model.purchaseDate={y:2026,m:13},/valid month/],
  ['invalid probability',h=>h.model.Probability='Maybe',/supported value/],
  ['installment money',h=>h.model.purchaseInstallments[0].Cost='1.2.3',/valid number/],
  ['PID money',h=>h.model.pidMud=[{Month1:'1',Cost:'NaN'}],/valid number/],
  ['lot pricing',h=>h.model.lotMix[0].Price_LF='bad',/valid number/],
  ['curve percentage',h=>h.model.curve[0].Percent_Cost='50x',/valid number/],
  ['phase rate',h=>h.model.phaseSales[0].Additional_Markup_Pct='10x',/valid number/],
  ['long additional-cost note',h=>h.model.items=[{Description:'x'.repeat(256)}],/255 characters/],
  ['acquisition email',h=>h.widget.S.ed.loi.Acquisition_Email='Max Turner',/Acquisition Email/],
  ['multiple acquisition emails',h=>h.widget.S.ed.loi.Acquisition_Email='a@b.com;b@c.com',/Acquisition Email/],
  ['offer amount',h=>h.widget.S.ed.loi.Earnest_Money='10,00',/valid number/],
  ['offer integer',h=>h.widget.S.ed.loi.Extensions='1.5',/whole number/],
  ['offer date',h=>h.widget.S.ed.loi.Response_Date='2026-02-30',/date/],
  ['offer broker length',h=>h.widget.S.ed.loi.Buyer_Broker='x'.repeat(256),/255 characters/],
  ['offer agreement',h=>h.widget.S.ed.loi.Agreement_Type='Unknown',/supported value/],
  ['new seller email',h=>h.widget.S.ed.loi.newSellers=[{tempId:'s1',Builder_Name:'Seller',Email:'bad'}],/Email/],
  ['new seller phone',h=>h.widget.S.ed.loi.newSellers=[{tempId:'s1',Builder_Name:'Seller',Phone_Number:'123'}],/phone number/],
  ['new seller name',h=>h.widget.S.ed.loi.newSellers=[{tempId:'s1',Builder_Name:'x'.repeat(51)}],/50 characters/],
  ['new property acres',h=>h.widget.S.ed.loi.newProperties=[{tempId:'p1',Common_Name:'Parcel',Acres:'abc'}],/valid number/],
  ['new property URL',h=>h.widget.S.ed.loi.newProperties=[{tempId:'p1',Common_Name:'Parcel',TerraVault_URL:'not a URL'}],/complete http/],
  ['new property county',h=>h.widget.S.ed.loi.newProperties=[{tempId:'p1',Common_Name:'Parcel',County:'Invalid County'}],/supported value/],
  ['missing company',h=>h.widget.S.ed.loi.Company='4410926000000000999',/available company/],
  ['invalid seller association',h=>h.widget.S.ed.loi.newProperties=[{tempId:'p1',Common_Name:'Parcel',sellerRef:'missing'}],/included in this Offer/],
  ['duplicate seller',h=>h.widget.S.ed.loi.newSellers=[{tempId:'s1',Builder_Name:'Same'},{tempId:'s2',Builder_Name:'Same'}],/already exists/],
  ['duplicate property',h=>h.widget.S.ed.loi.newProperties=[{tempId:'p1',Property_ID:'123'},{tempId:'p2',Property_ID:'123'}],/already exists/],
  ['edited seller',h=>{h.widget.S.builders=[{ID:'4410926000000000111',Builder_Name:'Seller',Email:'bad'}];Object.assign(h.widget.S.ed.loi,{sellerIds:['4410926000000000111'],_editedSellers:{'4410926000000000111':true}});},/Email/],
  ['edited property',h=>{h.widget.S.properties=[{ID:'4410926000000000222',Common_Name:'Parcel',County:'Bell',Acres:'bad',TerraVault_URL:'https://example.com'}];Object.assign(h.widget.S.ed.loi,{propertyIds:['4410926000000000222'],_editedProperties:{'4410926000000000222':true}});},/valid number/]
];
for(const [label,change,expected] of scenarios){
  const h=await saveFixture();h.widget.S.ed.loi=loi();h.widget.S.ed.loiDirty=true;change(h);
  const before=h.calls.length;await h.widget.saveProforma();
  const calls=h.calls.slice(before);
  assert.equal(calls.filter(c=>['custom','update','create','delete','upload'].includes(c.method)).length,0,label+' must block BEFORE every write');
  assert.match(JSON.stringify(h.widget.S.ed.errors),expected,label);
  assert.equal(h.widget.S.ed.dirty,true,label+' retains draft');
  assert.equal(h.widget.PFTransport.snapshot().reviews.length,0,label+' does not quarantine a write that never occurred');
}
const h=await saveFixture();
h.model.Acquisition_Email='  max@example.com  ';
assert.equal(h.widget.buildHeaderData(h.model,h.widget.modelToCalc(h.model)).Acquisition_Email,'max@example.com','email validation and header serialization agree');
assert.equal(h.widget.validateLOISubformDraft(loi()).length,0,'optional blanks remain valid');
assert.equal(h.widget.validateLOISubformDraft({...loi(),Acquisition_Email:'  max@example.com  ',Earnest_Money:'10000.123456'}).length,0,'valid precision and surrounding email whitespace');
await h.widget.saveProforma();assert.equal(h.widget.S.ed.dirty,false,'valid financial save still succeeds');
console.log('PASS Pro Forma typed validation: '+scenarios.length+' rejected drafts dispatch zero writes; optional blanks, valid email/phone/date/URL, precision, and valid financial save preserved.');
