(function (root) {
  'use strict';
  // Labels and ordering come from land subtype drop down options.pptx.
  var groups = {
    Other: ['Condo', 'Oil & Gas', 'Personal Property', 'Tract & Structure', 'Tract'],
    Residential: ['Tract', 'MUD Duplicate', 'L&B Res', 'L&B Drain/Det', 'L&B Open Space', 'L&B Amenity', 'L&B Util/Gov', 'Unusable', 'School District'],
    Commercial: ['Tract-Dev', 'Tract-Undev', 'Retail', 'Office', 'Personal Property']
  };
  function allowed(type, value) { return !value || !!(groups[type] && groups[type].indexOf(String(value)) >= 0); }
  function typesList(types) { return Array.isArray(types) ? types : [String(types || '')]; }
  function available(types, value) { return types.length > 0 && types.every(function (type) { return allowed(type, value); }); }
  function disabled(types) { return !types.length || types.some(function (type) { return !groups[type]; }); }
  function esc(value) { return String(value).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function options(types, current) {
    types = typesList(types); current = String(current || '');
    var selected = false, html = '<option value="">—</option>';
    if (current && !available(types, current)) html += '<option selected disabled value="' + esc(current) + '">' + esc(current) + ' (Current Value)</option>';
    Object.keys(groups).forEach(function (group) {
      html += '<optgroup label="' + group + '">';
      groups[group].forEach(function (value) {
        var enabled = types.indexOf(group) >= 0 && available(types, value), chosen = enabled && !selected && current === value;
        if (chosen) selected = true;
        html += '<option value="' + esc(value) + '"' + (enabled ? '' : ' disabled') + (chosen ? ' selected' : '') + '>' + esc(value) + '</option>';
      });
      html += '</optgroup>';
    });
    return html;
  }
  function configure(select, types, clearInvalid) {
    if (!select) return;
    types = typesList(types);
    var current = String(select.value || '');
    if (clearInvalid && !available(types, current)) current = '';
    select.innerHTML = options(types, current);
    select.disabled = disabled(types);
    select.setAttribute('data-show-disabled', '1');
    if (root.LMPickers) root.LMPickers.refresh(select);
  }
  function error(type, value) {
    if (allowed(type, value)) return '';
    if (!type) return 'Select Land Type before choosing Subtype.';
    if (type === 'LOI') return 'Subtype must be blank for LOI.';
    return 'Choose a Subtype available for ' + type + '.';
  }
  function prepare(record, data) {
    var hasType = Object.prototype.hasOwnProperty.call(data, 'Land_Type'), hasSubtype = Object.prototype.hasOwnProperty.call(data, 'Subtype');
    if (!hasType && !hasSubtype) return data;
    if (!record && !hasType) throw new Error('Reload the Property before changing Subtype.');
    var type = hasType ? String(data.Land_Type || '') : String(record.Land_Type || '');
    var value = hasSubtype ? String(data.Subtype || '') : String(record && record.Subtype || '');
    // A Land Type change clears an incompatible subtype in the same native write.
    if (hasType && !hasSubtype && !allowed(type, value)) { data.Subtype = ''; value = ''; }
    var message = error(type, value);
    if (message) throw new Error(message);
    return data;
  }
  root.LMPropertySubtypes = {groups:groups, values:Array.from(new Set(Object.values(groups).flat())), allowed:allowed, disabled:disabled, options:options, configure:configure, error:error, prepare:prepare};
})(typeof window === 'undefined' ? globalThis : window);
