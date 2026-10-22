"""Verify all existing destination field values and insert payloads remain unchanged."""
import importlib.util
import json
import re
import sqlite3
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
    if name=='Equipment_Sync_Create_Equ':
        # Explicit October 22 repair exception: the live source has PurchaseDate,
        # and the native destination is a date field. Every other assignment,
        # insert field, selected column and schedule still compares unchanged.
        old=old.replace('cols.add("PurchaseYear");','cols.add("PurchaseDate");')
        old=re.sub(r'(cols.add\("SerialNo"\);\s*)cols.add\("Description"\);',r'\1',old)
        old=old.replace('Purchase_Date=rec.get("PurchaseYear")','Purchase_Date=purchaseDateValue')
        assert 'PurchaseYear' not in new
        assert new.count('cols.add("Description");')==1
        assert 'purchaseDateText.toDate("dd/MM/yyyy HH:mm:ss")' in new
        assert 'if(purchaseDateValue != null)' in new
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
print(f'PASS: {len(components)} workflow components and three functions preserve native assignments, inserts, schedules, source columns, returns and request counts, with only the explicit Equipment purchase-date/duplicate-column repair exception.')

# Execute the exact Analytics SQL on the observed split-major shape, credits,
# boundary exclusions and unmapped jobs. SQLite is a relational fixture here;
# Analytics Execute/Save verifies the vendor dialect separately.
db=sqlite3.connect(':memory:')
db.execute('CREATE TABLE [GP - Job Cost Detail MSTR+HIST (JC00701+JC30101)] (WS_Job_Number_Trim TEXT, Cost_Code_Number_1 INTEGER, Cost_Code_Number_2 INTEGER, Cost_Code_Description TEXT, Cost_Code_Act_Cost_TTD NUMERIC)')
db.execute('CREATE TABLE [External System Mapping (Zoho Creator)] ([External Code] TEXT)')
db.execute('INSERT INTO [External System Mapping (Zoho Creator)] VALUES (?)', ('EXAMPLE_JOB',))
db.executemany('INSERT INTO [GP - Job Cost Detail MSTR+HIST (JC00701+JC30101)] VALUES (?,?,?,?,?)', [
    ('EXAMPLE_JOB',4900,4955,'Attorneys',100.25),
    ('EXAMPLE_JOB',4950,4955,'Attorneys',4.75),
    ('EXAMPLE_JOB',8000,8010,'Credit',-100),
    ('EXAMPLE_JOB',8000,8010,'Credit',25),
    ('EXAMPLE_JOB',4100,4000,'Lower boundary',2),
    ('EXAMPLE_JOB',4100,5000,'Excluded upper boundary',10),
    ('EXAMPLE_JOB',8000,9000,'Excluded upper boundary',20),
    ('EXAMPLE_JOB',4100,4100,'Zero excluded',0),
    ('UNMAPPED',4900,4955,'Attorneys',999),
])
query_root=BASE.parent/'analytics'
before=db.execute((query_root/'baseline/gp-development-costs.sql').read_text()).fetchall()
after=db.execute((query_root/'gp-development-costs.sql').read_text()).fetchall()
assert len(before)==4 and len(after)==3, 'Only the split-major Attorneys rows should combine'
assert [row for row in after if row[2]==4955]==[('EXAMPLE_JOB',4900,4955,'Attorneys',105)]
assert sum(row[4] for row in before)==sum(row[4] for row in after), 'Grouping must preserve every included dollar'
assert [row[4] for row in after if row[2]==8010]==[-75], 'Negative credits must retain their sign'
db.close()
print('PASS: GP split-major aggregation, total preservation, credits, ranges, zero exclusions and mapping scope.')
