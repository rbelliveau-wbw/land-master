import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const widgets = ['budget-manager','contract-management','land-master','manage-lots','milestone-gantt','proforma-manager','tax-center','lot-sales-explorer','settings-manager','forecast-manager'];
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

const sdk2Widgets = widgets.filter(widget => /creator\/widgets\/version\/2\.0\/widgetsdk-min\.js/.test(fs.readFileSync(path.join(root, 'widgets', widget, 'src', 'app', 'widget.html'), 'utf8')));
let sdk2RuntimeSource;
for (const widget of sdk2Widgets) {
  const source = fs.readFileSync(path.join(root, 'widgets', widget, 'src', 'app', 'runtime-context.js'), 'utf8');
  if (sdk2RuntimeSource) assert.equal(source, sdk2RuntimeSource, `${widget}: SDK2 runtime copies stay identical`);
  sdk2RuntimeSource = source;
  const window = {location: {href: 'https://example.test/dev/widget/?other=/stage/', ancestorOrigins: ['https://example.test/environment/development/']}, ZOHO: {CREATOR: {}}};
  const context = vm.createContext({window, document: {referrer: 'https://example.test/environment/development/'}, Promise});
  vm.runInContext(source, context);
  const runtime = window.LMRuntime;
  for (const [fragment, expected, suffix] of [['','PRODUCTION',''],['environment/development','DEVELOPMENT','_DEV'],['/environment/stage','STAGE','_STAGE'],['environment/staging/','STAGE','_STAGE']]) {
    const current = runtime.apply({envUrlFragment: fragment, loginUser: 'native-user', appLinkName: 'native-app'});
    assert.equal(current.environment, expected, `${widget}: native ${expected} overrides conflicting URL, referrer and ancestor hints`);
    assert.equal(current.appLinkName, 'native-app');
    assert.equal(current.user, 'native-user');
    assert.equal(runtime.apiName('Modification_Admin'), 'Modification_Admin' + suffix);
  }
  runtime.apply({env_url_fragment: '', login_user: 'alias-user', app_link_name: 'alias-app'});
  assert.equal(runtime.current().environment, 'PRODUCTION', 'an empty native fragment alias also overrides URL hints');
  assert.equal(runtime.current().appLinkName, 'alias-app');
  for (const fragment of [null, undefined, 7, 'unknown', 'environment/dev', '/environment/stage?other=development']) {
    assert.throws(() => runtime.apply({envUrlFragment: fragment, loginUser: 'native-user'}), /recognized environment/);
    assert.equal(runtime.current().environment, 'UNKNOWN', 'an invalid handshake cannot retain a previous native environment');
    assert.equal(runtime.current().user, '(unknown)', 'an invalid handshake cannot retain a previous user');
  }
  for (const params of [null, undefined, [], [1], 0, 7, false, true, '', 'native-context']) {
    runtime.apply({envUrlFragment:'',loginUser:'previous-user',appLinkName:'previous-app'});
    assert.throws(() => runtime.apply(params), /initialization parameters/);
    assert.deepEqual(JSON.parse(JSON.stringify(runtime.current())), {environment:'UNKNOWN',user:'(unknown)',environmentFragment:'',appLinkName:''}, `${widget}: malformed native params reset the whole context before rejection`);
  }
  for (const key of ['loginUser','login_user','user','loginEmailId','userEmail']) {
    for (const actor of [{}, [], ['actor'], 0, 7, false, true]) {
      runtime.apply({envUrlFragment:'',loginUser:'previous-user',appLinkName:'previous-app'});
      window.ZOHO.CREATOR.loginUser='valid-global-fallback';
      assert.throws(() => runtime.apply({envUrlFragment:'/environment/development',[key]:actor}), /valid connected user/, `${widget}: nonstring selected ${key} is not replaced by a global fallback`);
      assert.equal(runtime.current().environment,'UNKNOWN','a malformed actor cannot publish a partially recognized environment');
      assert.equal(runtime.current().user,'(unknown)','a malformed actor cannot preserve or stringify identity');
      delete window.ZOHO.CREATOR.loginUser;
    }
    assert.equal(runtime.apply({envUrlFragment:'',[key]:' alias-actor '}).user,'alias-actor','native string actor aliases remain supported');
  }
  for (const key of ['loginUser','LOGIN_USER']) {
    for (const actor of [{}, [], ['actor'], 0, 7, false, true]) {
      window.ZOHO.CREATOR[key]=actor;
      assert.throws(() => runtime.apply({envUrlFragment:''}), /valid connected user/);
      assert.equal(runtime.current().environment,'UNKNOWN');
      assert.equal(runtime.current().user,'(unknown)');
      delete window.ZOHO.CREATOR[key];
    }
    window.ZOHO.CREATOR[key]=' genuine-global-actor ';
    assert.equal(runtime.apply({envUrlFragment:''}).user,'genuine-global-actor',`${widget}: native global ${key} string remains a valid fallback`);
    assert.equal(runtime.apply({envUrlFragment:'',loginUser:'native-first'}).user,'native-first','a native param string retains precedence');
    delete window.ZOHO.CREATOR[key];
  }
  window.appsetup={loginUser:{}};assert.throws(() => runtime.apply({envUrlFragment:''}), /valid connected user/);assert.equal(runtime.current().environment,'UNKNOWN');
  window.appsetup.loginUser='setup-actor';assert.equal(runtime.apply({envUrlFragment:''}).user,'setup-actor');delete window.appsetup;
  assert.equal(runtime.apply({envUrlFragment:''}).user,'(unknown)','a missing actor remains unknown for the actual startup gate to reject');
  runtime.apply({loginUser: 'fallback-user', appLinkName: 'fallback-app'});
  assert.equal(runtime.current().environment, 'DEVELOPMENT', 'URL fallback remains only when no native fragment was supplied');
  window.ZOHO.CREATOR.UTIL = {getInitParams: async () => ({envUrlFragment: '', loginUser: 'fresh-user', appLinkName: 'fresh-app'})};
  assert.equal((await runtime.capture()).environment, 'PRODUCTION', 'capture applies the actual native bridge result');
  const rejected = {code: 500, message: 'Native bridge rejected'};
  window.ZOHO.CREATOR.UTIL.getInitParams = async () => {throw rejected;};
  await assert.rejects(runtime.capture(), error => error === rejected, 'capture must not swallow a failed native handshake into URL-based context');
  delete window.ZOHO.CREATOR.UTIL;
  await assert.rejects(runtime.capture(), /session context is unavailable/);
}

const sharedAccess = fs.readFileSync(path.join(root, 'creator/functions/getUserAccess.dg'), 'utf8');
const devAccess = fs.readFileSync(path.join(root, 'creator/functions/getUserAccessDev.dg'), 'utf8');
if (sharedAccess.includes('requester == "rbelliveau"')) failures.push('Production access function contains the DEV alias');
if (!devAccess.includes('requester = "wbdevelopment";') || !devAccess.includes('return thisapp.getUserAccess(requester);')) {
  failures.push('DEV access wrapper must map the one admin identity and reuse shared permissions');
}
if (devAccess.includes('editAll =') || devAccess.includes('pfEditAll =')) failures.push('DEV wrapper duplicated permission rules');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Runtime environment, user identity, and API routing checks passed for ${widgets.length} widgets.`);
