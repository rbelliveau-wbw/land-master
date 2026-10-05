# Comment and Pro Forma save repair

Pro Forma 1.80.72 adds the missing Comment_Log_Report parent/checkbox metadata
and the decimal Per_Unit metadata to both private verification maps. The
previous map predates those fields. Creator returns lookup objects for comment
parents, and proforma_save converts blank Per_Unit to decimal zero even for
fixed-cost rows. The original whole-save fixture copied payload fields and had
no additional cost rows, so it did not exercise that server conversion.

Save response parsing now unwraps nested result/output/response/details rather
than mistaking a transport wrapper for the function result. Genuine field
differences retain the draft, identify field names without logging their values,
and block another write. Lost responses still require read-only reconciliation.
Legal 1.60.51 displays Creator's alert text in comment errors instead of raw JSON.

Affected: Comment_Log / Comment_Log_Report (Pro_Forma, Contract1, Project,
Budget, Comment, Deleted, Edited); Proforma_Item / Proforma_Item_Report
(Per_Unit). No financial formula, Custom API name, permission or approval rule
changes. Save_PF and Save_PF1 continue routing to their own environments.

Creator Development Validate_Comment_Log has been saved and reloaded with
Contract1 included as a valid parent and preserved on edits. It retains existing
author-only, 24-hour, content limit and soft-delete rules. The committed workflow
mirror already contained this correction; the live workflow had not received it.
The user will promote Creator changes; this task does not publish native Creator
changes to Production.

Regression suites exercise actual widget code with native lookup objects,
formatted decimal/currency values, fixed-cost rows, edits/deletion, missing or
wrong-parent readback, nested API responses and genuine persisted mismatches.
Both Development and Production routing are covered synthetically. No business
record save or comment post has been executed as a live test.

Widget rollback: Pro Forma 1.80.71 and Legal 1.60.50 restore the prior frontend,
including its verification defects. Emergency pre-SDK2 recovery: Pro Forma
1.80.65 uses SDK1. Promote by changing the stable environment mapping; do not
change Creator widget URLs. Never replay an uncertain save from an old tab;
review the exact Creator record and preserve the draft before reloading.
