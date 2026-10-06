// Deterministic actual-source DOM fixture. It parses actual Contract markup, not browser layout.
export function createContractTestDOM(source){
 const nodes=new Map(),selectors=new Map(),listeners=new Map();
 const decode=text=>String(text).replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
 const document={activeElement:null,referrer:'https://creator.example.test/',documentElement:{clientWidth:1000,clientHeight:800}};
 function matches(el,selector){
  selector=selector.trim();if(!selector)return false;
  const exclusions=[...selector.matchAll(/:not\(([^()]*)\)/g)];if(exclusions.some(match=>matches(el,match[1])))return false;selector=selector.replace(/:not\([^()]*\)/g,'');
  if(selector.includes(':disabled')&&!el.disabled)return false;selector=selector.replace(/:disabled/g,'');
  const attr=[...selector.matchAll(/\[([^=\]\s]+)(?:=["']?([^\]"']*)["']?)?\]/g)];
  if(attr.some(m=>!el.hasAttribute(m[1])||m[2]!==undefined&&el.getAttribute(m[1])!==m[2]))return false;
  if(selector.includes(':checked')&&!el.checked)return false;
  selector=selector.replace(/\[[^\]]+\]|:checked/g,'');const id=selector.match(/#([\w-]+)/);if(id&&el.id!==id[1])return false;
  const cls=[...selector.matchAll(/\.([\w-]+)/g)];if(cls.some(m=>!el.classList.contains(m[1])))return false;
  const tag=selector.match(/^[\w-]+/);return !tag||el.tagName.toLowerCase()===tag[0].toLowerCase();
 }
 function select(root,selector){
  const results=[],groups=selector.split(',').map(s=>s.trim());
  function matchChain(el,parts){if(!matches(el,parts.at(-1)))return false;let parent=el.parentNode;for(let i=parts.length-2;i>=0;i--){while(parent&&!matches(parent,parts[i]))parent=parent.parentNode;if(!parent)return false;parent=parent.parentNode;}return true;}
  function visit(el){for(const child of el.children){if(groups.some(group=>matchChain(child,group.split(/\s+(?![^[]*\])/))))results.push(child);visit(child);}}visit(root);return results;
 }
 function disconnect(el){el.isConnected=false;el.children.forEach(disconnect);if(el.id&&nodes.get(el.id)===el)nodes.delete(el.id);}
 function create(tag='div',id=''){
  const classes=new Set(),handlers=new Map();let markup='',text='',value='',nid='',checked=false;
  const el={tagName:tag.toUpperCase(),style:{setProperty(name,value){this[name]=String(value);}},dataset:{},attrs:{},children:[],disabled:false,hidden:false,inert:false,isConnected:true,parentNode:null,htmlWrites:0,offsetHeight:160,
   classList:{add(...s){s.forEach(v=>classes.add(v));},remove(...s){s.forEach(v=>classes.delete(v));},contains:v=>classes.has(v),toggle(v,on){if(on===undefined)on=!classes.has(v);on?classes.add(v):classes.delete(v);return on;}},
   getAttribute:key=>el.attrs[key]||'',hasAttribute:key=>Object.hasOwn(el.attrs,key),setAttribute(key,next){el.attrs[key]=String(next);if(key==='id')el.id=next;if(key==='class')el.className=next;if(key==='value')el.value=decode(next);if(key==='checked')el.checked=true;if(key==='selected')el.selected=true;if(key==='disabled')el.disabled=true;if(key.startsWith('data-'))el.dataset[key.slice(5).replace(/-([a-z])/g,(_,v)=>v.toUpperCase())]=decode(next);},removeAttribute(key){delete el.attrs[key];},
   appendChild(child){child.parentNode=el;child.isConnected=true;el.children.push(child);return child;},insertBefore(child,before){child.parentNode=el;child.isConnected=true;const index=el.children.indexOf(before);index<0?el.children.push(child):el.children.splice(index,0,child);return child;},removeChild(child){el.children.splice(el.children.indexOf(child),1);disconnect(child);},remove(){if(el.parentNode)el.parentNode.removeChild(el);},insertAdjacentHTML(position,html){parse(String(html),el);},
   focus(){document.activeElement=el;},blur(){if(document.activeElement===el)document.activeElement=document.body;},scrollIntoView(){},getBoundingClientRect:()=>({top:20,bottom:40,left:20,width:200}),contains:other=>el===other||el.children.some(child=>child.contains(other)),
   closest(selector){for(let current=el;current;current=current.parentNode)if(selector.split(',').some(group=>matches(current,group)))return current;return null;},querySelector:selector=>el.querySelectorAll(selector)[0]||null,querySelectorAll:selector=>select(el,selector),
   addEventListener(type,fn){if(!handlers.has(type))handlers.set(type,[]);handlers.get(type).push(fn);},removeEventListener(type,fn){handlers.set(type,(handlers.get(type)||[]).filter(v=>v!==fn));},handlers,
   async fire(type,event={}){event.target??=el;for(const fn of handlers.get(type)||[])await fn.call(el,event);},dispatchEvent(event){event.target=el;for(const fn of handlers.get(event.type)||[])fn.call(el,event);return true;},getContext:()=>({font:'',measureText:t=>({width:String(t).length*7})})};
  Object.defineProperties(el,{
   id:{get:()=>nid,set:next=>{nid=String(next);if(nid)nodes.set(nid,el);}},className:{get:()=>[...classes].join(' '),set:next=>{classes.clear();String(next).split(/\s+/).filter(Boolean).forEach(v=>classes.add(v));}},
   firstChild:{get:()=>el.children[0]||null},checked:{get:()=>checked,set:next=>{checked=!!next;}},options:{get:()=>el.tagName==='SELECT'?select(el,'option'):[]},selectedIndex:{get:()=>el.options.findIndex(option=>option.selected),set:index=>{el.options.forEach((option,i)=>option.selected=i===Number(index));}},
   value:{get:()=>el.tagName==='SELECT'?(el.options.find(option=>option.selected)||el.options[0]||{}).value||'':el.tagName==='OPTION'&&!el.hasAttribute('value')?el.textContent.trim():value,set:next=>{value=String(next);if(el.tagName==='SELECT')el.options.forEach(option=>option.selected=option.value===value);}},
   innerHTML:{get:()=>markup,set:next=>{markup=String(next);el.htmlWrites++;el.children.forEach(disconnect);el.children=[];text='';parse(markup,el);if(el.tagName==='SELECT'&&!el.options.some(option=>option.selected)&&el.options.length)el.options[0].selected=true;}},
   textContent:{get:()=>text+el.children.map(child=>child.textContent).join(''),set:next=>{el.children.forEach(disconnect);el.children=[];text=String(next);}},text:{get:()=>el.textContent,set:next=>{el.textContent=next;}}
  });
  el.id=id;el.appendText=next=>{text+=decode(next);};return el;
 }
 function parse(html,parent){
  const stack=[parent],voids=new Set(['input','br','hr','img','link','meta','wbr']);
  for(const match of html.replace(/<!--[\s\S]*?-->/g,'').matchAll(/<\/?([A-Za-z][\w:-]*)\b([^>]*)>|([^<]+)/g)){
   if(match[3]){stack.at(-1).appendText(match[3]);continue;}
   const name=match[1].toLowerCase();if(match[0].startsWith('</')){while(stack.length>1){const current=stack.pop();if(current.tagName.toLowerCase()===name)break;}continue;}
   const child=create(name);for(const attr of match[2].matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))child.setAttribute(attr[1],decode(attr[2]??attr[3]??attr[4]??''));stack.at(-1).appendChild(child);
   if(!voids.has(name)&&!match[0].endsWith('/>'))stack.push(child);
  }
 }
 document.body=create('body','body');document.head=create('head','head');
 document.body.innerHTML=(source.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)||[])[1]?.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')||'';
 document.getElementById=id=>nodes.get(id)||null;document.createElement=tag=>create(tag);document.createElementNS=(_,tag)=>create(tag);
 document.querySelector=selector=>document.querySelectorAll(selector)[0]||null;document.querySelectorAll=selector=>selectors.has(selector)?[].concat(selectors.get(selector)):select(document.body,selector);
 document.addEventListener=(type,fn,capture)=>{if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push({fn,capture:!!capture});};document.removeEventListener=(type,fn)=>listeners.set(type,(listeners.get(type)||[]).filter(v=>v.fn!==fn));
 async function dispatch(type,target,event={}){let stopped=false;Object.assign(event,{target,preventDefault(){event.prevented=true;},stopImmediatePropagation(){stopped=true;},stopPropagation(){}});const list=listeners.get(type)||[];for(const entry of [...list.filter(v=>v.capture),...list.filter(v=>!v.capture)]){if(stopped)break;await entry.fn(event);}return event;}
 const node=(id,tag='div')=>nodes.get(id)||create(tag,id);
 return {document,nodes,node,selectors,listeners,dispatch};
}
