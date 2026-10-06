# Pro Forma save request budget — 1.80.88

The supplied Save log starts with 23 requests already dispatched. Creator finishes
the write and generated-month checks around 12.4 seconds, then the widget pauses
at its rolling request allowance during Refreshing. Request queue time is distinct
from the roughly seven-second Creator engine update in that log.

Save previously updated each persisted pricing row even when a fresh complete
Creator read showed it already matched. Each redundant update also required an
exact-ID readback. The repair skips those matching writes and retains the fresh
rows only for the active Save workflow's Dashboard snapshot. Edited or newly
created rows keep the existing write and exact-ID verification path. It preserves
counted scope reads, deletion, parent and field checks, duplicate-send guards,
unknown outcome retention, and read-only rechecking. System request limits and
financial calculations are unchanged.

The whole-widget Dev/Prod fixture seeds two persisted rows with native formatted
prices and lookup objects, plus the user's 23 prior requests. Released 1.80.87
hits the 45-request rolling limit and pauses. The candidate completes Save and
Dashboard with 20 requests (43 including prior activity), without advancing time
or increasing the allowance. Other regressions cover edited cents, server-side
price drift, incomplete collection reads, exact IDs and retained drafts. This is
a controlled request-count result; no new live timing measurement is claimed.
Large or changed collections, concurrent activity and native throttling can
still add delay. A backend engine speedup would be a separate Creator change.

Changed source: widget.html, widget.config.json and manifests/widgets.json;
regression: scripts/test-proforma-save-speed.mjs; immutable release: 1.80.88.
Existing form/report: Lot_Mix_Row / All_Lot_Mix_Rows. Matched fields: Pro_Forma,
Lot_Count, Lot_Size_Ft and Price_LF. No function, field or Custom API contract
changes; no Creator deployment required. Development, Stage and Production promotions to 1.80.88 are authorized. Rollback after promotion: map Production back to 1.80.87.

## Separate profile update

After 1.80.87 was merged and deployed successfully, the user requested clearing
all field-level restrictions in Dev/Land Acq and CFO. Both Development profiles
were saved and reopened: all 110 Pro Forma fields are visible and no configurable
Read Only checkbox is enabled. Built-in system fields remain read-only in Creator.
Add Pro Forma was the only module carrying configured field permissions in either
profile. Module/report access was compared before and after and stayed unchanged.
This supersedes the earlier phase-flag read-only settings documented in 1.80.87.
The user reports publishing these native profile changes separately. Travis's
Production retest remains outstanding.
