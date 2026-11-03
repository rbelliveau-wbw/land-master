"""Build read-only SQL audits from the exact baseline/candidate query files."""

from pathlib import Path
import re


ROOT = Path(__file__).resolve().parent
AUDITS = ROOT / "audits"
ELEMENTS = ("Labor", "Materials", "Equipment", "Subcontractor", "Other")
SOURCES = {
    "gp-development-costs": {
        "saved_view": "Great Plains - Development Costs for Budget",
        "columns": ("WS_Job_Number_Trim", "Cost_Code_Number_1", "Cost_Code_Number_2", "Cost_Code_Description"),
        "keys": ("WS_Job_Number_Trim", "Cost_Code_Number_2"),
        "group_keys": ("WS_Job_Number_Trim", "Cost_Code_Number_2", "Cost_Code_Description"),
        "total": "Total_Actuals", "amount": "Cost_Code_Act_Cost_TTD", "unknown_count": True,
    },
    "gp-construction-costs": {
        "saved_view": "GP - Const Cost Actuals",
        "columns": ("WS_Job_Number_Trim", "Cost_Code_Number_1", "Cost_Code_Number_2", "Cost_Code_Description"),
        "keys": ("WS_Job_Number_Trim", "Cost_Code_Number_2"),
        "group_keys": ("WS_Job_Number_Trim", "Cost_Code_Number_1", "Cost_Code_Number_2"),
        "total": "Total_Actuals", "amount": "Cost_Code_Act_Cost_TTD", "unknown_count": True, "round_components": True,
    },
    "hcss-actuals": {
        "saved_view": "HeavyJob Actual Costs joined w/ Subdivs",
        "saved_columns": {"JobCode": "H.JobCode", "JobCodeFinal": "J.JobCodeFinal", "Minor Code": "H.Minor Code"},
        "columns": ("JobCode", "JobCodeFinal", "CostCodeDescription", "Major Code", "Minor Code"),
        "keys": ("JobCode", "Minor Code"),
        "group_keys": ("JobCode", "JobCodeFinal", "Minor Code"),
        "total": "TotalActualCost", "amount": 'H."TotalActualCost"', "unknown_count": False,
    },
}


def quote(name):
    return '"' + name.replace('"', '""') + '"'


def reference(alias, name):
    return quote(alias) + "." + quote(name)


def query(path):
    sql = re.sub(r"\nORDER BY\b.*$", "", path.read_text().strip().rstrip(";"), flags=re.IGNORECASE | re.DOTALL)
    # Analytics may retain a qualified display name for an unaliased join field.
    # Give audit subquery outputs explicit names; source/grouping stay unchanged.
    for qualified, alias in (( 'H."JobCode"', '"JobCode"'), ('J."JobCodeFinal"', '"JobCodeFinal"'), ('H."Minor Code"', '"Minor Code"')):
        sql = sql.replace("    " + qualified + ",", "    " + qualified + " AS " + alias + ",", 1)
    return sql


def credit_projection(sql, amount):
    extra = (
        f',\n    SUM(CASE WHEN {amount} < 0 THEN 1 ELSE 0 END) AS "Source_Credit_Rows"'
        f',\n    SUM(CASE WHEN {amount} < 0 THEN {amount} ELSE 0 END) AS "Source_Credit_Amount"'
    )
    return re.sub(r"\nFROM\b", extra + "\nFROM", sql, count=1, flags=re.IGNORECASE)


def summary(sql, version, source):
    alias = "Audit_" + version
    total = reference(alias, source["total"])
    credit_sql = credit_projection(sql, source["amount"])
    residual = reference(alias, "Unclassified_Actuals")
    if source.get("round_components"):
        # The existing Construction parent total is rounded to two places.
        residual = total + " - ROUND(" + " + ".join(reference(alias, name) for name in ELEMENTS) + ", 2)"
    if version == "Baseline":
        detail = '''NULL AS "Residual_Rows", NULL AS "Residual_Amount",
    NULL AS "Residual_Absolute_Amount", NULL AS "Unclassified_Count"'''
    else:
        unknown_count = "SUM(" + reference(alias, "Unclassified_Count") + ")" if source["unknown_count"] else "NULL"
        detail = f'''SUM(CASE WHEN ABS({residual}) >= 0.00005 THEN 1 ELSE 0 END) AS "Residual_Rows",
    ROUND(SUM({residual}), 4) AS "Residual_Amount",
    ROUND(SUM(ABS({residual})), 4) AS "Residual_Absolute_Amount",
    {unknown_count} AS "Unclassified_Count"'''
    return f'''SELECT '{version}' AS "Version", COUNT(*) AS "Row_Count",
    ROUND(SUM({total}), 4) AS "Grand_Total",
    SUM(CASE WHEN {total} < 0 THEN 1 ELSE 0 END) AS "Negative_Group_Count",
    ROUND(SUM(CASE WHEN {total} < 0 THEN {total} ELSE 0 END), 4) AS "Negative_Group_Total",
    SUM({reference(alias, "Source_Credit_Rows")}) AS "Source_Credit_Rows",
    ROUND(SUM({reference(alias, "Source_Credit_Amount")}), 4) AS "Source_Credit_Amount",
    {detail}
FROM (
{credit_sql}
) AS "Audit_{version}"'''


def row_presence(sql):
    return re.sub(r"\nFROM\b", ',\n    1 AS "Audit_Row_Present"\nFROM', sql, count=1, flags=re.IGNORECASE)


def changed(left, right):
    return f"({left} <> {right} OR ({left} IS NULL AND {right} IS NOT NULL) OR ({left} IS NOT NULL AND {right} IS NULL))"


def comparison(baseline, candidate, source):
    columns = ",\n    ".join(
        reference(alias, name) + " AS " + quote(prefix + name)
        for name in source["columns"]
        for alias, prefix in (("B", "Baseline_"), ("A", "Candidate_"))
    )
    before_total = "ROUND(" + reference("B", source["total"]) + ", 4)"
    after_total = "ROUND(" + reference("A", source["total"]) + ", 4)"
    before_present = reference("B", "Audit_Row_Present")
    after_present = reference("A", "Audit_Row_Present")
    projection = f'''SELECT {columns},
    CASE WHEN {before_present} IS NULL THEN 0 ELSE 1 END AS "Baseline_Rows",
    CASE WHEN {after_present} IS NULL THEN 0 ELSE 1 END AS "Candidate_Rows",
    {before_total} AS "Baseline_Total", {after_total} AS "Candidate_Total"'''
    join = "\n    AND ".join(
        "(" + reference("B", name) + " = " + reference("A", name)
        + " OR (" + reference("B", name) + " IS NULL AND " + reference("A", name) + " IS NULL))"
        for name in source["group_keys"]
    )
    differences = [after_present + " IS NULL", changed(before_total, after_total)]
    differences.extend(changed(reference("B", name), reference("A", name)) for name in source["columns"] if name not in source["group_keys"])
    predicates = "\n    OR ".join(differences)
    before = row_presence(baseline)
    after = row_presence(candidate)
    return f'''{projection}
FROM (
{before}
) AS "B"
LEFT JOIN (
{after}
) AS "A" ON {join}
WHERE {predicates}
UNION ALL
{projection}
FROM (
{after}
) AS "A"
LEFT JOIN (
{before}
) AS "B" ON {join}
WHERE {before_present} IS NULL
'''


def duplicates(baseline, candidate, source):
    branches = []
    for version, alias, sql in (("Baseline", "B", baseline), ("Candidate", "A", candidate)):
        columns = ", ".join(reference(alias, name) + " AS " + quote(name) for name in source["keys"])
        keys = ", ".join(reference(alias, name) for name in source["keys"])
        branches.append(f'''SELECT '{version}' AS "Audit_Version", {columns}, COUNT(*) AS "Rows_For_Import_Key"
FROM (
{sql}
) AS {quote(alias)}
GROUP BY {keys}
HAVING COUNT(*) > 1
''')
    return "\nUNION ALL\n".join(branches)


def saved_reference(source, name):
    return reference("A", source.get("saved_columns", {}).get(name, name))


def saved_view_comparison(baseline, source):
    columns = ",\n    ".join(
        (reference("B", name) + " AS " + quote("Baseline_" + name)
         + ",\n    " + saved_reference(source, name) + " AS " + quote("Candidate_" + name))
        for name in source["columns"]
    )
    before_total = "ROUND(" + reference("B", source["total"]) + ", 4)"
    after_total = "ROUND(" + saved_reference(source, source["total"]) + ", 4)"
    before_present = reference("B", "Audit_Row_Present")
    after_present = saved_reference(source, source["keys"][0])
    projection = f'''SELECT {columns},
    CASE WHEN {before_present} IS NULL THEN 0 ELSE 1 END AS "Baseline_Rows",
    CASE WHEN {after_present} IS NULL THEN 0 ELSE 1 END AS "Candidate_Rows",
    {before_total} AS "Baseline_Total", {after_total} AS "Candidate_Total"'''
    join = "\n    AND ".join(
        "(" + reference("B", name) + " = " + saved_reference(source, name)
        + " OR (" + reference("B", name) + " IS NULL AND " + saved_reference(source, name) + " IS NULL))"
        for name in source["group_keys"]
    )
    differences = [after_present + " IS NULL", changed(before_total, after_total)]
    differences.extend(changed(reference("B", name), saved_reference(source, name)) for name in source["columns"] if name not in source["group_keys"])
    predicates = "\n    OR ".join(differences)
    before = row_presence(baseline)
    return f'''{projection}
FROM (
{before}
) AS "B"
LEFT JOIN {quote(source["saved_view"])} AS "A" ON {join}
WHERE {predicates}
UNION ALL
{projection}
FROM {quote(source["saved_view"])} AS "A"
LEFT JOIN (
{before}
) AS "B" ON {join}
WHERE {before_present} IS NULL
'''


def saved_view_duplicates(baseline, source):
    before_columns = ", ".join(reference("B", name) + " AS " + quote(name) for name in source["keys"])
    after_columns = ", ".join(saved_reference(source, name) + " AS " + quote(name) for name in source["keys"])
    before_keys = ", ".join(reference("B", name) for name in source["keys"])
    after_keys = ", ".join(saved_reference(source, name) for name in source["keys"])
    return f'''SELECT 'Baseline' AS "Audit_Version", {before_columns}, COUNT(*) AS "Rows_For_Import_Key"
FROM (
{baseline}
) AS "B"
GROUP BY {before_keys}
HAVING COUNT(*) > 1
UNION ALL
SELECT 'Candidate' AS "Audit_Version", {after_columns}, COUNT(*) AS "Rows_For_Import_Key"
FROM {quote(source["saved_view"])} AS "A"
GROUP BY {after_keys}
HAVING COUNT(*) > 1
'''


def build():
    AUDITS.mkdir(exist_ok=True)
    for name, source in SOURCES.items():
        baseline = query(ROOT / "baseline" / f"{name}.sql")
        candidate = query(ROOT / f"{name}.sql")
        outputs = {
            "summary": summary(baseline, "Baseline", source) + "\nUNION ALL\n" + summary(candidate, "Candidate", source) + "\n",
            "group-comparison": comparison(baseline, candidate, source),
            "duplicate-keys": duplicates(baseline, candidate, source),
            "saved-view-group-comparison": saved_view_comparison(baseline, source),
            "saved-view-duplicate-keys": saved_view_duplicates(baseline, source),
        }
        for kind, sql in outputs.items():
            (AUDITS / f"{name}-{kind}.sql").write_text(sql, encoding="utf-8")


if __name__ == "__main__":
    build()
