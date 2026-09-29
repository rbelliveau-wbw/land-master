# Lock Category Input - Budget Category: per-unit source lock

Scoped change applied to Creator Development workflow `Lock_Category_Input_Budge` (display name **Lock Category Input - Budget Category**). The trigger is `Budget_Category` **on add or edit → on load**.

The historical `creator/raw/workflow-section.ds` export disables the `Budget_Items.Prelim_Budget_Ttl` subform field when `Lock_Category == TRUE`. Add the two new `Budget_Item` source fields to that same condition:

```diff
 if(Lock_Category == TRUE)
 {
     disable Prelim_Budget_Total;
     disable Budget_Total;
     disable Budget_Items.Budget_Ttl;
     disable Budget_Items.Prelim_Budget_Ttl;
+    disable Budget_Items.Unit;
+    disable Budget_Items.Per_Unit;
 }
```

The rest of the live action was retained. The action was saved in Creator Development on 2026-09-29; a fresh workflow page showed both new `disable` lines in the saved script. Creator promotion remains with the owner.
