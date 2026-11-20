/* ================== SUPABASE (replaces GAS) ================== */
const SUPABASE_URL = 'https://pqfhjxpijmqaaoxpmshv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_DSt6DloT95NQGoOwlLLSiQ_wLurwO0C';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const TZ = 'Asia/Bangkok';        // = spreadsheet time zone
const ORDER_COL = 'id';           // sort column = original sheet order (first match wins in mappings)
const DELIMITERS = ['#', ';', '/'];
const DROP_ISSUE_RE = /^there were no problems or disruptions throughout the day/i;

/* --- helpers (ported 1:1 from GAS) --- */
const norm_ = s => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const key_ = s => norm_(s).replace(/[\s.。;；]+$/, '');
const digits_ = s => String(s ?? '').replace(/[^0-9]/g, '');
const isNA_ = v => { const s = norm_(v); return s === '' || s === 'n/a' || s === 'na' || s === '-'; };
const sv_ = v => isNA_(v) ? '' : String(v).trim();
const numVal_ = v => { const n = (typeof v === 'string' && v.trim() !== '') ? Number(v) : v; return (typeof n === 'number' && isFinite(n)) ? n : ''; };
const nk_ = s => String(s).toLowerCase().replace(/[\s_\-]/g, '');
const rowOf_ = o => { const m = {}; for (const k in o) m[nk_(k)] = o[k]; return m; };           // column names: case / _ / - ignored
const fv_ = (m, ...names) => { for (const n of names) { const v = m[nk_(n)]; if (v !== undefined && v !== null) return v; } return ''; };
const p2 = n => ('0' + n).slice(-2);
const tzFmt = new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** timestamptz / ISO / text (d/M/yyyy H.mm, d-M-yyyy, 12 h am/pm, Buddhist year) -> 'yyyy-MM-ddTHH:mm:ss' (local TZ) or null. Day first. */
function toLocal_(v) {
  if (v instanceof Date) return tzFmt.format(v).replace(' ', 'T');
  if (typeof v !== 'string') return null;
  const s = v.trim().replace(/\s+/g, ' ').replace(/\s*น\.?$/, '');
  if (/^\d{4}-\d\d-\d\d[T ]\d\d:\d\d(:\d\d)?(\.\d+)?(Z|[+-]\d\d(:?\d\d)?)$/.test(s)) return tzFmt.format(new Date(s.replace(' ', 'T'))).replace(' ', 'T');
  const m = s.match(/^(\d{1,4})[\/\-.](\d{1,2})[\/\-.](\d{1,4})(?:[ T,]+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?(?:\s*([AaPp])\.?[Mm]\.?)?)?(?:\.\d+)?$/);
  if (!m) return null;
  let d, mo, y;
  if (m[1].length === 4) { y = +m[1]; mo = +m[2]; d = +m[3]; } else { d = +m[1]; mo = +m[2]; y = +m[3]; }
  if (mo > 12 && d <= 12) { const t = d; d = mo; mo = t; }
  if (y < 100) y += 2000; else if (y > 2400) y -= 543;
  let h = m[4] ? +m[4] : 0; const mi = m[5] ? +m[5] : 0, sec = m[6] ? +m[6] : 0;
  if (m[7]) { const pm = /p/i.test(m[7]); if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || sec > 59 || y < 1990 || y > 2100) return null;
  const chk = new Date(y, mo - 1, d); if (chk.getDate() !== d) return null;                     // 31/02 -> reject
  return `${y}-${p2(mo)}-${p2(d)}T${p2(h)}:${p2(mi)}:${p2(sec)}`;
}
const splitIssue_ = raw => {
  const t = String(raw || '').trim();
  for (const dl of DELIMITERS) { const i = t.indexOf(dl); if (i > 0) return { issue: t.slice(0, i).trim(), solution: t.slice(i + 1).trim() }; }
  return { issue: t, solution: '' };
};
const cleanRemark_ = (v, rawMachine, machineNo) => {
  const t = sv_(v), n = norm_(t);
  return (!n || n === norm_(rawMachine) || n === norm_(rawMachine + ' ' + machineNo)) ? '' : t;
};

/* --- fail rate + anomaly checks (v36) --- */
const MAX_REPAIR_MIN = 1000;                                              // repair minutes above this = anomaly
const REQUIRED_FIELDS = ['shift', 'station', 'product', 'recoveryEnd', 'qty', 'technician'];   // empty -> "incomplete data"
const calcFailRate_ = (min, qty) => {                                      // repair_minutes / qty / 21 / 60 ; '' when minutes empty/0 or qty <= 0
  if (min === '' || min == null || qty === '' || qty == null) return '';
  const m = Number(min), q = Number(qty);
  return (isFinite(m) && isFinite(q) && m > 0 && q > 0) ? m / q / 21 / 60 : '';
};
const swapDM_ = s => { const m = /^(\d{4})-(\d\d)-(\d\d)(.*)$/.exec(s || ''); if (!m) return ''; const mo = +m[2], d = +m[3]; return (d > 12 || mo === d) ? '' : `${m[1]}-${p2(d)}-${p2(mo)}${m[4]}`; };
function detectAnomalies_(r) {                                             // -> [{code, f, v, fix}]  (texts are in index.html)
  const a = [], nowL = tzFmt.format(new Date()).replace(' ', 'T'), ts = /^\d{4}-\d\d-\d\dT/.test(r.timestamp) ? r.timestamp : '';
  if (!ts) a.push({ code: 'noTime', v: r.timestamp || '' });
  else {
    if (ts > nowL) a.push({ code: 'future', f: 'timestamp', v: ts, fix: swapDM_(ts) });
    [['date', r.date], ['repairStart', r.repairStart], ['recoveryEnd', r.recoveryEnd]].forEach(([f, v]) => {
      if (!v || !/^\d{4}-\d\d-\d\d/.test(v) || v.slice(0, 10) === ts.slice(0, 10)) return;
      const sw = swapDM_(v);
      if (sw && sw.slice(0, 10) === ts.slice(0, 10)) a.push({ code: 'dateSwap', f, v, fix: sw });
      else if (f === 'date' && Math.abs(new Date(v.slice(0, 10)) - new Date(ts.slice(0, 10))) > 864e5 * 1.5) a.push({ code: 'dateMismatch', f, v });
    });
    if (r.repairStart && r.repairStart < ts) a.push({ code: 'negTime', f: 'repairStart', v: r.repairStart });
    if (r.recoveryEnd && r.recoveryEnd < ts) a.push({ code: 'negTime', f: 'recoveryEnd', v: r.recoveryEnd });
    else if (r.recoveryEnd && r.repairStart && r.recoveryEnd < r.repairStart) a.push({ code: 'negTime', f: 'recoveryEnd', v: r.recoveryEnd });
  }
  if (typeof r.repairMinutes === 'number') {
    if (r.repairMinutes < 0 && !a.some(x => x.code === 'negTime')) a.push({ code: 'negMin', v: r.repairMinutes });
    if (r.repairMinutes > MAX_REPAIR_MIN) a.push({ code: 'overLimit', v: r.repairMinutes });
  }
  if (!r.noMachine) { const miss = REQUIRED_FIELDS.filter(k => r[k] === '' || r[k] == null); if (miss.length) a.push({ code: 'incomplete', v: miss.join(', ') }); }
  return a;
}

/** Read a whole table (PostgREST returns max 1000 rows per request -> page through). */
async function fetchAll_(table, cols = [ORDER_COL]) {
  const out = [], step = 1000;
  for (let from = 0; ; from += step) {
    let q = supabaseClient.from(table).select('*');
    cols.forEach(c => { q = q.order(c, { ascending: true }); });
    const { data, error } = await q.range(from, from + step - 1);
    if (error) throw new Error(table + ': ' + error.message);
    out.push(...data);
    if (data.length < step) return out;
  }
}

/* --- mapping tables --- */
function loadMachineMapping_(rows) {                  // pr_machine_mapping: raw_machine_name | machine_number | chinese
  const res = { byKey: {}, byName: {} };
  rows.map(rowOf_).forEach(m => {
    const raw = norm_(fv_(m, 'raw_machine_name', 'machine_raw', 'machine'));
    if (!raw) return;
    const item = { chinese: String(fv_(m, 'chinese', 'machine_cn', 'chinese_name') || '').trim() };
    res.byKey[raw + '|' + digits_(fv_(m, 'machine_number', 'machine_no'))] = item;
    if (!res.byName[raw]) res.byName[raw] = item;
  });
  return res;
}
function loadIssueMapping_(rows) {                    // pr_issue_mapping: issue | english_issue | chinese_issue | solution | english_solution | chinese_solution | category
  const res = { byIssue: {}, bySolution: {} };
  rows.map(rowOf_).forEach(m => {
    const g = (...n) => String(fv_(m, ...n) || '').trim();
    const raw = [g('issue', 'raw_issue'), g('english_issue', 'issue_en'), g('chinese_issue', 'issue_cn')];
    const sRaw = [g('solution', 'raw_solution'), g('english_solution', 'solution_en'), g('chinese_solution', 'solution_cn')];
    const iss = { issueEn: raw[1], issueCn: raw[2], category: g('category') }, sol = { solutionEn: sRaw[1], solutionCn: sRaw[2] };
    raw.forEach(k => { const key = key_(k); if (key && !res.byIssue[key]) res.byIssue[key] = iss; });
    sRaw.forEach(k => { const key = key_(k); if (key && !res.bySolution[key]) res.bySolution[key] = sol; });
  });
  return res;
}
function loadKeywords_(rows) {                        // pr_keyword: keyword1 | model | keyword2 | keyword1_chinese | keyword2_chinese | chinese | english | brand(optional)
  const list = [];
  rows.map(rowOf_).forEach(m => {
    const g = (...n) => String(fv_(m, ...n) ?? '').trim(), kw1 = g('keyword1');
    const x = { brand: g('brand') || kw1, model: g('model'), fn: g('keyword2'), brandCn: g('keyword1_chinese'), fnCn: g('keyword2_chinese'), cn: g('chinese'), en: g('english') };
    if (!kw1 || !x.fn) return;
    x.k1 = norm_(kw1); x.k2 = norm_(x.fn);
    list.push(x);
  });
  return list;
}
function hasWord_(h, needle) {
  if (!needle) return false;
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(^|[^a-z0-9])' + esc + '([^a-z0-9]|$)').test(h);
}
function modelHit_(r, raw, n) {
  if (!r.model) return false;
  if (/^[0-9.]+$/.test(r.model)) { const want = parseFloat(r.model), toks = n.match(/\d+(?:\.\d+)?/g) || []; return toks.some(t => parseFloat(t) === want); }
  return hasWord_(n, norm_(r.model));
}
function matchRow_(raw, rows) {
  const n = norm_(raw), cands = rows.filter(r => hasWord_(n, r.k1) && hasWord_(n, r.k2));
  if (!cands.length) return null;
  const withModel = cands.filter(r => modelHit_(r, raw, n));
  if (withModel.length) return withModel.sort((a, b) => (b.k1.length + b.k2.length) - (a.k1.length + a.k2.length))[0];
  const blank = cands.filter(r => !r.model);
  if (blank.length) return blank[0];
  const nameHasModel = /\(([^)]*)\)/.test(raw) || /\d+(\.\d+)?/.test(raw);
  return (!nameHasModel && cands.length === 1) ? cands[0] : null;
}

/** pr_logs + mappings -> same JSON the GAS doGet returned: { ok, generatedAt, data, moduleHistory } */
async function fetchPayload() {
  const [logs, mmRows, imRows, kwRows, trRows] = await Promise.all([...['pr_logs', 'pr_machine_mapping', 'pr_issue_mapping', 'pr_keyword'].map(t => fetchAll_(t)),
    fetchAll_('pr_translations', ['kind', 'src_key']).catch(e => { console.warn('pr_translations not loaded:', e.message); window.TR_ERR = e.message; return []; })]);   // permanent translation cache (EN / ZH / TH) filled by GAS
  const tr = { machine: {}, issue: {}, solution: {} };
  trRows.forEach(x => { if (tr[x.kind]) tr[x.kind][x.src_key] = { zh: x.zh || '', th: x.th || '', en: x.en || '' }; });
  const machineMap = loadMachineMapping_(mmRows), issueMap = loadIssueMapping_(imRows), keywords = loadKeywords_(kwRows), out = [];
  const rows = logs.map(rowOf_).map(m => ({ m, f: String(fv_(m, 'factory', 'sheet')).trim() })).filter(x => FACTORIES.includes(x.f));
  rows.sort((a, b) => FACTORIES.indexOf(a.f) - FACTORIES.indexOf(b.f));                      // stable: factory order, then sheet order
  rows.forEach(({ m, f: name }) => {
    const rawMachine = String(fv_(m, 'raw_machine_name', 'machine_raw') || '').trim(), machineNo = String(fv_(m, 'machine_number', 'machine_no') || '').trim();
    const rawIssue = String(fv_(m, 'raw_issue', 'issue') || '').trim(), extra = fv_(m, 'extra');
    if (!rawMachine && !rawIssue) return;
    if (DROP_ISSUE_RE.test(rawIssue.replace(/\s+/g, ' '))) return;
    const noMachine = isNA_(rawMachine);
    const tsRaw = fv_(m, 'timestamp', 'ts'), tsL = toLocal_(tsRaw), dL = toLocal_(fv_(m, 'log_date', 'date', '日期'));
    const rsL = toLocal_(fv_(m, 'repair_start', '维修时间')), reL = toLocal_(fv_(m, 'recovery_end', '复机时间'));
    const split = splitIssue_(rawIssue);
    const mm = machineMap.byKey[norm_(rawMachine) + '|' + digits_(machineNo)] || machineMap.byName[norm_(rawMachine)];
    const im = issueMap.byIssue[key_(split.issue)], sm = split.solution ? issueMap.bySolution[key_(split.solution)] : null;
    const kr = matchRow_(rawMachine, keywords), no = digits_(machineNo);
    const modelNameEn = kr ? (kr.en || [kr.brand, kr.model, kr.fn].filter(Boolean).join(' ')) : '', modelNameCn = kr ? kr.cn : '';
    const trI = tr.issue[key_(split.issue)] || {}, trS = (split.solution && tr.solution[key_(split.solution)]) || {}, trM = tr.machine[norm_(rawMachine) + '|' + no] || tr.machine[norm_(rawMachine)] || {};
    let machineCn = mm && mm.chinese ? mm.chinese : trM.zh || '';
    if (!machineCn && modelNameCn) machineCn = modelNameCn + (no ? ' ' + no + '#' : '');
    let rm = numVal_(fv_(m, 'repair_minutes', '维修总时间(min)', '维修总时间'));
    if (rm === '' && tsL && reL) rm = Math.round((new Date(reL) - new Date(tsL)) / 60000);   // = sheet formula (復机 - timestamp) in minutes
    out.push({
      id: name + '-' + (fv_(m, 'row_no', 'sheet_row') || fv_(m, 'id')),
      factory: name,
      timestamp: tsL || (isNA_(tsRaw) ? '' : String(tsRaw)) || (dL ? dL.slice(0, 10) + 'T00:00:00' : ''),
      noMachine, machineRaw: rawMachine, machineNo,
      machineKey: name + '|' + norm_(rawMachine) + '|' + no,
      machineEn: noMachine ? 'N/A' : rawMachine + (machineNo ? ' ' + machineNo : ''),
      machineCn,
      brandEn: kr ? kr.brand : '', brandCn: kr ? kr.brandCn : '',
      functionEn: kr ? kr.fn : '', functionCn: kr ? kr.fnCn : '',
      model: kr ? kr.model : '', modelNameEn, modelNameCn,
      extra: extra === '' || extra == null ? '' : String(extra),
      issueRaw: split.issue,
      issueEn: im && im.issueEn ? im.issueEn : (trI.en || split.issue), issueCn: (im && im.issueCn) || trI.zh || '', issueTh: trI.th || '',
      solutionRaw: split.solution,
      solutionEn: sm && sm.solutionEn ? sm.solutionEn : (trS.en || split.solution), solutionCn: (sm && sm.solutionCn) || trS.zh || '', solutionTh: trS.th || '', machineTh: trM.th || '',
      pk: fv_(m, 'id'), rowNo: fv_(m, 'row_no', 'sheet_row'), confirmed: [true, 'true', 't', 1, '1'].includes(fv_(m, 'confirmed')), sheetSynced: fv_(m, 'sheet_synced') !== false,
      category: im ? im.category : '',
      date: dL ? dL.slice(0, 10) : sv_(fv_(m, 'log_date', 'date', '日期')),
      shift: sv_(fv_(m, 'shift', '班别')), station: sv_(fv_(m, 'station', '站别')),
      product: sv_(fv_(m, 'product', '机种', '機種')), issueType: sv_(fv_(m, 'issue_type', '设备问题点')),
      repairStart: rsL || sv_(fv_(m, 'repair_start', '维修时间')), recoveryEnd: reL || sv_(fv_(m, 'recovery_end', '复机时间')),
      repairMinutes: rm, qty: numVal_(fv_(m, 'qty', '设备数量')), failRate: numVal_(fv_(m, 'fail_rate', '设备故障率')),
      leader: sv_(fv_(m, 'leader', '领班确认')), technician: sv_(fv_(m, 'technician', '维修人员')),
      remark: cleanRemark_(fv_(m, 'remark', '备注'), rawMachine, machineNo)
    });
    const last = out[out.length - 1]; last.anomalies = detectAnomalies_(last);
  });
  out.sort((a, b) => a.timestamp < b.timestamp ? 1 : -1);
  return { ok: true, generatedAt: new Date().toISOString(), data: out, moduleHistory: buildModuleHistory_(out) };
}

/** Which module (机种) every machine ran and when it changed (periods of consecutive logs with the same module). */
function buildModuleHistory_(rows) {
  const by = {}, out = [], noMod = {}, asc = (a, b) => a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0;
  rows.forEach(r => {
    if (r.noMachine || !r.timestamp) return;
    if (!r.product) { (noMod[r.machineKey] = noMod[r.machineKey] || []).push(r); return; }
    (by[r.machineKey] = by[r.machineKey] || []).push(r);
  });
  Object.keys(by).forEach(k => {
    const list = by[k].sort(asc), periods = []; let cur = null;
    list.forEach(r => {
      if (!cur || norm_(cur.product) !== norm_(r.product)) {
        cur = { factory: r.factory, machineKey: k, machineRaw: r.machineRaw, machineNo: r.machineNo, brandEn: r.brandEn, brandCn: r.brandCn,
                modelNameEn: r.modelNameEn, modelNameCn: r.modelNameCn, model: r.model, product: r.product,
                from: r.timestamp, to: r.timestamp, events: 0, current: false, nextProduct: '', changedAt: '' };
        periods.push(cur);
      }
      cur.to = r.timestamp; cur.events++;
    });
    periods.forEach((p, i) => {
      if (i < periods.length - 1) { p.nextProduct = periods[i + 1].product; p.changedAt = periods[i + 1].from; } else p.current = true;
      out.push(p);
    });
  });
  Object.keys(noMod).forEach(k => {
    if (by[k]) return;
    const list = noMod[k].sort(asc), f = list[0];
    out.push({ factory: f.factory, machineKey: k, machineRaw: f.machineRaw, machineNo: f.machineNo, brandEn: f.brandEn, brandCn: f.brandCn,
               modelNameEn: f.modelNameEn, modelNameCn: f.modelNameCn, model: f.model, product: '',
               from: list[0].timestamp, to: list[list.length - 1].timestamp, events: list.length, current: true, nextProduct: '', changedAt: '' });
  });
  return out;
}

/** Skill Matrix web (old ?type=modules): { ok, generatedAt, items:[{webName, machines:[...]}], unmapped:[] }.  Not used by this page - copy this block to the Skill Matrix page. */
async function fetchModules() {
  const [skRows, pl] = await Promise.all([fetchAll_('pr_skill_map'), fetchPayload()]);
  const map = []; let web = '';
  skRows.map(rowOf_).forEach(m => {
    const w = String(fv_(m, 'web_name', 'webname') || '').trim(); if (w) web = w;               // merged WebName cell: carry down
    const raw = String(fv_(m, 'raw_machine_name', 'rawdata_name', 'raw_name') || '').trim();
    if (!web || !raw || /^[-–—]+$/.test(raw)) return;
    map.push({ web, factory: norm_(fv_(m, 'factory')), raw: norm_(raw), no: digits_(fv_(m, 'machine_number', 'machine_no')) });
  });
  const periods = pl.moduleHistory, order = [], byWeb = {};
  map.forEach(m => { if (!byWeb[m.web]) { byWeb[m.web] = { webName: m.web, machines: {} }; order.push(m.web); } });
  periods.forEach(p => map.forEach(m => {
    const pr = norm_(p.machineRaw);
    if (pr !== m.raw && pr.indexOf(m.raw + ' ') !== 0) return;
    if (m.factory && norm_(p.factory) !== m.factory) return;
    if (m.no && digits_(p.machineNo) !== m.no) return;
    const g = byWeb[m.web].machines;
    if (!g[p.machineKey]) g[p.machineKey] = { factory: p.factory, machine: p.machineRaw, machineNo: p.machineNo, current: null, periods: [], _seen: {} };
    const mc = g[p.machineKey], id = p.from + '|' + p.product;
    if (mc._seen[id]) return; mc._seen[id] = 1;
    mc.periods.push({ product: p.product, from: p.from, to: p.to });
    if (p.current) mc.current = { product: p.product, since: p.from };
  }));
  const unmapped = [], items = order.map(w => {
    const machines = Object.keys(byWeb[w].machines).map(k => {
      const mc = byWeb[w].machines[k]; delete mc._seen;
      mc.periods.sort((a, b) => a.from < b.from ? -1 : a.from > b.from ? 1 : 0); return mc;
    }).sort((a, b) => (a.factory + a.machineNo).localeCompare(b.factory + b.machineNo, undefined, { numeric: true }));
    if (!machines.length) unmapped.push(w);
    return { webName: w, machines };
  });
  return { ok: true, generatedAt: new Date().toISOString(), items, unmapped };
}
