// Mirrors the committed Builder_Takedown success workflows; no persisted model changes.
(function(root){
  'use strict';
  const own=(row,key)=>Object.prototype.hasOwnProperty.call(row,key);
  function number(value){
    if(value==null||value==='')return 0;
    if(typeof value==='object')return NaN;
    return Number(String(value).replace(/[$,%\s,]/g,''));
  }
  function date(value){
    if(!value)return '';
    const text=String(value).trim(),months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let match=text.match(/^(\d{4})-(\d{2})-(\d{2})$/),parts;
    if(match)parts=[Number(match[1]),Number(match[2]),Number(match[3])];
    else if((match=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)))parts=[Number(match[3]),Number(match[1]),Number(match[2])];
    else if((match=text.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/)))parts=[Number(match[3]),months.findIndex(m=>m.toLowerCase()===match[2].toLowerCase())+1,Number(match[1])];
    if(!parts)return '';
    const parsed=new Date(Date.UTC(parts[0],parts[1]-1,parts[2]));
    return parsed.getUTCFullYear()===parts[0]&&parsed.getUTCMonth()+1===parts[1]&&parsed.getUTCDate()===parts[2]?parts[0]+'-'+String(parts[1]).padStart(2,'0')+'-'+String(parts[2]).padStart(2,'0'):'';
  }
  const days=(a,b)=>(Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000;
  const currency=value=>Math.round((value+Number.EPSILON)*100)/100;
  const zoho=value=>{const p=date(value).split('-');return p.length===3?p[1]+'/'+p[2]+'/'+p[0]:'';};
  function periods(record,template){
    const result=[];
    for(let i=1;i<=12;i++){
      const rate=record[template?'Interest_Rate_'+i:i===7?'Interest_Rate_71':'Interest_Rate_'+i],from=record[template?'From_'+i:'Date'+i+'_1'],to=record[template?'To_'+i:'Date'+i+'_2'];
      if(rate!=null&&rate!==''||from||to)result.push({rate:rate==null?'':String(rate).replace('%',''),from:date(from),to:date(to)});
    }
    return result;
  }
  function chain(rows){return rows.map((row,i)=>({...row,from:i?rows[i-1].to:row.from}));}
  function applicable(rows,purchase){
    // Future template rates remain in the template; the draft includes only elapsed periods.
    const visible=rows.filter(row=>!row.from||!date(purchase)||row.from<=purchase).map(row=>({...row}));
    if(visible.length){visible.forEach((row,i)=>{if(i===visible.length-1)row.to=purchase;else if(row.to>purchase)row.to=purchase;});}
    return chain(visible);
  }
  function validate(rows,purchase){
    const errors=[];
    if(rows.length>12)errors.push('A takedown supports up to 12 interest periods.');
    rows.forEach((row,i)=>{
      if(row.rate===''||!Number.isFinite(number(row.rate))||number(row.rate)<0||number(row.rate)>100)errors.push('Enter a rate from 0 to 100% for period '+(i+1)+'.');
      if(!date(row.from)||!date(row.to))errors.push('Complete both dates for period '+(i+1)+'.');
      else if(row.to<row.from||(i>0&&row.to===row.from))errors.push('Period '+(i+1)+' must end after it begins.');
      if(i&&row.from!==rows[i-1].to)errors.push('Period '+(i+1)+' must begin on the previous end date.');
      if(date(purchase)&&row.to>purchase)errors.push('Period '+(i+1)+' ends after the purchase date.');
    });
    return errors;
  }
  function itemTotal(item){return currency(number(item.Amount)*number(item.Quantity))*(item.Item_Type==='Deduction'?-1:1);}
  function itemPayload(items){return items.map(item=>({Item_Type:item.Item_Type,Name:String(item.Name||'').trim(),Amount:number(item.Amount),Quantity:number(item.Quantity),Total:itemTotal(item)}));}
  function ratePayload(rows){
    const data={};rows.forEach((row,index)=>{const i=index+1;data[i===7?'Interest_Rate_71':'Interest_Rate_'+i]=number(row.rate);data['Date'+i+'_1']=zoho(row.from);data['Date'+i+'_2']=zoho(row.to);});return data;
  }
  function receipt(lots,draft){
    const missing=new Set(),totals={base:0,earnest:0,fees:0,interest:0,tax:0,wbw:0,builder:0,total:0,items:0,grand:0};
    const taxDate=date(draft.taxDate)||date(draft.purchase),periodErrors=validate(draft.periods,draft.purchase);
    if(!taxDate)missing.add('Purchase date');
    if(periodErrors.length)missing.add('Interest period dates or rates');
    if(lots.some(lot=>lot.Additional_Tax==null)&&lots.some(lot=>number(lot.Additional_Tax)!==0&&Number.isFinite(number(lot.Additional_Tax))))missing.add('Additional tax needs Creator review');
    let carriedAdditionalTax=0;
    const rows=lots.map(lot=>{
      ['Base_Price','Earnest_Money','Additional_Tax'].forEach(key=>{if(!own(lot,key)||!Number.isFinite(number(lot[key])))missing.add(key.replace(/_/g,' '));});
      if(lot.Base_Price==null||lot.Base_Price==='')missing.add('Base Price');
      const base=number(lot.Base_Price),earnest=number(lot.Earnest_Money),fees=currency(number(draft.fees));
      let interest=0;
      draft.periods.forEach((period,i)=>{if(date(period.from)&&date(period.to)&&Number.isFinite(number(period.rate)))interest+=base*number(period.rate)/100*(days(period.from,period.to)+(i===0&&!draft.subtract.includes('Interest')?1:0))/365;});
      // Current Creator workflow retains the last non-null Additional_Tax across lots.
      // Keep this observable behavior until an explicitly authorized backend correction.
      if(lot.Additional_Tax!=null&&lot.Additional_Tax!=='')carriedAdditionalTax=number(lot.Additional_Tax);
      if(draft.taxMethod==='Percentage of Appraisal'&&(!own(lot,'Appraised_Value')||lot.Appraised_Value==null||lot.Appraised_Value===''||!Number.isFinite(number(lot.Appraised_Value))))missing.add('Appraised Value');
      const tax=currency((draft.taxMethod==='Flat'?number(draft.taxPerLot):number(draft.percent)*number(lot.Appraised_Value)/100)+carriedAdditionalTax);
      const wbw=taxDate?currency((days(taxDate.slice(0,4)+'-01-01',taxDate)+(draft.subtract.includes('Tax')?0:1))/365*tax):NaN,builder=currency(tax-wbw);
      const adjustment=draft.taxStatus==='Taxes Paid'?builder:draft.taxStatus==='Proration Taxes Unpaid'?-tax-wbw:-wbw;
      const total=currency(base+fees+currency(interest)+adjustment-earnest),row={lot,base,earnest,fees,interest:currency(interest),tax,wbw,builder,total};
      // Interest_Subtotal sums raw period calculations. Other subtotals sum the
      // two-decimal Lots currency values already assigned by the success workflow.
      Object.keys(totals).forEach(key=>{if(own(row,key))totals[key]+=key==='interest'?interest:row[key];});return row;
    });
    totals.items=draft.items.reduce((sum,item)=>sum+itemTotal(item),0);totals.grand=totals.total+totals.items;
    if(Object.values(totals).some(value=>!Number.isFinite(value)))missing.add('Financial values');
    return {rows,totals,missing:Array.from(missing),complete:missing.size===0};
  }
  root.LMTakedownModel=Object.freeze({number,date,days,zoho,periods,chain,applicable,validate,itemTotal,itemPayload,ratePayload,receipt});
})(typeof window==='undefined'?globalThis:window);
