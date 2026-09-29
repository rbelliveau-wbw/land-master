# Lockdown Fields/Form - Budget Category: per-unit source lock

Scoped change applied to Creator Development workflow `Lockdown_Fields_Form_Budg` (display name **Lockdown Fields/Form - Budget Category**). The trigger is `Budget_Category` **on add or edit → on load**.

The historical `creator/raw/workflow-section.ds` export disables the `Budget_Items.Prelim_Budget_Ttl` subform field when the parent budget has `Lock_Prelim_Budget == TRUE`. Add the two new `Budget_Item` source fields to that same condition:

```diff
 //IF BUDGET HAS PRELIM OR FINAL LOCKED THEN LOCKDOWN ITEMS INPUT
 if(input.Budget.Lock_Prelim_Budget == TRUE)
 {
     disable Budget_Items.Prelim_Budget_Ttl;
+    disable Budget_Items.Unit;
+    disable Budget_Items.Per_Unit;
 }
```

`Budget_Items` is the subform link on `Budget_Category`; `Unit` and `Per_Unit` are fields on its `Budget_Item` rows. The rest of the live action, including the Construction `Budget_Ttl` condition, was retained. The action was saved in Creator Development on 2026-09-29; a fresh workflow page showed both new `disable` lines in the saved script. Creator promotion remains with the owner.
