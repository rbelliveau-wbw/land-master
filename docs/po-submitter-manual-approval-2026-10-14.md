# PO submitters remain manual approvers (2026-10-14)

Settings Manager 1.5.7: Purchase Order submission always allows its submitter to remain in their required approval step. There is no PO self-approval setting. Existing Deny values are ignored for PO routing; new and edited rules carry Allow. Other workflows retain their existing configurable behavior.

No step is skipped or automatically approved. Individual recipients, role order, all-manager approvals and manual decision guards are retained. Existing captured routes are not rewritten.

Creator changes: resolveApprovalRoute, manageApprovalPolicies and poApprovalBundle. The bundle compatibility check accepts the existing test route after its effective PO self-approval metadata becomes Allow; all other scope and recipient guards remain.

Actual-source tests cover submitting CFO and Dev Mgr, legacy Deny rules, route identities and read-only resolution. Full validation and Pages build are required. App record testing is left to the user. Rollback Settings to 1.5.6 and restore these three function sources if needed.

Native editors saved successfully and the exact three-function package 9.87 was published to Stage and verified in Production.
