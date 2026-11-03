SELECT 'Baseline' AS "Version", COUNT(*) AS "Row_Count",
    ROUND(SUM("Audit_Baseline"."Total_Actuals"), 4) AS "Grand_Total",
    SUM(CASE WHEN "Audit_Baseline"."Total_Actuals" < 0 THEN 1 ELSE 0 END) AS "Negative_Group_Count",
    ROUND(SUM(CASE WHEN "Audit_Baseline"."Total_Actuals" < 0 THEN "Audit_Baseline"."Total_Actuals" ELSE 0 END), 4) AS "Negative_Group_Total",
    SUM("Audit_Baseline"."Source_Credit_Rows") AS "Source_Credit_Rows",
    ROUND(SUM("Audit_Baseline"."Source_Credit_Amount"), 4) AS "Source_Credit_Amount",
    NULL AS "Residual_Rows", NULL AS "Residual_Amount",
    NULL AS "Residual_Absolute_Amount", NULL AS "Unclassified_Count"
FROM (
SELECT
    "WS_Job_Number_Trim",
    "Cost_Code_Number_1",
    "Cost_Code_Number_2",
    MAX("Cost_Code_Description") AS "Cost_Code_Description",
    ROUND(SUM("Cost_Code_Act_Cost_TTD"), 2) AS "Total_Actuals",
    SUM(CASE WHEN Cost_Code_Act_Cost_TTD < 0 THEN 1 ELSE 0 END) AS "Source_Credit_Rows",
    SUM(CASE WHEN Cost_Code_Act_Cost_TTD < 0 THEN Cost_Code_Act_Cost_TTD ELSE 0 END) AS "Source_Credit_Amount"
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
) AS "Audit_Baseline"
UNION ALL
SELECT 'Candidate' AS "Version", COUNT(*) AS "Row_Count",
    ROUND(SUM("Audit_Candidate"."Total_Actuals"), 4) AS "Grand_Total",
    SUM(CASE WHEN "Audit_Candidate"."Total_Actuals" < 0 THEN 1 ELSE 0 END) AS "Negative_Group_Count",
    ROUND(SUM(CASE WHEN "Audit_Candidate"."Total_Actuals" < 0 THEN "Audit_Candidate"."Total_Actuals" ELSE 0 END), 4) AS "Negative_Group_Total",
    SUM("Audit_Candidate"."Source_Credit_Rows") AS "Source_Credit_Rows",
    ROUND(SUM("Audit_Candidate"."Source_Credit_Amount"), 4) AS "Source_Credit_Amount",
    SUM(CASE WHEN ABS("Audit_Candidate"."Total_Actuals" - ROUND("Audit_Candidate"."Labor" + "Audit_Candidate"."Materials" + "Audit_Candidate"."Equipment" + "Audit_Candidate"."Subcontractor" + "Audit_Candidate"."Other", 2)) >= 0.00005 THEN 1 ELSE 0 END) AS "Residual_Rows",
    ROUND(SUM("Audit_Candidate"."Total_Actuals" - ROUND("Audit_Candidate"."Labor" + "Audit_Candidate"."Materials" + "Audit_Candidate"."Equipment" + "Audit_Candidate"."Subcontractor" + "Audit_Candidate"."Other", 2)), 4) AS "Residual_Amount",
    ROUND(SUM(ABS("Audit_Candidate"."Total_Actuals" - ROUND("Audit_Candidate"."Labor" + "Audit_Candidate"."Materials" + "Audit_Candidate"."Equipment" + "Audit_Candidate"."Subcontractor" + "Audit_Candidate"."Other", 2))), 4) AS "Residual_Absolute_Amount",
    SUM("Audit_Candidate"."Unclassified_Count") AS "Unclassified_Count"
FROM (
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
    SUM(CASE WHEN "Cost_Element" IN (1, 2, 3, 4, 5) THEN 0 ELSE 1 END) AS "Unclassified_Count",
    SUM(CASE WHEN Cost_Code_Act_Cost_TTD < 0 THEN 1 ELSE 0 END) AS "Source_Credit_Rows",
    SUM(CASE WHEN Cost_Code_Act_Cost_TTD < 0 THEN Cost_Code_Act_Cost_TTD ELSE 0 END) AS "Source_Credit_Amount"
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
) AS "Audit_Candidate"
