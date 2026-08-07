
# Zoho Creator External Widget Setup

## Permanent URL contract

Every published widget URL is permanent. Configure each URL in Zoho Creator
once and never add a release number or change the pointer during promotions.
The URL pattern is:

```text
https://rbelliveau-wbw.github.io/land-master/{dev|stage|prod}/{widget-slug}
```

Supported widget slugs are `proforma-manager`, `budget-manager`, `land-master`,
`contract-management`, `tax-center`, and `milestone-gantt`.

Every environment/widget URL serves a cache-busting bootstrap. On each load it
preserves Creator query parameters and opens that environment's currently
promoted `widget.html` with a fresh cache key. Release promotion therefore
requires only a change to `deploy/environments.json`; it must never require a
Zoho Creator URL change.

## Development

1. Build and deploy Pages.
2. In Creator Development, open Application Settings → Widgets.
3. Create a widget and choose **External** hosting.
4. Use the complete permanent URL ending in `/dev/<widget-slug>/`.
5. Place it on the Development Proforma page.
6. Test initialization and all critical operations.

## Stage and Production

Do not reuse the Development path. For example, Pro Forma uses:

```text
/stage/proforma-manager/
/prod/proforma-manager/
```

Only register/promote these after the exact release has passed the prior environment.

## Backend coordination

A widget release that references a new field, function, report, or Custom API cannot be promoted before the corresponding Creator backend is deployed.
