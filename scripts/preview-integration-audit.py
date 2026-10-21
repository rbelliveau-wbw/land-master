"""Render local, reviewable source pages for pasting through Creator's browser editor."""
import html
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tmp/workflow-audit-preview"
OUT.mkdir(parents=True, exist_ok=True)
paths = list((ROOT / "creator/integration-audit/prepared").glob("*.ds"))
paths += list((ROOT / "creator/integration-audit/prepared").glob("*.action-*.dg"))
paths += [ROOT / f"creator/functions/{name}.dg" for name in ["workflowRunLog", "analyticsExportRows"]]
paths += [ROOT / f"creator/integration-audit/prepared/{name}.dg" for name in ["PF_AI_Review", "Plat_AI_Ingest", "PF_Build_LOI_Document"]]
links=[]
for source in paths:
    title=source.stem
    (OUT / f"{title}.html").write_text('<!doctype html><html lang="en"><meta charset="utf-8"><title>'+html.escape(title)+'</title><h1>'+html.escape(title)+'</h1><p>'+html.escape(source.relative_to(ROOT).as_posix())+'</p><pre id="source">'+html.escape(source.read_text(encoding="utf-8"))+'</pre></html>',encoding='utf-8')
    links.append('<li><a href="'+title+'.html">'+title+'</a></li>')
baseline=list((ROOT / "creator/integration-audit/baseline").glob("*.ds"))
baseline += [ROOT / f"creator/integration-audit/baseline/functions/{name}.dg" for name in ["PF_AI_Review", "Plat_AI_Ingest", "PF_Build_LOI_Document"]]
for source in baseline:
    title='baseline.'+source.stem
    (OUT / f"{title}.html").write_text('<!doctype html><html lang="en"><meta charset="utf-8"><title>'+html.escape(title)+'</title><h1>'+html.escape(title)+'</h1><pre id="source">'+html.escape(source.read_text(encoding="utf-8"))+'</pre></html>',encoding='utf-8')
    links.append('<li><a href="'+title+'.html">'+title+'</a></li>')
(OUT / "index.html").write_text('<!doctype html><meta charset="utf-8"><title>Workflow Audit Sources</title><h1>Workflow Audit Sources</h1><ul>'+''.join(links)+'</ul>',encoding='utf-8')
print(OUT)
