# Land Master Insights

- Keep the Creator adapter, pure report model, and UI separate; other widgets should be able to reuse the model without copying calculations.
- Ask before changing financial metric definitions, date semantics, default data exclusions, or Pro Forma integration scope.
- Never silently blend Sold and Contracted lots or substitute Purchase Date for a missing Close Date.
- Never use synthetic data as a fallback for a live error. Local fixtures belong under scripts/fixtures, outside published widget assets.
- Preserve cursor pagination, record-count reconciliation, and string Creator IDs. A partial report must fail visibly.
- Keep the permanent external widget URL stable.

- Recent-year results may display before history only when both date bases are fully covered by the same bounded query. First-sale dates, all-history results and exports must not imply completeness while history is pending or failed.
- Budget scope and comparison basis are explicit choices. Match Budget Manager’s category Final, item GP/HCSS, signed approved modifications, and separate approval tracks; do not treat budget use as construction completion.
