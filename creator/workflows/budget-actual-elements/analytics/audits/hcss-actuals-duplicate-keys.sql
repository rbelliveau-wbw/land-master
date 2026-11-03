SELECT 'Baseline' AS "Audit_Version", "B"."JobCode" AS "JobCode", "B"."Minor Code" AS "Minor Code", COUNT(*) AS "Rows_For_Import_Key"
FROM (
SELECT
    H."JobCode" AS "JobCode",
    J."JobCodeFinal" AS "JobCodeFinal",
    MAX(H."CostCodeDescription") AS "CostCodeDescription",
    MAX(H."Major Code") AS "Major Code",
    H."Minor Code" AS "Minor Code",
    SUM(H."TotalActualCost") AS "TotalActualCost"
FROM "HeavyJob_CostSummaryByJobCostCode" AS H
LEFT JOIN "HeavyJob_JM_Job" AS J ON H."zzz_JobID_Guid" = J."zzz_JobId_Guid"
WHERE J."JobCode" IN
(
    SELECT "External Code"
    FROM "External System Mapping (Zoho Creator)"
)
GROUP BY H."JobCode", J."JobCodeFinal", H."Minor Code"
) AS "B"
GROUP BY "B"."JobCode", "B"."Minor Code"
HAVING COUNT(*) > 1

UNION ALL
SELECT 'Candidate' AS "Audit_Version", "A"."JobCode" AS "JobCode", "A"."Minor Code" AS "Minor Code", COUNT(*) AS "Rows_For_Import_Key"
FROM (
SELECT
    H."JobCode" AS "JobCode",
    J."JobCodeFinal" AS "JobCodeFinal",
    MAX(H."CostCodeDescription") AS "CostCodeDescription",
    MAX(H."Major Code") AS "Major Code",
    H."Minor Code" AS "Minor Code",
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
) AS "A"
GROUP BY "A"."JobCode", "A"."Minor Code"
HAVING COUNT(*) > 1
