"""Prepare reviewable Deluge component patches from the approved current export.

No network or deployment. Baseline schedules, native writes and exclusions remain explicit.
"""
import json
import re
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "creator/integration-audit/baseline"
OUT = ROOT / "creator/integration-audit/prepared"
OUT.mkdir(parents=True, exist_ok=True)

def masked(source):
    return re.sub(r'//[^\n]*|/\*[\s\S]*?\*/|"(?:\\.|[^"\\])*"', lambda m: " " * len(m[0]) if "\n" not in m[0] else re.sub(r"[^\n]", " ", m[0]), source)

def matching(source, start, left="(", right=")"):
    clean = masked(source)
    depth = 0
    for i in range(start, len(source)):
        if clean[i] == left: depth += 1
        if clean[i] == right: depth -= 1
        if depth == 0: return i
    raise ValueError("Unclosed block")

def blocks(source):
    result = []
    for m in re.finditer(r"\bon (?:load|click)\s*\(", masked(source)):
        opening = source.index("(", m.start())
        closing = matching(source, opening)
        body = source[opening+1:closing]
        # Export indents the first body line differently from subsequent lines.
        body = "\n".join(x[7:] if x.startswith("\t" * 7) else x for x in body.splitlines()).strip()
        result.append((opening+1, closing, body))
    return result

def insert_block_end(source, pattern, addition):
    edits=[]
    for m in re.finditer(pattern, source):
        brace=source.index("{",m.start())
        end=matching(source,brace,"{","}")
        edits.append((end,addition))
    for pos,value in reversed(edits): source=source[:pos]+value+source[pos:]
    return source

def patch_body(body, name, display, analytics):
    original = body
    # The same job code can validly exist in GP and HeavyJob. CTC is HeavyJob-only.
    if name == 'Budgets_Import_Load_CTC_C':
        body = body.replace('subdiv = External_System_Mapping[External_Code = rec.get("H.JobCode")];',
                            'subdiv = External_System_Mapping[(External_Code == rec.get("H.JobCode")) && (External_System == "HeavyJob")];')
    # All Analytics consumers share completion, HTTP, payload and selected-column checks.
    if "/bulk/" in body and "rows = dataResp.get(\"data\");" in body:
        begin=body.index("params = Map();")
        end=body.index('rows = dataResp.get("data");',begin)+len('rows = dataResp.get("data");')
        allow_empty = name in {"Update_Projects_Start_End", "Milestone_Bi_Directional_1"}
        body=body[:begin]+f'rows = thisapp.analyticsExportRows(viewId,config,auditId,{str(allow_empty).lower()});\nauditReceived = rows.size();\n'+body[end:]
    # Synchronous Analytics reads also use the validated asynchronous transport.
    def transport(m):
        variable=m['variable']; request=m['request']
        if 'analyticsapi.zoho.com' in request:
            literal=re.search(r'/views/(\d+)/data',request)
            view='"'+literal[1]+'"' if literal else 'viewId'
            param=re.search(r'parameters\s*:\s*(\w+)',request)[1]
            config=re.search(rf'{param}\.put\("CONFIG",(\w+)\.toString\(\)\)',body)[1]
            allow_empty='true' if variable=='tasksResponse' else 'false'
            return f'{variable} = {{"data":thisapp.analyticsExportRows({view},{config},auditId,{allow_empty})}};\nauditReceived = auditReceived + {variable}.get("data").size();'
        if 'projectsapi.zoho.com' in request:
            writing = not re.search(r'type\s*:\s*GET\b',request)
            request=request.rstrip()+'\n detailed:true\n'
            return ('auditWriteAttempted = true;\n' if writing else '')+f'''{variable}Http = invokeurl
[{request}];
if({variable}Http.get("responseCode") < 200 || {variable}Http.get("responseCode") >= 300) {{ throw "Zoho Projects HTTP " + {variable}Http.get("responseCode"); }}
{variable} = {variable}Http.get("responseText");
responseText = {variable}.toString();
if(responseText.length() == 0) {{ throw "Zoho Projects returned an empty acknowledgement; verify the destination before retrying."; }}
if(responseText.left(1) == "{{")
{{
 {variable} = responseText.toMap();
 apiFailureStatuses = {{"error","failed","failure"}};
 if({variable}.get("error") != null || {variable}.get("errors") != null || apiFailureStatuses.contains(ifnull({variable}.get("status"),"").toString().toLowerCase())) {{ throw "Zoho Projects returned an API error."; }}
}}
else if(responseText.left(1) != "[") {{ throw "Zoho Projects returned a non-JSON response."; }}
{('auditUpdated = auditUpdated + 1; auditRowChanged = true;' if writing else '')}
'''
        return m[0]
    body=re.sub(r'(?P<variable>\w+)\s*=\s*invokeurl\s*\[(?P<request>[\s\S]*?)\];',transport,body)
    # Native upsert duplicate counts can no longer fall through without a result.
    for variable in ["budgimpItem", "equip", "ms"]:
        pattern=rf'(\b{variable}\s*=\s*(?:Budget_Import_Item|Equipment|Milestones)\[[^\n]*\];)'
        body=re.sub(pattern,lambda m:m[0]+f'\nif({variable}.count() > 1) {{ throw "Duplicate destination records: {variable}; source row=" + auditProcessed; }}',body)
    # Explicit missing mappings remain excluded. Duplicate/broken mappings are failures.
    mapping_pattern=r'(?P<variable>subdivCode|subdiv)\s*=\s*External_System_Mapping\[[^\n]*\];'
    def mapping(m):
        v=m['variable']
        return m[0]+f'\nif({v}.count() == 0) {{ auditMissingMapping = auditMissingMapping + 1; auditSkipped = auditSkipped + 1; continue; }}\nif({v}.count() != 1 || {v}.Subdivision1 == null) {{ throw "Duplicate or broken external mapping; source row=" + auditProcessed; }}'
    if name.startswith("Budgets_Import_") or name in {'Budgets_Check_HCSS_Budget','Diagnose_HeavyJob_Cost_Sy'}:
        body=re.sub(mapping_pattern,mapping,body)
        body=re.sub(r'(budgCheck\s*=\s*Add_Budget\[[^\n]*\];)',r'\1\nif(budgCheck.count() == 0) { auditNoBudget = auditNoBudget + 1; auditSkipped = auditSkipped + 1; continue; }',body)
        body=re.sub(r'if\(budgCodes\.contains\((\w+)\.Subdivision1\.Subdivision_Code\)\)',r'if(!budgCodes.contains(\1.Subdivision1.Subdivision_Code)) { auditNoBudget = auditNoBudget + 1; auditSkipped = auditSkipped + 1; continue; }\nif(budgCodes.contains(\1.Subdivision1.Subdivision_Code))',body)
        # Validate only eligible costs; outside-scope mappings/budgets still skip cheaply.
        costs={'Budgets_Import_Load_HCSS_':'TotalActualCost','Diagnose_HeavyJob_Cost_Sy':'TotalActualCost','Budgets_Import_Load_HCSS_1':'H.Total Budget Decimal','Budgets_Import_Great_Plai':'SUM_COST_Rounded'}
        if name in costs:
            field=costs[name]
            body=re.sub(r'(codeBuild\s*=[^\n]+;)',f'if(rec.get("{field}") == null || rec.get("{field}").toString().trim() == "") {{ throw "Eligible Analytics row has no cost; source row=" + auditProcessed; }}\nvalidatedCost = rec.get("{field}").toDecimal();\n'+r'\1',body)
        body=re.sub(r'(codeBuild\s*=[^\n]+;)',r'\1\nif(auditSourceKeys.get(codeBuild) != null) { throw "Duplicate Analytics source key: " + codeBuild; }\nauditSourceKeys.put(codeBuild,true);\nauditRecordKey = codeBuild;',body)
    # Count unique destination records after each completed native write group.
    clean=masked(body)
    pairs=[]; stack=[]
    for i,c in enumerate(clean):
        if c=='{': stack.append(i)
        elif c=='}' and stack: pairs.append((stack.pop(),i))
    groups={}
    for m in re.finditer(r'(?m)^\s*(\w+)\.\w+\s*=',clean):
        containing=[pair for pair in pairs if pair[0]<m.start()<pair[1]]
        if containing:
            block=min(containing,key=lambda p:p[1]-p[0])
            groups.setdefault(block,set()).add(m[1])
    for (start,end),variables in sorted(groups.items(),key=lambda item:item[0][1],reverse=True):
        counters=''
        for v in sorted(variables):
            counters+=f'\n auditDestination = {v}.ID.toString();\n if(!auditUpdatedIds.contains(auditDestination)) {{ auditUpdatedIds.add(auditDestination); auditUpdated = auditUpdated + 1; }}\n auditRowChanged = true;\n'
        body=body[:end]+counters+body[end:]
    body=re.sub(r'(\w+\s*=\s*insert into (?:Budget_Import_Item|Equipment|Milestones)\s*\[[\s\S]*?\];)',r'\1\n auditCreated = auditCreated + 1;\n auditRowChanged = true;',body)
    body=re.sub(r'(?m)^(\s*)(?:info rec;|info rows;|info subdivCode;)\s*$',r'\1// Row payloads are omitted from execution logs.',body)
    # Track each visited source row once and distinguish no-write rows (scope/unchanged).
    rowloops=[]
    for m in re.finditer(r'for each\s+(?:rec|proj|budgCat|budG|existingItem|ms|subdiv) in (?:rows|Budget_Category\[[^\n]*\]|Add_Budget\[[^\n]*\]|existingBudgetImportItems|Milestones\[[^\n]*\]|subdivisions)\s*\{', body):
        brace=body.index('{',m.start()); end=matching(body,brace,'{','}')
        rowloops.extend([(brace+1,'\n auditProcessed = auditProcessed + 1;\n auditRowChanged = false;\n'),(end,'\n if(!auditRowChanged) { auditSkipped = auditSkipped + 1; }\n')])
    for pos,value in sorted(rowloops,reverse=True): body=body[:pos]+value+body[pos:]
    if name == 'Budgets_Import_Load_GP_Co':
        # Mapping guards run before codeBuild. Identify this row before resolving it,
        # otherwise a failure reports the preceding successfully imported cost code.
        body=body.replace('subdivCode = External_System_Mapping[',
                          'auditRecordKey = ifnull(rec.get("WS_Job_Number_Trim"),"").toString() + "-GP-" + ifnull(rec.get("Cost_Code_Number_2"),"").toString();\n\tsubdivCode = External_System_Mapping[')
        body=body.replace('throw "Duplicate or broken external mapping; source row=" + auditProcessed;',
                          'throw "Duplicate or broken external mapping; source row=" + auditProcessed + "; job=" + ifnull(rec.get("WS_Job_Number_Trim"),"").toString() + "; matching Great Plains mappings=" + subdivCode.count();')
    if name in {"Budgets_Import_Load_GP_Co","Budgets_Import_Great_Plai1"}:
        body=body.replace('codeBuild = rec.get("WS_Job_Number_Trim")', 'if(ifnull(rec.get("Cost_Code_Number_2"),"").toString().trim() == "" || rec.get("Total_Actuals") == null || rec.get("Total_Actuals").toString().trim() == "") { throw "Eligible Analytics row has no cost code or cost; job=" + rec.get("WS_Job_Number_Trim"); }\nvalidatedCost = rec.get("Total_Actuals").toDecimal();\ncodeBuild = rec.get("WS_Job_Number_Trim")')
    # A catch that only logs a runtime exception must propagate to the permanent audit wrapper.
    if name == 'Sync_Final_Acceptance_Due':
        # Match the actual outer sync catch, not the earlier nested dateError catch.
        body=insert_block_end(body,r'\bcatch\s*\(syncError\)',
                              '\nthrow "Final Acceptance sync failed; stage=" + operationStage + "; project code=" + currentProjectCode + "; " + syncError.toString();\n')
        body=body.replace('info "Final Acceptance sync stopped: missing Analytics data. Projects=" + projectsResponse.toString() + "; Tasks=" + tasksResponse.toString();','throw "Final Acceptance sync stopped: missing Analytics data.";')
        body+='\nif(reviewCount > 0) { throw "Final Acceptance requires review for " + reviewCount + " mapping/date conflicts; conflicting dates were preserved."; }\n'
    if name == 'Budgets_Check_HCSS_Budget':
        body=body.replace('if(sourceJobCode != "" && sourceMinorCode != "")','if(sourceJobCode == "" || sourceMinorCode == "" || sourceCostCodeId == "") { throw "Cleanup source contains incomplete cost-code identity. No cleanup writes were started."; }\nif(sourceJobCode != "" && sourceMinorCode != "")')
        body=body.replace('info "Cleanup skipped because activeBudgetLineCodes was empty. No Budget_Import_Item records were changed.";','auditNoEligible = true;\ninfo "Cleanup skipped because no eligible stable codes remain after mapping/budget exclusions. No costs were zeroed.";')
    # Include known native writes in Partial classification even if a later assignment fails.
    body=re.sub(r'(?m)^(\s*)(\w+\.\w+\s*=)',r'\1auditWriteAttempted = true;\n\1\2',body)
    system='Zoho Analytics' if analytics else 'Zoho Projects'
    header=f'''auditRun = thisapp.workflowRunLog({{"action":"start","workflow":{json.dumps(display)},"system":"{system}"}});
auditId = auditRun.get("id");
auditReceived = 0;
auditProcessed = 0;
auditCreated = 0;
auditUpdated = 0;
auditUpdatedIds = List();
auditSkipped = 0;
auditMissingMapping = 0;
auditNoBudget = 0;
auditNoEligible = false;
auditWriteAttempted = false;
auditRowChanged = false;
auditSourceKeys = Map();
auditRecordKey = "";
try
{{
'''
    footer='''
 auditCounts = {"received":auditReceived,"processed":auditProcessed,"created":auditCreated,"updated":auditUpdated,"skipped":auditSkipped,"failed":0};
 auditFinalStatus = "Success";
 if(auditNoEligible) { auditFinalStatus = "Skipped"; }
 thisapp.workflowRunLog({"action":"finish","id":auditId,"status":auditFinalStatus,"stage":"Completed","counts":auditCounts,"message":"Completed; exclusions and unchanged rows remain skipped.","details":"Missing external mappings: " + auditMissingMapping + "; no budget: " + auditNoBudget});
}
catch(auditError)
{
 auditStatus = "Failed";
 if(auditWriteAttempted || auditCreated > 0 || auditUpdated > 0) { auditStatus = "Partial"; }
 auditCounts = {"received":auditReceived,"processed":auditProcessed,"created":auditCreated,"updated":auditUpdated,"skipped":auditSkipped,"failed":1};
 thisapp.workflowRunLog({"action":"finish","id":auditId,"status":auditStatus,"counts":auditCounts,"message":auditError.toString(),"details":"Stopped after processing record " + auditProcessed + "; key=" + auditRecordKey + "; missing mappings=" + auditMissingMapping + "; no budget=" + auditNoBudget + ". Counts identify completed native write operations before failure; Creator may roll them back. Check records before retrying. No automatic replay."});
 throw auditError;
}
'''
    return header+body+footer

inventory=json.loads((BASE.parent/'inventory.json').read_text())
prepared=[]
for item in inventory:
    if item['type'] not in {'schedule','functions'}: continue
    source=(ROOT/item['source']).read_text(encoding='utf-8')
    patches=[]
    actions=blocks(source)
    for i,(start,end,body) in enumerate(actions):
        # All actions of an external-dependent workflow receive their own truthful execution entry.
        display=item['display_name']+(f' (action {i+1}/{len(actions)})' if len(actions)>1 else '')
        updated=patch_body(body,item['link_name'],display,item.get('analytics',False))
        target=OUT/f"{item['link_name']}.action-{i+1}.dg"
        target.write_text(updated,encoding='utf-8')
        patches.append((start,end,'\n'+textwrap.indent(updated,'\t\t\t')+'\t\t'))
    if actions:
        for start,end,value in reversed(patches): source=source[:start]+value+source[end:]
    target=OUT/f"{item['link_name']}.ds"
    target.write_text(source,encoding='utf-8')
    prepared.append({'name':item['link_name'],'display':item['display_name'],'actions':len(patches),'source':target.relative_to(ROOT).as_posix()})
(OUT/'components.json').write_text(json.dumps(prepared,indent=2)+'\n')
for name,system,response in [('PF_AI_Review','OpenAI','resp'),('Plat_AI_Ingest','OpenAI','resp'),('PF_Build_LOI_Document','Zoho Writer','result')]:
    source=(BASE/'functions'/f'{name}.dg').read_text(encoding='utf-8')
    source=textwrap.dedent(source).strip()+'\n'
    opening=source.index('{')+1
    source=source[:opening]+'\n auditId = "";\n auditStage = "Validation";\n auditDataWritten = false;\n auditWarning = "";\n'+source[opening:]
    start=f'''auditRun = thisapp.workflowRunLog({{"action":"start","workflow":"{name}","system":"{system}"}});
auditId = auditRun.get("id");'''
    def before_external(m):
        return f'''if(auditId == "") {{ {start} }}
auditStage = "Calling {system}";
thisapp.workflowRunLog({{"action":"update","id":auditId,"stage":auditStage}});
'''+m[0]
    source=re.sub(r'\b\w+\s*=\s*invokeurl',before_external,source)
    source=re.sub(r'(\w+\s*=\s*insert into Proforma_AI_Review\s*\[[\s\S]*?\];)',r'\1\n auditDataWritten = true;',source)
    terminal=f'''if(auditId == "" && {response}.get("success") != true) {{ {start} }}
if(auditId != "")
{{
 auditStatus = "Failed";
 auditFailed = 1;
 if({response}.get("success") == true) {{ auditStatus = "Success"; auditFailed = 0; }}
 else if(auditDataWritten) {{ auditStatus = "Partial"; }}
 if(auditWarning != "") {{ auditStatus = "Partial"; auditFailed = 1; }}
 auditCreated = 0;
 if(auditDataWritten) {{ auditCreated = 1; }}
 auditMessage = ifnull({response}.get("error"),ifnull({response}.get("message"),"External operation completed.")).toString();
 if(auditMessage.startsWith("Model reply was not JSON")) {{ auditMessage = "Model reply was not valid JSON. Review the widget validation error."; }}
 if(auditWarning != "") {{ auditMessage = auditMessage + "; " + auditWarning; }}
 thisapp.workflowRunLog({{"action":"finish","id":auditId,"status":auditStatus,"stage":auditStage,"message":auditMessage,"counts":{{"received":1,"processed":1,"created":auditCreated,"failed":auditFailed}},"details":"Function {name}; no request payload, model prompt or response body is stored in this log."}});
}}
'''
    source=re.sub(rf'\breturn {response}(?:\.toString\(\))?;',lambda m:terminal+m[0],source)
    if name=='PF_Build_LOI_Document':
        source=source.replace('writerMergeFields = writerFieldsResponse.get("merge");','writerMergeFields = writerFieldsResponse.get("merge");\nif(writerMergeFields == null) { throw "Writer fields response has no merge field list."; }')
        source=source.replace('catch (fieldCheckError)\n', 'catch (fieldCheckError)\n')
        source=re.sub(r'(catch\s*\(fieldCheckError\)\s*\{)',r'\1\n auditWarning = "Writer field validation failed; merge continued: " + fieldCheckError.toString();',source)
    destination=OUT/f'{name}.dg'
    destination.write_text(source,encoding='utf-8')
print(json.dumps(prepared,indent=2))
