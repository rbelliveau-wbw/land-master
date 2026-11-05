/* Sliding push: presentation only. Values, requests, exports and focus update immediately. */
(function (global) {
  'use strict';
  const active = new WeakMap();
  const sample=node=>({value:node.dataset.numberValue,text:node.dataset.numberText,context:node.dataset.numberContext,color:getComputedStyle(node).color});
  const gate=global.NumberEditCommit?.create({key:node=>node.dataset.numberKey,selector:'[data-number-key]',read:sample,text:old=>old?.text,changing:'is-changing',
    holdVisual:(node,old)=>node.style.setProperty('--number-edit-color',old.color||'inherit'),
    releaseVisual:node=>node.style.removeProperty('--number-edit-color')});
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const numeric = value => /^-?\d[\d,]*(?:\.\d+)?$/.test(value);
  const key = (...parts) => JSON.stringify(parts);
  function parsed(text) {
    const match=text.match(/^(-?)(\$?)(\d[\d,]*(?:\.\d+)?)(%?)$/);
    if(match)return {value:match[1]+match[3]};
    // Preserve a scalar's identity when a calculation becomes unavailable or a
    // zero-count cell becomes blank. It still never animates unknown amounts.
    return /^(?:\s*|[—–-])$/.test(text)?{value:''}:null;
  }
  function markup(value, identity, context = '') {
    const text = String(value ?? ''), result=parsed(text);
    if (!result) return escape(text);
    // Each visual retains its own sign and units when the selected measure changes.
    return '<span class="number-push" data-number-key="' + escape(identity) + '" data-number-value="' + result.value + '" data-number-text="' + escape(text) + '" data-number-context="' + escape(context) + '"><span class="number-push-value">' + escape(text) + '</span></span>';
  }
  function capture(root) {
    return new Map(root ? [...root.querySelectorAll('[data-number-key]')].map(node => [node.dataset.numberKey,sample(node)]) : []);
  }
  function set(host, value, identity, context = '') {
    const text=String(value??''),result=parsed(text),node=host.firstElementChild;
    if (!result) { host.textContent=text; return; }
    if (!node || node.dataset.numberKey!==identity) { host.innerHTML=markup(text,identity,context); return; }
    node.dataset.numberValue=result.value;node.dataset.numberText=text;node.dataset.numberContext=context;
    if(node.firstElementChild.textContent!==text)node.firstElementChild.textContent=text;
  }
  function applyNode(node, old, reduced=global.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    const value=node.dataset.numberValue;
    if (!reduced && old?.text===node.dataset.numberText && old.context===node.dataset.numberContext && active.has(node)) return;
    clearTimeout(active.get(node));active.delete(node);
    node.classList.remove('is-changing');node.style.minWidth='';
    if (!old || (old.text===node.dataset.numberText && old.context===node.dataset.numberContext) || !numeric(old.value) || !numeric(value) || reduced || !node.isConnected) return;
    node.dataset.from=old.text;
    node.style.setProperty('--number-from-color',old.color||'inherit');
    node.classList.toggle('number-push-alternate');node.classList.add('is-changing');
    active.set(node,setTimeout(()=>{node.classList.remove('is-changing');node.style.minWidth='';active.delete(node);},420));
  }
  function apply(root, previous = new Map()) {
    if (!root) return;
    const jobs=[],reduced=global.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    root.querySelectorAll('[data-number-key]').forEach(node=>{
      const old=previous.get(node.dataset.numberKey);
      if (!gate?.hold(node,old,applyNode)) jobs.push({node,old});
    });
    jobs.forEach(({node,old})=>applyNode(node,old,reduced));
  }
  global.InsightsNumbers = Object.freeze({key, markup, capture, apply, set, reset:()=>gate?.reset()});
})(window);
