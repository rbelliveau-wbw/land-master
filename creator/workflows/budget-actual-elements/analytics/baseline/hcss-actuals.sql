SELECT
    H."JobCode",
    J."JobCodeFinal",
    MAX(H."CostCodeDescription") AS "CostCodeDescription",
    MAX(H."Major Code") AS "Major Code",
    H."Minor Code",
    SUM(H."TotalActualCost") AS "TotalActualCost"
FROM "HeavyJob_CostSummaryByJobCostCode" AS H
LEFT JOIN "HeavyJob_JM_Job" AS J ON H."zzz_JobID_Guid" = J."zzz_JobId_Guid"
WHERE J."JobCode" IN
(
    SELECT "External Code"
    FROM "External System Mapping (Zoho Creator)"
)
GROUP BY H."JobCode", J."JobCodeFinal", H."Minor Code"
