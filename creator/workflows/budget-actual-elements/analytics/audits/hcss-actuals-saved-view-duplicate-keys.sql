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
SELECT 'Candidate' AS "Audit_Version", "A"."H.JobCode" AS "JobCode", "A"."H.Minor Code" AS "Minor Code", COUNT(*) AS "Rows_For_Import_Key"
FROM "HeavyJob Actual Costs joined w/ Subdivs" AS "A"
GROUP BY "A"."H.JobCode", "A"."H.Minor Code"
HAVING COUNT(*) > 1
