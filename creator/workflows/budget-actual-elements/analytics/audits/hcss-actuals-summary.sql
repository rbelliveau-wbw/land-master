SELECT 'Baseline' AS "Version", COUNT(*) AS "Row_Count",
    ROUND(SUM("Audit_Baseline"."TotalActualCost"), 4) AS "Grand_Total",
    SUM(CASE WHEN "Audit_Baseline"."TotalActualCost" < 0 THEN 1 ELSE 0 END) AS "Negative_Group_Count",
    ROUND(SUM(CASE WHEN "Audit_Baseline"."TotalActualCost" < 0 THEN "Audit_Baseline"."TotalActualCost" ELSE 0 END), 4) AS "Negative_Group_Total",
    SUM("Audit_Baseline"."Source_Credit_Rows") AS "Source_Credit_Rows",
    ROUND(SUM("Audit_Baseline"."Source_Credit_Amount"), 4) AS "Source_Credit_Amount",
    NULL AS "Residual_Rows", NULL AS "Residual_Amount",
    NULL AS "Residual_Absolute_Amount", NULL AS "Unclassified_Count"
FROM (
SELECT
    H."JobCode" AS "JobCode",
    J."JobCodeFinal" AS "JobCodeFinal",
    MAX(H."CostCodeDescription") AS "CostCodeDescription",
    MAX(H."Major Code") AS "Major Code",
    H."Minor Code" AS "Minor Code",
    SUM(H."TotalActualCost") AS "TotalActualCost",
    SUM(CASE WHEN H."TotalActualCost" < 0 THEN 1 ELSE 0 END) AS "Source_Credit_Rows",
    SUM(CASE WHEN H."TotalActualCost" < 0 THEN H."TotalActualCost" ELSE 0 END) AS "Source_Credit_Amount"
FROM "HeavyJob_CostSummaryByJobCostCode" AS H
LEFT JOIN "HeavyJob_JM_Job" AS J ON H."zzz_JobID_Guid" = J."zzz_JobId_Guid"
WHERE J."JobCode" IN
(
    SELECT "External Code"
    FROM "External System Mapping (Zoho Creator)"
)
GROUP BY H."JobCode", J."JobCodeFinal", H."Minor Code"
) AS "Audit_Baseline"
UNION ALL
SELECT 'Candidate' AS "Version", COUNT(*) AS "Row_Count",
    ROUND(SUM("Audit_Candidate"."TotalActualCost"), 4) AS "Grand_Total",
    SUM(CASE WHEN "Audit_Candidate"."TotalActualCost" < 0 THEN 1 ELSE 0 END) AS "Negative_Group_Count",
    ROUND(SUM(CASE WHEN "Audit_Candidate"."TotalActualCost" < 0 THEN "Audit_Candidate"."TotalActualCost" ELSE 0 END), 4) AS "Negative_Group_Total",
    SUM("Audit_Candidate"."Source_Credit_Rows") AS "Source_Credit_Rows",
    ROUND(SUM("Audit_Candidate"."Source_Credit_Amount"), 4) AS "Source_Credit_Amount",
    SUM(CASE WHEN ABS("Audit_Candidate"."Unclassified_Actuals") >= 0.00005 THEN 1 ELSE 0 END) AS "Residual_Rows",
    ROUND(SUM("Audit_Candidate"."Unclassified_Actuals"), 4) AS "Residual_Amount",
    ROUND(SUM(ABS("Audit_Candidate"."Unclassified_Actuals")), 4) AS "Residual_Absolute_Amount",
    NULL AS "Unclassified_Count"
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
    SUM(CASE WHEN H."TotalActualCost" < 0 THEN 1 ELSE 0 END) AS "Source_Credit_Rows",
    SUM(CASE WHEN H."TotalActualCost" < 0 THEN H."TotalActualCost" ELSE 0 END) AS "Source_Credit_Amount"
FROM "HeavyJob_CostSummaryByJobCostCode" AS H
LEFT JOIN "HeavyJob_JM_Job" AS J ON H."zzz_JobID_Guid" = J."zzz_JobId_Guid"
WHERE J."JobCode" IN
(
    SELECT "External Code"
    FROM "External System Mapping (Zoho Creator)"
)
GROUP BY H."JobCode", J."JobCodeFinal", H."Minor Code"
) AS "Audit_Candidate"
