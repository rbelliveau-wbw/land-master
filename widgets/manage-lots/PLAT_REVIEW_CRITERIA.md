# Plat_Review_Criteria - default text for the Settings field

Paste into Settings > AI Plat Import > Transcription Instructions. Generic to any recorded
Texas subdivision plat: drawing-only sheets, sheets with lot size tables, or both.

```
You are transcribing ONE image tile of a recorded Texas subdivision plat. Accuracy matters more than completeness: a wrong number is worse than a missing one. Never guess, infer, interpolate, or continue a numeric sequence.

SCOPE: Only lots inside the bold (heavy black) subdivision boundary line count. Ignore everything outside it: neighbouring phases and plats drawn in grey or light lines, adjacent tracts, remainders, and any lot numbers or circled block numbers that sit outside the bold outline. Ignore coloured text, clouds and arrows added by reviewers. Ignore streets, R.O.W. labels, curve tables, line tables, legends, notes, signatures, easement labels and the vicinity map.

LOT NUMBER: the plain integer printed inside a lot polygon. It is not a dimension (dimensions end with a prime or ft mark), not a bearing (degrees, minutes, seconds), not a curve or line label (a letter followed by a number), not an easement or setback label, and not a circled number. If a number is cut off by the tile edge, faint, or overlapped by a line, omit that lot; the neighbouring tile covers it.

BLOCK: the block identifier as marked in the legend, usually a number inside a circle or a "BLOCK n" label. A block is often a double row of lots and its label may be printed only once, far from some lots, or in another tile. Assign a block only when its label sits inside the same bold-bounded group of lots as the lot; otherwise set block to null. Never copy a block label from an adjacent plat.

WIDTH: the lot's frontage dimension along the street side, copied exactly as printed. If the frontage dimension is not printed or not clearly attached to that lot, use null. Do not use the lot depth as width.

AREA: only when a square-foot area is printed for that lot or listed in a lot size table; never compute it. Otherwise null.

LOT SIZE TABLES: columns in order LOT #, BLOCK #, AREA (SQ FT), WIDTH (FT); the header may be cut off, so trust the column order. Copy every legible row exactly.

Before answering, re-read each row against the image: correct lot number, correct block, width copied digit for digit. Drop any row you are not certain of.

Reply with ONE JSON object and nothing else, exactly this shape: {"kind":"table|drawing|none","rows":[{"lot":"1","block":"4","area":7187,"width":77}],"totals":{"lots":148,"blocks":4}}. lot is the lot label as printed (a string); block is the block identifier as printed without the word BLOCK (a string) or null; area and width are numbers or null. Include totals ONLY when a printed TOTAL LOTS or TOTAL BLOCKS figure is visible in this tile; otherwise omit the totals key. Use kind none and an empty rows array when the tile holds no lot data.
```
