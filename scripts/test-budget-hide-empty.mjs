import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('widgets/budget-manager/src/app/widget.html','utf8');
function extract(name){const start=source.indexOf('function '+name+'(');assert.ok(start>=0);return source.slice(start,source.indexOf('\n}',start)+2);}
function classes(){const set=new Set();return {toggle:(key,on)=>on?set.add(key):set.delete(key),contains:key=>set.has(key)};}
function row(id,text,multi=false){return {dataset:multi?{budgetItemIds:id}:{iid:id},textContent:text,classList:classes()};}
function category(dept,rows){return {dataset:{dept},style:{},querySelectorAll:()=>rows};}
const rows=[row('zero','Empty'),row('credit','Reimbursement'),row('actual','Actual only'),row('mod','Modified'),row('p1,p2','Across phases',true),row('draft','Per unit draft'),row('missing','Unknown')];
const categories=[category('dev',rows.slice(0,4)),category('eng',rows.slice(4)),category('con',[row('zero2','Unused')])];
const items={zero:{ID:'zero',Per_Unit:0},zero2:{ID:'zero2'},credit:{ID:'credit',Budget_Ttl:'($1,250.50)'},actual:{ID:'actual',HCSS_Actuals:'0.01'},mod:{ID:'mod'},p1:{ID:'p1'},p2:{ID:'p2',Unapproved_Final_Budget_Ttl:1},draft:{ID:'draft',_perUnit:true}};
const modifications={mod:[{amount:500},{amount:-500}]};
const elements={itemSearch:{value:''},budgetHideEmpty:{classList:classes(),setAttribute(k,v){this[k]=v;}},budgetEmptyItems:{hidden:true}};
const context={S:{catFilter:'all',hideEmptyItems:true},$:id=>elements[id],document:{querySelectorAll:()=>categories},cleanVal:v=>String(v??'').trim(),budgetModsReady:()=>true,modsForItem:id=>modifications[id]||[],modSignedAmount:m=>m.amount,findItemById:id=>items[id]||null};
vm.createContext(context);
vm.runInContext(['budgetUnitNumber','budgetItemHasAmounts','applyBudgetItemFilters'].map(extract).join('\n'),context);
const hidden=r=>r.classList.contains('search-hidden');
context.applyBudgetItemFilters();
assert.equal(hidden(rows[0]),true,'native numeric zero per-unit default must not keep an empty row');
for(const r of rows.slice(1))assert.equal(hidden(r),false,'keep credits, any actuals, cancelling modifications, other phases, drafts and unknown data');
assert.equal(categories[2].style.display,'none','hide categories with no nonempty items');
assert.equal(elements.budgetHideEmpty['aria-checked'],'true');
assert.equal(elements.budgetEmptyItems.hidden,true);
elements.itemSearch.value='Actual';context.applyBudgetItemFilters();
assert.equal(hidden(rows[2]),false);assert.equal(hidden(rows[1]),true);
assert.equal(categories[1].style.display,'none','search and Hide Empty compose');
context.S.catFilter='eng';context.applyBudgetItemFilters();
assert.equal(categories[0].style.display,'none','category selection cannot be undone by filtering');
assert.equal(elements.budgetEmptyItems.hidden,false,'show a concise no-matches state');
elements.itemSearch.value='';context.S.catFilter='all';context.S.hideEmptyItems=false;context.applyBudgetItemFilters();
assert.equal(hidden(rows[0]),false,'switch off restores all zero rows');
assert.equal(categories[2].style.display,'');
assert.equal(elements.budgetHideEmpty['aria-checked'],'false');
context.S.hideEmptyItems=true;context.budgetModsReady=()=>false;context.applyBudgetItemFilters();
assert.equal(hidden(rows[0]),false,'incomplete modification data cannot hide a row');
assert.match(source,/data-budget-item-ids/,'all-phase rows retain native item identities');
console.log('Budget Hide Empty: phase/all-phase values, credits, actuals, cancelling modifications, drafts, unknown data, search, categories and restoration passed.');
