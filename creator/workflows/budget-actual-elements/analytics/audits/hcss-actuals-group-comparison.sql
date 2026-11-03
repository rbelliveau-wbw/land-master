SELECT "B"."JobCode" AS "Baseline_JobCode",
    "A"."JobCode" AS "Candidate_JobCode",
    "B"."JobCodeFinal" AS "Baseline_JobCodeFinal",
    "A"."JobCodeFinal" AS "Candidate_JobCodeFinal",
    "B"."CostCodeDescription" AS "Baseline_CostCodeDescription",
    "A"."CostCodeDescription" AS "Candidate_CostCodeDescription",
    "B"."Major Code" AS "Baseline_Major Code",
    "A"."Major Code" AS "Candidate_Major Code",
    "B"."Minor Code" AS "Baseline_Minor Code",
    "A"."Minor Code" AS "Candidate_Minor Code",
    CASE WHEN "B"."Audit_Row_Present" IS NULL THEN 0 ELSE 1 END AS "Baseline_Rows",
    CASE WHEN "A"."Audit_Row_Present" IS NULL THEN 0 ELSE 1 END AS "Candidate_Rows",
    ROUND("B"."TotalActualCost", 4) AS "Baseline_Total", ROUND("A"."TotalActualCost", 4) AS "Candidate_Total"
FROM (
SELECT
    H."JobCode" AS "JobCode",
    J."JobCodeFinal" AS "JobCodeFinal",
    MAX(H."CostCodeDescription") AS "CostCodeDescription",
    MAX(H."Major Code") AS "Major Code",
    H."Minor Code" AS "Minor Code",
    SUM(H."TotalActualCost") AS "TotalActualCost",
    1 AS "Audit_Row_Present"
FROM "HeavyJob_CostSummaryByJobCostCode" AS H
LEFT JOIN "HeavyJob_JM_Job" AS J ON H."zzz_JobID_Guid" = J."zzz_JobId_Guid"
WHERE J."JobCode" IN
(
    SELECT "External Code"
    FROM "External System Mapping (Zoho Creator)"
)
GROUP BY H."JobCode", J."JobCodeFinal", H."Minor Code"
) AS "B"
LEFT JOIN (
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
            + COALESCE(H."Actual_Misc1_Cost", 0)) AS "Unclassified_Actuals",
    1 AS "Audit_Row_Present"
FROM "HeavyJob_CostSummaryByJobCostCode" AS H
LEFT JOIN "HeavyJob_JM_Job" AS J ON H."zzz_JobID_Guid" = J."zzz_JobId_Guid"
WHERE J."JobCode" IN
(
    SELECT "External Code"
    FROM "External System Mapping (Zoho Creator)"
)
GROUP BY H."JobCode", J."JobCodeFinal", H."Minor Code"
) AS "A" ON ("B"."JobCode" = "A"."JobCode" OR ("B"."JobCode" IS NULL AND "A"."JobCode" IS NULL))
    AND ("B"."JobCodeFinal" = "A"."JobCodeFinal" OR ("B"."JobCodeFinal" IS NULL AND "A"."JobCodeFinal" IS NULL))
    AND ("B"."Minor Code" = "A"."Minor Code" OR ("B"."Minor Code" IS NULL AND "A"."Minor Code" IS NULL))
WHERE "A"."Audit_Row_Present" IS NULL
    OR (ROUND("B"."TotalActualCost", 4) <> ROUND("A"."TotalActualCost", 4) OR (ROUND("B"."TotalActualCost", 4) IS NULL AND ROUND("A"."TotalActualCost", 4) IS NOT NULL) OR (ROUND("B"."TotalActualCost", 4) IS NOT NULL AND ROUND("A"."TotalActualCost", 4) IS NULL))
    OR ("B"."CostCodeDescription" <> "A"."CostCodeDescription" OR ("B"."CostCodeDescription" IS NULL AND "A"."CostCodeDescription" IS NOT NULL) OR ("B"."CostCodeDescription" IS NOT NULL AND "A"."CostCodeDescription" IS NULL))
    OR ("B"."Major Code" <> "A"."Major Code" OR ("B"."Major Code" IS NULL AND "A"."Major Code" IS NOT NULL) OR ("B"."Major Code" IS NOT NULL AND "A"."Major Code" IS NULL))
UNION ALL
SELECT "B"."JobCode" AS "Baseline_JobCode",
    "A"."JobCode" AS "Candidate_JobCode",
    "B"."JobCodeFinal" AS "Baseline_JobCodeFinal",
    "A"."JobCodeFinal" AS "Candidate_JobCodeFinal",
    "B"."CostCodeDescription" AS "Baseline_CostCodeDescription",
    "A"."CostCodeDescription" AS "Candidate_CostCodeDescription",
    "B"."Major Code" AS "Baseline_Major Code",
    "A"."Major Code" AS "Candidate_Major Code",
    "B"."Minor Code" AS "Baseline_Minor Code",
    "A"."Minor Code" AS "Candidate_Minor Code",
    CASE WHEN "B"."Audit_Row_Present" IS NULL THEN 0 ELSE 1 END AS "Baseline_Rows",
    CASE WHEN "A"."Audit_Row_Present" IS NULL THEN 0 ELSE 1 END AS "Candidate_Rows",
    ROUND("B"."TotalActualCost", 4) AS "Baseline_Total", ROUND("A"."TotalActualCost", 4) AS "Candidate_Total"
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
            + COALESCE(H."Actual_Misc1_Cost", 0)) AS "Unclassified_Actuals",
    1 AS "Audit_Row_Present"
FROM "HeavyJob_CostSummaryByJobCostCode" AS H
LEFT JOIN "HeavyJob_JM_Job" AS J ON H."zzz_JobID_Guid" = J."zzz_JobId_Guid"
WHERE J."JobCode" IN
(
    SELECT "External Code"
    FROM "External System Mapping (Zoho Creator)"
)
GROUP BY H."JobCode", J."JobCodeFinal", H."Minor Code"
) AS "A"
LEFT JOIN (
SELECT
    H."JobCode" AS "JobCode",
    J."JobCodeFinal" AS "JobCodeFinal",
    MAX(H."CostCodeDescription") AS "CostCodeDescription",
    MAX(H."Major Code") AS "Major Code",
    H."Minor Code" AS "Minor Code",
    SUM(H."TotalActualCost") AS "TotalActualCost",
    1 AS "Audit_Row_Present"
FROM "HeavyJob_CostSummaryByJobCostCode" AS H
LEFT JOIN "HeavyJob_JM_Job" AS J ON H."zzz_JobID_Guid" = J."zzz_JobId_Guid"
WHERE J."JobCode" IN
(
    SELECT "External Code"
    FROM "External System Mapping (Zoho Creator)"
)
GROUP BY H."JobCode", J."JobCodeFinal", H."Minor Code"
) AS "B" ON ("B"."JobCode" = "A"."JobCode" OR ("B"."JobCode" IS NULL AND "A"."JobCode" IS NULL))
    AND ("B"."JobCodeFinal" = "A"."JobCodeFinal" OR ("B"."JobCodeFinal" IS NULL AND "A"."JobCodeFinal" IS NULL))
    AND ("B"."Minor Code" = "A"."Minor Code" OR ("B"."Minor Code" IS NULL AND "A"."Minor Code" IS NULL))
WHERE "B"."Audit_Row_Present" IS NULL
