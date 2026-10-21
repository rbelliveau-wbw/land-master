(function () {
  "use strict";

  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var MIN_YEAR = 1900;
  var MAX_YEAR = 9999;
  var chevron = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m15 18-6-6 6-6"/></svg>';
  var opened = null;
  var nextId = 0;

  function monthKey(year, month) {
    return year + "-" + String(month + 1).padStart(2, "0");
  }

  function validMonth(value) {
    var match = /^(\d{4})-(\d{2})$/.exec(String(value || ""));
    if (!match) return null;
    var year = Number(match[1]), month = Number(match[2]) - 1;
    return year >= MIN_YEAR && year <= MAX_YEAR && month >= 0 && month < 12 ? { year: year, month: month } : null;
  }

  function restoreAttribute(element, name, value) {
    if (value == null) element.removeAttribute(name);
    else element.setAttribute(name, value);
  }

  function close(restoreFocus) {
    if (!opened) return;
    var state = opened;
    opened = null;
    state.panel.remove();
    restoreAttribute(state.anchor, "aria-expanded", state.previousExpanded);
    restoreAttribute(state.anchor, "aria-controls", state.previousControls);
    restoreAttribute(state.anchor, "aria-haspopup", state.previousHasPopup);
    if (restoreFocus && state.anchor.isConnected && !state.anchor.disabled) state.anchor.focus();
  }

  function position() {
    var state = opened;
    if (!state) return;
    if (!state.anchor.isConnected) { close(false); return; }
    var rect = state.anchor.getBoundingClientRect();
    var width = Math.min(292, Math.max(0, window.innerWidth - 16));
    state.panel.style.width = width + "px";
    state.panel.style.maxHeight = Math.max(100, window.innerHeight - 16) + "px";
    var height = Math.min(state.panel.scrollHeight, window.innerHeight - 16);
    var below = window.innerHeight - rect.bottom - 8;
    var above = rect.top - 8;
    var top = below >= height + 6 || below >= above
      ? Math.min(rect.bottom + 6, window.innerHeight - height - 8)
      : Math.max(8, rect.top - height - 6);
    state.panel.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)) + "px";
    state.panel.style.top = Math.max(8, top) + "px";
  }

  function yearStart(year) {
    return MIN_YEAR + Math.floor((year - MIN_YEAR) / 12) * 12;
  }

  function draw(focusTarget) {
    var state = opened;
    if (!state) return;
    var years = state.mode === "years";
    var start = yearStart(state.year);
    var end = Math.min(MAX_YEAR, start + 11);
    var previousDisabled = years ? start <= MIN_YEAR : state.year <= MIN_YEAR;
    var nextDisabled = years ? end >= MAX_YEAR : state.year >= MAX_YEAR;
    var cells = "";

    if (years) {
      for (var year = start; year <= end; year++) {
        cells += '<button type="button" class="pfm-month-cell' + (year === state.year ? ' is-selected' : '') + '" data-pfm-year="' + year + '" aria-pressed="' + (year === state.year) + '">' + year + '</button>';
      }
    } else {
      for (var month = 0; month < 12; month++) {
        var selected = state.selected === monthKey(state.year, month);
        cells += '<button type="button" class="pfm-month-cell' + (selected ? ' is-selected' : '') + '" data-pfm-month="' + month + '" aria-label="Choose ' + MONTHS[month] + ' ' + state.year + '" aria-pressed="' + selected + '">' + MONTHS[month].slice(0, 3) + '</button>';
      }
    }

    state.panel.innerHTML = '<div class="pfm-month-head">'
      + '<button type="button" class="pfm-month-nav" data-pfm-step="-1" aria-label="Previous ' + (years ? '12 years' : 'year') + '"' + (previousDisabled ? ' disabled' : '') + '>' + chevron + '</button>'
      + '<button type="button" class="pfm-month-year" data-pfm-mode aria-label="' + (years ? 'Show months' : 'Choose year') + '">' + (years ? start + ' – ' + end : state.year) + '</button>'
      + '<button type="button" class="pfm-month-nav pfm-month-nav-next" data-pfm-step="1" aria-label="Next ' + (years ? '12 years' : 'year') + '"' + (nextDisabled ? ' disabled' : '') + '>' + chevron + '</button>'
      + '</div><div class="pfm-month-grid" aria-label="' + (years ? 'Choose year' : 'Choose month') + '">' + cells + '</div>'
      + '<div class="pfm-month-actions"><button type="button" data-pfm-today>This month</button><button type="button" class="pfm-month-done" data-pfm-close>Close</button></div>';

    position();
    if (focusTarget === "previous" || focusTarget === "next") {
      state.panel.querySelector('[data-pfm-step="' + (focusTarget === "previous" ? -1 : 1) + '"]')?.focus();
    } else if (focusTarget === "mode") {
      state.panel.querySelector("[data-pfm-mode]")?.focus();
    } else if (focusTarget === "grid") {
      var focusValue = years ? state.year : (validMonth(state.selected)?.month ?? new Date().getMonth());
      (state.panel.querySelector(years ? '[data-pfm-year="' + focusValue + '"]' : '[data-pfm-month="' + focusValue + '"]') || state.panel.querySelector(".pfm-month-cell"))?.focus();
    }
  }

  function choose(year, month) {
    var state = opened;
    if (!state) return;
    var onSelect = state.onSelect;
    var value = monthKey(year, month);
    close(true);
    onSelect(value);
  }

  function onPanelClick(event) {
    var state = opened;
    if (!state) return;
    var button = event.target.closest("button");
    if (!button || !state.panel.contains(button) || button.disabled) return;
    if (button.hasAttribute("data-pfm-close")) { close(true); return; }
    if (button.hasAttribute("data-pfm-today")) {
      var today = new Date();
      choose(today.getFullYear(), today.getMonth());
      return;
    }
    if (button.hasAttribute("data-pfm-step")) {
      var step = Number(button.getAttribute("data-pfm-step"));
      state.year = Math.max(MIN_YEAR, Math.min(MAX_YEAR, state.year + step * (state.mode === "years" ? 12 : 1)));
      draw(step < 0 ? "previous" : "next");
      return;
    }
    if (button.hasAttribute("data-pfm-mode")) {
      state.mode = state.mode === "years" ? "months" : "years";
      draw("grid");
      return;
    }
    if (button.hasAttribute("data-pfm-year")) {
      state.year = Number(button.getAttribute("data-pfm-year"));
      state.mode = "months";
      draw("grid");
      return;
    }
    if (button.hasAttribute("data-pfm-month")) choose(state.year, Number(button.getAttribute("data-pfm-month")));
  }

  function onPanelKeydown(event) {
    var state = opened;
    if (!state) return;
    var buttons = Array.from(state.panel.querySelectorAll(".pfm-month-cell"));
    var index = buttons.indexOf(document.activeElement);
    if (index < 0) return;
    var next = index;
    if (event.key === "ArrowLeft") next = index - 1;
    else if (event.key === "ArrowRight") next = index + 1;
    else if (event.key === "ArrowUp") next = index - 3;
    else if (event.key === "ArrowDown") next = index + 3;
    else if (event.key === "Home") next = Math.floor(index / 3) * 3;
    else if (event.key === "End") next = Math.min(buttons.length - 1, Math.floor(index / 3) * 3 + 2);
    else return;
    event.preventDefault();
    buttons[Math.max(0, Math.min(buttons.length - 1, next))]?.focus();
  }

  function open(anchorButton, currentYYYYMM, onSelect) {
    if (!anchorButton || !anchorButton.isConnected || anchorButton.disabled || typeof onSelect !== "function") return false;
    if (opened?.anchor === anchorButton) { close(true); return false; }
    close(false);
    var today = new Date();
    var selected = validMonth(currentYYYYMM);
    var label = anchorButton.getAttribute("aria-label") || anchorButton.textContent.trim() || "Date";
    var panel = document.createElement("div");
    panel.className = "pfm-month-popover";
    panel.id = "pfm-month-popup-" + (++nextId);
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", label + " month picker");
    document.body.append(panel);
    opened = {
      anchor: anchorButton, panel: panel, onSelect: onSelect,
      selected: selected ? monthKey(selected.year, selected.month) : "",
      year: selected ? selected.year : today.getFullYear(),
      mode: "months",
      previousExpanded: anchorButton.getAttribute("aria-expanded"),
      previousControls: anchorButton.getAttribute("aria-controls"),
      previousHasPopup: anchorButton.getAttribute("aria-haspopup")
    };
    anchorButton.setAttribute("aria-haspopup", "dialog");
    anchorButton.setAttribute("aria-expanded", "true");
    anchorButton.setAttribute("aria-controls", panel.id);
    panel.addEventListener("click", onPanelClick);
    panel.addEventListener("keydown", onPanelKeydown);
    draw("grid");
    return true;
  }

  document.addEventListener("pointerdown", function (event) {
    if (opened && !opened.panel.contains(event.target) && !opened.anchor.contains(event.target)) close(false);
  });
  document.addEventListener("keydown", function (event) {
    if (opened && event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    }
  }, true);
  document.addEventListener("focusin", function (event) {
    if (opened && !opened.panel.contains(event.target) && event.target !== opened.anchor) close(false);
  });
  document.addEventListener("scroll", position, true);
  window.addEventListener("resize", position);

  window.PFMonthPicker = Object.freeze({ open: open, close: close });
})();
