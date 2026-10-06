import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('widgets/land-master/src/app/widget.html','utf8');
const actual=name=>source.slice(source.indexOf('function '+name+'('),source.indexOf('\nfunction ',source.indexOf('function '+name+'(')));
const nodes=new Map();
const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',innerHTML:'',style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},focus(){}});return nodes.get(id);};
let checked=[],tableRenders=0,buttonRenders=0;
const S={scope:'props',page:{props:4},filters:{company:['90071992547409931'],county:['Bell']},filterPopupKey:'company',filterDraft:['90071992547409931']};
const c=vm.createContext({S,$:node,document:{querySelectorAll:()=>checked},renderTable(){tableRenders++;},renderFilterButtons(){buttonRenders++;},
  FILTER_DEFS:{company:{options:()=>[{value:'90071992547409931',label:'Fixture Company'},{value:'90071992547409932',label:'Other Company'}]}},esc:String});
for(const fn of ['filterSelections','renderFilterPopupList','syncFilterDraftFromList','closeFilterPopup','applyFilterPopup','clearFilterPopup'])vm.runInContext(actual(fn),c);
node('filterPopupSearch').value='Other';
c.clearFilterPopup();
assert.deepEqual(Array.from(S.filters.company),[],'Clear must reset the applied filter immediately, even with selected values hidden by search');
assert.deepEqual(Array.from(S.filterDraft),[]);assert.deepEqual(S.filters.county,['Bell'],'Clear must preserve other filters');
assert.equal(S.page.props,1);assert.equal(S.filterPopupKey,'company','Clear leaves the menu available for a new selection');
assert.equal(node('filterPopupCount').textContent,'0 selected');assert.equal(tableRenders,1);assert.equal(buttonRenders,1);

// Execute the actual red-X binding, keeping ordinary dismissal separate.
const binding=source.match(/\$\("filterPopupClose"\)\.addEventListener\('click',.*?\);(?=\$\("btnIssues"\))/);
assert.ok(binding,'close button binding exists');
let closeClick;
node('filterPopupClose').addEventListener=(event,fn)=>{assert.equal(event,'click');closeClick=fn;};
vm.runInContext(binding[0],c);
S.filters.company=['90071992547409931'];S.filterDraft=['90071992547409932'];S.filterPopupKey='company';S.page.props=3;
closeClick();
assert.deepEqual(Array.from(S.filters.company),[],'red X clears the applied filter and closes');assert.equal(S.filterPopupKey,null);assert.equal(S.page.props,1);
assert.equal(tableRenders,2);assert.equal(buttonRenders,2);

S.filters.company=['90071992547409931'];S.filterDraft=[];S.filterPopupKey='company';c.closeFilterPopup();
assert.deepEqual(Array.from(S.filters.company),['90071992547409931'],'outside click/Escape discard only the draft');
S.filterPopupKey='company';S.filterDraft=['90071992547409931'];checked=[{value:'90071992547409932',checked:true}];c.applyFilterPopup();
assert.deepEqual(Array.from(S.filters.company),['90071992547409931','90071992547409932'],'Apply preserves selections hidden by search and exact string IDs');
assert.equal(S.filterPopupKey,null);
const renders=tableRenders;c.clearFilterPopup();assert.equal(tableRenders,renders,'clearing without an open filter is harmless');
console.log('Land property filters: immediate Clear/red X, hidden selections, independent filters, paging, Apply and draft dismissal passed.');
