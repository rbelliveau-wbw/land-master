# Budget PDF Renderer

Vendored without modification from the official pinned npm distribution:

- [pdfmake 0.2.20 browser build](https://cdn.jsdelivr.net/npm/pdfmake@0.2.20/build/pdfmake.min.js)
- [pdfmake 0.2.20 embedded Roboto fonts](https://cdn.jsdelivr.net/npm/pdfmake@0.2.20/build/vfs_fonts.js)
- [pdfmake MIT license](https://cdn.jsdelivr.net/npm/pdfmake@0.2.20/LICENSE)
- [Roboto Apache 2.0 license](https://github.com/googlefonts/roboto-2/blob/main/LICENSE)

Loaded only inside the dedicated PDF worker, from the same widget release.
The renderer receives literal text/table definitions, never HTML, remote
images, SVG, links or font URLs. Budget data stays in the browser until the
existing authorized Creator attachment uploader saves the finished file.

SHA-256:

| File | SHA-256 |
| --- | --- |
| pdfmake-0.2.20.min.js | c2fd3a5e24db096c9139bb7d266765de433b0b866d03ba356c2ef4d9ae1a53b7 |
| pdfmake-0.2.20-fonts.js | f91db5690400fc851536c3a9322f822619f8e9f681abe42013e572d88d3c1f38 |

See [the PDF export incident and regression checks](../../../../../docs/budget-pdf-statement-limit-2026-11-09.md).
