import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const widgets = ['budget-manager','contract-management','land-master','manage-lots','milestone-gantt','proforma-manager','tax-center'];
const failures = [];

for (const widget of widgets) {
  const source = fs.readFileSync(path.join(root, 'widgets', widget, 'src', 'app', 'runtime-context.js'), 'utf8');
  const window = {
    location: { href:'https://rbelliveau-wbw.github.io/land-master/prod/example/', ancestorOrigins:[] },
    ZOHO: { CREATOR:{} }
  };
  const context = { window, document:{referrer:''}, Promise };
  vm.createContext(context);
  vm.runInContext(source, context, { filename:`${widget}/runtime-context.js` });
  const runtime = window.LMRuntime;
  runtime.apply({envUrlFragment:'environment/development',loginUser:'dev.user@example.com'});
  if (runtime.current().environment !== 'DEVELOPMENT') failures.push(`${widget}: development detection failed`);
  if (runtime.current().user !== 'dev.user@example.com') failures.push(`${widget}: user detection failed`);
  if (runtime.apiName('Start_Proforma_Approval_Chain') !== 'Start_Proforma_Approval_Chain_DEV') failures.push(`${widget}: development suffix failed`);
  if (runtime.apiName('Save_PF1') !== 'Save_PF') failures.push(`${widget}: Save_PF development exception failed`);
  if (runtime.apiName('Get_Proforma_Approval_PDF1') !== 'Get_Proforma_Approval_PDF') failures.push(`${widget}: PDF development exception failed`);
  runtime.apply({envUrlFragment:'environment/stage'});
  if (runtime.apiName('Modification_Admin') !== 'Modification_Admin_STAGE') failures.push(`${widget}: stage did not fail closed`);
  runtime.apply({envUrlFragment:''});
  if (runtime.apiName('Modification_Admin') !== 'Modification_Admin') failures.push(`${widget}: production routing failed`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Runtime environment, user identity, and API routing checks passed for ${widgets.length} widgets.`);
