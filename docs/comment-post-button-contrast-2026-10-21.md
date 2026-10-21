# Stable comment Post button

The shared Post button inherited each module's generic `.btn.primary` rules.
Hover replaced its gradient with a solid background during `transition:all`;
Budget's disabled-hover rule could turn the background white while the label
stayed white. The button also registered for whole-surface feedback fading on
every pending/terminal state change.

Post now uses the shared `.pc-post` class with its own solid, contrasting idle,
hover, active, disabled, pending, verified and warning states. Its size stays
fixed and its white text stays fully opaque. Only safe color/border/shadow
properties transition. The pending spinner remains; whole-button fading is
removed. The existing inline thread status retains shared feedback motion.

Only markup classes/motion registration and presentation change. Posting,
keyboard shortcut, duplicate-submit and unknown-outcome guards, native save
acknowledgements, owner email delivery, existing timing, drafts and permissions
are unchanged. No Creator form, field, function or Custom API changes or
publication is required. The separately requested email redesign remains a
mockup pending user selection; this release does not change that template.

Regression coverage checks all three real host cascades and preserves the
Post/Posting/Posted lifecycle, fixed size and single dispatch. Desktop local
fixtures use actual shared assets and host styles without creating records or
sending mail.

| Widget | New Development / Production | Previous Production |
|---|---|---|
| Pro Forma | 1.80.132 | 1.80.131 |
| Budget | 122.29.68 | 122.29.67 |
| Contract Management | 1.62.28 | 1.62.27 |

Rollback restores only the three Production mappings above to their previous
versions and rebuilds Pages. Development continues using the latest complete
release.
