(function(root){
  'use strict';
  function id(value){return typeof value==='string'?value:Array.isArray(value)?id(value[0]):value&&typeof value.ID==='string'?value.ID:'';}
  function ids(value){return (Array.isArray(value)?value:value?[value]:[]).map(id).filter(Boolean);}
  var indexes=new WeakMap();
  function index(rows){
    rows=rows||[];var cached=indexes.get(rows);
    if(!cached||cached.size!==rows.length){var byId=new Map();rows.forEach(function(row){byId.set(id(row),row);});cached={size:rows.length,byId:byId};indexes.set(rows,cached);}
    return cached.byId;
  }
  function merged(record,data){return Object.assign({},record||{},data||{});}
  function error(property,lot,subdivision){
    var lotId=id(property.Lots);
    if(!lotId)return '';
    if(!lot||id(lot)!==lotId)return 'The selected lot is unavailable. Choose another Lot Code or clear it.';
    var subId=id(lot.Subdivision);
    if(!subId||!subdivision||id(subdivision)!==subId)return 'The lot must have a valid Subdivision lookup.';
    if(ids(property.Subdivisions).indexOf(subId)<0)return 'Select the lot\'s subdivision in Subdivisions or choose a matching Lot Code.';
    var projectId=id(subdivision.Project);
    if(!projectId||ids(property.Projects).indexOf(projectId)<0)return 'Select the subdivision\'s project in Projects or choose a matching Lot Code.';
    return '';
  }
  function code(property,lots){
    var lotId=id(property.Lots),lot=index(lots).get(lotId);
    return lot?String(lot.Lot_Code||''):String(property.Lots&&(property.Lots.zc_display_value||property.Lots.display_value)||'');
  }
  root.LMPropertyLots={id:id,ids:ids,index:index,merged:merged,error:error,code:code};
})(window);
