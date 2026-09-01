# Widget UI Style

## Segmented controls

Primary widget view switchers use a restrained modern pill treatment across every hosted widget:

- a softly layered neutral track with a light inset highlight and low elevation;
- a navy gradient active segment with clear white text;
- compact, tabular count badges where counts are present;
- subtle hover lift and shadow, returning to the track on press; and
- a visible keyboard focus outline.

The treatment must remain compact enough for widget top bars and preserve the existing navigation labels, click behavior, responsive layout, and widget-specific color variables. Avoid decorative animation, oversized controls, or effects that compete with the data workspace.

Switchers that live *inside* a card rather than in the chrome use the quieter
in-card variant instead: a flat `#eef2f8` track, no gradient, and a solid
`--primary` active segment. Contract Management's `.mode-seg` is the reference;
Pro Forma's `.seg` and `.pills` follow it.

## Contract Management is the reference implementation

Contract Management carries the canonical treatment for the shared surfaces below.
When another widget grows one of these, copy the values rather than inventing a
variant. All widgets already share the same `:root` token block, so a copied rule
should not need new colors.

| Surface | Contract Management reference |
| --- | --- |
| List toolbar | `.filterrow` — flat row, `h1` 18px/800 navy, `.scope-count` pill |
| Search field | `.searchbox` + `.search-icon` — white, `#8fb2f3` border, blue icon chip |
| Dropdown / picker | `.combo` + the shared `#comboPop` popup — **never** a native `<select>` (see below) |
| List card | `.tablecard` > `.tscroll` > `.wtable`, sticky `th` |
| Group header row | `tr.tgroup` + `.tgroup-name` + `.tgroup-n` |
| Row controls | `.rowctl button` (30px chip), menu `.kmenu` |
| Row buttons | `.dbtn`, primary `.dbtn.hero` |
| Section header | `.loi-review-section h3` — `#f8faff` band, 10.5px/900 uppercase navy |
| Form field | label `.fl`, control `.input` |
| Data grid | `.egrid` — transparent `.eg-in` inputs, hover tint, focus ring |
| Modal | `.modal` — 16px radius, navy gradient `.modal-head`, `#f8fafc` `.modal-foot` |
| Sidebar header | `.dark-head` + `.dark-kicker` + `.dark-title` |
| Status chip | `.tag` |
| Audit log button | `.auditbtn` + `.audit-n` badge |

Pro Forma Manager 1.51.0 moved its main menu and editing screens onto this list.

## Never use native `<select>` or `<datalist>`

**Rule: no native dropdown popups anywhere in a Land Master widget.** This covers
`<select>`, `<datalist>`, and anything else that opens an OS-drawn list.

Why — this was called out on live screens more than once:

- the popup is an unstyled OS overlay: wrong font, wrong colors, wrong metrics,
  and it ignores every token in `:root`;
- it clips and mispositions inside `overflow` containers, which is most of our
  surfaces (scrolling tables, drill panels, modals);
- it shows raw values with no context — no color chips, no counts, no secondary
  line — so a status or a counterparty reads as a bare string;
- next to the styled modules around it, it simply reads as broken.

**Use instead:** the shared floating combo. A plain `<input>` (or a button-shaped
trigger) backed by ONE `position:fixed` popup appended to `document.body`:

- filter as the user types, but show the full list on open — only filter once
  they actually edit;
- ArrowUp / ArrowDown / Enter / Escape keyboard navigation, with the active
  option scrolled into view;
- selection dispatches synthetic `input` + `change` events so existing commit
  handlers keep working unchanged;
- commit snaps the text to the vocabulary or clears it — never leave a
  free-typed value that the back end will reject;
- the popup is `position:fixed` and appended to `body` precisely so an
  `overflow:hidden` ancestor cannot clip it. Re-position or close it on scroll,
  and close it before any re-render that would orphan the input it is bound to.

Reference implementations: `loiCombo` / `#loiComboPop` in Pro Forma Manager
(1.66.0) and the `msel` popover in Contract Management, which also covers the
multi-select and single-select ("one of") cases.

`scripts/validate-widget-javascript.mjs` hard-fails on `<datalist id=`. Keep that
guard, and extend it rather than working around it.
