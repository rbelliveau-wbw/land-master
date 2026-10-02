(function (global) {
  "use strict";
  var state = {environment:"UNKNOWN",user:"",fragment:"",params:{},appLinkName:""};
  function text(value) { return String(value == null ? "" : value).trim(); }
  function nativeEnvironment(params) {
    params = params || {};
    var keys = ["envUrlFragment","env_url_fragment"];
    for (var i = 0; i < keys.length; i++) {
      if (!Object.prototype.hasOwnProperty.call(params, keys[i])) continue;
      var fragment = params[keys[i]];
      if (typeof fragment !== "string") throw new Error("Creator did not identify a recognized environment.");
      fragment = fragment.trim();
      if (fragment === "") return "PRODUCTION";
      if (/^\/?environment\/development\/?$/i.test(fragment)) return "DEVELOPMENT";
      if (/^\/?environment\/(?:stage|staging)\/?$/i.test(fragment)) return "STAGE";
      throw new Error("Creator did not identify a recognized environment.");
    }
    return null;
  }
  function detect(params) {
    var native = nativeEnvironment(params);
    if (native) return native;
    var hints = [text(params && (params.environment || params.Environment || params.env))];
    try { hints.push(document.referrer || ""); } catch (ignore) {}
    try { hints.push(global.location && global.location.href || ""); } catch (ignore) {}
    try { var origins = global.location && global.location.ancestorOrigins; for (var i = 0; origins && i < origins.length; i++) hints.push(origins[i] || ""); } catch (ignore) {}
    var joined = hints.join(" ");
    if (/(?:environment[\/:=-]?|\/)(development|dev)(?:[\/.?#&\s-]|$)/i.test(joined) || /\/dev\//i.test(joined)) return "DEVELOPMENT";
    if (/(?:environment[\/:=-]?|\/)(stage|staging)(?:[\/.?#&\s-]|$)/i.test(joined) || /\/stage\//i.test(joined)) return "STAGE";
    if (/\/prod(?:uction)?\//i.test(joined)) return "PRODUCTION";
    return "UNKNOWN";
  }
  function user(params) {
    params = params || {};
    var value = params.loginUser || params.login_user || params.user || params.loginEmailId || params.userEmail || "";
    if (value) return text(value);
    try { var creator = global.ZOHO && global.ZOHO.CREATOR; return text(creator && (creator.loginUser || creator.LOGIN_USER) || global.appsetup && global.appsetup.loginUser || ""); } catch (ignore) { return ""; }
  }
  function apply(params) {
    params = params || {};
    state = {environment:"UNKNOWN",user:"",params:params,fragment:text(params.envUrlFragment || params.env_url_fragment || params.environment || ""),appLinkName:text(params.appLinkName || params.app_link_name || "")};
    state.environment = detect(params);
    state.user = user(params);
    return current();
  }
  function current() { return {environment:state.environment,user:state.user || "(unknown)",environmentFragment:state.fragment,appLinkName:state.appLinkName}; }
  function capture() {
    return Promise.resolve().then(function () {
      var creator = global.ZOHO && global.ZOHO.CREATOR;
      if (!creator || !creator.UTIL || typeof creator.UTIL.getInitParams !== "function") throw new Error("Creator session context is unavailable.");
      return creator.UTIL.getInitParams();
    }).then(apply);
  }
  function apiName(name) {
    name = text(name);
    if (!name) return name;
    if (state.environment === "DEVELOPMENT") {
      if (name === "Save_PF1" || name === "Save_PF") return "Save_PF";
      if (name === "Get_Proforma_Approval_PDF1" || name === "Get_Proforma_Approval_PDF") return "Get_Proforma_Approval_PDF";
      return /_DEV$/i.test(name) ? name : name + "_DEV";
    }
    if (state.environment === "STAGE") return /_STAGE$/i.test(name) ? name : name + "_STAGE";
    return name;
  }
  global.LMRuntime = {capture:capture,current:current,apiName:apiName,apply:apply};
})(window);
