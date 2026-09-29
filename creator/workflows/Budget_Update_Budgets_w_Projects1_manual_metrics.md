# Update Budgets w/ Projects Info - Budget: stop site metric writes

Creator Development schedule: `Update_Budgets_w_Projects1` (Settings, based on Next Workflow Run; three actions). The live schedule was inspected on 2026-09-29. Development schedule executions are suspended by Environment Settings.

Retain action 1, which imports Zoho Analytics values to Subdivision. In action 2, retain Project and Phase assignments but remove these three `Budget_Category` writes:

```diff
 budgCat.Project=subdiv.Project.Project_Name.toUpperCase();
 budgCat.Phase=if(subdiv.Subphase == "","PHASE " + subdiv.Phase,"PHASE " + subdiv.Phase + "-" + subdiv.Subphase);
-budgCat.Acres=subdiv.Acres;
-budgCat.Equiv_LF_of_Street=subdiv.Equiv_LF_of_Street;
-budgCat.Lot_Total_Residential=subdiv.Lot_Total_Residential;
```

In action 3, retain Project, Status, and Phase assignments but remove these three `Add_Budget` writes:

```diff
 budG.Project=subdiv.Project.Project_Name.toUpperCase();
 budG.Status=subdiv.Projects_Status;
 budG.Phase=if(subdiv.Subphase == "","PHASE " + subdiv.Phase,"PHASE " + subdiv.Phase + "-" + subdiv.Subphase);
-budG.Acres=subdiv.Acres;
-budG.Equiv_LF_of_Street=subdiv.Equiv_LF_of_Street;
-budG.Lot_Total_Residential=subdiv.Lot_Total_Residential;
```

This preserves the unrelated Subdivision feed and project identity/status sync while ensuring the Budget's Acres, Lots, and Equiv. LF can no longer be overwritten by this schedule. `Lot_Price` and `Land_Cost` are not written by the schedule. Existing stored values are not cleared or backfilled. This is a scoped patch, not a replacement for the live schedule's full action bodies.
