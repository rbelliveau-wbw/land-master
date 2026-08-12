# Zoho Creator: Global Functions & Publishing to Production

How to find and edit standalone ("global") Deluge functions in the Land Master
Creator app, and how a function change reaches **Production**.

This is a **separate pipeline from the widgets**. Widgets deploy via GitHub
Pages on merge to `main` (see [release-process.md](release-process.md)). Deluge
functions live inside Creator and only reach Production through a Creator
**environment publish** — a git merge does nothing for them. The `.dg` files
under `creator/functions/` are an *export/mirror*, not a deployment source.

## Where global functions live

Standalone functions are **not** in the Application IDE tree (that view only
lists Forms/Reports and their attached workflows — searching it for a function
name returns "No matches"). They are under the **Workflow** area:

1. Admin dashboard → open **Land Master** → Environment ▸ **Development ▸ Edit**
   (functions are only editable in Development).
2. Top bar → the **Workflow** icon (middle of the three: Pages / Workflow /
   Settings).
3. Tab row → **Functions**.
4. Use the top-right **Search** box (press Enter) to filter by function name.

Direct URL to the Workflow editor:
`https://creator.zoho.com/appbuilder/wbdevelopment/land-master/workflow/edit`

### Example: the ProForma save function

The ProForma widget's admin-scope save API — `Save_PF` (Development) /
`Save_PF1` (Production) — is the REST exposure of the standalone function
**`proforma_save`** (`string proforma_save(string payload)`). The API name
differs per environment; the underlying function is the same one, promoted
through environments. Editing `proforma_save` in Development is what the widget
ultimately calls.

## Editing a function

The editor is a same-origin **CodeMirror** instance on `creator.zoho.com`, so it
is reachable from browser automation via JavaScript. Typing large edits by hand
is unreliable; read and set the value programmatically instead:

```js
// find the function's editor
var cm = [...document.querySelectorAll('.CodeMirror')]
  .map(e => e.CodeMirror)
  .find(c => c.getValue().includes('proforma_save(string payload'));

var v = cm.getValue();
// ...surgically insert/modify using unique anchor strings...
cm.setValue(v2);   // fires change events so Creator registers the edit
```

Then click **Save** (bottom-right of the editor). A syntax error surfaces
inline with a line marker; a generic "multiline fields up to 64 KB" info toast
on save is normal, not an error. Verify persistence by clicking **Done**,
reopening the function, and confirming your change is in the server copy.

### Indentation gotcha

The **live** function is **tab-indented**. The repo export
`creator/functions/proforma_save.dg` prefixes **every line with 17 spaces**
(an export artifact). So you cannot paste repo text verbatim into the live
editor and vice-versa — convert indentation, or (safer) surgically insert only
the changed blocks using unique anchor strings already present in the live code,
matching the live tab indentation. Deluge ignores leading whitespace at runtime,
but matching it keeps the code readable and the diff small.

## Publishing Development → Stage → Production

A function edit only exists in **Development** until you publish. Publishing is
done from the admin dashboard, **not** from the app builder.

Model: `Development → (Publish) → Stage → (Publish) → Production`. You cannot
skip Stage.

1. Admin dashboard → **Environments** (`#/environments`), or the app card's
   per-environment **Publish** action.
2. **Publish to Stage from Development** → select the **Land Master** app →
   *Proceed*.
3. **Component selector** — this is the important step. Publish is
   **component-level**: it lists every changed component (each Form field, Page,
   Function, layout, …). Select only what you intend, or **Select All**.
   Example change set: `Functions ▸ proforma_save`, `Forms ▸ Add Builder ▸ Phone`,
   `Pages ▸ Forms & Reports`, `Device layouts ▸ Web ▸ App Menu`.
4. Fill the required **Title** and **Description**, pick **Major/Minor**
   (bumps the app version), → **Publish**. The target app enters
   **maintenance mode (inaccessible)** for the ~few minutes the publish runs;
   an email is sent on completion.
5. Once **Stage** shows the new version, repeat: Environments → **Publish** →
   **Publish to Production** → select the Stage **version** → *Proceed* →
   **Publish Now** → **Publish**. Production goes into maintenance mode briefly.
6. Done when Stage and Production show the same version and the app reads
   **"No changes available."**

### Watch-outs

- **Publish carries whatever components you select, to Production.** Always read
  the component list before Select All — unrelated half-finished Dev work
  (fields, pages, layouts) can ride along. Prefer selecting only the components
  you own.
- **Maintenance mode = real (brief) downtime** for the environment being
  published. Production users can't use the app during its publish.
- **One publish at a time** across all apps in the org.
- The app is **Locked** while a publish runs; the next publish must wait for the
  previous to finish.

## Reference: how a ProForma save change ships end-to-end

| Layer | Change | How it deploys |
|-------|--------|----------------|
| Widget (`widgets/proforma-manager/...`) | client JS/HTML | bump version + release + merge `main` → GitHub Pages → Zoho serves it |
| Deluge (`creator/functions/proforma_save.dg`) | `Save_PF` logic | edit the live function in Creator **Development**, then **publish** Dev → Stage → Production |

Both layers must ship for a full change. Example: making existing LOI Seller/
Property rows editable required the widget (send `editedSellers` /
`editedProperties`) **and** `proforma_save` (apply those to the Builder/Property
records) — the widget alone silently no-ops until the function is published.
