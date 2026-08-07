#!/usr/bin/env python3
"""Regenerate inferred widget dependencies and Custom API candidates.

This scanner compares exact form/report names from the current Creator metadata against each
widget source and extracts Custom API names from common widget configuration patterns. Results
are inferred and must be verified against Creator Microservices.
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]


def write_json(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def scan(html: str, forms: set[str], reports: set[str]) -> dict[str, Any]:
    custom_apis: dict[str, dict[str, Any]] = {}
    for block in re.findall(r"customApis\s*:\s*\{(.*?)\}", html, re.S):
        for key, value in re.findall(r"([A-Za-z_][A-Za-z0-9_]*)\s*:\s*[\"']([^\"']+)[\"']", block):
            custom_apis[value] = {"name": value, "config_key": key, "source": "customApis object"}
    for value in re.findall(r"api_name\s*:\s*[\"']([^\"']+)[\"']", html):
        custom_apis.setdefault(value, {"name": value, "config_key": None, "source": "literal api_name"})
    for key, array in re.findall(r"([A-Za-z_][A-Za-z0-9_]*(?:Api|API)Candidates)\s*:\s*\[(.*?)\]", html, re.S):
        for value in re.findall(r"[\"']([^\"']+)[\"']", array):
            custom_apis.setdefault(value, {"name": value, "config_key": key, "source": "candidate array"})
    urls = re.findall(r"https?://[^\s\"'<>]+", html)
    return {
        "custom_apis": sorted(custom_apis.values(), key=lambda item: item["name"].lower()),
        "forms_referenced": sorted(name for name in forms if re.search(rf"(?<![A-Za-z0-9_]){re.escape(name)}(?![A-Za-z0-9_])", html)),
        "reports_referenced": sorted(name for name in reports if re.search(rf"(?<![A-Za-z0-9_]){re.escape(name)}(?![A-Za-z0-9_])", html)),
        "sdk_calls": sorted(set(re.findall(r"ZOHO\.CREATOR\.[A-Za-z0-9_.]+", html))),
        "external_domains": sorted(set(re.sub(r"^https?://", "", url).split("/")[0] for url in urls)),
    }


def main() -> None:
    forms_data = json.loads((ROOT / "creator/generated/forms.json").read_text(encoding="utf-8"))
    reports_data = json.loads((ROOT / "creator/generated/reports.json").read_text(encoding="utf-8"))
    functions_data = json.loads((ROOT / "creator/generated/functions.json").read_text(encoding="utf-8"))
    widgets_data = json.loads((ROOT / "manifests/widgets.json").read_text(encoding="utf-8"))
    forms = {item["link_name"] for item in forms_data["forms"]}
    reports = {item["link_name"] for item in reports_data["reports"]}
    normalized_functions = {
        re.sub(r"[^a-z0-9]", "", item["name"].lower()): item["name"]
        for item in functions_data["functions"]
    }
    # A change can add a reviewed standalone function before the next Creator .ds
    # export is refreshed. Include those source filenames in Custom API matching
    # without pretending they are already present in generated live metadata.
    for source in (ROOT / "creator" / "functions").glob("*.dg"):
        normalized_functions.setdefault(
            re.sub(r"[^a-z0-9]", "", source.stem.lower()), source.stem
        )
    generated_at = datetime.now(timezone.utc).isoformat()
    dependencies: dict[str, Any] = {}
    api_registry: dict[str, dict[str, Any]] = {}

    for widget in widgets_data["widgets"]:
        source = ROOT / widget["source_entry"]
        html = source.read_text(encoding="utf-8", errors="ignore")
        result = scan(html, forms, reports)
        dependencies[widget["slug"]] = result
        write_json(ROOT / "widgets" / widget["slug"] / "dependencies.generated.json", result)
        for api in result["custom_apis"]:
            key = api["name"].lower()
            entry = api_registry.setdefault(key, {
                "name": api["name"],
                "consumers": [],
                "matching_creator_function": None,
                "confidence": "inferred-from-widget-source",
            })
            entry["consumers"].append(widget["source_entry"])
            normalized = re.sub(r"[^a-z0-9]", "", api["name"].lower())
            if normalized in normalized_functions:
                entry["matching_creator_function"] = normalized_functions[normalized]
                entry["confidence"] = "inferred-name-match"

    write_json(ROOT / "manifests/widget-dependencies.json", {
        "generated_at": generated_at,
        "method": "inferred by scanning widget source and matching exact Creator form/report names",
        "widgets": dependencies,
    })
    write_json(ROOT / "manifests/custom-apis.json", {
        "generated_at": generated_at,
        "warning": "Creator DS exports do not provide a verified Custom API registry. Verify method, parameters, auth, user scope, and enabled status in Creator Microservices.",
        "custom_apis": sorted(api_registry.values(), key=lambda item: item["name"].lower()),
    })
    print(f"Scanned {len(dependencies)} widgets and inferred {len(api_registry)} Custom API names.")


if __name__ == "__main__":
    main()
