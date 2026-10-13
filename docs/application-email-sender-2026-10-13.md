# Application email sender

Land Master application emails use `Notifications@wbdevelopment.com`.
Creator package: 9.78, promoted through Stage to Production.
The previous budget approval and reminder recap senders were Julie's address;
modification notices and watchdog reports also used personal addresses.

Creator deployment changes only the sender in `sendApprovalEmail`,
`sendApprovalReminders`, `sendModificationEmail`, and `approvalWatchdog`.
The live Development editors were compared with repository source before
editing and the saved functions were reopened to verify persistence.

`Review_LOI_Request` and `reportProformaWidgetError` already used Notifications
in Creator; their older repository copies now match that sender. The optional
`Neutralize_Extra_Settings_Record` workflow source also uses Notifications.
It is absent from the current export and is not created or activated by this
release. Existing exported form and workflow-function email senders already
use Notifications. Historical exports and raw extracts retain their original
snapshot content.

PO, contract, pro forma approval/completion, and LOI-submission senders were
checked in their live Creator editors and already use Notifications.
Recipients, subjects, body content, routing, delivery stamps, schedules, and
permissions are unchanged. No forms, fields, Custom APIs, or widget assets
are added or changed. Budget Manager remains 122.29.26.

Validation: `scripts/test-email-senders.mjs` checks every sendmail sender in
deployable function/workflow source, including indirect sender assignments;
it is included in `npm run validate`. Required repository validation and
Pages build passed. No reminder sweep, watchdog repair, approval transition,
or production resend is run as a deployment test.

Rollback: restore the four prior live function bodies from Creator 9.77 or
commit f790be8 and promote them through Stage to Production. Widget rollback
is unnecessary because widget releases and environment mappings are unchanged.
