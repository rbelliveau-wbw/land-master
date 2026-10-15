/* Sliding push changes presentation only; never delays a save or counts between values. */
(function (global) {
  'use strict';
  const active = new WeakMap();
  const numeric = value => /^-?\d[\d,]*(?:\.\d+)?$/.test(String(value));
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function markup(value, key) {
    return '<span class="number-push" data-number-key="'+escape(key)+'" data-number-value="'+escape(value)+'"><span class="number-push-value">'+escape(value)+'</span></span>';
  }
  function capture(root) {
    return new Map(root ? [...root.querySelectorAll('[data-number-key]')].map(node => [node.dataset.numberKey,node.dataset.numberValue]) : []);
  }
  function update(node, value, previous) {
    if (!node) return;
    value = String(value);
    const old = previous === undefined ? node.dataset.numberValue : previous;
    if (previous === undefined && old === value) return;
    const running = active.get(node);
    if (running) clearTimeout(running);
    node.classList.remove('is-changing');
    node.dataset.numberValue = value;
    let label = node.querySelector('.number-push-value');
    if (!label) { label=node.ownerDocument.createElement('span');label.className='number-push-value';node.replaceChildren(label); }
    label.textContent = value;
    const motion = old !== undefined && old !== value && numeric(old) && numeric(value) && !global.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    node.dataset.from = motion ? old : value;
    node.style.minWidth = motion ? Math.max(old.length,value.length)+'ch' : '';
    if (!motion || !node.isConnected) return;
    // Restart from the last real value if a second response arrives mid-transition.
    void node.offsetWidth;
    node.classList.add('is-changing');
    active.set(node,setTimeout(() => {node.classList.remove('is-changing');active.delete(node);},420));
  }
  function apply(root, previous) {
    root.querySelectorAll('[data-number-key]').forEach(node => update(node,node.dataset.numberValue,previous.get(node.dataset.numberKey)));
  }
  function tokens(node, key) {
    let index=0;
    for (const text of [...node.childNodes].filter(child => child.nodeType===3)) {
      const fragment=node.ownerDocument.createDocumentFragment(), source=text.textContent;
      let cursor=0;
      for (const match of source.matchAll(/-?\d[\d,]*(?:\.\d+)?/g)) {
        fragment.append(node.ownerDocument.createTextNode(source.slice(cursor,match.index)));
        const span=node.ownerDocument.createElement('span');span.className='number-push';span.dataset.numberKey=key+'|'+index++;span.dataset.numberValue=match[0];
        const value=node.ownerDocument.createElement('span');value.className='number-push-value';value.textContent=match[0];span.append(value);fragment.append(span);cursor=match.index+match[0].length;
      }
      fragment.append(node.ownerDocument.createTextNode(source.slice(cursor)));text.replaceWith(fragment);
    }
  }
  function text(node, value, key) {
    if (node.textContent===value && node.querySelector('[data-number-key]')?.dataset.numberKey.startsWith(key+'|')) return;
    const previous=capture(node);node.textContent=value;tokens(node,key);apply(node,previous);
  }
  function summary(root, scope, signature) {
    function fields(host, prefix, selectors) {
      selectors.forEach(selector => host.querySelectorAll(selector).forEach((node,index) => {
        if (node.closest('.sr-only') || /date/i.test(node.dataset.nativeLabel||'')) return;
        if (node.dataset.nativeValue && !numeric(node.dataset.nativeValue)) return;
        tokens(node,prefix+'|'+selector+'|'+index);
      }));
    }
    const lot=root.querySelector('.fs-lot-card');
    fields(root,scope+'|subdivision',['.fs-balance-value']);
    if (lot) fields(lot,scope+'|subdivision',['.fs-fact-value','.subdivision-card-stat>strong']);
    const names=[...root.querySelectorAll('.builder-matrix tbody th')].map(node => node.getAttribute('aria-label'));
    if (lot) fields(lot,scope+'|inventory|'+JSON.stringify(names),['.builder-matrix tbody td']);
    root.querySelectorAll('.fs-card').forEach((card,index) => fields(card,scope+'|schedule|'+signature+'|'+index,[
      '.fs-card-balance-value','.fs-obligation','.fs-progress-label','.fs-progress-sales','.fs-expected','.fs-month-status',
      '.fs-term-values [data-native-value]','.fs-sale-value','.fs-contract-count'
    ]));
  }
  global.ForecastNumbers=Object.freeze({markup,capture,update,apply,text,summary});
})(window);
