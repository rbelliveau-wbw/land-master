// Synthetic desktop geometry only: actual Insights styles/number engine, no Creator requests.
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const {chromium}=createRequire(import.meta.url)('playwright');
const root=path.resolve('widgets/lot-sales-explorer/src/app');
const styles=['sales','insights','insights-controls','insights-theme','insights-redesign','number-transitions']
  .map(name=>fs.readFileSync(path.join(root,name+'.css'),'utf8')).join('\n');
const engine=fs.readFileSync(path.join(root,'number-transitions.js'),'utf8');
const browser=await chromium.launch({headless:true,channel:'chrome',ignoreDefaultArgs:['--hide-scrollbars']});
const cases=[
  {name:'Creator iframe',width:3154,height:565,months:24,overflows:false},
  {name:'wide desktop',width:3234,height:1144,months:24,overflows:false},
  {name:'narrow desktop',width:1540,height:980,months:24,overflows:true},
  {name:'long period',width:3154,height:565,months:72,overflows:true}
];

function documentFor(months){
  const cell=key=>'<td class="drill-cell"><button class="cell-button"><span data-slot="'+key+'"></span></button></td>';
  const row=(index,total=false)=>'<tr><td class="sticky">'+(total?'Sold totals':'Subdivision '+index)+'</td><td>10/11/23</td><td>50.0</td>'+Array.from({length:months+1},(_,month)=>cell(index+':'+month)).join('')+'</tr>';
  const rows=Array.from({length:24},(_,index)=>(index%4?'':'<tr class="territory"><th class="sticky">Project '+Math.floor(index/4)+'</th><th colspan="'+(months+3)+'">4 subdivisions · 492 lots</th></tr>')+row(index)).join('');
  return '<!doctype html><html><head><style>'+styles+'</style></head><body><div class="workspace"><aside class="sidebar"></aside><main><section id="salesDashboard"><div class="sales-top-card" style="height:132px;flex:none"></div><section class="report-card"><div class="matrix-scroll"><table id="matrix"><thead><tr><th class="sticky">Project</th><th>First Lot Sale</th><th>Avg Front Ft</th><th class="period-total">Measure</th>'+Array.from({length:months},(_,month)=>'<th>Month '+(month+1)+'<small>2026</small></th>').join('')+'</tr></thead><tbody>'+rows+'</tbody><tfoot>'+row('total',true)+'</tfoot></table></div></section></section></main></div></body></html>';
}

try{
  for(const scenario of cases){
    const page=await browser.newPage({viewport:{width:scenario.width,height:scenario.height}});
    await page.setContent(documentFor(scenario.months));
    await page.addScriptTag({content:engine});
    await page.evaluate(()=>{
      document.querySelectorAll('[data-slot]').forEach(host=>{host.innerHTML=InsightsNumbers.markup('123',host.dataset.slot,'count');});
    });
    const result=await page.evaluate(async()=>{
      const scroll=document.querySelector('.matrix-scroll'),card=document.querySelector('.report-card'),table=document.querySelector('#matrix'),footer=table.querySelector('tfoot td');
      const snapshot=()=>({scrollWidth:scroll.scrollWidth,clientWidth:scroll.clientWidth,scrollHeight:scroll.scrollHeight,clientHeight:scroll.clientHeight,scrollBottom:scroll.getBoundingClientRect().bottom,cardBottom:card.getBoundingClientRect().bottom,tableWidth:table.getBoundingClientRect().width,footerBottom:footer.getBoundingClientRect().bottom});
      const initial=snapshot(),transitions=[];
      for(const [context,value] of [['totalPrice','$31,234,567'],['count','123'],['totalPrice','$8,765,432'],['count','7']]){
        const previous=InsightsNumbers.capture(table);
        table.querySelectorAll('[data-slot]').forEach(host=>InsightsNumbers.set(host,value,host.dataset.slot,context));
        InsightsNumbers.apply(table,previous);
        const started=performance.now(),frames=[snapshot()];
        while(performance.now()-started<500||frames.length<32){await new Promise(requestAnimationFrame);frames.push(snapshot());}
        transitions.push({context,value,frames});
      }
      const range=scroll.scrollWidth-scroll.clientWidth;
      scroll.scrollLeft=range;const reached=scroll.scrollLeft;
      return {initial,transitions,range,reached};
    });
    const allFrames=[result.initial,...result.transitions.flatMap(entry=>entry.frames)];
    for(const [index,frame] of allFrames.entries()){
      const label=scenario.name+' frame '+index;
      assert.equal(frame.clientHeight,result.initial.clientHeight,label+': scrollbar never changes the matrix viewport height');
      assert.equal(frame.scrollHeight,result.initial.scrollHeight,label+': rows retain their height');
      assert.ok(Math.abs(frame.cardBottom-result.initial.cardBottom)<.1,label+': outer report bottom stays fixed');
      assert.ok(Math.abs(frame.scrollBottom-result.initial.scrollBottom)<.1,label+': scrolling region bottom stays fixed');
      assert.ok(Math.abs(frame.footerBottom-result.initial.footerBottom)<.1,label+': visible totals edge stays fixed');
      assert.ok(Math.abs(frame.tableWidth-result.initial.tableWidth)<.1,label+': measure does not resize table columns');
      if(!scenario.overflows)assert.equal(frame.scrollWidth,frame.clientWidth,label+': fitting months have no horizontal overflow or blank right strip');
      else assert.equal(frame.scrollWidth,result.initial.scrollWidth,label+': transition does not add overflow beyond actual columns');
    }
    if(scenario.overflows){
      assert.ok(result.range>100,scenario.name+': genuine columns retain horizontal scrolling');
      assert.ok(Math.abs(result.reached-result.range)<=1,scenario.name+': last columns remain reachable');
    }else assert.equal(result.range,0,scenario.name+': Count leaves no persistent scrollbar');
    console.log(scenario.name+': '+allFrames.length+' stable frames, '+scenario.months+' months, '+(scenario.overflows?'genuine scrolling preserved':'no horizontal overflow'));
    await page.close();
  }
}finally{await browser.close();}
