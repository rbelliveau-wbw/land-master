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

test('native HTTP 404/3100 is an empty page while denied, malformed and contradictory responses stay closed', () => {
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
  assert.equal(accept(200, {code: 3000, data: [{ID: '4410926000005393002'}]}), 'records');
  for (const [http, body] of [
    [404, {code: 3000, data: []}],
    [404, {code: 3100, data: [{ID: '4410926000005393002'}]}],
    [404, {code: 3100, data: {}}],
    [403, {code: 3100}],
    [500, {code: 3100}],
    [404, {code: 3100, error: 'Permission denied'}],
    [404, {code: 2892, message: 'No permission to view records'}],
    [200, {code: 3000, data: [], error: 'Read failed'}],
    [200, {code: 3000, data: [], success: false}],
    [200, {code: 3000}],
  ]) assert.equal(accept(http, body), 'denied', JSON.stringify({http, body}));
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
  for (const [label, code] of [['compiled controller management', compiledManagement], ['compiled Assignment validation', compiledAssignment]]) {
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
  assert.equal(accept(200, {code: 3000, data: [{ID: '4410926000005393002'}]}), 'records');
  for (const [http, body] of [[404, {code: 3000, data: []}], [404, {code: 3100, data: [{}]}], [403, {code: 3100}], [500, {code: 3100}], [404, {code: 3100, error: 'Permission denied'}], [200, {code: 3000, data: [], success: false}]]) assert.equal(accept(http, body), 'denied');
  assert.match(compiledAssignment, /if\(input\.ID == null\)\s*\{\s*requiresActiveCrew = true;/);
  assert.match(compiledAssignment, /if\(oldCrewId != crewId\)\s*\{\s*requiresActiveCrew = true;/);
  assert.match(compiledAssignment, /if\(ifnull\(crew\.get\("Active"\),false\)\.toString\(\)\.toLowerCase\(\) != "true" && requiresActiveCrew\)/);
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
