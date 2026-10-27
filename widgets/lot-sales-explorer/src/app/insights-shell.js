(function(){
  'use strict';
  let dashboard=null,connected=false,access=null,route={dashboard:new URLSearchParams(location.search).get('dashboard')||'',projectId:new URLSearchParams(location.search).get('projectId')||''};
  const names={sales:'Lot Sales',forecasts:'Forecasts'};
  const allowed=name=>name==='sales'?!!access?.lotSalesDashboard:name==='forecasts'?!!access?.forecastsDashboard:false;
  function normalize(value){const key=String(value||'').trim().toLowerCase();return ['sales','lotsales','lot-sales'].includes(key)?'sales':['forecast','forecasts'].includes(key)?'forecasts':'';}
  async function readRoute(){
    const util=window.ZOHO?.CREATOR?.UTIL;
    if(typeof util?.getQueryParams!=='function')return route;
    let timer;
    try{const params=await Promise.race([util.getQueryParams(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Page parameters timed out.')),5000);})]);
      if(params&&typeof params==='object'&&!Array.isArray(params))for(const key of ['dashboard','projectId'])if(typeof params[key]==='string'&&params[key].trim())route[key]=params[key].trim();
    }finally{clearTimeout(timer);}
    return route;
  }
  function paint(name,error=''){
    dashboard=name;
    document.querySelectorAll('[data-dashboard]').forEach(button=>{const key=button.dataset.dashboard,active=key===name;button.hidden=!allowed(key);button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
    document.getElementById('salesDashboard').hidden=name!=='sales';
    document.getElementById('forecastsDashboard').hidden=name!=='forecasts';
    document.getElementById('budgetsDashboard').hidden=true;
    document.getElementById('dashboardAccessMessage').hidden=!!name;
    document.getElementById('dashboardAccessText').textContent=error||(!access?'Checking dashboard access…':'Contact your administrator to be granted access to dashboards.');
    const refresh=document.getElementById('refresh');refresh.title=name==='forecasts'?'Refresh forecasts':'Refresh lot sales';refresh.setAttribute('aria-label',refresh.title);
  }
  function setAccess(next,error=''){
    access=next;
    window.dispatchEvent(new CustomEvent('insights:access',{detail:next}));
    if(!next){paint(null,error);return;}
    const requested=route.dashboard?normalize(route.dashboard):'';
    if(route.dashboard&&!requested){paint(null,'Unknown dashboard. Use dashboard=sales or dashboard=forecasts.');return;}
    if(requested&&!allowed(requested)){paint(null,names[requested]+' dashboard access is required.');return;}
    const target=requested||(allowed(dashboard)?dashboard:allowed('sales')?'sales':allowed('forecasts')?'forecasts':null);
    if(target)show(target,false);else paint(null,error);
  }
  function show(name,updateUrl=true){
    name=normalize(name);if(!allowed(name))return false;
    window.InsightsControls?.close();paint(name);
    if(updateUrl){route.dashboard=name;try{const url=new URL(location.href);url.searchParams.set('dashboard',name);history.replaceState(null,'',url);}catch{}}
    window.dispatchEvent(new CustomEvent('insights:dashboard',{detail:name}));return true;
  }
  document.querySelectorAll('[data-dashboard]').forEach(button=>button.addEventListener('click',()=>show(button.dataset.dashboard)));
  window.addEventListener('popstate',()=>{route.dashboard=new URLSearchParams(location.search).get('dashboard')||'';setAccess(access);});
  window.InsightsShell=Object.freeze({show,setAccess,readRoute,route:()=>({...route}),access:()=>access,current:()=>dashboard,connected:()=>connected,markConnected:()=>{connected=true;window.dispatchEvent(new CustomEvent('insights:connected'));}});
})();
