
# Contract Management

Contract management and token-based LOI legal review.

## Baseline

- Version: `1.0.0`
- Original upload: `Contract_Management_Widget_LOI_Review_tokenId (1).zip`
- Extracted source: `src/`
- Immutable original: `baseline/Contract_Management_Widget_LOI_Review_tokenId (1).zip`
- Initial external release: `../../releases/contract-management/1.0.0/`

The extracted source is intentionally preserved as a monolithic Creator widget baseline. Do not refactor it merely to make it look cleaner. Establish behavioral tests first, then make targeted changes.

## Entry points

- Creator package entry: `src/app/widget.html`
- External-hosting entry after release: `index.html`
- Creator package manifest: `src/plugin-manifest.json`

## Creating contracts (1.12.0)

`+ New Contract` opens an in-widget form that mirrors the Contract Info section of
Creator`s Add Contract form, including the six Lot-only fields that form reveals
when Type is `Lot`. The record is written with `createRecord(CFG.forms.contract, ...)`.

Because a Data API create never loads a form, the two `on load` workflows that
normally populate a new contract do not run. The widget therefore seeds the rows
itself after the insert:

- 7 `Contract_Actions` rows, the first flagged `Current_Action`
- 2 `Contract_Approvals` rows at `Not Sent`, reminder interval 5
- `Contract.Current_Action` pointed at the first action title

`ncActionSeed()` / `ncApproverSeed()` prefer live template rows fetched from
`All_Contract_Actions` / `All_Contract_Approvals`, and fall back to the
`DEFAULT_ACTIONS` / `DEFAULT_APPROVERS` constants. Neither report returned template
rows when checked in production on 2026-08-22, so the constants are the live path.
If Legal edits the templates in Creator, update those constants.

`Subdivision1` is a multi-select lookup that had never been written from a widget.
`ncFixSubdivision()` writes an ID array, reads the record back, and retries with a
comma-joined string and then a single ID before giving up - Creator can report
success while dropping a value it could not parse.

The footer`s `Creator form` button is the escape hatch back to the native form.

## Action templates (1.13.0)

`Manage Actions` (third tab beside Contracts and LOI Reviews) edits the checklist a
new contract of each type is seeded with. A template is a `Contract_Actions` row
with `Type_field` set, `Template_Action` true, and no `Contract1`.

Reads key off "has a Type, has no Contract" rather than `Template_Action`, because
`Template_Action` is not in the `All_Contract_Actions` quick view and the v2 API
returns only quick-view columns. The flag is still written.

`Type_field` and `Template_Action` exist in the Creator **Development** app only.
Production still has the old `Contract_Template`, so until the app is published
`templatesSupported()` is false there and the section says so instead of rendering a
broken editor. New contracts fall back to `DEFAULT_ACTIONS`.

The create modal asks for Type first and shows nothing else until it is set, then
lists exactly the actions that will be created and names their source.

## Common commands

```bash
npm run validate
npm run package:creator -- contract-management
npm run release -- contract-management <new-version>
npm run build:pages
```

## Action popovers and Legal assignment filter (1.60.1)

The three inline action dates keep `type=date` inputs as their persisted value carriers, but
the date-cell wrapper is now the only interactive target and opens the widget quick-date
popup. Searchable combos remain attached to their trigger while the surrounding Contracts
view scrolls. Contract list counterparty pills occupy a fixed subcolumn within Contract Name.
The Review toolbar's Assigned to me pill filters pending LOIs, proposed contracts/actions,
and waiting approvals using their existing assignment fields; it does not change the global
Review badge.

## Send for Approvals (1.60.0)

The Internal Approvals modal's **Send for Approvals** button calls the Custom API
`Send_Contract_Approvals` (Development: `Send_Contract_Approvals_DEV`, resolved by
`runtime-context.js`) with a JSON POST body `{"contractId":"…","user":"<bare Creator username>"}`.
Both APIs expose the Deluge function `string Send_Contract_Approvals(string contractId)`
(`creator/functions/Send_Contract_Approvals.dg`), which sends the styled email from
`Send_Contract_Approval_Email` to every approver whose Email switch is on and who is still
Not Sent, attaches every Contract_Version flagged `Email_Attachment`, flips those rows to
Awaiting Approval, stamps `Last/Next_Reminder_Date`, and moves the contract to Awaiting
Approvals. The daily `sendApprovalReminders` job re-sends the same email when a row's
`Next_Reminder_Date` arrives. The button is enabled only when at least one approver is
pending (Email on, Not Sent) and at least one file is attached; the function enforces the
same rules server-side plus `User_Access.Edit_Contracts` for the caller.
