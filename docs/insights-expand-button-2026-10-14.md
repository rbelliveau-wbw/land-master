# Insights 1.5.49: group button beside Hide Empty

Move Expand All / Collapse All out of the right-aligned Reset container and
place it immediately after Hide Empty. Its behavior and changing label remain
the same. The released widget retains Lot Count as the initial/Reset measure.

Changed files: Insights widget.html and widget config, widget manifest, style
guide, Development/Production mappings and immutable release 1.5.49.
Forms/fields, functions and Custom APIs: unchanged. Creator deployment: none.
Regression: toolbar order and desktop button spacing, group expand/collapse,
Lot Count default/Reset. Validation and build:pages passed. The desktop browser
check confirmed the button is aligned beside Hide Empty with an 8px gap and
retains both toggle actions.
Rollback: restore the production Insights mapping to 1.5.48.
