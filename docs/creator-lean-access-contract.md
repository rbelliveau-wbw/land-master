# Additive lean access endpoint

Implementation and coordinated live evidence updated on 2026-10-02. Both new
functions were saved in Creator and published through Development/Stage to
Production backend version 9.33. The Development Custom API was tested against
the full endpoint. The Production API was created, saved and verified enabled;
signed-in Production GET verification remains pending. Widget adoption and
frontend promotion are separate steps.

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

The existing `getUserAccess` and `getUserAccessDev` functions remain unchanged.
The additive endpoints do not switch existing callers. Pro Forma continues requiring its authoritative
ownership map. Budget needs flags, `myId`, and the roster for ownership, approval
recipient matching, owner pickers, and comments; it does not consume the PF map.
Contracts also needs the roster. Insights currently needs only its two dashboard
flags and access-row status. Land Master has no caller of this access API.

## Registered additive Custom APIs

| Environment | Link name | Bound function | Request | Verified state |
| --- | --- | --- | --- | --- |
| Development | `Get_User_Access_Lean_DEV` | Land Master Development, `Default.getUserAccessLeanDev` | POST, application/json Key and Value, `user:STRING` | Signed-in full/lean shared-key and denied-response parity passed. |
| Production | `Get_User_Access_Lean` | Land Master Production, `Default.getUserAccessLean` | GET, query key `user:STRING` | Enabled detail verified; signed-in runtime GET parity pending. |

The created endpoints preserve the full API's existing OAuth2 authentication,
All Users scope, Standard response and corresponding environment binding. No
credentials or access grants were created. Do not fall back to a
Production endpoint from Development or Stage. A Stage counterpart must be
explicitly created and verified before it is used. These functions provide UI
permission data; do not treat them as a substitute for authorization on write
functions or signed-in report reads.

Both functions return a JSON string. The Standard envelope is
`{code:3000,result:<JSON string>}`; real Production SDK validation remains pending.
For authenticated Production/Stage access calls, omit `query_params`,
`parameters` and `payload` entirely. The existing function's empty-argument
fallback uses authoritative `zoho.loginuser`. A native login email or its
local part cannot identify the Creator username: the actual Production session
username differed from both. Keep the runtime actor for identity/cache isolation
without rewriting it. Development POST sends its verified normalized username
JSON payload through the existing alias wrapper. Other SDK2 GET APIs with actual
arguments retain their encoded-string contract; this applies only to the
current-session permission endpoint.
Shared response fields must equal the full endpoint for the same actor,
with only `proformaOwners` omitted. Never log the full roster, ownership map, or
raw response for performance comparisons; report durations, byte counts, shared
key equality, and collection counts.

## Validation evidence and remaining adoption gate

The coordinated live Development comparison found 38 keys in the full response
and 37 in the lean response. Every retained key matched; only `proformaOwners`
was removed. Denied-response parity also passed. Serialized outputs for that
actor were 1711 and 1030 characters; this is neither transferred bytes nor a
measured latency improvement. No raw roster or ownership map is stored here.

Run `node scripts/test-creator-lean-access.mjs`. The test executes all four saved
function bodies with the existing Deluge translation adapter and explicit
fixtures. It checks every individual grant, missing/null/duplicate identities,
string IDs, empty and populated rosters, the exact Development alias, immutable
input records, and omission of the PF query even with a large PF inventory. This
adapter is not a Creator compiler.

The live full function was compared with the mirrored source before saving the
new functions. Creator save and subsequent publication verified persistence and
compilation. Repeat shared-value parity for additional owned-budget and read-only
identities when available; the existing signed-in actor comparison does not
establish every user's permission behavior.

Compare both APIs through the same real signed-in Production SDK session,
omitting the user argument from each, before switching the Budget widget. Widget
migration remains a separate release with its own validation and immutable
rollback release; this candidate changes no widget config, manifest, release,
environment mapping, or data record. Function-editor Execute comparisons ran
Development data; they cannot establish Production parity. Production runtime GET remains unverified
until this gate is completed.

Regression scenarios for that migration: Assigned to Me, owner labels and
ownership checks, owner picker, comments, approval-recipient email resolution,
empty access/no-row state, and portal permission overrides. Capture API duration,
response bytes, and first usable render before/after without private payloads.

Rollback: keep the legacy function/API definitions intact and restore Budget's
prior Custom API mapping/release if migrated. The added functions and APIs can
remain unused; there is no data migration to reverse.
