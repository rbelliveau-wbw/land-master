# Manage Lots

Standalone Zoho Creator widget for visually selecting eligible subdivision lots, creating a `Builder_Takedown`, viewing existing subdivision takedowns, and importing new lots from a recorded plat with AI-assisted transcription.

## Views and selection

- **Lots** uses a searchable subdivision multi-select and groups the resulting lots by subdivision and then by their text-capable `Block` value. Because `All_Lots_All_Fields` does not currently expose `Block`, the widget also derives it from `Lot_Code` (for example, `AAA-B01-L012` becomes Block 1). Letter and alphanumeric blocks remain supported.
- Available lots can be selected individually or by holding the pointer and dragging across them. Selected lots use a high-contrast blue state with a check marker and remain staged until the takedown is created.
- A new Builder Takedown remains limited to lots from one subdivision even when several subdivisions are visible.
- **Builder Takedowns** reads `All_Builder_Takedowns`, groups rows by subdivision, and displays each linked lot as a separate code/status chip. This view is intentionally read-only and exposes no update or delete actions.

## Eligibility

A lot is selectable only when it is open, not archived, and has no existing Builder Takedown. Eligibility is checked once while rendering and again immediately before submission.

## Import Plat (0.6.0)

`Import Plat` in the toolbar opens a four-step flow: **Subdivision → Plat → Review → Create**.

1. **Subdivision** — pick the subdivision first. Its `Subdivision_Code`, `Phase`, `City`, and `County` feed every staged lot, and the Lot Code preview (`CODE-B##-L##`) is shown. A subdivision without a code or a numeric phase cannot continue.
2. **Plat** — drop a PDF, PNG, or JPG (the lot size table sheet or the drawing). PDFs render client-side with PDF.js (cdnjs, 3.11.174, same build as Contract Management's preview) at 150 dpi, capped at 26 MP. The sheet is cut into 1024 px tiles with 128 px overlap; tiles with ink are pre-selected and can be toggled by click or drag. Pages can be skipped by double-clicking their thumbnail.
3. **Scan** — each tile is sent as a JPEG through Custom API `Ingest_Plat` (`Ingest_Plat_DEV` in Development via `LMRuntime.apiName`), three at a time, one retry each. The Deluge function `Plat_AI_Ingest` reads the provider and model from the Settings singleton (`PF_Review_Provider` / `PF_Review_Model`, the AI Review section of Settings Manager) and calls OpenAI chat completions through the `openai` Connection with a strict transcribe-only JSON prompt. The model returns `{kind, rows:[{lot, block, area, width}], totals}` per tile; it is told never to invent or continue a sequence.
4. **Review** — rows from all tiles are merged by block + lot (duplicates from the overlap collapse; disagreements are flagged as *Tiles disagree*). Each row shows Block, Lot, the computed Lot Code, Width ft (→ `Lot_Size`, which the app displays in feet), Area sq ft (checking only), how many tiles saw it, and flags. Blocking flags: non-integer lot, lot outside 1–999, block missing or over 2 characters (the `Lots` field limits), duplicate row. Informational: *Already in Lots* (matched against `All_Lots_All_Fields` for that subdivision, excluded by default). Block chips show the range and any missing lot numbers; a `TOTAL LOTS` figure read from the sheet is compared to the row count. The plat viewer on the left pans and zooms; 📍 on a row jumps to the tile it came from. Rows are editable, removable, and can be added by hand. City and County default from the subdivision and must be valid `Lots` picklist values.
5. **Create** — after an in-widget confirm dialog, lots are inserted one at a time through `ZOHO.CREATOR.API.addRecord` on form `Lots` with `Lot_Code`, `Status = Open`, `Subdivision`, `Subdivision_Code`, `Phase`, `Block`, `Lot_Number`, `Lot_Size` (width), `City`, `County`, `Archived = false`, `On_Hold = false`, and optionally `Notes` stamped with the plat file name, date, and area. Lots are re-read right before inserting so anything created meanwhile is skipped. Failures stay in Review for another attempt; the Lots view reloads with the subdivision selected.

Lot Code rule (must match Deluge `Set Lot Code if Manual Update` / `Mass Create Lots V2`): `Subdivision_Code + "-B" + leftpad(block, 2, "0") + "-L" + leftpad(lot, 2, "0")`. Letter blocks pad the same way (`A` → `0A`). `Block` and `Lot_Number` are sent unpadded.

### Creator setup (Development, then publish)

1. Workflow → Functions → new standalone function `Plat_AI_Ingest`, return type `string`, argument `string payload`; paste `creator/functions/Plat_AI_Ingest.dg`.
2. Custom APIs: `Ingest_Plat_DEV` and `Ingest_Plat`, method `POST`, request mapped as entire JSON to `payload`, function `Plat_AI_Ingest`, OAuth, all users — the same shape as `Review_PF_DEV` / `Review_PF`.
3. Settings page → AI Review: Provider `openai`, Model set. The `openai` Connection (created 2026-09-01 for the Pro Forma AI Review) is reused; no key lives in the widget or the function.
4. Publish Development → Stage → Production. Until the API exists in an environment the widget shows "Ingest_Plat is not published in this environment yet" in the modal header and keeps Scan disabled.

## Creator contracts

- Reports: `All_Subdivisions`, `All_Builders`, `All_Lots_All_Fields`, `All_Builder_Takedowns`
- Create forms: `Builder_Takedown`, `Lots`
- Custom API: `Ingest_Plat` (`Ingest_Plat_DEV`) → Deluge `Plat_AI_Ingest`
- Settings fields read server-side: `PF_Review_Provider`, `PF_Review_Model`
- External: `cdnjs.cloudflare.com` (PDF.js), loaded only when a PDF is dropped

## Local preview

Copy `src/app/*` to a scratch folder, replace the `widgetsdk-min.js` script tag with a `seed.js` that defines `window.ZOHO.CREATOR` (`init`, `API.getAllRecords`, `API.addRecord`, `API.invokeCustomApi`) and serve it statically. `window.__MLW_TEST__` exposes `S`, `openPlatModal`, `platReadFile`, `platScan`, and the pure helpers for scripted checks.

Version `0.3.0` added searchable multi-subdivision filtering, subdivision grouping, and scannable Builder Takedown lot details. Version `0.6.0` added Import Plat.
