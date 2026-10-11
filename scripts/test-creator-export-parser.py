#!/usr/bin/env python3
"""Verify renamed Attachment schema extraction without changing live data."""
from __future__ import annotations

import importlib.util
import hashlib
import json
from pathlib import Path
import re
import sys
import unittest

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("creator_export_parser", ROOT / "scripts/parse_creator_export.py")
PARSER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PARSER)


class CreatorExportParserTests(unittest.TestCase):
    def test_form_title_does_not_inherit_first_field_title(self) -> None:
        lines = '''forms
{
    form Attachment
    {
        Email_Attachment
        (
            type = checkbox
            displayname = "Attach to Email"
        )
        must have Date_field1
        (
            type = date
            displayname = "Date"
        )
    }
}'''.splitlines()
        form = PARSER.parse_forms(lines, 0, len(lines))[0]
        self.assertEqual(form["display_name"], "Attachment")
        self.assertEqual([field["link_name"] for field in form["fields"]], ["Email_Attachment", "Date_field1"])
        self.assertEqual(form["fields"][1]["type"], "date")

    def test_explicit_form_title_is_preserved(self) -> None:
        lines = '''forms
{
    form Attachment
    {
        displayname = "Project Attachment"
        must have unique Reference
        (
            type = text
            displayname = "Reference Number"
        )
    }
}'''.splitlines()
        form = PARSER.parse_forms(lines, 0, len(lines))[0]
        self.assertEqual(form["display_name"], "Project Attachment")
        self.assertEqual(form["fields"][0]["link_name"], "Reference")

    def test_actual_development_export_preserves_attachment_contract(self) -> None:
        export = ROOT / "creator/exports/Land_Master_2026-10-11-development.ds"
        lines = export.read_text(encoding="utf-8-sig").splitlines()
        sections = PARSER.markers(lines)
        forms = PARSER.parse_forms(lines, sections["forms"], sections["reports"])
        attachment = next(form for form in forms if form["link_name"] == "Attachment")
        self.assertEqual(attachment["display_name"], "Attachment")
        fields = {field["link_name"]: field for field in attachment["fields"]}
        for name in ["Contract1", "Budget", "Pro_Forma", "Date_field1", "File_field1", "Email_Attachment"]:
            self.assertIn(name, fields)
        self.assertEqual(fields["Date_field1"]["type"], "date")
        self.assertEqual(fields["File_field1"]["type"], "upload file")
        contract = next(form for form in forms if form["link_name"] == "Contract")
        subform = next(field for field in contract["fields"] if field["link_name"] == "Contract_Versions")
        self.assertEqual(subform["values"], "Attachment.ID")
        reports = PARSER.parse_reports(lines, sections["reports"], sections["pages"])
        report = next(report for report in reports if report["link_name"] == "All_Attachments")
        self.assertEqual(report["source_form"], "Attachment")
        application = json.loads((ROOT / "creator/generated/application.json").read_text(encoding="utf-8"))
        overlay = next(item for item in application["overlays"] if item["id"] == "attachment-rename-2026-10-11")
        self.assertEqual(overlay["source_export"], export.relative_to(ROOT).as_posix())
        self.assertEqual(overlay["source_sha256"], hashlib.sha256(export.read_bytes()).hexdigest())
        baseline = ROOT / application["source_export"]
        self.assertEqual(application["source_sha256"], hashlib.sha256(baseline.read_bytes()).hexdigest())

    def test_final_export_preserves_native_attachment_captions(self) -> None:
        lines = (ROOT / "creator/exports/Land_Master_2026-10-11-development.ds").read_text(encoding="utf-8-sig").splitlines()
        start = next(index for index, line in enumerate(lines) if line.strip() == "form Attachment")
        end = next(index for index in range(start + 1, len(lines)) if re.match(r"^\t\tform\s+", lines[index]))
        form = "\n".join(lines[start:end])
        self.assertIn('on add = "Attachment"', form)
        self.assertIn('on edit = "Attachment"', form)
        self.assertIn('success message = "Attachment Added Successfully"', form)
        self.assertTrue(any('Hide_Fields_set_Defaults_ as "Hide Fields set Defaults - Attachment"' in line for line in lines))
        self.assertEqual(sum(len(re.findall(r"\b(?:Contract_Version|All_Contract_Versions)\b", line)) for line in lines), 0)


if __name__ == "__main__":
    unittest.main()
