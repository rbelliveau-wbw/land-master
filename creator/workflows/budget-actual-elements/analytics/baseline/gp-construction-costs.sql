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
ORDER BY "WS_Job_Number_Trim", "Cost_Code_Number_1", "Cost_Code_Number_2"
