(function(root){
  'use strict';
  var reports={properties:'All_Property',projects:'All_Projects',subdivisions:'All_Subdivisions',companies:'All_Companies',milestones:'All_Milestones',forecasts:'All_Forecasts',forecastYears:'All_Forecast_Years',takedownSchedules:'All_Takedown_Schedules',builderTakedowns:'All_Builder_Takedowns',builders:'All_Builders',lots:'All_Lots_All_Fields',additionalItems:'All_Additional_Items',externalMappings:'All_External_System_Mappings',proformas:'All_Pro_Formas'};
  var core=['properties','projects','subdivisions','companies'];
  var types={property:'properties',project:'projects',subdivision:'subdivisions',company:'companies',milestone:'milestones',forecast:'forecasts',forecastYear:'forecastYears',takedown:'takedownSchedules',builderTakedown:'builderTakedowns',builder:'builders',lot:'lots',additionalItem:'additionalItems',externalMapping:'externalMappings'};
  function cancelled(){var error=new Error('Load superseded.');error.cancelled=true;return error;}
  function editorDependencies(type,isNew){
    var keys=core.slice(),extra={property:['builders','proformas'],subdivision:['builders'],forecast:['builders','forecastYears'],forecastYear:['builders'],takedown:['builders'],builderTakedown:['builders','lots'],lot:['builders','takedownSchedules','builderTakedowns'],additionalItem:['builderTakedowns']}[type]||[];
    if(!isNew&&types[type])keys.push(types[type]);
    if(!isNew&&type==='subdivision')extra=extra.concat(['milestones','forecasts','forecastYears','takedownSchedules','builderTakedowns','additionalItems','externalMappings']);
    if(!isNew&&type==='forecastYear')extra=extra.concat(['forecasts']);
    if(!isNew&&type==='builderTakedown')extra=extra.concat(['additionalItems']);
    return keys.concat(extra).filter(function(key,i,list){return list.indexOf(key)===i;});
  }
  function create(options){
    var state=options.state,generation=0,resources={},coreCommitted=false;
    function reset(){Object.keys(reports).forEach(function(key){resources[key]={status:'idle',rows:null,error:null,promise:null,generation:generation};});}
    reset();
    function check(epoch){if(epoch!==generation)throw cancelled();}
    function ensureOne(key,epoch,onProgress){
      check(epoch);if(!reports[key])return Promise.reject(new Error('Unknown Land collection: '+key));
      var resource=resources[key];if(resource.status==='ready')return Promise.resolve(resource.rows);if(resource.status==='loading')return resource.promise;
      resource.status='loading';resource.error=null;
      var promise=Promise.resolve().then(function(){check(epoch);return options.read(reports[key],{isCancelled:function(){return epoch!==generation;},onProgress:onProgress});}).then(function(rows){
        check(epoch);if(!Array.isArray(rows))throw new Error(reports[key]+': complete records were not returned.');
        resource.rows=rows;resource.status='ready';resource.promise=null;
        if(core.indexOf(key)<0)state[key]=rows;
        if(options.onReady)options.onReady(key,rows,epoch);
        return rows;
      }).catch(function(error){if(epoch!==generation)throw cancelled();resource.status='error';resource.error=error;resource.promise=null;throw error;});
      resource.promise=promise;return promise;
    }
    function ensure(keys,config){config=config||{};var epoch=config.generation==null?generation:config.generation;try{return Promise.all(keys.map(function(key){return ensureOne(key,epoch,config.onProgress&&function(info){config.onProgress(key,info);});}));}catch(error){return Promise.reject(error);}}
    function commitCore(epoch){check(epoch);core.forEach(function(key){if(resources[key].status!=='ready')throw new Error('Core records are unavailable: '+key);});core.forEach(function(key){state[key]=resources[key].rows;});coreCommitted=true;return core.map(function(key){return state[key];});}
    return Object.freeze({
      beginRefresh:function(){generation++;coreCommitted=false;reset();return generation;},generation:function(){return generation;},ensure:ensure,commitCore:commitCore,
      coreReady:function(){return coreCommitted&&core.every(function(key){return resources[key].status==='ready';});},
      status:function(key){return resources[key]?resources[key].status:'idle';},
      knownCount:function(keys,compute){return keys.every(function(key){return resources[key]&&resources[key].status==='ready'&&(core.indexOf(key)<0||coreCommitted);})?compute():null;},
      snapshot:function(){var result={};Object.keys(resources).forEach(function(key){var r=resources[key];result[key]={status:r.status,count:r.status==='ready'?r.rows.length:null,generation:r.generation};});return result;}
    });
  }
  root.LMLandData=Object.freeze({create:create,coreKeys:core.slice(),reports:reports,editorDependencies:editorDependencies,cancelled:cancelled});
})(window);
