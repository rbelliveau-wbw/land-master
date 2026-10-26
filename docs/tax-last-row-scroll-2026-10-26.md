# Tax report final-row scrolling — October 26, 2026

The native Creator page embeds Tax Center in a 2000px iframe, then clips it to
the visible tile (1063px in the connected desktop). Its fixed 950px parcel
scroller extended below that tile. Reaching the scrollbar's bottom therefore
left the last row below the visible page. The Property report used the same
fixed-height pattern at 1000px.

19.17.33 reuses the existing flex shell and report scroll containers. They now
shrink to the available height with 12px below the last row. The scroll regions
also accept keyboard focus. A single IntersectionObserver measures the visible
bottom of the unchanged full-height document root, including cross-origin
ancestor clipping, and fits only the body. It does not read the parent DOM,
resize the iframe, poll, fetch records or change scroll positions. The old
guarded SDK1-style height call was absent from the loaded SDK2 and did nothing.
The browser API's clipping behavior follows the
[Intersection Observer processing model](https://www.w3.org/TR/intersection-observer/#compute-intersection-algo).

## Release impact

- Widget: Tax Center 19.17.33; Development and Production, stable URLs.
- Changed source: `widgets/tax-center/src/app/widget.html`; browser regression,
  module/style documentation, configuration/manifest and immutable release.
- Forms/fields, Creator functions, Custom APIs, workflows and permissions:
  unchanged. No record write is needed for verification.
- Frontend deployment: required through Pages. Creator publication: not required.
- Rollback: map Tax Center to 19.17.32 and rebuild Pages.

## Regression evidence

The real-widget desktop browser fixture recreates a cross-origin 2000px iframe
inside an overflow-hidden Creator-style tile. The immutable 19.17.32 source
reproduces a last row below the visible tile at the true scroll limit.
The updated report exposes the entire last row on pages 1 and 2 of 135 records,
with and without selection, at 1456×1218, 3400×900 and 1280×800. Tests resize
the same page, preserve horizontal overflow and verify bottom breathing room,
keyboard scrolling and the companion Property viewport. These checks make no
record writes. The existing synthetic save, Retry, focus, scroll restoration,
pending/rejected operation and reduced-motion scenarios remain in the suite.

Production deployment and native bottom-row evidence are recorded after release.
