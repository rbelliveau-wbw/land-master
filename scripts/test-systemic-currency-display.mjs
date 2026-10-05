import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sources=Object.fromEntries(['contract-management','land-master','settings-manager'].map(widget=>[widget,fs.readFileSync('widgets/'+widget+'/src/app/widget.html','utf8').replace(/\r\n/g,'\n')]));
function actual(widget,name){const source=sources[widget],a=source.indexOf('function '+name+'('),b=source.indexOf('\nfunction ',a+1);assert.ok(a>=0&&b>a,widget+'.'+name);return source.slice(a,b);}
function context(widget,names){const c=vm.createContext({});if(widget==='settings-manager'){c.window=c;vm.runInContext(fs.readFileSync('widgets/settings-manager/src/app/settings-controller.js','utf8'),c);}for(const name of names)vm.runInContext(actual(widget,name),c);return c;}
const legal=context('contract-management',['money','numMoney','moneyEdit','moneyRaw']),land=context('land-master',['moneyText','landCreateDecimal','num','fmt']),settings=context('settings-manager',['str','numStr','moneyStr','fmtMoney','readControl']);
for(const c of [legal,land]){
  const show=c.money||c.moneyText;
  for(const [raw,expected]of [['12500109.92','$12,500,109.92'],['$ 12,500,109.920000','$12,500,109.92'],['1,200.25','$1,200.25'],[0,'$0.00'],['-1234.56','-$1,234.56'],['12.345678','$12.35'],['','—'],[null,'—'],['invalid','—']])assert.equal(show(raw),expected);
  for(const raw of ['-$1,234.56','$-1,234.56','($ 1,234.56)','−$1,234.56','$ −1,234.56','−1234.56'])assert.equal(show(raw),'-$1,234.56',raw+' preserves its credit sign');
  for(const raw of ['-$-1,234.56','(-$1,234.56)','$1,23.45','($1,234.56','1,234.56)','1e3'])assert.equal(show(raw),'—',raw+' is malformed');
  for(const [raw,expected]of [[0.0000004,'$0.00'],[1e21,'$1,000,000,000,000,000,000,000.00'],[-1e21,'-$1,000,000,000,000,000,000,000.00']])assert.equal(show(raw),expected,'Finite numeric calculations still display money');
}
// Execute the same focus/blur money round trip as the mounted Legal controls.
for(const [raw,expected]of [['12500109.920000','$12,500,109.920000'],['12.345678','$12.345678'],['9007199254740993.123456','$9,007,199,254,740,993.123456'],['.004','$0.004'],['-0.125000','-$0.125000'],['1200','$1,200.00']]){
  let displayed=legal.moneyEdit(raw);assert.equal(displayed,expected);
  for(let i=0;i<3;i++){const focused=legal.moneyRaw(displayed);displayed=legal.moneyEdit(focused);assert.equal(displayed,expected,'Focus/blur does not round or alter the captured decimal text');}
}
assert.equal(legal.moneyRaw('$ 12,500,109.920000'),'12500109.920000');
assert.equal(legal.moneyRaw(0.0000004),'0.0000004');assert.equal(legal.moneyEdit(0.0000004),'$0.0000004');assert.equal(legal.numMoney(0.0000004),0.0000004);
for(const credit of ['-$12,345,678.123456','($12,345,678.123456)','−$12,345,678.123456','$ −12,345,678.123456']){
  assert.equal(legal.moneyRaw(credit),'-12345678.123456');assert.equal(legal.moneyEdit(credit),'-$12,345,678.123456');assert.equal(legal.numMoney(credit),-12345678.123456);
}
assert.equal(legal.moneyEdit('not a number'),'not a number','Formatting cannot silently turn invalid input into zero');
assert.equal(legal.moneyEdit(''),'');
assert.ok(sources['contract-management'].includes('moneyEdit(p.Price_per_Ft||"")'),'Pricing editable values bypass numeric conversion before formatting');
assert.ok(sources['contract-management'].includes('onfocus="this.value=moneyRaw(this.value);this.select()"'));
assert.ok(sources['contract-management'].includes('onblur="this.value=moneyEdit(this.value)"'));

// Settings formats this actual editable money control on render/reload and blur.
// The actual readControl must retain every decimal digit in its autosave payload.
for(const [raw,expected]of [['12500109.920000','12,500,109.920000'],['12.345678','12.345678'],['9007199254740993.123456','9,007,199,254,740,993.123456'],['.004','0.004'],['-0.125000','-0.125000'],['1200','1,200.00'],['0','0.00']]){
  let value=settings.fmtMoney(raw);assert.equal(value,expected);value=settings.fmtMoney(value);assert.equal(value,expected);
  const control={value,getAttribute:key=>key==='data-f'?'COO_Approval_Threshold':key==='data-t'?'money':''};
  const captured=settings.readControl(control);assert.equal(captured.f,'COO_Approval_Threshold');assert.equal(captured.v,settings.numStr(expected));
}
assert.equal(settings.fmtMoney(''),'');assert.equal(settings.fmtMoney('invalid'),'invalid');
for(const credit of ['-$12,345,678.123456','($12,345,678.123456)','−$12,345,678.123456','$ −12,345,678.123456']){
 const value=settings.fmtMoney(credit);assert.equal(value,'-12,345,678.123456');
 assert.equal(settings.readControl({value,getAttribute:key=>key==='data-f'?'COO_Approval_Threshold':key==='data-t'?'money':''}).v,'-12345678.123456');
}
for(const invalid of ['-$-12.34','(-$12.34)','$12,34.56','($12.34','1e3'])assert.equal(settings.fmtMoney(invalid),invalid,'Malformed money remains visible for correction');
assert.equal(settings.numStr('1,234.5678%'),'1234.5678','Generic count/percentage cleaning is unchanged');
assert.ok(sources['settings-manager'].includes('if(el.getAttribute&&el.getAttribute("data-t")==="money") el.value=fmtMoney(el.value);'));
assert.equal(land.fmt('12.345678'),'12','Generic Land count formatter keeps its existing whole-number semantics');
console.log('PASS currency display: Legal/Land native grouped USD values retain cents; Legal focus/blur and Settings actual money control preserve all fractional text without rounding or changing generic count formatting.');
