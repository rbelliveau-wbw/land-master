(function () {
  'use strict';
  var active = null, anchor, menu, search, list, footer, sequence = 0;
  var chevron = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7 5 5 5-5"/></svg>';
  function label(select) {
    var value = select.getAttribute('aria-label') || (select.closest('.fg') && select.closest('.fg').querySelector('.fl').textContent.trim()) || select.getAttribute('data-sub-field') || 'Values';
    return value.replace(/^(?:search and edit|edit|search)\s+/i, '').replace(/\s*\*$/, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
  }
  function selected(select) { return Array.from(select.selectedOptions).filter(function (o) { return o.value; }); }
  function refresh(select) {
    var button = select._pickerButton;
    if (!button) return;
    var values = selected(select);
    button.querySelector('.lm-picker-label').textContent = values.length ? values.slice(0, 2).map(function (o) { return o.textContent; }).join(', ') + (values.length > 2 ? ' +'+(values.length-2) : '') : 'Select…';
    button.disabled = select.disabled;
    button.setAttribute('aria-label', label(select) + ': ' + (values.length ? values.map(function (o) { return o.textContent; }).join(', ') : 'Select'));
    button.classList.toggle('is-empty', !values.length);
    ['saving', 'saved-ok', 'save-error'].forEach(function (state) { button.classList.toggle(state, select.classList.contains(state)); });
  }
  function close(focus) {
    if (!active) return;
    var button = active._pickerButton;
    button.setAttribute('aria-expanded', 'false');
    active = null; menu.hidden = true;
    if (focus && button.isConnected) button.focus();
  }
  function change() {
    var select = active;
    select.dispatchEvent(new Event('input', {bubbles:true}));
    select.dispatchEvent(new Event('change', {bubbles:true}));
    refresh(select);
  }
  function render() {
    list.replaceChildren();
    var query = search.value.trim().toLowerCase();
    Array.from(active.options).forEach(function (option) {
      if (!option.value || option.disabled || option.textContent.toLowerCase().indexOf(query) < 0) return;
      var row = document.createElement('button');
      row.type = 'button'; row.className = 'lm-picker-option';
      row.setAttribute('role', 'option'); row.setAttribute('aria-selected', String(option.selected));
      var mark = document.createElement('span'); mark.className = 'lm-picker-mark'; mark.textContent = option.selected ? '✓' : '';
      var text = document.createElement('span'); text.textContent = option.textContent;
      row.append(mark, text);
      row.addEventListener('click', function () {
        if (!active) return;
        if (active.multiple) { option.selected = !option.selected; change(); render(); }
        else { active.value = option.value; change(); close(true); }
      });
      list.append(row);
    });
    if (!list.children.length) { var empty = document.createElement('div'); empty.className = 'lm-picker-empty'; empty.textContent = 'No matches'; list.append(empty); }
    footer.querySelector('.lm-picker-count').textContent = selected(active).length + ' selected';
  }
  function initMenu() {
    if (menu) return;
    menu = document.createElement('div'); menu.id = 'lmPickerMenu'; menu.className = 'lm-picker-menu'; menu.hidden = true;
    menu.innerHTML = '<div class="lm-picker-head"><input type="search" autocomplete="off" aria-label="Search choices"><button type="button" data-close aria-label="Close choices"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg></button></div><div class="lm-picker-list" role="listbox"></div><div class="lm-picker-footer"><span class="lm-picker-count"></span><button type="button" data-clear>Clear</button><button type="button" data-visible>Select visible</button><button type="button" data-done>Done</button></div>';
    document.body.append(menu); search = menu.querySelector('input'); list = menu.querySelector('.lm-picker-list'); footer = menu.querySelector('.lm-picker-footer');
    search.addEventListener('input', render);
    menu.querySelector('[data-close]').addEventListener('click', function () { close(true); });
    menu.querySelector('[data-done]').addEventListener('click', function () { close(true); });
    menu.querySelector('[data-clear]').addEventListener('click', function () {
      if (active.multiple) Array.from(active.options).forEach(function (o) { o.selected = false; }); else active.value = '';
      change(); if (active.multiple) render(); else close(true);
    });
    menu.querySelector('[data-visible]').addEventListener('click', function () {
      var query = search.value.trim().toLowerCase();
      Array.from(active.options).forEach(function (o) { if (o.value && !o.disabled && o.textContent.toLowerCase().indexOf(query) >= 0) o.selected = true; });
      change(); render();
    });
    menu.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault(); var rows = Array.from(list.querySelectorAll('button'));
        if (!rows.length) return; var current = rows.indexOf(document.activeElement), next = event.key === 'ArrowDown' ? Math.min(current + 1, rows.length - 1) : Math.max(current - 1, 0); rows[next].focus();
      }
      if (event.key === 'Tab') {
        var focusable = Array.from(menu.querySelectorAll('input,button')).filter(function (el) { return !el.hidden && !el.disabled; });
        var first = focusable[0], last = focusable[focusable.length-1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    document.addEventListener('mousedown', function (event) { if (active && !menu.contains(event.target) && !active._pickerButton.contains(event.target)) close(false); });
    document.addEventListener('keydown', function (event) { if (active && event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(true); } }, true);
    window.addEventListener('resize', function () { close(false); });
    document.addEventListener('scroll', function (event) {
      if (!active || menu.contains(event.target)) return;
      var rect = active._pickerButton.getBoundingClientRect();
      if (Math.abs(rect.left-anchor.left)>1 || Math.abs(rect.top-anchor.top)>1) close(false);
    }, true);
  }
  function open(select) {
    if (select.disabled) return;
    initMenu(); if (active === select) return close(true); close(false); active = select;
    search.value = ''; search.placeholder = 'Search ' + label(select) + '…';
    list.setAttribute('aria-label', label(select)); list.setAttribute('aria-multiselectable', String(select.multiple));
    footer.querySelector('[data-visible]').hidden = !select.multiple;
    footer.querySelector('[data-done]').hidden = !select.multiple;
    footer.querySelector('.lm-picker-count').hidden = !select.multiple;
    footer.querySelector('[data-clear]').hidden = !select.multiple && !Array.from(select.options).some(function (o) { return !o.value; });
    render(); menu.hidden = false;
    var rect = select._pickerButton.getBoundingClientRect(), width = Math.min(Math.max(rect.width, 300), window.innerWidth-24);
    anchor = {left:rect.left, top:rect.top};
    menu.style.width = width+'px'; menu.style.left = Math.max(12, Math.min(rect.left, window.innerWidth-width-12))+'px';
    menu.style.maxHeight = Math.max(160, window.innerHeight-24)+'px';
    var height = Math.min(menu.offsetHeight, window.innerHeight-24);
    menu.style.top = Math.max(12, rect.bottom+height+6 < window.innerHeight-12 ? rect.bottom+6 : Math.min(rect.top-height-6, window.innerHeight-height-12))+'px';
    select._pickerButton.setAttribute('aria-expanded', 'true'); search.focus();
  }
  function enhance(root) {
    if (active && !active.isConnected) close(false);
    var selects = root.matches && root.matches('select') ? [root] : root.querySelectorAll('select');
    Array.from(selects).forEach(function (select) {
      if (select._pickerButton) { refresh(select); return; }
      var button = document.createElement('button'); button.type = 'button'; button.className = 'lm-picker-trigger';
      button.id = 'lmPickerTrigger'+(++sequence); button.setAttribute('aria-haspopup', 'listbox'); button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-controls', 'lmPickerMenu');
      button.innerHTML = '<span class="lm-picker-label"></span>'+chevron;
      select.hidden = true; select.setAttribute('aria-hidden', 'true'); select.tabIndex = -1;
      select._pickerButton = button; select.after(button); refresh(select);
      button.addEventListener('click', function (event) { event.stopPropagation(); open(select); });
      button.addEventListener('keydown', function (event) { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); open(select); } });
      select.addEventListener('change', function () { refresh(select); });
    });
  }
  function start() {
    enhance(document);
    new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === 'attributes' && mutation.target.matches('select')) refresh(mutation.target);
        if (mutation.type === 'childList') {
          var owner = mutation.target.closest && mutation.target.closest('select');
          if (owner) refresh(owner);
          mutation.addedNodes.forEach(function (node) { if (node.nodeType === 1 && !node.closest('.lm-picker-menu')) enhance(node); });
        }
      });
      if (active && !active.isConnected) close(false);
    }).observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['disabled','class']});
  }
  window.LMPickers = {enhance:enhance, close:close, refresh:refresh};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
