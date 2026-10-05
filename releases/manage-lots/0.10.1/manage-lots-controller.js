// Complete Creator SDK2 snapshots, captured eligibility and verified takedown claims.
(function(root){
  'use strict';
  const own=(value,key)=>!!value&&Object.prototype.hasOwnProperty.call(value,key);
  const id=value=>typeof value==='string'&&/^\d+$/.test(value)?value:'';
  function relation(value){
    if(value==null||value==='')return [];
    if(typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===0)return [];
    const values=Array.isArray(value)?value:[value];
    return values.map(item=>{
      const result=id(typeof item==='object'&&item?item.ID:item);
      if(!result)throw new Error('Creator returned an unreadable relationship.');
      return result;
    });
  }
  function freeze(value){
    if(value&&typeof value==='object'){Object.keys(value).forEach(key=>freeze(value[key]));Object.freeze(value);}
    return value;
  }
  function failure(response,cause,message,uncertain){
    const error=new Error(cause&&cause.message||message);
    error.code=cause&&cause.code!=null?String(cause.code):'UNVERIFIED_CREATE';
    error.raw=response;error.response=response;error.cause=cause;error.uncertain=!!uncertain;error.noReplay=!!uncertain;
    error.permissionDenied=error.code==='2898';return error;
  }
  function flags(value){
    return !value||typeof value!=='object'||Array.isArray(value)||value.error||value.success===false||/^(error|failed|failure)$/i.test(String(value.status||'').trim());
  }
  function envelopeFailure(value,seen){
    seen=seen||new Set();
    if(typeof value==='string'){try{value=JSON.parse(value);}catch(ignore){return null;}}
    if(!value||typeof value!=='object'||seen.has(value))return null;
    seen.add(value);
    if(Array.isArray(value)){for(const item of value){const failed=envelopeFailure(item,seen);if(failed)return failed;}return null;}
    if(flags(value)||value.code!=null&&String(value.code)!=='3000')return value;
    for(const key of ['result','details','response','output'])if(own(value,key)){const failed=envelopeFailure(value[key],seen);if(failed)return failed;}
    return null;
  }
  function reviewId(response){
    const ids=new Set(),seen=new Set();
    function visit(value){
      if(typeof value==='string'){try{value=JSON.parse(value);}catch(ignore){return;}}
      if(!value||typeof value!=='object'||seen.has(value))return;seen.add(value);
      if(Array.isArray(value)){value.forEach(visit);return;}
      if(value.data&&typeof value.data==='object'&&!Array.isArray(value.data)&&own(value.data,'ID')&&id(value.data.ID))ids.add(value.data.ID);
      for(const key of ['result','details','response','output'])if(own(value,key))visit(value[key]);
    }
    visit(response);return ids.size===1?Array.from(ids)[0]:'';
  }
  function createFailure(response,cause,message,uncertain){
    const error=failure(response,cause,message,uncertain);error.createdId=reviewId(response);return error;
  }
  function confirmedId(response){
    if(!response||typeof response!=='object'||Array.isArray(response)||String(response.code)!=='3000')throw createFailure(response,envelopeFailure(response)||response,'Creator rejected this create.',!!response&&['data','result','details','response','output'].some(key=>own(response,key)));
    const failed=envelopeFailure(response);
    if(failed||['details','response','output'].some(key=>own(response,key)))throw createFailure(response,failed||response,'Creator returned competing or failed create results.',true);
    const wrapped=own(response,'result');
    if(wrapped&&(own(response,'data')||!Array.isArray(response.result)||response.result.length!==1))throw createFailure(response,response,'Creator returned competing or incomplete create results.',true);
    const record=wrapped?response.result[0]:response;
    if(flags(record)||['result','details','response','output'].some(key=>own(record,key))&&record!==response||String(record.code)!=='3000')throw createFailure(response,record,'Creator did not confirm this create.',true);
    if(flags(record.data)||['result','data','details','response','output'].some(key=>own(record.data,key))||record.data.code!=null&&String(record.data.code)!=='3000'||!id(record.data.ID))throw createFailure(response,record.data,'Creator did not identify the created record.',true);
    return record.data.ID;
  }
  function countValue(response){
    const result=response&&response.result,value=result&&result.records_count;
    const failed=envelopeFailure(response);
    if(failed||String(response&&response.code)!=='3000'||flags(response)||flags(result)||['data','details','response','output'].some(key=>own(response,key))||['result','data','details','response','output'].some(key=>own(result,key))||result.code!=null&&String(result.code)!=='3000'||!(typeof value==='number'||typeof value==='string')||typeof value==='string'&&!/^\d+$/.test(value.trim())||!Number.isSafeInteger(Number(value))||Number(value)<0)throw failure(response,failed||result||response,'Creator did not return a readable count.',false);
    return Number(value);
  }
  function create(options){
    const reports=options.reports,state={nativeReady:false,ready:false,loading:false,generation:0,busy:false,review:null,core:null,nativeContext:''};
    const data=()=>root.ZOHO.CREATOR.DATA,changed=()=>{if(options.changed)options.changed(state);};
    let starting=null,handshakeToken=0,nativeWrites=0;
    function active(){return state.busy||nativeWrites>0||!!state.review;}
    function context(){const runtime=root.LMRuntime.current();return runtime&&runtime.environment!=='UNKNOWN'&&typeof runtime.user==='string'&&runtime.user.trim()&&runtime.user!=='(unknown)'?JSON.stringify([runtime.environment,runtime.appLinkName||'',runtime.user]):'';}
    function check(generation,expected){if(generation!==state.generation||!state.nativeContext||context()!==(expected||state.nativeContext)){const error=new Error('Read or authenticated context superseded.');error.cancelled=true;throw error;}}
    // SDK2 "all" includes report-layout fields, not every field on the form.
    // Keep the same complete snapshot and explicitly request its verified fields.
    const takedownFields=Object.freeze(['Name','Subdivision1','Builder1','Lots','Lot_Count','Added_Time','Entered_Date','Purchase_Date','Status','Base_Price_Subtotal','Interest_Subtotal','Total','Total_w_Additional','Tax_Method','Tax_Per_Lot','Tax_Proration_Date','Additional_Fees_Per_Lot','Notes','Tax_Status','Percent_of_Appraisal','Additional_Fee_Type','DRH_Subtract_Day','Subtract_Day_From',...Array.from({length:12},(_,i)=>['Interest_Rate_'+(i===6?'71':i+1),'Date'+(i+1)+'_1','Date'+(i+1)+'_2']).flat()]);
    const lotFinancialFields=Object.freeze(["Subdivision","Status","Archived","Add_Builder_Takedown_Name","Lot_Code","Lot_Number","Block","Lot_Size","On_Hold","Builder1","Base_Price","Appraised_Value","Earnest_Money","Additional_Tax","Fee_Type","Additional_Fees","Escalator","Escalator_Start_Date","Address","Notes"]);
    function read(report,criteria,generation){const expected=state.nativeContext;check(generation,expected);return root.LMData.readAll({reportName:report,criteria,fields:report===reports.takedowns?takedownFields:report===reports.lots?lotFinancialFields:undefined,fresh:true,isCancelled:()=>generation!==state.generation||context()!==expected,api:{getRecordCount:config=>Promise.resolve(data().getRecordCount(config)).then(response=>{countValue(response);return response;}),getRecords:config=>data().getRecords(config)}});}
    function scope(subdivisionId,generation){
      if(!id(subdivisionId))return Promise.reject(new Error('Subdivision ID is invalid.'));
      const criteria='(Subdivision == '+subdivisionId+')';
      return Promise.all([read(reports.lots,criteria,generation),read(reports.lotsList,criteria,generation)]).then(groups=>{check(generation);return options.merge(groups,subdivisionId);});
    }
    function claims(rows){
      const result=new Set();rows.forEach(row=>{
        if(!id(row.ID)||!own(row,'Lots'))throw new Error('Current takedown claims are incomplete.');
        relation(row.Lots).forEach(lotId=>result.add(lotId));
      });return result;
    }
    function reload(){
      if(!state.nativeReady)return Promise.reject(new Error('A native Creator connection is required.'));
      if(active()||options.hasDraft&&options.hasDraft())return Promise.resolve(false);
      check(state.generation);
      const generation=++state.generation;state.loading=true;state.ready=false;changed();
      return Promise.all([read(reports.subdivisions,null,generation),read(reports.builders,null,generation),read(reports.takedowns,null,generation)]).then(all=>{
        check(generation);all[0].concat(all[1]).forEach(row=>{if(!id(row.ID))throw new Error('Creator returned an unreadable core record ID.');});const next={subdivisions:all[0],builders:all[1],takedowns:all[2],claims:claims(all[2])};
        state.core=next;state.ready=true;state.loading=false;changed();return next;
      }).catch(error=>{if(generation===state.generation){state.ready=false;state.loading=false;changed();}throw error;});
    }
    function start(){
      if(starting)return starting;
      if(active()||options.hasDraft&&options.hasDraft())return Promise.resolve(false);
      const token=++handshakeToken;state.nativeReady=false;state.ready=false;state.loading=true;state.nativeContext='';changed();
      const handshake=new Promise((resolve,reject)=>{
        let settled=false;
        const timer=root.setTimeout(()=>{if(settled)return;settled=true;reject(new Error('Creator initialization timed out.'));},options.initTimeoutMs||5000);
        Promise.resolve().then(()=>{
          const creator=root.ZOHO&&root.ZOHO.CREATOR;
          if(!creator||!creator.DATA||!creator.UTIL||typeof creator.UTIL.getInitParams!=='function')throw new Error('Creator SDK v2 is unavailable.');
          return creator.UTIL.getInitParams();
        }).then(params=>{
          if(settled||token!==handshakeToken)return;
          const runtime=root.LMRuntime.apply(params);
          if(!runtime||runtime.environment==='UNKNOWN'||typeof runtime.user!=='string'||!runtime.user.trim()||runtime.user==='(unknown)')throw new Error('Creator did not identify the current user and environment.');
          settled=true;root.clearTimeout(timer);resolve(runtime);
        }).catch(error=>{if(settled)return;settled=true;root.clearTimeout(timer);reject(error);});
      });
      starting=handshake.then(runtime=>{state.nativeContext=context();state.nativeReady=true;if(options.connected)options.connected(runtime);return reload();}).catch(error=>{state.nativeReady=false;state.ready=false;state.loading=false;changed();throw error;}).finally(()=>{starting=null;});
      return starting;
    }
    function capture(subdivisionId,selectedIds,payload){
      if(!state.nativeReady||!state.ready||state.loading||active())throw new Error('Creator records or a prior create need review.');
      const ids=selectedIds.slice();
      if(!id(subdivisionId)||!ids.length||ids.some(value=>!id(value))||new Set(ids).size!==ids.length)throw new Error('Capture one nonempty subdivision selection.');
      if(payload.Subdivision1!==subdivisionId||!id(payload.Builder1)||!state.core.builders.some(row=>row.ID===payload.Builder1)||!Array.isArray(payload.Lots)||payload.Lots.length!==ids.length||payload.Lots.some((value,index)=>value!==ids[index])||Number(payload.Lot_Count)!==ids.length)throw new Error('The captured payload and selection disagree.');
      check(state.generation);return freeze({generation:state.generation,context:state.nativeContext,subdivisionId,ids:ids.slice(),payload:JSON.parse(JSON.stringify(payload)),financial:options.financialSnapshot?options.financialSnapshot(ids,payload):null});
    }
    function eligible(row,operation,currentClaims){
      if(!row||row.ID==null||row._manageEligibilityConflict||!own(row,'Subdivision')||!own(row,'Status')||!own(row,'Archived')||!own(row,'Add_Builder_Takedown_Name'))return false;
      const subdivision=relation(row.Subdivision);
      const status=String(row.Status).trim().toLowerCase(),archived=row.Archived;
      if(![false,true,'false','true'].includes(archived))return false;
      return subdivision.length===1&&subdivision[0]===operation.subdivisionId&&['open','contracted'].includes(status)&&(archived===false||archived==='false')&&relation(row.Add_Builder_Takedown_Name).length===0&&!currentClaims.has(row.ID);
    }
    function preflight(operation){
      check(operation.generation,operation.context);
      return Promise.all([scope(operation.subdivisionId,operation.generation),read(reports.takedowns,null,operation.generation)]).then(all=>{
        check(operation.generation,operation.context);const currentClaims=claims(all[1]),byId=new Map(all[0].map(row=>[row.ID,row]));
        if(operation.ids.some(lotId=>!eligible(byId.get(lotId),operation,currentClaims)))throw new Error('At least one captured lot is no longer available. No takedown was sent.');
        if(options.validateFinancial)options.validateFinancial(operation,byId);
        return all;
      });
    }
    function verify(operation,createdId){
      check(operation.generation,operation.context);
      return Promise.all([read(reports.takedowns,'(ID == '+createdId+')',operation.generation),scope(operation.subdivisionId,operation.generation)]).then(all=>{
        check(operation.generation,operation.context);
        const row=all[0][0];
        if(all[0].length!==1||!row||row.ID!==createdId||!own(row,'Lots')||!own(row,'Subdivision1')||!own(row,'Builder1')||!own(row,'Lot_Count'))throw new Error('Created takedown fields are unavailable.');
        const lots=relation(row.Lots),subdivision=relation(row.Subdivision1),builder=relation(row.Builder1);
        if(lots.length!==operation.ids.length||new Set(lots).size!==lots.length||lots.some(lotId=>!operation.ids.includes(lotId))||Number(row.Lot_Count)!==lots.length||subdivision.length!==1||subdivision[0]!==operation.subdivisionId||builder.length!==1||builder[0]!==operation.payload.Builder1)throw new Error('The persisted takedown does not match the captured destination.');
        const byId=new Map(all[1].map(lot=>[lot.ID,lot])),confirmedLotIds=[];
        operation.ids.forEach(lotId=>{const lot=byId.get(lotId),direct=lot&&own(lot,'Add_Builder_Takedown_Name')?relation(lot.Add_Builder_Takedown_Name):[];if(direct.length===1&&direct[0]===createdId)confirmedLotIds.push(lotId);});
        if(confirmedLotIds.length!==operation.ids.length){const error=new Error('Not every captured lot exclusively confirms the created takedown.');error.confirmedLotIds=confirmedLotIds;error.noReplay=true;error.uncertain=true;throw error;}
        return {createdId,takedown:row,lots:all[1]};
      }).then(result=>options.verifyDetails?Promise.resolve(options.verifyDetails(operation,result)).then(()=>{check(operation.generation,operation.context);return result;}):result);
    }
    function deadline(promise){
      return new Promise((resolve,reject)=>{let settled=false;const timer=root.setTimeout(()=>{if(settled)return;settled=true;reject(failure(null,null,'Create result timed out. Review Creator before another create.',true));},options.writeTimeoutMs||20000);Promise.resolve(promise).then(value=>{if(settled)return;settled=true;root.clearTimeout(timer);resolve(value);},error=>{if(settled)return;settled=true;root.clearTimeout(timer);reject(error);});});
    }
    function stage(name,operation){if(options.stage)options.stage(name,operation);}
    function commit(operation){
      if(active()||!state.ready||operation.generation!==state.generation)return Promise.reject(new Error('A previous create or stale selection needs review.'));
      try{check(operation.generation,operation.context);}catch(error){return Promise.reject(error);}
      state.busy=true;changed();stage('Checking captured lots',operation);
      let sent=false,createdId='';
      return preflight(operation).then(()=>{
        check(operation.generation,operation.context);
        stage('Creating takedown',operation);nativeWrites++;changed();
        const native=root.LMData.request('manage-lots:create',()=>{check(operation.generation,operation.context);sent=true;return data().addRecords({form_name:options.form,payload:{data:operation.payload}});});
        native.then(()=>{nativeWrites--;changed();},()=>{nativeWrites--;changed();});
        return deadline(native);
      }).then(response=>{createdId=confirmedId(response);stage('Verifying claims',operation);return deadline(verify(operation,createdId));}).then(result=>{
        state.review=null;state.busy=false;state.ready=false;stage('Verified',operation);changed();return result;
      }).catch(error=>{
        const native=error&&error.raw||error&&error.response||error;
        const rejected=sent&&!error.uncertain&&!['data','result','details','response','output'].some(key=>own(native,key))&&['2898','2899','2945','1060'].includes(String(error.code));
        state.busy=false;
        if(sent&&!rejected){state.review={operation,createdId:createdId||error.createdId||'',error,confirmedLotIds:error.confirmedLotIds||[]};stage('Needs review',operation);}
        else stage(sent?'Rejected':'Not sent',operation);
        changed();throw error;
      });
    }
    function recheck(){
      if(nativeWrites>0||state.busy)return Promise.reject(new Error('The native create request is still pending.'));
      if(!state.review||!state.review.createdId)return Promise.reject(new Error('Without a confirmed record ID, review this create in Creator.'));
      const review=state.review;state.busy=true;changed();
      return deadline(Promise.resolve().then(()=>verify(review.operation,review.createdId))).then(result=>{state.review=null;state.ready=false;stage('Verified',review.operation);return result;},error=>{review.error=error;review.confirmedLotIds=error.confirmedLotIds||[];throw error;}).finally(()=>{state.busy=false;changed();});
    }
    function count(report,criteria){const generation=state.generation,expected=state.nativeContext;return root.LMData.request('manage-lots:badge',()=>{check(generation,expected);return data().getRecordCount({report_name:report,criteria});}).then(response=>{check(generation,expected);return countValue(response);});}
    return Object.freeze({state,start,reload,scope,capture,preflight,commit,recheck,count,active,context,pending:()=>nativeWrites>0||state.busy});
  }
  root.LMManageLots=Object.freeze({create,confirmedId,countValue,relation});
})(typeof window==='undefined'?globalThis:window);
