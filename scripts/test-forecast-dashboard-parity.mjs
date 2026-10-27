import assert from 'node:assert/strict';
import {forecastFixture} from './fixtures/insights-forecasts.mjs';

for (const file of ['sales-model.js','forecast-model.js','forecast-insights-model.js']) {
  await import('../widgets/lot-sales-explorer/src/app/' + file);
}
const F = globalThis.ForecastModel, D = globalThis.ForecastInsightsModel;
const today = '2026-10-27', years = ['2026','2027'];
const filters = {groupBy:'project',mode:'outlook',period:'next',years:[],projectStatuses:[],territories:[],projectIds:[],builderIds:[],search:'',hideEmpty:false};
const nativeCount = value => value == null || String(value).trim() === '' ? null : Number(value);
const phaseId = data => data.subdivisions[0].ID;
const projectId = data => data.subdivisions[0].Project.ID;
const alphaReport = (data, overrides = {}) => D.report(D.normalize(data), {...filters,projectIds:[projectId(data)],...overrides}, today);

// Convert the exact native report-field shapes to the DTO consumed by the real
// Forecast Manager model. Its own matrix/displayValue and totals are the oracle.
function managerSnapshot(data, subdivisionId) {
  const parents = data.years.filter(row => row.Subdivision1.ID === subdivisionId && row.Status === 'Builder');
  const parentIds = new Set(parents.map(row => row.ID));
  return {
    subdivision:{id:subdivisionId}, today,
    years:parents.map(row => ({id:row.ID,builderId:row.Builder1.ID,year:row.Forecast_Year})),
    months:data.months.filter(row => parentIds.has(row.Forecast_Year2.ID) && row.Delete_me !== true).map(row => ({
      id:row.ID,parentId:row.Forecast_Year2.ID,builderId:row.Builder1.ID,
      subdivisionId:row.Subdivision1.ID,year:row.Forecast_Year,month:row.Forecast_Month,
      start:row.Forecast_Start_Date,forecast:nativeCount(row.Forecasted_Lots),
      actual:nativeCount(row.Actual_Lots),scheduled:nativeCount(row.Scheduled_Lots)
    }))
  };
}
function managerRows(data, subdivisionId, builderIds = [], selectedYears = years) {
  const snapshot = managerSnapshot(data, subdivisionId);
  const selected = builderIds.length ? builderIds : [...new Set(snapshot.years.map(row => row.builderId))];
  return F.visibleMatrix(snapshot, selected, selectedYears);
}
function managerMonth(data, subdivisionId, month, mode, builderIds = []) {
  return managerRows(data, subdivisionId, builderIds).reduce((sum, row) => {
    const cell = row.years.find(year => year.year === String(month.year)).months[month.index];
    return sum + Number(F.displayValue(cell, mode, today) || 0);
  }, 0);
}
function managerAnnual(data, subdivisionId, year, mode, builderIds = []) {
  return managerRows(data, subdivisionId, builderIds).reduce((sum, row) => sum + row.years.find(item => item.year === String(year))[mode === 'outlook' ? 'outlook' : 'total'], 0);
}
function assertPhaseParity(data, overrides = {}) {
  const report = alphaReport(data, overrides), row = report.rows[0], mode = overrides.mode || 'outlook';
  assert.ok(row, 'The phase with saved forecasts is present');
  for (const cell of row.cells) {
    assert.equal(cell.value, managerMonth(data, phaseId(data), cell, mode, overrides.builderIds), 'Saved monthly subtotal matches Forecast Manager: ' + cell.key);
  }
  for (const year of report.years) {
    assert.equal(D.annual(row.cells, year).value, managerAnnual(data, phaseId(data), year, mode, overrides.builderIds), 'Annual subtotal matches Forecast Manager: ' + year);
  }
  return {report,row};
}
function dropParent(data, builderId, year) {
  const parent = data.years.find(row => row.Subdivision1.ID === phaseId(data) && row.Builder1.ID === builderId && row.Forecast_Year === year);
  assert.ok(parent);
  data.years = data.years.filter(row => row.ID !== parent.ID);
  data.months = data.months.filter(row => row.Forecast_Year2.ID !== parent.ID);
}
function monthRow(data, builderId, year, month) {
  return data.months.find(row => row.Subdivision1.ID === phaseId(data) && row.Builder1.ID === builderId && row.Forecast_Year === year && row.Forecast_Month === month);
}

// The existing complete fixture must continue to agree in both allowed modes.
for (const mode of ['outlook','forecast']) assertPhaseParity(forecastFixture(), {mode});

// Builders with different saved fiscal years must not erase one another's data.
const disjoint = forecastFixture(), first = disjoint.builders[0].ID, second = disjoint.builders[1].ID;
dropParent(disjoint, first, '2027');
dropParent(disjoint, second, '2026');
for (const mode of ['outlook','forecast']) {
  const {row} = assertPhaseParity(disjoint, {mode});
  assert.equal(row.cells[8].known, 1);assert.equal(row.cells[8].missing, 1);
  assert.equal(row.cells[12].known, 1);assert.equal(row.cells[12].missing, 1);
  assert.equal(row.cells[8].value, 10);assert.equal(row.cells[12].value, 11);
}

// A blank current forecast must not hide another builder's saved nonzero value.
const blank = forecastFixture();
monthRow(blank, blank.builders[0].ID, '2026', 'October').Forecasted_Lots = '';
for (const mode of ['outlook','forecast']) {
  const {row} = assertPhaseParity(blank, {mode});
  assert.equal(row.cells[8].value, 11);assert.equal(row.cells[8].known, 1);assert.equal(row.cells[8].missing, 1);
}
assert.equal(alphaReport(blank).rows[0].cells[7].value, 5, 'Completed September still uses native Actual_Lots');
assert.equal(alphaReport(blank, {mode:'forecast'}).rows[0].cells[7].value, 21, 'Forecast-only uses saved past forecasts');

// Explicit saved zero is known even when another builder/year is absent.
const zero = forecastFixture();
dropParent(zero, zero.builders[1].ID, '2026');
for (const month of zero.months.filter(row => row.Subdivision1.ID === phaseId(zero) && row.Forecast_Year === '2026')) month.Forecasted_Lots = '0';
const zeroRow = alphaReport(zero, {mode:'forecast'}).rows[0];
assert.equal(zeroRow.cells[8].value, 0);assert.equal(zeroRow.cells[8].known, 1);assert.equal(zeroRow.cells[8].missing, 1);
assert.equal(D.annual(zeroRow.cells, 2026).value, 0);

// No saved contributor stays unknown instead of inventing a complete zero.
const base = forecastFixture(), all = D.report(D.normalize(base), filters, today);
const unknown = all.rows.find(row => row.phase.name.startsWith('No Forecast'));
assert.ok(unknown.cells.every(cell => cell.value === null && cell.known === 0 && cell.missing > 0));
assert.equal(D.annual(unknown.cells, 2026).value, null);
assert.equal(D.aggregate([unknown], all.months)[8].value, null);
const zeroAndUnknown = D.aggregate([zeroRow, unknown], all.months)[8];
assert.equal(zeroAndUnknown.value, 0);assert.equal(zeroAndUnknown.known, 1);assert.ok(zeroAndUnknown.missing > 0);
const bothBlank = forecastFixture();
for (const builder of bothBlank.builders) monthRow(bothBlank, builder.ID, '2026', 'October').Forecasted_Lots = '';
const bothBlankCell = alphaReport(bothBlank).rows[0].cells[8];
assert.equal(bothBlankCell.value, null);assert.equal(bothBlankCell.known, 0);assert.equal(bothBlankCell.missing, 2);

// Group/footer aggregates retain known values when an unrelated phase is missing.
for (const groupBy of ['project','territory','builder']) {
  const report = D.report(D.normalize(blank), {...filters,groupBy}, today);
  const expected = managerMonth(blank, phaseId(blank), report.months[8], 'outlook');
  assert.equal(report.totals[8].value, expected, 'Known footer subtotal survives missing phase: ' + groupBy);
  assert.ok(report.totals[8].missing > 0);
  assert.equal(D.annual(report.totals, 2026).value, managerAnnual(blank, phaseId(blank), 2026, 'outlook'));
  const alphaRows = report.rows.filter(row => row.phase.id === phaseId(blank));
  assert.equal(D.aggregate(alphaRows, report.months)[8].value, expected, 'Builder grouping allocates each saved value once');
}
const filtered = assertPhaseParity(blank, {builderIds:[blank.builders[1].ID]});
assert.equal(filtered.row.cells[8].value, 11);assert.equal(filtered.row.cells[8].missing, 0);
const hidden = alphaReport(disjoint, {hideEmpty:true});
assert.equal(hidden.rows.length, 1, 'Hide Empty retains a phase with known saved subtotals');

// A builder with history only outside the selected years must match Manager's
// visibleMatrix and not appear as an extra missing current/future builder.
const historical = forecastFixture(), historicalBuilder = '900000000000000023', historicalParent = '9000000000992019';
historical.builders.push({ID:historicalBuilder,Builder_Name:'Historical Builder',Type1:'Builder'});
historical.years.push({...historical.years[0],ID:historicalParent,Builder1:{ID:historicalBuilder},Forecast_Year:'2019'});
const templates = historical.months.filter(row => row.Subdivision1.ID === phaseId(historical) && row.Builder1.ID === historical.builders[0].ID && row.Forecast_Year === '2026');
historical.months.push(...templates.map((row,index) => ({...row,ID:historicalParent + String(index).padStart(2,'0'),Forecast_Year2:{ID:historicalParent},Builder1:{ID:historicalBuilder},Forecast_Year:'2019',Forecast_Start_Date:F.start(2019,index),Forecasted_Lots:'99',Actual_Lots:'99'})));
const historyResult = assertPhaseParity(historical);
assert.equal(historyResult.row.builders.some(builder => builder.id === historicalBuilder), false);
assert.equal(alphaReport(historical, {groupBy:'builder'}).rows.some(row => row.groupId === historicalBuilder), false);
assert.equal(alphaReport(historical, {builderIds:[historicalBuilder]}).rows.length, 0);
assert.equal(managerRows(historical, phaseId(historical), [historicalBuilder]).length, 0);
const historicalSelected = alphaReport(historical, {period:'custom',years:['2019']});
assert.equal(historicalSelected.rows[0].builders[0].id, historicalBuilder);
assert.equal(historicalSelected.rows[0].cells[0].value, 99);

console.log('PASS Forecast Manager/dashboard parity: native shapes, disjoint years, blank-plus-known, explicit zero, all-unknown, basis modes, group/footer/annual totals, builder scope and historical-only builders.');
