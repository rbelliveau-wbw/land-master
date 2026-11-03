(function(root){
  'use strict';
  const reports={subdivisions:'All_Subdivisions',projects:'All_Projects',builders:'All_Builders',years:'All_Forecast_Years',months:'All_Forecasts'};
  const fields={subdivisions:['ID','Project','Subdivision_Name','Subdivision_Code','Territory','Projects_Status','Total_Lots','Lots_Sold'],projects:['ID','Project_Name'],builders:['ID','Builder_Name','Type1'],years:['ID','Subdivision1','Builder1','Forecast_Year','Status'],months:['ID','Forecast_Year2','Subdivision1','Builder1','Forecast_Year','Forecast_Month','Forecast_Start_Date','Forecasted_Lots','Actual_Lots','Scheduled_Lots','Delete_me']};
  async function load(api,options={}){
    if(options.isCurrent&&!options.isCurrent())throw new Error('The forecast dashboard session changed.');
    const results=await Promise.all(Object.keys(reports).map(async key=>{
      const rows=await root.LotSalesCreator.readAll(api,reports[key],options.onProgress,fields[key],{isCancelled:()=>options.isCurrent&&!options.isCurrent()});
      if(options.isCurrent&&!options.isCurrent())throw new Error('The forecast dashboard session changed.');
      for(const row of rows)for(const field of fields[key])if(!Object.prototype.hasOwnProperty.call(row,field))throw new Error(reports[key]+': '+field+' is unavailable. Include this field in the report before using Forecasts.');
      return [key,rows];
    }));
    return Object.fromEntries(results);
  }
  root.ForecastInsightsCreator=Object.freeze({reports,fields,load});
})(typeof window==='undefined'?globalThis:window);
