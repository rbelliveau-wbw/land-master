/* Curve editors keep their native select as the sole value and save-event owner. */
(function (global) {
  'use strict';
  var selector = 'select[data-cf][data-cid]:not([multiple])';
  var bindings = new Map(), active = null, popup = null, search = null, list = null;
  var visibleOptions = [], activeIndex = -1, sequence = 0, observer = null, queued = false;
  var chevron = '<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m5 7.5 5 5 5-5"/></svg>';
  var check = '<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m4.5 10 3.5 3.5 7.5-7.5"/></svg>';

  function fieldLabel(select) {
    var own = select.getAttribute('aria-label');
    if (own) return own;
    var cell = select.closest('td'), table = select.closest('table');
    var heading = cell && table && table.querySelectorAll('thead th')[cell.cellIndex];
    return heading && heading.textContent.trim() || select.getAttribute('data-cf').replace(/_/g, ' ');
  }
  function optionLabel(option) { return option.textContent.trim() || (option.value ? option.value : 'None'); }
  function selectedOption(select) { return select.options[select.selectedIndex] || null; }
  function disabled(option) { return option.disabled || !!(option.parentElement && option.parentElement.tagName === 'OPTGROUP' && option.parentElement.disabled); }
  function refresh(binding) {
    var select = binding.select, button = binding.button, option = selectedOption(select);
    var valueLabel = option ? optionLabel(option) : 'Select…', label = fieldLabel(select);
    button.querySelector('.settings-picker-label').textContent = valueLabel;
    button.title = option && option.value ? valueLabel : label;
    button.setAttribute('aria-label', label + ': ' + valueLabel);
    button.disabled = select.disabled;
    button.classList.toggle('is-empty', !option || !option.value);
    ['saving', 'saved-ok', 'save-error'].forEach(function (state) { button.classList.toggle(state, select.classList.contains(state)); });
    if (active === binding && (select.disabled || !button.getClientRects().length)) close(false);
  }
  function cleanup() {
    bindings.forEach(function (binding, select) {
      if (select.isConnected && binding.wrapper.isConnected && binding.wrapper.contains(select) && binding.wrapper.contains(binding.button)) return;
      if (active === binding) close(false);
      select.removeEventListener('change', binding.onChange);
      if (select.isConnected && binding.wrapper.contains(select)) binding.wrapper.before(select);
      binding.wrapper.remove();
      bindings.delete(select);
    });
  }
  function position() {
    if (!active || !popup) return;
    var box = active.button.getBoundingClientRect(), margin = 12, gap = 6;
    var below = Math.max(0, global.innerHeight - box.bottom - margin - gap), above = Math.max(0, box.top - margin - gap);
    var flip = below < 240 && above > below;
    var room = Math.max(0, flip ? above : below), width = Math.min(Math.max(box.width, 280), Math.max(0, global.innerWidth - margin * 2));
    popup.style.width = width + 'px';
    popup.style.maxHeight = Math.min(340, room) + 'px';
    popup.style.left = Math.max(margin, Math.min(box.left, global.innerWidth - width - margin)) + 'px';
    popup.style.top = flip ? 'auto' : box.bottom + gap + 'px';
    popup.style.bottom = flip ? global.innerHeight - box.top + gap + 'px' : 'auto';
    popup.dataset.placement = flip ? 'above' : 'below';
  }
  function setActive(index, scroll) {
    activeIndex = index;
    var rows = list ? Array.from(list.querySelectorAll('[role="option"]')) : [];
    rows.forEach(function (row, i) { row.classList.toggle('is-active', i === index); });
    if (rows[index]) {
      search.setAttribute('aria-activedescendant', rows[index].id);
      if (scroll) rows[index].scrollIntoView({block: 'nearest'});
    } else if (search) search.removeAttribute('aria-activedescendant');
  }
  function renderOptions() {
    if (!active || !list) return;
    var query = search.value.trim().toLocaleLowerCase(), select = active.select;
    list.replaceChildren();
    visibleOptions = Array.from(select.options).filter(function (option) { return optionLabel(option).toLocaleLowerCase().indexOf(query) !== -1; });
    if (select.classList.contains('searchable-select')) visibleOptions.sort(function (a, b) {
      if (!a.value || !b.value) return a.value ? 1 : b.value ? -1 : 0;
      return optionLabel(a).localeCompare(optionLabel(b), undefined, {sensitivity: 'base', numeric: true});
    });
    visibleOptions.forEach(function (option, index) {
      var row = document.createElement('button'), text = document.createElement('span'), mark = document.createElement('span');
      row.type = 'button'; row.className = 'settings-picker-option'; row.tabIndex = -1;
      row.id = list.id + '-option-' + index; row.setAttribute('role', 'option'); row.setAttribute('aria-selected', String(option.selected));
      row.disabled = disabled(option); row.setAttribute('aria-disabled', String(row.disabled)); row.title = optionLabel(option);
      text.className = 'settings-picker-option-label'; text.textContent = optionLabel(option);
      mark.className = 'settings-picker-check'; mark.innerHTML = option.selected ? check : '';
      row.append(text, mark);
      row.addEventListener('pointerdown', function (event) { event.preventDefault(); });
      row.addEventListener('pointermove', function () { if (!row.disabled) setActive(index, false); });
      row.addEventListener('click', function () { choose(option); });
      list.append(row);
    });
    if (!visibleOptions.length) {
      var empty = document.createElement('div'); empty.className = 'settings-picker-empty'; empty.setAttribute('role', 'status'); empty.textContent = 'No matches'; list.append(empty);
    }
    var index = visibleOptions.findIndex(function (option) { return option.selected && !disabled(option); });
    if (index < 0) index = visibleOptions.findIndex(function (option) { return !disabled(option); });
    setActive(index, false);
  }
  function focusTrigger(binding) {
    if (binding.button.isConnected && !binding.button.disabled) { binding.button.focus(); return; }
    // Existing handlers may replace the row synchronously after a change.
    bindings.forEach(function (candidate, select) {
      if (select.isConnected && select.dataset.cf === binding.select.dataset.cf && select.dataset.cid === binding.select.dataset.cid && !candidate.button.disabled) candidate.button.focus();
    });
  }
  function close(restore) {
    var previous = active;
    if (previous) { previous.button.setAttribute('aria-expanded', 'false'); previous.button.removeAttribute('aria-controls'); }
    active = null;
    if (popup) popup.remove();
    popup = null; search = null; list = null; visibleOptions = []; activeIndex = -1;
    if (previous && restore !== false) focusTrigger(previous);
  }
  function choose(option) {
    if (!active || active.select.disabled || disabled(option)) return;
    var binding = active, select = binding.select, changed = select.value !== option.value;
    select.value = option.value;
    refresh(binding);
    close(false);
    if (changed) select.dispatchEvent(new Event('change', {bubbles: true}));
    enhance(document);
    focusTrigger(binding);
  }
  function move(direction) {
    if (!visibleOptions.length) return;
    var next = activeIndex;
    for (var count = 0; count < visibleOptions.length; count++) {
      next = (next + direction + visibleOptions.length) % visibleOptions.length;
      if (!disabled(visibleOptions[next])) { setActive(next, true); return; }
    }
  }
  function nextFocus(backwards) {
    var button = active.button;
    var focusable = Array.from(document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')).filter(function (node) {
      return !node.disabled && node.tabIndex >= 0 && node.getClientRects().length && !popup.contains(node);
    });
    var index = focusable.indexOf(button), target = focusable[index + (backwards ? -1 : 1)];
    close(false);
    if (target) target.focus(); else if (button.isConnected) button.focus();
  }
  function open(binding) {
    if (binding.select.disabled) return;
    if (active === binding) { close(true); return; }
    close(false); active = binding;
    var label = fieldLabel(binding.select), id = 'settings-picker-list-' + (++sequence);
    popup = document.createElement('div'); popup.className = 'settings-picker-popup'; popup.setAttribute('role', 'dialog'); popup.setAttribute('aria-label', 'Choose ' + label); popup.dataset.lmMotion = 'popover';
    search = document.createElement('input'); search.type = 'search'; search.className = 'settings-picker-search'; search.autocomplete = 'off'; search.spellcheck = false; search.placeholder = 'Search ' + label.toLowerCase() + '…';
    search.setAttribute('role', 'combobox'); search.setAttribute('aria-label', 'Search ' + label); search.setAttribute('aria-autocomplete', 'list'); search.setAttribute('aria-expanded', 'true'); search.setAttribute('aria-controls', id);
    list = document.createElement('div'); list.className = 'settings-picker-results'; list.id = id; list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', label);
    popup.append(search, list); document.body.append(popup);
    binding.button.setAttribute('aria-expanded', 'true'); binding.button.setAttribute('aria-controls', id);
    search.addEventListener('input', renderOptions);
    popup.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
      else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); move(event.key === 'ArrowDown' ? 1 : -1); }
      else if (event.key === 'Enter') { event.preventDefault(); if (visibleOptions[activeIndex]) choose(visibleOptions[activeIndex]); }
      else if (event.key === 'Tab') { event.preventDefault(); nextFocus(event.shiftKey); }
    });
    renderOptions(); position(); search.focus();
    var selected = list.querySelector('[aria-selected="true"]'); if (selected) selected.scrollIntoView({block: 'nearest'});
  }
  function enhance(root) {
    root = root || document; cleanup();
    var selects = root.matches && root.matches(selector) ? [root] : root.querySelectorAll ? Array.from(root.querySelectorAll(selector)) : [];
    selects.forEach(function (select) {
      if (bindings.has(select)) { refresh(bindings.get(select)); return; }
      if (!select.isConnected) return;
      var wrapper = document.createElement('span'), button = document.createElement('button');
      wrapper.className = 'settings-picker'; button.type = 'button'; button.className = 'settings-picker-trigger';
      button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-expanded', 'false'); button.innerHTML = '<span class="settings-picker-label"></span>' + chevron;
      select.before(wrapper); wrapper.append(select, button);
      select.hidden = true; select.setAttribute('aria-hidden', 'true'); select.tabIndex = -1;
      var binding = {select: select, wrapper: wrapper, button: button};
      binding.onChange = function () { refresh(binding); if (active === binding) renderOptions(); };
      bindings.set(select, binding); select.addEventListener('change', binding.onChange);
      button.addEventListener('click', function (event) { event.stopPropagation(); open(binding); });
      button.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); open(binding); }
      });
      refresh(binding);
    });
    startObserver();
  }
  function sync() {
    cleanup(); bindings.forEach(refresh);
    if (active) { renderOptions(); position(); }
  }
  function scheduleEnhance() {
    if (queued) return; queued = true;
    Promise.resolve().then(function () { queued = false; enhance(document); });
  }
  function startObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver(function (records) {
      var changed = false;
      records.forEach(function (record) {
        if (record.type === 'attributes') {
          var binding = bindings.get(record.target);
          if (binding) { refresh(binding); if (active === binding) renderOptions(); }
          return;
        }
        var owner = record.target.closest && record.target.closest(selector);
        if (owner && bindings.has(owner)) { refresh(bindings.get(owner)); if (active && active.select === owner) renderOptions(); }
        Array.from(record.addedNodes).concat(Array.from(record.removedNodes)).forEach(function (node) {
          if (node.nodeType === 1 && (node.matches(selector) || node.matches('.settings-picker') || node.querySelector(selector))) changed = true;
        });
      });
      if (changed) scheduleEnhance();
      if (active && (!active.select.isConnected || !active.button.getClientRects().length)) close(false);
    });
    observer.observe(document.body, {childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'selected', 'label', 'aria-label', 'class', 'hidden']});
    document.addEventListener('pointerdown', function (event) {
      if (active && !popup.contains(event.target) && !active.button.contains(event.target)) close(false);
    }, true);
    document.addEventListener('scroll', function (event) { if (active && !popup.contains(event.target)) close(false); }, true);
    document.addEventListener('focusin', function (event) { if (active && !popup.contains(event.target) && !active.button.contains(event.target)) close(false); });
    global.addEventListener('resize', function () { if (active) position(); });
  }
  global.LMSettingsPickers = {enhance: enhance, sync: sync, close: close};
})(window);
