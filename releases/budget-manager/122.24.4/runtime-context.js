(function(global){
  "use strict";
  var state={environment:"UNKNOWN",user:"",fragment:"",params:{}};
  function text(v){return String(v==null?"":v).trim();}
  function detect(params){
    params=params||{};
    var fragment=text(params.envUrlFragment||params.env_url_fragment||params.environment||params.Environment||params.env);
    var sources=[fragment];
    try{sources.push(document.referrer||"");}catch(e){}
    try{sources.push(global.location&&global.location.href||"");}catch(e){}
    try{var origins=global.location&&global.location.ancestorOrigins;for(var i=0;origins&&i<origins.length;i++)sources.push(origins[i]||"");}catch(e){}
    var joined=sources.join(" ");
    if(/(?:environment[\/:=-]?|\/)(development|dev)(?:[\/.?#&\s-]|$)/i.test(joined)||/\/dev\//i.test(joined))return"DEVELOPMENT";
    if(/(?:environment[\/:=-]?|\/)(stage|staging)(?:[\/.?#&\s-]|$)/i.test(joined)||/\/stage\//i.test(joined))return"STAGE";
    if(/\/prod(?:uction)?\//i.test(joined)||fragment==="")return"PRODUCTION";
    return"UNKNOWN";
  }
  function user(params){
    params=params||{};
    var value=params.loginUser||params.login_user||params.user||params.loginEmailId||params.userEmail||"";
    if(value)return text(value);
    try{var z=global.ZOHO&&global.ZOHO.CREATOR;return text(z&&(z.loginUser||z.LOGIN_USER)||(global.appsetup&&global.appsetup.loginUser)||"");}catch(e){return"";}
  }
  function apply(params){state.params=params||{};state.fragment=text(state.params.envUrlFragment||state.params.env_url_fragment||state.params.environment||"");state.environment=detect(state.params);state.user=user(state.params);return current();}
  function current(){return{environment:state.environment,user:state.user||"(unknown)",environmentFragment:state.fragment};}
  function capture(){
    var z=global.ZOHO&&global.ZOHO.CREATOR,raw=null;
    try{raw=z&&z.UTIL&&typeof z.UTIL.getInitParams==="function"?z.UTIL.getInitParams():(z&&typeof z.getInitParams==="function"?z.getInitParams():null);}catch(e){}
    return Promise.resolve(raw).then(apply,function(){return apply(null);});
  }
  function apiName(productionName){
    var name=text(productionName),env=state.environment;
    if(!name)return name;
    if(env==="DEVELOPMENT"){
      if(name==="Save_PF1"||name==="Save_PF")return"Save_PF";
      if(name==="Get_Proforma_Approval_PDF1"||name==="Get_Proforma_Approval_PDF")return"Get_Proforma_Approval_PDF";
      return /_DEV$/i.test(name)?name:name+"_DEV";
    }
    if(env==="STAGE")return /_STAGE$/i.test(name)?name:name+"_STAGE";
    return name;
  }
  global.LMRuntime={capture:capture,current:current,apiName:apiName,apply:apply};
})(window);
