import vm from 'node:vm';
import assert from 'node:assert/strict';
import {source,extract} from './fixtures/tax-source.mjs';
import {harness} from './fixtures/tax-effective-harness.mjs';
const h=harness(['normalizeArb','arbCountKey','arbitrateCriteria','facetClauseFor','refreshFacetCounts','facetCount','getFilteredRows']),c=h.context;
c.FACET_IGNORE={arb:'ignoreArb'};c.FACET_RENDER={};c.zcQuote=value=>JSON.stringify(value);let criteria='(Tax_Year == "2026")',calls=[];
c.buildParcelCriteria=()=>criteria;c.fetchRecordCount=async(report,scope)=>{calls.push(scope);return scope.includes('== null')?3:scope.includes('== "No"')?1:2;};
const options=['','No','Yes'].map(value=>({value,key:c.arbCountKey(value)}));
assert.match(c.arbitrateCriteria(''),/Arbitrate1 == null/);assert.equal(c.facetClauseFor('arb',options[0]),c.arbitrateCriteria(''));
// Native null, empty and undecided normalized rows are a single, meaningful bucket.
c.state.lastSearchCriteria=criteria;c.state.searchResultExpectedCount=6;c.state.data.parcelYears=[null,'','Undecided','No','Yes','Yes'].map((v,i)=>({id:String(90071992547409940n+BigInt(i)),arbitrate:c.normalizeArb(v),taxYear:'2026',status:'Awaiting Assessment',county:'Fixture'}));
await c.refreshFacetCounts('arb',options);assert.equal(c.facetCount('arb','__blank__'),'3');assert.equal(c.facetCount('arb','No'),'1');assert.equal(c.facetCount('arb','Yes'),'2');assert.equal(calls.length,3,'counts come from Creator for the exact current base criteria');
c.state.arbFilters=[''];assert.equal(c.getFilteredRows().length,3);c.state.arbFilters=['Yes'];assert.equal(c.getFilteredRows().length,2);
criteria='(Tax_Year == "2025")';assert.equal(c.facetCount('arb','__blank__'),'—','old scope counts cannot render under a new filter');
// A page, dirty scope or an Arbitrate-filtered subset must use the exact server clauses.
c.state.rowsDirty=true;await c.refreshFacetCounts('arb',options);assert.equal(calls.length,6);assert.match(calls[0],/== null/);assert.equal(c.facetCount('arb','__blank__'),'3');
criteria='unavailable';c.fetchRecordCount=async()=>{throw Error('Native count denied')};await c.refreshFacetCounts('arb',options);assert.equal(c.facetCount('arb','__blank__'),'—');assert.equal(c.state.facetCounts.arb.unavailable,true);
// The row filter builder calls the same clause; evaluate the real builder with native lookup boundaries.
vm.runInContext(extract(source,'buildParcelCriteria'),c);c.canonicalKey=x=>String(x);c.lookupId=x=>String(x);c.orCriteria=parts=>'('+parts.join(' || ')+')';c.searchNeedleCriteria=()=>'';c.state.yearFilter='All';c.state.arbFilters=[''];
assert.match(c.buildParcelCriteria(),/Arbitrate1 == null/);assert.ok(c.buildParcelCriteria().includes(c.arbitrateCriteria('')));
console.log('PASS Tax Arbitrate exact complete-scope counts, normalized blank row filters, shared null criterion, stale cache exclusion, incomplete/denied counts stay unknown.');
