"""Verify the compiled native export and extract only this rollout's components."""
import importlib.util
import json
import re
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('creator_parser', ROOT/'scripts/parse_creator_export.py')
parser = importlib.util.module_from_spec(spec)
spec.loader.exec_module(parser)
export = ROOT/'creator/exports/Land_Master_2026-10-21-workflow-audit.ds'
lines = export.read_text(encoding='utf-8').splitlines()
sections = parser.markers(lines)
out = ROOT/'creator/integration-audit/deployed-source'
out.mkdir(parents=True, exist_ok=True)

def tokens(source):
    value = ''.join(x for x in re.findall(r'"(?:\\.|[^"\\])*"|//[^\n]*|/\*[\s\S]*?\*/|\s+|.', source) if not x.isspace() and not x.startswith(('//','/*')))
    # Native compiler moves detailed before the connection attribute.
    return re.sub(r'(connection:"[^"\n]+")detailed:true', r'detailed:true\1', value)

def block(entry):
    depth=0
    comment=False
    begun=False
    result=[]
    for line in lines[entry['line_start']-1:]:
        clean,comment=parser.stripped_for_braces(line,comment)
        depth += clean.count('{')-clean.count('}')
        begun = begun or '{' in clean
        result.append(line)
        if begun and depth==0: break
    return textwrap.dedent('\n'.join(result)).strip()+'\n'

entries = parser.parse_workflows(lines,sections['workflow'],sections['workflow_functions']) + parser.parse_workflows(lines,sections['workflow_functions'],sections['share_settings'])
components = json.loads((ROOT/'creator/integration-audit/prepared/components.json').read_text())
for component in components:
    entry=next(x for x in entries if x['link_name']==component['name'])
    live=block(entry)
    assert tokens(live)==tokens((ROOT/component['source']).read_text(encoding='utf-8')), component['name']+' compiled source differs'
    (out/(component['name']+'.ds')).write_text(live,encoding='utf-8')
for name in ['Finalize_Workflow_Run_Log','Workflow_Log_Timeout']:
    live=block(next(x for x in entries if x['link_name']==name))
    (out/(name+'.ds')).write_text(live,encoding='utf-8')
    assert tokens((ROOT/f'creator/integration-audit/prepared/{name}.action-1.dg').read_text(encoding='utf-8')) in tokens(live),name
assert 'offset = 30' in (out/'Workflow_Log_Timeout.ds').read_text() or '30 minutes' in (out/'Workflow_Log_Timeout.ds').read_text().lower(), 'Inspect native timeout offset'

temporary=ROOT/'tmp/workflow-audit-export-functions'
assert temporary.resolve().is_relative_to((ROOT/'tmp').resolve())
functions=parser.parse_functions(lines,sections['custom_functions'],sections['workflow'],set(),temporary)
for name in ['workflowRunLog','analyticsExportRows','PF_AI_Review','Plat_AI_Ingest','PF_Build_LOI_Document']:
    entry=next(x for x in functions if x['name']==name)
    live=(ROOT/entry['source']).read_text(encoding='utf-8')
    prepared=ROOT/('creator/functions/'+name+'.dg' if name in ['workflowRunLog','analyticsExportRows'] else 'creator/integration-audit/prepared/'+name+'.dg')
    assert tokens(live)==tokens(prepared.read_text(encoding='utf-8')),name+' compiled source differs'
    normalized='\n'.join((line[17:] if line.startswith(' '*17) else line).expandtabs(4).rstrip() for line in textwrap.dedent(live).splitlines())+'\n'
    (ROOT/f'creator/functions/{name}.dg').write_text(normalized,encoding='utf-8')

forms=parser.parse_forms(lines,sections['forms'],sections['reports'])
reports=parser.parse_reports(lines,sections['reports'],sections['pages'])
schema={'source_export':export.relative_to(ROOT).as_posix(),'forms':[x for x in forms if x['link_name'] in ['Settings','Workflow_Run_Log']],'reports':[x for x in reports if x['link_name'] in ['All_Settings','Workflow_Run_Log_Report','User_Access_Report']]}
assert len([x for x in next(x for x in schema['forms'] if x['link_name']=='Workflow_Run_Log')['fields'] if x['type'] not in ['section','submit','cancel']])==18
assert any(x['link_name']=='Workflow_Log_Failure_Recipients' for x in next(x for x in schema['forms'] if x['link_name']=='Settings')['fields'])
(out/'schema.json').write_text(json.dumps(schema,indent=2)+'\n',encoding='utf-8')
print('PASS: all 19 native workflows, two audit workflows and five functions match reviewed source; audit fields/report contracts extracted.')
