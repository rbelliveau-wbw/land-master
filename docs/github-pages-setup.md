
# GitHub Pages Setup

1. Open repository **Settings → Pages**.
2. Select **GitHub Actions** as the publishing source.
3. Run or re-run the **Deploy Widget Pages** workflow.
4. Open the workflow deployment URL.
5. Confirm `/dev/proforma-manager/` loads directly.

The workflow uses the current GitHub Pages actions and publishes only `dist/`.

## Custom domain

Recommended:

```text
widgets.wbdevelopment.com
```

Configure the domain in repository Pages settings and create the DNS record GitHub specifies. Do not hardcode the custom domain into widget source until DNS and HTTPS are working.
