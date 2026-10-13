# Native Development evidence

`*.after.dg` and `*.builder-capture.json` are the final authoritative saved and independently reloaded source evidence. Builder captures include the count of all native script actions; every changed workflow has exactly one. Captures supplied by the root agent are identified in their verificationBy property.

`*.rejected-duplicate-actions.ds` are obsolete, rejected audit records of an IDE workflow save that appended duplicate script actions. They are retained to document the issue and are not deployment inputs or final after-state evidence. All affected native workflows were repaired through the Workflow Builder before publication. `*.before.*` and `*.repo-before.dg` preserve baselines.

No workflow was executed and no approval mail was sent during installation. Production publication is tracked by the root deployment process.
