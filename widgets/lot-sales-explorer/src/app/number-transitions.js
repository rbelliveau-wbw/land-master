/* Sliding push: presentation only. Values, requests, exports and focus update immediately. */
(function (global) {
  'use strict';
  const active = new WeakMap();
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const numeric = value => /^-?\d[\d,]*(?:\.\d+)?$/.test(value);
  const key = (...parts) => JSON.stringify(parts);
  function markup(value, identity, context = '') {
    const text = String(value ?? ''), match = text.match(/^(-?)(\$?)(\d[\d,]*(?:\.\d+)?)(%?)$/);
    if (!match) return escape(text);
    const number = match[1] + match[3];
    // Each visual retains its own sign and units when the selected measure changes.
    return '<span class="number-push" data-number-key="' + escape(identity) + '" data-number-value="' + number + '" data-number-text="' + escape(text) + '" data-number-context="' + escape(context) + '"><span class="number-push-value">' + escape(text) + '</span></span>';
  }
  function capture(root) {
    return new Map(root ? [...root.querySelectorAll('[data-number-key]')].map(node => [node.dataset.numberKey, {value:node.dataset.numberValue, text:node.dataset.numberText, context:node.dataset.numberContext}]) : []);
  }
  function apply(root, previous = new Map()) {
    if (!root) return;
    root.querySelectorAll('[data-number-key]').forEach(node => {
      const old = previous.get(node.dataset.numberKey), value = node.dataset.numberValue;
      const reduced = global.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (!reduced && old?.text === node.dataset.numberText && old.context === node.dataset.numberContext && active.has(node)) return;
      clearTimeout(active.get(node));
      node.classList.remove('is-changing');
      node.style.minWidth = '';
      if (!old || (old.text === node.dataset.numberText && old.context === node.dataset.numberContext) || !numeric(old.value) || !numeric(value) || reduced || !node.isConnected) return;
      node.dataset.from = old.text;
      node.style.minWidth = Math.max(old.text.length, node.dataset.numberText.length) + 'ch';
      void node.offsetWidth;
      node.classList.add('is-changing');
      active.set(node, setTimeout(() => { node.classList.remove('is-changing'); node.style.minWidth = ''; active.delete(node); }, 420));
    });
  }
  global.InsightsNumbers = Object.freeze({key, markup, capture, apply});
})(window);
