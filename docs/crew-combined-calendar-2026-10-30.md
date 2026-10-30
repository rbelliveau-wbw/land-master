# Combined Crews And Calendar — 1.7.0

Crews now combines Employees and Crews in equal desktop panes. The employee list
always groups by recorded recent foremen, with search, Active/Inactive/All and a
No Recent Foreman fallback. The former Roster / By Foreman switch is removed.
Member rows are 32px with aligned inline searchable staffing controls. Existing
crew creation, editing, status, saved staffing, seven-date foreman jobs and work
history remain available in the right pane.

An explicit foreman Crew selection applies to that foreman and every active
employee in the captured 14-date group, including members hidden by search.
Native IDs are strings and are deduplicated. The controller reads a complete
fresh permitted employee roster, preserves Territory and Labor Type, then reuses
the existing single-employee preparation/native SDK PATCH/acknowledgement path
sequentially. Already matching employees do not write. Inactive employees retain
their staffing; an inactive foreman stops the action. Selecting the foreman's
current crew can apply it to differing group members.

The multi-record progress dialog opens immediately and keeps per-employee results
until dismissed. Known errors stop remaining sends. Unknown replies retain the
exact actor/environment/request/destination intent across reloads, lock writes,
and offer read-only employee-status checks. Checking never resumes remaining
updates automatically; Continue Remaining is explicit. Saved destinations are
not resent. Lost access clears visible private progress and stops further sends.
There is no new native bulk API: the existing single-record contract already
enforces permissions, active status, crew existence and write validation.

Timeline defaults to Next 24 Months. Legacy implicit 12-month preferences migrate;
explicit current preferences remain. Short month labels occupy equal-width
columns of at least 48px beneath a grouped year band, including partial edge
months. Bars, gridlines and drag coordinates use one calendar mapping and its
inverse; exact source dates and durations are preserved through leap day. The
existing 12-month upcoming-phase eligibility and seven-date location rules stay
unchanged. Timeline and Edit Schedule retain their mounted data and native save
guards.

Affected native data: Employees.Crew through existing save-employee and
employee-status actions on Crew_Locations_Widget; the existing native employee
SDK report/PATCH paths, Territory and Labor_Type preservation are reused. No form,
field, function, API endpoint, schedule, permission or Creator promotion is added.

## Verification

- Focused tests cover deduplicated group destinations, fresh staffing preservation,
  inactive/unchanged rows, missing visibility, storage failure, read-only rights,
  known partial failures, wrong destination replies, actor changes, privacy
  clearing, reload recovery and no duplicate replay.
- Local browser: a foreman change updated three active people, including Drew
  hidden by an Alex search. The first reply was lost: the read-only check sent no
  additional write, and explicit continuation saved only the remaining two.
- Calendar tests round-trip every date across the 24-month interval, including
  leap day, partial edge months, grouped years and equal month positions.
- All 29 desktop checks pass at 1148 × 565: equal panes, no outer page overflow,
  readable search/codes, visible actions/upcoming work, keyboard navigation,
  fitted editors/pickers and centered close controls, with no native writes.
- The interactive mockup's foreman selection updates the whole sample group and
  its Timeline opens with 24 months; no console warnings/errors were recorded.
- Full repository validation and the 34-path Pages build passed for 1.7.0.
  Deployment monitoring and native Production smoke verification follow the
  push; local synthetic writes do not claim live employee reassignment.

Rollback: map Production crew-locations to 1.6.0. Retain Creator 9.134, employee
staffing, timecards/membership payloads, all assignments and mappings, schedules,
audit records and unrelated widget versions.
