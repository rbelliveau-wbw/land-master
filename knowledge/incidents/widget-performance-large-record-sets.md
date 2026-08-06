
# Widget Performance with Large Record Sets

## Problem

The Land Master UI became sluggish with more than 2,000 loaded properties. Editing a line and clearing filters took several seconds.

## Prevention

Use maps for lookups, cache normalized search text, debounce filter changes, avoid full-list DOM replacement, paginate or virtualize only where appropriate, and batch Creator calls. Measure before and after changes.
