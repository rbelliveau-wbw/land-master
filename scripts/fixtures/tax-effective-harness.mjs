// Actual effective-source fixture; no source transformations or native writes.
import vm from 'node:vm';
import assert from 'node:assert/strict';

import {source,extract} from './tax-source.mjs';
const fn=name=>extract(source,name);
const drain=async()=>{for(let i=0;i<6;i++)await new Promise(resolve=>setImmediate(resolve));};
const ID='90071992547409941',ID2='90071992547409942';
function element(){const values=new Set();return {value:'',innerHTML:'',textContent:'',style:{},dataset:{},classList:{contains:v=>values.has(v),add(...v){v.forEach(x=>values.add(x));},remove(...v){v.forEach(x=>values.delete(x));},toggle(v,on){on?values.add(v):values.delete(v);}},setAttribute(){},querySelector(){return null;}};}
export function harness(names=[]){
  const nodes=new Map(),messages=[],sdkCalls=[],writes=[],marks=[];
  const input=element();input.classList.add('cell-input');
  const state={loadToken:0,countToken:0,referenceLoaded:true,loading:false,rowsLoaded:true,rowsDirty:false,searchResultExpectedCount:null,lastSearchCriteria:'',
    search:'',yearFilter:'All',countyFilters:[],companyFilters:[],subdivisionFilters:[],statusFilters:[],arbFilters:[],agOnly:false,
    sortMode:'workflow',colSort:{key:'id',dir:'asc'},page:1,activeTab:'parcels',bulkSelectedIds:{},bulkSaving:false,savingIds:{},
    facetCounts:{},facetCountsLoading:{},facetCountsInflight:{},facetCountTokens:{},serverCounts:{currentTotal:null,allTotal:999,status:{},ag:null},
    data:{parcelYears:[],rawLand:[],subdivisions:[],companies:[],projects:[],jurisdictions:[]}};
  const context=vm.createContext({state,CONFIG:{maxAutoRows:800,countDebounceMs:450,countDelayMs:125,countRetries:0,searchRescuePasses:1,stablePasses:1,rescuePasses:0,pageSize:100,pageRetries:0,pageDelayMs:150,rowPageDelayMs:650,facetCountMax:60,reports:{parcelYears:'All_Tax_Parcel_Years',rawLand:'All_Property',companies:'All_Companies',subdivisions:'All_Subdivisions',jurisdictions:'All_Taxing_Jurisdictions',projects:'All_Projects'}},
    CLIENT_PAGE_SIZE:100,STATUS_LIST:['Awaiting Assessment'],STATUS_DOT:{},ARB_LIST:['','No','Yes'],
    FACET_IGNORE:{status:'ignoreStatus'},FACET_RENDER:{},_facetRepainting:false,_facetOpen:null,_didPreloadFacets:true,_countsDebounceTimer:null,
    $(id){if(id==='mainSearch')return null;if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);},
    window:{},document:{activeElement:input,querySelectorAll:()=>[],querySelector:()=>null},
    setTimeout(){return 1;},clearTimeout(){},delay:async()=>{},diag(){},
    setMessage(text,kind){state.loadMessage=text;messages.push({text,kind});},describeResp:e=>e?.message||String(e),
    setLoadProgress(){},clearLoadProgress(){},enrichAndResolveDisplayNames(){},refreshProductionCounts(){},renderAll(){},
    renderFooter(){},updateSortIndicators(){},renderSaveIndicator(){},renderSummaryStrip(){},updateTabCounts(){},renderYearSwitcher(){},renderStatusFacetDrop(){},
    populateCountyDatalist(){},populateCompanySelect(){},preloadSmallFacetCounts(){},
    normalizeSearchInput:v=>String(v),buildParcelCriteria:()=>state.search||'current-scope',andCriteria:parts=>parts.filter(Boolean).join(' && '),
    getValue:(row,keys)=>{for(const key of keys)if(row&&Object.hasOwn(row,key))return row[key];return '';},
    displayValue:v=>v==null?'':typeof v==='object'?String(v.zc_display_value||v.display_value||v.ID||''):String(v),
    normalizeId:v=>v==null?'':typeof v==='object'?String(v.ID||''):String(v),cleanText:v=>String(v==null?'':v).trim(),
    lookupDisplay:v=>v&&typeof v==='object'?String(v.zc_display_value||v.display_value||''):String(v||''),lookupId:v=>v&&typeof v==='object'?String(v.ID||''):String(v||''),
    numericValue:v=>Number(String(v||'').replace(/[$,]/g,''))||0,normalizeStatusName:v=>String(v||'Awaiting Assessment'),truthyYes:v=>v===true||v==='true',normalizeArb:v=>String(v||''),
    effectiveValue:r=>r.appraisedValue||0,compareByColumn:(a,b)=>String(a.id).localeCompare(String(b.id)),companyMatchesFilters:()=>true,selectedContains:(list,v)=>list.includes(v),statusMatchesFilters:()=>true,
    esc:v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),jsArg:v=>String(v),toDateInput:()=>'',utilitiesconvertIntegerToCurrency:String,arbLabel:String,money:String,
    inlineSourceElement:()=>input,inlineStateKey:(el,id,fields)=>id+'|'+Object.keys(fields)[0],markInlineState(el,value,key){marks.push({el,value,key});if(el)el.classList.add(value);},applyCodeAndPropertyLink(){},
    updateRecord:async(id,data)=>{writes.push({id,data});return {code:3000,data:{ID:String(id)}};},
    isPermanentCriteriaError:()=>false,isRateLimitError:()=>false,isTransientSdkError:()=>false,
    ZOHO:{CREATOR:{API:{getRecordCount:async args=>{sdkCalls.push({method:'count',args});return {code:3000,result:{records_count:'152'}};},getAllRecords:async args=>{sdkCalls.push({method:'rows',args});return {code:3000,data:[]};}}}},
  });
  context.window.ZOHO=context.ZOHO;
  for(const name of names)vm.runInContext(fn(name),context);
  return {context:capture(context),nodes,messages,sdkCalls,writes,marks,input};
}
function capture(c){return c;}
