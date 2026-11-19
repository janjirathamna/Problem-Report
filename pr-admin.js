/* pr-admin.js — load AFTER pr-core.js and BEFORE the main <script> of index.html */
(() => {
const ADMIN_PIN = '00000';                 // <-- แก้รหัสแอดมินตรงนี้ / change the admin PIN here
const MAX_MIN = 600, db = supabaseClient;
const $ = id => document.getElementById(id), V = () => $('prV'), B = () => $('prB');
const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const FIELDS = [['factory','Factory','sel'],['ts','Timestamp','dt'],['log_date','Date','date'],['shift','Shift'],['station','Station'],
  ['machine_raw','Machine'],['machine_no','Machine no.'],['product','Product'],['issue_type','Issue type'],['raw_issue','Issue # Solution','area'],
  ['repair_start','Repair start','dt'],['recovery_end','Recovery end','dt'],['repair_minutes','Repair min','num'],['qty','Qty','num'],
  ['fail_rate','Fail rate','num'],['leader','Leader'],['technician','Technician'],['extra','Extra'],['remark','Remark']];
const ALIAS = { factory:['factory','sheet'], ts:['timestamp','ts'], log_date:['log_date','date','日期'], shift:['shift','班别'], station:['station','站别'],
  machine_raw:['machine_raw','raw_machine_name','machine'], machine_no:['machine_no','machine_number'], product:['product','机种','機種'],
  issue_type:['issue_type','设备问题点'], raw_issue:['raw_issue','issue'], repair_start:['repair_start','维修时间'], recovery_end:['recovery_end','复机时间'],
  repair_minutes:['repair_minutes','维修总时间(min)','维修总时间'], qty:['qty','设备数量'], fail_rate:['fail_rate','设备故障率'],
  leader:['leader','领班确认'], technician:['technician','维修人员'], extra:['extra'], remark:['remark','备注'] };

/* ---------- styles + dialog ---------- */
document.head.insertAdjacentHTML('beforeend', `<style>
#prAdm{width:min(1100px,96vw);max-height:92vh;padding:0;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--text)}
#prAdm::backdrop{background:rgba(0,0,0,.6)}
#prAdm .ph{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid var(--line);font-weight:700}
#prAdm .pb{padding:12px 14px;overflow:auto;max-height:calc(92vh - 52px)}
#prAdm input,#prAdm select,#prAdm textarea{background:transparent;color:var(--text);border:1px solid var(--line);border-radius:4px;padding:5px 7px;font-size:13px;max-width:100%}
#prAdm table{width:100%;border-collapse:collapse;font-size:12px}#prAdm td,#prAdm th{border-bottom:1px solid var(--line);padding:4px 6px;text-align:left;vertical-align:top}
#prAdm .g{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px}#prAdm label{font-size:12px;display:block}
#prAdm .bad{color:#f87171;font-weight:600}#prAdm .row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:8px 0}
</style>`);
document.body.insertAdjacentHTML('beforeend', '<dialog id="prAdm"><div class="ph"><span>⚙ Data Admin</span><button class="btn" id="prX">✕</button></div><div class="pb" id="prB"></div></dialog>');
const dlg = $('prAdm');
$('prX').onclick = () => dlg.close();
const openBtn = $('btnAdmin');
if (openBtn) openBtn.onclick = () => { dlg.showModal(); sessionStorage.prAdm === '1' ? main('import') : lock(); };

/* ---------- PIN ---------- */
function lock() {
  B().innerHTML = '<div class="row"><input id="prPin" type="password" placeholder="Admin PIN / รหัสแอดมิน"><button class="btn primary" id="prGo">Unlock</button><span class="bad" id="prM"></span></div>';
  const go = () => { if ($('prPin').value === ADMIN_PIN) { sessionStorage.prAdm = '1'; main('import'); } else $('prM').textContent = 'รหัสไม่ถูกต้อง / Wrong PIN'; };
  $('prGo').onclick = go; $('prPin').onkeydown = e => { if (e.key === 'Enter') go(); }; $('prPin').focus();
}
function main(tab) {
  const T3 = [['import', '⇪ Import'], ['manage', '✎ Add / Edit / Delete'], ['tools', '🛠 Tools']];
  B().innerHTML = '<div class="row">' + T3.map(([k, l]) => `<button class="btn${k === tab ? ' primary' : ''}" data-t="${k}">${l}</button>`).join('') + '<span id="prMsg"></span></div><div id="prV"></div>';
  B().querySelectorAll('[data-t]').forEach(b => b.onclick = () => main(b.dataset.t));
  ({ import: vImport, manage: vManage, tools: vTools })[tab]();
}
const msg = s => { const m = $('prMsg'); if (m) m.textContent = s; };

/* ---------- parsing / normalising ---------- */
const T = v => { const s = String(v ?? '').trim(); return s || null; };
const N = v => { const n = numVal_(v); return n === '' ? null : n; };
const dstr = d => { d = new Date(Math.round(d.getTime() / 1000) * 1000); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`; };
const loc = v => v instanceof Date ? dstr(v) : (v === '' || v == null ? null : toLocal_(String(v)));   // -> 'yyyy-MM-ddTHH:mm:ss' (Bangkok) | null
const tsz = v => { const l = loc(v); return l ? l + '+07:00' : null; };
const sig = r => [r.factory, r.ts ? Date.parse(r.ts) : '', norm_(r.machine_raw), digits_(r.machine_no), norm_(r.raw_issue)].join('|');
const toObjs = a => { const rows = a.filter(r => r.some(c => String(c ?? '').trim() !== '')); if (rows.length < 2) return [];
  const h = rows[0].map(x => String(x).trim()); return rows.slice(1).map(r => Object.fromEntries(h.map((k, i) => [k, r[i] ?? '']))); };
function parseTable(txt) {                                       // CSV or tab-separated (copy from Excel / Sheets)
  txt = txt.replace(/^\uFEFF/, ''); const sep = (txt.split('\n')[0] || '').includes('\t') ? '\t' : ',', rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === '"') { if (txt[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"' && cell === '') q = true;
    else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; row.push(cell); cell = ''; rows.push(row); row = []; }
    else cell += c;
  }
  row.push(cell); rows.push(row); return toObjs(rows);
}
function norm(o, df) {                                           // any header names -> pr_logs row (null = blank row)
  const m = rowOf_(o), g = k => fv_(m, ...ALIAS[k]), r = {};
  r.factory = T(g('factory')) || df; r.ts = tsz(g('ts'));
  const ld = loc(g('log_date')) || (r.ts && loc(r.ts)); r.log_date = ld ? ld.slice(0, 10) : null;
  ['shift', 'station', 'machine_raw', 'machine_no', 'product', 'issue_type', 'raw_issue', 'leader', 'technician', 'extra', 'remark'].forEach(k => r[k] = T(g(k)));
  r.repair_start = tsz(g('repair_start')); r.recovery_end = tsz(g('recovery_end'));
  ['repair_minutes', 'qty', 'fail_rate'].forEach(k => r[k] = N(g(k)));
  if (!r.machine_raw && !r.raw_issue) return null;
  if (r.repair_minutes == null && r.ts && r.recovery_end) r.repair_minutes = Math.round((new Date(r.recovery_end) - new Date(r.ts)) / 60000);   // same rule as dashboard
  return r;
}
function flags(r) {                                              // abnormal-value rules
  if (isNA_(r.machine_raw) || DROP_ISSUE_RE.test(String(r.raw_issue || '').replace(/\s+/g, ' '))) return [];
  const f = [], m = r.repair_minutes, st = r.repair_start || r.ts;
  if (!r.recovery_end) f.push('ไม่มี recovery_end');
  if (m != null && m < 0) f.push('ติดลบ ' + m);
  if (m != null && m > MAX_MIN) f.push('เกิน ' + MAX_MIN + ' นาที: ' + m);
  if (r.recovery_end && st && new Date(r.recovery_end) < new Date(st)) f.push('เวลาจบก่อนเวลาเริ่ม');
  return f;
}

/* ---------- IMPORT (file / paste) ---------- */
function vImport() {
  V().innerHTML = `<div class="row"><input type="file" id="iF" accept=".xlsx,.xls,.csv"><span>Default factory:</span><select id="iDF">${FACTORIES.map(f => `<option>${E(f)}</option>`).join('')}</select></div>
  <textarea id="iT" rows="6" style="width:100%" placeholder="วางข้อมูลจาก Excel/Sheets (แถวแรก = หัวคอลัมน์) / paste table here, first row = headers"></textarea>
  <div class="row"><button class="btn primary" id="iP">Preview</button><span id="iM"></span></div><div id="iO"></div>`;
  $('iP').onclick = async () => {
    $('iM').textContent = '…';
    try {
      const file = $('iF').files[0], df = $('iDF').value; let groups;
      if (file && /\.csv$/i.test(file.name)) groups = [{ f: df, rows: parseTable(await file.text()) }];
      else if (file) { const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });   // sheet named like a factory = that factory
        groups = wb.SheetNames.map(n => ({ f: FACTORIES.includes(n) ? n : df, rows: toObjs(XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' })) })); }
      else groups = [{ f: df, rows: parseTable($('iT').value) }];
      const exist = new Set((await fetchAll_('pr_logs')).map(sig)), seen = new Set(), ok = []; let dup = 0, bad = 0;
      groups.forEach(g => g.rows.forEach(o => {
        const r = norm(o, g.f); if (!r) return;
        if (!FACTORIES.includes(r.factory) || (!r.ts && !r.log_date)) { bad++; return; }
        const s = sig(r); if (exist.has(s) || seen.has(s)) { dup++; return; }
        seen.add(s); r.row_key = 'web|' + s; r.source = 'web-import'; ok.push(r);
      }));
      $('iM').textContent = '';
      $('iO').innerHTML = `<p>✔ ${ok.length} new · ⏭ ${dup} duplicate · ✖ ${bad} invalid (factory/date) · ⚠ ${ok.filter(r => flags(r).length).length} abnormal</p>
        <table><tr><th>Factory</th><th>Time</th><th>Machine</th><th>Issue</th><th>Min</th><th></th></tr>${ok.slice(0, 10).map(r => `<tr><td>${E(r.factory)}</td><td>${E((loc(r.ts) || r.log_date || '').slice(0, 16))}</td><td>${E(r.machine_raw)} ${E(r.machine_no)}</td><td>${E((r.raw_issue || '').slice(0, 50))}</td><td>${r.repair_minutes ?? ''}</td><td>${flags(r).length ? '⚠' : ''}</td></tr>`).join('')}</table>
        ${ok.length > 10 ? `<p>… +${ok.length - 10}</p>` : ''}${ok.length ? '<div class="row"><button class="btn primary" id="iS">Save to pr_logs</button></div>' : ''}`;
      if (ok.length) $('iS').onclick = () => startSave(ok, 'insert', null, vImport);
    } catch (e) { $('iM').textContent = ''; $('iO').innerHTML = `<p class="bad">${E(e.message || e)}</p>`; }
  };
}

/* ---------- MANAGE (add / edit / delete) ---------- */
async function vManage() {
  V().innerHTML = '…'; let rows;
  try { rows = (await fetchAll_('pr_logs')).sort((a, b) => (a.ts || '') < (b.ts || '') ? 1 : -1); } catch (e) { V().innerHTML = `<p class="bad">${E(e.message)}</p>`; return; }
  V().innerHTML = `<div class="row"><button class="btn primary" id="mAdd">＋ Add</button><select id="mF"><option value="">All</option>${FACTORIES.map(f => `<option>${E(f)}</option>`).join('')}</select>
    <input id="mQ" placeholder="search id / machine / issue / technician"><label><input type="checkbox" id="mA"> ⚠ abnormal not confirmed</label></div><div id="mL"></div>`;
  const draw = () => {
    const f = $('mF').value, q = norm_($('mQ').value), ab = $('mA').checked;
    const list = rows.filter(r => (!f || r.factory === f) && (!q || norm_([r.id, r.machine_raw, r.machine_no, r.raw_issue, r.technician].join(' ')).includes(q)) && (!ab || (!r.confirmed && flags(r).length)));
    $('mL').innerHTML = `<p>${list.length} rows${list.length > 100 ? ' (showing 100)' : ''}</p><table><tr><th>ID</th><th>Factory</th><th>Time</th><th>Machine</th><th>Issue</th><th>Min</th><th></th><th></th></tr>` +
      list.slice(0, 100).map(r => { const fl = flags(r).length;
        return `<tr><td>${r.id}</td><td>${E(r.factory)}</td><td>${E((loc(r.ts) || '').slice(5, 16).replace('T', ' '))}</td><td>${E(r.machine_raw)} ${E(r.machine_no)}</td><td>${E((r.raw_issue || '').slice(0, 50))}</td>
        <td class="${fl && !r.confirmed ? 'bad' : ''}">${r.repair_minutes ?? ''}</td><td>${r.confirmed ? '✔' : fl ? '⚠' : ''}</td><td><button class="btn" data-e="${r.id}">✎</button> <button class="btn" data-d="${r.id}">🗑</button></td></tr>`; }).join('') + '</table>';
    $('mL').querySelectorAll('[data-e]').forEach(b => b.onclick = () => vForm(rows.find(x => String(x.id) === b.dataset.e)));
    $('mL').querySelectorAll('[data-d]').forEach(b => b.onclick = async () => {
      if (!confirm('ลบแถว ID ' + b.dataset.d + ' ? / Delete row?')) return;
      const { error } = await db.from('pr_logs').delete().eq('id', b.dataset.d);
      if (error) return alert(error.message);
      if (typeof load === 'function') load(); main('manage'); msg('✔ Deleted');
    });
  };
  ['mF', 'mQ', 'mA'].forEach(i => $(i).oninput = draw); $('mAdd').onclick = () => vForm(null); draw();
}
function vForm(r) {
  const v = k => { const x = r?.[k]; if (x == null) return ''; const t = FIELDS.find(f => f[0] === k)[2]; return t === 'dt' ? (loc(x) || '').slice(0, 16) : t === 'date' ? String(x).slice(0, 10) : x; };
  V().innerHTML = `<div class="g">${FIELDS.map(([k, l, t]) => `<label>${l}${t === 'sel' ? `<select id="f_${k}" style="width:100%">${FACTORIES.map(f => `<option${v(k) === f ? ' selected' : ''}>${E(f)}</option>`).join('')}</select>`
    : t === 'area' ? `<textarea id="f_${k}" rows="3" style="width:100%">${E(v(k))}</textarea>`
    : `<input id="f_${k}" style="width:100%" type="${{ dt: 'datetime-local', date: 'date', num: 'number' }[t] || 'text'}"${t === 'num' ? ' step="any"' : ''} value="${E(v(k))}">`}</label>`).join('')}</div>
    <div class="row"><button class="btn primary" id="fS">Save</button><button class="btn" id="fC">Cancel</button></div>`;
  $('fC').onclick = () => main('manage');
  $('fS').onclick = () => {
    const o = {}; FIELDS.forEach(([k, , t]) => { const x = $('f_' + k).value; o[k] = t === 'dt' ? (x ? x + ':00' : '') : x; });
    const n = norm(o, o.factory); if (!n) return alert('กรอก Machine หรือ Issue อย่างน้อย 1 อย่าง');
    if (!r) { n.source = 'web-add'; n.row_key = 'web|' + sig(n); }
    startSave([n], r ? 'update' : 'insert', r?.id, () => vForm(r ? { ...r, ...n } : n));
  };
}

/* ---------- SAVE + abnormal review ---------- */
function startSave(rows, mode, id, back) {
  const bad = rows.filter(r => flags(r).length);
  bad.length ? vReview(rows, bad, mode, id, back) : commit(rows, mode, id);
}
function vReview(rows, bad, mode, id, back) {
  const dt = (i, k, r) => `<input type="datetime-local" data-i="${i}" data-k="${k}" value="${E((loc(r[k]) || '').slice(0, 16))}">`;
  V().innerHTML = `<h3 class="bad" style="font-size:16px">⚠ ${bad.length} รายการผิดปกติ / abnormal rows</h3>
    <p>แก้ค่าในตารางแล้วบันทึก หรือ "ยืนยันเก็บไว้" โดยต้องใส่โน้ตเหตุผล / fix the values, or keep them with a reason (remark).</p>
    <table><tr><th>Row</th><th>Problem</th><th>Repair start</th><th>Recovery end</th><th>Minutes</th><th>Reason / remark *</th></tr>${bad.map((r, i) =>
    `<tr><td>${E(r.factory)}<br>${E(r.machine_raw || '')} ${E(r.machine_no || '')}<br>${E((loc(r.ts) || '').slice(0, 16).replace('T', ' '))}</td><td class="bad">${flags(r).map(E).join('<br>')}</td>
    <td>${dt(i, 'repair_start', r)}</td><td>${dt(i, 'recovery_end', r)}</td>
    <td><input type="number" step="any" style="width:80px" data-i="${i}" data-k="repair_minutes" value="${r.repair_minutes ?? ''}"></td>
    <td><input style="width:100%;min-width:200px" data-i="${i}" data-k="note" placeholder="เหตุผล / reason"></td></tr>`).join('')}</table>
    <div class="row"><button class="btn" id="rB">← กลับไปแก้ไข / Back to edit</button><button class="btn primary" id="rOk">✔ ยืนยันเก็บไว้ & บันทึก / Keep & save</button></div>`;
  $('rB').onclick = back;
  $('rOk').onclick = () => {
    const note = {};
    V().querySelectorAll('[data-i]').forEach(x => { const r = bad[x.dataset.i], k = x.dataset.k, v = x.value.trim();
      if (k === 'note') note[x.dataset.i] = v;
      else if (k === 'repair_minutes') r[k] = v === '' ? null : Number(v);
      else r[k] = v ? tsz(v + ':00') : null; });
    const still = bad.filter(r => flags(r).length);
    if (still.some(r => !note[bad.indexOf(r)])) return alert('กรุณากรอกโน้ตเหตุผลให้ครบทุกแถวที่ยังผิดปกติ / A reason is required for every abnormal row');
    bad.forEach((r, i) => { r.confirmed = flags(r).length > 0; if (note[i]) r.remark = [r.remark, note[i]].filter(Boolean).join(' | '); });
    commit(rows, mode, id);
  };
}
async function commit(rows, mode, id) {
  V().innerHTML = '⏳ Saving…';
  try {
    rows.forEach(r => r.confirmed = !!r.confirmed);
    if (mode === 'update') { const { error } = await db.from('pr_logs').update(rows[0]).eq('id', id); if (error) throw error; }
    else for (let i = 0; i < rows.length; i += 500) { const { error } = await db.from('pr_logs').insert(rows.slice(i, i + 500)); if (error) throw error; }
    if (typeof load === 'function') load();                      // refresh the dashboard
    main('manage'); msg('✔ Saved ' + rows.length + ' row(s)');
  } catch (e) { alert('Error: ' + (e.message || e)); main('manage'); }
}

/* ---------- TOOLS (old admin.html buttons) ---------- */
function vTools() {
  V().innerHTML = `<div class="row">${[['pr_add_new_issues', 'pr_issue_mapping', 'Add new issues to IssueMapping'], ['pr_add_new_machines', 'pr_machine_mapping', 'Add new machines to MachineMapping'], ['pr_add_skill_names', 'pr_skill_map', 'Create SkillWeb names']]
    .map(([f, t, l]) => `<button class="btn" data-r="${f}|${t}">${l}</button>`).join('')}<button class="btn" id="tC">Check unmatched + module data</button></div><pre id="tO" style="white-space:pre-wrap;font-size:12px"></pre>`;
  V().querySelectorAll('[data-r]').forEach(b => b.onclick = async () => {
    const [f, t] = b.dataset.r.split('|'); $('tO').textContent = '…';
    const { data, error } = await db.rpc(f);
    $('tO').textContent = error ? error.message : (data ? data + ' new row(s) added to ' + t + ' – fill in the Chinese columns you need.' : 'Nothing new – already in ' + t + '.');
  });
  $('tC').onclick = async () => {
    const o = $('tO'); o.textContent = '…';
    try {
      const rows = (await fetchPayload()).data.filter(r => !r.noMachine), out = [], un = {};
      rows.filter(r => !r.brandEn).forEach(r => un[r.machineRaw] = (un[r.machineRaw] || 0) + 1);
      out.push(Object.keys(un).length ? 'No keyword row for:\n' + Object.keys(un).map(k => k + '  (' + un[k] + ' rows)').join('\n') : 'All machine names matched.');
      FACTORIES.forEach(f => {
        const mine = rows.filter(r => r.factory === f), keys = {}, withMod = {}, missing = [];
        mine.forEach(r => { keys[r.machineKey] = r; if (r.product) withMod[r.machineKey] = 1; });
        Object.keys(keys).forEach(k => { if (!withMod[k] && missing.length < 6) missing.push(keys[k].machineRaw + (keys[k].machineNo ? ' ' + keys[k].machineNo : '')); });
        out.push(f + ': log rows ' + mine.length + ' | machines ' + Object.keys(keys).length + ' | machines with a module ' + Object.keys(withMod).length +
          ' | rows with a module ' + mine.filter(r => r.product).length + (missing.length ? '\n   no module yet: ' + missing.join(', ') : ''));
      });
      o.textContent = out.join('\n\n');
    } catch (e) { o.textContent = String(e.message || e); }
  };
}
})();
