"""Execute candidate SQL against fixtures and compare original total projections.

Uses SQLite only to exercise the portable SELECT/CASE/SUM query semantics.
This does not establish Zoho Analytics compilation or live source availability.
"""

from pathlib import Path
import sqlite3
import unittest


QUERY_DIR = Path(__file__).resolve().parent
SOURCE = '"GP - Job Cost Detail MSTR+HIST (JC00701+JC30101)"'
ELEMENTS = ("Labor", "Materials", "Equipment", "Subcontractor", "Other")
PARENT_COLUMNS = (
    "WS_Job_Number_Trim", "Cost_Code_Number_1", "Cost_Code_Number_2",
    "Cost_Code_Description", "Total_Actuals",
)


class GPQueryTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        self.db.execute(f"""CREATE TABLE {SOURCE} (
            WS_Job_Number_Trim TEXT, Cost_Code_Number_1 INTEGER,
            Cost_Code_Number_2 INTEGER, Cost_Code_Description TEXT,
            Cost_Code_Act_Cost_TTD NUMERIC, Cost_Element INTEGER
        )""")
        self.db.execute('CREATE TABLE "External System Mapping (Zoho Creator)" ("External Code" TEXT)')
        self.db.executemany('INSERT INTO "External System Mapping (Zoho Creator)" VALUES (?)', [("J1",), ("J2",)])
        self.rows = []

    def tearDown(self):
        self.db.close()

    def add(self, code, amount, element, *, job="J1", major=3000, description="Line"):
        self.rows.append((job, major, code, description, amount, element))

    def run_queries(self, kind):
        self.db.executemany(f"INSERT INTO {SOURCE} VALUES (?, ?, ?, ?, ?, ?)", self.rows)
        filename = f"gp-{kind}-costs.sql"
        baseline = self.db.execute((QUERY_DIR / "baseline" / filename).read_text()).fetchall()
        candidate = self.db.execute((QUERY_DIR / filename).read_text()).fetchall()
        self.assertEqual(
            [tuple(row[name] for name in PARENT_COLUMNS) for row in baseline],
            [tuple(row[name] for name in PARENT_COLUMNS) for row in candidate],
            "Original identities, descriptions, grouping, order and totals must be unchanged",
        )
        return candidate

    def test_development_signed_precision_and_element_assignment(self):
        for index, amount in enumerate((10.1234, -2.3456, 3.4567, 4.5678, 5.6789), 1):
            self.add(4000, amount, index, major=4000 + index)
        rows = self.run_queries("development")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["Cost_Code_Number_1"], 4001)
        for column, amount in zip(ELEMENTS, (10.1234, -2.3456, 3.4567, 4.5678, 5.6789)):
            self.assertAlmostEqual(rows[0][column], amount, places=9)
        self.assertAlmostEqual(sum(rows[0][column] for column in ELEMENTS), rows[0]["Total_Actuals"], places=9)
        self.assertEqual(rows[0]["Unclassified_Count"], 0)

    def test_development_ranges_mapping_and_existing_description_grouping(self):
        for code in (3999, 4000, 4999, 5000, 7999, 8000, 8999, 9000):
            self.add(code, 1, 1)
        self.add(4001, 12, 1, job="UNMAPPED")
        self.add(4002, 0, 1)
        self.add(4003, 3, 1, description="A")
        self.add(4003, 4, 2, description="B")
        rows = self.run_queries("development")
        self.assertEqual([row["Cost_Code_Number_2"] for row in rows], [4000, 4003, 4003, 4999, 8000, 8999])
        self.assertEqual({row["Cost_Code_Description"] for row in rows if row["Cost_Code_Number_2"] == 4003}, {"A", "B"})

    def test_development_unknown_and_null_elements_cannot_cancel_guard(self):
        self.add(4000, 3, 7)
        self.add(4000, -3, 7)
        self.add(4001, 2, None)
        rows = self.run_queries("development")
        self.assertEqual(rows[0]["Total_Actuals"], 0)
        self.assertEqual(rows[0]["Unclassified_Actuals"], 0)
        self.assertEqual(rows[0]["Unclassified_Count"], 2)
        self.assertEqual(sum(rows[0][column] for column in ELEMENTS), 0)
        self.assertEqual(rows[1]["Unclassified_Actuals"], 2)
        self.assertEqual(rows[1]["Unclassified_Count"], 1)

    def test_construction_preserves_total_rounding_positive_filter_and_grouping(self):
        amounts = (1.2345, 2.3456, 3.4567, 4.5678, 5.6789)
        for element, amount in enumerate(amounts, 1):
            self.add(3000, amount, element, description="A" if element < 5 else "Z")
        self.add(3000, -100, 1)
        self.add(3000, 0, 1)
        self.add(3000, 7, 1, major=3001)
        self.add(2999, 1, 1)
        self.add(3999, 1, 1)
        self.add(4000, 1, 1)
        self.add(3001, 100, 1, job="UNMAPPED")
        rows = self.run_queries("construction")
        self.assertEqual([row["Cost_Code_Number_2"] for row in rows], [3000, 3999, 3000])
        self.assertEqual(rows[0]["Cost_Code_Description"], "Z")
        self.assertEqual(rows[0]["Total_Actuals"], 17.28)
        for column, amount in zip(ELEMENTS, amounts):
            self.assertAlmostEqual(rows[0][column], amount, places=9)
        self.assertEqual(round(sum(rows[0][column] for column in ELEMENTS), 2), rows[0]["Total_Actuals"])

    def test_construction_unknown_elements_are_retained_in_total_and_guard(self):
        self.add(3000, 2.1234, 0)
        self.add(3000, 3.4567, None)
        self.add(3000, 4.5678, 6)
        rows = self.run_queries("construction")
        self.assertEqual(rows[0]["Total_Actuals"], 10.15)
        self.assertAlmostEqual(rows[0]["Unclassified_Actuals"], 10.1479, places=9)
        self.assertEqual(rows[0]["Unclassified_Count"], 3)
        self.assertEqual(sum(rows[0][column] for column in ELEMENTS), 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
