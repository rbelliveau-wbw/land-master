# Lot Master and Amendment release

Contract Management 1.60.36 adds two Lot types; 1.60.37 removes a stale builder hint identified in the production smoke check. Rename the native Contract.Contract_Type choice Lot to Lot (Master), and add Lot (Amendment). Rename the corresponding Contract_Actions.Type_field choice and add Amendment there as well. Creator applies the renamed choice to existing records; there is no bulk record migration.

Master subdivisions are optional. Lot selection, pricing and takedown terms appear once a subdivision is selected. A Master without subdivisions or lots can complete without creating schedules or writing Lots. Amendment subdivisions are required at creation, editing and completion.

Contract.Parent_Contract is an optional single Contract lookup displayed by Contract_Name. Native criteria: `((Contract_Type == "Lot (Master)") && (Builder.ID == input.Builder))`. Mandatory remains unchecked. All_Contracts1 quick and detail views expose Parent_Contract. The widget filters to Masters with the same Builder, clears stale draft parents when the builder changes, and rechecks the parent before saving. Server validation rejects non-Masters, different builders and self links when a parent is provided. Blank parents remain valid.

Both types share the Lot section. Linked Amendments are indented below their Master, carry an Amendment badge and show the parent's name. Filtered children remain visible when their parent is filtered out. Unlinked Amendments retain their own row.

Native deployment includes Complete_Lot_Contract and Contract workflows Field_Validations_Contrac, Lot_Contract_Required_Fie, Show_Type_Specific_Fields, Set_Subdivision_Fields_Co, Hide_Lockdown_Fields_Cont, Create_Takedown_Schedule_1 and Set_Lot_Base_Price_Builde. Existing schedule creation and subdivision-derived fields are retained. No new Custom API registration is required.

The existing temporary backfill rules apply to both types: completed owners can change Lots & Pricing; all Lot statuses are eligible unless another Contract.Lots1 claims the Lot. Completion fills only absent Base_Price, Escalator, Builder1, Status, Contract1 and Contract_Schedule. Existing values, including zero, remain intact; Lot_Size and other Lot fields are untouched.

Regression: optional Master scope, required Amendment subdivision, blank parent, matching/mismatched builder, self/Amendment parent rejection, hierarchy order with filters, both types in one Lot group, creation/editing/completion guards, and existing owner/claim/fill-only protections. Run npm run validate and npm run build:pages. Creator scripts must compile and be saved before publishing. UI smoke checks do not submit contracts or execute completion against live records.

Rollback: promote widget 1.60.35 and restore the prior Creator V9.21 function/workflow bodies if needed. Retain Parent_Contract and the new type choices if records already use them; removing those choices or the lookup may lose information. An older widget does not understand Amendment records, so coordinate any rollback with those records and retain the fill-only guards.
