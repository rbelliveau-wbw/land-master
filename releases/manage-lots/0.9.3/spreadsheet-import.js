/* Spreadsheet staging uses source cells, never model-generated lot numbers. */
(function(root){
  "use strict";
  const text=v=>v==null?"":String(v).trim();
  const esc=v=>text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const starter="Read only the uploaded spreadsheet and the selected subdivisions. Identify Block, Lot, and Size/Width columns; Size means lot width in feet, never area. Use Project, subdivision name, and Phase metadata to match each row to a selected subdivision. If the phase or subdivision conflicts or is ambiguous, leave the subdivision unresolved for review. Copy only explicitly listed lots; never fill gaps, extend sequences, or invent values. Skip blank rows, headings, notes, and totals. Preserve each sheet name, original row number, and source column indexes. Flag duplicates and uncertain mappings for review. Nothing is imported until the user confirms the staged rows.";
  function parseCSV(input){
    const rows=[];let row=[],cell="",quoted=false,afterQuote=false;
    const s=String(input).replace(/^\uFEFF/,"");
    for(let i=0;i<s.length;i++){
      const c=s[i];
      if(quoted){if(c==='"'){if(s[i+1]==='"'){cell+='"';i++;}else{quoted=false;afterQuote=true;}}else cell+=c;continue;}
      if(c==='"'){if(cell||afterQuote)throw Error("Invalid CSV quote.");quoted=true;continue;}
      if(c===','||c==='\n'||c==='\r'){row.push(cell);cell="";afterQuote=false;if(c!==','){rows.push(row);row=[];if(c==='\r'&&s[i+1]==='\n')i++;}continue;}
      if(afterQuote&&!/\s/.test(c))throw Error("Unexpected text after a quoted CSV cell.");
      if(!afterQuote)cell+=c;
    }
    if(quoted)throw Error("The CSV has an unfinished quoted cell.");
    if(cell||row.length||afterQuote){row.push(cell);rows.push(row);}
    return rows;
  }
  function sheetRows(name,rows,offset=0){return rows.map((cells,i)=>({sheet:name,row:i+1+offset,cells:cells.map(text)})).filter(r=>r.cells.some(Boolean));}
  function readWorkbook(bytes,XLSX){
    const book=XLSX.read(bytes,{type:"array",cellDates:false,cellFormula:true});let out=[];
    for(const name of book.SheetNames){const sheet=book.Sheets[name];if(!sheet['!ref'])continue;const range=XLSX.utils.decode_range(sheet['!ref']);if(range.e.r>100000||range.e.c>100)throw Error("The workbook's used range is too large. Remove unused formatted rows/columns.");
      const rows=XLSX.utils.sheet_to_json(sheet,{header:1,raw:false,defval:"",blankrows:true,range:0});
      out=out.concat(sheetRows(name,rows));
    }return out;
  }
  function batches(rows){const out=[];let part=[];for(const r of rows){if(JSON.stringify(r).length>6000)throw Error("A spreadsheet row is too large for AI review.");if(part.length&&(part[0].sheet!==r.sheet||part.length>=60||JSON.stringify(part.concat(r)).length>24000)){out.push(part);part=[];}part.push(r);}if(part.length)out.push(part);return out;}
  const normalize=v=>/^\d+$/.test(text(v))?String(Number(v)):text(v).toUpperCase();
  function checkMetadata(source,rows,subs){const meta=new Map();for(const src of source){let m=meta.get(src.sheet)||{};const joined=src.cells.join(' '),phase=joined.match(/\bphase\s*[:#-]?\s*0*(\d+)\b/i),project=joined.match(/\bproject\s*:\s*(.+)/i);if(phase)m={...m,phase:Number(phase[1])};if(project)m={...m,project:project[1].trim()};meta.set(src.sheet,m);for(const r of rows.filter(r=>r.sheet===src.sheet&&r.row===src.row)){const s=subs.find(s=>String(s.ID)===r.subId);if(s&&((m.phase!=null&&Number(s.Phase)!==m.phase)||(m.project&&!text(s.Subdivision_Name).toLowerCase().includes(m.project.toLowerCase())))){r.subId='';r.reviewed=false;r.issue=[r.issue,'Spreadsheet project/phase does not match the chosen subdivision.'].filter(Boolean).join(' ');}}}return rows;}
  function omittedRows(source,staged){const found=new Set(staged.map(r=>r.sheet+'|'+r.row)),headers=new Map(),out=[];for(const r of source){const b=r.cells.findIndex(c=>/^(block|blk)\.?$/i.test(c)),l=r.cells.findIndex(c=>/^lot(\s*(#|no\.?|number))?$/i.test(c));if(b>=0&&l>=0){headers.set(r.sheet,{b,l,w:r.cells.findIndex(c=>/^(size|width)(\s*\(?(ft|feet)\)?)?$/i.test(c))});continue;}const h=headers.get(r.sheet);if(h&&!found.has(r.sheet+'|'+r.row)&&/^[a-z0-9]{1,2}$/i.test(text(r.cells[h.b]))&&/^\d+$/.test(text(r.cells[h.l]))){out.push({sheet:r.sheet,row:r.row,source:r.cells.slice(),subId:'',block:normalize(r.cells[h.b]),lot:normalize(r.cells[h.l]),width:h.w<0?'':text(r.cells[h.w]),issue:'AI omitted this possible lot row. Verify all values and choose its subdivision.',reviewed:false,on:true,created:false,error:''});}}return out;}
  function stage(source,mappings,subdivisions){
    const bySource=new Map(source.map(r=>[r.sheet+"|"+r.row,r])),allowed=new Set(subdivisions.map(s=>String(s.ID))),seen=new Set(),out=[];
    for(const m of mappings){const key=text(m.sheet)+"|"+Number(m.row),src=bySource.get(key);if(!src)throw Error("AI referenced a row outside this spreadsheet batch. Nothing was staged.");if(seen.has(key))throw Error("AI returned the same source row twice. Retry the review.");seen.add(key);
      const col=(n,optional)=>{if(optional&&(n===null||n===undefined))return "";if(!Number.isInteger(n)||n<0||n>=src.cells.length)throw Error("AI returned an invalid source column. Nothing was staged.");return src.cells[n];};
      const sid=text(m.subdivision_id);if(sid&&!allowed.has(sid))throw Error("AI selected a subdivision outside your selection.");
      if(m.block_column===m.lot_column)throw Error('Block and Lot must reference different source columns.');
      out.push({sheet:src.sheet,row:src.row,source:src.cells.slice(),subId:sid,block:normalize(col(m.block_column).replace(/^(block|blk)\.?\s*/i,"")),lot:normalize(col(m.lot_column).replace(/^lot\.?\s*/i,"")),width:col(m.width_column,true),issue:text(m.issue),reviewed:false,on:true,created:false,error:""});
    }return out;
  }
  function code(sub,block,lot){const pad=v=>text(v).length<2?('00'+text(v)).slice(-2):text(v);return text(sub.Subdivision_Code)+'-B'+pad(block)+'-L'+pad(lot);}
  function issues(r,subs,rows,existing,cities,counties){
    const s=subs.find(s=>String(s.ID)===r.subId),out=[];r.code="";
    if(!s)out.push("Choose a subdivision");else{if(!text(s.Subdivision_Code))out.push("Subdivision has no code");if(!/^\d+$/.test(text(s.Phase)))out.push("Subdivision needs a numeric phase");if(!cities.includes(text(s.importCity)))out.push("Choose a valid city");if(!counties.includes(text(s.importCounty)))out.push("Choose a valid county");}
    if(!/^[a-zA-Z0-9]{1,2}$/.test(text(r.block)))out.push("Block must be 1–2 letters/digits");
    if(!/^\d{1,3}$/.test(text(r.lot))||Number(r.lot)<1||Number(r.lot)>999)out.push("Lot must be 1–999");
    if(text(r.width)&&(!/^\d{1,5}$/.test(text(r.width))||Number(r.width)<=0))out.push("Width must be whole feet, 1–99999");
    if(s&&r.block&&r.lot){r.code=code(s,r.block,r.lot);if(existing.has(r.code.toUpperCase()))out.push("Already in Lots");if(rows.filter(x=>x.on&&!x.created&&x.subId===r.subId&&code(s,x.block,x.lot).toUpperCase()===r.code.toUpperCase()).length>1)out.push("Duplicate staged lot");}
    if(r.issue&&!r.reviewed)out.push("Review AI flag and acknowledge it");if(r.error)out.push(r.error);return out;
  }
  function mount(ctx){
    const el=document.getElementById('platModal'),body=document.getElementById('piBody'),foot=document.getElementById('piFootActions'),meta=document.getElementById('piFootMeta');
    let p={open:false},returnFocus=null,xlsxPromise;
    const chosen=()=>ctx.subdivisions().filter(s=>p.ids.includes(String(s.ID))).map(s=>Object.assign({},s,p.locations[String(s.ID)]||{}));
    const busy=()=>p.reading||p.scanning||p.creating||p.confirming;
    const existing=new Set();
    function picker(label,value,options,key,index){return '<details class="si-picker"><summary>'+esc(value||label)+'</summary><input type="search" placeholder="Search '+esc(label)+'" aria-label="Search '+esc(label)+'"><div>'+options.map(o=>'<button type="button" data-pick="'+key+'" data-index="'+index+'" data-value="'+esc(o.value)+'">'+esc(o.label)+'</button>').join('')+'</div></details>';}
    function paint(){
      el.classList.toggle('open',p.open);document.body.style.overflow=p.open?'hidden':'';if(!p.open)return;
      document.getElementById('piTitle').textContent='Import lots from a spreadsheet';document.getElementById('piSub').textContent='CSV / XLSX · AI instructions from Settings · Review before import';
      document.getElementById('piSteps').innerHTML=['Spreadsheet','Review','Import'].map((s,i)=>'<li class="'+(i+1===p.step?'on':'')+'"><i>'+(i+1)+'</i>'+s+'</li>').join('');
      let html=p.error?'<div class="si-error" role="alert">'+esc(p.error)+'</div>':'';
      if(p.step===3&&p.run){const run=p.run,pct=run.total?Math.round(run.completed/run.total*100):0;html+='<section id="siImportProgress" class="si-import-progress" role="status" aria-live="polite"><div class="si-progress-heading"><strong>'+(p.creating?'Creating lots…':p.error?'Import stopped':run.failed?'Import finished — review unsuccessful rows':'Import complete')+'</strong><span>'+run.completed+' / '+run.total+' processed</span></div><div class="si-progress-track" role="progressbar" aria-label="Lots processed" aria-valuemin="0" aria-valuemax="'+run.total+'" aria-valuenow="'+run.completed+'"><i style="width:'+pct+'%"></i></div><p>'+run.created+' created · '+run.failed+' not created'+(p.creating?' · '+esc(run.current):'')+'</p></section>';}
      if(p.step===1){html+='<h3>Selected subdivisions</h3><input id="siSubSearch" type="search" placeholder="Search subdivisions" aria-label="Search subdivisions"><div class="si-subs">'+ctx.subdivisions().map(s=>'<label><input type="checkbox" data-sub="'+esc(s.ID)+'" '+(p.ids.includes(String(s.ID))?'checked':'')+(busy()?' disabled':'')+'>'+esc(s.Subdivision_Name)+' <small>'+esc(s.Subdivision_Code)+'</small></label>').join('')+'</div><label class="si-upload">Choose CSV or XLSX<input id="siFile" type="file" accept=".csv,.xlsx" '+(busy()?'disabled':'')+'></label><p>'+esc(p.fileName||'Choose the subdivision(s), then upload your lot and block spreadsheet.')+'</p><p>'+ (p.reading?'Reading file…':p.source.length+' nonempty source rows')+'</p><p class="si-note">Every worksheet is read. Blank rows and headings are skipped by AI. Source row numbers stay attached to each staged lot.</p>';}
      else{
        const subs=chosen();html+='<div class="si-locations">'+subs.map(s=>'<section><strong>'+esc(s.Subdivision_Name)+'</strong><div><small>City</small>'+picker('city',s.importCity,ctx.cities.map(c=>({value:c,label:c})),'city',s.ID)+'</div><div><small>County</small>'+picker('county',s.importCounty,ctx.counties.map(c=>({value:c,label:c})),'county',s.ID)+'</div></section>').join('')+'</div>';
        html+='<p>'+p.rows.filter(r=>r.created).length+' imported · '+p.rows.filter(r=>r.on&&!r.created).length+' staged. Review source values, subdivision, and flags before confirming.</p>';
        if(p.warnings.length)html+='<details><summary>AI review notes</summary>'+p.warnings.map(w=>'<p>'+esc(w)+'</p>').join('')+'</details>';
        html+='<div class="si-table"><table><thead><tr><th>Use</th><th>Source</th><th>Subdivision</th><th>Block</th><th>Lot</th><th>Width (ft)</th><th>Lot code / review</th></tr></thead><tbody>'+p.rows.map((r,i)=>{
          const sub=subs.find(s=>String(s.ID)===r.subId),flags=issues(r,subs,p.rows,existing,ctx.cities,ctx.counties);return '<tr class="'+(flags.length?'si-bad':'')+'"><td><input type="checkbox" data-on="'+i+'" '+(r.on?'checked':'')+' '+(busy()||r.created?'disabled':'')+'></td><td><details><summary>'+esc(r.sheet)+' : '+r.row+'</summary><div class="si-source">'+r.source.map((v,j)=>'<p>Column '+(j+1)+': '+esc(v)+'</p>').join('')+'</div></details></td><td>'+ (r.created?esc(sub&&sub.Subdivision_Name):picker('subdivision',sub&&sub.Subdivision_Name,subs.map(s=>({value:String(s.ID),label:text(s.Subdivision_Name)})),'subdivision',i))+'</td>'+['block','lot','width'].map(f=>'<td><input data-row="'+i+'" data-field="'+f+'" aria-label="'+f+' for source row '+r.row+'" value="'+esc(r[f])+'" '+(busy()||r.created?'disabled':'')+'></td>').join('')+'<td><b>'+esc(r.code)+'</b><div>'+esc(r.created?'Imported':flags.join(' · '))+'</div>'+(r.issue?'<label><input type="checkbox" data-review="'+i+'" '+(r.reviewed?'checked':'')+' '+(busy()||r.created?'disabled':'')+'>Reviewed: '+esc(r.issue)+'</label>':'')+'</td></tr>';}).join('')+'</tbody></table></div>';
      }
      body.innerHTML=html;meta.textContent=p.scanning?'AI reading batch '+p.progress+' of '+p.total:p.creating?'Importing '+p.progress+' of '+p.total:'No records are written until you confirm.';
      document.getElementById('piClose').disabled=!!busy();
      foot.innerHTML='<button type="button" class="btn" data-action="close" '+(busy()?'disabled':'')+'>Close</button>'+(p.step===2?'<button type="button" class="btn" data-action="back" '+(busy()?'disabled':'')+'>Change file / subdivisions</button>':'')+(p.scanning?'<button type="button" class="btn" data-action="cancel">Cancel review</button>':p.step===1?'<button type="button" class="btn primary" data-action="scan" '+(!p.ids.length||!p.source.length||busy()?'disabled':'')+'>Stage lots with AI</button>': '<button type="button" class="btn primary" data-action="import" '+(busy()||!p.rows.some(r=>r.on&&!r.created)?'disabled':'')+'>Review and import selected</button>');
    }
    async function file(f){if(busy())return;p.error='';p.rows=[];p.source=[];p.reading=true;p.fileName=f.name;paint();try{if(f.size>10*1024*1024)throw Error('The file exceeds 10 MB. Split it into smaller spreadsheets.');let rows;
        if(/\.csv$/i.test(f.name))rows=sheetRows('CSV',parseCSV(await f.text()));else if(/\.xlsx$/i.test(f.name)){if(!xlsxPromise)xlsxPromise=new Promise((res,rej)=>{const s=document.createElement('script');s.src='vendor/xlsx.full.min.js';s.onload=()=>res(root.XLSX);s.onerror=()=>{xlsxPromise=null;rej(Error('The XLSX reader could not load. Try again.'));};document.head.appendChild(s);});rows=readWorkbook(await f.arrayBuffer(),await xlsxPromise);}else throw Error('Choose a CSV or XLSX file.');
        if(!rows.length)throw Error('The spreadsheet is empty.');if(rows.length>5000)throw Error('The spreadsheet has more than 5,000 nonempty rows. Split it into smaller files.');if(rows.reduce((n,r)=>n+r.cells.length,0)>100000)throw Error('Too many spreadsheet cells. Split the file.');p.source=rows;
      }catch(e){p.error=e.message;}finally{p.reading=false;paint();}}
    async function scan(){if(busy()||!p.ids.length||!p.source.length)return;p.scanning=true;p.cancel=false;p.error='';p.rows=[];p.warnings=[];p.progress=0;paint();try{
        const ping=await ctx.invoke({mode:'ping'});if(ping.spreadsheet_schema!==2)throw Error('Spreadsheet import needs the updated Plat_AI_Ingest function published in this Creator environment.');
        const subs=chosen(),groups=batches(p.source),staged=[];p.total=groups.length;
        for(const group of groups){if(p.cancel)break;p.progress++;paint();const sheet=group[0].sheet;const prior=p.source.filter(r=>r.sheet===sheet&&r.row<=group[0].row);const context=prior.filter(r=>r.cells.some(c=>/\b(project|phase|subdivision|block|lot|width|size)\b/i.test(text(c)))).slice(-20);if(JSON.stringify(context).length>20000)throw Error('Spreadsheet metadata is too large. Remove long notes or split the file.');
          const reply=await ctx.invoke({mode:'spreadsheet',schema:2,subdivisions:subs.map(s=>({id:String(s.ID),name:text(s.Subdivision_Name),code:text(s.Subdivision_Code),phase:text(s.Phase)})),context,sourceRows:group});
          if(!Array.isArray(reply.rows))throw Error('AI returned no row list. Retry the review.');staged.push(...stage(group,reply.rows,subs));p.warnings.push(...(Array.isArray(reply.warnings)?reply.warnings.map(text):[]));
        }
        if(p.cancel)throw Error('Review cancelled. No records were imported.');const omitted=omittedRows(p.source,staged);if(omitted.length)p.warnings.push(omitted.length+' possible lot rows were omitted by AI and added for manual review.');staged.push(...omitted);if(!staged.length)throw Error('AI found no lot rows. Check your headers and Settings instructions.');p.rows=checkMetadata(p.source,staged,subs).sort((a,b)=>a.sheet.localeCompare(b.sheet)||a.row-b.row);
        await refreshExisting(subs);p.step=2;
      }catch(e){p.error=e.message;}finally{p.scanning=false;paint();}}
    async function refreshExisting(subs){existing.clear();const groups=await Promise.all(subs.map(s=>ctx.readLots(String(s.ID))));for(const rows of groups)for(const l of rows)if(l.Lot_Code)existing.add(text(l.Lot_Code).toUpperCase());}
    async function create(){if(busy())return;const subs=chosen(),rows=p.rows.filter(r=>r.on&&!r.created);p.rows.forEach(r=>r.error='');
      if(rows.some(r=>issues(r,subs,p.rows,existing,ctx.cities,ctx.counties).length)){p.error='Resolve the highlighted rows or uncheck them before importing.';paint();return;}
      p.confirming=true;paint();const yes=await ctx.confirm({kicker:'Import lots',title:'Create '+rows.length+' lot records?',message:'Status Open. Review the subdivision, block, lot number, and width before confirming.',items:rows.slice(0,8).map(r=>r.code),okLabel:'Import '+rows.length+' lots'});p.confirming=false;if(!yes||!p.open){paint();return;}
      p.creating=true;p.step=3;p.error='';p.progress=0;p.total=rows.length;p.run={total:rows.length,completed:0,created:0,failed:0,current:'Checking existing lot codes…'};paint();try{await refreshExisting(subs);
        for(const r of rows){const flags=issues(r,subs,p.rows,existing,ctx.cities,ctx.counties);if(flags.length){r.error=flags.join(' · ');p.run.failed++;p.run.completed++;p.progress=p.run.completed;paint();continue;}const s=subs.find(s=>String(s.ID)===r.subId);p.run.current=r.code;paint();
          const data={Lot_Code:r.code,Status:'Open',Subdivision:r.subId,Subdivision_Code:text(s.Subdivision_Code),Phase:Number(s.Phase),Block:text(r.block),Lot_Number:Number(r.lot),City:s.importCity,County:s.importCounty,Archived:false,On_Hold:false,Notes:'Spreadsheet import · '+p.fileName+' · '+r.sheet+' row '+r.row};if(text(r.width))data.Lot_Size=Number(r.width);
          try{await ctx.add(data);r.created=true;r.on=false;existing.add(r.code.toUpperCase());p.run.created++;}catch(e){r.error=ctx.error(e);p.run.failed++;}p.run.completed++;p.progress=p.run.completed;paint();
        }
        ctx.log('info','Spreadsheet lot import finished',{created:p.rows.filter(r=>r.created).length,failed:rows.filter(r=>!r.created).length});p.run.current='Refreshing lots…';paint();await ctx.reload();
      }catch(e){p.error='Import stopped: '+ctx.error(e);}finally{p.creating=false;paint();}}
    function open(){returnFocus=document.activeElement;p={open:true,step:1,ids:ctx.selected().slice(),locations:{},source:[],rows:[],warnings:[],fileName:'',error:'',reading:false,scanning:false,creating:false,progress:0,total:0};
      for(const s of ctx.subdivisions())p.locations[String(s.ID)]={importCity:text(s.City),importCounty:text(s.County)};paint();document.getElementById('piClose').focus();}
    async function close(force){if(busy())return;if(!force&&p.rows.some(r=>!r.created)){p.confirming=true;const yes=await ctx.confirm({title:'Discard staged rows?',message:'Rows already imported remain in Lots.',okLabel:'Discard staged rows'});p.confirming=false;if(!yes)return;}p.open=false;paint();if(returnFocus)returnFocus.focus();}
    el.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&b.dataset.pick&&!busy()){const v=b.dataset.value,i=b.dataset.index;if(b.dataset.pick==='subdivision'){p.rows[Number(i)].subId=v;p.rows[Number(i)].error='';}else p.locations[i][b.dataset.pick==='city'?'importCity':'importCounty']=v;paint();return;}const action=b&&b.dataset.action;if(action==='back'&&!busy()){p.step=1;paint();}if(action==='scan')scan();if(action==='import')create();if(action==='close'||b&&b.id==='piClose'||e.target===el)close();if(action==='cancel'){p.cancel=true;meta.textContent='Cancelling after the current AI call…';}});
    el.addEventListener('input',e=>{const t=e.target;if(t.id==='siSubSearch'){el.querySelectorAll('.si-subs label').forEach(n=>n.hidden=!n.textContent.toLowerCase().includes(t.value.toLowerCase()));}else if(t.closest('.si-picker')&&t.type==='search'){t.closest('.si-picker').querySelectorAll('button').forEach(b=>b.hidden=!b.textContent.toLowerCase().includes(t.value.toLowerCase()));}});
    el.addEventListener('change',e=>{if(busy())return;const t=e.target;if(t.id==='siFile'&&t.files[0])file(t.files[0]);else if(t.dataset.sub){p.ids=t.checked?p.ids.concat(t.dataset.sub):p.ids.filter(id=>id!==t.dataset.sub);paint();}else if(t.dataset.row!=null){const r=p.rows[Number(t.dataset.row)];r[t.dataset.field]=t.dataset.field==='width'?text(t.value):normalize(t.value);r.error='';paint();}else if(t.dataset.on!=null){p.rows[Number(t.dataset.on)].on=t.checked;paint();}else if(t.dataset.review!=null){p.rows[Number(t.dataset.review)].reviewed=t.checked;paint();}});
    document.addEventListener('keydown',e=>{if(!p.open)return;if(document.getElementById('piConfirm').classList.contains('open'))return;if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const focus=Array.from(el.querySelectorAll('button:not([disabled]),input:not([disabled]),summary')).filter(n=>n.getClientRects().length&&!n.closest('[hidden]'));const first=focus[0],last=focus[focus.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
    return {open,close,paint,file,scan,create,state:()=>p};
  }
  root.LMSpreadsheetImport={parseCSV,sheetRows,readWorkbook,batches,stage,omittedRows,checkMetadata,code,issues,mount,starter};
})(globalThis);
