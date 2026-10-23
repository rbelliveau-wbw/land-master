# External Property Transfers — October 22, 2026

The user requested the Land & Projects changes and explicitly authorized both
repository main/Production publication and Creator environment publication.

## Behavior

- Transfer Type adds **External**.
- Status choices are **Pending**, **Completed**, **CAD Verified**, **Cancelled**.
  Pending is the default; Draft is removed. Existing Draft transfers must become
  Pending. The native Production report contained no transfers before this work,
  so no Production Draft records required migration.
- A Property is inactive when at least one linked transfer is **External**,
  **Full**, and **Completed** or **CAD Verified**. Partial, Pending, Cancelled and
  internal transfers do not qualify. This rule was explicitly confirmed by the
  user before implementation.
- Properties open with **Activity: Active** selected. The existing searchable
  filter offers Active and Inactive; selecting both or clearing Activity shows
  both. Other filters/search continue to compose with it. Transfer history and
  linked records remain accessible. Property rows/details display activity.
- **External** is a real Company record, reused by existing Company lookup
  controls. Its environment-specific ID is never hardcoded in the widget.

## Creator backend

`Property.External_Transfer_Inactive` is a native checkbox, initially false.
The widget displays it read-only and includes it in its existing full-field
property reads, preserving the four core collections and lazy transfer histories.
Creator omits fields outside the report layout even with `field_config: all`.
When the flag is absent, one additional inactive-only query of the same
`All_Property` report identifies the inactive IDs. Existing access, exact IDs,
complete native counts and cancellation guards apply; affected-parent refreshes
retain their ID criteria. The report layout and permissions are unchanged.

The new native `syncExternalTransferActivity(string propertyId)` function
recalculates the current property and any previously inactive properties. That
also clears obsolete flags after cancellation, deletion or correction of a
transfer's Property lookup. Native counts include all qualifying transfers, so
cancelling one transfer does not reactivate a property if another still qualifies.
Company1 and all ownership, acreage, financial and relationship fields remain
unchanged. The function has no external requests, new connection or Custom API.

The function runs on Property Transfer successful create/edit and successful
deletion through `Sync_External_Transfer_Ac` and `Sync_External_Transfer_De`.
The existing validation workflow remains responsible for company identities and
full/partial amounts. Transfer Type and Status choices/default change natively.

After an acknowledged widget transfer save, a fresh scoped read updates the
affected property identities atomically. Failure retains the successful transfer
and requests a property refresh; it never replays the write. Identity/generation
guards prevent late reads from replacing another session or reopening a newer
editor. No automatic editable-field comparisons are added.

## Verification and rollback

Fixtures execute the checked-in native activity body and criteria with native
lookup shapes and exact string IDs. Coverage includes qualifying statuses,
partial/pending/cancelled/internal exclusions, corrected/deleted transfers,
unchanged ownership, Active/Inactive/All filtering and incomplete scoped refresh.
Existing transfer validation, SDK2, create quarantine, lazy data, lookup, grouped
property field and filter regressions remain required, alongside full validation
and the Pages build. Native Development and Production evidence is recorded in
the schema ledger and the user's private change rundown.

Creator components must reach Production before the widget mapping is promoted.
Publish only the requested field/choices/function/workflows after reviewing the
Creator component list. Do not include unrelated permissions or backend edits.

Widget rollback: Land Master **8.16.13**. Retain Company/transfer history and the
new native field. Restoring the old form choices or workflows is a separate
deliberate Creator rollback; reverting a widget never deletes transfer records.

## Deployment checkpoint — October 23, 2026

Creator Production and Stage are **9.117**, published by the user. This includes
9.115's three earlier schedule fixes and the property-transfer components from
9.116. The Production widget mapping is promoted to **8.17.1**, matching the
verified Development release. Stable Creator widget URLs remain unchanged.

The agent's 9.116 Stage package contained only the inactive field, transfer
choices, function, two workflows and native section dependencies. Existing
Company field metadata was excluded from that package. The user subsequently
published the remaining Property metadata through 9.117.

The native Development report-layout experiment was fully restored to its
original source before the user publication. Release **8.17.1** uses the scoped
report-criteria fallback, so it does not require report layout changes or
additional transfer-report permissions to filter inactive properties.

Live 8.17.1 Development testing confirmed 9 active / 1 inactive property while
the full External transfer was CAD Verified. Cancelling through the widget
restored 10 active / 0 inactive without a page reload; the native checkbox was
false and Company remained unchanged. The clearly labeled test transfer remains
Cancelled. Production verification uses read-only form, filter and option checks.
