# Widget save follow-up, 2026-10-05

Pro Forma 1.80.77 retains the deployed 1.80.76 save speed, spinner and automatic
success dismissal fixes. Enabled Additional Costs `Per_Unit` inputs now have a
blue border and soft glow; disabled and computed controls keep their existing
states. No save payload, calculation, Creator function or API changes.

Settings 1.3.8 preserves native rejection descriptions and nested alert messages,
including JSON `responseText`, instead of reducing them to a generic write
failure. Critical reports include the captured record ID and field names, not
field values. Retained drafts, exact readback and no-replay behavior are unchanged.
The reported 4590 occurred before readback; its underlying rejected field or
workflow is not established. This is a diagnostic repair, not a claimed cure for
that native rejection. Date/time formats, scheduled workflows and settings values
are unchanged. A new report from this release is needed if Creator rejects again.

## Other widgets

The Pro Forma regression involved its private Save_PF child verification and
missing All_Lot_Mix_Rows metadata. No other widget uses that controller or Lot Mix
save path. Budget native writes validate acknowledgements separately; Contracts
has report field kinds for lookup/number/date readback; Tax has its own field
metadata; Settings has explicit field definitions; Manage Lots verifies its
takedown parent/claims rather than comparing the Pro Forma child payload.
Gantt and Project use their own captured operations, and Insights is read-only.
There is no confirmed second caller of the Pro Forma failing verification path.

The shared read optimizations and pacing are opt-in. `countAtEnd` and request
pacing are enabled by Pro Forma only; the other widgets retain their default
count-first reads and existing published releases. There is no new shared data
change in this follow-up. Existing cross-widget offline regression gates cover
native envelope failures and default read timing. No live save tests are run,
per the user's instruction; the user performs DEV/PROD acceptance testing.

Both frontend releases are promoted on main to Development and Production.
No Creator promotion is included. Rollback mappings: Pro Forma 1.80.76 and
Settings 1.3.7. Neither rollback changes persisted data.
