
# Zoho Creator External Widget Setup

Use Proforma as the pilot.

## Development

1. Build and deploy Pages.
2. In Creator Development, open Application Settings → Widgets.
3. Create a widget and choose **External** hosting.
4. Use the complete URL ending in `/dev/proforma-manager/`.
5. Place it on the Development Proforma page.
6. Test initialization and all critical operations.

## Stage and Production

Do not reuse the Development path. Use:

```text
/stage/proforma-manager/
/prod/proforma-manager/
```

Only register/promote these after the exact release has passed the prior environment.

The Production Pro Forma URL is a permanent cache-busting bootstrap URL:

```text
https://rbelliveau-wbw.github.io/land-master/prod/proforma-manager
```

Register that URL in Creator once. Do not add a release number or manually
change it during later promotions. On each load, the bootstrap preserves
Creator query parameters and opens the currently promoted `widget.html` with a
fresh cache key so an iframe cannot remain pinned to an older release.

## Backend coordination

A widget release that references a new field, function, report, or Custom API cannot be promoted before the corresponding Creator backend is deployed.
