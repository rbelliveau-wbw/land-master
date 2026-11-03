"""Exercise both pending HCSS Other mappings without contacting Analytics.

SQLite execution checks actual candidate SQL and original parent projections.
Live Zoho compilation and selection of the Other mapping remain separate.
"""

from pathlib import Path
import sqlite3
import unittest


QUERY_DIR = Path(__file__).resolve().parent
ELEMENTS = ("Labor", "Materials", "Equipment", "Subcontractor", "Other")
DETAIL_COLUMNS = (
    "ActualLaborCost", "ActualMaterialCost", "ActualEquipmentCost",
    "ActualSubcontractCost", "ActualTruckingCost", "Actual_Supply_Cost",
    "Actual_Misc1_Cost", "Actual_Misc2_Cost", "Actual_Misc3_Cost",
)
PARENT_COLUMNS = (
    "JobCode", "JobCodeFinal", "CostCodeDescription", "Major Code",
    "Minor Code", "TotalActualCost",
)


class HCSSQueryTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        component_definition = ", ".join(f'"{name}" NUMERIC' for name in DETAIL_COLUMNS)
        self.db.execute(f'''CREATE TABLE "HeavyJob_CostSummaryByJobCostCode" (
            JobCode TEXT, zzz_JobID_Guid TEXT, CostCodeDescription TEXT,
            "Major Code" INTEGER, "Minor Code" INTEGER, TotalActualCost NUMERIC,
            {component_definition}, ActualLaborEquipCost NUMERIC
        )''')
        self.db.execute('''CREATE TABLE "HeavyJob_JM_Job" (
            zzz_JobId_Guid TEXT, JobCode TEXT, JobCodeFinal TEXT
        )''')
        self.db.execute('CREATE TABLE "External System Mapping (Zoho Creator)" ("External Code" TEXT)')
        self.db.execute('INSERT INTO "External System Mapping (Zoho Creator)" VALUES (?)', ("HJ1",))
        self.db.executemany('INSERT INTO "HeavyJob_JM_Job" VALUES (?, ?, ?)', [
            ("guid1", "HJ1", "FINAL1"), ("guid2", "HJ2", "FINAL2"),
        ])

    def tearDown(self):
        self.db.close()

    def add(self, parts, *, total=None, minor=3001, major=3000, description="Line", job="HJ1", guid="guid1"):
        if total is None:
            total = sum(value or 0 for value in parts)
        values = (job, guid, description, major, minor, total, *parts, 9999)
        self.db.execute('INSERT INTO "HeavyJob_CostSummaryByJobCostCode" VALUES (' + ",".join("?" for _ in values) + ")", values)

    def query(self, option):
        baseline = self.db.execute((QUERY_DIR / "baseline" / "hcss-actuals.sql").read_text()).fetchall()
        rows = self.db.execute((QUERY_DIR / f"hcss-actuals-{option}-other.sql").read_text()).fetchall()
        projection = lambda result: sorted(tuple(row[name] for name in PARENT_COLUMNS) for row in result)
        self.assertEqual(projection(baseline), projection(rows), "Existing parent identity/grouping/filter/total projection must remain unchanged")
        return rows

    def test_combined_other_keeps_all_costs_without_double_counting_labor_equipment(self):
        parts = (1.1234, 2.2345, 3.3456, 4.4567, 5.1111, 6.2222, 7.3333, 8.4444, 9.5555)
        self.add(parts)
        row = self.query("combined")[0]
        for column, amount in zip(ELEMENTS[:4], parts[:4]):
            self.assertAlmostEqual(row[column], amount, places=9)
        self.assertAlmostEqual(row["Other"], sum(parts[4:]), places=9)
        self.assertAlmostEqual(sum(row[column] for column in ELEMENTS), row["TotalActualCost"], places=9)
        self.assertAlmostEqual(row["Unclassified_Actuals"], 0, places=9)

    def test_misc1_option_exposes_other_unrepresented_costs(self):
        parts = (1, 2, 3, 4, 5, 6, 7, 8, 9)
        self.add(parts)
        row = self.query("misc1")[0]
        self.assertEqual(row["Other"], 7)
        self.assertEqual(row["Unclassified_Actuals"], 5 + 6 + 8 + 9)

    def test_mapping_filter_grouping_max_metadata_and_signed_credits_are_preserved(self):
        self.add((1.1111, 2, 3, 4, 5, 6, 7, 8, 9), description="A")
        self.add((-0.1111, 0, 0, 0, 0, 0, 0, 0, 0), major=3100, description="Z")
        self.add((100, 0, 0, 0, 0, 0, 0, 0, 0), job="HJ2", guid="guid2")
        self.add((100, 0, 0, 0, 0, 0, 0, 0, 0), job="MISSING", guid="missing")
        for option in ("combined", "misc1"):
            rows = self.query(option)
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0]["CostCodeDescription"], "Z")
            self.assertEqual(rows[0]["Major Code"], 3100)
            self.assertAlmostEqual(rows[0]["Labor"], 1, places=9)

    def test_residual_keeps_unrepresented_total_visible(self):
        self.add((1, 2, 3, 4, 0, 0, 0, 0, 0), total=11)
        for option in ("combined", "misc1"):
            row = self.query(option)[0]
            self.assertEqual(row["TotalActualCost"], 11)
            self.assertEqual(row["Unclassified_Actuals"], 1)

    def test_null_numeric_components_do_not_erase_other_numeric_costs(self):
        self.add((1, None, 3, None, 5, None, 7, None, None))
        row = self.query("combined")[0]
        self.assertEqual(row["Materials"], 0)
        self.assertEqual(row["Other"], 12)
        self.assertEqual(row["Unclassified_Actuals"], 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
