import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const c=vm.createContext({console,Set,Map,BigInt});
for(const file of ['po-domain.js','po-grid.js'])vm.runInContext(fs.readFileSync('widgets/budget-manager/src/app/'+file,'utf8'),c);
const grid=c.LMPOGrid,items=[{id:'2001',code:'C_CB01-4130',label:'C_CB01-4130 · Plan Review',name:'Plan Review'},{id:'2002',code:'C_CB01-4410',label:'C_CB01-4410 · Fire Water Tanks',name:'Fire Water Tanks'}];
let key=0;const newLine=()=>({key:'new-'+(++key),budgetItemId:'',description:'',uom:'EA',costElement:'5',pricingMode:'Calculated',quantity:null,unitPrice:null,finalAmount:null});
const initial=[{...newLine(),budgetItemId:'2001',description:'Original',quantity:'2',unitPrice:'1.25',finalAmount:'2.50'}];
const rows=grid.parse('C_CB01-4130-5\tPlan Review\t"A\tB\nC"\t2\tEA\t5\t$1,234.56\t2469.12\r\nC_CB01-4410\tFire Water Tanks\tTank\t1.5\tEA\t5\t10.00\t15.00\r\n');
const result=grid.paste(initial,{row:0,col:0},rows,items,newLine);
assert.equal(result.length,2);assert.equal(result[0].description,'A\tB\nC');assert.equal(result[0].unitPrice,'1234.56');assert.equal(result[0].finalAmount,'2469.12');assert.equal(result[1].budgetItemId,'2002');assert.equal(initial[0].description,'Original','Paste is atomic and does not mutate source');
assert.equal(grid.parse(grid.copy(result,{r0:0,r1:1,c0:0,c1:7},items))[0][2],'A\tB\nC');
const filled=grid.fill(result,{r0:0,r1:1,c0:2,c1:6},items,newLine);assert.equal(filled[1].quantity,'2');assert.equal(filled[1].finalAmount,'2469.12');assert.equal(filled[1].budgetItemId,'2002');
const manual=grid.paste(result,{row:0,col:7},[['55.01']],items,newLine);assert.equal(manual[0].pricingMode,'Manual');assert.equal(manual[0].quantity,null);assert.equal(manual[0].unitPrice,null);
const manualRoundtrip=grid.paste(initial,{row:0,col:0},grid.parse(grid.copy(manual,{r0:0,r1:0,c0:0,c1:7},items)),items,newLine);assert.equal(manualRoundtrip[0].finalAmount,'55.01');assert.equal(manualRoundtrip[0].pricingMode,'Manual');
assert.throws(()=>grid.paste(initial,{row:0,col:3},[['2','EA','5','10','1']],items,newLine),/Total differs/);
assert.throws(()=>grid.paste(initial,{row:0,col:1},[['Changed name']],items,newLine),/cannot be edited/);
assert.throws(()=>grid.paste(initial,{row:0,col:0},[['Unavailable code']],items,newLine),/eligible budget item/);
assert.throws(()=>grid.paste(initial,{row:0,col:4},[['FAKE']],items,newLine),/UOM/);
assert.throws(()=>grid.paste(initial,{row:0,col:5},[['6']],items,newLine),/ELEM/);
assert.throws(()=>grid.paste(initial,{row:0,col:6},[['=SUM(A1:A2)']],items,newLine),/formulas/);
assert.throws(()=>grid.paste(initial,{row:0,col:6},[['1,25']],items,newLine),/grouping/);
assert.throws(()=>grid.paste(initial,{row:0,col:6},[['1.001']],items,newLine),/two decimal/);
assert.throws(()=>grid.parse('"unfinished'),/unfinished/);
assert.equal(grid.paste(initial,{row:0,col:2},Array.from({length:250},()=>['test']),items,newLine).length,250);
assert.throws(()=>grid.paste(initial,{row:1,col:2},Array.from({length:250},()=>['test']),items,newLine),/250-line/);
assert.equal(initial.length,1,'Every rejected range leaves existing rows intact');
console.log('PO grid: quoted Excel ranges, atomic validated 250-row paste, exact calculations, fill-down, manual totals, immutable item names and rejected input passed.');
// Actual grid event handlers: a typed edit is one Undo transaction, separate from paste.
const handlers=new Map(),buttons={};let rendered=0,focused=null;
const model={gridMode:'excel',lines:result.map(l=>({...l}))};
const noClasses={toggle(){}};
function node(row,col){return {dataset:{poRow:String(row),poCol:String(col)},classList:noClasses,closest(selector){return selector==='[data-po-cell]'?this:null;},focus(){focused={row,col};},scrollIntoView(){},select(){},hasAttribute(){return false;}};}
const container={classList:noClasses,addEventListener(type,fn){handlers.set(type,fn);},querySelectorAll(){return [];},querySelector(selector){if(selector.includes('data-po-grid-fill'))return buttons.fill;if(selector.includes('data-po-grid-undo'))return buttons.undo;if(selector.includes('data-po-grid-status'))return {textContent:''};const match=selector.match(/data-po-row="(\d+)".*data-po-col="(\d+)"/);return match?node(Number(match[1]),Number(match[2])):null;}};
function event(target,extra={}){return {target,key:'',prevented:false,preventDefault(){this.prevented=true;},stopPropagation(){},...extra};}
function command(name){return {disabled:true,closest(selector){return selector==='[data-po-grid-'+name+']'?this:null;},click(){handlers.get('click')(event(this));}};}
buttons.fill=command('fill');buttons.undo=command('undo');
const bound=grid.bind({container,model:()=>model,items:()=>items,displayItems:()=>items,newLine,locked:()=>false,busy:()=>false,render(){rendered++;bound.paint();},error(message){throw Error(message);}});bound.paint();
const quantity=node(0,3);handlers.get('focusin')(event(quantity));handlers.get('input')(event(quantity));model.lines[0].quantity='7';model.lines[0].finalAmount='8641.92';handlers.get('input')(event(quantity));model.lines[0].quantity='72';model.lines[0].finalAmount='88888.32';
assert.equal(buttons.undo.disabled,false);buttons.undo.click();assert.equal(model.lines.length,2);assert.equal(model.lines[0].quantity,'2');assert.equal(model.lines[0].finalAmount,'2469.12');assert.equal(buttons.undo.disabled,true,'Typing within one cell is one Undo transaction');
handlers.get('focusin')(event(node(1,6)));handlers.get('keydown')(event(node(1,6),{key:'ArrowLeft'}));assert.deepEqual(focused,{row:1,col:5},'Tab/focus entry updates the active cell before navigation');
const description=node(0,2);handlers.get('focusin')(event(description));handlers.get('dblclick')(event(description));const arrow=event(description,{key:'ArrowLeft'});handlers.get('keydown')(arrow);assert.equal(arrow.prevented,false,'Double-click keeps arrow keys in the text editor');
assert.equal(rendered,1);console.log('Spreadsheet event regressions: grouped typed Undo, preserved rows/totals, keyboard focus entry and double-click text editing passed.');
