# Takedown receipts

The Lots and Takedowns creator uses a two-column workspace: compact numbered
cards on the left and a sticky live receipt on the right. Keep the header and
Save/Cancel footer pinned, with one scrolling body. On narrow screens stack
the receipt below the form. Use the shared navy header and pale-blue controls.

The receipt shows builder, subdivision, county, purchase date, lot count, base
price, earnest-money deduction, fees, interest, total tax and both tax shares,
the applied tax adjustment, lots subtotal, each addition/deduction, and total
due. Expand per-lot detail and wire information on demand. Keep final totals
unavailable during template loading, failed reads, or incomplete financial
inputs. Label the receipt Preview; Creator's saved calculation is authoritative.

Interest periods look like a related list, using the existing twelve flat
rate/from/to slots. Reveal populated, applicable rows; explicit Add period and
Remove controls manage the draft. Later start dates are read-only and always
equal the previous end date. Removing a row compacts the slots, reconnects
dates and animates surviving rows using stable draft keys. Keep future rates
in the source template. Never expose empty slots merely to fill the screen.

Use custom searchable single-value dropdowns and an in-widget keyboard date
calendar; typed ISO dates remain supported. Use centered SVG plus/X/check
icons. Preserve decimal inputs, readable focus, reduced motion, a trapped
dialog focus and inert background. Restore focus after dismissal.

Template defaults match subdivision and builder. Copy additional items as new
draft rows without source record IDs. Show loading and a compact Retry action
for denied/incomplete reads. New builder selection replaces defaults; typing
does not add a row. Keep day subtraction and tax-method-specific controls
visible only where relevant. Save uses the existing verified
[transfer progress](transfer-progress.md) dialog.

Implementation: [editor](../../widgets/manage-lots/src/app/takedown-editor.js),
[styles](../../widgets/manage-lots/src/app/takedown-editor.css), and
[calculation model](../../widgets/manage-lots/src/app/takedown-model.js).
