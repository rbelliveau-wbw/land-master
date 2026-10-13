(function(root){
  'use strict';
  var columns=['budgetItemId','itemName','description','quantity','uom','costElement','unitPrice','finalAmount'];
  function parse(text){
    if(typeof text!=='string'||text.length>500000)throw Error('Clipboard is too large.');
    var rows=[],row=[],value='',quoted=false,atStart=true;
    for(var i=0;i<text.length;i++){
      var ch=text[i];
      if(ch==='"'&&(quoted||atStart)){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;atStart=false;continue;}
      if(!quoted&&(ch==='\t'||ch==='\n'||ch==='\r')){row.push(value);value='';atStart=true;if(ch!=='\t'){rows.push(row);row=[];if(ch==='\r'&&text[i+1]==='\n')i++;}continue;}
      value+=ch;atStart=false;
    }
    if(quoted)throw Error('Clipboard contains an unfinished quoted cell.');
    if(value!==''||row.length||!rows.length){row.push(value);rows.push(row);}
    if(rows.length>250||rows.some(function(r){return r.length>8;}))throw Error('Paste supports up to 250 rows and 8 columns.');
    return rows;
  }
  function rect(a,b){return {r0:Math.min(a.row,b.row),r1:Math.max(a.row,b.row),c0:Math.min(a.col,b.col),c1:Math.max(a.col,b.col)};}
  function cell(line,col,items){var item=items.find(function(i){return i.id===line.budgetItemId;});return col===0?(item&&item.baseCode?item.baseCode+'-'+line.costElement:line.costCode||item&&item.code||''):col===1?(item&&item.name||''):line[columns[col]]==null?'':String(line[columns[col]]);}
  function encode(rows){return rows.map(function(row){return row.map(function(v){v=String(v);return /[\t\r\n"]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}).join('\t');}).join('\r\n');}
  function copy(lines,range,items){var rows=[];for(var r=range.r0;r<=range.r1;r++){var row=[];for(var c=range.c0;c<=range.c1;c++)row.push(cell(lines[r],c,items));rows.push(row);}return encode(rows);}
  function numeric(text,label,quantity){text=text.trim();if(!text)return null;if(/^[=$@+\-]/.test(text)&&text[0]!=='$')throw Error(label+' must be a positive number; formulas are not supported.');text=text.replace(/^\$/,'');if(text.includes(',')){if(!/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(text))throw Error(label+' has invalid grouping.');text=text.replace(/,/g,'');}if(quantity){root.LMPO.multiply(text,'0.00');return text;}return root.LMPO.currency(root.LMPO.money(text));}
  function paste(lines,start,rows,items,newLine){
    if(start.row<0||start.col<0||start.row+rows.length>250||rows.some(function(r){return start.col+r.length>8;}))throw Error('Paste exceeds the 250-line ledger.');
    var draft=lines.map(function(l){return Object.assign({},l);});
    for(var add=draft.length;add<start.row+rows.length;add++){var next=newLine();var prior=draft[draft.length-1];if(prior){next.budgetItemId=prior.budgetItemId;next.uom=prior.uom;}draft.push(next);}
    rows.forEach(function(values,offset){var line=draft[start.row+offset],changes={};values.forEach(function(value,i){changes[columns[start.col+i]]=value;});
      if('budgetItemId' in changes){var wanted=changes.budgetItemId.trim().toLowerCase(),matches=items.filter(function(item){return [item.id,item.code,item.label,item.code+'-'+(changes.costElement||line.costElement),item.baseCode?item.baseCode+'-'+(changes.costElement||line.costElement):''].some(function(v){return String(v||'').toLowerCase()===wanted;});});if(!wanted)line.budgetItemId='';else if(matches.length!==1)throw Error('Cost code must match one eligible budget item.');else{line.budgetItemId=matches[0].id;line.costCode='';if(!line.description&&!('description' in changes))line.description=matches[0].name;}}
      if('itemName' in changes&&changes.itemName!==cell(line,1,items))throw Error('Item name comes from the budget item and cannot be edited.');
      if('description' in changes){if(changes.description.length>1000)throw Error('Line description is limited to 1000 characters.');line.description=changes.description;}
      if('uom' in changes){var unit=changes.uom.trim().toUpperCase();if(unit&&root.LMPO.uoms.indexOf(unit)<0)throw Error('Select a valid UOM.');line.uom=unit;}
      if('costElement' in changes){var elem=changes.costElement.trim();if(!/^[1-5]$/.test(elem))throw Error('ELEM must be 1–5.');line.costElement=elem;line.costCode='';}
      var pricing='quantity' in changes||'unitPrice' in changes;
      if(pricing){line.pricingMode='Calculated';if('quantity' in changes)line.quantity=numeric(changes.quantity,'Quantity',true);if('unitPrice' in changes)line.unitPrice=numeric(changes.unitPrice,'Unit price',false);line.finalAmount=line.quantity&&line.unitPrice?root.LMPO.multiply(line.quantity,line.unitPrice):null;}
      if('finalAmount' in changes){var total=numeric(changes.finalAmount,'Total',false);if(pricing&&total!==null){if('quantity' in changes&&'unitPrice' in changes&&line.quantity===null&&line.unitPrice===null){line.pricingMode='Manual';line.finalAmount=total;}else if(total!==line.finalAmount)throw Error('Total differs from quantity × price. Paste quantities/prices or a manual total.');}else if(!pricing){line.pricingMode='Manual';line.quantity=null;line.unitPrice=null;line.finalAmount=total;}}
    });return draft;
  }
  function fill(lines,range,items,newLine){if(range.r1<=range.r0)throw Error('Select at least two rows to fill down.');var values=[];for(var c=range.c0;c<=range.c1;c++)values.push(cell(lines[range.r0],c,items));return paste(lines,{row:range.r0+1,col:range.c0},Array.from({length:range.r1-range.r0},function(){return values.slice();}),items,newLine);}
  function bind(options){
    var el=options.container,anchor=null,active=null,dragging=false,editing=false,history=[],allowPicker=false,lineKeys=null;
    function model(){return options.model();}
    function enabled(){return model()&&model().gridMode==='excel'&&!options.busy();}
    function point(target){var node=target.closest('[data-po-cell]');return node?{row:Number(node.dataset.poRow),col:Number(node.dataset.poCol)}:null;}
    function range(){return anchor&&active?rect(anchor,active):null;}
    function focus(){if(!active)return;var node=el.querySelector('[data-po-cell][data-po-row="'+active.row+'"][data-po-col="'+active.col+'"]');if(node){node.focus({preventScroll:true});node.scrollIntoView({block:'nearest',inline:'nearest'});if(node.select)node.select();}}
    function paint(){
      var keys=model().lines.map(function(line){return line.key;}).join('|');if(lineKeys!==null&&keys!==lineKeys){history=[];anchor=active=null;}lineKeys=keys;var excel=enabled();el.classList.toggle('po-excel-mode',excel);
      el.querySelectorAll('.po-line').forEach(function(row,r){row.querySelectorAll('.po-line-fields>div,.po-line-fields>label,.po-line-fields>span').forEach(function(cell,c){if(c>=8)return;var node=cell.querySelector('input,button')||cell;node.dataset.poCell='';node.dataset.poRow=r;node.dataset.poCol=c;if(c===1)node.tabIndex=excel?0:-1;});});
      if(active&&active.row>=model().lines.length)anchor=active=null;
      var selection=range();el.querySelectorAll('[data-po-cell]').forEach(function(node){var selected=excel&&selection&&Number(node.dataset.poRow)>=selection.r0&&Number(node.dataset.poRow)<=selection.r1&&Number(node.dataset.poCol)>=selection.c0&&Number(node.dataset.poCol)<=selection.c1;node.classList.toggle('po-cell-selected',!!selected);node.classList.toggle('po-cell-active',!!(excel&&active&&Number(node.dataset.poRow)===active.row&&Number(node.dataset.poCol)===active.col));});
      var fillButton=el.querySelector('[data-po-grid-fill]');if(fillButton)fillButton.disabled=options.locked()||!selection||selection.r0===selection.r1;
      var undoButton=el.querySelector('[data-po-grid-undo]');if(undoButton)undoButton.disabled=!history.length||options.locked();
      var status=el.querySelector('[data-po-grid-status]');if(status)status.textContent=selection?String(selection.r1-selection.r0+1)+' × '+String(selection.c1-selection.c0+1)+' selected':'Shift-click to select · F2 to edit';
    }
    function select(p,extend){if(!extend||!anchor)anchor=p;active=p;editing=false;paint();}
    function apply(rows,start){if(options.locked()||options.busy())return;var before=model().lines,after=paste(before,start,rows,options.items(),options.newLine);history.push(before.map(function(l){return Object.assign({},l);}));if(history.length>25)history.shift();model().lines=after;lineKeys=after.map(function(line){return line.key;}).join('|');options.render();focus();}
    el.addEventListener('pointerdown',function(event){if(!enabled())return;var p=point(event.target);if(!p)return;if(event.shiftKey){event.preventDefault();event.stopPropagation();}select(p,event.shiftKey);dragging=true;},true);
    el.addEventListener('pointerover',function(event){if(!enabled()||!dragging||event.buttons!==1)return;var p=point(event.target);if(p){event.preventDefault();select(p,true);}},true);
    el.addEventListener('pointerup',function(){dragging=false;},true);
    el.addEventListener('click',function(event){var mode=event.target.closest('[data-po-grid-mode]');if(mode&&!options.busy()){event.preventDefault();event.stopPropagation();model().gridMode=model().gridMode==='excel'?'row':'excel';anchor=active=null;options.render();el.querySelector('[data-po-grid-mode]').focus();return;}if(!enabled())return;var p=point(event.target);if(p&&event.shiftKey){event.preventDefault();event.stopPropagation();select(p,true);focus();return;}if(p&&event.target.closest('[data-po-picker]')&&!allowPicker&&event.detail<2){event.preventDefault();event.stopPropagation();focus();return;}
      if(event.target.closest('[data-po-grid-fill]')){event.preventDefault();event.stopPropagation();try{var selection=range();if(!selection)return;var rows=[];for(var r=selection.r0+1;r<=selection.r1;r++){var values=[];for(var c=selection.c0;c<=selection.c1;c++)values.push(cell(model().lines[selection.r0],c,options.items()));rows.push(values);}apply(rows,{row:selection.r0+1,col:selection.c0});}catch(e){options.error(e.message);}return;}
      if(event.target.closest('[data-po-grid-undo]')){event.preventDefault();event.stopPropagation();if(history.length&&!options.locked()){model().lines=history.pop();lineKeys=model().lines.map(function(line){return line.key;}).join('|');options.render();focus();}return;}
      if(event.target.closest('[data-po-grid-copy]')){event.preventDefault();event.stopPropagation();var selection=range();if(!selection)return;navigator.clipboard.writeText(copy(model().lines,selection,options.displayItems())).catch(function(){options.error('Copy unavailable. Select cells and use Ctrl+C.');});}
    },true);
    el.addEventListener('copy',function(event){if(!enabled()||editing||!point(event.target)||!range())return;event.preventDefault();event.clipboardData.setData('text/plain',copy(model().lines,range(),options.displayItems()));},true);
    el.addEventListener('paste',function(event){if(!enabled()||!point(event.target)||options.locked())return;event.preventDefault();event.stopPropagation();try{var rows=parse(event.clipboardData.getData('text/plain'));if(rows.length===1&&rows[0].length===1&&range()&&(range().r1>range().r0||range().c1>range().c0)){var s=range();rows=Array.from({length:s.r1-s.r0+1},function(){return Array.from({length:s.c1-s.c0+1},function(){return rows[0][0];});});apply(rows,{row:s.r0,col:s.c0});}else apply(rows,point(event.target));}catch(e){options.error(e.message);}},true);
    el.addEventListener('keydown',function(event){if(!enabled()||!point(event.target))return;var p=point(event.target),command=event.ctrlKey||event.metaKey;if(!active)select(p,false);
      if(command&&event.key.toLowerCase()==='a'&&!editing){event.preventDefault();event.stopPropagation();anchor={row:0,col:0};active={row:model().lines.length-1,col:7};paint();return;}
      if(command&&event.key.toLowerCase()==='d'){event.preventDefault();event.stopPropagation();var button=el.querySelector('[data-po-grid-fill]');if(button&&!button.disabled)button.click();return;}
      if(command&&event.key.toLowerCase()==='z'&&!editing){event.preventDefault();event.stopPropagation();var undo=el.querySelector('[data-po-grid-undo]');if(undo&&!undo.disabled)undo.click();return;}
      if(event.key==='F2'){editing=true;if(event.target.select)event.target.select();if(event.target.hasAttribute('data-po-picker')){allowPicker=true;event.target.click();allowPicker=false;}event.preventDefault();event.stopPropagation();return;}
      if(event.key==='Escape'&&editing){editing=false;event.preventDefault();event.stopPropagation();return;}
      if(!editing&&['Delete','Backspace'].includes(event.key)&&!options.locked()){event.preventDefault();event.stopPropagation();try{var s=range();if(s.c0<=1)throw Error('Budget item and item name cannot be cleared as a range.');apply(Array.from({length:s.r1-s.r0+1},function(){return Array.from({length:s.c1-s.c0+1},function(){return '';});}),{row:s.r0,col:s.c0});}catch(e){options.error(e.message);}return;}
      var moves={ArrowLeft:[0,-1],ArrowRight:[0,1],ArrowUp:[-1,0],ArrowDown:[1,0],Enter:[event.shiftKey?-1:1,0],Tab:[0,event.shiftKey?-1:1]},move=moves[event.key];if(move&&(!editing||event.key==='Enter'||event.key==='Tab')){var row=active.row+move[0],col=active.col+move[1];if(event.key==='Tab'){if(col>7){row++;col=0;}if(col<0){row--;col=7;}if(row<0||row>=model().lines.length){editing=false;return;}}event.preventDefault();event.stopPropagation();row=Math.max(0,Math.min(model().lines.length-1,row));col=Math.max(0,Math.min(7,col));select({row:row,col:col},event.shiftKey&&event.key.startsWith('Arrow'));focus();return;}
      if(event.key.length===1&&!command){if(!editing&&event.target.select&&!event.target.readOnly)event.target.select();editing=true;}
    },true);
    return {paint:paint};
  }
  root.LMPOGrid={columns:columns,parse:parse,rect:rect,cell:cell,copy:copy,paste:paste,fill:fill,bind:bind};
})(typeof globalThis!=='undefined'?globalThis:this);
