#!/usr/bin/env python3
"""Build the read-only Forms & Reports catalog from a selected Creator export.

Reuses the repository's conservative form/report parser without invoking its
metadata/function regeneration entry point. Raw exports are never changed.

    python scripts/build_forms_reports_inventory.py --export creator/exports/file.ds
    python scripts/build_forms_reports_inventory.py --export file.ds --supplement form.ds

The optional baseline extraction retains the original native page for rollback.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import importlib.util
import json
import re
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_EXPORT = ROOT / "creator/exports/Land_Master_2026-11-02-catalog.ds"
FIELD_DECLARATION = re.compile(
    r"^\s*(?P<modifiers>(?:(?:must have unique|must have|unique)\s+)?)"
    r"(?P<name>[A-Za-z_][A-Za-z0-9_]*)\s*$"
)
REPORT_DECLARATION = re.compile(
    r"^\s*(default list|list|calendar|kanban|spreadsheet|pivot|chart|map)"
    r"\s+([A-Za-z_][A-Za-z0-9_]*)\s*$"
)


def load_parser() -> Any:
    sys.dont_write_bytecode = True
    spec = importlib.util.spec_from_file_location(
        "creator_export_parser", ROOT / "scripts/parse_creator_export.py"
    )
    if not spec or not spec.loader:
        raise RuntimeError("The existing Creator export parser could not be loaded.")
    parser = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(parser)
    return parser


def source_name(path: Path) -> str:
    try:
        return path.resolve().relative_to(ROOT).as_posix()
    except ValueError:
        return path.resolve().as_posix()


def metadata(path: Path, contents: str, role: str) -> dict[str, Any]:
    generated = re.search(r"Generated on\s*:\s*([^\r\n]+)", contents)
    return {
        "path": source_name(path),
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "role": role,
        "export_generated_on": generated.group(1).strip() if generated else None,
    }


def section_ranges(lines: list[str]) -> dict[str, int]:
    sections: dict[str, int] = {}
    for index, line in enumerate(lines):
        value = line.strip()
        if value in {"forms", "reports", "pages", "variables"} and value not in sections:
            sections[value] = index
    if not all(key in sections for key in ("forms", "reports", "pages")):
        raise ValueError("The selected export must contain forms, reports and pages sections.")
    if not sections["forms"] < sections["reports"] < sections["pages"]:
        raise ValueError("Creator export sections are out of order.")
    return sections


def form_spans(lines: list[str], start: int, end: int) -> dict[str, tuple[int, int]]:
    starts = [
        (index, match.group(1))
        for index in range(start + 1, end)
        if (match := re.match(r"^\s*form\s+([A-Za-z_][A-Za-z0-9_]*)\s*$", lines[index]))
    ]
    return {
        name: (line, starts[position + 1][0] if position + 1 < len(starts) else end)
        for position, (line, name) in enumerate(starts)
    }


def field_details(lines: list[str], start: int, end: int) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    cursor = start + 1
    while cursor + 1 < end:
        declaration = FIELD_DECLARATION.match(lines[cursor])
        if not declaration or lines[cursor + 1].strip() != "(":
            cursor += 1
            continue
        opening_indent = len(lines[cursor + 1]) - len(lines[cursor + 1].lstrip())
        stop = cursor + 2
        while stop < end:
            if lines[stop].strip() == ")" and len(lines[stop]) - len(lines[stop].lstrip()) == opening_indent:
                break
            stop += 1
        properties: dict[str, str] = {}
        components: list[dict[str, Any]] = []
        prop_cursor = cursor + 2
        while prop_cursor < stop:
            child = FIELD_DECLARATION.match(lines[prop_cursor])
            if child and prop_cursor + 1 < stop and lines[prop_cursor + 1].strip() == "(":
                child_indent = len(lines[prop_cursor + 1]) - len(lines[prop_cursor + 1].lstrip())
                child_stop = prop_cursor + 2
                while child_stop < stop:
                    if lines[child_stop].strip() == ")" and len(lines[child_stop]) - len(lines[child_stop].lstrip()) == child_indent:
                        break
                    child_stop += 1
                child_details = field_details(lines, prop_cursor - 1, child_stop + 1)
                for name, detail in child_details.items():
                    configuration = detail["configuration"]
                    components.append({"link_name": name, "display_name": configuration.get("displayname", name.replace("_", " ")).strip('"'), "type": configuration.get("type", "unknown"), **detail})
                prop_cursor = child_stop + 1
                continue
            prop = re.match(r"^\s*([A-Za-z_][A-Za-z_ ]*)\s*=\s*(.+?)\s*$", lines[prop_cursor])
            if prop:
                properties[prop.group(1).strip()] = prop.group(2).strip()
            prop_cursor += 1
        modifiers = declaration.group("modifiers")
        result[declaration.group("name")] = {
            "source_line": cursor + 1,
            "required": "must have" in modifiers,
            "unique": "unique" in modifiers,
            "configuration": properties,
            "components": components,
        }
        cursor = stop + 1
    return result


def extract_page(contents: str) -> dict[str, str] | None:
    match = re.search(r"^\s*page Forms_Reports(?:\([^\n]*\))?\s*$", contents, re.M)
    if not match:
        return None
    next_page = re.search(r"^\s*page\s+[A-Za-z_]", contents[match.end() :], re.M)
    end = match.end() + next_page.start() if next_page else len(contents)
    block = contents[match.start() : end]
    encoded = re.search(r'Content\s*=\s*("(?:[^"\\]|\\.)*")', block)
    if not encoded:
        raise ValueError("Forms_Reports exists but its native Content could not be decoded.")
    zml = html.unescape(json.loads(encoded.group(1)))
    cdata = re.search(r"<!\[CDATA\[(.*?)\]\]>", zml, re.S)
    if not cdata:
        raise ValueError("The native Forms_Reports HTML snippet is missing.")
    snippet = cdata.group(1).strip()
    opening = snippet.index("%>") + 2
    closing = snippet.rfind("<%")
    if closing < opening:
        raise ValueError("The native Forms_Reports snippet wrapper is unrecognized.")
    return {"snippet": snippet, "html": snippet[opening:closing].strip()}


def build_inventory(export: Path, supplements: list[Path]) -> tuple[dict[str, Any], dict[str, str] | None]:
    parser = load_parser()
    contents = export.read_text(encoding="utf-8")
    sources = [metadata(export, contents, "export")]
    forms: list[dict[str, Any]] = []
    reports: list[dict[str, Any]] = []
    seen_forms: set[str] = set()
    seen_reports: set[str] = set()

    for path, text, supplemental in [(export, contents, False)] + [
        (path, path.read_text(encoding="utf-8"), True) for path in supplements
    ]:
        lines = text.splitlines()
        if supplemental:
            sources.append(metadata(path, text, "supplement"))
            form_start, form_end = -1, len(lines)
            report_start, report_end = -1, len(lines)
        else:
            sections = section_ranges(lines)
            form_start, form_end = sections["forms"], sections["reports"]
            report_start, report_end = sections["reports"], sections["pages"]
        spans = form_spans(lines, form_start, form_end)
        for form in parser.parse_forms(lines, form_start, form_end):
            key = form["link_name"]
            if key in seen_forms:
                raise ValueError(f"Duplicate form {key}; supplements must not override selected export forms.")
            seen_forms.add(key)
            begin, end = spans[key]
            details = field_details(lines, begin, end)
            if set(details) != {field["link_name"] for field in form["fields"]}:
                raise ValueError(f"Field extraction did not match the existing parser for {key}.")
            form["source"] = source_name(path)
            form["source_line"] = begin + 1
            for field in form["fields"]:
                field.update(details[field["link_name"]])
                configuration = field["configuration"]
                field["display_name"] = configuration.get("displayname", field["link_name"].replace("_", " ")).strip('"')
                field["type"] = configuration.get("type", field["type"])
            forms.append(form)
        report_lines = {
            match.group(2): index + 1
            for index in range(report_start + 1, report_end)
            if (match := REPORT_DECLARATION.match(lines[index]))
        }
        for report in parser.parse_reports(lines, report_start, report_end):
            key = report["link_name"]
            if key in seen_reports:
                raise ValueError(f"Duplicate report {key}; supplements must not override selected export reports.")
            seen_reports.add(key)
            report.update({"source": source_name(path), "source_line": report_lines[key]})
            report_start_line = report_lines[key] - 1
            next_report_line = min((line - 1 for line in report_lines.values() if line - 1 > report_start_line), default=report_end)
            system_columns = sorted(set(re.findall(r'^\s*(ID|Added_User|Added_Time|Modified_User|Modified_Time)(?:\s+as\s+"[^"\n]*")?\s*$', "\n".join(lines[report_start_line:next_report_line]), re.M)))
            report["system_fields"] = system_columns
            reports.append(report)

    relationships: list[dict[str, str]] = []
    for form in forms:
        for field in form["fields"]:
            target = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)\.ID\b", field["values"] or "")
            referenced = target.group(1) if target and target.group(1) in seen_forms else None
            field["referenced_form"] = referenced
            field["relationship_kind"] = (
                "subform" if referenced and field["type"] == "grid" else "lookup" if referenced else None
            )
            if referenced:
                relationships.append({
                    "from_form": form["link_name"], "field": field["link_name"],
                    "to_form": referenced, "kind": field["relationship_kind"],
                })
        form["reports"] = [report["link_name"] for report in reports if report["source_form"] == form["link_name"]]
        form["related_forms"] = sorted({edge["to_form"] for edge in relationships if edge["from_form"] == form["link_name"]})
        attested_system_fields = sorted({name for report in reports if report["source_form"] == form["link_name"] for name in report["system_fields"]})
        form["report_system_fields"] = [{"link_name": name, "display_name": name.replace("_", " "), "source_reports": [report["link_name"] for report in reports if report["source_form"] == form["link_name"] and name in report["system_fields"]]} for name in attested_system_fields]

    page = extract_page(contents)
    page_audit = None
    if page:
        page_forms = sorted(set(re.findall(r"#Form:([A-Za-z_][A-Za-z0-9_]*)", page["html"])))
        page_reports = sorted(set(re.findall(r"#Report:([A-Za-z_][A-Za-z0-9_]*)", page["html"])))
        page_audit = {
            "page": "Forms_Reports", "snippet": "html_snippet3",
            "form_links": page_forms, "report_links": page_reports,
            "missing_forms": sorted(seen_forms - set(page_forms)),
            "missing_reports": sorted(seen_reports - set(page_reports)),
            "stale_forms": sorted(set(page_forms) - seen_forms),
            "stale_reports": sorted(set(page_reports) - seen_reports),
        }
    return {
        "schema_version": 1,
        "source": {
            "export": source_name(export), "sha256": sources[0]["sha256"],
            "export_generated_on": sources[0]["export_generated_on"],
        },
        "sources": sources,
        "scope": "All declared form fields, including layout/control fields and explicitly declared compound components. Native system fields are listed separately only where exact exported report columns attest them; no unavailable per-form system schema is fabricated. Relationships are explicit exported <Form>.ID bindings only.",
        "counts": {
            "forms": len(forms), "fields": sum(form["field_count"] for form in forms),
            "reports": len(reports), "relationships": len(relationships),
            "compound_components": sum(len(field["components"]) for form in forms for field in form["fields"]),
            "report_system_fields": sum(len(form["report_system_fields"]) for form in forms),
        },
        "forms": forms, "reports": reports, "relationships": relationships,
        "current_page_audit": page_audit,
    }, page


def main() -> None:
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument("--export", type=Path, default=DEFAULT_EXPORT)
    args.add_argument("--supplement", type=Path, action="append", default=[])
    args.add_argument("--output", type=Path, default=ROOT / "creator/catalog/forms-reports.inventory.json")
    args.add_argument("--extract-baseline", action="store_true")
    args.add_argument("--baseline-directory", type=Path, default=ROOT / "creator/catalog")
    options = args.parse_args()
    inventory, page = build_inventory(options.export.resolve(), [path.resolve() for path in options.supplement])
    options.output.parent.mkdir(parents=True, exist_ok=True)
    options.output.write_text(json.dumps(inventory, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    if options.extract_baseline:
        if not page:
            raise ValueError("No native Forms_Reports baseline exists in this export.")
        options.baseline_directory.mkdir(parents=True, exist_ok=True)
        for suffix, key in (("dg", "snippet"), ("html", "html")):
            target = options.baseline_directory / f"forms-reports.baseline.{suffix}"
            target.write_text(page[key] + "\n", encoding="utf-8")
    print(json.dumps({"output": source_name(options.output), "source": inventory["source"], "counts": inventory["counts"]}, indent=2))


if __name__ == "__main__":
    main()
