/* ===== pr-admin.js v2 — Add / Edit / Delete / Confirm (admin PIN) -> Supabase RPC (pr_logs) + Google Sheet (GAS doPost) ===== */
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxNht563H7COeUnwfF4NUImMsv3bFGoIpiHsE4h1tTrPFemxnskTOBsCw02zQ-ts7G8/exec';                      // <-- paste the GAS Web app /exec URL here ('' = Supabase only, no sheet sync)
const PRA = (() => {
  const PIN_KEY = 'pra_pin', TZO = '+07:00', q = id => document.getElementById(id);
  const TXT = {
    en: { add: 'Add data', edit: 'Edit data', del: 'Delete', confirm: 'Confirm (value is correct)', unconfirm: 'Remove confirmation', save: 'Save', saveNew: 'Save & add next', cancel: 'Cancel',
      pinTitle: 'Admin PIN', pinHint: 'Enter the admin PIN (asked once per browser session).', ok: 'OK', badPin: 'Wrong PIN', addNew: 'New value', saving: 'Saving…', saved: 'Saved',
      sheetFail: 'Saved in Supabase, but the Google Sheet was NOT updated: ', delAsk: 'Delete this record? (also removed from the Google Sheet)', deleted: 'Deleted', confirmed: 'Confirmed',
      need: 'Required: factory, date/time and machine or issue', badFactory: 'Factory must be one of: ', secWhen: 'When / where', secMachine: 'Machine', secIssue: 'Issue & solution', secRepair: 'Repair',
      secPeople: 'People', factory: 'Factory', time: 'Reported time 报修时间', shift: 'Shift 班别', station: 'Station 站别', machine: 'Machine name', machineNo: 'Machine no.', product: 'Model 机种',
      issueType: 'Issue point 设备问题点', issue: 'Issue', solution: 'Solution', repairStart: 'Repair start 维修时间', recoveryEnd: 'Recovery 复机时间', minutes: 'Repair minutes 维修总时间(min)',
      qty: 'Qty 设备数量', failRate: 'Fail rate 设备故障率 (auto)', leader: 'Leader 领班确认', technician: 'Technician 维修人员', remark: 'Remark 备注', fixed: 'Fixed' },
    zh: { add: '新增数据', edit: '修改数据', del: '删除', confirm: '确认（数值无误）', unconfirm: '取消确认', save: '保存', saveNew: '保存并继续新增', cancel: '取消', pinTitle: '管理员 PIN', pinHint: '请输入管理员 PIN（每次浏览只需一次）。',
      ok: '确定', badPin: 'PIN 错误', addNew: '新值', saving: '保存中…', saved: '已保存', sheetFail: '已保存到 Supabase，但 Google 表格未更新：', delAsk: '删除此记录？（同时从 Google 表格删除）', deleted: '已删除',
      confirmed: '已确认', need: '必填：工厂、日期时间、设备或问题', badFactory: '工厂必须是：', secWhen: '时间 / 地点', secMachine: '设备', secIssue: '问题与解决方法', secRepair: '维修', secPeople: '人员',
      factory: '工厂', time: '报修时间', shift: '班别', station: '站别', machine: '设备名称', machineNo: '设备编号', product: '机种', issueType: '设备问题点', issue: '问题', solution: '解决方法',
      repairStart: '维修时间', recoveryEnd: '复机时间', minutes: '维修总时间(min)', qty: '设备数量', failRate: '设备故障率（自动）', leader: '领班确认', technician: '维修人员', remark: '备注', fixed: '已修正' },
    th: { add: 'เพิ่มข้อมูล', edit: 'แก้ไขข้อมูล', del: 'ลบ', confirm: 'ยืนยัน (ค่าถูกต้อง)', unconfirm: 'ยกเลิกการยืนยัน', save: 'บันทึก', saveNew: 'บันทึกแล้วเพิ่มรายการถัดไป', cancel: 'ยกเลิก', pinTitle: 'PIN แอดมิน',
      pinHint: 'ใส่ PIN แอดมิน (ถามครั้งเดียวต่อการเปิดเบราว์เซอร์)', ok: 'ตกลง', badPin: 'PIN ไม่ถูกต้อง', addNew: 'ค่าใหม่', saving: 'กำลังบันทึก…', saved: 'บันทึกแล้ว',
      sheetFail: 'บันทึกใน Supabase แล้ว แต่ Google Sheet ยังไม่ถูกอัปเดต: ', delAsk: 'ลบรายการนี้? (จะลบออกจาก Google Sheet ด้วย)', deleted: 'ลบแล้ว', confirmed: 'ยืนยันแล้ว',
      need: 'ต้องกรอก: โรงงาน วันเวลา และเครื่องหรือปัญหา', badFactory: 'โรงงานต้องเป็นหนึ่งใน: ', secWhen: 'เมื่อไร / ที่ไหน', secMachine: 'เครื่อง', secIssue: 'ปัญหาและวิธีแก้', secRepair: 'การซ่อม',
      secPeople: 'บุคลากร', factory: 'โรงงาน', time: 'เวลาแจ้งซ่อม 报修时间', shift: 'กะ 班别', station: 'กระบวนการ 站别', machine: 'ชื่อเครื่อง', machineNo: 'หมายเลขเครื่อง', product: 'โมดูล 机种',
      issueType: 'จุดปัญหา 设备问题点', issue: 'ปัญหา', solution: 'วิธีแก้', repairStart: 'เวลาซ่อม 维修时间', recoveryEnd: 'เวลาพักฟื้น 复机时间', minutes: 'เวลาซ่อม(นาที) 维修总时间',
      qty: 'จำนวนเครื่อง 设备数量', failRate: 'อัตราล้มเหลว 设备故障率 (อัตโนมัติ)', leader: 'หัวหน้างาน 领班确认', technician: 'ช่างเทคนิค 维修人员', remark: 'หมายเหตุ 备注', fixed: 'แก้ไขแล้ว' }
  };
  const T = k => ((TXT[lang] || TXT.en)[k]) || TXT.en[k] || k;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const all = () => DATA.concat(NOMACH);
  const nowLocal = () => tzFmt.format(new Date()).replace(' ', 'T').slice(0, 16);
  const ms = s => Date.parse(s.slice(0, 16) + ':00' + TZO);
  const nk = s => String(s || '').trim().toLowerCase();

  /* ---------- style ---------- */
  const st = document.createElement('style');
  st.textContent = `#praDlg{width:min(760px,96vw);max-height:94vh;padding:0;border:1px solid var(--line);border-radius:10px;background:var(--panel);color:var(--text)}
  #praDlg::backdrop,#praPin::backdrop{background:rgba(0,0,0,.55)} #praPin{border:1px solid var(--line);border-radius:10px;background:var(--panel);color:var(--text);padding:16px}
  .pra-head{padding:12px 16px;font-weight:700;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center}
  .pra-body{padding:12px 16px;overflow:auto;max-height:calc(94vh - 120px)} .pra-sec{font-size:11px;font-weight:700;color:var(--accent);margin:12px 0 6px;text-transform:uppercase;letter-spacing:.04em}
  .pra-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px} .pra-grid .wide{grid-column:1/-1}
  .pra-f label{display:block;font-size:11px;color:var(--muted);margin-bottom:2px;position:static}
  .pra-f input,.pra-f textarea,.pra-f select{width:100%;font-size:13px;padding:7px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel2);color:var(--text);color-scheme:inherit;min-width:0}
  .pra-f{position:relative} .pra-f input[readonly]{opacity:.7}
  .pra-dd{display:none;position:absolute;left:0;right:0;top:100%;z-index:60;max-height:210px;overflow:auto;background:var(--panel);border:1px solid var(--accent);border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,.35)}
  .pra-dd div{padding:6px 9px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--line)} .pra-dd div:hover{background:var(--panel2)} .pra-dd .new{color:var(--accent);font-weight:600}
  .pra-foot{padding:10px 16px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
  .pra-menu{position:fixed;z-index:100;min-width:190px;background:var(--panel);border:1px solid var(--line);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.4);overflow:hidden}
  .pra-menu button{display:block;width:100%;text-align:left;padding:9px 12px;font-size:13px;color:var(--text);background:none;border:0;border-bottom:1px solid var(--line);cursor:pointer}
  .pra-menu button:hover{background:var(--panel2)} .pra-menu .danger{color:#ef4444}
  .pra-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:200;padding:9px 14px;border-radius:8px;background:var(--accent);color:var(--accent-ink);font-weight:600;max-width:92vw}
  .pra-toast.err{background:#d93025;color:#fff}
  .kebab{padding:3px 8px !important;font-size:15px !important;line-height:1 !important}`;
  document.head.appendChild(st);

  const toast = (msg, err) => { const d = document.createElement('div'); d.className = 'pra-toast' + (err ? ' err' : ''); d.textContent = msg; document.body.appendChild(d); setTimeout(() => d.remove(), err ? 7000 : 2400); };

  /* ---------- PIN + RPC ---------- */
  function askPin() {
    return new Promise(res => {
      const d = document.createElement('dialog'); d.id = 'praPin';
      d.innerHTML = `<div style="font-weight:700;margin-bottom:4px">${T('pinTitle')}</div><div class="lbl" style="margin-bottom:8px">${T('pinHint')}</div>
        <input type="password" inputmode="numeric" autocomplete="off" style="width:100%;font-size:16px;padding:8px;border:1px solid var(--line);border-radius:6px;background:var(--panel2);color:var(--text)">
        <div class="flex justify-end gap-2" style="margin-top:10px"><button class="btn" data-x="0">${T('cancel')}</button><button class="btn primary" data-x="1">${T('ok')}</button></div>`;
      document.body.appendChild(d); const inp = d.querySelector('input'); let done = false;
      const fin = v => { if (done) return; done = true; d.close(); d.remove(); res(v); };
      d.querySelector('[data-x="1"]').onclick = () => fin(inp.value.trim() || null); d.querySelector('[data-x="0"]').onclick = () => fin(null);
      inp.onkeydown = e => { if (e.key === 'Enter') fin(inp.value.trim() || null); }; d.addEventListener('cancel', () => fin(null));
      d.showModal(); inp.focus();
    });
  }
  async function rpc(fn, args) {
    const { data, error } = await supabaseClient.rpc(fn, args);
    if (error) { if (/bad pin/i.test(error.message)) { sessionStorage.removeItem(PIN_KEY); throw new Error(T('badPin')); } throw new Error(error.message); }
    return data;
  }
  async function ensurePin() {
    let p = sessionStorage.getItem(PIN_KEY); if (p) return p;
    p = await askPin(); if (!p) return null;
    try { await rpc('pr_check_pin', { p_pin: p }); } catch (e) { toast(e.message, true); return null; }
    sessionStorage.setItem(PIN_KEY, p); return p;
  }
  async function gas(body) {
    const r = await fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow' });
    const j = await r.json(); if (!j.ok) throw new Error(j.error || 'GAS error'); return j;
  }

  /* ---------- row <-> form values ---------- */
  const prevOf = r => ({ timestamp: r.timestamp, machine: r.machineRaw, machineNo: r.machineNo, rowNo: r.rowNo });
  const iso16 = s => (/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(s || '') ? s.slice(0, 16) : '');
  function toForm(r) {
    return { factory: r.factory, timestamp: iso16(r.timestamp), shift: r.shift, station: r.station, machine: r.noMachine ? '' : r.machineRaw, machineNo: r.machineNo, product: r.product, issueType: r.issueType,
      issue: r.issueRaw, solution: r.solutionRaw, repairStart: iso16(r.repairStart), recoveryEnd: iso16(r.recoveryEnd), minutes: r.repairMinutes === '' ? '' : String(r.repairMinutes),
      qty: r.qty === '' ? '' : String(r.qty), leader: r.leader, technician: r.technician, remark: r.remark };
  }
  const autoMin = v => (v.timestamp && v.recoveryEnd) ? String(Math.round((ms(v.recoveryEnd) - ms(v.timestamp)) / 60000)) : '';
  async function commit(v, editing, again) {                       // validate -> Supabase RPC -> GAS
    if (!v.factory || !v.timestamp || !(v.machine || v.issue)) { toast(T('need'), true); return false; }
    if (!FACTORIES.includes(v.factory)) { toast(T('badFactory') + FACTORIES.join(', '), true); return false; }
    const pin = await ensurePin(); if (!pin) return false;
    const iso = s => s ? s.slice(0, 16) + ':00' + TZO : null, loc = s => s ? s.slice(0, 16) + ':00' : '';
    const fr = calcFailRate_(v.minutes, v.qty), num = s => (s === '' || s == null) ? null : Number(s);
    const row = { id: editing ? Number(editing.pk) : null, factory: v.factory, timestamp: iso(v.timestamp), log_date: v.timestamp.slice(0, 10), raw_machine_name: v.machine || 'N/A', machine_number: v.machineNo || '',
      raw_issue: v.solution ? `${v.issue} # ${v.solution}` : v.issue, shift: v.shift, station: v.station, product: v.product, issue_type: v.issueType, repair_start: iso(v.repairStart), recovery_end: iso(v.recoveryEnd),
      repair_minutes: num(v.minutes), qty: num(v.qty), leader: v.leader, technician: v.technician, remark: v.remark };
    toast(T('saving'));
    let saved; try { saved = await rpc('pr_save_log', { p_pin: pin, p_row: row }); } catch (e) { toast(e.message, true); return false; }
    if (GAS_URL) {
      try {
        await gas({ action: 'upsert', pin, pk: saved.id, factory: v.factory, prev: editing ? prevOf(editing) : null,
          row: { timestamp: loc(v.timestamp), date: v.timestamp.slice(0, 10), shift: v.shift, station: v.station, machine: v.machine || 'N/A', machineNo: v.machineNo, product: v.product, issueType: v.issueType,
                 issue: row.raw_issue, repairStart: loc(v.repairStart), recoveryEnd: loc(v.recoveryEnd), repairMinutes: v.minutes, qty: v.qty, failRate: fr, leader: v.leader, technician: v.technician, remark: v.remark } });
      } catch (e) { rpc('pr_set_sync', { p_pin: pin, p_id: saved.id, p_ok: false, p_err: e.message }).catch(() => {}); toast(T('sheetFail') + e.message, true); }
    }
    toast(T('saved')); await load(); return true;
  }

  /* ---------- combo box (pick from existing, or type a new value) ---------- */
  function combo(inp, getList) {
    const box = document.createElement('div'); box.className = 'pra-dd'; inp.parentNode.appendChild(box);
    const show = () => {
      const list = getList(), k = nk(inp.value), hit = list.filter(x => !k || nk(x).includes(k)).slice(0, 80), exact = list.some(x => nk(x) === k);
      box.innerHTML = hit.map(x => `<div data-v="${E(x)}">${E(x)}</div>`).join('') + (k && !exact ? `<div class="new" data-v="${E(inp.value.trim())}">＋ ${T('addNew')}: ${E(inp.value.trim())}</div>` : '');
      box.style.display = box.innerHTML ? 'block' : 'none';
    };
    inp.addEventListener('focus', show); inp.addEventListener('input', show);
    inp.addEventListener('blur', () => setTimeout(() => (box.style.display = 'none'), 120));
    box.addEventListener('mousedown', e => { const d = e.target.closest('[data-v]'); if (!d) return; e.preventDefault(); inp.value = d.dataset.v; box.style.display = 'none'; inp.dispatchEvent(new Event('change', { bubbles: true })); });
  }
  const uniq = (key, filter) => { const c = new Map(); all().forEach(r => { if (filter && !filter(r)) return; const v = String(r[key] ?? '').trim(); if (v) c.set(v, (c.get(v) || 0) + 1); }); return [...c.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]); };

  /* ---------- form ---------- */
  function open(row) {
    const old = q('praDlg'); if (old) old.remove();
    const editing = row || null, d = document.createElement('dialog'); d.id = 'praDlg';
    const f = (id, type, wide, key = id) => {
      const lab = `<label for="pra_${key}">${T(id)}</label>`;
      const ctl = type === 'area' ? `<textarea id="pra_${key}" rows="2" autocomplete="off"></textarea>` : `<input id="pra_${key}" ${type === 'dt' ? 'type="datetime-local"' : type === 'num' ? 'type="number" step="any" inputmode="decimal"' : 'type="text"'} autocomplete="off" ${id === 'failRate' ? 'readonly' : ''}>`;
      return `<div class="pra-f${wide ? ' wide' : ''}">${lab}${ctl}</div>`;
    };
    d.innerHTML = `<div class="pra-head"><span>${editing ? T('edit') : T('add')}</span><button class="btn" id="pra_x">✕</button></div><div class="pra-body">
      <div class="pra-sec">${T('secWhen')}</div><div class="pra-grid">${f('factory', 'text')}${f('time', 'dt', 0, 'timestamp')}${f('shift', 'text')}${f('station', 'text')}</div>
      <div class="pra-sec">${T('secMachine')}</div><div class="pra-grid">${f('machine', 'text')}${f('machineNo', 'text')}${f('product', 'text')}${f('issueType', 'text')}</div>
      <div class="pra-sec">${T('secIssue')}</div><div class="pra-grid">${f('issue', 'area', 1)}${f('solution', 'area', 1)}</div>
      <div class="pra-sec">${T('secRepair')}</div><div class="pra-grid">${f('repairStart', 'dt')}${f('recoveryEnd', 'dt')}${f('minutes', 'num')}${f('qty', 'num')}${f('failRate', 'text')}</div>
      <div class="pra-sec">${T('secPeople')}</div><div class="pra-grid">${f('leader', 'text')}${f('technician', 'text')}${f('remark', 'area', 1)}</div></div>
      <div class="pra-foot"><button class="btn" id="pra_cancel">${T('cancel')}</button>${editing ? '' : `<button class="btn" id="pra_saveNew">${T('saveNew')}</button>`}<button class="btn primary" id="pra_save">${T('save')}</button></div>`;
    document.body.appendChild(d);
    const I = {}; ['factory', 'timestamp', 'shift', 'station', 'machine', 'machineNo', 'product', 'issueType', 'issue', 'solution', 'repairStart', 'recoveryEnd', 'minutes', 'qty', 'failRate', 'leader', 'technician', 'remark'].forEach(k => (I[k] = q('pra_' + k)));
    const get = () => { const v = {}; Object.keys(I).forEach(k => (v[k] = (I[k].value || '').trim())); return v; };
    const set = v => Object.keys(v).forEach(k => { if (I[k]) I[k].value = v[k] ?? ''; });
    let manual = false;
    const recalc = () => { if (!manual) I.minutes.value = autoMin(get()); const fr = calcFailRate_(I.minutes.value, I.qty.value); I.failRate.value = fr === '' ? '' : (fr * 100).toFixed(2) + ' %'; };
    const fac = () => I.factory.value.trim(), mach = () => all().filter(r => (!fac() || r.factory === fac()) && nk(r.machineRaw) === nk(I.machine.value));
    combo(I.factory, () => FACTORIES); combo(I.shift, () => uniq('shift')); combo(I.station, () => uniq('station')); combo(I.product, () => uniq('product')); combo(I.issueType, () => uniq('issueType'));
    combo(I.machine, () => uniq('machineRaw', r => !r.noMachine && (!fac() || r.factory === fac()))); combo(I.machineNo, () => [...new Set(mach().map(r => r.machineNo).filter(Boolean))]);
    combo(I.issue, () => uniq('issueRaw')); combo(I.leader, () => uniq('leader')); combo(I.technician, () => uniq('technician'));
    combo(I.solution, () => { const own = new Set(all().filter(r => nk(r.issueRaw) === nk(I.issue.value) && r.solutionRaw).map(r => r.solutionRaw)); return [...own, ...uniq('solutionRaw').filter(x => !own.has(x))]; });
    I.machine.addEventListener('change', () => { const m = mach().sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))[0]; if (m && !I.product.value) I.product.value = m.product || ''; if (m && !I.machineNo.value) I.machineNo.value = m.machineNo || ''; });
    I.issue.addEventListener('change', () => { const m = all().filter(r => nk(r.issueRaw) === nk(I.issue.value) && r.solutionRaw).sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))[0]; if (m && !I.solution.value) I.solution.value = m.solutionRaw; });
    ['timestamp', 'recoveryEnd', 'qty'].forEach(k => I[k].addEventListener('input', recalc)); I.minutes.addEventListener('input', () => { manual = I.minutes.value !== ''; recalc(); });
    if (editing) { const v = toForm(editing); set(v); manual = v.minutes !== ''; } else { I.timestamp.value = nowLocal(); I.factory.value = q('fFactory') && q('fFactory').value || ''; }
    recalc();
    const close = () => { d.close(); d.remove(); };
    q('pra_x').onclick = q('pra_cancel').onclick = close;
    q('pra_save').onclick = async () => { if (await commit(get(), editing)) close(); };
    if (!editing) q('pra_saveNew').onclick = async () => {
      const v = get(); if (await commit(v, null)) { ['machine', 'machineNo', 'product', 'issueType', 'issue', 'solution', 'repairStart', 'recoveryEnd', 'minutes', 'qty', 'remark', 'failRate'].forEach(k => (I[k].value = '')); manual = false; I.timestamp.value = nowLocal(); recalc(); I.machine.focus(); }
    };
    d.showModal();
  }

  /* ---------- delete / confirm / quick fix / row menu ---------- */
  async function del(r) {
    if (!confirm(T('delAsk') + '\n\n' + r.factory + ' · ' + (r.timestamp || '').replace('T', ' ').slice(0, 16) + ' · ' + r.machineEn)) return;
    const pin = await ensurePin(); if (!pin) return;
    try { await rpc('pr_delete_log', { p_pin: pin, p_id: Number(r.pk) }); } catch (e) { toast(e.message, true); return; }
    if (GAS_URL) { try { await gas({ action: 'delete', pin, pk: r.pk, factory: r.factory, prev: prevOf(r) }); } catch (e) { toast(T('sheetFail') + e.message, true); await load(); return; } }
    toast(T('deleted')); await load();
  }
  async function confirmRow(r, val) {
    const pin = await ensurePin(); if (!pin) return;
    try { await rpc('pr_confirm_log', { p_pin: pin, p_id: Number(r.pk), p_val: val !== false }); } catch (e) { toast(e.message, true); return; }
    toast(T('confirmed')); await load();
  }
  async function applyFix(r, a) {                                  // anomalies tab: apply the suggested corrected date / time
    const v = toForm(r); if (a.fix && ['timestamp', 'repairStart', 'recoveryEnd'].includes(a.f)) v[a.f] = a.fix.slice(0, 16);
    if (v.timestamp && v.recoveryEnd) v.minutes = autoMin(v);
    if (await commit(v, r)) toast(T('fixed'));
  }
  function menu(btn, r) {
    document.querySelectorAll('.pra-menu').forEach(m => m.remove());
    const m = document.createElement('div'); m.className = 'pra-menu';
    m.innerHTML = `<button data-a="edit">✎ ${T('edit')}</button>${r.anomalies && r.anomalies.length ? `<button data-a="cf">✓ ${r.confirmed ? T('unconfirm') : T('confirm')}</button>` : ''}<button data-a="del" class="danger">🗑 ${T('del')}</button>`;
    document.body.appendChild(m); const b = btn.getBoundingClientRect();
    m.style.top = Math.min(b.bottom + 4, window.innerHeight - m.offsetHeight - 8) + 'px'; m.style.left = Math.max(8, Math.min(b.right - m.offsetWidth, window.innerWidth - m.offsetWidth - 8)) + 'px';
    m.onclick = e => { const a = e.target.closest('[data-a]'); if (!a) return; m.remove(); if (a.dataset.a === 'edit') open(r); else if (a.dataset.a === 'del') del(r); else confirmRow(r, !r.confirmed); };
    setTimeout(() => document.addEventListener('click', function h(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('click', h); } }), 0);
  }
  if (q('btnAdmin')) q('btnAdmin').onclick = () => open();
  return { open, menu, del, confirm: confirmRow, applyFix };
})();
