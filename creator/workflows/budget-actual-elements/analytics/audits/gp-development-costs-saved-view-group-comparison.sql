SELECT "B"."WS_Job_Number_Trim" AS "Baseline_WS_Job_Number_Trim",
    "A"."WS_Job_Number_Trim" AS "Candidate_WS_Job_Number_Trim",
    "B"."Cost_Code_Number_1" AS "Baseline_Cost_Code_Number_1",
    "A"."Cost_Code_Number_1" AS "Candidate_Cost_Code_Number_1",
    "B"."Cost_Code_Number_2" AS "Baseline_Cost_Code_Number_2",
    "A"."Cost_Code_Number_2" AS "Candidate_Cost_Code_Number_2",
    "B"."Cost_Code_Description" AS "Baseline_Cost_Code_Description",
    "A"."Cost_Code_Description" AS "Candidate_Cost_Code_Description",
    CASE WHEN "B"."Audit_Row_Present" IS NULL THEN 0 ELSE 1 END AS "Baseline_Rows",
    CASE WHEN "A"."WS_Job_Number_Trim" IS NULL THEN 0 ELSE 1 END AS "Candidate_Rows",
    ROUND("B"."Total_Actuals", 4) AS "Baseline_Total", ROUND("A"."Total_Actuals", 4) AS "Candidate_Total"
FROM (
SELECT
    WS_Job_Number_Trim,
    MIN(Cost_Code_Number_1) AS Cost_Code_Number_1,
    Cost_Code_Number_2,
    Cost_Code_Description,
    SUM(Cost_Code_Act_Cost_TTD) AS Total_Actuals,
    1 AS "Audit_Row_Present"
FROM [GP - Job Cost Detail MSTR+HIST (JC00701+JC30101)]
WHERE ((Cost_Code_Number_2 >= 4000 AND Cost_Code_Number_2 < 5000)
    OR (Cost_Code_Number_2 >= 8000 AND Cost_Code_Number_2 < 9000))
    AND Cost_Code_Act_Cost_TTD <> 0
    AND WS_Job_Number_Trim IN
    (
        SELECT [External Code]
        FROM [External System Mapping (Zoho Creator)]
    )
GROUP BY WS_Job_Number_Trim, Cost_Code_Number_2, Cost_Code_Description
) AS "B"
LEFT JOIN "Great Plains - Development Costs for Budget" AS "A" ON ("B"."WS_Job_Number_Trim" = "A"."WS_Job_Number_Trim" OR ("B"."WS_Job_Number_Trim" IS NULL AND "A"."WS_Job_Number_Trim" IS NULL))
    AND ("B"."Cost_Code_Number_2" = "A"."Cost_Code_Number_2" OR ("B"."Cost_Code_Number_2" IS NULL AND "A"."Cost_Code_Number_2" IS NULL))
    AND ("B"."Cost_Code_Description" = "A"."Cost_Code_Description" OR ("B"."Cost_Code_Description" IS NULL AND "A"."Cost_Code_Description" IS NULL))
WHERE "A"."WS_Job_Number_Trim" IS NULL
    OR (ROUND("B"."Total_Actuals", 4) <> ROUND("A"."Total_Actuals", 4) OR (ROUND("B"."Total_Actuals", 4) IS NULL AND ROUND("A"."Total_Actuals", 4) IS NOT NULL) OR (ROUND("B"."Total_Actuals", 4) IS NOT NULL AND ROUND("A"."Total_Actuals", 4) IS NULL))
    OR ("B"."Cost_Code_Number_1" <> "A"."Cost_Code_Number_1" OR ("B"."Cost_Code_Number_1" IS NULL AND "A"."Cost_Code_Number_1" IS NOT NULL) OR ("B"."Cost_Code_Number_1" IS NOT NULL AND "A"."Cost_Code_Number_1" IS NULL))
UNION ALL
SELECT "B"."WS_Job_Number_Trim" AS "Baseline_WS_Job_Number_Trim",
    "A"."WS_Job_Number_Trim" AS "Candidate_WS_Job_Number_Trim",
    "B"."Cost_Code_Number_1" AS "Baseline_Cost_Code_Number_1",
    "A"."Cost_Code_Number_1" AS "Candidate_Cost_Code_Number_1",
    "B"."Cost_Code_Number_2" AS "Baseline_Cost_Code_Number_2",
    "A"."Cost_Code_Number_2" AS "Candidate_Cost_Code_Number_2",
    "B"."Cost_Code_Description" AS "Baseline_Cost_Code_Description",
    "A"."Cost_Code_Description" AS "Candidate_Cost_Code_Description",
    CASE WHEN "B"."Audit_Row_Present" IS NULL THEN 0 ELSE 1 END AS "Baseline_Rows",
    CASE WHEN "A"."WS_Job_Number_Trim" IS NULL THEN 0 ELSE 1 END AS "Candidate_Rows",
    ROUND("B"."Total_Actuals", 4) AS "Baseline_Total", ROUND("A"."Total_Actuals", 4) AS "Candidate_Total"
FROM "Great Plains - Development Costs for Budget" AS "A"
LEFT JOIN (
SELECT
    WS_Job_Number_Trim,
    MIN(Cost_Code_Number_1) AS Cost_Code_Number_1,
    Cost_Code_Number_2,
    Cost_Code_Description,
    SUM(Cost_Code_Act_Cost_TTD) AS Total_Actuals,
    1 AS "Audit_Row_Present"
FROM [GP - Job Cost Detail MSTR+HIST (JC00701+JC30101)]
WHERE ((Cost_Code_Number_2 >= 4000 AND Cost_Code_Number_2 < 5000)
    OR (Cost_Code_Number_2 >= 8000 AND Cost_Code_Number_2 < 9000))
    AND Cost_Code_Act_Cost_TTD <> 0
    AND WS_Job_Number_Trim IN
    (
        SELECT [External Code]
        FROM [External System Mapping (Zoho Creator)]
    )
GROUP BY WS_Job_Number_Trim, Cost_Code_Number_2, Cost_Code_Description
) AS "B" ON ("B"."WS_Job_Number_Trim" = "A"."WS_Job_Number_Trim" OR ("B"."WS_Job_Number_Trim" IS NULL AND "A"."WS_Job_Number_Trim" IS NULL))
    AND ("B"."Cost_Code_Number_2" = "A"."Cost_Code_Number_2" OR ("B"."Cost_Code_Number_2" IS NULL AND "A"."Cost_Code_Number_2" IS NULL))
    AND ("B"."Cost_Code_Description" = "A"."Cost_Code_Description" OR ("B"."Cost_Code_Description" IS NULL AND "A"."Cost_Code_Description" IS NULL))
WHERE "B"."Audit_Row_Present" IS NULL
