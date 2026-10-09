/* Exact PO decimal contract. Currency crosses Creator boundaries as strings. */
(function (root) {
  "use strict";
  // Creator counts the decimal point in Max Digits: 13 integral digits + '.' + 2.
  var UOMS = [ "CY", "EA", "LB", "LF",  "LOTS", "LS", "S", "SET", "SF", "SY", "TN",   "VF", "WK"];
  var MAX_CENTS = 999999999999999n;
  function decimal(raw, label) {
    if (typeof raw !== "string" || !/^\d+(?:\.\d+)?$/.test(raw)) throw new Error((label || "Amount") + " must be an exact decimal string.");
    var p = raw.split("."), fraction = p[1] || "";
    return { coefficient:BigInt(p[0] + fraction), scale:fraction.length };
  }
  function money(raw) {
    var d = decimal(raw);
    if (d.scale > 2) throw new Error("Currency allows two decimal places.");
    var cents = d.coefficient * (10n ** BigInt(2-d.scale));
    if (cents > MAX_CENTS) throw new Error("Currency exceeds Max Digits 16.");
    return cents;
  }
  function currency(cents) {
    var sign = cents < 0n ? "-" : "", abs = cents < 0n ? -cents : cents;
    return sign + String(abs / 100n) + "." + String(abs % 100n).padStart(2,"0");
  }
  function multiply(quantity, unitPrice) {
    var q = decimal(quantity,"Quantity"), price = money(unitPrice);
    if (q.coefficient <= 0n || q.scale > 6 || quantity.length > 16) throw new Error("Quantity must be positive, with at most six decimal places and Max Digits 16.");
    var divisor = 10n ** BigInt(q.scale), product = q.coefficient * price;
    var cents = (product + divisor / 2n) / divisor;
    if (cents > MAX_CENTS) throw new Error("Calculated amount exceeds Max Digits 16.");
    return currency(cents);
  }
  function override(line, finalAmount) {
    return Object.assign({},line,{pricingMode:"Manual",quantity:null,unitPrice:null,finalAmount:currency(money(finalAmount))});
  }
  function calculated(line) {
    return Object.assign({},line,{pricingMode:"Calculated",quantity:null,unitPrice:null,finalAmount:null});
  }
  function duplicate(line, key) {
    var copy={key:key};
    ['budgetItemId','description','uom','costElement','pricingMode','quantity','unitPrice','finalAmount','costCode'].forEach(function(field){copy[field]=line[field];});
    return copy;
  }
  function validate(payload, submit) {
    if (!payload || typeof payload.budgetId!=="string" || typeof payload.vendorId!=="string" || !/^\d+$/.test(payload.budgetId) || !/^\d+$/.test(payload.vendorId)) throw new Error("Phase and vendor are required.");
    if (payload.budgetModificationId!=null && (typeof payload.budgetModificationId!=="string" || !/^\d+$/.test(payload.budgetModificationId))) throw new Error("Linked budget modification must be a Creator ID string or null.");
    var header = money(payload.amount);
    if (header <= 0n) throw new Error("PO amount must be positive.");
    if (!Array.isArray(payload.lines) || !payload.lines.length || payload.lines.length > 100) throw new Error("Enter 1–100 complete lines.");
    var total = 0n, grouped = Object.create(null), keys = new Set();
    var lines = payload.lines.map(function(line) {
      if (!line || !/^[A-Za-z0-9-]{1,80}$/.test(line.key) || keys.has(line.key)) throw new Error("Each line needs a unique key.");
      keys.add(line.key);
      if (typeof line.budgetItemId !== "string" || !/^\d+$/.test(line.budgetItemId)) throw new Error("Budget Item is required.");
      if (typeof line.description !== "string" || !line.description.trim() || line.description.length>1000) throw new Error("Line Description is required (maximum 1000 characters).");
      if (!/^[1-5]$/.test(line.costElement) || typeof line.costElement!=="string") throw new Error("Cost Element must be 1–5.");
      if (typeof line.uom!=="string" || UOMS.indexOf(line.uom)<0) throw new Error("Select a valid UOM.");
      if (line.pricingMode!=="Manual" && line.pricingMode!=="Calculated") throw new Error("Unknown pricing mode.");
      var amount = currency(money(line.finalAmount));

      if (line.pricingMode==="Manual") {
        if (line.quantity!==null || line.unitPrice!==null) throw new Error("Manual lines require true null Quantity and Unit Price.");
      } else if (multiply(line.quantity,line.unitPrice)!==amount) throw new Error("Calculated Final Amount does not match Quantity × Unit Price.");
      total += money(amount);
      if(total>MAX_CENTS) throw new Error("Line total exceeds currency capacity.");
      grouped[line.budgetItemId]=(grouped[line.budgetItemId]||0n)+money(amount);
      return Object.assign({},line,{finalAmount:amount});
    });
    if (submit && total!==header) throw new Error("Line totals must equal the full PO amount exactly.");
    return {amount:currency(header),budgetModificationId:payload.budgetModificationId||null,lines:lines,total:currency(total),grouped:grouped};
  }
  function commitments(headers, lines, budgetId) {
    var grouped=Object.create(null),seen=new Set();
    headers.forEach(function(header) {
      if (typeof header.ID!=="string" || !/^\d+$/.test(header.ID) || seen.has(header.ID) || header.budgetId!==budgetId) throw new Error("Invalid or duplicate PO header.");
      seen.add(header.ID);
      if (header.status==="Draft") return;
      if (header.status && header.status!=="Submitted") throw new Error("Unknown commitment state.");
      if (!header.revision) {
        if (typeof header.budgetItemId!=="string" || !/^\d+$/.test(header.budgetItemId)) throw new Error("Legacy PO Budget Item is missing.");
        grouped[header.budgetItemId]=(grouped[header.budgetItemId]||0n)+money(header.amount);
        return;
      }
      var active=lines.filter(function(line){return line.poId===header.ID && line.revision===header.revision;});
      if (!active.length || active.length!==header.lineCount) throw new Error("PO lines are incomplete.");
      var total=0n, rowKeys=new Set();
      active.forEach(function(line){
        if(typeof line.budgetItemId!=="string" || !/^\d+$/.test(line.budgetItemId)) throw new Error("Committed Budget Item identity is invalid.");
        if(typeof line.key!=="string" || !/^[A-Za-z0-9-]{1,80}$/.test(line.key) || rowKeys.has(line.key)) throw new Error("Duplicate or invalid committed PO line.");
        rowKeys.add(line.key);
        var amount=money(line.finalAmount);  total+=amount;
        if(total>MAX_CENTS) throw new Error("Committed total exceeds currency capacity.");
        grouped[line.budgetItemId]=(grouped[line.budgetItemId]||0n)+amount;
      });
      if(total!==money(header.amount)) throw new Error("Committed PO allocation does not match header.");
    });
    return grouped;
  }
  // Balances already include every reserved PO. Add only this saved PO's
  // immutable allocation back when displaying its own before/after formula.
  function allocations(lines, balances, reservedLines, reservedModifications) {
    var grouped=Object.create(null), own=Object.create(null), ownCredits=Object.create(null);
    (reservedModifications||[]).forEach(function(mod){if(mod.status!=='Approved')ownCredits[mod.budgetItemId]=(ownCredits[mod.budgetItemId]||0n)+money(mod.amount);});
    (reservedLines||[]).forEach(function(line){own[line.budgetItemId]=(own[line.budgetItemId]||0n)+money(line.finalAmount);});
    lines.forEach(function(line){if(!line.budgetItemId)return;var amount=0n;try{amount=money(line.finalAmount);}catch(ignore){}grouped[line.budgetItemId]=(grouped[line.budgetItemId]||0n)+amount;});
    return Object.keys(grouped).map(function(id){
      var balance=balances.find(function(row){return row.budgetItemId===id;});
      if(!balance)return {budgetItemId:id,verified:false};
      var available=BigInt(balance.availableCents)+(own[id]||0n), remaining=available-grouped[id], pending=BigInt(balance.pendingModificationCents||'0')-(ownCredits[id]||0n);
      if(pending<0n)throw new Error('Pending PO modification balance does not reconcile.');
      var shortfall=grouped[id]-available-pending;
      return {budgetItemId:id,verified:true,available:available,allocated:grouped[id],remaining:remaining,pending:pending,shortfall:shortfall>0n?shortfall:0n};
    });
  }
  root.LMPO={uoms:UOMS,duplicate:duplicate,costCode:function(subdivision,minor,element){return subdivision&&minor&&/^[1-5]$/.test(element)?"C_"+subdivision+"-"+minor+"-"+element:"";},money:money,currency:currency,multiply:multiply,override:override,calculated:calculated,validate:validate,commitments:commitments,allocations:allocations};
})(typeof globalThis!=="undefined"?globalThis:this);
