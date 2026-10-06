# Parent Contract assignment — 1.61.22

Every Contract type can optionally use the existing single `Contract.Parent_Contract`
lookup. A contract with children is a Master by relationship; its actual
`Contract_Type` is retained. Masters cannot be assigned a parent, and contracts
that already have a parent cannot be selected as parents. Self-links are blocked.
Child counts include archived and otherwise filtered contracts. Removing the last
child removes the relationship Master badge. No existing records are migrated.

The user explicitly retained Lot Amendment matching: only a top-level Lot Master
with the same Project and Builder is eligible. Existing automatic matching and
staged entry are preserved. Other types, including Lot Masters without children,
can select any top-level Contract. Editing an existing relationship changes only Parent_Contract; it does not alter
lots, terms, pricing, ownership, approval routing or status.

The three-dot menu opens a compact relationship editor; the left-hand expanded
panel and detail header also expose Parent Contract. The new-contract flow adds
an optional searchable picker for non-Amendment types. Lot Amendment context
retains its matched Parent Master display. List, board, and detail identity show
a counted blue Master badge. Masters and users without existing edit permission
see read-only relationship details. Completed contracts remain locked.

The editor fetches all Contract rows before allowing a choice and again before
saving. Missing Parent_Contract report columns block assignment. The final check
uses current type, Builder, subdivisions, Project, status, children, and prior
parent. Writes use the existing SDK2 exact readback/no-replay controller and
persist only Parent_Contract. An uncertain response offers Check status and
retains the captured attempt; it never resubmits the write.

## Creator deployment

The native same-builder Lot-only lookup filter is removed; Creator's filter UI
does not offer the self-referencing Parent_Contract field. It stays optional and
displayed by Contract_Name. The widget filters choices to top-level contracts;
Native Contract validation prevents self-links, selecting a child as parent,
and assigning a Master. The stricter Lot Amendment rule remains conditional.
Show_Type_Specific_Fields no longer clears non-Amendment parents;
Hide_Lockdown_Fields_Cont and Set_Subdivision_Fields_Co expose the optional lookup
for all types and disable it when children exist. Complete_Lot_Contract accepts
generic top-level parents for Lot Masters and retains Amendment matching and
all existing Lot transfer protections. No new forms, fields, functions, or APIs.

Publish only the Parent_Contract field, those four Contract workflows and
Complete_Lot_Contract from Development through Stage to Production. Other pending
Creator components are outside this change. Generated schema remains the older
export; these existing native field/workflow identifiers were verified live.

## Regression and rollback

`scripts/test-contract-parent-assignment.mjs` exercises actual application
renderers and SDK2 calls: all types, new payloads, ordinary type switching,
Master counts/locking, self/child-parent rejection, fresh parent/child/status
races, report-column failure, persisted set/clear, acknowledgement without
persistence, and read-only reconciliation. Existing Lot type/Project and full
repository validation cover the retained flows. Browser preview checks the
left panel, picker, new modal, Master state, keyboard controls, and narrow layout.

Rollback the widget by restoring production Contract Management 1.61.19 in
deploy/environments.json. Retain the widened lookup and validation when generic
parent links have been used; restoring the old Lot-only validation would make
those records invalid in native forms. Do not clear existing links as a rollback.

Native deployment: all six scoped components compiled and were published as
Creator 9.54 through Stage to Production on 2026-10-06.

## Earlier Parent flow — 1.61.23

New non-Amendment contracts show compact `Parent (Optional)` immediately after
Type, before Territory and Counterparty. Selecting Parent copies its existing
Territory and exact Builder lookup ID and displays both read-only. Clearing the
parent restores the pre-selection draft values. Manual names survive; only an
automatically suggested name is cleared when context changes. Status stays
read-only in the title row. Optional field captions retain a visible space
before `(Optional)`, including flex labels.

Lot Amendments retain matching by Project and Builder. New Lot Masters retain
their chosen Project; a Project inconsistent with the inherited Territory is
reported rather than silently changing Project or Territory. Existing Parent
assignment and Lots & Pricing editors do not inherit or rewrite other fields.
Fresh create preflight rejects changed parent Territory/Builder before any write.

Changed files: Contract widget HTML/config, manifests, Production mapping,
immutable 1.61.23 release, parent/lot regressions, module/style/README docs.
Existing Contract.Territory and Contract.Builder are populated during creation
with Parent_Contract. No functions, Custom APIs or native Creator deployment
change. Full validation/build and browser checks cover field order, compact
layout, inherited/cleared values, stale-parent rejection, Status placement,
optional spacing and retained Lot matching. Rollback widget mapping to 1.61.22;
keep Creator 9.54.
