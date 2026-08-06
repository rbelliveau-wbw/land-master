#!/usr/bin/env python3
"""Regenerate Creator metadata and extracted custom functions from a Zoho Creator .ds export.

Usage:
    python3 scripts/parse_creator_export.py
    python3 scripts/parse_creator_export.py --export creator/exports/Land_Master_2026-08-06.ds

No third-party packages are required. The parser is intentionally conservative: structured
metadata is generated where the export format is stable, while complete raw workflow sections
are retained as canonical fallbacks.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.rstrip() + "\n", encoding="utf-8")


def write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def markers(lines: list[str]) -> dict[str, int]:
    found: dict[str, int] = {}
    for index, line in enumerate(lines):
        value = line.strip()
        if value == "forms" and "forms" not in found:
            found["forms"] = index
        elif value == "reports" and "reports" not in found:
            found["reports"] = index
        elif value == "pages" and "pages" not in found:
            found["pages"] = index
        elif value == "variables" and "variables" not in found:
            found["variables"] = index
        elif value == "functions":
            if "custom_functions" not in found and index < 30000:
                found["custom_functions"] = index
            elif "workflow_functions" not in found:
                found["workflow_functions"] = index
        elif value == "workflow" and "workflow" not in found:
            found["workflow"] = index
        elif value == "share_settings" and "share_settings" not in found:
            found["share_settings"] = index
        elif value == "connections" and "connections" not in found:
            found["connections"] = index
        elif value == "web" and "web" not in found:
            found["web"] = index
    required = {
        "forms", "reports", "pages", "variables", "custom_functions", "workflow",
        "workflow_functions", "share_settings", "connections", "web",
    }
    missing = sorted(required - found.keys())
    if missing:
        raise RuntimeError(f"Could not locate DS sections: {', '.join(missing)}")
    return found


def parse_forms(lines: list[str], start: int, end: int) -> list[dict[str, Any]]:
    starts: list[tuple[int, str]] = []
    for index in range(start + 1, end):
        match = re.match(r"^\s*form\s+([A-Za-z_][A-Za-z0-9_]*)\s*$", lines[index])
        if match:
            starts.append((index, match.group(1)))

    forms: list[dict[str, Any]] = []
    for position, (start_line, name) in enumerate(starts):
        stop_line = starts[position + 1][0] if position + 1 < len(starts) else end
        block = lines[start_line:stop_line]
        text = "\n".join(block)
        display_match = re.search(r'displayname\s*=\s*"([^"]+)"', text)
        fields: list[dict[str, Any]] = []
        index = 1
        while index < len(block) - 1:
            declaration = re.match(
                r"^\s*(?:(?:must have unique|unique)\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*$",
                block[index],
            )
            if declaration and block[index + 1].strip() == "(":
                field_name = declaration.group(1)
                opening_indent = len(block[index + 1]) - len(block[index + 1].lstrip())
                cursor = index + 2
                body: list[str] = []
                while cursor < len(block):
                    line = block[cursor]
                    if line.strip() == ")" and len(line) - len(line.lstrip()) == opening_indent:
                        break
                    body.append(line)
                    cursor += 1
                field_text = "\n".join(body)

                def prop(pattern: str) -> str | None:
                    match = re.search(pattern, field_text, re.M)
                    return match.group(1).strip() if match else None

                field_type = prop(r"^\s*type\s*=\s*([^\n]+)") or "unknown"
                display = prop(r'^\s*displayname\s*=\s*"([^"]+)"') or field_name.replace("_", " ")
                fields.append({
                    "link_name": field_name,
                    "display_name": display,
                    "type": field_type,
                    "values": prop(r"^\s*values\s*=\s*([^\n]+)"),
                    "display_format": prop(r"^\s*displayformat\s*=\s*([^\n]+)"),
                    "initial_value": prop(r"^\s*initial value\s*=\s*([^\n]+)"),
                    "private": (prop(r"^\s*private\s*=\s*([^\n]+)") or "false").lower() == "true",
                })
                index = cursor + 1
                continue
            index += 1
        forms.append({
            "link_name": name,
            "display_name": display_match.group(1) if display_match else name.replace("_", " "),
            "field_count": len(fields),
            "fields": fields,
        })
    return forms


def parse_reports(lines: list[str], start: int, end: int) -> list[dict[str, Any]]:
    pattern = re.compile(
        r"^\s*(default list|list|calendar|kanban|spreadsheet|pivot|chart|map)\s+([A-Za-z_][A-Za-z0-9_]*)\s*$"
    )
    starts: list[tuple[int, str, str]] = []
    for index in range(start + 1, end):
        match = pattern.match(lines[index])
        if match:
            starts.append((index, match.group(1), match.group(2)))
    reports: list[dict[str, Any]] = []
    for position, (start_line, report_type, name) in enumerate(starts):
        stop_line = starts[position + 1][0] if position + 1 < len(starts) else end
        text = "\n".join(lines[start_line:stop_line])
        display = re.search(r'displayName\s*=\s*"([^"]+)"', text)
        source = re.search(r"show all rows from\s+([A-Za-z_][A-Za-z0-9_]*)", text)
        reports.append({
            "link_name": name,
            "display_name": display.group(1) if display else name.replace("_", " "),
            "type": report_type,
            "source_form": source.group(1) if source else None,
            "custom_actions": sorted(set(re.findall(r'custom action\s+"([^"]+)"', text))),
        })
    return reports


def parse_pages(lines: list[str], start: int, end: int) -> list[dict[str, Any]]:
    pages: list[dict[str, Any]] = []
    for index in range(start + 1, end):
        match = re.match(r"^\s*page\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:\((.*)\))?\s*$", lines[index])
        if not match:
            continue
        name, raw_parameters = match.group(1), match.group(2) or ""
        display = None
        for cursor in range(index + 1, min(index + 8, end)):
            display_match = re.search(r'displayname\s*=\s*"([^"]+)"', lines[cursor])
            if display_match:
                display = display_match.group(1)
                break
        parameters = []
        for piece in [value.strip() for value in raw_parameters.split(",") if value.strip()]:
            parameter_match = re.match(
                r"(?:(int|string|date|decimal|long|boolean)\s+)?([A-Za-z_][A-Za-z0-9_]*)$", piece
            )
            if parameter_match:
                parameters.append({"name": parameter_match.group(2), "type": parameter_match.group(1) or "unspecified"})
        pages.append({
            "link_name": name,
            "display_name": display or name.replace("_", " "),
            "parameters": parameters,
        })
    return pages


def stripped_for_braces(line: str, in_block_comment: bool) -> tuple[str, bool]:
    output: list[str] = []
    index = 0
    quote: str | None = None
    while index < len(line):
        if in_block_comment:
            end = line.find("*/", index)
            if end < 0:
                return "".join(output), True
            index = end + 2
            in_block_comment = False
            continue
        if quote:
            if line[index] == "\\":
                index += 2
                continue
            if line[index] == quote:
                quote = None
            index += 1
            continue
        if line.startswith("/*", index):
            in_block_comment = True
            index += 2
            continue
        if line.startswith("//", index):
            break
        if line[index] in {'"', "'"}:
            quote = line[index]
            index += 1
            continue
        output.append(line[index])
        index += 1
    return "".join(output), in_block_comment


def parse_functions(
    lines: list[str], start: int, end: int, known_forms: set[str], destination: Path
) -> list[dict[str, Any]]:
    declaration = re.compile(
        r"^\s*(string|map|void|list|int|long|decimal|date|datetime|boolean|collection)\s+"
        r"([A-Za-z_][A-Za-z0-9_]*)\s*\((.*)\)\s*$"
    )
    if destination.exists():
        shutil.rmtree(destination)
    destination.mkdir(parents=True, exist_ok=True)
    functions: list[dict[str, Any]] = []
    index = start + 1
    while index < end:
        match = declaration.match(lines[index])
        if not match:
            index += 1
            continue
        return_type, name, raw_parameters = match.groups()
        opening = index + 1
        while opening < end and "{" not in lines[opening]:
            opening += 1
        if opening >= end:
            index += 1
            continue
        depth = 0
        in_comment = False
        cursor = opening
        while cursor < end:
            stripped, in_comment = stripped_for_braces(lines[cursor], in_comment)
            depth += stripped.count("{") - stripped.count("}")
            if depth == 0 and cursor > opening:
                break
            cursor += 1
        body = "\n".join(lines[index:cursor + 1]) + "\n"
        parameters = []
        for piece in [value.strip() for value in raw_parameters.split(",") if value.strip()]:
            parameter_match = re.match(
                r"(string|map|void|list|int|long|decimal|date|datetime|boolean|collection)\s+"
                r"([A-Za-z_][A-Za-z0-9_]*)$",
                piece,
            )
            parameters.append({
                "type": parameter_match.group(1) if parameter_match else "unknown",
                "name": parameter_match.group(2) if parameter_match else piece,
            })
        source = destination / f"{name}.dg"
        write(source, body)
        functions.append({
            "name": name,
            "return_type": return_type,
            "parameters": parameters,
            "source": source.relative_to(ROOT).as_posix(),
            "reads_or_writes_forms": sorted(
                form for form in known_forms if re.search(rf"\b{re.escape(form)}\s*\[", body)
            ),
            "thisapp_calls": sorted(set(re.findall(r"\bthisapp\.([A-Za-z_][A-Za-z0-9_]*)\s*\(", body))),
            "connections": sorted(set(re.findall(r'connection\s*:\s*"([^"]+)"', body))),
            "contains_sendmail": "sendmail" in body,
            "contains_invokeurl": "invokeurl" in body.lower(),
            "line_start": index + 1,
            "line_end": cursor + 1,
        })
        index = cursor + 1
    return functions


def parse_workflows(lines: list[str], start: int, end: int) -> list[dict[str, Any]]:
    pattern = re.compile(r'^\s*([A-Za-z_][A-Za-z0-9_]*)\s+as\s+"([^"]+)"\s*$')
    workflows: list[dict[str, Any]] = []
    seen: set[str] = set()
    for index in range(start + 1, end):
        match = pattern.match(lines[index])
        if not match or match.group(1) in seen:
            continue
        name, display = match.groups()
        nearby = "\n".join(lines[index:index + 20])
        workflow_type = re.search(r"^\s*type\s*=\s*([^\n]+)", nearby, re.M)
        form = re.search(r"^\s*form\s*=\s*([A-Za-z_][A-Za-z0-9_]*)", nearby, re.M)
        event = re.search(r"^\s*(?:record event|event)\s*=\s*([^\n]+)", nearby, re.M)
        workflows.append({
            "link_name": name,
            "display_name": display,
            "type": workflow_type.group(1).strip() if workflow_type else None,
            "form": form.group(1) if form else None,
            "event": event.group(1).strip() if event else None,
            "line_start": index + 1,
        })
        seen.add(name)
    return workflows


def parse_connections(lines: list[str], start: int, end: int) -> list[dict[str, Any]]:
    connections = []
    index = start + 1
    while index < end:
        match = re.match(r"^\s*([A-Za-z_][A-Za-z0-9_]*)\s*$", lines[index])
        if match and index + 1 < end and lines[index + 1].strip() == "(":
            name = match.group(1)
            cursor = index + 2
            body = []
            while cursor < end and lines[cursor].strip() != ")":
                body.append(lines[cursor])
                cursor += 1
            text = "\n".join(body)
            display = re.search(r'displayname\s*=\s*"([^"]+)"', text)
            connector = re.search(r"connector\s*=\s*([^\n]+)", text)
            permissions = re.search(r"permissions\s*=\s*\{([^}]*)\}", text)
            connections.append({
                "link_name": name,
                "display_name": display.group(1) if display else name,
                "connector": connector.group(1).strip() if connector else None,
                "permissions": re.findall(r'"([^"]+)"', permissions.group(1)) if permissions else [],
            })
            index = cursor + 1
            continue
        index += 1
    return connections


def markdown_table(rows: list[list[Any]], headers: list[str]) -> str:
    def escaped(value: Any) -> str:
        return str(value if value is not None else "").replace("|", "\\|").replace("\n", " ")
    output = ["| " + " | ".join(headers) + " |", "| " + " | ".join("---" for _ in headers) + " |"]
    output.extend("| " + " | ".join(escaped(value) for value in row) + " |" for row in rows)
    return "\n".join(output)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--export", type=Path, help="Creator .ds export path")
    args = parser.parse_args()
    export = args.export
    if export is None:
        candidates = sorted((ROOT / "creator/exports").glob("*.ds"), key=lambda p: p.stat().st_mtime)
        if not candidates:
            raise SystemExit("No .ds exports found under creator/exports/.")
        export = candidates[-1]
    if not export.is_absolute():
        export = ROOT / export
    export = export.resolve()
    if not export.exists():
        raise SystemExit(f"Export not found: {export}")

    lines = export.read_text(encoding="utf-8", errors="ignore").splitlines()
    section = markers(lines)
    forms = parse_forms(lines, section["forms"], section["reports"])
    reports = parse_reports(lines, section["reports"], section["pages"])
    pages = parse_pages(lines, section["pages"], section["variables"])
    functions = parse_functions(
        lines,
        section["custom_functions"],
        section["workflow"],
        {form["link_name"] for form in forms},
        ROOT / "creator/functions",
    )
    workflows = parse_workflows(lines, section["workflow"], section["workflow_functions"])
    workflow_functions = parse_workflows(lines, section["workflow_functions"], section["share_settings"])
    connections = parse_connections(lines, section["connections"], section["web"])
    generated_at = datetime.now(timezone.utc).isoformat()

    generated = ROOT / "creator/generated"
    write_json(generated / "application.json", {
        "application": "Land Master",
        "repository_generated_at": generated_at,
        "source_export": export.relative_to(ROOT).as_posix(),
        "source_sha256": sha256(export),
        "counts": {
            "forms": len(forms),
            "fields": sum(form["field_count"] for form in forms),
            "reports": len(reports),
            "pages": len(pages),
            "custom_functions": len(functions),
            "workflows": len(workflows),
            "workflow_functions": len(workflow_functions),
            "connections": len(connections),
        },
        "trust": "Generated directly from the selected Zoho Creator DS export.",
    })
    write_json(generated / "forms.json", {"generated_at": generated_at, "forms": forms})
    write_json(generated / "reports.json", {"generated_at": generated_at, "reports": reports})
    write_json(generated / "pages.json", {"generated_at": generated_at, "pages": pages})
    write_json(generated / "functions.json", {"generated_at": generated_at, "functions": functions})
    write_json(generated / "workflows.json", {
        "generated_at": generated_at,
        "workflows": workflows,
        "workflow_functions": workflow_functions,
    })
    write_json(generated / "connections.json", {"generated_at": generated_at, "connections": connections})

    fields_dir = generated / "fields"
    if fields_dir.exists():
        shutil.rmtree(fields_dir)
    for form in forms:
        write_json(fields_dir / f"{form['link_name']}.json", {
            "generated_at": generated_at,
            "form": form["link_name"],
            "display_name": form["display_name"],
            "fields": form["fields"],
        })

    raw = ROOT / "creator/raw"
    write(raw / "custom-functions-section.ds", "\n".join(lines[section["custom_functions"]:section["workflow"]]))
    write(raw / "workflow-section.ds", "\n".join(lines[section["workflow"]:section["workflow_functions"]]))
    write(raw / "workflow-functions-section.ds", "\n".join(lines[section["workflow_functions"]:section["share_settings"]]))

    write(generated / "FORMS.md", "# Creator Forms\n\n" + markdown_table(
        [[form["link_name"], form["display_name"], form["field_count"]] for form in forms],
        ["Link name", "Display name", "Fields"],
    ))
    write(generated / "REPORTS.md", "# Creator Reports\n\n" + markdown_table(
        [[report["link_name"], report["display_name"], report["type"], report["source_form"] or ""] for report in reports],
        ["Link name", "Display name", "Type", "Source form"],
    ))
    write(generated / "PAGES.md", "# Creator Pages\n\n" + markdown_table(
        [[page["link_name"], page["display_name"], ", ".join(p["name"] for p in page["parameters"])] for page in pages],
        ["Link name", "Display name", "Parameters"],
    ))
    write(generated / "FUNCTIONS.md", "# Custom Deluge Functions\n\n" + markdown_table(
        [[function["name"], function["return_type"], len(function["parameters"]), ", ".join(function["reads_or_writes_forms"][:6])] for function in functions],
        ["Function", "Returns", "Parameters", "Detected forms"],
    ))
    write_json(ROOT / "manifests/functions.json", {
        "generated_at": generated_at,
        "source": "creator/generated/functions.json",
        "functions": functions,
    })

    print(json.dumps({
        "export": export.relative_to(ROOT).as_posix(),
        "forms": len(forms),
        "fields": sum(form["field_count"] for form in forms),
        "reports": len(reports),
        "pages": len(pages),
        "custom_functions": len(functions),
        "workflows": len(workflows),
        "connections": len(connections),
    }, indent=2))


if __name__ == "__main__":
    main()
