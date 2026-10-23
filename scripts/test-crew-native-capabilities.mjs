import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const read = path => fs.readFileSync(path, 'utf8');
const config = read('creator/functions/crewLocationsConfig.dg');
const controller = read('creator/functions/crewLocationsWidget.dg');
const importer = read('creator/functions/crewLocationsImportAssignments.dg');
const app = read('widgets/crew-locations/src/app/crew-app.js');
let checks = 0;
const test = (name, fn) => { fn(); checks++; console.log('PASS ' + name); };

test('Native report availability has a separate fail-closed server flag', () => {
  assert.match(config, /config\.put\("nativeCrewReadsEnabled",true\)/);
  const capabilities = controller.slice(controller.indexOf('if(action == "capabilities")'), controller.indexOf('phaseId = ifnull(request.get("subdivisionId")'));
  assert.match(capabilities, /"crews":config\.get\("nativeCrewReadsEnabled"\) == true/);
  assert.doesNotMatch(capabilities, /config\.get\("crewsEnabled"\)/);
  assert.match(capabilities, /config\.get\("nativeCrewReadsEnabled"\) != true/);
  assert.ok(controller.indexOf('access.View_Crew_Locations != true') < controller.indexOf('if(action == "capabilities")'));
  assert.ok(controller.indexOf('zoho.loginuser == "public"') < controller.indexOf('if(action == "capabilities")'));
});

test('Enabling native reads cannot open the external importer or task/Projects writes', () => {
  for (const key of ['crewsEnabled', 'tasksEnabled', 'taskWritesVerified', 'projectsPushEnabled']) assert.ok(config.includes('config.put("' + key + '",false)'));
  for (const key of ['importActor', 'crewSourceSystem', 'taskSourceSystem']) assert.ok(config.includes('config.put("' + key + '","")'));
  assert.match(config, /config\.put\("creatorOnly",true\)/);
  assert.match(config, /thisapp\.environment\.type/);
  assert.match(config, /thisapp\.environment\.linkname/);
  assert.match(importer, /config\.get\("crewsEnabled"\) != true/);
  assert.match(importer, /config\.get\("importActor"\) == ""/);
  assert.match(importer, /zoho\.loginuser != config\.get\("importActor"\)/);
  assert.match(importer, /config\.get\("crewSourceSystem"\) != sourceSystem/);
  assert.doesNotMatch(importer, /nativeCrewReadsEnabled/);
  assert.doesNotMatch(controller, /crewLocationsImportAssignments/);
});

test('Native reads reuse caller-scoped reports and preserve required field failure', () => {
  assert.match(app, /cap\.sources\?\.crews/);
  for (const field of ['ID', 'Crew_Code', 'Badge_Color', 'Active', 'Subdivision1', 'Crew', 'Assignment_Date', 'Source_System', 'Source_Record_ID']) assert.ok(app.includes("'" + field + "'"));
  assert.match(app, /'All_Crews'/);
  assert.match(app, /'Crew_Assignment_Report'/);
  assert.match(app, /LMData\.readAll/);
  assert.match(app, /Object\.prototype\.hasOwnProperty\.call\(row,field\)/);
  assert.match(app, /throw new Error\(reportName\+' must expose '\+field/);
  assert.match(app, /S\.ready=false;S\.model=null/);
});

test('Production reader, preparation schema and preview share the verified native report link', () => {
  const report = 'Crew_Assignment_Report';
  const schema = JSON.parse(read('creator/crew-locations/schema.json'));
  const manifest = JSON.parse(read('manifests/crew-locations.json'));
  assert.equal(schema.forms.find(form => form.name === 'Crew_Assignment').report, report);
  assert.deepEqual(manifest.native_crew_reads.reports[report], ['ID', 'Subdivision1', 'Crew', 'Assignment_Date', 'Source_System', 'Source_Record_ID']);
  for (const source of [app, read('scripts/prepare-crew-locations.mjs'), read('scripts/preview-crew-locations.mjs')]) {
    assert.ok(source.includes(report), 'every active read/fixture/preparation contract must use the native link');
    assert.ok(!source.includes('All_' + 'Crew_Assignments'), 'the unverified planned alias must not return');
  }
});

test('Native-shaped manual crews preserve IDs, date boundaries and repeated activity', () => {
  const context = vm.createContext({Date, Intl, Map, Set, Number, String, Object, Math});
  vm.runInContext(read('widgets/crew-locations/src/app/crew-model.js'), context);
  const M = context.CrewModel;
  const phase = '4410926000003378004';
  const crewA = '4410926000005393002';
  const crewB = '4410926000005393004';
  const crewC = '4410926000005393006';
  const assignment = (ID, crew, date) => ({ID, Subdivision1: {ID: phase, display_value: 'Native phase'}, Crew: {ID: crew, display_value: 'QA crew'}, Assignment_Date: date, Source_System: 'MANUAL_QA', Source_Record_ID: 'crew-qa-' + ID});
  const model = M.normalize({
    subdivisions: [{ID: phase, Subdivision_Name: 'Native phase'}],
    crews: [
      {ID: crewA, Crew_Code: 'TEST-A', Badge_Color: '#386f99', Active: 'true'},
      {ID: crewB, Crew_Code: 'TEST-B', Badge_Color: '#398375', Active: true},
      {ID: crewC, Crew_Code: 'TEST-C', Badge_Color: '#8054c7', Active: false}
    ],
    assignments: [
      assignment('4410926000005393101', crewA, '10/16/2026'),
      assignment('4410926000005393102', crewA, '10/23/2026'),
      assignment('4410926000005393103', crewB, '10/15/2026'),
      assignment('4410926000005393104', crewB, '10/24/2026'),
      assignment('4410926000005393105', crewC, '10/23/2026')
    ]
  });
  M.assignments(model, M.date('2026-10-23'));
  assert.equal(model.crews.size, 2);
  assert.deepEqual(Array.from(model.byId.get(phase).crews, crew => crew.id), [crewA]);
  assert.equal(M.selected(model, M.defaults()).length, 1);
  M.assignments(model, M.date('2026-10-24'));
  assert.deepEqual(Array.from(model.byId.get(phase).crews, crew => crew.id), [crewA, crewB]);
  assert.equal(model.records.size, 0, 'manual assignments must not create milestone or task dates');
});

console.log(checks + ' native crew capability groups passed. Deluge compilation and real report exposure remain native gates.');
