/* Read-only Budget Import ledger. Source totals and element amounts are independent. */
(function (root) {
  "use strict";

  var COMPONENT_NAMES = Object.freeze(["Labor", "Materials", "Equipment", "Subcontractor", "Other"]);
  var SOURCE_KEYS = Object.freeze({"HeavyJob Budget":"budget", "HeavyJob":"hcss", "Great Plains":"gp"});
  var SOURCE_LABELS = Object.freeze({budget:"Construction Budget", hcss:"HCSS Actuals", gp:"GP Actuals"});
  var own = function (object, key) { return Object.prototype.hasOwnProperty.call(object, key); };

  function scalar(raw, depth) {
    if (raw == null || typeof raw !== "object") return raw;
    if (Array.isArray(raw) || depth > 5) return null;
    var fields = ["value", "display_value", "zc_display_value", "amount"];
    for (var i = 0; i < fields.length; i++) {
      if (own(raw, fields[i])) return scalar(raw[fields[i]], depth + 1);
    }
    return null;
  }

  function nullableNumber(raw) {
    raw = scalar(raw, 0);
    if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
    if (typeof raw !== "string") return null;
    var text = raw.trim().replace(/\u2212/g, "-");
    if (!text) return null;
    text = text.replace(/^USD\s*/i, "").replace(/\s*USD$/i, "").trim();
    var accounting = /^\(.*\)$/.test(text);
    if (accounting) text = text.slice(1, -1).trim();
    text = text.replace(/\$/g, "").replace(/\s/g, "");
    if (accounting && /^[+-]/.test(text)) return null;
    if (!/^[+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)$/.test(text)) return null;
    var value = Number(text.replace(/,/g, "")) * (accounting ? -1 : 1);
    return Number.isFinite(value) ? value : null;
  }

  function readComponent(row, name) {
    if (!row || COMPONENT_NAMES.indexOf(name) < 0) return null;
    // A promoted key, including an explicit blank, supersedes the old report key.
    return nullableNumber(row[own(row, name) ? name : name + "_Budget"]);
  }

  function text(raw) {
    raw = scalar(raw, 0);
    return raw == null || typeof raw === "boolean" ? "" : String(raw).trim();
  }

  function identity(raw) {
    if (raw == null || typeof raw === "boolean") return "";
    // Unsafe numeric IDs have already lost precision; do not combine their rows.
    if (typeof raw === "number") return Number.isSafeInteger(raw) ? String(raw) : "";
    return typeof raw === "string" ? raw.trim() : "";
  }

  function assignment(raw) {
    if (raw == null || raw === "") return null;
    if (typeof raw !== "object") {
      var scalarId = identity(raw);
      return scalarId ? {id:scalarId, label:scalarId} : null;
    }
    var id = identity(raw.id != null ? raw.id : raw.ID != null ? raw.ID : raw.value);
    var label = text(raw.label != null ? raw.label : raw.display_value != null ? raw.display_value : raw.zc_display_value != null ? raw.zc_display_value : raw.name);
    return id || label ? {id:id, label:label || id} : null;
  }

  function assignedLabelParts(assigned) {
    var label = assigned && assigned.label || "";
    if(assigned&&label===assigned.id)return {code:"",label:""};
    var match = label.match(/^(.+?)\s+(?:-|—)\s+(.+)$/);
    return match ? {code:match[1].trim(), label:match[2].trim()} : {code:"", label:label};
  }

  function makeAggregate(key, source) {
    var elements = {};
    COMPONENT_NAMES.forEach(function (name) { elements[name] = 0; });
    return {key:key, source:source, label:SOURCE_LABELS[key] || source || "Unknown Source", records:[], total:0, elements:elements};
  }

  function sumAmount(previous, next) {
    if (previous === null || next === null) return null;
    var total = previous + next;
    return Number.isFinite(total) ? total : null;
  }

  function createGroups(rows, options) {
    options = options || {};
    var groups = [], byKey = Object.create(null);
    var assignedOf = options.assigned || function (row) { return row.Budget_Item; };
    var sourceOf = options.source || function (row) { return row.Data_Source; };
    var majorOf = options.major || function (row) { return row.Major_Code; };
    var descriptionOf = options.description || function (row) { return row.Cost_Code_Description; };
    var codeOf = options.code || function (row) { return row.Code; };
    var costOf = options.cost || function (row) { return row.Cost; };
    var componentOf = options.component || readComponent;
    var differentOf = options.different || function () { return false; };
    var itemById = options.itemById || Object.create(null);

    (Array.isArray(rows) ? rows : []).forEach(function (row, index) {
      if (!row || typeof row !== "object") return;
      var assigned = assignment(assignedOf(row));
      var budgetItemId = assigned && assigned.id || "";
      // One exact native lookup identifies a group. Unassigned imports retain identity.
      var key = budgetItemId ? "item:" + budgetItemId : "import:" + identity(row.ID) + ":" + index;
      var group = byKey[key];
      if (!group) {
        var item = budgetItemId ? (typeof itemById === "function" ? itemById(budgetItemId) : itemById[budgetItemId]) : null;
        var labelParts = assignedLabelParts(assigned);
        var itemCode = item && text(item.Budget_Code);
        var itemName = item && text(item.Item_Name || item.Name || item.Description);
        group = {
          key:key,
          budgetItemId:budgetItemId,
          assigned:assigned,
          item:item || null,
          label:itemName || labelParts.label || text(descriptionOf(row)) || "Import Item",
          code:itemCode || labelParts.code || (budgetItemId ? "" : text(codeOf(row))),
          major:item && text(item.Major_Code) || text(majorOf(row)),
          records:[],
          sources:{budget:null, hcss:null, gp:null},
          otherSources:[],
          missing:!budgetItemId,
          different:false
        };
        byKey[key] = group;
        groups.push(group);
      }

      group.records.push(row);
      var different = differentOf(row);
      if (different === true) group.different = true;
      else if (different == null && group.different !== true && !group.missing) group.different = null;
      var source = text(sourceOf(row));
      var sourceKey = own(SOURCE_KEYS, source) ? SOURCE_KEYS[source] : "";
      var aggregate;
      if (sourceKey) {
        aggregate = group.sources[sourceKey] || (group.sources[sourceKey] = makeAggregate(sourceKey, source));
      } else {
        aggregate = group.otherSources.filter(function (entry) { return entry.source === source; })[0];
        if (!aggregate) {
          aggregate = makeAggregate("other:" + source, source);
          group.otherSources.push(aggregate);
        }
      }
      aggregate.records.push(row);
      aggregate.total = sumAmount(aggregate.total, nullableNumber(costOf(row)));
      COMPONENT_NAMES.forEach(function (name) {
        aggregate.elements[name] = sumAmount(aggregate.elements[name], nullableNumber(componentOf(row, name)));
      });
    });
    return groups;
  }

  root.BudgetImportLedger = Object.freeze({
    componentNames:COMPONENT_NAMES,
    nullableNumber:nullableNumber,
    readComponent:readComponent,
    createGroups:createGroups
  });
})(window);
