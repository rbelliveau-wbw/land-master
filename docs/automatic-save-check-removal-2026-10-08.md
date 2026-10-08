# Automatic save comparison removal — October 8, 2026

## Diagnosis

The supplied Production Contract Management 1.61.31 report identifies
`contractActionBatch → updateRecord → contractReadback → contractPayloadIssues`.
After an acknowledged native update to `All_Contract_Actions`, the widget reread
the record and compared every submitted field. A different `Dev_Notes` value
threw `Saved fields need review: different Dev_Notes.`; the batch caught it,
stopped subsequent actions and logged `Captured action batch stopped` as an error.
The critical reporter turned that audit error into the supplied report.

The check was intended to detect ignored or incomplete saves. Exact payload
comparison can also reject legitimate formatting, native workflow changes or a
later edit. The truncated audit does not establish which caused this incident,
nor prove that Creator rejected the write. The user's requested policy removes
automatic editable-field comparisons system-wide instead of adding another
special case for notes.

## Save policy

An acknowledged successful save is no longer downgraded because refreshed
editable or calculated field values differ, are formatted differently or are
omitted from the report. Controllers still validate native response failures,
exact string record IDs, captured user/environment, destination identity and
complete record/child counts. Existing input, permission, stale preflight,
protected-lot and server operation-policy checks remain.

Lost, malformed, timed-out or failed native replies retain their drafts and
duplicate-send guards. Explicit read-only recovery can compare captured fields
because the unresolved save needs read-only evidence of the attempted write. It never
replays a write. Attachment ownership/file identity and approval routing,
delivery and finalization checks retain their existing purpose and behavior.

Automatic reads continue to refresh saved records; this change does not remove
all SDK requests. Gantt publishes returned dates and clears only the submitted
draft revision, preserving any newer draft. A later fresh lot-price difference
does not overturn an already successful safe transfer receipt or trigger repair.

## Affected code and data

| Module | Changed save functions/files | Affected existing records/fields |
| --- | --- | --- |
| Contracts | widget.html: contractReadback, verifyLotTransfer, ncVerifyContext, ncFixSubdivision | Contract/Contract_Actions/Contract_Pricing and setup rows; Dev_Notes and other submitted fields; refreshed Lot values |
| Pro Forma | pf-controller.js, pf-save-verification.js, widget.html, budget-transfer-ui.js | Add_Pro_Forma header, child collections/phase schedule, Lot_Mix_Row, Comment_Log; LOI header and Budget-transfer receipt total |
| Budget | po-controller.js receipt validation | Purchase Order header/lines; vendor, amount, dates and line values |
| Tax | tax-controller.js verify/verifyBounded | Property and Tax_Parcel_Year submitted fields, including Property_ID |
| Land & Projects | widget.html: readTakedownSave | Takedown_Schedule submitted terms and calculated values |
| Manage Lots | lot-edit-controller.js verify, widget.html verifyTakedownDetails | Lots edit allowlist; Builder_Takedown dates/rates/fees and Additional_Items values |
| Gantt | gantt-controller.js verify/save/applyVerified | Milestone Start_Date and End_Date |
| Settings | settings-controller.js verifyBatch/verifyCurve; approval-admin.js validateReceipt | Settings, templates/cost curves; Development-only approval configuration receipts |
| Forecast | forecast-app.js save | Forecast.Forecasted_Lots; exact verifiedForecastId retained |

Config/version/hash, immutable releases, production mapping, fixture regressions,
module notes, root development instructions and the transfer-progress guide are
also updated. No form/report/field names, payload shapes, permissions, financial
calculation engines or Creator functions/Custom API contracts change. Existing
Custom APIs (Save_PF, PF_Budget_Transfer, Complete_Lot_Contract, forecast and
PO/configuration operations) receive the same requests. **No Creator deployment
is required.** The existing approval-administration candidate remains gated to
Development; production approval execution is unchanged. Insights is read-only
and needs no release.

## Exact Contract replacement

The replacement keeps the existing record/scope checks and limits field
comparison to explicit recovery of an unknown reply:

```javascript
function contractReadback(attempt){
  if(attempt.scope!==contractMutationScope())return Promise.reject(new Error('Captured Creator session changed before verification.'));
  if(!attempt.id||!attempt.reportName)return Promise.reject(contractMutationError(attempt.response,'A usable record ID and report are required for read-only verification.'));
  return sdkGetAll(attempt.reportName,'(ID == '+attempt.id+')',{fresh:true}).then(function(rows){
    if(attempt.scope!==contractMutationScope())throw new Error('The Creator session changed during verification.');
    if(attempt.kind==='delete'){if(rows.length){attempt.deleteStillPresent=rows.length===1&&rows[0].ID===attempt.id;throw new Error('Creator still returns the record.');}return true;}
    if(rows.length!==1)throw contractVerificationError(attempt,'Creator returned '+rows.length+' saved records; expected one.',{reason:'record-count',count:rows.length});
    if(rows[0].ID!==attempt.id)throw contractVerificationError(attempt,'Creator returned a different saved record.',{reason:'record-id'});
    // Only a user-requested recheck of a lost/ambiguous reply compares fields.
    if(attempt.status==='unknown'){
      var issues=contractPayloadIssues(rows[0],attempt.payload,attempt.reportName),notes=[];
      if(issues.missing.length)notes.push('missing '+issues.missing.join(', '));if(issues.different.length)notes.push('different '+issues.different.join(', '));if(issues.unverifiable.length)notes.push('unreadable '+issues.unverifiable.join(', '));
      if(notes.length)throw contractVerificationError(attempt,'Saved fields need review: '+notes.join('; ')+'.',{reason:'fields',fields:issues});
    }
    return rows[0];
  });
}
```

## Regression checks

- Run the actual two-action batch with successful native replies but formatted
  Dev_Notes readback: both actions finish, two total writes, no retained reviews
  and no critical-error breadcrumb/report. This covers the supplied failure.
- Native success with different/missing notes, currency, percentages, checkboxes,
  LOI/phase/child values succeeds without a compensating write across modules.
- Forecast accepts a different returned value while retaining the entered payload;
  wrong record IDs and real API errors remain unresolved.
- Gantt displays returned dates, retains newer revisions, and sends once.
- Failed/malformed/lost replies, permission denial, missing/duplicate/foreign
  records, incomplete children, stale actor/scope and prewrite conflicts retain
  their existing error/draft/no-replay behavior.
- Manual unknown-reply recovery stays read-only; protected Lots/zero prices,
  original monetary input precision, schedules, approval and attachment workflows
  keep their existing behavior.
- Required checks: `npm run validate` and `npm run build:pages`; compare each
  release file with its source and generated Production artifact. Live native
  Creator writes were not used to test this patch.

## Production releases and rollback

Stable Creator registration URLs stay unchanged. Production maps these releases;
Development and Stage mappings remain as configured. To roll back, restore the
previous values in deploy/environments.json and deploy Pages. No data rollback
or backend publication is involved.

| Widget | New release | Previous Production / rollback |
| --- | --- | --- |
| contract-management | 1.61.32 | 1.61.31 |
| proforma-manager | 1.80.95 | 1.80.94 |
| budget-manager | 122.29.7 | 122.29.6 |
| tax-center | 19.17.14 | 19.17.13 |
| land-master | 8.15.9 | 8.15.7 |
| manage-lots | 0.13.1 | 0.13.0 |
| milestone-gantt | 1.1.9 | 1.1.8 |
| settings-manager | 1.4.2 | 1.3.11 |
| forecast-manager | 1.5.4 | 1.5.3 |
