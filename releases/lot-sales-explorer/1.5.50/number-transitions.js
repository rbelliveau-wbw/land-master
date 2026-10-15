/* Sliding push: presentation only. Values, requests, exports and focus update immediately. */
(function (global) {
  'use strict';
  const active = new WeakMap();
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const numeric = value => /^-?\d[\d,]*(?:\.\d+)?$/.test(value);
  const key = (...parts) => JSON.stringify(parts);
  function token(text, value, identity) {
    return '<span class="number-push" data-number-key="' + escape(identity) + '" data-number-value="' + value + '" data-number-text="' + text + '"><span class="number-push-value">' + text + '</span></span>';
  }
  function markup(value, identity) {
    const text = String(value ?? ''), match = text.match(/^(-?)(\$?)(\d[\d,]*(?:\.\d+)?)(%?)$/);
    if (!match) return escape(text);
    // Keep currency/percent units in place, including the existing -$ convention.
    const number = match[1] + match[3];
    return match[2] ? token(match[1], number, identity + '|sign') + '$' + token(match[3], number, identity) : token(number, number, identity) + match[4];
  }
  function capture(root) {
    return new Map(root ? [...root.querySelectorAll('[data-number-key]')].map(node => [node.dataset.numberKey, {value:node.dataset.numberValue, text:node.dataset.numberText}]) : []);
  }
  function apply(root, previous = new Map()) {
    if (!root) return;
    root.querySelectorAll('[data-number-key]').forEach(node => {
      const old = previous.get(node.dataset.numberKey), value = node.dataset.numberValue;
      clearTimeout(active.get(node));
      node.classList.remove('is-changing');
      node.style.minWidth = '';
      if (!old || old.value === value || old.text === node.dataset.numberText || !numeric(old.value) || !numeric(value) || global.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !node.isConnected) return;
      node.dataset.from = old.text;
      node.style.minWidth = Math.max(old.text.length, node.dataset.numberText.length) + 'ch';
      void node.offsetWidth;
      node.classList.add('is-changing');
      active.set(node, setTimeout(() => { node.classList.remove('is-changing'); node.style.minWidth = ''; active.delete(node); }, 420));
    });
  }
  global.InsightsNumbers = Object.freeze({key, markup, capture, apply});
})(window);
