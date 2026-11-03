SELECT
    H."JobCode",
    J."JobCodeFinal",
    MAX(H."CostCodeDescription") AS "CostCodeDescription",
    MAX(H."Major Code") AS "Major Code",
    H."Minor Code",
    SUM(H."TotalActualCost") AS "TotalActualCost",
    SUM(COALESCE(H."ActualLaborCost", 0)) AS "Labor",
    SUM(COALESCE(H."ActualMaterialCost", 0)) AS "Materials",
    SUM(COALESCE(H."ActualEquipmentCost", 0)) AS "Equipment",
    SUM(COALESCE(H."ActualSubcontractCost", 0)) AS "Subcontractor",
    SUM(COALESCE(H."Actual_Misc1_Cost", 0)) AS "Other",
    SUM(H."TotalActualCost")
        - SUM(COALESCE(H."ActualLaborCost", 0)
            + COALESCE(H."ActualMaterialCost", 0)
            + COALESCE(H."ActualEquipmentCost", 0)
            + COALESCE(H."ActualSubcontractCost", 0)
            + COALESCE(H."Actual_Misc1_Cost", 0)) AS "Unclassified_Actuals"
FROM "HeavyJob_CostSummaryByJobCostCode" AS H
LEFT JOIN "HeavyJob_JM_Job" AS J ON H."zzz_JobID_Guid" = J."zzz_JobId_Guid"
WHERE J."JobCode" IN
(
    SELECT "External Code"
    FROM "External System Mapping (Zoho Creator)"
)
GROUP BY H."JobCode", J."JobCodeFinal", H."Minor Code"
