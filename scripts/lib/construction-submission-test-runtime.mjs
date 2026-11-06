import fs from 'node:fs';
import vm from 'node:vm';
import {translate} from './deluge-pdf-test-runtime.mjs';

// Execute the actual native action. This fixture is not a Creator compiler.
export function constructionSubmissionRuntime(tables, {failInsert=0}={}) {
  const source=fs.readFileSync(new URL('../../creator/workflows/Refresh_on_Submit_New_Con.dg',import.meta.url),'utf8');
  const prepared=source.replace(/insert into (\w+)\s*\[([\s\S]*?)\]/g,(_,form,fields)=>{
    const pairs=fields.trim().split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>{
      const match=line.match(/^(\w+)=(.*)$/);if(!match)throw Error('Unsupported native insert field: '+line);
      return JSON.stringify(match[1])+':'+match[2];
    });
    return 'insertRow('+JSON.stringify(form)+',{\n'+pairs.join(',\n')+'\n});';
  });
  const body=translate('void runConstructionSubmission()\n{\n'+prepared+'\n}').js;
  const context=vm.createContext({tables,failInsert});
  vm.runInContext(`
    var writes=[],refreshes=[],insertAttempts=0;
    var zoho={loginuser:'native-submitter'};
    function ifnull(value,fallback){return value==null?fallback:value;}
    Array.prototype.count=function(){return this.length;};
    Array.prototype.contains=function(value){return this.includes(value);};
    function query(form,predicate,sort){
      var rows=Array.from(tables[form]||[],row=>new Proxy(row,{get(object,key){return key==='Contract1'&&object[key]===''?null:object[key]??null;}})).filter(predicate);
      if(sort)rows.sort((a,b)=>Number(a[sort]||0)-Number(b[sort]||0));
      return rows;
    }
    function insertRow(form,data){
      insertAttempts++;
      if(insertAttempts===failInsert)throw Error('Native insert failed');
      var row={ID:(90071992547411000n+BigInt(insertAttempts)).toString(),...data};
      if(!tables[form])tables[form]=[];tables[form].push(row);writes.push({form,row});return row.ID;
    }
    function openUrl(url,target){refreshes.push({url,target});}
  `+body,context);
  return {source,run(input){context.input=input;vm.runInContext('runConstructionSubmission()',context);return this;},get writes(){return context.writes;},get refreshes(){return context.refreshes;}};
}
