# Shared City Runtime Bindings

Installed and compiled in Creator **Development** for all ten fixed-choice City
consumers: all 20 native bindings were saved, and the seven scalar field settings
were enabled after their guards. Mandatory settings stayed unchanged. Definition
readback is being completed by the parent agent; Production promotion and live
verification remain pending. See [installation status](installation-progress.json)
and [Development evidence](evidence/development/installed-workflows.json).
The single authority is
`thisapp.variables.City`, read on every call by
[`globalCityPolicy`](../../functions/globalCityPolicy.dg). No copied City list is
maintained in these bindings; `City_Legacy` is not a source of new choices.

The native Production Contract failure was `3001: Invalid column value for City`
for Cameron Ranch's Pflugerville. Its source Subdivision and the shared list
permit that City; Contract's independent static choices did not. Land Master's
widget already reads the variables through `getLandMasterChoices`; the native
fixed-choice fields were not bound to that source.

## Consumers and Retention

| Existing Form | City Storage | Native Required | Saved Legacy Eligibility |
| --- | --- | --- | --- |
| Contract | Single Drop Down | No | Same exact saved ID, City, Project, Subdivision ID set, Type and Work Module |
| Lots | Single Drop Down | Yes | Same exact saved ID, City and Subdivision |
| Project | Single Drop Down | Yes | Same exact saved ID and City |
| Property | Single Drop Down | No | Same exact saved ID and City |
| Subdivision | Single Drop Down | Yes | Same exact saved ID, City and Project |
| Mass_Create_Lots | Single Drop Down | Yes | No saved-record legacy exemption; transient input |
| Forecast_Search | Single Drop Down | No | No saved-record legacy exemption; filter input |
| Lot_Search | Multi Select | No | No saved-record legacy exemption; filter input |
| System_Search | Multi Select | No | No saved-record legacy exemption; filter input |
| Tax_Rate_Template | Multi Select | Yes | Same exact saved ID and complete City set |

[`consumers.json`](consumers.json) records native field types, requirements,
catalog evidence and each source-scope rule. IDs remain native IDs and are
compared as strings without JavaScript number conversion. Set comparisons ignore
ordering and duplicate presentation. Contract's historical blank Work Module is
Legal, matching the existing native validation. A Type or meaningful module
change removes its legacy exemption.

Every requested value must be a current global City unless it qualifies as the
same record's unchanged saved legacy selection and source scope. Existing `N`
is not offered on new records. A removed global City can remain only under that
same retention rule. On Load includes only the globals and eligible saved legacy
selection; it never learns a new choice from draft/query input. Optional blanks
stay optional; required fields retain Creator's existing required-field checks.

Searches retain every existing global City filter selection, including multiple
choices, and gain newly added global choices. Their transient inputs do not gain
a persisted-record exception. This package does not change report criteria,
search execution, defaults, Cancel/reset actions, date filters or result logic.
Mass creation still executes only through its existing successful-submit flow.
Vendors.City is free-text postal/address data and is intentionally unchanged.

## Native Installation Order

Creator's documented creation controls are **Workflow → Form workflows → New
Workflow** (or **Create Workflow** when none exist), then **Choose form**, record
event **Created or Edited**, and the form event **Load of the form** or
**Validation on form submission**. Name the workflow and click **Create
Workflow**. In its builder use **Add New Action**, **Always**, **Deluge Script**,
paste the matching body, then **Save** and **Done**. Some navigation starts with
**Add → Workflow → On a form event**. Confirm the selected form and event before
pasting. These are documented controls, not a claim that the current native UI
was operated by this source-preparation agent. See
[Creator's workflow guide](https://help.zoho.com/portal/en/kb/creator/developer-guide/workflows/create-and-manage-form-workflows/articles/create-new-form-workflow).

1. Capture the live global City list, helper/workflow definitions, native City
   field types, mandatory/optional properties and original choice settings. Do
   not replace live definitions with an older export. Keep those captures for
   rollback and compare them before installation.
2. Install and compile `globalCityPolicy` as a **map-returning function** with
   `list requestedCities`, `list savedCities`, `bool allowRetained` arguments.
   Reopen and compare its saved source. It reads choices and returns policy;
   it never writes records, changes permissions or acts as a privileged writer.
3. Install every generated `bindings/<Form>.on-validate.dg` in that exact existing
   form's **Created or Edited → On Validate**, after all existing City/source
   inheritance and business validation actions. Do not replace current actions.
   Keep each form's permissions, locks, record creation and financial rules.
   Save, compile, reopen and compare every installed body.
4. For Contract specifically, append its guard **last** in the existing
   `Field_Validations_Contrac` action. The
   [merged integration copy](Contract.Field_Validations_Contrac.merged.dg) is the
   exact [captured pre-change Development action](native-before/Contract.Field_Validations_Contrac.dg)
   followed by that binding. Its semantics match the repository action; Creator
   formatting differs. Compare with the live
   action before using a whole-body replacement. Install this guard once, not
   both inside the existing action and again as a duplicate workflow.
5. Install every `bindings/<Form>.on-load.dg` in **Created or Edited → On Load**,
   after existing load actions. An appended action or a narrowly scoped new
   workflow is sufficient; keep existing locks, CSS, search/date setup and
   Cancel/reset behavior. Contract can append its load body to existing
   `Hide_Lockdown_Fields_Cont`. Save, compile, reopen and compare all bodies.
6. **Only after the server guard and load binding are installed and verified for
   that form**, enable **Allow Other Choices** on its existing single City Drop
   Down. There are seven such fields in the manifest. Keep native field type,
   scalar storage, mandatory/optional status, field link, static values and
   reports. Do not delete/rename choices or convert fields. Native API writes can
   then carry a newly added global City; the server guard rejects arbitrary text.
7. For the three Multi Select fields, install the native load/validation bindings
   only. Do not claim or enable a nonexistent multi-select Allow Other Choices
   property. Native On Load dynamic choices address their known native form
   entry/filter flows, including `createTaxTemplate` opening the native template
   form. This does **not** establish future widget/SDK/API support for a new City
   absent from their static field metadata; verify that separately before adding
   such a writer. No multi-select conversion or record migration is included.
8. Promote only the reviewed helper, native workflows and seven scalar field
   property changes through the authorized environments. Reopen Production
   components and verify definitions before exercising controlled test records.

Keep existing `System_Search_Cancel_Subm` enabled and unchanged. Do not enable
inactive `Lot_Search_Update_Saved_S` or the old inactive `Mass_Create_Lots`
successful-submit action; the active existing `Mass_Create_Lots_V2_Mass_`
continues owning lot creation. Filter On User Input workflows remain unchanged;
they use the City choices supplied on load. Rearrange only the new validation
hook as required after inheritance; never move existing Cancel/search/date
actions into a new save path. Creator executes workflows/actions in configured
order, so verify that order when reopening the native components.

New workflow display/link names, if needed, must be captured from Creator during
installation; the `bindings/` filenames identify form/trigger bodies, not claims
that a new component is already installed. Existing record writes continue as
the logged-in user through native Creator. Never skip workflows or replace the
save path with an owner-executed Custom API.

## Generation and Verification

`node creator/workflows/global-city/generate.mjs` generates thin wrappers from
the consumer inventory. `--check` verifies they still match. Policy and canonical
choices live in one shared helper and variable. The superseded Contract-only
review draft has been removed; this is the installable runtime binding package.

Run:

```text
node scripts/test-global-city-policy.mjs
node creator/workflows/global-city/generate.mjs --check
node creator/workflows/global-city/test-native-bindings.mjs
```

The binding tests execute the actual generated Deluge and actual shared helper
through the repository's existing offline translator. They cover all 76 catalog
Cities and a later global addition, each scalar/multi consumer, saved-only legacy
choices, stale/nonexistent IDs, changed City/source scopes, unordered sets,
required/optional metadata and existing native Contract validation boundaries.
These tests are not a Creator compiler or proof of native field configuration.

Development save/compile and scalar configuration are recorded above. Remaining
live gates: finish native definition readback; promote and reopen Production
components; save/read a controlled record using Pflugerville; reject an invalid
City through native validation; preserve an unchanged saved legacy record; test
global add/remove in Development without editing Production choices solely for
a fixture; verify multi-select native form/filter behavior. Check all preexisting
form workflow, search, date and Cancel interactions remain mounted and working.

## Data Impact and Rollback

There is no deletion, backfill, record rename, new field, ID conversion, new
Custom API or financial write in this package. County and Territory globals,
fields and behavior are unchanged. Native load actions edit only current form
choices/selection; server actions only validate the existing save. Records are
written by the existing user-authorized workflows.

To roll back a scalar consumer safely, first ensure its static choices include
the current global Cities and any already-saved valid new values, appending
without renaming/deleting choices. Turn **Allow Other Choices off before**
removing its guard; then restore the captured original load/validation actions.
Do not leave permissive arbitrary input enabled without the server guard.
Restoring an old incomplete static list would recreate the original failure.
For multi-select consumers, retain newly used legitimate static choices before
restoring their captured native load/validation actions. No record cleanup is
required or authorized by rollback. Keep the helper until no installed binding
references it; never delete existing data to simplify reverting configuration.
