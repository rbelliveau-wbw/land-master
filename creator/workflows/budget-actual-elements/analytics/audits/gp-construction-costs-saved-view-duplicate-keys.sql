SELECT 'Baseline' AS "Audit_Version", "B"."WS_Job_Number_Trim" AS "WS_Job_Number_Trim", "B"."Cost_Code_Number_2" AS "Cost_Code_Number_2", COUNT(*) AS "Rows_For_Import_Key"
FROM (
SELECT
    "WS_Job_Number_Trim",
    "Cost_Code_Number_1",
    "Cost_Code_Number_2",
    MAX("Cost_Code_Description") AS "Cost_Code_Description",
    ROUND(SUM("Cost_Code_Act_Cost_TTD"), 2) AS "Total_Actuals"
FROM "GP - Job Cost Detail MSTR+HIST (JC00701+JC30101)"
WHERE "Cost_Code_Number_2" >= 3000
    AND "Cost_Code_Number_2" < 4000
    AND "Cost_Code_Act_Cost_TTD" > 0
    AND "WS_Job_Number_Trim" IN
    (
        SELECT "External Code"
        FROM "External System Mapping (Zoho Creator)"
    )
GROUP BY "WS_Job_Number_Trim", "Cost_Code_Number_1", "Cost_Code_Number_2"
) AS "B"
GROUP BY "B"."WS_Job_Number_Trim", "B"."Cost_Code_Number_2"
HAVING COUNT(*) > 1
UNION ALL
SELECT 'Candidate' AS "Audit_Version", "A"."WS_Job_Number_Trim" AS "WS_Job_Number_Trim", "A"."Cost_Code_Number_2" AS "Cost_Code_Number_2", COUNT(*) AS "Rows_For_Import_Key"
FROM "GP - Const Cost Actuals" AS "A"
GROUP BY "A"."WS_Job_Number_Trim", "A"."Cost_Code_Number_2"
HAVING COUNT(*) > 1
