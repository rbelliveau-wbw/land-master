"""Check audit SQL execution and its ability to detect total/key/detail errors."""

import re
import unittest

from prepare_read_only_audits import AUDITS, ROOT, SOURCES, build, comparison, query, quote
from verify_gp_queries import GPQueryTests
from verify_hcss_queries import HCSSQueryTests


class ReadOnlyAuditTests(unittest.TestCase):
    def setUp(self):
        build()
        self.fixture = None

    def tearDown(self):
        if self.fixture:
            self.fixture.tearDown()

    def gp(self):
        self.fixture = GPQueryTests()
        self.fixture.setUp()
        return self.fixture

    def hcss(self):
        self.fixture = HCSSQueryTests()
        self.fixture.setUp()
        return self.fixture

    def execute(self, name, kind):
        return self.fixture.db.execute((AUDITS / f"{name}-{kind}.sql").read_text()).fetchall()

    def test_all_derived_table_references_use_explicit_aliases_for_zoho(self):
        for name, source in SOURCES.items():
            names = (*source["columns"], source["total"], "Audit_Version", "Source_Credit_Rows", "Source_Credit_Amount", "Unclassified_Actuals", "Unclassified_Count", "Labor", "Materials", "Equipment", "Subcontractor", "Other")
            for kind in ("summary", "group-comparison", "duplicate-keys"):
                sql = (AUDITS / f"{name}-{kind}.sql").read_text()
                # Only derived-table scopes require the aliases. Original GP
                # source SELECTs deliberately have no source table alias.
                self.assertNotIn("Paired_Query", sql, "Zoho allows only one derived FROM level")
                scopes = []
                for branch in sql.split("\nUNION ALL\n"):
                    scopes.append(branch.split("\nFROM (", 1)[0])
                    aliases = list(re.finditer(r'\) AS "(?:A|B|Audit_Baseline|Audit_Candidate)"', branch))
                    self.assertTrue(aliases)
                    scopes.append(branch[aliases[-1].end():])
                for scope in scopes:
                    for column in names:
                        for match in re.finditer(r'(?<!\.)"' + re.escape(column) + r'"', scope):
                            prefix = scope[:match.start()]
                            self.assertRegex(prefix, r'\bAS\s*$', f"Unqualified derived reference in {name}/{kind}: {column}")

    def test_gp_audit_credit_counts_unknown_cancellation_and_duplicate_keys(self):
        fixture = self.gp()
        fixture.add(4000, 5, 1, description="A")
        fixture.add(4000, -1, 2, description="A")
        fixture.add(4000, 2, 1, description="B")
        fixture.add(4001, 3, 7)
        fixture.add(4001, -3, 7)
        fixture.run_queries("development")
        name = "gp-development-costs"
        rows = self.execute(name, "summary")
        self.assertEqual([row["Row_Count"] for row in rows], [3, 3])
        self.assertEqual([row["Grand_Total"] for row in rows], [6, 6])
        self.assertEqual([row["Source_Credit_Rows"] for row in rows], [2, 2])
        self.assertEqual([row["Source_Credit_Amount"] for row in rows], [-4, -4])
        self.assertEqual(rows[1]["Unclassified_Count"], 2)
        self.assertEqual(rows[1]["Residual_Amount"], 0)
        self.assertEqual(self.execute(name, "group-comparison"), [])
        duplicates = self.execute(name, "duplicate-keys")
        self.assertEqual(len(duplicates), 2)
        self.assertEqual({row["Audit_Version"] for row in duplicates}, {"Baseline", "Candidate"})
        self.assertTrue(all(row["Rows_For_Import_Key"] == 2 for row in duplicates))

    def test_construction_audit_preserves_original_rounded_total_and_credit_exclusion(self):
        fixture = self.gp()
        fixture.add(3000, 1.2345, 1)
        fixture.add(3000, 2.3456, 2)
        fixture.add(3000, -10, 1)
        fixture.run_queries("construction")
        name = "gp-construction-costs"
        rows = self.execute(name, "summary")
        self.assertEqual([row["Grand_Total"] for row in rows], [3.58, 3.58])
        self.assertEqual([row["Source_Credit_Rows"] for row in rows], [0, 0])
        self.assertEqual(rows[1]["Residual_Rows"], 0)
        self.assertEqual(self.execute(name, "group-comparison"), [])
        self.assertEqual(self.execute(name, "duplicate-keys"), [])

    def test_hcss_audit_counts_residuals_that_cancel_in_grand_total(self):
        fixture = self.hcss()
        fixture.add((1, 0, 0, 0, 0, 0, 0, 0, 0), total=1.49, minor=3000)
        fixture.add((1, 0, 0, 0, 0, 0, 0, 0, 0), total=0.51, minor=3001)
        fixture.add((-2, 0, 0, 0, 0, 0, 0, 0, 0), minor=3002)
        name = "hcss-actuals"
        rows = self.execute(name, "summary")
        self.assertEqual([row["Grand_Total"] for row in rows], [0, 0])
        self.assertEqual([row["Source_Credit_Rows"] for row in rows], [1, 1])
        self.assertEqual(rows[1]["Residual_Rows"], 2)
        self.assertEqual(rows[1]["Residual_Amount"], 0)
        self.assertEqual(rows[1]["Residual_Absolute_Amount"], 0.98)
        self.assertEqual(self.execute(name, "group-comparison"), [])
        self.assertEqual(self.execute(name, "duplicate-keys"), [])

    def test_group_audit_detects_per_group_total_changes_despite_equal_grand_total(self):
        fixture = self.gp()
        fixture.add(4000, 5, 1)
        fixture.add(4001, 6, 1)
        fixture.run_queries("development")
        name = "gp-development-costs"
        baseline = query(ROOT / "baseline" / f"{name}.sql")
        candidate = query(ROOT / f"{name}.sql").replace(
            "SUM(Cost_Code_Act_Cost_TTD) AS Total_Actuals",
            "SUM(Cost_Code_Act_Cost_TTD) + CASE WHEN Cost_Code_Number_2 = 4000 THEN 1 ELSE -1 END AS Total_Actuals",
        )
        rows = fixture.db.execute(comparison(baseline, candidate, SOURCES[name])).fetchall()
        self.assertEqual(len(rows), 2)
        self.assertEqual(sum(row["Baseline_Total"] for row in rows), sum(row["Candidate_Total"] for row in rows))

    def test_group_audit_detects_missing_and_added_keys(self):
        fixture = self.gp()
        fixture.add(4000, 5, 1)
        fixture.run_queries("development")
        name = "gp-development-costs"
        baseline = query(ROOT / "baseline" / f"{name}.sql")
        candidate = query(ROOT / f"{name}.sql").replace(
            "    Cost_Code_Number_2,", "    Cost_Code_Number_2 + 1 AS Cost_Code_Number_2,", 1,
        )
        rows = fixture.db.execute(comparison(baseline, candidate, SOURCES[name])).fetchall()
        self.assertEqual(len(rows), 2)
        self.assertEqual(sorted((row["Baseline_Rows"], row["Candidate_Rows"]) for row in rows), [(0, 1), (1, 0)])

    def test_null_group_keys_match_and_original_metadata_changes_are_detected(self):
        fixture = self.gp()
        fixture.add(4000, 5, 1, description=None)
        fixture.run_queries("development")
        name = "gp-development-costs"
        self.assertEqual(self.execute(name, "group-comparison"), [])
        baseline = query(ROOT / "baseline" / f"{name}.sql")
        candidate = query(ROOT / f"{name}.sql").replace(
            "MIN(Cost_Code_Number_1) AS Cost_Code_Number_1",
            "MIN(Cost_Code_Number_1) + 1 AS Cost_Code_Number_1",
        )
        rows = fixture.db.execute(comparison(baseline, candidate, SOURCES[name])).fetchall()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["Baseline_Rows"], 1)
        self.assertEqual(rows[0]["Candidate_Rows"], 1)
        self.assertEqual(rows[0]["Baseline_Total"], rows[0]["Candidate_Total"])

    def test_saved_view_audits_use_native_output_names_and_detect_total_changes(self):
        for name, source in SOURCES.items():
            if name == "hcss-actuals":
                fixture = self.hcss()
                fixture.add((1, 2, 3, 4, 0, 0, 5, 0, 0))
            else:
                fixture = self.gp()
                kind = "construction" if "construction" in name else "development"
                fixture.add(3000 if kind == "construction" else 4000, 5, 1)
                fixture.run_queries(kind)
            candidate = query(ROOT / f"{name}.sql")
            fields = (*source["columns"], source["total"])
            def create_saved_view(offset):
                projection = ", ".join(
                    '"Q".' + quote(field) + (" + 1" if offset and field == source["total"] else "")
                    + " AS " + quote(source.get("saved_columns", {}).get(field, field))
                    for field in fields
                )
                fixture.db.execute("CREATE VIEW " + quote(source["saved_view"]) + " AS SELECT " + projection + " FROM (" + candidate + ') AS "Q"')
            create_saved_view(False)
            self.assertEqual(self.execute(name, "saved-view-group-comparison"), [])
            self.assertEqual(self.execute(name, "saved-view-duplicate-keys"), [])
            fixture.db.execute("DROP VIEW " + quote(source["saved_view"]))
            create_saved_view(True)
            self.assertEqual(len(self.execute(name, "saved-view-group-comparison")), 1)
            fixture.tearDown()
            self.fixture = None


if __name__ == "__main__":
    unittest.main(verbosity=2)
