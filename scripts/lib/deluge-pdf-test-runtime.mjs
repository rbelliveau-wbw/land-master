// Offline execution adapter for the packet's Deluge subset. It is not a Creator compiler.
// Tests execute the checked-in function bodies; record queries use explicit local fixtures.
import fs from 'node:fs';
import vm from 'node:vm';

function translate(source) {
  const literals=[];
  let s=source.replace(/"(?:\\.|[^"\\])*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, token=>{
    if(!token.startsWith('"'))return '';
    return `STR${literals.push(token)-1}TOKEN`;
  });
  const signature=s.match(/^\s*\w+\s+(\w+)\(([^)]*)\)/);
  if(!signature)throw new Error('Unsupported function declaration');
  const name=signature[1],args=signature[2].split(',').filter(Boolean).map(x=>x.trim().split(/\s+/).at(-1));
  s=s.slice(signature[0].length).trim().slice(1,-1);
  s=s.replace(/\b([A-Z][A-Za-z_]+)\[([^\]]+)\](?:\s+sort by\s+(\w+))?/g,(_,form,criteria,sort)=>{
    const predicate=criteria.replace(/\b([A-Za-z_]\w*)\s*(==|!=|>=|<=|>|<)/g,'row.$1 $2');
    return `query('${form}',row=>${predicate},'${sort||''}')`;
  });
  s=s.replace(/\{([^{};\n]*,[^{};\n]*)\}/g,'[$1]');
  s=s.replace(/for each index\s+(\w+)\s+in\s+([^\n{]+)/g,'for ($1 of indexes($2))');
  s=s.replace(/for each\s+(\w+)\s+in\s+([^\n{]+)/g,'for ($1 of $2)');
  s=s.replace(/([=,(+])\s*if\(/g,'$1 choose(');
  const assigned=[...s.matchAll(/(?<![.\w])([A-Za-z_]\w*)\s*=(?!=)/g)].map(x=>x[1]);
  const loops=[...s.matchAll(/for \((\w+) of/g)].map(x=>x[1]);
  const vars=[...new Set([...assigned,...loops])].filter(x=>!args.includes(x));
  s=s.replace(/STR(\d+)TOKEN/g,(_,i)=>literals[+i]);
  return {name,js:`function ${name}(${args.join(',')}){var ${vars.join(',')||'unused'};\n${s}\n}`};
}

export function packetRuntime(root, tables={}) {
  const draws=[];
  const context=vm.createContext({console,fixtures:JSON.parse(JSON.stringify(tables)),draws});
  vm.runInContext(`
  var thisapp={};
  function ifnull(v,f){return v==null?f:v;}
  function choose(c,a,b){return c?a:b;}
  function List(){return [];}
  function Map(){return {put(k,v){this[k]=v;},get(k){return this[k]??null;}};}
  function indexes(a){return Array.from(a,(_,i)=>i);}
  Array.prototype.add=function(v){this.push(v);};
  Array.prototype.addAll=function(v){this.push(...v);};
  Array.prototype.get=function(i){return this[i]??null;};
  Array.prototype.size=Array.prototype.count=function(){return this.length;};
  Array.prototype.contains=function(v){return this.includes(v);};
  Array.prototype.toString=function(sep){return this.join(sep??',');};
  String.prototype.toList=function(sep){return this.split(sep??',');};
  String.prototype.contains=function(v){return this.includes(v);};
  String.prototype.left=function(n){return this.slice(0,n);};
  String.prototype.right=function(n){return this.slice(-n);};
  String.prototype.subString=function(a,b){return this.substring(a,b);};
  String.prototype.getPrefix=function(v){return this.split(v)[0];};
  String.prototype.toLong=String.prototype.toDecimal=function(){return Number(this);};
  String.prototype.textToHex=function(){return Array.from(this,c=>c.charCodeAt(0).toString(16).padStart(2,'0')).join('');};
  String.prototype.lengthCall=function(){return this.length;};
  String.prototype.replaceAll=function(a,b){return this.replace(new RegExp(a,'g'),b);};
  Number.prototype.toLong=function(){return Math.trunc(this);};
  Number.prototype.toDecimal=function(){return Number(this);};
  Number.prototype.ceil=function(){return Math.ceil(this);};
  function record(row){return new Proxy(row||{}, {get(o,k){if(k===Symbol.iterator)return undefined;return o[k]??null;}});}
  function query(form,predicate,sort){
    let rows=Array.from(fixtures[form]||[],record).filter(predicate);
    if(sort)rows.sort((a,b)=>a[sort]>b[sort]?1:a[sort]<b[sort]?-1:0);
    return new Proxy(rows,{get(a,k){if(k in a || typeof k==='symbol')return a[k];return a[0]?.[k]??null;}});
  }
  var zoho={currenttime:{toString(){return '20260921_120000';}},currentdate:{toString(){return 'Sep 21, 2026';}}};
  thisapp.forLoop=(start,end)=>Array.from({length:Math.max(0,end-start+1)},()=> 'x');
  thisapp.PF_Packet_Money=v=>'$'+Number(v).toLocaleString('en-US',{maximumFractionDigits:0});
  thisapp.PF_Packet_Number=(v,n)=>Number(v).toLocaleString('en-US',{minimumFractionDigits:n,maximumFractionDigits:n});
  `,context);
  // String length() and array length() have no direct JS equivalent.
  for(const name of ['PF_PDF_Clean','PF_PDF_Wrap','PF_PDF_Flow_Pages','PF_PDF_Compile','PF_Build_Proforma_Approval_PDF']) {
    const t=translate(fs.readFileSync(`${root}/creator/functions/${name}.dg`,'utf8'));
    t.js=t.js.replace(/\.length\(\)/g,'.length');
    try {vm.runInContext(t.js+`;thisapp.${name}=${name};`,context);}catch(e){throw new Error(name+': '+e.message,{cause:e});}
  }
  vm.runInContext(`
  thisapp.PF_PDF_Text=(x,y,size,font,color,value)=>{
    const clean=thisapp.PF_PDF_Clean(value);draws.push({x,y,size,font,text:clean});
    return 'BT /'+({bold:'F2',italic:'F3'}[font]||'F1')+' '+size+' Tf '+color+' rg 1 0 0 1 '+x+' '+y+' Tm <'+clean.textToHex()+'> Tj ET\\n';
  };
  thisapp.PF_PDF_Rect=(x,y,w,h,fill,stroke,lw)=>'q '+(fill?fill+' rg ':'')+(stroke?stroke+' RG '+lw+' w ':'')+x+' '+y+' '+w+' '+h+' re '+(fill?(stroke?'B':'f'):'S')+' Q\\n';
  thisapp.PF_PDF_Line=(x1,y1,x2,y2,color,w)=>'q '+color+' RG '+w+' w '+x1+' '+y1+' m '+x2+' '+y2+' l S Q\\n';
  var capturedPages=[];
  const compilePacket=thisapp.PF_PDF_Compile;
  thisapp.PF_PDF_Compile=(pages,title)=>{capturedPages=pages;return compilePacket(pages,title);};
  `,context);
  return {context,draws,run(code){return vm.runInContext(code,context);}};
}
