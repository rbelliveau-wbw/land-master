(function (root) {
  'use strict';
  const copy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
  const id = value => typeof value === 'string' && /^\d+$/.test(value) ? value : '';
  const lookupId = value => id(value && typeof value === 'object' ? value.ID : value);
  const failedStatus = value => value && (value.success === false || /^(error|failed|failure)$/i.test(String(value.status || '').trim()));
  function problem(message, response, outcome) {
    const error = new Error(message);
    error.response = response;
    error.cause = response;
    error.code = root.LMData.code(response);
    error.outcome = outcome || 'unknown';
    return error;
  }
  function confirmed(response, expectedId) {
    const code = root.LMData.code(response);
    function reject(message, cause, outcome) {
      const error = problem(message, cause || response, outcome);
      error.raw = response; error.response = response; error.noReplay = true;
      throw error;
    }
    if (!response || typeof response !== 'object' || Array.isArray(response) || String(response.code) !== '3000' || response.error || failedStatus(response)) reject('Creator did not confirm the write.', response, code && code !== '3000' ? 'rejected' : 'unknown');
    const hasResult = own(response, 'result');
    if (hasResult && own(response, 'data')) reject('Creator returned competing write results.', response, 'unknown');
    const results = hasResult ? response.result : [response];
    if (!Array.isArray(results) || results.length !== 1) {
      const failed = Array.isArray(results) && results.find(result => result && String(result.code) !== '3000');
      reject('Creator returned an unconfirmed write result.', failed || response, 'unknown');
    }
    const result = results[0];
    if (hasResult && result && own(result, 'result')) reject('Creator returned a nested write result.', result, 'unknown');
    if (!result || typeof result !== 'object' || Array.isArray(result) || String(result.code) !== '3000' || result.error || failedStatus(result)) reject('Creator rejected or did not confirm this record.', result || response, result && result.code && String(result.code) !== '3000' ? 'rejected' : 'unknown');
    if (result.data && (result.data.error || failedStatus(result.data) || (result.data.code != null && String(result.data.code) !== '3000'))) reject('Creator returned a failure beside the record ID.', result.data, 'unknown');
    const recordId = id(result.data && result.data.ID);
    if (!recordId || (expectedId && recordId !== expectedId)) reject('Creator did not confirm the intended record ID.', result, 'unknown');
    return {id: recordId, response};
  }
  function create(options) {
    const S = options.state, C = options.config;
    Object.assign(S, {drafts:{}, revisions:{}, uncertain:null, curveDrafts:{}, curveUncertain:null, refreshing:false, curveBusy:false, generation:0, editEpoch:0, resources:{}, loadBlocked:false});
    let session = null, flushPromise = null, curvePromise = null;
    const notify = (event, detail) => options.onChange && options.onChange(event, detail);
    function current() { return root.LMRuntime.current(); }
    function key(context) { return JSON.stringify([context.environment, context.user, context.appLinkName]); }
    function valid(context) { return context && ['PRODUCTION','DEVELOPMENT','STAGE'].includes(context.environment) && typeof context.user === 'string' && context.user.trim() && context.user !== '(unknown)'; }
    function bind(context) { if (!valid(context)) throw problem('A recognized Creator environment and connected user are required.', null, 'rejected'); session = copy(context); }
    function assertSession(captured) {
      if (!session || !valid(current()) || key(current()) !== key(captured || session)) throw problem('The Creator session changed. Reconnect before writing.', null, 'rejected');
    }
    function read(report, criteria, extra) { return root.LMData.readAll(Object.assign({reportName:report, criteria:criteria || '', fresh:true}, extra || {})); }
    function invalidate(report) { root.LMData.invalidate(scope => scope.reportName === report); }
    function mutate(kind, recordId, data, report) {
      const captured = copy(session);
      const target = report || C.report;
      if (!S.live || S.demo) return Promise.reject(problem('Preview is read only.', null, 'rejected'));
      try {
        assertSession(captured);
        if (S.uncertain || S.curveUncertain) throw problem('A previous write needs a read-only recheck.', null, 'rejected');
        if (kind !== 'add' && !id(recordId)) throw problem('A valid record ID is required.', null, 'rejected');
        if (kind === 'add' && target !== C.curveForm) throw problem('Creating a Settings record is not supported.', null, 'rejected');
        if (kind === 'delete' && target !== C.curveReport) throw problem('Only a selected curve row can be deleted.', null, 'rejected');
      } catch (error) { return Promise.reject(error); }
      const payload = copy(data);
      const api = root.ZOHO.CREATOR.DATA;
      invalidate(kind === 'add' ? C.curveReport : target);
      return root.LMData.request('settings:'+kind, () => {
        assertSession(captured);
        if (kind === 'add') return api.addRecords({form_name:target, payload:{data:payload}});
        if (kind === 'delete') return api.deleteRecords({report_name:target, payload:{criteria:'(ID == '+recordId+')'}});
        return api.updateRecordById({report_name:target, id:recordId, payload:{data:payload}});
      }).then(response => confirmed(response, kind === 'add' ? '' : recordId), error => {
        if (error.outcome) throw error;
        const code = root.LMData.code(error);
        throw problem(error.message || 'The write outcome is unknown. Recheck before another write.', error, code && code !== '3000' ? 'rejected' : 'unknown');
      });
    }
    function hasDrafts() { return Object.keys(S.drafts).length > 0 || Object.keys(S.curveDrafts).length > 0 || !!S.uncertain || !!S.curveUncertain; }
    function canEdit(field) {
      try { assertSession(); } catch (error) { return false; }
      if (!S.live || S.demo || !S.ready || !S.rec || S.refreshing || S.curveBusy || S.loadBlocked || S.uncertain || S.curveUncertain) return false;
      if (field && !own(S.rec, field)) return false;
      const type = field && options.field(field);
      return !(type && type.t === 'multi' && type.src && S.resources[type.src] !== 'ready');
    }
    function value(field) { return own(S.drafts, field) ? copy(S.drafts[field].value) : S.rec && S.rec[field]; }
    function queue(field, proposed) {
      if (!canEdit(field)) { notify('blocked', 'This field is unavailable while data or a write is being checked.'); return false; }
      const definition = options.field(field);
      let invalid = null;
      if (definition && definition.t === 'multi') {
        try { proposed = list(proposed); } catch (error) { invalid = error; }
      }
      if (definition && definition.t === 'int' && proposed !== '' && !Number.isSafeInteger(Number(proposed))) invalid = problem('Enter a whole number. The draft is retained.', null, 'rejected');
      const revision = (S.revisions[field] || 0) + 1;
      S.revisions[field] = revision; S.editEpoch++;
      S.drafts[field] = {value:copy(proposed), revision, status:'queued'};
      if (invalid) {
        invalid.validation = true; invalid.outcome = 'rejected';
        S.drafts[field].status = 'failed'; S.drafts[field].error = invalid.message; S.failed[field] = invalid.message; delete S.pending[field];
        notify('save-error', invalid); return false;
      }
      S.pending[field] = copy(proposed); delete S.failed[field];
      clearTimeout(S.saveTimer);
      S.saveTimer = setTimeout(() => { flush().catch(() => {}); }, C.saveDebounceMs);
      notify('queued', field); return true;
    }
    function list(value) {
      if (value === '' || value == null) return [];
      const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(value.includes('@#zoho-comma#@') ? '@#zoho-comma#@' : ',') : null;
      if (!values) throw problem('A lookup list could not be verified.');
      const ids = values.map(v => lookupId(typeof v === 'string' ? v.trim() : v));
      if (ids.some(v => !v) || new Set(ids).size !== ids.length) throw problem('A lookup list contains an invalid or duplicate ID.');
      return ids.sort();
    }
    function normalized(field, value, curve) {
      const definition = curve ? options.curveField(field) : options.field(field);
      const type = definition && definition.t;
      if (type === 'multi') return JSON.stringify(list(value));
      if (type === 'look') { if (value == null || value === '') return ''; const result = lookupId(value); if (!result) throw problem('The lookup ID could not be verified.'); return result; }
      if (type === 'bool') {
        if (value === true || value === false) return value;
        const text = String(value == null ? '' : value).trim().toLowerCase();
        if (['true','yes','1'].includes(text)) return true;
        if (['false','no','0',''].includes(text)) return false;
        throw problem('The checkbox value could not be verified.');
      }
      if (['money','pct','int'].includes(type)) {
        const text = String(value == null ? '' : value).replace(/[,$%\s]/g, '');
        if (!text) return '';
        const number = Number(text); if (!Number.isFinite(number)) throw problem('The numeric value could not be verified.'); return number;
      }
      if (type === 'datetime') return String(value == null ? '' : value).trim().replace(/\b0(\d)(?=:)/g, '$1');
      if (type === 'date') return options.date ? options.date(value) : String(value == null ? '' : value);
      if (type === 'text') return String(value == null ? '' : value).replace(/\r\n?/g, '\n');
      if (value && typeof value === 'object') return lookupId(value) || JSON.stringify(value);
      return String(value == null ? '' : value);
    }
    function exact(row, values, curve) {
      for (const field of Object.keys(values)) {
        if (!own(row, field) || normalized(field, row[field], curve) !== normalized(field, values[field], curve)) throw problem('Fresh readback did not match '+field+'. The draft is retained.');
      }
      return row;
    }
    function batch() {
      const values = {}, revisions = {};
      for (const field of Object.keys(S.pending)) {
        const draft = S.drafts[field]; if (!draft || draft.status !== 'queued') continue;
        values[field] = copy(draft.value); revisions[field] = draft.revision;
      }
      return freeze({id:S.recId, session:copy(session), generation:S.generation, values, revisions});
    }
    function assertBatch(operation) {
      assertSession(operation.session);
      if (S.recId !== operation.id || S.generation !== operation.generation) throw problem('The selected Settings record changed before verification.');
    }
    async function verifyBatch(operation) {
      assertBatch(operation);
      const rows = await read(C.report, '(ID == '+operation.id+')');
      assertBatch(operation);
      if (rows.length !== 1 || id(rows[0].ID) !== operation.id) throw problem('The intended Settings record was not returned by fresh readback.');
      return exact(rows[0], operation.values, false);
    }
    function acceptBatch(operation, row) {
      assertBatch(operation);
      Object.assign(S.rec, copy(row));
      for (const field of Object.keys(operation.values)) {
        if (S.drafts[field] && S.drafts[field].revision === operation.revisions[field]) {
          delete S.drafts[field]; delete S.failed[field]; delete S.pending[field];
          notify('saved', field);
        }
      }
      notify('settled');
    }
    function retainBatch(operation, error) {
      if (error.outcome !== 'rejected') S.uncertain = operation;
      for (const field of Object.keys(operation.values)) {
        const draft = S.drafts[field];
        if (draft && draft.revision === operation.revisions[field]) { draft.status = error.outcome === 'rejected' ? 'failed' : 'unknown'; draft.error = error.message; S.failed[field] = error.message; }
      }
      notify('save-error', error);
    }
    function flush() {
      clearTimeout(S.saveTimer);
      if (flushPromise) return flushPromise;
      if (S.uncertain || S.curveUncertain) return Promise.reject(problem('A previous write needs a read-only recheck.'));
      if (!canEdit()) return Promise.reject(problem('Settings is not ready for a write.', null, 'rejected'));
      const operation = batch();
      if (!Object.keys(operation.values).length) return Promise.resolve(false);
      for (const field of Object.keys(operation.values)) { delete S.pending[field]; if (S.drafts[field].revision === operation.revisions[field]) S.drafts[field].status = 'saving'; }
      S.inflight = operation; notify('saving', operation);
      flushPromise = (async () => {
        try {
          assertBatch(operation);
          await mutate('update', operation.id, operation.values, C.report);
          const row = await verifyBatch(operation); acceptBatch(operation, row); return true;
        } catch (error) { retainBatch(operation, error); throw error; }
        finally { S.inflight = false; flushPromise = null; notify('settled'); if (!S.uncertain && Object.keys(S.pending).length) S.saveTimer = setTimeout(() => { flush().catch(() => {}); }, C.saveDebounceMs); }
      })();
      return flushPromise;
    }
    async function recheck() {
      if (S.inflight || S.curveBusy || S.refreshing) throw problem('Wait for the active request to finish.', null, 'rejected');
      const operation = S.uncertain || batchForFailed();
      if (!operation) return false;
      S.inflight = operation; notify('checking', operation);
      try { const row = await verifyBatch(operation); S.uncertain = null; acceptBatch(operation, row); return true; }
      catch (error) { retainBatch(operation, error); throw error; }
      finally { S.inflight = false; notify('settled'); if (!S.uncertain && Object.keys(S.pending).length) S.saveTimer = setTimeout(() => { flush().catch(() => {}); }, C.saveDebounceMs); }
    }
    function batchForFailed() {
      const operation = {id:S.recId, session:copy(session), generation:S.generation, values:{}, revisions:{}};
      for (const field of Object.keys(S.drafts)) if (S.drafts[field].status === 'failed') { operation.values[field] = copy(S.drafts[field].value); operation.revisions[field] = S.drafts[field].revision; }
      return Object.keys(operation.values).length ? operation : null;
    }
    function curveRows(rows, parent) {
      if (rows.some(row => !id(row.ID) || lookupId(row[C.curveParentField]) !== parent)) throw problem('A curve row did not identify the selected Settings parent.');
      return rows;
    }
    async function load() {
      if (S.refreshing || S.inflight || S.curveBusy || hasDrafts()) { notify('blocked', 'Local edits are retained. Finish or recheck them before reloading.'); return false; }
      assertSession();
      const actor = copy(session), generation = ++S.generation, epoch = S.editEpoch, selected = S.recId;
      S.refreshing = true; notify('loading');
      const cancelled = () => S.generation !== generation || key(current()) !== key(actor);
      try {
        const records = await read(C.report, '', {isCancelled:cancelled});
        if (!records.length) throw problem('No Settings record exists. Create one in Creator first.', null, 'rejected');
        const record = selected ? records.find(row => id(row.ID) === selected) : records[0];
        if (!record || !id(record.ID)) throw problem('The selected Settings record is unavailable. Reload cannot select a different record silently.', null, 'rejected');
        const parent = record.ID;
        const jobs = [
          ['curve',C.curveReport,'('+C.curveParentField+' == '+parent+')'],
          ['approvals',C.approvalsReport,'Contract_Template == "Builder"'],
          ['actions',C.actionsReport,'Contract_Template != ""'],
          ['proformas',C.proformaReport,'']
        ];
        const results = await Promise.allSettled(jobs.map(job => read(job[1], job[2], {isCancelled:cancelled}).then(rows => job[0] === 'curve' ? curveRows(rows, parent) : rows)));
        assertSession(actor);
        if (cancelled() || S.editEpoch !== epoch || hasDrafts()) throw problem('Reload was superseded by a local edit. The existing record is retained.');
        const notes = [];
        S.rec = copy(record); S.recId = parent; S.recCount = records.length; S.extras = copy(records);
        results.forEach((result, index) => { const name = jobs[index][0]; if (result.status === 'fulfilled') { S[name] = copy(result.value); S.resources[name] = 'ready'; } else { S.resources[name] = 'error'; notes.push(name+' unavailable'); } });
        S.loadError = notes.join(' · '); S.ready = true; S.loadBlocked = false;
        notify('loaded'); return true;
      } catch (error) { S.loadBlocked = true; S.loadError = error.message; notify('load-error', error); throw error; }
      finally { S.refreshing = false; notify('settled'); }
    }
    function curveAllowed() { return canEdit() && !S.inflight && !hasDrafts() && S.resources.curve === 'ready'; }
    function curveOperation(kind, recordId, proposed) {
      if (curvePromise) return curvePromise;
      if (!curveAllowed()) return Promise.reject(problem('Finish or recheck edits before changing a curve row.', null, 'rejected'));
      for (const field of Object.keys(proposed || {})) {
        const definition = options.curveField(field);
        if (!definition) return Promise.reject(problem('The selected curve field is unavailable.', null, 'rejected'));
        if (definition.t === 'look' && definition.src && S.resources[definition.src] !== 'ready') return Promise.reject(problem('The lookup choices are unavailable. Reload to retry.', null, 'rejected'));
      }
      const row = kind === 'add' ? null : S.curve.find(item => item.ID === recordId);
      if (kind !== 'add' && (!row || lookupId(row[C.curveParentField]) !== S.recId)) return Promise.reject(problem('The selected curve row is unavailable.', null, 'rejected'));
      const operation = {kind, id:recordId || '', parent:S.recId, session:copy(session), generation:S.generation, values:copy(proposed || {})};
      if (kind === 'add') operation.values[C.curveParentField] = operation.parent;
      freeze(operation.values); freeze(operation.session);
      ['kind','parent','session','generation','values'].forEach(field => Object.defineProperty(operation, field, {writable:false}));
      if (kind !== 'add') Object.defineProperty(operation, 'id', {writable:false});
      const draftKey = operation.id || 'new';
      S.curveDrafts[draftKey] = operation; S.curveBusy = operation; notify('curve-saving', operation);
      curvePromise = (async () => {
        await Promise.resolve(); // Publish the in-flight promise before any synchronous validation failure.
        try {
          assertCurve(operation);
          for (const field of Object.keys(operation.values)) {
            const definition = options.curveField(field);
            if (definition && definition.t === 'int' && operation.values[field] !== '' && !Number.isSafeInteger(Number(operation.values[field]))) throw problem('Enter a whole month number. The draft is retained.', null, 'rejected');
          }
          const result = await mutate(kind === 'edit' ? 'update' : kind, operation.id, operation.values, kind === 'add' ? C.curveForm : C.curveReport);
          if (kind === 'add') operation.id = result.id;
          await verifyCurve(operation);
          delete S.curveDrafts[draftKey]; S.curveUncertain = null; notify('curve-saved', operation); return true;
        } catch (error) { operation.error = error.message; operation.outcome = error.outcome || 'unknown'; S.curveUncertain = operation; notify('curve-error', error); throw error; }
        finally { S.curveBusy = false; curvePromise = null; notify('settled'); }
      })();
      return curvePromise;
    }
    function assertCurve(operation) { assertSession(operation.session); if (S.recId !== operation.parent || S.generation !== operation.generation) throw problem('The Settings parent changed before curve verification.'); }
    async function verifyCurve(operation) {
      assertCurve(operation);
      if (!id(operation.id)) throw problem('The created row ID is unknown. Review it in Creator; this create will not be repeated.');
      const rows = await read(C.curveReport, '(ID == '+operation.id+')');
      assertCurve(operation);
      if (operation.kind === 'delete') { if (rows.length) throw problem('Fresh readback still contains the deleted curve row.'); S.curve = S.curve.filter(row => row.ID !== operation.id); return true; }
      if (rows.length !== 1 || id(rows[0].ID) !== operation.id || lookupId(rows[0][C.curveParentField]) !== operation.parent) throw problem('Fresh readback did not confirm the curve row and Settings parent.');
      const values = Object.assign({}, operation.values); delete values[C.curveParentField]; exact(rows[0], values, true);
      const index = S.curve.findIndex(row => row.ID === operation.id);
      if (index < 0) S.curve.push(copy(rows[0])); else S.curve[index] = copy(rows[0]); return true;
    }
    async function recheckCurve() {
      if (S.curveBusy || S.inflight || S.refreshing) throw problem('Wait for the active request to finish.', null, 'rejected');
      const operation = S.curveUncertain; if (!operation) return false;
      S.curveBusy = operation; notify('curve-checking', operation);
      try { await verifyCurve(operation); S.curveUncertain = null; S.curveDrafts = {}; notify('curve-saved', operation); return true; }
      catch (error) { notify('curve-error', error); throw error; }
      finally { S.curveBusy = false; notify('settled'); }
    }
    function discardRejected() {
      if (S.inflight || S.curveBusy || S.refreshing || S.uncertain) return false;
      if (S.curveUncertain && S.curveUncertain.outcome !== 'rejected') return false;
      const discarded = [];
      for (const field of Object.keys(S.drafts)) if (S.drafts[field].status === 'failed') { delete S.drafts[field]; delete S.failed[field]; delete S.pending[field]; discarded.push(field); }
      if (S.curveUncertain) { S.curveUncertain = null; S.curveDrafts = {}; }
      notify('discarded', discarded); return true;
    }
    return Object.freeze({bind, load, queue, flush, recheck, recheckCurve, discardRejected, value, canEdit, hasDrafts, curveAllowed, curveOperation});
  }
  root.LMSettings = Object.freeze({create, confirmed});
})(window);
