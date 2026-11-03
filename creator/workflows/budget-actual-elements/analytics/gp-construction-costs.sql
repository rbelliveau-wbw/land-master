SELECT
    "WS_Job_Number_Trim",
    "Cost_Code_Number_1",
    "Cost_Code_Number_2",
    MAX("Cost_Code_Description") AS "Cost_Code_Description",
    ROUND(SUM("Cost_Code_Act_Cost_TTD"), 2) AS "Total_Actuals",
    SUM(CASE WHEN "Cost_Element" = 1 THEN "Cost_Code_Act_Cost_TTD" ELSE 0 END) AS "Labor",
    SUM(CASE WHEN "Cost_Element" = 2 THEN "Cost_Code_Act_Cost_TTD" ELSE 0 END) AS "Materials",
    SUM(CASE WHEN "Cost_Element" = 3 THEN "Cost_Code_Act_Cost_TTD" ELSE 0 END) AS "Equipment",
    SUM(CASE WHEN "Cost_Element" = 4 THEN "Cost_Code_Act_Cost_TTD" ELSE 0 END) AS "Subcontractor",
    SUM(CASE WHEN "Cost_Element" = 5 THEN "Cost_Code_Act_Cost_TTD" ELSE 0 END) AS "Other",
    SUM(CASE WHEN "Cost_Element" IN (1, 2, 3, 4, 5) THEN 0 ELSE "Cost_Code_Act_Cost_TTD" END) AS "Unclassified_Actuals",
    SUM(CASE WHEN "Cost_Element" IN (1, 2, 3, 4, 5) THEN 0 ELSE 1 END) AS "Unclassified_Count"
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
