/* Sliding push is presentation only: never change model math, input values or requests. */
(function (global) {
  'use strict';
  const active = new WeakMap(), identities = new WeakMap();
  const gate=global.NumberEditCommit?.create({key:node=>node.dataset.pfNumberKey,selector:'[data-pf-number-key]',read:node=>({text:node.dataset.pfNumberText,context:node.dataset.pfNumberContext}),text:old=>old?.text,changing:'pf-number-changing'});
  let nextIdentity = 0;
  const key = (...parts) => JSON.stringify(parts);
  function identity(record) {
    if (!record || typeof record !== 'object') return String(record || '');
    if (record.ID) return String(record.ID);
    if (!identities.has(record)) identities.set(record, 'draft-' + (++nextIdentity));
    return identities.get(record);
  }
  function capture(root) {
    const values = new Map();
    root?.querySelectorAll('[data-pf-number-key]').forEach(node => values.set(node.dataset.pfNumberKey, {
      text:node.dataset.pfNumberText, context:node.dataset.pfNumberContext, width:0
    }));
    return values;
  }
  function applyNode(node, old) {
    const text=node.dataset.pfNumberText, reduced=global.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reduced && old?.text===text && old.context===node.dataset.pfNumberContext && active.has(node)) return;
    clearTimeout(active.get(node));active.delete(node);
    node.classList.remove('pf-number-changing');node.style.minWidth='';
    if (!old || reduced || !node.isConnected || (old.text===text && old.context===node.dataset.pfNumberContext)) return;
    node.dataset.pfNumberFrom=old.text;
    node.style.minWidth=Math.max(old.text.length,text.length)+'ch';
    node.classList.add('pf-number-changing');
    active.set(node,setTimeout(()=>{node.classList.remove('pf-number-changing');node.style.minWidth='';active.delete(node);},420));
  }
  function apply(root, previous = new Map()) {
    root?.querySelectorAll('[data-pf-number-key]').forEach(node=>{
      const old=previous.get(node.dataset.pfNumberKey);
      if (!gate?.hold(node,old,applyNode)) applyNode(node,old);
    });
  }
  const tokens = /\([−-]?\$\d[\d,]*(?:\.\d+)?\)|[+\-−±]?\$?\d[\d,]*(?:\.\d+)?(?:%|\+|\spts)?/g;
  function numericText(text, mode) {
    return [...String(text).matchAll(tokens)].filter(match => mode === 'money' ? match[0].includes('$') : mode === 'ratio' ? /%|pts/.test(match[0]) : true);
  }
  function valueNode(text, id, context) {
    const node = document.createElement('span'), value = document.createElement('span');
    node.className = 'pf-number-push'; value.className = 'pf-number-value';
    node.dataset.pfNumberKey = id; node.dataset.pfNumberText = text; node.dataset.pfNumberContext = context || '';
    value.textContent = text; node.appendChild(value); return node;
  }
  function decorate(host, id, mode = 'any', context = '') {
    if (!host) return;
    // Reuse untouched mounted values (including their active animation). Unwrap only our own presentation.
    const signature = key(id, mode, context, host.textContent);
    if (host.__pfNumberSignature === signature && host.querySelector('[data-pf-number-key]')) return;
    host.querySelectorAll('.pf-number-push').forEach(node => node.replaceWith(document.createTextNode(node.dataset.pfNumberText)));
    host.normalize();
    const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT), texts = [];
    while (walker.nextNode()) {
      const text = walker.currentNode;
      if (!text.parentElement.closest('input,textarea,select,option,script,style,[data-pf-number-key]')) texts.push(text);
    }
    let ordinal = 0;
    texts.forEach(text => {
      const matches = numericText(text.data, mode); if (!matches.length) return;
      const fragment = document.createDocumentFragment(); let end = 0;
      matches.forEach(match => {
        fragment.appendChild(document.createTextNode(text.data.slice(end, match.index)));
        fragment.appendChild(valueNode(match[0], key(id, ordinal++), context)); end = match.index + match[0].length;
      });
      fragment.appendChild(document.createTextNode(text.data.slice(end))); text.replaceWith(fragment);
    });
    host.__pfNumberSignature = signature;
  }
  function readonly(input, id) {
    if (!input?.readOnly) return;
    let shell = input.parentElement;
    if (!shell.classList.contains('pf-number-input')) {
      const color = getComputedStyle(input).color;
      shell = document.createElement('span'); shell.className = 'pf-number-input'; input.before(shell); shell.appendChild(input);
      shell.style.setProperty('--pf-number-input-color', color);
      const display = document.createElement('span'); display.className = 'pf-number-input-display'; display.setAttribute('aria-hidden', 'true'); shell.appendChild(display);
    }
    const display = shell.querySelector('.pf-number-input-display'), style = getComputedStyle(input);
    display.style.font = style.font; display.style.textAlign = style.textAlign;
    display.style.padding = style.padding; display.style.color = style.getPropertyValue('--pf-number-input-color') || style.color;
    if (display.textContent !== input.value) display.textContent = input.value;
    decorate(display, id);
  }
  function wrap(fn, roots, decorateView) {
    let depth = 0;
    return function () {
      if (depth++) {try {return fn.apply(this, arguments);} finally {depth--;}}
      const before = capture(roots());
      try {return fn.apply(this, arguments);} finally {
        depth--;
        try {decorateView(); apply(roots(), before);} catch (error) {console.warn('Pro Forma number presentation:', error);}
      }
    };
  }
  global.PFNumbers = Object.freeze({key, identity, capture, apply, decorate, readonly, wrap});
})(window);
