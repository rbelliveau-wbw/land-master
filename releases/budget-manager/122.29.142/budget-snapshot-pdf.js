(function(root){
  'use strict';
  var scriptUrl=typeof document!=='undefined'&&document.currentScript?document.currentScript.src:'';
  function recordId(value){
    if(value&&typeof value==='object')value=value.ID;
    if(typeof value!=='string'||!/^[1-9][0-9]*$/.test(value))throw new Error('Incomplete record identity in PDF snapshot.');
    return value;
  }
  function text(value){return value==null?'':String(value).replace(/<br\s*\/?\s*>/gi,'\n').replace(/\r\n?/g,'\n');}
  function amount(value){
    if(value==null||value==='')return 0;
    if(typeof value==='string'){
      value=value.trim().replace(/,/g,'');
      if(!/^-?\d+(\.\d+)?$/.test(value))throw new Error('Invalid category total in PDF snapshot.');
      value=Number(value);
    }
    if(typeof value!=='number'||!Number.isFinite(value))throw new Error('Invalid category total in PDF snapshot.');
    return value;
  }
  function money(value,precise){
    if(value==null)return '\u2014';
    return (value<0?'-$':'$')+Math.abs(value).toLocaleString('en-US',{minimumFractionDigits:precise?0:2,maximumFractionDigits:precise?4:2});
  }
  function definition(snapshot){
    var bid=recordId(snapshot.budgetId),meta=root.BudgetFullExport.parseSnapshotMeta(snapshot.meta,bid);
    var rows=snapshot.rows,elements=snapshot.elementRows,ids=snapshot.itemIds,structure=snapshot.structure;
    if(!Array.isArray(rows)||!Array.isArray(ids)||ids.length!==rows.length||!Array.isArray(elements)||elements.length!==rows.length*5||!structure||!Array.isArray(structure.categories)||!Array.isArray(structure.items))throw new Error('Incomplete PDF snapshot.');
    var categories=new Map(),items=new Map(),seen=new Set();
    structure.categories.forEach(function(row,index){
      var id=recordId(row.ID);
      if(recordId(row.Budget)!==bid||categories.has(id))throw new Error('Wrong or duplicate category in PDF snapshot.');
      categories.set(id,{id:id,index:index,code:text(row.Category_Code),name:text(row.Budget_Category_Name==null?'Uncategorized':row.Budget_Category_Name),department:text(row.Deparment),final:amount(row.Budget_Total),entries:[]});
    });
    structure.items.forEach(function(row){
      var id=recordId(row.ID),category=recordId(row.Budget_Category);
      if(items.has(id)||!categories.has(category))throw new Error('Wrong or duplicate item category in PDF snapshot.');
      items.set(id,category);
    });
    if(items.size!==rows.length)throw new Error('Budget rows changed during export. Export again.');
    rows.forEach(function(row,index){
      var id=recordId(ids[index]),category=categories.get(items.get(id));
      if(seen.has(id)||!category||!Array.isArray(row)||row.length!==16)throw new Error('Missing or duplicate item in PDF snapshot.');
      seen.add(id);
      row.forEach(function(value,column){
        if(column>=8&&column<=14){if(column===8&&value===null)return;if(typeof value!=='number'||!Number.isFinite(value))throw new Error('Invalid amount in PDF snapshot.');}
        else if(typeof value!=='string')throw new Error('Invalid text in PDF snapshot.');
      });
      // These are prewrite read-consistency checks, never post-save equality gates.
      if(row[2]!==category.department||row[3]!==category.code||row[4]!==category.name)throw new Error('Budget categories changed during export. Export again.');
      var detail=elements.slice(index*5,index*5+5);
      detail.forEach(function(element,offset){
        if(!Array.isArray(element)||element.length!==16||element[7]!==['(1) Labor','(2) Materials','(3) Equipment','(4) Subcontractor','(5) Other'][offset]||element.slice(8,15).some(function(value){return value!==null&&(typeof value!=='number'||!Number.isFinite(value));}))throw new Error('Incomplete element detail in PDF snapshot.');
      });
      category.entries.push({row:row,elements:detail,index:index});
    });
    var ordered=Array.from(categories.values()).sort(function(a,b){
      var left=Number(a.code),right=Number(b.code);
      if(Number.isFinite(left)&&Number.isFinite(right)&&left!==right)return left-right;
      return a.code<b.code?-1:a.code>b.code?1:a.index-b.index;
    });
    ordered.forEach(function(category){category.entries.sort(function(a,b){return a.row[5]<b.row[5]?-1:a.row[5]>b.row[5]?1:a.index-b.index;});});
    var ink='#183d70',line='#d7e1ed';
    function cell(value,numeric,header){return {text:text(value),alignment:numeric?'right':'left',bold:!!header,color:header?ink:'#23364d',fillColor:header?'#eef4fb':undefined};}
    function table(head,body,widths,numericStart,numericEnd,dense){
      return {margin:[0,2,0,8],table:{headerRows:1,keepWithHeaderRows:1,widths:widths,body:[head.map(function(value,i){return cell(value,i>=numericStart&&i<=numericEnd,true);})].concat(body.map(function(row){return row.map(function(value,i){return cell(value,i>=numericStart&&i<=numericEnd,false);});}))},layout:{hLineWidth:function(){return 0.35;},vLineWidth:function(){return 0;},hLineColor:function(){return line;},paddingLeft:function(){return 2.5;},paddingRight:function(){return 2.5;},paddingTop:function(){return dense?1.25:2.25;},paddingBottom:function(){return dense?1.25:2.25;}}};
    }
    var summary=meta.summary,content=[{text:'Budget Export',fontSize:20,bold:true,color:ink,margin:[0,0,0,10]},
      table(['Budget','Subdivision Code','Territory','Exported','Current Final Budget'],[[summary.budgetLabel,summary.subdivisionCode,summary.territory,summary.exportedDate,money(summary.grandFinal)]],[230,72,100,134,110],4,4)];
    ordered.forEach(function(category){
      // The heading is part of the repeated table header, so page breaks never
      // strand a category label or lose its saved Final total.
      var heading=category.code+'  '+category.name+'  |  '+category.department+'  |  Final: '+money(category.final);
      var node=table(['Code','Budget Item','Unit','Cost per Unit','Preliminary','Unapproved','Final','HCSS Actuals','GP Actuals','Notes'],category.entries.map(function(entry){var row=entry.row;return [row[5],row[6],row[7],row[8]===null?'':money(row[8]),money(row[9]),money(row[10]),money(row[11]),money(row[13]),money(row[14]),row[15]];}),[44,126,26,62,60,60,60,60,60,134],3,8);
      node.table.body.unshift([{text:heading,colSpan:10,bold:true,fontSize:10,color:ink,fillColor:'#e5eef8'},{},{},{},{},{},{},{},{},{}]);
      node.table.headerRows=2;
      if(!category.entries.length)node.table.body.push([{text:'No Budget Items',colSpan:10,color:'#62758c'},{},{},{},{},{},{},{},{},{}]);
      content.push(node);
    });
    content.push({text:'Budget Elements',pageBreak:'before',fontSize:16,bold:true,color:ink,margin:[0,0,0,8]});
    ordered.forEach(function(category){
      if(!category.entries.length)return;
      var detail=[],codeCounts=new Map();
      category.entries.forEach(function(entry){var code=entry.row[5];codeCounts.set(code,(codeCounts.get(code)||0)+1);});
      category.entries.forEach(function(entry){entry.elements.forEach(function(element,index){
        // Repeat the source code on every row so page continuations stay
        // identifiable. Blank/shared codes also need the full name on every row.
        var code=entry.row[5],name=index===0||!code.trim()||codeCounts.get(code)>1?entry.row[6]:'';
        detail.push([code+(name?(code?'  ':'')+name:'')].concat([element[7]],element.slice(8,15).map(function(value){return money(value,true);})));
      });});
      var node=table(['Code / Budget Item','Element','Preliminary','Unapproved','Final','Approved Mods','Revised Final','HCSS Actuals','GP Actuals'],detail,[146,90,65,65,65,65,65,65,65],2,8,true);
      node.table.body.unshift([{text:category.code+'  '+category.name+'  |  '+category.department,colSpan:9,bold:true,fontSize:10,color:ink,fillColor:'#e5eef8'},{},{},{},{},{},{},{},{}]);
      node.table.headerRows=2;
      node.table.body.slice(2).forEach(function(row,index){row[0].bold=index%5===0;if(Math.floor(index/5)%2===1)row.forEach(function(value){value.fillColor='#f5f8fc';});});
      node.layout.hLineWidth=function(index){return index<2||((index-2)%5===0)?0.5:0.2;};
      content.push(node);
    });
    content.push({text:'Approval History',pageBreak:'before',fontSize:16,bold:true,color:ink,margin:[0,0,0,10]});
    var approvals=meta.approvals.map(function(row){return ['track','role','approver','status','respondedDate','notes'].map(function(key){return text(row[key]);});});
    content.push(table(['Track','Role','Approver','Status','Responded','Approval Notes'],approvals.length?approvals:[['No Approval History','','','','','']],[88,70,170,90,80,140],-1,-1));
    return {pageSize:'LETTER',pageOrientation:'landscape',pageMargins:[25,25,25,34],info:{title:'Budget Export - '+summary.budgetLabel,author:'Land Master'},defaultStyle:{font:'Roboto',fontSize:7.5},content:content,footer:function(page,count){return {text:'Page '+page+' of '+count,alignment:'right',fontSize:8,color:'#62758c',margin:[25,10,25,0]};}};
  }
  function render(snapshot){
    return new Promise(function(resolve,reject){
      var worker,timer,finished=false;
      function finish(error,buffer){if(finished)return;finished=true;clearTimeout(timer);if(worker)worker.terminate();if(error)reject(error);else resolve(buffer);}
      try{
        var url=new URL('budget-snapshot-pdf-worker.js',scriptUrl);url.search=new URL(scriptUrl).search;
        worker=new Worker(url.href);
        worker.onmessage=function(event){var data=event.data||{};if(data.ok===true&&data.buffer instanceof ArrayBuffer&&data.buffer.byteLength>5)finish(null,data.buffer);else finish(new Error(data.error||'The PDF could not be generated.'));};
        worker.onerror=function(){finish(new Error('The PDF generator could not start. Reload the budget and try again.'));};
        worker.onmessageerror=function(){finish(new Error('The PDF generator returned an unreadable file.'));};
        timer=setTimeout(function(){finish(new Error('PDF generation timed out before attachment creation. Try exporting again.'));},120000);
        worker.postMessage(snapshot);
      }catch(error){finish(error);}
    });
  }
  root.BudgetSnapshotPdf={definition:definition,render:render};
})(typeof window!=='undefined'?window:globalThis);
