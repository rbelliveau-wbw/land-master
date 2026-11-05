(function(){
  'use strict';
  let dashboard=null,connected=false,access=null,route={dashboard:new URLSearchParams(location.search).get('dashboard')||'',projectId:new URLSearchParams(location.search).get('projectId')||''};
  const names={sales:'Lot Sales',forecasts:'Forecasts'};
  const workspace=document.querySelector('.workspace'),navigation=document.getElementById('insightsNavigation'),navigationToggle=document.getElementById('navigationToggle');
  let navigationMotions=[];
  function setNavigationExpanded(expanded,animate=false){
    if(!workspace||!navigationToggle)return;
    const parts=animate&&window.getComputedStyle?[workspace,...workspace.querySelectorAll('.brand-copy,.nav-label,.nav-text,.sidebar-tools .icon-button')]:[];
    const frame=node=>{const style=window.getComputedStyle(node);return node===workspace?{gridTemplateColumns:style.gridTemplateColumns}:{opacity:style.opacity,transform:style.transform};};
    const before=parts.map(frame);
    // Read the visible position first, then release old effects before measuring
    // the new CSS endpoint. Reversing mid-flight must never target an old effect.
    navigationMotions.forEach(motion=>motion?.cancel());navigationMotions=[];
    workspace.classList.toggle('navigation-collapsed',!expanded);
    navigationToggle.setAttribute('aria-expanded',String(expanded));
    navigationToggle.setAttribute('aria-label',expanded?'Collapse Menu':'Expand Menu');
    navigationToggle.title=expanded?'Collapse Menu':'Expand Menu';
    // One shared easing for the real grid, clipped labels and bottom tools.
    // Neither report is rebuilt or moved out of its existing scroller.
    const after=parts.map(frame);
    navigationMotions=parts.map((node,index)=>window.LMMotion?.animate(node,[before[index],after[index]],230)).filter(Boolean);
  }
  setNavigationExpanded(true);
  navigationToggle?.addEventListener('click',()=>setNavigationExpanded(navigationToggle.getAttribute('aria-expanded')!=='true',true));
  navigation?.addEventListener('keydown',event=>{
    if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    const items=[...navigation.querySelectorAll('[data-dashboard]')].filter(button=>!button.hidden),index=items.indexOf(event.target);
    if(index<0||!items.length)return;
    event.preventDefault();
    const next=event.key==='Home'?0:event.key==='End'?items.length-1:(index+(['ArrowUp','ArrowLeft'].includes(event.key)?-1:1)+items.length)%items.length;
    items[next].focus();show(items[next].dataset.dashboard);
  });
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
    document.querySelectorAll('[data-dashboard]').forEach(button=>{const key=button.dataset.dashboard,active=key===name;button.hidden=!allowed(key);button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
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
