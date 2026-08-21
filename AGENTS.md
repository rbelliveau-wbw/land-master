
# Land Master Development Instructions

Land Master is a production Zoho Creator application used for projects, subdivisions, properties, budgets, pro formas, contracts, approvals, taxes, lots, and forecasting.

## Authority order

Use information in this order:

1. Current live Creator metadata when an approved read-only connection is available.
2. `creator/generated/` generated from the latest committed `.ds` export.
3. Machine-readable contracts under `manifests/`.
4. Module documentation under `knowledge/`.
5. Current source code.
6. Historical incidents and migration notes.

Chat history and model memory are not authoritative.

## GitHub access

- Before asking the user to authenticate GitHub CLI, check whether the connected GitHub app already has access to the target repository.
- When the GitHub app confirms repository access, use it for supported reads and writes. A missing local `gh` executable is not evidence that GitHub authorization is missing.
- Request a new GitHub login only when the required operation is unavailable through the connected app and an authenticated CLI session is genuinely necessary.

## Release shorthand

- When the user says `push to main and prod`, treat that as explicit authorization to commit and push the verified change to `main`, update the applicable production environment mapping in `deploy/environments.json`, and monitor the resulting CI and Pages deployment.
- For widget changes, create and validate the immutable release before promotion. Do not stop after pushing a candidate release when production promotion was requested.

## Source of truth

- Widget source: `widgets/<widget>/src/`
- Immutable uploaded baselines: `widgets/<widget>/baseline/`
- External-hosting releases: `releases/<widget>/<version>/`
- Creator export: `creator/exports/`
- Extracted Creator functions: `creator/functions/`
- Generated Creator schema: `creator/generated/`
- Inferred Custom API registry: `manifests/custom-apis.json`

## Change rules

1. Preserve unrelated functionality.
2. Never invent a Creator form, report, page, field, function, or Custom API name.
3. Search all callers before modifying a shared function or API contract.
4. Distinguish frontend-only changes from Creator backend changes.
5. Treat Creator record IDs as strings in JavaScript.
6. Never put secrets in widget source.
7. Do not directly deploy production unless the user explicitly authorizes it, including with `push to main and prod`.
8. Update the widget version and create an immutable release for deployable changes.
9. Update documentation when behavior or contracts change.
10. Include regression and rollback notes in every pull request.

## UI copy style

- Robby does not like verbose explanatory text blocks in widget UI (2026-08-13).
  No multi-sentence descriptions under section headings, no long empty-state
  paragraphs explaining how a feature works. A heading, a short label, and the
  action button are enough; put any necessary explanation in a tooltip.

## No native browser dialogs

- Never call `window.confirm`, `window.alert`, or `window.prompt` in a widget.
  A widget runs inside a Creator iframe, so the browser stamps every native
  dialog with "An embedded page at rbelliveau-wbw.github.io says". Users read
  that as a browser security warning rather than as Land Master, and the dialog
  cannot be styled, cannot list the records it is about, and reduces every
  decision to OK/Cancel.
- Use the widget's own overlay instead. Contract Management's `confirmDialog({...})`
  is the reference implementation: kicker, title, one-line consequence, the
  affected record or list of records, an action-named button, and an `onDismiss`
  hook so cancelling restores whatever the dialog covered.
- Budget Manager still has two `window.confirm` calls as of 1.10.0 of Contract
  Management; convert them the next time that widget ships.
- A result the user does not have to acknowledge is a `banner("ok"|"err", ...)`,
  not a dialog. Reserve the overlay for a real decision.
- Same rule for anything else the browser draws in its own chrome: no
  `beforeunload` prompts and no native form-validation bubbles as the only
  error surface.

## Permanent externally hosted widget URLs

- Every `dev/<widget>/`, `stage/<widget>/`, and `prod/<widget>/` GitHub Pages
  URL is a permanent Zoho Creator integration contract.
- Never require or instruct a user to change a Zoho Creator widget URL when a
  release is promoted. Promotions change only `deploy/environments.json`.
- Every environment/widget directory must keep `index.html` as the stable,
  cache-busting bootstrap and publish the promoted release as `widget.html`.
- The bootstrap must fetch `widget.html` with `cache: 'no-store'` and a fresh
  cache key, then inject it into the current document. It must not navigate or
  create a nested iframe: changing the browsing/referrer context prevents the
  Zoho Creator SDK from initializing and leaves widgets in mock mode.
- The stable document must retain Creator query parameters and its original
  parent/referrer context so cached iframes cannot pin an old release without
  breaking `ZOHO.CREATOR.init()`.
- New widgets and environments must use this same stable-loader pattern.

## Deluge constraints

- Do not use `containsKey` unless current Creator documentation and existing application compatibility prove it is supported.
- Do not use `while` loops.
- Parenthesize complex criteria.
- Safely handle nulls and conversions.
- Preserve leading zeroes for identifiers such as Facility IDs.
- Be conscious of Creator and external API limits.
- Every Deluge function declared with any return type must end with an unconditional fallback `return` statement at the outer function scope. The returned fallback expression must match the function's declared type. Zoho Creator's compiler may report `Missing return statement: Provide <TYPE> expression to return` even when all apparent `if`, `try`, `catch`, loop, or record-query branches already return. Do not rely on branch-only returns. This applies to all declared return types, including `string`, `map`, `list`, `bool`, numeric types, dates, and record values—not only strings.

  ```deluge
  string exampleFunction(string recordId)
  {
      response = Map();
      try
      {
          response.put("ok",true);
          return response.toString();
      }
      catch (functionError)
      {
          response.put("ok",false);
          response.put("message",functionError.toString());
          return response.toString();
      }

      // Required compile-safe fallback at the outer function scope.
      response.put("ok",false);
      response.put("message","The function ended without a response.");
      return response.toString();
  }
  ```

## Required verification

Before declaring a widget change complete:

```bash
npm run validate
npm run build:pages
```

Also report:

- changed files
- affected forms and fields
- affected functions and Custom APIs
- whether a Creator deployment is required
- regression scenarios
- rollback release
