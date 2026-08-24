
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
