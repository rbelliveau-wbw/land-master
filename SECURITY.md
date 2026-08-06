
# Security

## Repository visibility

Keep this repository **private**. The Creator export contains internal schema, workflow logic, email addresses, connection names, and published-page identifiers.

## GitHub Pages visibility

A GitHub Pages site can be publicly reachable even when its source repository is private, depending on the GitHub plan and Pages configuration. The Pages build in this repository publishes only widget release files and a minimal index. It does not publish the Creator export, knowledge base, manifests, or Deluge source.

Browser-delivered widget HTML and JavaScript must never contain:

- OAuth client secrets or refresh tokens
- Creator connection credentials
- GitHub tokens
- passwords
- private keys
- unredacted production exports

Use Creator authentication, Creator Custom APIs, or controlled server-side middleware for sensitive operations.

## Production protection

- Protect `main`.
- Require pull requests and CI.
- Require a human reviewer for production promotion.
- Do not grant Codex direct production deployment permission.
- Rotate any published-page token that is believed to be exposed outside authorized use.
