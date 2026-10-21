"""Extract current external integration entry points without replacing generated metadata."""
import importlib.util
import json
import re
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("creator_parser", ROOT / "scripts/parse_creator_export.py")
parser = importlib.util.module_from_spec(spec)
spec.loader.exec_module(parser)
source = ROOT / "creator/exports/Land_Master_2026-10-21-development.ds"
lines = source.read_text(encoding="utf-8").splitlines()
sections = parser.markers(lines)
out = ROOT / "creator/integration-audit/baseline"
out.mkdir(parents=True, exist_ok=True)
external = re.compile(r"invokeurl|getUrl\(|postUrl\(|zoho\.(?:projects|crm|books|writer|sheet|recruit|analytics)\.", re.I)
def executable(source):
    # Preserve quoted URLs, but exclude commented-out calls from the inventory.
    return re.sub(r'"(?:\\.|[^"\\])*"|//[^\n]*|/\*[\s\S]*?\*/', lambda m: m[0] if m[0].startswith('"') else ' ', source)
inventory = []
for section, end in [("workflow", "workflow_functions"), ("workflow_functions", "share_settings")]:
    entries = parser.parse_workflows(lines, sections[section], sections[end])
    for i, entry in enumerate(entries):
        start = entry["line_start"] - 1
        stop = entries[i + 1]["line_start"] - 1 if i + 1 < len(entries) else sections[end]
        depth = 0
        in_comment = False
        begun = False
        for cursor in range(start, stop):
            clean, in_comment = parser.stripped_for_braces(lines[cursor], in_comment)
            depth += clean.count("{") - clean.count("}")
            begun = begun or "{" in clean
            if begun and depth == 0:
                stop = cursor + 1
                break
        block = "\n".join(lines[start:stop])
        if not external.search(executable(block)):
            continue
        name = entry["link_name"]
        (out / (name + ".ds")).write_text(textwrap.dedent(block).rstrip() + "\n", encoding="utf-8")
        entry["section"] = section
        entry["source"] = (out / (name + ".ds")).relative_to(ROOT).as_posix()
        entry["analytics"] = "analyticsapi.zoho.com" in block
        entry["async_export"] = "/bulk/" in block
        entry["connections"] = sorted(set(re.findall(r'connection\s*:\s*"([^"]+)"', block)))
        inventory.append(entry)
# Extract custom functions to an isolated baseline, keeping current production-ready source intact.
temporary = ROOT / 'tmp/workflow-audit-baseline-functions'
assert temporary.resolve().is_relative_to((ROOT/'tmp').resolve())
functions = parser.parse_functions(lines, sections["custom_functions"], sections["workflow"], set(), temporary)
for function in functions:
    body = (ROOT / function["source"]).read_text(encoding="utf-8")
    if external.search(executable(body)):
        target=out/'functions'/f'{function["name"]}.dg'
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_text(body,encoding='utf-8')
        inventory.append({"link_name": function["name"], "type": "function", "source": target.relative_to(ROOT).as_posix(), "connections": function["connections"]})
(out.parent / "inventory.json").write_text(json.dumps(inventory, indent=2) + "\n", encoding="utf-8")
print(json.dumps([{k: x.get(k) for k in ["link_name", "display_name", "type", "analytics", "async_export"]} for x in inventory], indent=2))
