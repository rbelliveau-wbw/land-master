# User Access full names

Contracts, Budget Manager and Pro Forma owner pickers, list pills, detail/editor
headers, summaries and exports display User_Access.Full_Name. The existing
Get_User_Access and lean access APIs expose it as fullName. String names and
first_name/last_name objects are supported; actual full names are never shortened
at underscores or email delimiters. Blank names retain the existing login fallback.
Choices sort by the displayed name. Stored owner IDs, raw login/email identities,
permissions and approval recipients are unchanged. Existing attachment/comment
author resolution already prefers the roster full name.

Changed files: the three widget HTML sources, version/hash manifests, production
mapping, immutable releases, owner display regression and module/style docs.
Affected existing lookups: Contract.Owner, Add_Budget.Budget_Owner and
Add_Pro_Forma.Owner, all to User_Access. No forms/fields/functions/APIs are added
or changed for name display; it requires no further Creator backend publication.

Regression covers full names with underscores, blank and object names, exact
large string IDs, raw email resolution, owner modal/list labels and sorting.
Full repository validation also covers owner permission and approval routing.
The Contracts left summary now omits Subdivision when no value is selected.

Production releases: Contracts 1.61.22, Budget 122.28.30, Pro Forma 1.80.89.
Widget rollback mappings: Contracts 1.61.19, Budget 122.28.29, Pro Forma 1.80.88.
Contracts rollback guidance also applies to the concurrent Parent Contract
feature; see [relationship deployment and rollback](contract-parent-assignment.md).
