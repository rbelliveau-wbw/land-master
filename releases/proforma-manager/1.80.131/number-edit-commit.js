/* Hold derived visuals during typing. Native values, calculations and saves stay immediate. */
(function (global) {
  'use strict';
  let editing = null;
  const gates = new Set();
  function editable(node) {
    return node instanceof Element && node.matches('textarea:not([readonly]):not([disabled]),input:not([readonly]):not([disabled]):is(:not([type]),[type="text"],[type="search"],[type="number"],[type="email"],[type="tel"],[type="url"]),[contenteditable="true"]');
  }
  function commit() { editing = null; gates.forEach(gate => gate.commit()); }
  const fieldKey=node=>JSON.stringify([...node.attributes].filter(a=>/^(id|name|type|data-)/.test(a.name)).map(a=>[a.name,a.value]).sort());
  // Capture precedes the original input handler, including synchronous renderers.
  document.addEventListener('input', event => {
    if (!editable(event.target)) return;
    if(editing!==event.target)gates.forEach(gate=>gate.begin());
    editing = event.target;
    setTimeout(()=>{if(editing&&!editing.isConnected)commit();},0);
  }, true);
  document.addEventListener('focusout', event => {
    const field=event.target;
    setTimeout(()=>{if(field===editing)commit();},0);
  }, true);
  document.addEventListener('focusin',event=>{
    if(!editing||event.target===editing)return;
    // Existing renderers may replace and restore the same native editor synchronously.
    if(!editing.isConnected&&editable(event.target)&&fieldKey(editing)===fieldKey(event.target))editing=event.target;
    else commit();
  },true);
  function create(options) {
    const pending = new Map(), committed = new Map(), baselineValues = new Map();
    let applying=false;
    function run(node,old,apply) { applying=true;try{apply(node,old);}finally{applying=false;} }
    const gate = {
      begin() {
        baselineValues.clear();
        document.querySelectorAll(options.selector).forEach(node=>baselineValues.set(options.key(node),options.read(node)));
      },
      hold(node, old, apply) {
        if(applying)return false;
        const id = options.key(node), prior = pending.get(id);
        if (!editing) {
          if (prior) { pending.delete(id); node.classList.remove('number-edit-pending'); if(options.releaseVisual)options.releaseVisual(node); }
          // Native change handlers can replace a held node just before focusout.
          // Carry its visual baseline into the observer's already-scheduled frame.
          if (committed.has(id)) { run(node,committed.get(id),apply); return true; }
          return false;
        }
        // Capture before the original input handler; nested renderers may supply an
        // empty comparison map. Never replace an existing held value with a blank.
        const baseline = prior ? prior.old : baselineValues.has(id) ? baselineValues.get(id) : old;
        const from = options.text(baseline);
        // A genuinely new/unknown slot has no old visual. Leave it readable/static.
        if(from===undefined||from===null||from==='')return false;
        node.dataset.numberEditFrom = from;
        node.style.minWidth = ''; // CSS sizes the held display from the old text alone.
        node.classList.remove(options.changing);
        node.classList.add('number-edit-pending');
        if(options.holdVisual)options.holdVisual(node,baseline);
        pending.set(id, {node, old:baseline, apply});
        return true;
      },
      commit() {
        const jobs = [...pending.entries()]; pending.clear();
        // Remove every hold first, then let the browser start the final replacements together.
        jobs.forEach(([id,{node,old}]) => {committed.set(id,old);node.classList.remove('number-edit-pending');if(options.releaseVisual)options.releaseVisual(node);});
        jobs.forEach(([, {node,old,apply}]) => { if (node.isConnected) run(node,old,apply); });
        requestAnimationFrame(()=>committed.clear());
      },
      reset() { pending.forEach(({node}) => {node.classList.remove('number-edit-pending');node.style.minWidth='';if(options.releaseVisual)options.releaseVisual(node);}); pending.clear();committed.clear();baselineValues.clear(); },
      stop() { gate.reset(); gates.delete(gate); }
    };
    gates.add(gate); return gate;
  }
  global.NumberEditCommit = Object.freeze({create});
})(window);
