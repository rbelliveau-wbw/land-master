# Additive lean access endpoint

Local candidate prepared on 2026-10-02. This document does not confirm a live
Creator Save, Custom API registration, environment publish, or widget promotion.

`getUserAccessLean(string user)` returns the existing `getUserAccess` permission
flags, `found`, `hasRow`, `myId`, Assigned to Me preferences, and the complete
`users` roster as `{id, label, email}`. It does not query `Add_Pro_Forma` or return
`proformaOwners`. Record IDs stay strings. Missing access rows retain the existing
false flags and empty `myId`; the roster is still returned as before. Empty/null
user preserves the existing `zoho.loginuser` fallback. The first matching
`User_Access.User` row determines the flags, matching the legacy endpoint.

`getUserAccessLeanDev(string user)` mirrors the current Development-only alias:
`rbelliveau` and `rbelliveau@wbdevelopment.com` resolve to `wbdevelopment`, then
call `getUserAccessLean`. Production calls the lean function directly and does
not apply that alias.

The existing `getUserAccess`, `getUserAccessDev`, and all existing callers are
unchanged by this candidate. Pro Forma continues requiring its authoritative
ownership map. Budget needs flags, `myId`, and the roster for ownership, approval
recipient matching, owner pickers, and comments; it does not consume the PF map.
Contracts also needs the roster. Insights currently needs only its two dashboard
flags and access-row status. Land Master has no caller of this access API.

## Proposed Custom APIs

These names are new proposals, not evidence of existing registrations.

| Environment | Link name | Function | Request |
| --- | --- | --- | --- |
| Development | `Get_User_Access_Lean_DEV` | `getUserAccessLeanDev` | POST JSON Key and Value, `user:string` |
| Production | `Get_User_Access_Lean` | `getUserAccessLean` | GET, `user:string` |

Before creating them, inspect the current full access API in each environment and
preserve its OAuth2 authentication, user scope, request/response options, and
environment binding. The documented current access APIs use All Users scope;
verify live rather than assuming the snapshot is current. Do not fall back to a
Production endpoint from Development or Stage. A Stage counterpart must be
explicitly created and verified before it is used. These functions provide UI
permission data; do not treat them as a substitute for authorization on write
functions or signed-in report reads.

Both functions return a JSON string. The expected existing Standard envelope is
`{code:3000,result:<JSON string>}`; live validation must confirm the actual SDK
envelope. Shared response fields must equal the full endpoint for the same actor,
with only `proformaOwners` omitted. Never log the full roster, ownership map, or
raw response for performance comparisons; report durations, byte counts, shared
key equality, and collection counts.

## Validation and promotion

Run `node scripts/test-creator-lean-access.mjs`. The test executes all four saved
function bodies with the existing Deluge translation adapter and explicit
fixtures. It checks every individual grant, missing/null/duplicate identities,
string IDs, empty and populated rosters, the exact Development alias, immutable
input records, and omission of the PF query even with a large PF inventory. This
adapter is not a Creator compiler.

Before saving the candidates in Development, compare the current live full access
function with the mirrored source so newer permission fields are not omitted.
Save/reopen both new functions to verify Creator compilation and persistence.
Through the signed-in Development SDK, compare full and lean shared response
values for the same actor, including owned-budget and read-only cases when those
identities are available. Confirm that the lean response has no owner-map key.

Publish only the new functions through the required Creator environments before
registering/using the matching Production endpoint. Compare both APIs through
the real signed-in Production SDK before switching the Budget widget. Widget
migration remains a separate release with its own validation and immutable
rollback release; this candidate changes no widget config, manifest, release,
environment mapping, or data record.

Regression scenarios for that migration: Assigned to Me, owner labels and
ownership checks, owner picker, comments, approval-recipient email resolution,
empty access/no-row state, and portal permission overrides. Capture API duration,
response bytes, and first usable render before/after without private payloads.

Rollback: keep the legacy function/API definitions intact and restore Budget's
prior Custom API mapping/release if migrated. The added functions and APIs can
remain unused; there is no data migration to reverse.
