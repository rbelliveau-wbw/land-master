(function(root){
  'use strict';
  var headers=['Project','Subdiv','Department','Category Code','Category','Cost Code','Budget Item','Unit','Cost per Unit','Preliminary','Unapproved','Final','Modification Amount','HCSS Actuals','GP Actuals','Notes'];
  var money='"$"#,##0.00;("$"#,##0.00);"$" -';
  var elementHeaders=['Project','Subdiv','Department','Category Code','Category','Cost Code','Budget Item','Element','Preliminary','Unapproved','Final','Modification Amount','Revised Final','HCSS Actuals','GP Actuals','Notes'];
  var elementLabels=['(1) Labor','(2) Materials','(3) Equipment','(4) Subcontractor','(5) Other'];
  function elementRows(row,values){
    var source=row.elements;
    if(source==null){
      // A prior Creator API can still export parent rows. Keep every element
      // visible as unknown rather than silently omitting its detail sheet.
      var dept=values[2].toLowerCase(),element=dept.indexOf('development')>=0?4:dept.indexOf('engineering')>=0?0:-1;
      source=elementLabels.map(function(label,index){var native=[label,null,null,null,null,null,null,null];if(element>=0){[9,10,11].forEach(function(col,i){native[i+1]=index===element?values[col]:0;});native[6]=index===element?values[13]:0;native[7]=index===element?values[14]:0;if(values[12]===0){native[4]=0;native[5]=native[3];}}return {code:String(index+1),label:label,values:native};});
    }
    if(!Array.isArray(source)||source.length!==5)throw new Error('Incomplete element detail in full export.');
    return source.map(function(element,index){
      if(!element||element.code!==String(index+1)||element.label!==elementLabels[index]||!Array.isArray(element.values)||element.values.length!==8||element.values[0]!==element.label||element.values.slice(1).some(function(value){return value!==null&&(typeof value!=='number'||!Number.isFinite(value));}))throw new Error('Invalid element detail in full export.');
      return values.slice(0,7).concat(element.values,[values[15]]);
    });
  }
  function id(value){return typeof value==='string'&&/^(0|[1-9][0-9]*)$/.test(value);}
  function greater(a,b){return a.length!==b.length?a.length>b.length:a>b;}
  function unwrap(response){
    var value=response;
    for(var i=0;i<6;i++){
      if(typeof value==='string'){try{value=JSON.parse(value);}catch(e){throw new Error(value||'Invalid full export response.');}}
      if(value&&value.contract==='budget-full-detail-v1')return value;
      if(!value||typeof value!=='object')break;
      if(value.code!=null&&String(value.code)!=='3000')throw new Error(value.message||'Full export request failed.');
      value=value.result!=null?value.result:value.details&&value.details.output!=null?value.details.output:value.output!=null?value.output:value.data;
    }
    throw new Error('The full export service is unavailable.');
  }
  function parseSnapshotMeta(response,budgetId){
    if(!id(budgetId)||budgetId==='0')throw new Error('Invalid budget scope in snapshot.');
    var meta=response;
    for(var i=0;i<6;i++){
      if(typeof meta==='string'){try{meta=JSON.parse(meta);}catch(e){throw new Error(meta||'Invalid budget snapshot metadata.');}}
      if(meta&&meta.contract==='budget-snapshot-meta-v1')break;
      if(!meta||typeof meta!=='object')throw new Error('The budget snapshot service is unavailable.');
      if(meta.code!=null&&String(meta.code)!=='3000')throw new Error(meta.message||'Budget snapshot request failed.');
      meta=meta.result!=null?meta.result:meta.details&&meta.details.output!=null?meta.details.output:meta.output!=null?meta.output:meta.data;
    }
    if(!meta||meta.contract!=='budget-snapshot-meta-v1')throw new Error('The budget snapshot service is unavailable.');
    if(meta.ok!==true)throw new Error(meta.error||'Budget snapshot metadata failed.');
    if(meta.budgetId!==budgetId)throw new Error('The snapshot service returned a different budget.');
    var summary=meta.summary,keys=['track','role','approver','status','respondedDate','notes'];
    if(!summary||['budgetLabel','subdivisionCode','territory','exportedDate'].some(function(key){return typeof summary[key]!=='string';})||typeof summary.grandFinal!=='number'||!Number.isFinite(summary.grandFinal)||!Array.isArray(meta.approvals))throw new Error('Incomplete budget snapshot metadata.');
    meta.approvals.forEach(function(approval){
      if(!approval||typeof approval!=='object'||Array.isArray(approval)||keys.some(function(key){return !Object.prototype.hasOwnProperty.call(approval,key)||(approval[key]!=null&&typeof approval[key]!=='string');}))throw new Error('Invalid approval history in budget snapshot.');
    });
    return meta;
  }
  async function collect(readPage,onProgress,isCurrent,options){
    options=options||{};
    var budgetId=options.budgetId,scoped=budgetId!=null;
    if(scoped&&(!id(budgetId)||budgetId==='0'))throw new Error('Invalid budget scope in export.');
    var after='0',through='0',total=null,pageSize=null,rows=[],elements=[];
    Object.defineProperty(rows,'elementRows',{value:elements});
    if(scoped)Object.defineProperty(rows,'budgetId',{value:budgetId});
    for(;;){
      if(isCurrent&&!isCurrent())throw new Error('The signed-in user or environment changed. Export again.');
      var cursor={after:after,through:through};
      if(scoped)cursor.budgetId=budgetId;
      var page=unwrap(await readPage(cursor));
      if(isCurrent&&!isCurrent())throw new Error('The signed-in user or environment changed. Export again.');
      if(page.ok!==true)throw new Error(page.error||'Full budget export failed.');
      var effectivePageSize=page.pageSize===undefined?200:page.pageSize;
      if(!Number.isSafeInteger(effectivePageSize)||effectivePageSize<1||effectivePageSize>200||!Array.isArray(page.rows)||page.rows.length>effectivePageSize||!Number.isSafeInteger(page.total)||page.total<0||!id(page.through)||!id(page.next)||page.after!==after||typeof page.hasMore!=='boolean')throw new Error('Incomplete full export response.');
      if(scoped&&page.budgetId!==budgetId)throw new Error('The export service returned a different budget.');
      if(total===null){total=page.total;through=page.through;pageSize=effectivePageSize;}
      if(effectivePageSize!==pageSize)throw new Error('Budget export page size changed. Export again.');
      if(page.total!==total||page.through!==through)throw new Error('Budget rows changed during export. Export again.');
      var previous=after;
      page.rows.forEach(function(row){
        if(!row||!id(row.id)||!greater(row.id,previous)||greater(row.id,through)||!Array.isArray(row.values)||row.values.length!==headers.length)throw new Error('Invalid full export row.');
        var values=row.values.slice();
        values.forEach(function(value,column){
          if(column>=8&&column<=14){
            if(column===8&&value==null)return;
            if(typeof value!=='number'||!Number.isFinite(value))throw new Error('Invalid amount in full export.');
          }else if(typeof value!=='string')throw new Error('Invalid text in full export.');
        });
        var detail=elementRows(row,values);
        if(options.allowZero!==true&&[9,10,11,13,14].every(function(column){return values[column]===0;})&&!detail.some(function(element){return element.slice(8,15).some(function(value){return typeof value==='number'&&value!==0;});}))throw new Error('The export service returned an empty budget row.');
        values[15]=values[15].replace(/<br\s*\/?\s*>/gi,'\n');
        detail.forEach(function(element){element[15]=values[15];});
        elements.push.apply(elements,detail);
        rows.push(values);previous=row.id;
      });
      if(page.next!==previous||rows.length>total||page.hasMore!==(page.rows.length===pageSize))throw new Error('Full export pagination could not be verified.');
      if(onProgress)onProgress(rows.length,total);
      if(!page.hasMore){if(rows.length!==total)throw new Error('Some budget rows are missing. Export again.');return rows;}
      if(!greater(page.next,after))throw new Error('Full export pagination stopped.');
      after=page.next;
    }
  }
  function workbook(X,rows){
    if(rows.length>1048575)throw new Error('The export exceeds Excel’s worksheet row limit.');
    var sheet=X.utils.aoa_to_sheet([headers].concat(rows));
    sheet['!cols']=[28,36,18,14,32,14,40,12,18,18,18,18,22,18,18,52].map(function(width){return {wch:width};});
    sheet['!autofilter']={ref:sheet['!ref']};
    rows.forEach(function(row,index){for(var col=8;col<=14;col++){var cell=sheet[X.utils.encode_cell({r:index+1,c:col})];if(cell)cell.z=money;}});
    var book=X.utils.book_new();X.utils.book_append_sheet(book,sheet,'Budget Detail');
    var elements=rows.elementRows||rows.reduce(function(all,row){return all.concat(elementRows({},row));},[]);
    for(var start=0;start<elements.length;start+=1048575){
      var chunk=elements.slice(start,start+1048575),detail=X.utils.aoa_to_sheet([elementHeaders].concat(chunk));
      detail['!cols']=[28,36,18,14,32,14,40,22,18,18,18,22,22,18,18,52].map(function(width){return {wch:width};});
      detail['!autofilter']={ref:detail['!ref']};chunk.forEach(function(row,index){for(var col=8;col<=14;col++){var cell=detail[X.utils.encode_cell({r:index+1,c:col})];if(cell)cell.z='"$"#,##0.####;("$"#,##0.####);"$" -';}});
      X.utils.book_append_sheet(book,detail,start?'Budget Elements '+(Math.floor(start/1048575)+1):'Budget Elements');
    }
    return book;
  }
  function snapshotWorkbook(X,rows,meta){
    meta=parseSnapshotMeta(meta,rows.budgetId);
    var summary=meta.summary;
    if(rows.length>1048575||rows.length*5>1048575)throw new Error('The snapshot exceeds Excel’s worksheet row limit.');
    if(!Array.isArray(rows.elementRows)||rows.elementRows.length!==rows.length*5)throw new Error('Incomplete element detail in budget snapshot.');
    var detailColumns=[2,3,4,5,6,7,8,9,10,11,13,14,15],elementColumns=[2,4,5,6,7,8,9,10,11,12,13,14];
    var ordered=rows.map(function(row,index){return {values:row,index:index};}).sort(function(a,b){
      var leftCategory=Number(a.values[3]),rightCategory=Number(b.values[3]);
      if(Number.isFinite(leftCategory)&&Number.isFinite(rightCategory)&&leftCategory!==rightCategory)return leftCategory-rightCategory;
      for(var i=0;i<2;i++){var column=i===0?3:5,left=a.values[column],right=b.values[column];if(i===0&&leftCategory===rightCategory)continue;if(left!==right)return left<right?-1:1;}
      return a.index-b.index;
    });
    var detailRows=[],elementDetail=[];
    ordered.forEach(function(entry){
      detailRows.push(detailColumns.map(function(column){return entry.values[column];}));
      rows.elementRows.slice(entry.index*5,entry.index*5+5).forEach(function(element){elementDetail.push(elementColumns.map(function(column){return element[column];}));});
    });
    var approvalKeys=['track','role','approver','status','respondedDate','notes'];
    var approvalRows=meta.approvals.map(function(approval){
      if(!approval||approvalKeys.some(function(key){return approval[key]!=null&&typeof approval[key]!=='string';}))throw new Error('Invalid approval history in budget snapshot.');
      return approvalKeys.map(function(key){var value=approval[key]==null?'':approval[key];return key==='notes'?value.replace(/<br\s*\/?\s*>/gi,'\n'):value;});
    });
    var book=X.utils.book_new(),preciseMoney='"$"#,##0.####;("$"#,##0.####);"$" -';
    function append(name,data,widths,numericStart,numericEnd,format){
      var sheet=X.utils.aoa_to_sheet(data);
      sheet['!cols']=widths.map(function(width){return {wch:width};});
      if(name!=='Summary')sheet['!autofilter']={ref:sheet['!ref']};
      data.forEach(function(row,r){row.forEach(function(value,c){
        var cell=sheet[X.utils.encode_cell({r:r,c:c})];
        if(!cell)return;
        if(typeof value==='string'){cell.t='s';delete cell.f;}
        else if(r>0&&typeof value==='number'&&c>=numericStart&&c<=numericEnd)cell.z=format||money;
      });});
      X.utils.book_append_sheet(book,sheet,name);
      return sheet;
    }
    var summarySheet=append('Summary',[
      ['Budget Export'],['Field','Value'],['Budget',summary.budgetLabel],['Subdivision Code',summary.subdivisionCode],['Territory',summary.territory],['Exported',summary.exportedDate],['Current Final Budget',summary.grandFinal]
    ],[24,64],1,1);
    summarySheet['!merges']=[{s:{r:0,c:0},e:{r:0,c:1}}];
    append('Budget Detail',[detailColumns.map(function(column){return headers[column];})].concat(detailRows),[18,14,32,14,40,12,18,18,18,18,18,18,52],6,11);
    append('Budget Elements',[['Department','Category','Cost Code','Budget Item','Element','Preliminary','Unapproved','Final','Approved Mods','Revised Final','HCSS Actuals','GP Actuals']].concat(elementDetail),[18,32,14,40,22,18,18,18,22,22,18,18],5,11,preciseMoney);
    append('Approval History',[['Track','Role','Approver','Status','Responded','Approval Notes']].concat(approvalRows),[18,16,36,20,18,56],-1,-1);
    return book;
  }
  function csv(rows){
    function quote(value){if(value==null)return '';var text=String(value);if(typeof value==='string'&&/^[=+\-@\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}
    var detail=rows.elementRows||rows.reduce(function(all,row){return all.concat(elementRows({},row));},[]);
    var output=[['Row Type'].concat(elementHeaders,['Unit','Cost per Unit'])];
    rows.forEach(function(row){output.push(['Budget Item Total'].concat(row.slice(0,7),[''],[row[9],row[10],row[11],row[12],row[11]+row[12],row[13],row[14]],[row[15],row[7],row[8]]));});
    detail.forEach(function(row){output.push(['Element Detail'].concat(row,['','']));});
    return '\uFEFF'+output.map(function(row){return row.map(quote).join(',');}).join('\r\n');
  }
  root.BudgetFullExport={headers:headers,elementHeaders:elementHeaders,collect:collect,workbook:workbook,parseSnapshotMeta:parseSnapshotMeta,snapshotWorkbook:snapshotWorkbook,csv:csv};
})(typeof window!=='undefined'?window:globalThis);
