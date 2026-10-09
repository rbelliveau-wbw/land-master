import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the saved candidate through a narrow Deluge syntax adapter. This is
// not a Creator compiler and makes no claim about native transaction isolation.
const source=fs.readFileSync(new URL('../creator/functions/Complete_Lot_Contract.dg',import.meta.url),'utf8');
const fields=['ID','Lots1','Contract1','Lot_Size','Builder_Name','Builder1','Status','Close_Date','Purchase_Date','Contract_Schedule','Base_Price','Escalator','Takedown_Schedule_Code','Subdivisions'];
const forms='Contract_Pricing|Takedown_Schedule|Subdivision|Contract|Builder|Lots';
function criterion(expression){
 expression=expression.replace(/\b(Lots1|Subdivisions)\s*==\s*(\w+)/g,'$1.includes($2)');
 return expression.replace(new RegExp('(?<![\\w.])('+fields.join('|')+')\\b','g'),'row.$1');
}
let adapted=source.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'').replace(/^string Complete_Lot_Contract\(string contractId\)/,'function execute(contractId)');
adapted=adapted.replace(/update Lots\[([^\]]+)\]\s*\[\s*(\w+)\s*=([^\]\n]+)\s*\];/g,(_,criteria,field,value)=>'nativeUpdate("Lots",row=>('+criterion(criteria)+'),{'+field+':'+value.trim()+'});');
adapted=adapted.replace(/insert into Takedown_Schedule\s*\[([^\]]+)\]/g,(_,body)=>'nativeInsert("Takedown_Schedule",{'+body.trim().split(/\r?\n/).map(line=>line.trim().replace('=',':')).join(',')+'});');
adapted=adapted.replace(new RegExp('\\b('+forms+')\\[([^\\]]+)\\]','g'),(_,form,criteria)=>'query('+JSON.stringify(form)+',row=>('+criterion(criteria)+'))');
adapted=adapted.replace(/for each\s+(\w+)\s+in\s+([^\r\n]+)/g,(_,variable,expression)=>'for ('+variable+' of '+(expression.trim().startsWith('{')?'['+expression.trim().slice(1,-1)+']':expression.trim())+')');
adapted=adapted.replace(/\bMap\(\)/g,'new DMap()').replace(/\bList\(\)/g,'new DList()');
// Deluge variables are function scoped, including variables first set in loops.
const variables=new Set([...adapted.matchAll(/^\s*(\w+)\s*=(?!=)/gm)].map(match=>match[1]));
for(const match of adapted.matchAll(/for \((\w+) of/g))variables.add(match[1]);
adapted=adapted.replace('function execute(contractId)\n{','function execute(contractId)\n{\nlet '+[...variables].join(',')+';');

class DList extends Array {add(value){this.push(value);}addAll(values){this.push(...values);}contains(value){return this.includes(value);}size(){return this.length;}toString(separator=','){return this.join(separator);}}
class DMap extends Map {put(key,value){this.set(key,value);}get(key){return super.has(key)?super.get(key):null;}size(){return super.size;}toJSON(){return Object.fromEntries(this);}toString(){return JSON.stringify(this);}}
const ID='4410926000005039484',OTHER='4410926000005039485',LOT='4410926000005039486',BUYER='4410926000005039487',PLACEHOLDER='4410926000005039488',REAL='4410926000005039489',SCHEDULE='4410926000005039490';
const list=values=>Object.assign(new DList(),values||[]);
function row(extra={}){return {ID:LOT,Lot_Code:'TEST-B01-L01',Lot_Size:40,Base_Price:null,Escalator:null,Status:'Open',Builder1:null,Contract1:null,Contract_Schedule:null,Close_Date:null,Purchase_Date:null,Notes:'retain',...extra};}
function fixture({lot=row(),pricing=[{ID:'price',Contract1:ID,Lot_Size:40,Base_Price:5000,Escalator:3}],contracts=[],beforeUpdate,dropField,subdivisions=true}={}){
 const db={Builder:[{ID:BUYER,Builder_Name:'Buyer'},{ID:PLACEHOLDER,Builder_Name:'Placeholder'},{ID:REAL,Builder_Name:'Other buyer'}],Contract:[{ID,Contract_Type:'Lot (Master)',Builder:BUYER,Lots1:list(lot?[LOT]:[]),Subdivision1:list(subdivisions?['sub']:[]),Parent_Contract:null,Number_of_Lots:1,Initial_Takedown:1,Initial_Takedown_Days:1,Subsequent_Takedown_Lots:1,Subsequent_Takedown_Days:1,Completion_Date:null},...contracts],Lots:lot?[lot]:[],Contract_Pricing:pricing,Subdivision:[{ID:'sub',Subdivision_Code:'TEST'}],Takedown_Schedule:[{ID:SCHEDULE,Takedown_Schedule_Code:'TEST - Buyer',Builder1:BUYER,Subdivisions:list(['sub']),Add_Contract_Contract_Name:OTHER}]};
 const events=[];
 function lookup(form,id){return id==null?null:String(id);}
 function wrap(record){return new Proxy(record,{get(target,key){if(key==='Builder'||key==='Builder1')return lookup('Builder',target[key]);if(key==='Parent_Contract')return lookup('Contract',target[key]);if(key==='toString'||key==='valueOf')return ()=>target.ID;return target[key]??null;},set(target,key,value){target[key]=value;events.push({form:'Contract',field:key});return true;}});}
 function query(form,predicate){const rows=db[form].filter(record=>predicate(wrap(record)));return new Proxy({},{get(_,key){if(key==='count')return ()=>rows.length;if(key===Symbol.iterator)return function*(){for(const record of rows)yield wrap(record);};return rows.length?wrap(rows[0])[key]:null;},set(_,key,value){if(rows.length){rows[0][key]=value;events.push({form,field:key});}return true;}});}
 const context=vm.createContext({DMap,DList,builderRows:db.Builder,ifnull:(value,fallback)=>value==null?fallback:value,zoho:{currentdate:'2026-10-05',loginuser:'fixture'},query,nativeInsert(form,payload){events.push({form,insert:true});db[form].push({ID:SCHEDULE,...payload});},nativeUpdate(form,predicate,payload){beforeUpdate?.({db,events,payload});const found=db[form].filter(record=>predicate(wrap(record)));if(found.length){for(const [field,value] of Object.entries(payload)){events.push({form,id:found[0].ID,field,value:String(value)});if(field!==dropField)found[0][field]=value==null?null:typeof value==='object'?String(value):value;}}}});
 vm.runInContext('String.prototype.toLong=function(){return this.toString();};String.prototype.toMap=function(){const value=JSON.parse(this);return new DMap(Object.entries(value));};Object.defineProperty(String.prototype,"Builder_Name",{get(){return builderRows.find(row=>row.ID===this.toString())?.Builder_Name??null;}});Number.prototype.toDecimal=function(){return this.valueOf();};Number.prototype.floor=function(){return Math.floor(this.valueOf());};',context);
 vm.runInContext(adapted,context,{filename:'Complete_Lot_Contract.candidate-adapter.js'});
 return {db,events,run(mode='Complete',ids=[LOT]){return JSON.parse(context.execute(JSON.stringify({contractId:ID,mode,lotIds:ids})));}};
}

{
 const h=fixture(),out=h.run('Check');assert.equal(out.lotTransferPolicy,'open-blank-placeholder-v1');assert.equal(out.builderId,BUYER);assert.deepEqual(out.placeholderBuilderIds,[PLACEHOLDER]);assert.deepEqual(out.lotIds,[LOT]);assert.equal(h.events.length,0,'capability check cannot write');
}
for(const Builder of [null,PLACEHOLDER]){
 const h=fixture();h.db.Contract[0].Builder=Builder;const before=structuredClone(h.db.Lots[0]),out=h.run();assert.match(out.error,/real contract buyer/);assert.equal(h.events.length,0,'unassigned target buyer stops before every mutation');assert.deepEqual(h.db.Lots[0],before);
}
for(const Builder1 of [null,PLACEHOLDER]){
 for(const Status of ['Open','',null,'   ']){
  const h=fixture({lot:row({Builder1,Status})}),out=h.run();assert.equal(out.outcomes[0].verified,true);assert.equal(out.outcomes[0].state,'updated');assert.equal(h.db.Lots[0].Status,'Contracted');assert.equal(h.db.Lots[0].Builder1,BUYER);assert.equal(h.db.Lots[0].Lot_Size,40);assert.equal(h.db.Lots[0].Notes,'retain');assert.equal(h.events.filter(event=>event.form==='Lots').at(-1).field,'Status','status is last');
 }
}
for(const extra of [{Status:'Sold'},{Status:'Scheduled'},{Status:'Contracted'},{Status:'Legacy'},{Close_Date:'2026-10-01'},{Purchase_Date:'2026-11-01'},{Builder1:REAL},{Builder1:BUYER},{Contract1:OTHER},{Contract_Schedule:'foreign'}]){
 const h=fixture({lot:row(extra)}),before=structuredClone(h.db.Lots[0]),out=h.run();assert.deepEqual(h.db.Lots[0],before,'protected whole Lot remains unchanged');assert.equal(h.events.filter(event=>event.form==='Lots').length,0);assert.equal(out.outcomes[0].state,'preserved');assert.equal(out.outcomes[0].verified,true);
}
{
 const h=fixture({lot:row({Base_Price:0,Escalator:0,Contract1:ID,Contract_Schedule:SCHEDULE})}),out=h.run();assert.equal(out.outcomes[0].verified,true);assert.equal(h.db.Lots[0].Base_Price,0);assert.equal(h.db.Lots[0].Escalator,0);assert.equal(h.events.some(event=>['Base_Price','Escalator','Lot_Size'].includes(event.field)),false);assert.equal(h.db.Takedown_Schedule[0].Add_Contract_Contract_Name,OTHER,'shared schedule ownership is preserved');
}
for(const pricing of [[],[{Contract1:ID,Lot_Size:40,Base_Price:1},{Contract1:ID,Lot_Size:40,Base_Price:2}]]){
 const h=fixture({pricing}),out=h.run();assert.equal(h.events.filter(event=>event.form==='Lots').length,0);assert.equal(out.outcomes[0].state,'skipped','zero/duplicate pricing cannot choose an arbitrary row');
}
for(const ids of [[OTHER],[LOT,LOT],[]]){
 const h=fixture(),out=h.run('Complete',ids);assert.ok(out.error);assert.equal(h.events.length,0,'mismatched captured selections stop before any write');
}
{
 const h=fixture({contracts:[{ID:OTHER,Lots1:list([LOT])}]}),out=h.run();assert.ok(out.error);assert.equal(h.events.length,0,'parent claims stop completion before schedules');
}
for(const Builder1 of [null,PLACEHOLDER,BUYER]){
 const h=fixture({lot:row({Builder1,Contract_Schedule:'foreign'})}),out=h.run('LinkOnly');assert.deepEqual(out.linkedIds,[LOT]);assert.deepEqual(out.outcomes[0].fields,['Contract1']);assert.equal(out.outcomes[0].verified,true);assert.deepEqual(h.events.map(event=>event.field),['Contract1']);assert.equal(h.db.Lots[0].Status,'Open');assert.equal(h.db.Lots[0].Contract_Schedule,'foreign','LinkOnly does not evaluate or alter schedules');assert.equal(h.db.Contract[0].Completion_Date,null);
}
for(const extra of [{Builder1:REAL},{Status:'Sold'},{Purchase_Date:'2026-11-01'},{Contract1:OTHER}]){
 const h=fixture({lot:row(extra)}),out=h.run('LinkOnly');assert.equal(out.outcomes[0].state,'preserved');assert.equal(h.events.length,0);
}
{
 const h=fixture({lot:row({Contract1:ID})}),out=h.run('LinkOnly');assert.deepEqual(out.linkedIds,[LOT]);assert.equal(h.events.length,0,'own existing link verifies without rewriting');
}
for(const change of [lot=>{lot.Status='Sold';},lot=>{lot.Base_Price=0;},lot=>{lot.Lot_Size=60;},lot=>{lot.Builder1=REAL;}]){
 let changed=false;const h=fixture({beforeUpdate({db}){if(!changed){changed=true;change(db.Lots[0]);}}}),out=h.run();assert.equal(out.outcomes[0].verified,false,'racing changes cannot become verified success');assert.equal(out.outcomes[0].state,'partial');if(h.db.Lots[0].Base_Price===0)assert.equal(h.db.Lots[0].Base_Price,0);assert.notEqual(h.db.Lots[0].Status,'Contracted','conditional final status requires verified fills');
}
{
 const h=fixture({dropField:'Contract_Schedule'}),out=h.run();assert.equal(out.outcomes[0].verified,false);assert.equal(out.outcomes[0].state,'partial');assert.equal(h.db.Lots[0].Status,'Open','dropped lookup stops final status');
}
{
 let renamed=false;const h=fixture({lot:row({Builder1:PLACEHOLDER}),beforeUpdate({db}){if(!renamed){renamed=true;db.Builder.find(builder=>builder.ID===PLACEHOLDER).Builder_Name='Real buyer now';}}}),out=h.run();assert.equal(h.events.filter(event=>event.form==='Lots').length,0,'write-time buyer name guard protects a renamed Placeholder');assert.equal(h.db.Lots[0].Builder1,PLACEHOLDER);assert.equal(out.outcomes[0].verified,false);
}
{
 const h=fixture({lot:null,subdivisions:false}),out=h.run('Complete',[]);assert.deepEqual(out.requestedIds,[]);assert.deepEqual(out.outcomes,[]);assert.equal(h.events.filter(event=>event.form!=='Contract').length,0,'company Master has no schedule or Lot writes');
}
for(const mode of ['Complete','LinkOnly']){
 let changed=false;const h=fixture({beforeUpdate({db}){if(!changed){changed=true;db.Contract.push({ID:OTHER,Lots1:list([LOT])});}}}),out=h.run(mode);assert.equal(h.events.filter(event=>event.form==='Lots').length,1,'a claim inserted after its read exposes the documented cross-record race; subsequent fills stop');assert.equal(out.outcomes[0].verified,false,'a raced cross-record claim cannot be acknowledged as verified');
}
{
 const h=fixture();h.db.Takedown_Schedule=[];const out=h.run();assert.equal(out.outcomes[0].verified,true);for(const field of ['Initial_Takedown','Initial_Delay_Days','Continued_Takedown','Continued_Takedown_Delay_Days'])assert.equal(h.db.Takedown_Schedule[0][field],1,'Legacy closing terms are carried unchanged');assert.equal(h.db.Takedown_Schedule[0].Second_Closing_Lots,null,'Historical blank second terms are not inferred');assert.equal(h.db.Takedown_Schedule[0].Second_Closing_Days,null);
}
{
 const h=fixture();h.db.Takedown_Schedule=[];Object.assign(h.db.Contract[0],{Number_of_Lots:30,Initial_Takedown:10,Initial_Takedown_Days:30,Second_Closing_Lots:10,Second_Closing_Days:45,Subsequent_Takedown_Lots:5,Subsequent_Takedown_Days:30});const out=h.run();assert.equal(out.outcomes[0].verified,true);assert.equal(out.lotTransferPolicy,'open-blank-placeholder-v1');const saved=h.db.Takedown_Schedule[0];for(const [field,value]of Object.entries({Total_Lot_Obligation:30,Initial_Takedown:10,Initial_Delay_Days:30,Second_Closing_Lots:10,Second_Closing_Days:45,Continued_Takedown:5,Continued_Takedown_Delay_Days:30}))assert.equal(saved[field],value,'Authorized closing terms copied on missing schedule creation: '+field);
}
{
 const h=fixture();Object.assign(h.db.Contract[0],{Second_Closing_Lots:3,Second_Closing_Days:45});Object.assign(h.db.Takedown_Schedule[0],{Total_Lot_Obligation:50,Initial_Takedown:2,Initial_Delay_Days:15,Second_Closing_Lots:4,Second_Closing_Days:20,Continued_Takedown:6,Continued_Takedown_Delay_Days:30});const terms=JSON.stringify(h.db.Takedown_Schedule[0]);const out=h.run();assert.equal(out.outcomes[0].verified,true);assert.equal(JSON.stringify(h.db.Takedown_Schedule[0]),terms,'Existing schedule terms never synchronize to Contract changes');
}
for(const terms of [{Second_Closing_Lots:3,Second_Closing_Days:null},{Second_Closing_Lots:3,Second_Closing_Days:-1},{Second_Closing_Lots:3.5,Second_Closing_Days:45}]){
 const h=fixture();Object.assign(h.db.Contract[0],terms);const out=h.run();assert.ok(out.error,'Invalid second pair is rejected before schedule or lot writes');assert.equal(h.events.length,0);
}
for(const field of ['Number_of_Lots','Initial_Takedown','Initial_Takedown_Days','Subsequent_Takedown_Lots','Subsequent_Takedown_Days']){
 const h=fixture();h.db.Contract[0][field]=null;const out=h.run();assert.ok(out.error,'existing Production required terms remain enforced');assert.equal(h.events.length,0);
}
const productionBaseline=fs.readFileSync(new URL('../creator/functions/baseline/Complete_Lot_Contract.production-V9.43.2026-10-05.dg',import.meta.url),'utf8');
for(const mode of ['Complete','LinkOnly']){
 const h=fixture();h.db.Contract[0].Status='Complete';const before=structuredClone(h.db),out=h.run(mode);
 assert.match(out.error,/read-only/);assert.equal(h.events.length,0);assert.deepEqual(JSON.parse(JSON.stringify(h.db)),before,'completed parent blocks every server transfer write');
 assert.equal(h.run('Check').lotTransferPolicy,'open-blank-placeholder-v1','completed read-only capability checks remain available');
}
assert.doesNotMatch(productionBaseline,/Second_Closing/,'Captured Production rollback baseline remains unchanged');
assert.doesNotMatch(source,/\bLot_Size\s*=(?!=)/m,'candidate never writes Lot Size');
console.log('PASS actual Lot transfer candidate: read-only policy handshake, exact captured IDs, Open/blank and Placeholder gates, whole-Lot lifecycle protection, zero/size preservation, conditional fills, status last, unique pricing, shared schedules, LinkOnly and raced/dropped-write readback. Native compilation/deployment and isolation remain unverified.');
