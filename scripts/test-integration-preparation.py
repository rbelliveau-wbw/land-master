"""Verify all existing destination field values and insert payloads remain unchanged."""
import importlib.util
import json
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'creator/integration-audit/baseline'
OUT=ROOT/'creator/integration-audit/prepared'
def tokens(source):
    return ''.join(token for token in re.findall(r'"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|//[^\n]*|/\*[\s\S]*?\*/|\s+|.',source) if not token.isspace() and not token.startswith(('//','/*')))
record_names='budgimpItem|equip|ms|subdiv|existingItem|budgCat|budG|input'
def native_assignments(source):
    return [tokens(m[0]) for m in re.finditer(rf'(?m)^\s*(?:{record_names})\.\w+\s*=(?!=)[^\n]*;',source)]
def inserts(source):
    return [tokens(m[0]) for m in re.finditer(r'\b\w+\s*=\s*insert into \w+\s*\[[\s\S]*?\];',source)]
components=json.loads((OUT/'components.json').read_text())
for component in components:
    name=component['name']
    old=(BASE/f'{name}.ds').read_text(encoding='utf-8')
    new=(OUT/f'{name}.ds').read_text(encoding='utf-8')
    assert native_assignments(old)==native_assignments(new),f'{name}: existing native field assignments changed'
    assert inserts(old)==inserts(new),f'{name}: existing insert payload changed'
    for pattern in [r'(?m)^\s*(?:type|start|frequency|time zone|status|form)\s*=\s*[^\n]+',r'\w+\.add\("[^"]+"\);']:
        assert [tokens(m[0]) for m in re.finditer(pattern,old)]==[tokens(m[0]) for m in re.finditer(pattern,new)],f'{name}: existing scope/schedule/selected columns changed'
    assert 'thisapp.workflowRunLog(' in new and 'catch(auditError)' in new and 'throw auditError;' in new,name
    assert not re.search(r'\}\s*\.contains\(',new), f'{name}: literal method chaining rejected by native compiler'
    if name=='Budgets_Check_HCSS_Budget':
        assert 'if(ms.count()' not in new, 'Destination variable matching must respect identifier boundaries'
    if 'analyticsapi.zoho.com' in old:
        assert 'analyticsapi.zoho.com' not in new,f'{name}: unguarded direct Analytics export remains'
        assert 'thisapp.analyticsExportRows(' in new,name
    if 'type =  schedule' in old and name!='Update_Budgets_w_Projects1':
        assert new.count('on load')==old.count('on load'),name
    if name.startswith('Budgets_Import_') or name=='Diagnose_HeavyJob_Cost_Sy':
        assert 'auditMissingMapping' in new and 'auditNoBudget' in new,name
for name in ['PF_AI_Review','Plat_AI_Ingest','PF_Build_LOI_Document']:
    old=(BASE/'functions'/f'{name}.dg').read_text(encoding='utf-8')
    new=(OUT/f'{name}.dg').read_text(encoding='utf-8')
    assert inserts(old)==inserts(new),name
    assert re.findall(r'\breturn\s+(?:resp\.toString\(\)|result);',old)==re.findall(r'\breturn\s+(?:resp\.toString\(\)|result);',new),name
    assert new.count('invokeurl')==old.count('invokeurl'),name
    assert 'thisapp.workflowRunLog(' in new,name
print(f'PASS: {len(components)} workflow components and three functions preserve native field assignments, insert payloads, schedules, source columns, return contracts and external request counts.')
