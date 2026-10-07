// Offline execution for forecast Deluge and its exported native input workflows.
// This adapter is test-only; a successful Creator Save is still the compiler check.
import vm from 'node:vm';
import {translate} from './deluge-pdf-test-runtime.mjs';

export const date = value => Date.parse(value+'T00:00:00Z');
export function forecastRuntime(source,tables,today='2026-10-07') {
  const structures=[];
  const insert = source.replace(/insert into (\w+)\s*\[([\s\S]*?)\];/g,(whole,form,body)=>{
    const fields=body.trim().split('\n').map(line=>line.trim()).filter(Boolean).map(line=>line.replace(/^(\w+)=/,'$1:'));
    const token='INSERTSTRUCT'+structures.length+'TOKEN';structures.push('{'+fields.join(',')+'}');
    return 'insert("'+form+'",'+token+');';
  });
  let {js}=translate(insert);
  js=js.replace(/INSERTSTRUCT(\d+)TOKEN/g,(whole,index)=>structures[Number(index)]);
  js=js.replace(/\.sum\((\w+)\)/g,'.sum("$1")').replace(/\.count\(ID\)/g,'.count()').replace(/\bFALSE\b/g,'false').replace(/\bTRUE\b/g,'true').replace(/Forecast_Year\.Forecast_Months\(\)/g,'monthRowNew()');
  const context=vm.createContext({tablesJson:JSON.stringify(tables),today:date(today)});
  vm.runInContext(`
    var tables=JSON.parse(tablesJson),writes=[];
    function ifnull(v,f){return v==null?f:v;}
    function choose(c,a,b){return c?a:b;}
    function List(){return [];}
    function Map(){return {put(k,v){this[k]=v;},get(k){return Object.hasOwn(this,k)?this[k]:null;},size(){return Object.keys(this).filter(k=>typeof this[k]!=='function').length;},toString(){return JSON.stringify(this);}};}
    function Collection(){return {rows:[],insert(row){this.rows.push(row);}};}
    function monthRowNew(){return {};}
    function indexes(list){return list.map((_,index)=>index);}
    Array.prototype.get=function(index){return this[index]??null;};
    Array.prototype.add=function(value){this.push(value);};
    Array.prototype.isEmpty=function(){return !this.length;};
    Array.prototype.count=function(){return this.length;};
    Array.prototype.sum=function(field){return this.reduce((sum,row)=>sum+(row[field]??0),0);};
    String.prototype.toMap=function(){return JSON.parse(this);};
    Object.defineProperty(Object.prototype,'get',{value:function(key){return Object.hasOwn(this,key)?this[key]:null;},configurable:true});
    String.prototype.toLong=function(){if(!/^\\d+$/.test(this))throw new Error('Invalid ID');return Number(this);};
    String.prototype.matches=function(pattern){return new RegExp('^(?:'+pattern+')$').test(this);};
    String.prototype.subString=String.prototype.substring;
    String.prototype.toDate=function(){const [m,d,y]=this.split('/').map(Number);return Date.UTC(y,m-1,d);};
    Number.prototype.addDay=function(days){return Number(this)+days*86400000;};
    Number.prototype.toStartOfMonth=function(){const d=new Date(Number(this));return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1);};
    Number.prototype.addMonth=function(months){const d=new Date(Number(this));d.setUTCMonth(d.getUTCMonth()+months);return +d;};
    Number.prototype.subMonth=function(months){return this.addMonth(-months);};
    Number.prototype.toLong=function(){return Math.trunc(this);};
    var originalString=Number.prototype.toString;
    Number.prototype.toString=function(format){if(format==='yyyy-MM-dd')return new Date(Number(this)).toISOString().slice(0,10);return originalString.call(this);};
    var zoho={loginuser:'forecast-fixture',currentdate:today};
    var thisapp={buildForecastManagerSummary(){return '<div>Inert summary fixture</div>';}};
    function record(row){return new Proxy(row,{get(o,k){return k in o?o[k]:null;},set(o,k,v){writes.push({form:'update',id:o.ID,field:k,value:v});o[k]=v;return true;}});}
    function query(form,predicate,sort){
      const rows=(tables[form]??[]).filter(row=>predicate(new Proxy(row,{get(o,k){return k in o?o[k]:null;}}))).map(record);
      if(sort)rows.sort((a,b)=>String(a[sort]??'').localeCompare(String(b[sort]??'')));
      return new Proxy(rows,{get(o,k){if(k in o||typeof k==='symbol')return o[k];if(k==='Open_Forecasting_Window')return {getAll:()=>o.map(row=>row[k])};return o[0]?.[k]??null;},set(o,k,v){if(!o.length)throw new Error('No record to update');o[0][k]=v;return true;}});
    }
    function insert(form,fields){
      if(form==='Forecast_Year'&&(tables[form]??[]).some(row=>row.Forecast_Name===fields.Forecast_Name))throw new Error('Forecast name already exists');
      const ID=Math.max(1000,...Object.values(tables).flat().map(row=>row.ID??0))+1;
      const row={ID,...fields};(tables[form]??=[]).push(row);writes.push({form,id:ID});
      if(fields.Forecast_Months){row.Forecast_Months=fields.Forecast_Months.rows.map(month=>{const id=insert('Forecast',{...month,Forecast_Year2:ID});return id;});}
      return ID;
    }
    ${js}
    var invoke=function(payload){return JSON.parse(forecastManagerWidget(JSON.stringify(payload)));};
  `,context);
  return {invoke:payload=>context.invoke(payload),tables:context.tables,writes:context.writes,context};
}
