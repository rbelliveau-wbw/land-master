import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = path => fs.readFileSync(path, 'utf8');
const controller = read('creator/functions/crewLocationsWidget.dg');
const nativeCrew = read('creator/crew-locations/workflows/Crew_on_validate.dg');
const nativeAssignment = read('creator/crew-locations/workflows/Crew_Assignment_on_validate.dg');
const nativeTask = read('creator/crew-locations/workflows/Task_Schedule_on_validate_edit.dg');
const prepare = controller.slice(controller.indexOf('if(action == "save-crew"'), controller.indexOf('phaseId = ifnull(request.get("subdivisionId")'));
const list = controller.slice(controller.indexOf('if(action == "management-list")'), controller.indexOf('if(action == "save-crew"'));

test('Production uses the native API default while Development and Stage retain explicit runtime routing', () => {
  for (const [path, count] of [
    ['creator/functions/crewLocationsRead.dg', 1],
    ['creator/functions/crewLocationsWidget.dg', 2],
    ['creator/crew-locations/native-installed/crewLocationsRead.dg', 1],
    ['creator/crew-locations/native-installed/crewLocationsWidget.dg', 2],
  ]) {
    const code = read(path);
    const blocks = [...code.matchAll(/(readHeaders|headers)\s*=\s*\{"Content-Type":"application\/json"\};\s*if\((config\.get\("environment"\) != "production")\)\s*\{\s*\1\.put\("environment",config\.get\("environmentLink"\)\);\s*\}/g)];
    assert.equal(blocks.length, count, `${path}: every delegated GET/PATCH has environment-aware headers`);
    assert.doesNotMatch(code, /\{"environment":config\.get\("environmentLink"\)/, 'never send production as an explicit header');
    for (const block of blocks) {
      const routes = (environment, environmentLink) => {
        const headers = {'Content-Type': 'application/json'};
        const config = {get: key => key === 'environment' ? environment : environmentLink};
        if (Function('config', `return (${block[2]});`)(config)) headers.environment = config.get('environmentLink');
        return headers;
      };
      assert.deepEqual(routes('production', 'production'), {'Content-Type': 'application/json'});
      assert.equal(routes('development', 'development').environment, 'development');
      assert.equal(routes('stage', 'stage').environment, 'stage');
      assert.equal(routes('stage', 'staging_2').environment, 'staging_2');
    }
  }
});

test('management preparation cannot bypass native form/profile rights or mutate scheduling data', () => {
  assert.ok(prepare.length > 1000);
  assert.doesNotMatch(prepare + list, /insert into|delete from|type\s*:\s*(?:POST|PATCH|DELETE)|\.Push_Update\s*=/i);
  assert.match(prepare, /access\.Manage_Crew_Assignments != true/);
  assert.match(prepare, /"state","ready"/);
  assert.match(prepare, /"formName":formName,"reportName":reportName,"recordId":recordId,"data":patch/);
  for (const report of ['All_Crews', 'Crew_Assignment_Report', 'All_Subdivisions']) assert.ok(prepare.includes(report));
});

test('full management reads preserve caller report permissions, all dates and cursor completion', () => {
  assert.match(list, /detailed:true/);
  assert.match(list, /connection:"zoho_creator_connection"/);
  assert.match(list, /readHeaders\.put\("record_cursor",token\)/);
  assert.match(list, /headerName\.toLowerCase\(\) == "record_cursor"/);
  assert.match(list, /nextToken == token/);
  assert.match(list, /response\.put\("complete",complete\)/);
  assert.doesNotMatch(list, /Assignment_Date\s*[><=]|Active\s*==\s*true/);
  for (const field of ['Crew_Name', 'Source_System', 'Source_Record_ID', 'Source_Key', 'Projects_Status', 'Status']) assert.ok(list.includes(field));
});

test('native empty 404/3100 and 400/9220 pages load while denied and contradictory responses stay closed', () => {
  // Run the production Deluge predicates against native response envelopes.
  // Deluge List.toString() returns JSON, unlike JavaScript Array.toString().
  const emptyStages = list.match(/emptyData = false;[\s\S]+?invalidHttp = !validHttp;/)?.[0];
  const httpExpression = list.match(/if\((invalidHttp && !emptyPage)\)/)?.[1];
  const rowsExpression = list.match(/if\((pageCode == "3000" && pageData != null[^\n]+?)\) \{ pageRows = pageData;/)?.[1];
  assert.ok(emptyStages && httpExpression && rowsExpression, 'exercise the actual production staged acceptance logic');
  const evaluate = (expression, scope) => Function(...Object.keys(scope), `return (${expression});`)(...Object.values(scope));
  function accept(http, body) {
    const scope = {pageCode: String(body.code ?? ''), pageHttp: http, pageData: body.data == null ? null : {toString: () => JSON.stringify(body.data)}, pageBody: {get: key => body[key] ?? null}};
    const stageResult = Function(...Object.keys(scope), `let emptyData, validHttp, emptyHttp, emptyPage, invalidHttp; ${emptyStages} return {emptyPage, invalidHttp};`)(...Object.values(scope));
    Object.assign(scope, stageResult);
    if (evaluate(httpExpression, scope)) return 'denied';
    return evaluate(rowsExpression, scope) ? 'records' : scope.emptyPage ? 'empty' : 'denied';
  }
  assert.equal(accept(404, {code: 3100, message: 'No records found'}), 'empty');
  assert.equal(accept(404, {code: 3100, data: []}), 'empty');
  assert.equal(accept(200, {code: 3100}), 'empty');
  assert.equal(accept(200, {code: 9220}), 'empty');
  assert.equal(accept(400, {code: 9220}), 'empty', 'actual native v2.1 empty-report response');
  assert.equal(accept(400, {code: 9220, data: []}), 'empty');
  assert.equal(accept(200, {code: 3000, data: [{ID: '4410926000005393002'}]}), 'records');
  for (const [http, body] of [
    [404, {code: 3000, data: []}],
    [404, {code: 3100, data: [{ID: '4410926000005393002'}]}],
    [404, {code: 3100, data: {}}],
    [403, {code: 3100}],
    [500, {code: 3100}],
    [404, {code: 3100, error: 'Permission denied'}],
    [404, {code: 2892, message: 'No permission to view records'}],
    [404, {code: 2930, message: 'Error occurred'}],
    [200, {code: 3000, data: [], error: 'Read failed'}],
    [200, {code: 3000, data: [], success: false}],
    [200, {code: 3000}],
    [400, {code: 9220, data: [{ID: '4410926000005393002'}]}],
    [400, {code: 9220, data: {}}],
    [400, {code: 9220, error: 'Permission denied'}],
    [400, {code: 9220, success: false}],
    [401, {code: 9220}],
    [403, {code: 9220}],
    [404, {code: 9220}],
    [500, {code: 9220}],
    [404, {code: 3100, success: false}],
    [400, {code: 9280}],
    [200, {code: 9280}],
  ]) assert.equal(accept(http, body), 'denied', JSON.stringify({http, body}));
  const readSource = read('creator/functions/crewLocationsRead.dg');
  const readStages = readSource.match(/emptyData = false;[\s\S]+?emptyPage = [^\n]+;/)?.[0];
  const readDenial = readSource.match(/if\((!validHttp \|\| code != "3000"[^\n]+?)\) \{ return result;/)?.[1];
  assert.ok(readStages && readDenial, 'also exercise the shared native scoped read helper');
  function readAccept(httpStatus, body, criteria = 'ID == 4410926000005393002') {
    const scope = {code:String(body.code ?? ''),httpStatus,criteria,data:body.data==null?null:{toString:()=>JSON.stringify(body.data)},raw:{get:key=>body[key]??null}};
    return Function(...Object.keys(scope), `let emptyData,validHttp,emptyHttp,emptyPage,nonblankCriteria; ${readStages} if(emptyPage)return 'empty'; return (${readDenial})?'denied':'records';`)(...Object.values(scope));
  }
  for (const [http,body] of [[200,{code:3000,data:[{ID:'4410926000005393002'}]}],[404,{code:3100}],[400,{code:9220}],[200,{code:9220,data:[]}],[400,{code:9220,success:false}],[400,{code:9220,data:[{}]}],[403,{code:9220}],[404,{code:9220}],[400,{code:3000,data:[]}]]) assert.equal(readAccept(http,body),accept(http,body),'shared helper and controller have the same exact native envelope policy');
  assert.equal(readAccept(400,{code:9280}), 'empty', 'actual v2.1 scoped criteria with no matches');
  assert.equal(readAccept(400,{code:9280,data:[]}), 'empty');
  for (const criteria of [null,'','   ']) assert.equal(readAccept(400,{code:9280},criteria), 'denied', '9280 requires an actual scoped query');
  for (const [http,body] of [[200,{code:9280}],[401,{code:9280}],[403,{code:9280}],[404,{code:9280}],[500,{code:9280}],[400,{code:9280,data:[{}]}],[400,{code:9280,data:{}}],[400,{code:9280,error:'Denied'}],[400,{code:9280,success:false}]]) assert.equal(readAccept(http,body),'denied','9280 accepts only the exact native empty scoped result');
});

test('management and native crew guards avoid mixed boolean precedence that Creator rewrites', () => {
  for (const [label, code] of [['management', list + prepare], ['Crew validation', nativeCrew], ['Assignment validation', nativeAssignment]]) {
    const mixed = code.split(/\r?\n/).filter(line => line.includes('&&') && line.includes('||'));
    assert.deepEqual(mixed, [], `${label} keeps AND and OR in separate staged guards`);
  }
  const stageSource = prepare.match(/requiresActiveCrew = false;[\s\S]+?if\(action != "management-status"[^\n]+/)?.[0];
  assert.ok(stageSource);
  const stages = stageSource.slice(0, stageSource.lastIndexOf('if(action'));
  const guard = stageSource.match(/if\((action != "management-status".+?)\) \{ response/)?.[1];
  assert.ok(guard);
  function rejects({recordId = '', oldCrewId = '', crewId = '4410926000005393002', active = true, action = 'save-assignment'}) {
    const scope = {recordId, oldCrewId, crewId, action, targetCrew: {get: () => active}, ifnull: (value, fallback) => value == null ? fallback : value};
    return Function(...Object.keys(scope), `let requiresActiveCrew; ${stages} return (${guard});`)(...Object.values(scope));
  }
  assert.equal(rejects({}), false, 'active crew is valid for new assignment');
  assert.equal(rejects({recordId: '4410926000005393008', oldCrewId: '4410926000005393004'}), false, 'active crew reassignment remains valid');
  assert.equal(rejects({active: false}), true, 'new assignment cannot use an inactive crew');
  assert.equal(rejects({recordId: '4410926000005393008', oldCrewId: '4410926000005393004', active: false}), true, 'reassignment requires an active destination crew');
  assert.equal(rejects({recordId: '4410926000005393008', oldCrewId: '4410926000005393002', active: false}), false, 'existing inactive crew history can be corrected');
  assert.equal(rejects({active: false, action: 'management-status'}), false, 'read-only recovery does not write or require active state');
});

test('recorded native compiler output preserves the staged management gates', () => {
  const compiled = read('creator/crew-locations/native-installed/crewLocationsWidget.dg');
  const compiledManagement = compiled.slice(compiled.indexOf('if(action == "management-list")'), compiled.indexOf('phaseId = ifnull(request.get("subdivisionId")'));
  const compiledAssignment = read('creator/crew-locations/native-installed/Crew_Assignment_on_validate.dg');
  const compiledCrew = read('creator/crew-locations/native-installed/Crew_on_validate.dg');
  for (const [label, code] of [['compiled controller management', compiledManagement], ['compiled Assignment validation', compiledAssignment], ['compiled Crew validation', compiledCrew]]) {
    assert.ok(code.length > 1000);
    assert.deepEqual(code.split(/\r?\n/).filter(line => line.includes('&&') && line.includes('||')), [], `${label} must survive the actual Creator formatter without mixed boolean precedence`);
  }
  const stages = compiledManagement.match(/emptyData = false;[\s\S]+?invalidHttp = !validHttp;/)?.[0];
  const httpGuard = compiledManagement.match(/if\((invalidHttp && !emptyPage)\)/)?.[1];
  const rowsGuard = compiledManagement.match(/if\((pageCode == "3000" && pageData != null[^\n]+?)\)\s*\{\s*pageRows = pageData;/)?.[1];
  assert.ok(stages && httpGuard && rowsGuard, 'test the genuine reopened native compiler output');
  function accept(http, body) {
    const scope = {pageCode: String(body.code ?? ''), pageHttp: http, pageData: body.data == null ? null : {toString: () => JSON.stringify(body.data)}, pageBody: {get: key => body[key] ?? null}};
    return Function(...Object.keys(scope), `let emptyData, validHttp, emptyHttp, emptyPage, invalidHttp; ${stages} if (${httpGuard}) return 'denied'; if (${rowsGuard}) return 'records'; return emptyPage ? 'empty' : 'denied';`)(...Object.values(scope));
  }
  assert.equal(accept(404, {code: 3100}), 'empty');
  assert.equal(accept(404, {code: 3100, data: []}), 'empty');
  assert.equal(accept(400, {code: 9220}), 'empty', 'genuine compiled output handles the observed v2.1 empty response');
  assert.equal(accept(200, {code: 9220, data: []}), 'empty');
  assert.equal(accept(200, {code: 3000, data: [{ID: '4410926000005393002'}]}), 'records');
  for (const [http, body] of [[404, {code: 3000, data: []}], [404, {code: 3100, data: [{}]}], [403, {code: 3100}], [500, {code: 3100}], [404, {code: 3100, error: 'Permission denied'}], [200, {code: 3000, data: [], success: false}], [400,{code:9220,data:[{}]}], [400,{code:9220,success:false}], [400,{code:9220,error:'Forbidden'}], [403,{code:9220}], [404,{code:9220}], [500,{code:9220}]]) assert.equal(accept(http, body), 'denied');
  assert.match(compiledAssignment, /if\(input\.ID == null\)\s*\{\s*requiresActiveCrew = true;/);
  assert.match(compiledAssignment, /if\(oldCrewId != crewId\)\s*\{\s*requiresActiveCrew = true;/);
  assert.match(compiledAssignment, /if\(ifnull\(crew\.get\("Active"\),false\)\.toString\(\)\.toLowerCase\(\) != "true" && requiresActiveCrew\)/);
  assert.match(compiledCrew, /access\.View_Crew_Locations != true/);
  assert.match(compiledCrew, /access\.Manage_Crew_Assignments != true/);
  assert.match(compiledCrew, /thisapp\.crewLocationsRead\("All_Crews","ID == " \+ input\.ID\.toString\(\)\)/);
  for (const field of ['Crew_Code','Source_System','Source_Record_ID']) assert.ok(compiledCrew.includes(`current.get("${field}")`),`compiled Crew preserves immutable ${field}`);
  assert.match(compiledCrew,/input\.Source_System != "MANUAL_WIDGET"/);
  assert.doesNotMatch(compiledCrew,/name\s*==\s*""/);
  assert.match(compiledCrew,/cancel submit/);
  const compiledRead = read('creator/crew-locations/native-installed/crewLocationsRead.dg');
  const scopedStages = compiledRead.match(/emptyData = false;[\s\S]+?emptyPage = [^\n]+;/)?.[0];
  assert.ok(scopedStages?.includes('9280'), 'reopened scoped read includes the observed native criteria-empty result');
  function scopedEmpty(criteria, body) {
    const scope = {criteria,code:String(body.code),httpStatus:400,data:body.data==null?null:{toString:()=>JSON.stringify(body.data)},raw:{get:key=>body[key]??null}};
    return Function(...Object.keys(scope), `let emptyData,validHttp,emptyHttp,emptyPage,nonblankCriteria; ${scopedStages} return emptyPage;`)(...Object.values(scope));
  }
  assert.equal(scopedEmpty('Crew_Code == "QA"',{code:9280}),true);
  for (const criteria of [null,'','   ']) assert.equal(scopedEmpty(criteria,{code:9280}),false);
  for (const body of [{code:9280,data:[{}]},{code:9280,error:'Denied'},{code:9280,success:false}]) assert.equal(scopedEmpty('ID == 4410926000005393002',body),false);
});

test('source and reopened native schedule predicates preserve milestone, duration and arrow behavior', () => {
  function blockAt(code, at) {
    assert.ok(at >= 0, 'expected native guard exists');
    const open = code.indexOf('{', at);let depth = 0, quote = false, escape = false;
    for (let index = open; index < code.length; index++) {
      const char = code[index];
      if (quote) { if(escape)escape=false;else if(char === '\\')escape=true;else if(char === '"')quote=false;continue; }
      if(char === '"'){quote=true;continue;}
      if(char === '{')depth++;if(char === '}' && --depth === 0)return code.slice(at,index+1);
    }
    throw new Error('Native guard braces are incomplete');
  }
  const run = (code, scope, locals = '') => Function(...Object.keys(scope), `${locals} ${code} return 'allowed';`)(...Object.values(scope));
  const ifnull = (value, fallback) => value == null ? fallback : value;
  for (const [label, code] of [['source', read('creator/functions/crewLocationsValidate.dg')], ['reopened native', read('creator/crew-locations/native-installed/crewLocationsValidate.dg')]]) {
    assert.deepEqual(code.split(/\r?\n/).filter(line => line.includes('&&') && line.includes('||')), [], `${label} schedule has no formatter-sensitive mixed guard`);
    const singleStart = code.indexOf('singleRecordOrigin = false;'), singleEnd = code.indexOf('if(singleRecordOrigin && changes.size() != 1)');
    assert.ok(singleStart >= 0 && singleEnd > singleStart, `${label} staged single-record origin gate`);
    const single = code.slice(singleStart, singleEnd) + blockAt(code, singleEnd);
    for (const origin of ['table', 'duration', 'drag']) {
      assert.equal(run(single, {origin, changes: {size: () => 1}, result:'rejected'}, 'let singleRecordOrigin;'), 'allowed', `${label} permits one ${origin} record`);
      assert.equal(run(single, {origin, changes: {size: () => 2}, result:'rejected'}, 'let singleRecordOrigin;'), 'rejected', `${label} rejects multiple ${origin} records`);
    }
    assert.equal(run(single, {origin:'arrow', changes:{size:() => 3}, result:'rejected'}, 'let singleRecordOrigin;'), 'allowed');
    const task = blockAt(code, code.lastIndexOf('if(type == "T")', code.indexOf('current.get("Write_Enabled")')));
    assert.equal(run(task, {type:'M', current:{get:()=>null}, ifnull, result:'rejected'}), 'allowed', `${label} milestones never require task-source identity`);
    assert.equal(run(task, {type:'T', current:{get:()=>null}, ifnull, result:'rejected'}), 'rejected');
    assert.equal(run(task, {type:'T', current:{get:key=>({Write_Enabled:true,Source_System:'VERIFIED',Source_Record_ID:'source-task-1'})[key]}, ifnull, result:'rejected'}), 'allowed');
    const durationAt = code.indexOf('if(origin == "duration")', code.indexOf('if(origin == "drag" && fields.keys().size() != 1)'));
    const duration = blockAt(code, durationAt), fields={keys:()=>({size:()=>1})};
    for (const [start,end,nextStart,nextEnd,expected] of [
      ['2026-11-01','2026-11-10','2026-11-01','2026-11-15','allowed'],
      ['2026-11-01','2026-11-10','2026-11-02','2026-11-15','rejected'],
      ['','2026-11-10','2026-11-05','2026-11-10','allowed'],
      ['','2026-11-10','2026-11-05','2026-11-11','rejected'],
      ['','','2026-11-05','2026-11-10','rejected'],
    ]) assert.equal(run(duration,{origin:'duration',start,end,nextStart,nextEnd,fields,result:'rejected'}),expected,`${label} duration anchor ${JSON.stringify({start,end,nextStart,nextEnd})}`);
    const eligibilityStart = code.indexOf('eligible = false;'), eligibilityEnd=code.indexOf('if(eligible && hasEndpoint)');
    assert.ok(eligibilityStart >= 0 && eligibilityEnd > eligibilityStart, `${label} staged arrow eligibility gate`);
    const eligibility=code.slice(eligibilityStart,eligibilityEnd)+blockAt(code,eligibilityEnd);
    for (const [direction,position,scopeAll,hasStart,hasEnd,expected] of [[1,6,true,false,true,1],[1,4,true,false,true,0],[-1,4,true,true,false,1],[-1,6,true,false,true,0],[1,7,false,false,true,0],[1,6,false,true,false,1],[1,6,true,false,false,0]]) {
      const added=[];run(eligibility,{direction,position,anchorIndex:5,scopeAll,key:'stage',row:{get:key=>key==='Start_Date'?(hasStart?'11/01/2026':''):(hasEnd?'11/10/2026':'')},ifnull,expectedStages:{add:value=>added.push(value)}},'let eligible, hasEndpoint;');
      assert.equal(added.length,expected,`${label} arrows select only scoped stages with an actual endpoint`);
    }
    assert.match(code, /Timestamp >= original\.Timestamp/);
    assert.match(code, /if\(!recorded\)/);
  }
});

test('source and reopened native direct validation require the exact prepared endpoints and row permissions', () => {
  function blockAt(code, at) {
    assert.ok(at >= 0, 'the expected direct validation guard exists');
    const open=code.indexOf('{',at);let depth=0,quoted=false,escape=false;
    for(let i=open;i<code.length;i++){
      const char=code[i];if(quoted){if(escape)escape=false;else if(char==='\\')escape=true;else if(char==='"')quoted=false;continue;}
      if(char==='"'){quoted=true;continue;}if(char==='{')depth++;if(char==='}'&&--depth===0)return code.slice(at,i+1);
    }
    throw new Error('Direct validation block is incomplete');
  }
  const run=(code,scope)=>Function(...Object.keys(scope),`${code} return 'allowed';`)(...Object.values(scope));
  for(const [label,code] of [['source',read('creator/functions/crewLocationsDirectValidate.dg')],['reopened native',read('creator/crew-locations/native-installed/crewLocationsDirectValidate.dg')]]){
    assert.deepEqual(code.split(/\r?\n/).filter(line=>line.includes('&&')&&line.includes('||')),[],`${label} has no formatter-sensitive direct guards`);
    assert.match(code,/entry = Schedule_Change_Log\[Operation_ID == lock\.Operation_ID\]/);
    const stateGuard=blockAt(code,code.indexOf('if(entry.State != "prepared" && entry.State != "saving")'));
    for(const State of ['prepared','saving'])assert.equal(run(stateGuard,{entry:{State}}),'allowed',`${label} can see the committed ${State} plan`);
    for(const State of ['validating','saved','unknown'])assert.notEqual(run(stateGuard,{entry:{State}}),'allowed');
    const targetGuard=blockAt(code,code.indexOf('if(targetStart == proposedStart && targetEnd == proposedEnd)'));
    const target=(rowType,pushUpdate,proposedStart='2026-11-01',proposedEnd='2026-11-15')=>{const outcome=run(targetGuard,{rowType,pushUpdate,targetStart:'2026-11-01',targetEnd:'2026-11-15',proposedStart,proposedEnd});return outcome==='allowed'?'unmatched':outcome;};
    assert.equal(target('M',false),'',`${label} accepts the exact Creator-only milestone endpoints`);
    assert.equal(target('M',true),'unmatched',`${label} cannot authorize a Projects push`);
    assert.equal(target('M',false,'2026-11-02'),'unmatched',`${label} Push_Update=false cannot bypass mismatched Start`);
    assert.equal(target('M',false,'2026-11-01','2026-11-16'),'unmatched',`${label} Push_Update=false cannot bypass mismatched End`);
    assert.equal(target('T',false),'');
    assert.equal(target('T',false,'2026-11-02'),'unmatched');
    const permissionAt=code.indexOf('if(access.count() != 1'),permissionEnd=code.indexOf('phase = Subdivision',permissionAt),permissions=code.slice(permissionAt,permissionEnd);
    assert.ok(permissionAt>=0&&permissionEnd>permissionAt);
    const rights=(rowType,overrides={})=>run(permissions,{rowType,access:{count:()=>1,View_Crew_Locations:true,Edit_Crew_Milestones:true,Edit_Crew_Task_Dates:true,...overrides}});
    assert.equal(rights('M'),'allowed');assert.equal(rights('T'),'allowed');
    assert.notEqual(rights('M',{Edit_Crew_Milestones:false}),'allowed');
    assert.notEqual(rights('T',{Edit_Crew_Task_Dates:false}),'allowed');
    assert.notEqual(rights('M',{View_Crew_Locations:false}),'allowed');
    assert.notEqual(rights('M',{count:()=>0}),'allowed');
    const pastAt=code.indexOf('if(oldStart != null && oldStart < zoho.currentdate'),pastEnd=code.indexOf('if(newStart != null && newEnd != null',pastAt),pastGuards=code.slice(pastAt,pastEnd);
    assert.ok(pastAt>=0&&pastEnd>pastAt);
    const dates=(oldStart,oldEnd,newStart,newEnd)=>run(pastGuards,{oldStart,oldEnd,newStart,newEnd,zoho:{currentdate:100}});
    assert.equal(dates(90,110,90,115),'allowed',`${label} keeps past Start fixed while changing future End`);
    assert.notEqual(dates(90,110,91,115),'allowed');
    assert.notEqual(dates(110,90,110,null),'allowed');
    assert.notEqual(dates(110,120,99,120),'allowed');
    assert.notEqual(dates(110,120,110,99),'allowed');
  }
});

test('native crew validation protects the same actor and immutable provenance, with optional name', () => {
  assert.match(nativeCrew, /access\.View_Crew_Locations != true/);
  assert.match(nativeCrew, /access\.Manage_Crew_Assignments != true/);
  assert.match(nativeCrew, /thisapp\.crewLocationsRead\("All_Crews","ID == "/);
  for (const field of ['Crew_Code', 'Source_System', 'Source_Record_ID']) assert.match(nativeCrew, new RegExp(`current\\.get\\("${field}"\\)`));
  assert.doesNotMatch(nativeCrew + prepare, /name\s*==\s*""/);
  assert.match(nativeCrew, /input\.Source_System != "MANUAL_WIDGET"/);
  assert.match(nativeCrew, /cancel submit/);
});

test('native assignment validation blocks imported identity edits and inaccessible or locked phase destinations', () => {
  assert.match(nativeAssignment, /access\.View_Crew_Locations != true/);
  assert.match(nativeAssignment, /access\.Manage_Crew_Assignments != true/);
  for (const report of ['Crew_Assignment_Report', 'All_Crews', 'All_Subdivisions']) assert.ok(nativeAssignment.includes(`thisapp.crewLocationsRead("${report}"`));
  for (const field of ['Source_System', 'Source_Record_ID', 'Source_Key']) assert.ok(nativeAssignment.includes(`input.${field}`));
  assert.match(nativeAssignment, /if\(system == "MANUAL_WIDGET"\) \{ manualSource = true;/);
  assert.match(nativeAssignment, /if\(system == "MANUAL_QA"\) \{ manualSource = true;/);
  assert.match(nativeAssignment, /validIdentity = manualSource && sourceId != "" && sourceKey == system \+ ":" \+ sourceId/);
  assert.match(nativeAssignment, /oldPhaseId != "" && oldPhaseId != phaseId/);
  assert.match(nativeAssignment, /phase\.get\("Status"\),phase\.get\("Projects_Status"\)/);
  assert.match(nativeAssignment, /oldCrewId != crewId/);
  assert.match(nativeAssignment, /catch\(assignmentValidationFailure\)/);
  assert.match(nativeAssignment, /cancel submit/);
});

test('ambiguous saves have explicit read-only recovery and normal saves have no post-ack comparison gate', () => {
  assert.match(prepare, /action == "management-status"/);
  const recovery = prepare.slice(prepare.lastIndexOf('if(action == "management-status")'));
  assert.match(recovery, /candidate\.get\("Crew_Name"\)/);
  assert.match(recovery, /thisapp\.crewLocationsIso/);
  assert.match(recovery, /response\.put\("unknown",!matches\)/);
  assert.doesNotMatch(recovery, /invokeurl|insert into|type\s*:\s*(POST|PATCH)/);
  assert.doesNotMatch(prepare, /response\.toString\(\)\.contains|\.contains\(dateText\)/);
});

test('task mirror represents individual source records without enabling task schedule writes', () => {
  const config = read('creator/functions/crewLocationsConfig.dg');
  const schema = JSON.parse(read('creator/crew-locations/schema.json'));
  const task = schema.forms.find(form => form.name === 'Task_Schedule');
  for (const field of ['Task_Name', 'Task_Code', 'Source_Project_ID', 'Task_Status', 'Completion_Date', 'Milestone_Task']) assert.ok(task.fields.some(candidate => candidate.name === field));
  for (const field of ['Subdivision1', 'Stage_Key']) assert.equal(task.fields.find(candidate => candidate.name === field).required, false);
  for (const flag of ['taskMirrorEnabled', 'tasksEnabled', 'taskWritesVerified']) assert.ok(config.includes(`config.put("${flag}",false)`));
  assert.match(nativeTask, /input\.ID == null/);
  assert.match(nativeTask, /config\.get\("tasksEnabled"\) != true \|\| config\.get\("taskWritesVerified"\) != true/);
  assert.match(nativeTask, /cancel submit/);
  const importer = read('creator/functions/crewLocationsImportTasks.dg');
  assert.match(importer, /Task mirrored; phase\/stage mapping is unresolved/);
  assert.match(importer, /Source_Project_ID=externalProject/);
  assert.match(importer, /row\.get\("dueDate"\)/);
  assert.doesNotMatch(importer, /invokeurl|projectsapi\.zoho|zoho_projects_connection/);
});
