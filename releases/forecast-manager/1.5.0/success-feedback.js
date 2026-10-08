/* Approved routine success feedback. Presentation only; never performs a write. */
(function (root) {
  'use strict';
  var timer, queueTimer, node, pending = new Map(), revisions = new Map();
  function mount() {
    if (node) return node;
    var style = root.document.createElement('style');
    style.textContent = '#lmSuccessToast{box-sizing:border-box;position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:10000;display:flex;align-items:center;gap:8.82px;width:max-content;max-width:min(560px,calc(100vw - 36px));padding:10.08px 16.38px;border:1px solid #000;border-radius:7.56px;background:#000;color:#fff;font-family:inherit;font-size:13.86px;font-weight:750;line-height:1.35;box-shadow:0 10.08px 25.2px rgba(0,0,0,.35);pointer-events:none;overflow-wrap:anywhere}#lmSuccessToast[hidden]{display:none}#lmSuccessToast svg{display:block;width:20.16px;height:20.16px;flex:none}#lmSuccessToast span{min-width:0}';
    root.document.head.appendChild(style);
    node = root.document.createElement('div');
    node.id = 'lmSuccessToast'; node.hidden = true;
    node.setAttribute('role', 'status'); node.setAttribute('aria-live', 'polite'); node.setAttribute('aria-atomic', 'true');
    node.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#a7f3d0"/><path d="M7 12.5l3 3 7-7" fill="none" stroke="#166534" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span></span>';
    root.document.body.appendChild(node);
    return node;
  }
  function hide() { root.clearTimeout(timer); if (node) { node.hidden = true; node.querySelector('span').textContent = ''; } }
  function clear() { hide(); root.clearTimeout(queueTimer); pending.clear(); }
  function show(message, options) {
    if (!message) return;
    clear(); var el = mount(); el.querySelector('span').textContent = String(message); el.hidden = false;
    timer = root.setTimeout(hide, options && options.durationMs || 3500);
  }
  function begin(key) {
    key = String(key); pending.delete(key);
    var revision = (revisions.get(key) || 0) + 1; revisions.set(key, revision); hide(); return revision;
  }
  function valid(entry) {
    try { return (entry.revision == null || revisions.get(entry.key) === entry.revision) && (!entry.guard || entry.guard()); } catch (_) { return false; }
  }
  function flush() {
    var rows = Array.from(pending.values()).filter(valid); pending.clear();
    if (!rows.length) return;
    var groups = new Set(rows.map(function (row) { return row.group; }));
    show(rows.length === 1 ? rows[0].message : groups.size === 1 ? rows.length + ' ' + rows[0].group + ' saved.' : rows.length + ' changes saved.');
  }
  function inline(key, message, group, guard, revision) {
    var entry = {key:String(key), message:message, group:group || 'changes', guard:guard, revision:revision};
    if (!valid(entry)) return;
    pending.set(entry.key, entry); root.clearTimeout(queueTimer); queueTimer = root.setTimeout(flush, 650);
  }
  root.LMSuccess = Object.freeze({show:show, inline:inline, begin:begin, clear:clear});
})(window);
