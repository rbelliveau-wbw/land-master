# Hide/Disable Fields - Budget: manual site metrics

Creator Development workflow: `Hide_Disable_Fields_Budge` (Add Budget form, created or edited, on load).

The 2026-08 exported action under `creator/raw/workflow-section.ds` disables the three header quantities. Remove only these three statements from the live action:

```diff
 disable Project;
 disable Phase;
-disable Acres;
-disable Equiv_LF_of_Street;
-disable Lot_Total_Residential;
 disable Status;
 disable Subdivision_Code;
```

Keep the rest of the load action, including the total and approval controls, unchanged. The widget's edit and approval permissions still govern whether the header inputs appear editable there. This patch is intentionally scoped: the historical `.ds` export is not a deployable replacement for the current live workflow.
