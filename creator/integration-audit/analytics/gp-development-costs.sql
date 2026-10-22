SELECT
    WS_Job_Number_Trim,
    MIN(Cost_Code_Number_1) AS Cost_Code_Number_1,
    Cost_Code_Number_2,
    Cost_Code_Description,
    SUM(Cost_Code_Act_Cost_TTD) AS Total_Actuals
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
ORDER BY WS_Job_Number_Trim, Cost_Code_Number_1, Cost_Code_Number_2
