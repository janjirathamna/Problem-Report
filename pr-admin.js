/* ===== pr-admin.js v2 — Add / Edit / Delete / Confirm (admin PIN) -> Supabase RPC (pr_logs) + Google Sheet (GAS doPost) ===== */
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxNht563H7COeUnwfF4NUImMsv3bFGoIpiHsE4h1tTrPFemxnskTOBsCw02zQ-ts7G8/exec';                      // <-- paste the GAS Web app /exec URL here ('' = Supabase only, no sheet sync)
const PRA = (() => {
  const PIN_KEY = 'pra_pin', TZO = '+07:00', q = id => document.getElementById(id);
  const TXT = {
    en: { add: 'Add data', edit: 'Edit data', del: 'Delete', confirm: 'Confirm (value is correct)', unconfirm: 'Remove confirmation', save: 'Save', saveNew: 'Save & add next', cancel: 'Cancel',
      pinTitle: 'Admin PIN', pinHint: 'Enter the admin PIN (asked once per browser session).', ok: 'OK', badPin: 'Wrong PIN', addNew: 'New value', saving: 'Saving…', saved: 'Saved',
      sheetFail: 'Saved in Supabase, but the Google Sheet was NOT updated: ', delAsk: 'Delete this record? (removed from the web; kept in the Google Sheet with a red note)', deleted: 'Deleted', confirmed: 'Confirmed',
      need: 'Required: factory, date/time and machine or issue', badFactory: 'Factory must be one of: ', secWhen: 'When / where', secMachine: 'Machine', secIssue: 'Issue & solution', secRepair: 'Repair',
      secPeople: 'People', factory: 'Factory', time: 'Reported time 报修时间', shift: 'Shift 班别', station: 'Station 站别', machine: 'Machine name', machineNo: 'Machine no.', product: 'Model 机种',
      issueType: 'Issue point 设备问题点', issue: 'Issue', solution: 'Solution', repairStart: 'Repair start 维修时间', recoveryEnd: 'Recovery 复机时间', minutes: 'Repair minutes 维修总时间(min)',
      qty: 'Qty 设备数量', failRate: 'Fail rate 设备故障率 (auto)', leader: 'Leader 领班确认', technician: 'Technician 维修人员', remark: 'Remark 备注', fixed: 'Fixed', negMin: 'Recovery time is before the reported time (minutes would be negative) – check the dates / times',
      viaForm: 'Fill in a form', viaFile: 'Import a file (.xlsx / .csv)', impTitle: 'Import data from file', impPick: 'File (.xlsx, .xls, .csv)', impSheet: 'Sheet', impHdr: 'Header row no.', impDateOrder: 'Order of text dates',
      impDefFactory: 'Factory (if not in file)', impMap: 'Match file columns to fields', impMapHint: 'Guessed from the column names – change anything that is wrong.', impNone: '— not in file —', impSkipDup: 'Check duplicates (identical → overwrite, 1 column differs → review first)',
      impPreview: 'Preview', impReady: 'ready to import', impDup: 'duplicates skipped', impErr: 'with errors', impBadDate: 'Date/time not recognised', impStart: 'Import', impBusy: 'Importing', impDone: 'Imported', impFailed: 'failed',
      impRow: 'Row', dupSame: 'Identical record found – the old one was overwritten', dupTitle: 'Possible duplicate – please review', dupHint: 'Same as an existing record except for 1 column. The old record may already have been checked or edited, so choose for each row.', dupDiff: 'Differs in', dupOld: 'Existing', dupNew: 'New', dupEmpty: '(empty)', dupOverwrite: 'Overwrite old', dupKeep: 'Keep old (skip)', dupAddNew: 'Add as new', dupAll: 'All:', dupKept: 'Kept the existing record – nothing saved', dupConfirm: 'Confirm', impNewN: 'new', impSame: 'identical (overwrite)', impReview: 'to review', impInFile: 'repeated in file (skipped)', impOver: 'overwritten', impKept: 'kept old', delAskN: 'Delete {n} records? They are removed from the web but stay in the Google Sheet with a red note.', delType: 'To confirm, type the number of records to delete: {n}', delCancel: 'Delete cancelled', deleting: 'Deleting…', delSheetFail: 'Deleted on the web, but the Google Sheet note was NOT added: ', delNote: 'หน้าเว็บลบข้อมูลนี้แล้ว', delNoRow: 'row not found in the Google Sheet: ', impAutoTag: 'auto', impEditTag: 'edited', impMissing: 'Not matched yet: ', impSolMode: 'Issue & solution in the file', impSolSep: 'Separate columns', impSolComb: 'Both in one cell', impSplitBy: 'Split at', impSepAuto: 'Auto', impNl: 'New line', impCombHint: 'Text before the first separator = issue, the rest = solution.', impSwapped: 'Swapped with: ', impSolSame: '= same column as Issue', impBadFile: 'Cannot read this file', fDate: 'Date 日期 (if separate from time)', viaPaste: 'Paste (copy a table)', impPaste: 'Paste the table here (copy from Excel / Google Sheets, include the header row)', clear: 'Clear', pasteHint: 'Copy cells in Excel or Google Sheets and paste here (Ctrl+V).', tabHint: 'Add data by: filling a form, pasting a table, or attaching a file.' },
    zh: { add: '新增数据', edit: '修改数据', del: '删除', confirm: '确认（数值无误）', unconfirm: '取消确认', save: '保存', saveNew: '保存并继续新增', cancel: '取消', pinTitle: '管理员 PIN', pinHint: '请输入管理员 PIN（每次浏览只需一次）。',
      ok: '确定', badPin: 'PIN 错误', addNew: '新值', saving: '保存中…', saved: '已保存', sheetFail: '已保存到 Supabase，但 Google 表格未更新：', delAsk: '删除此记录？（网页中删除；Google 表格中保留并加红字备注）', deleted: '已删除',
      confirmed: '已确认', need: '必填：工厂、日期时间、设备或问题', badFactory: '工厂必须是：', secWhen: '时间 / 地点', secMachine: '设备', secIssue: '问题与解决方法', secRepair: '维修', secPeople: '人员',
      factory: '工厂', time: '报修时间', shift: '班别', station: '站别', machine: '设备名称', machineNo: '设备编号', product: '机种', issueType: '设备问题点', issue: '问题', solution: '解决方法',
      repairStart: '维修时间', recoveryEnd: '复机时间', minutes: '维修总时间(min)', qty: '设备数量', failRate: '设备故障率（自动）', leader: '领班确认', technician: '维修人员', remark: '备注', fixed: '已修正', negMin: '复机时间早于报修时间（分钟为负）– 请检查日期和时间',
      viaForm: '通过表单填写', viaFile: '导入文件 (.xlsx / .csv)', impTitle: '从文件导入数据', impPick: '文件 (.xlsx, .xls, .csv)', impSheet: '工作表', impHdr: '表头行号', impDateOrder: '文本日期顺序',
      impDefFactory: '工厂（文件中没有时）', impMap: '将文件列与字段匹配', impMapHint: '已按列名自动匹配 — 如有错误请修改。', impNone: '— 文件中没有 —', impSkipDup: '检查重复（完全相同则覆盖；仅 1 列不同则先核对）',
      impPreview: '预览', impReady: '可导入', impDup: '重复已跳过', impErr: '有错误', impBadDate: '无法识别日期时间', impStart: '开始导入', impBusy: '导入中', impDone: '已导入', impFailed: '失败',
      impRow: '行', dupSame: '发现完全相同的记录，已覆盖旧记录', dupTitle: '可能重复，请先核对', dupHint: '与已有记录只有 1 列不同。旧记录可能已被核对或修改，请逐条选择。', dupDiff: '不同的列', dupOld: '已有', dupNew: '新', dupEmpty: '（空）', dupOverwrite: '覆盖旧记录', dupKeep: '保留旧记录（跳过）', dupAddNew: '作为新记录添加', dupAll: '全部：', dupKept: '已保留旧记录，未保存', dupConfirm: '确认', impNewN: '新增', impSame: '完全相同（覆盖）', impReview: '待核对', impInFile: '文件内重复（跳过）', impOver: '已覆盖', impKept: '保留旧记录', delAskN: '删除 {n} 条记录？网页中将删除，Google 表格中保留并加红字备注。', delType: '请输入要删除的记录数以确认：{n}', delCancel: '已取消删除', deleting: '删除中…', delSheetFail: '网页已删除，但 Google 表格备注未添加：', delNote: 'หน้าเว็บลบข้อมูลนี้แล้ว', delNoRow: '在 Google 表格中找不到对应行：', impAutoTag: '自动', impEditTag: '已改', impMissing: '尚未匹配：', impSolMode: '文件中问题与解决办法的位置', impSolSep: '分开两列', impSolComb: '同一单元格', impSplitBy: '分隔符', impSepAuto: '自动', impNl: '换行', impCombHint: '第一个分隔符之前 = 问题，其余 = 解决办法。', impSwapped: '已互换：', impSolSame: '= 与「问题」同一列', impBadFile: '无法读取此文件', fDate: '日期（与时间分开时）', viaPaste: '粘贴（复制表格）', impPaste: '在此粘贴表格（从 Excel / Google 表格复制，含表头行）', clear: '清空', pasteHint: '在 Excel 或 Google 表格中复制单元格，然后粘贴到这里 (Ctrl+V)。', tabHint: '添加数据的方式：填写表单、粘贴表格或附加文件。' },
    th: { add: 'เพิ่มข้อมูล', edit: 'แก้ไขข้อมูล', del: 'ลบ', confirm: 'ยืนยัน (ค่าถูกต้อง)', unconfirm: 'ยกเลิกการยืนยัน', save: 'บันทึก', saveNew: 'บันทึกแล้วเพิ่มรายการถัดไป', cancel: 'ยกเลิก', pinTitle: 'PIN แอดมิน',
      pinHint: 'ใส่ PIN แอดมิน (ถามครั้งเดียวต่อการเปิดเบราว์เซอร์)', ok: 'ตกลง', badPin: 'PIN ไม่ถูกต้อง', addNew: 'ค่าใหม่', saving: 'กำลังบันทึก…', saved: 'บันทึกแล้ว',
      sheetFail: 'บันทึกใน Supabase แล้ว แต่ Google Sheet ยังไม่ถูกอัปเดต: ', delAsk: 'ลบรายการนี้? (ลบจากหน้าเว็บ แต่ในกูเกิ้ลชีทจะเก็บไว้และใส่หมายเหตุตัวแดง)', deleted: 'ลบแล้ว', confirmed: 'ยืนยันแล้ว',
      need: 'ต้องกรอก: โรงงาน วันเวลา และเครื่องหรือปัญหา', badFactory: 'โรงงานต้องเป็นหนึ่งใน: ', secWhen: 'เมื่อไร / ที่ไหน', secMachine: 'เครื่อง', secIssue: 'ปัญหาและวิธีแก้', secRepair: 'การซ่อม',
      secPeople: 'บุคลากร', factory: 'โรงงาน', time: 'เวลาแจ้งซ่อม 报修时间', shift: 'กะ 班别', station: 'กระบวนการ 站别', machine: 'ชื่อเครื่อง', machineNo: 'หมายเลขเครื่อง', product: 'โมดูล 机种',
      issueType: 'จุดปัญหา 设备问题点', issue: 'ปัญหา', solution: 'วิธีแก้', repairStart: 'เวลาซ่อม 维修时间', recoveryEnd: 'เวลาพักฟื้น 复机时间', minutes: 'เวลาซ่อม(นาที) 维修总时间',
      qty: 'จำนวนเครื่อง 设备数量', failRate: 'อัตราล้มเหลว 设备故障率 (อัตโนมัติ)', leader: 'หัวหน้างาน 领班确认', technician: 'ช่างเทคนิค 维修人员', remark: 'หมายเหตุ 备注', fixed: 'แก้ไขแล้ว', negMin: 'เวลาพักฟื้นอยู่ก่อนเวลาแจ้งซ่อม (นาทีติดลบ) – กรุณาตรวจสอบวันที่/เวลา',
      viaForm: 'กรอกผ่านฟอร์ม', viaFile: 'แนบไฟล์ (.xlsx / .csv)', impTitle: 'นำเข้าข้อมูลจากไฟล์', impPick: 'ไฟล์ (.xlsx, .xls, .csv)', impSheet: 'ชีต', impHdr: 'แถวหัวตารางที่', impDateOrder: 'ลำดับวันที่ (แบบข้อความ)',
      impDefFactory: 'โรงงาน (ถ้าไฟล์ไม่มีคอลัมน์)', impMap: 'จับคู่คอลัมน์ในไฟล์กับฟิลด์', impMapHint: 'เดาจากชื่อคอลัมน์ให้อัตโนมัติ — แก้ที่ไม่ตรงได้', impNone: '— ไม่มีในไฟล์ —', impSkipDup: 'ตรวจข้อมูลซ้ำ (ซ้ำทุกคอลัมน์ → เขียนทับ, ต่างแค่ 1 คอลัมน์ → ให้รีวิวก่อน)',
      impPreview: 'ตัวอย่าง', impReady: 'พร้อมนำเข้า', impDup: 'ข้ามรายการซ้ำ', impErr: 'มีข้อผิดพลาด', impBadDate: 'อ่านวันที่/เวลาไม่ได้', impStart: 'นำเข้า', impBusy: 'กำลังนำเข้า', impDone: 'นำเข้าแล้ว', impFailed: 'ล้มเหลว',
      impRow: 'แถว', dupSame: 'พบข้อมูลซ้ำทุกคอลัมน์ — เขียนทับของเดิมแล้ว', dupTitle: 'อาจซ้ำ — กรุณาตรวจสอบก่อน', dupHint: 'เหมือนข้อมูลเดิมแต่ต่างกันแค่ 1 คอลัมน์ ข้อมูลเดิมอาจถูกตรวจสอบหรือแก้ไขแล้ว กรุณาเลือกทีละรายการ', dupDiff: 'ต่างกันที่', dupOld: 'ของเดิม', dupNew: 'ใหม่', dupEmpty: '(ว่าง)', dupOverwrite: 'เขียนทับของเดิม', dupKeep: 'เก็บของเดิม (ข้าม)', dupAddNew: 'เพิ่มเป็นรายการใหม่', dupAll: 'ทั้งหมด:', dupKept: 'เก็บของเดิมไว้ — ไม่ได้บันทึก', dupConfirm: 'ยืนยัน', impNewN: 'ใหม่', impSame: 'ซ้ำทุกคอลัมน์ (เขียนทับ)', impReview: 'รอตรวจสอบ', impInFile: 'ซ้ำในไฟล์ (ข้าม)', impOver: 'เขียนทับ', impKept: 'เก็บของเดิม', delAskN: 'ลบ {n} รายการ? จะลบจากหน้าเว็บ แต่ในกูเกิ้ลชีทจะเก็บไว้และใส่หมายเหตุตัวแดง', delType: 'พิมพ์จำนวนรายการที่จะลบเพื่อยืนยัน: {n}', delCancel: 'ยกเลิกการลบ', deleting: 'กำลังลบ…', delSheetFail: 'ลบจากหน้าเว็บแล้ว แต่ยังไม่ได้ใส่หมายเหตุใน Google Sheet: ', delNote: 'หน้าเว็บลบข้อมูลนี้แล้ว', delNoRow: 'ไม่พบแถวนี้ใน Google Sheet: ', impAutoTag: 'อัตโนมัติ', impEditTag: 'แก้แล้ว', impMissing: 'ยังจับคู่ไม่ได้: ', impSolMode: 'ปัญหา & วิธีแก้ ในไฟล์', impSolSep: 'แยกคอลัมน์', impSolComb: 'รวมอยู่ในเซลล์เดียว', impSplitBy: 'คั่นด้วย', impSepAuto: 'อัตโนมัติ', impNl: 'ขึ้นบรรทัดใหม่', impCombHint: 'ข้อความก่อนตัวคั่นแรก = ปัญหา ที่เหลือ = วิธีแก้', impSwapped: 'สลับกับ: ', impSolSame: '= คอลัมน์เดียวกับปัญหา', impBadFile: 'อ่านไฟล์นี้ไม่ได้', fDate: 'วันที่ 日期 (ถ้าแยกจากเวลา)', viaPaste: 'ก๊อปวาง (คัดลอกตาราง)', impPaste: 'วางตารางที่นี่ (คัดลอกจาก Excel / Google Sheets พร้อมแถวหัวตาราง)', clear: 'ล้าง', pasteHint: 'คัดลอกเซลล์จาก Excel หรือ Google Sheets แล้ววางที่นี่ (Ctrl+V)', tabHint: 'เพิ่มข้อมูลได้ 3 แบบ: กรอกฟอร์ม, ก๊อปตารางมาวาง หรือแนบไฟล์' }
  };
  const T = k => ((TXT[lang] || TXT.en)[k]) || TXT.en[k] || k;
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const all = () => DATA.concat(NOMACH);
  const nowLocal = () => tzFmt.format(new Date()).replace(' ', 'T').slice(0, 16);
  const ms = s => Date.parse(s.slice(0, 16) + ':00' + TZO);
  const nk = s => String(s || '').trim().toLowerCase();

  /* ---------- style ---------- */
  const st = document.createElement('style');
  st.textContent = `#praDlg,#praImp{width:min(760px,96vw);max-height:94vh;padding:0;border:1px solid var(--line);border-radius:10px;background:var(--panel);color:var(--text)}
  #praDlg::backdrop,#praPin::backdrop,#praImp::backdrop,#praChoose::backdrop{background:rgba(0,0,0,.55)} #praPin,#praChoose{border:1px solid var(--line);border-radius:10px;background:var(--panel);color:var(--text);padding:16px}
  .pra-head{padding:12px 16px;font-weight:700;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center}
  .pra-body{padding:12px 16px;overflow:auto;max-height:calc(94vh - 120px)} .pra-sec{font-size:11px;font-weight:700;color:var(--accent);margin:12px 0 6px;text-transform:uppercase;letter-spacing:.04em}
  .pra-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px} .pra-grid .wide{grid-column:1/-1}
  .pra-f label{display:block;font-size:11px;color:var(--muted);margin-bottom:2px;position:static}
  .pra-f input,.pra-f textarea,.pra-f select{width:100%;font-size:13px;padding:7px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel2);color:var(--text);color-scheme:inherit;min-width:0}
  .pra-f{position:relative} .pra-f input[readonly]{opacity:.7}
  .pra-dt{display:flex;gap:4px;align-items:center} .pra-f .pra-dt select{width:66px;flex:none} .pra-f .pra-dt input{flex:1}
  .pra-dd{display:none;position:absolute;left:0;right:0;top:100%;z-index:60;max-height:210px;overflow:auto;background:var(--panel);border:1px solid var(--accent);border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,.35)}
  .pra-dd div{padding:6px 9px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--line)} .pra-dd div:hover{background:var(--panel2)} .pra-dd .new{color:var(--accent);font-weight:600}
  .pra-foot{padding:10px 16px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
  .pra-menu{position:fixed;z-index:100;min-width:190px;background:var(--panel);border:1px solid var(--line);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.4);overflow:hidden}
  .pra-menu button{display:block;width:100%;text-align:left;padding:9px 12px;font-size:13px;color:var(--text);background:none;border:0;border-bottom:1px solid var(--line);cursor:pointer}
  .pra-menu button:hover{background:var(--panel2)} .pra-menu .danger{color:#ef4444}
  .pra-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:200;padding:9px 14px;border-radius:8px;background:var(--accent);color:var(--accent-ink);font-weight:600;max-width:92vw}
  .pra-toast.err{background:#d93025;color:#fff}
  .kebab{padding:3px 8px !important;font-size:15px !important;line-height:1 !important}`;
  st.textContent += `\n.pra-inline .pra-body{max-height:none;padding:12px 0} .pra-inline .pra-foot{padding:10px 0;border-top:1px solid var(--line)}`;
  st.textContent += `\n#praDup{width:min(900px,96vw);max-height:92vh;padding:0;border:1px solid var(--line);border-radius:10px;background:var(--panel);color:var(--text)} #praDup::backdrop{background:rgba(0,0,0,.55)} #praDup td{padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top} #praDup select{font-size:12px;padding:5px;border:1px solid var(--line);border-radius:6px;background:var(--panel2);color:var(--text)}`;
  st.textContent += `\n.pra-grid.t3{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))} .pra-grid.t3 .pra-dt select{width:60px} .pra-grid.sm{grid-template-columns:repeat(auto-fit,minmax(130px,200px))} .pra-f input[readonly]{opacity:.7;cursor:not-allowed}`;
  document.head.appendChild(st);

  
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
  async function saveOne(pin, v, editing) {                         // Supabase RPC first (throws on failure), then GAS (error returned, not thrown)
    const iso = s => s ? s.slice(0, 16) + ':00' + TZO : null, loc = s => s ? s.slice(0, 16) + ':00' : '';
    const fr = calcFailRate_(v.minutes, v.qty), num = s => (s === '' || s == null) ? null : Number(s);
    const row = { id: editing ? Number(editing.pk) : null, factory: v.factory, timestamp: iso(v.timestamp), log_date: v.timestamp.slice(0, 10), raw_machine_name: v.machine || 'N/A', machine_number: v.machineNo || '',
      raw_issue: v.solution ? `${v.issue} # ${v.solution}` : v.issue, shift: v.shift, station: v.station, product: v.product, issue_type: v.issueType, repair_start: iso(v.repairStart), recovery_end: iso(v.recoveryEnd),
      repair_minutes: num(v.minutes), qty: num(v.qty), leader: v.leader, technician: v.technician, remark: v.remark };
    const saved = await rpc('pr_save_log', { p_pin: pin, p_row: row });
    let gasErr = '';
    if (GAS_URL) {
      try {
        await gas({ action: 'upsert', pin, pk: saved.id, factory: v.factory, prev: editing ? prevOf(editing) : null,
          row: { timestamp: loc(v.timestamp), date: v.timestamp.slice(0, 10), shift: v.shift, station: v.station, machine: v.machine || 'N/A', machineNo: v.machineNo, product: v.product, issueType: v.issueType,
                 issue: row.raw_issue, repairStart: loc(v.repairStart), recoveryEnd: loc(v.recoveryEnd), repairMinutes: v.minutes, qty: v.qty, failRate: fr, leader: v.leader, technician: v.technician, remark: v.remark } });
      } catch (e) { gasErr = e.message; rpc('pr_set_sync', { p_pin: pin, p_id: saved.id, p_ok: false, p_err: e.message }).catch(() => {}); }
    }
    return { id: saved.id, gasErr };
  }
  async function commit(v, editing, again) {                       // validate -> Supabase RPC -> GAS
    if (!v.factory || !v.timestamp || !(v.machine || v.issue)) { toast(T('need'), true); return false; }
    if (!FACTORIES.includes(v.factory)) { toast(T('badFactory') + FACTORIES.join(', '), true); return false; }
    if (v.minutes !== '' && Number(v.minutes) < 0) { toast(T('negMin'), true); return false; }
    if (!editing) {                                                  // new record: identical -> overwrite the old one; 1 column differs -> review first
      const hit = dupFind(dupIndex(), v);
      if (hit && hit.kind === 'same') { editing = hit.row; toast(T('dupSame')); }
      else if (hit) { const ch = await reviewDlg([{ v, hit }]); if (!ch) return false; if (ch[0] === 'keep') { toast(T('dupKept')); return false; } if (ch[0] === 'overwrite') editing = hit.row; }
    }
    const pin = await ensurePin(); if (!pin) return false;
    toast(T('saving'));
    let r; try { r = await saveOne(pin, v, editing); } catch (e) { toast(e.message, true); return false; }
    if (r.gasErr) toast(T('sheetFail') + r.gasErr, true);
    toast(T('saved')); await load(); return true;
  }

  /* ---------- combo box (pick from existing, or type a new value) ---------- */
  function combo(inp, getList) {                                  // list items: 'text' or [storedValue, shownLabel]
    const box = document.createElement('div'); box.className = 'pra-dd'; inp.parentNode.appendChild(box);
    const V = x => Array.isArray(x) ? x[0] : x, L = x => Array.isArray(x) ? x[1] : x;
    const show = () => {
      const list = getList(), k = nk(inp.value), hit = list.filter(x => !k || nk(V(x)).includes(k) || nk(L(x)).includes(k)).slice(0, 80), exact = list.some(x => nk(V(x)) === k || nk(L(x)) === k);
      box.innerHTML = hit.map(x => `<div data-v="${E(V(x))}">${E(L(x))}${L(x) !== V(x) ? `<br><span style="font-size:11px;color:var(--muted)">${E(V(x))}</span>` : ''}</div>`).join('') + (k && !exact ? `<div class="new" data-v="${E(inp.value.trim())}">＋ ${T('addNew')}: ${E(inp.value.trim())}</div>` : '');
      box.style.display = box.innerHTML ? 'block' : 'none';
    };
    inp.addEventListener('focus', show); inp.addEventListener('input', show);
    inp.addEventListener('blur', () => setTimeout(() => (box.style.display = 'none'), 120));
    box.addEventListener('mousedown', e => { const d = e.target.closest('[data-v]'); if (!d) return; e.preventDefault(); inp.value = d.dataset.v; box.style.display = 'none'; inp.dispatchEvent(new Event('change', { bubbles: true })); });
  }
  const trOf = (r, k) => lang === 'zh' ? (r[k + 'Cn'] || '') : lang === 'th' ? (r[k + 'Th'] || '') : '';      // translation in the selected language (needs pr-core to fill issueTh / solutionTh)
  const pairs = (rows, rawKey, trKey) => { const c = new Map(), lb = new Map(); rows.forEach(r => { const v = String(r[rawKey] ?? '').trim(); if (!v) return; c.set(v, (c.get(v) || 0) + 1); if (!lb.get(v)) lb.set(v, trOf(r, trKey)); }); return [...c.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => [v, lb.get(v) || v]); };
  const uniq = (key, filter) => { const c = new Map(); all().forEach(r => { if (filter && !filter(r)) return; const v = String(r[key] ?? '').trim(); if (v) c.set(v, (c.get(v) || 0) + 1); }); return [...c.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]); };

  /* ---------- form ---------- */
  function dtWrap(key) {                                           // date + 24 h time (no AM/PM) that behaves like one value 'YYYY-MM-DDTHH:mm'
    const dd = q('pra_' + key + '_d'), hh = q('pra_' + key + '_h'), mm = q('pra_' + key + '_m'), subs = [dd, hh, mm];
    return { get value() { return dd.value ? `${dd.value}T${hh.value || '00'}:${mm.value || '00'}` : ''; },
      set value(v) { const m = /^(\d{4}-\d\d-\d\d)T(\d\d):(\d\d)/.exec(v || ''); dd.value = m ? m[1] : ''; hh.value = m ? m[2] : ''; mm.value = m ? m[3] : ''; },
      addEventListener(ev, fn) { subs.forEach(x => x.addEventListener(ev, fn)); }, focus() { dd.focus(); } };
  }
  function open(row) {
    const old = q('praDlg'); if (old) old.remove();
    const editing = row || null, host = editing ? null : q('praAddForm');
    if (editing) unmount();                                          // the edit dialog uses the same field ids as the add tab
    const d = document.createElement(host ? 'div' : 'dialog'); if (host) d.className = 'pra-inline'; else d.id = 'praDlg';
    const f = (id, type, wide, key = id) => {
      if (type === 'dt') { const op = n => '<option value=""></option>' + Array.from({ length: n }, (_, i) => `<option>${p2(i)}</option>`).join('');
        return `<div class="pra-f${wide ? ' wide' : ''}"><label for="pra_${key}_d">${T(id)}</label><div class="pra-dt"><input type="date" id="pra_${key}_d"><select id="pra_${key}_h">${op(24)}</select><span>:</span><select id="pra_${key}_m">${op(60)}</select></div></div>`; }
      const lab = `<label for="pra_${key}">${T(id)}</label>`;
      const ctl = type === 'area' ? `<textarea id="pra_${key}" rows="2" autocomplete="off"></textarea>` : `<input id="pra_${key}" ${type === 'dt' ? 'type="datetime-local"' : type === 'num' ? 'type="number" step="any" inputmode="decimal"' : 'type="text"'} autocomplete="off" ${id === 'failRate' || id === 'minutes' ? 'readonly' : ''}>`;
      return `<div class="pra-f${wide ? ' wide' : ''}">${lab}${ctl}${(id === 'issue' || id === 'solution' || id === 'minutes') ? `<div class="lbl" id="pra_${id}_t" style="margin-top:2px"></div>` : ''}</div>`;
    };
    d.innerHTML = `${host ? '' : `<div class="pra-head"><span>${editing ? T('edit') : T('add')}</span><button class="btn" id="pra_x">✕</button></div>`}<div class="pra-body">
      <div class="pra-sec">${T('secWhen')}</div><div class="pra-grid sm">${f('factory', 'text')}${f('shift', 'text')}${f('station', 'text')}</div>
      <div class="pra-sec">${T('secMachine')}</div><div class="pra-grid">${f('machine', 'text')}${f('machineNo', 'text')}${f('product', 'text')}${f('issueType', 'text')}</div>
      <div class="pra-sec">${T('secIssue')}</div><div class="pra-grid">${f('issue', 'area', 1)}${f('solution', 'area', 1)}</div>
      <div class="pra-sec">${T('secRepair')}</div><div class="pra-grid t3">${f('time', 'dt', 0, 'timestamp')}${f('repairStart', 'dt')}${f('recoveryEnd', 'dt')}</div><div class="pra-grid sm" style="margin-top:8px">${f('minutes', 'num')}${f('qty', 'num')}${f('failRate', 'text')}</div>
      <div class="pra-sec">${T('secPeople')}</div><div class="pra-grid">${f('leader', 'text')}${f('technician', 'text')}${f('remark', 'area', 1)}</div></div>
      <div class="pra-foot"><button class="btn" id="pra_cancel">${host ? T('clear') : T('cancel')}</button>${editing || host ? '' : `<button class="btn" id="pra_saveNew">${T('saveNew')}</button>`}<button class="btn primary" id="pra_save">${T('save')}</button></div>`;
    if (host) { host.innerHTML = ''; host.appendChild(d); } else document.body.appendChild(d);
    const I = {}; ['factory', 'timestamp', 'shift', 'station', 'machine', 'machineNo', 'product', 'issueType', 'issue', 'solution', 'repairStart', 'recoveryEnd', 'minutes', 'qty', 'failRate', 'leader', 'technician', 'remark'].forEach(k => (I[k] = ['timestamp', 'repairStart', 'recoveryEnd'].includes(k) ? dtWrap(k) : q('pra_' + k)));
    const get = () => { const v = {}; Object.keys(I).forEach(k => (v[k] = (I[k].value || '').trim())); return v; };
    const set = v => Object.keys(v).forEach(k => { if (I[k]) I[k].value = v[k] ?? ''; });
    const legacyMin = editing && !toForm(editing).recoveryEnd ? toForm(editing).minutes : '';   // old record with minutes but no recovery time: keep its minutes
    let manual = false;
    const recalc = () => { { const a = autoMin(get()); I.minutes.value = a !== '' ? a : (legacyMin && !I.recoveryEnd.value ? legacyMin : ''); } /* minutes are locked: always calculated */ const fr = calcFailRate_(I.minutes.value, I.qty.value); I.failRate.value = fr === '' ? '' : (fr * 100).toFixed(2) + ' %'; const w = q('pra_minutes_t'), neg = I.minutes.value !== '' && Number(I.minutes.value) < 0; w.textContent = neg ? '⚠ ' + T('negMin') : ''; w.style.color = neg ? '#ef4444' : ''; };
    let tsTouched = !!editing;                                        // reported time still the default (= now) -> follows the repair start, so minutes are not negative
    const syncTs = () => { if (tsTouched) return; const b = I.repairStart.value || I.recoveryEnd.value; if (b && (!I.timestamp.value || I.timestamp.value > b)) I.timestamp.value = b; };
    const fac = () => I.factory.value.trim(), mach = () => all().filter(r => (!fac() || r.factory === fac()) && nk(r.machineRaw) === nk(I.machine.value));
    combo(I.factory, () => FACTORIES); combo(I.shift, () => uniq('shift')); combo(I.station, () => uniq('station')); combo(I.product, () => uniq('product')); combo(I.issueType, () => uniq('issueType'));
    combo(I.machine, () => uniq('machineRaw', r => !r.noMachine && (!fac() || r.factory === fac()))); combo(I.machineNo, () => [...new Set(mach().map(r => r.machineNo).filter(Boolean))]);
    combo(I.issue, () => pairs(all(), 'issueRaw', 'issue')); combo(I.leader, () => uniq('leader')); combo(I.technician, () => uniq('technician'));
    combo(I.solution, () => { const own = pairs(all().filter(r => nk(r.issueRaw) === nk(I.issue.value)), 'solutionRaw', 'solution'), have = new Set(own.map(x => x[0])); return [...own, ...pairs(all(), 'solutionRaw', 'solution').filter(x => !have.has(x[0]))]; });
    const hintFor = (k, rk, tk) => { const v = nk(I[k].value), r = v && all().find(x => nk(x[rk]) === v && trOf(x, tk)); q('pra_' + k + '_t').textContent = r ? '→ ' + trOf(r, tk) : ''; };
    const refreshHints = () => { hintFor('issue', 'issueRaw', 'issue'); hintFor('solution', 'solutionRaw', 'solution'); };
    ['input', 'change'].forEach(ev => { I.issue.addEventListener(ev, refreshHints); I.solution.addEventListener(ev, refreshHints); });
    I.machine.addEventListener('change', () => { const m = mach().sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))[0]; if (m && !I.product.value) I.product.value = m.product || ''; if (m && !I.machineNo.value) I.machineNo.value = m.machineNo || ''; });
    I.issue.addEventListener('change', () => { const m = all().filter(r => nk(r.issueRaw) === nk(I.issue.value) && r.solutionRaw).sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))[0]; if (m && !I.solution.value) I.solution.value = m.solutionRaw; });
    ['timestamp', 'recoveryEnd', 'qty'].forEach(k => I[k].addEventListener('input', recalc)); I.timestamp.addEventListener('input', () => { tsTouched = true; }); ['repairStart', 'recoveryEnd'].forEach(k => I[k].addEventListener('input', () => { syncTs(); recalc(); }));
    if (editing) { const v = toForm(editing); set(v); } else { I.timestamp.value = nowLocal(); I.factory.value = q('fFactory') && q('fFactory').value || ''; }
    recalc(); refreshHints();
    const close = () => { if (host) { open(); return; } d.close(); d.remove(); };      // add tab: "close" = fresh empty form
    if (q('pra_x')) q('pra_x').onclick = close; q('pra_cancel').onclick = close;
    q('pra_save').onclick = async () => { if (await commit(get(), editing)) close(); };
    if (!editing && !host) q('pra_saveNew').onclick = async () => {
      const v = get(); if (await commit(v, null)) { ['machine', 'machineNo', 'product', 'issueType', 'issue', 'solution', 'repairStart', 'recoveryEnd', 'minutes', 'qty', 'remark', 'failRate'].forEach(k => (I[k].value = '')); manual = false; tsTouched = false; I.timestamp.value = nowLocal(); recalc(); refreshHints(); I.machine.focus(); }
    };
    if (!host) d.showModal();
  }

  /* ---------- delete / confirm / quick fix / row menu ---------- */
  async function delMany(rows) {                                   // web/Supabase: removed. Google Sheet: row stays, a red note is written instead ('markDeleted')
    rows = rows.filter(r => r.pk); const n = rows.length; if (!n) return false;
    const r0 = rows[0], head = n === 1 ? T('delAsk') + '\n\n' + r0.factory + ' · ' + (r0.timestamp || '').replace('T', ' ').slice(0, 16) + ' · ' + r0.machineEn : T('delAskN').replace('{n}', n);
    if (!confirm(head)) return false;
    if (n >= 20 && String(prompt(T('delType').replace('{n}', n)) || '').trim() !== String(n)) { toast(T('delCancel'), true); return false; }
    const pin = await ensurePin(); if (!pin) return false;
    toast(T('deleting'));
    const todo = rows.slice(), done = []; let fail = 0, stop = false;
    const worker = async () => { while (todo.length && !stop) { const r = todo.shift(); try { await rpc('pr_delete_log', { p_pin: pin, p_id: Number(r.pk) }); done.push(r); } catch (e) { fail++; if (e.message === T('badPin')) { stop = true; toast(e.message, true); } } } };
    await Promise.all([worker(), worker(), worker(), worker()]);
    let gasFail = 0, gasMsg = '';
    if (GAS_URL && done.length) {
      const note = T('delNote') + ' (' + nowLocal().replace('T', ' ') + ')';
      const byF = {}; done.forEach(r => (byF[r.factory] = byF[r.factory] || []).push(r));          // one request per factory sheet, factory also at top level like the other actions
      for (const [factory, list] of Object.entries(byF)) for (let i = 0; i < list.length; i += 40) {
        try { const j = await gas({ action: 'markDeleted', pin, factory, note, items: list.slice(i, i + 40).map(r => ({ pk: r.pk, factory: r.factory, prev: prevOf(r) })) }); if (j.notFound) { gasFail += j.notFound; gasMsg = T('delNoRow') + j.notFound; } }
        catch (e) { gasFail += Math.min(40, list.length - i); gasMsg = e.message; }
      }
    }
    toast(`${T('deleted')} ${done.length}` + (fail ? ` · ${T('impFailed')} ${fail}` : ''), !!fail);
    if (gasFail) toast(T('delSheetFail') + gasMsg, true);
    await load(); return done.length > 0;
  }
  const del = r => delMany([r]);
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
  /* ---------- import from a file (.xlsx / .csv) with manual column -> field mapping ---------- */
  const IMP_FIELDS = ['factory', 'date', 'timestamp', 'shift', 'station', 'machine', 'machineNo', 'product', 'issueType', 'issue', 'solution', 'repairStart', 'recoveryEnd', 'minutes', 'qty', 'leader', 'technician', 'remark'];
  const IMP_SYN = { factory: ['factory', 'plant', '工厂', 'โรงงาน'], date: ['date', 'logdate', '日期', 'วันที่'], timestamp: ['timestamp', 'time', 'reportedtime', 'reporttime', '报修时间', 'เวลาแจ้งซ่อม', 'เวลาที่แจ้งซ่อม'],
    shift: ['shift', '班别', 'กะ'], station: ['station', '站别', 'กระบวนการ'], machine: ['machine', 'machinename', 'rawmachinename', 'equipment', '设备名称', 'ชื่ออุปกรณ์', 'ชื่อเครื่อง'], machineNo: ['machineno', 'machinenumber', 'no', '设备编号', 'หมายเลขเครื่อง'],
    product: ['product', 'model', 'module', '机种', 'โมดูล'], issueType: ['issuetype', 'issuepoint', '设备问题点', 'เครื่องมีปัญหา', 'จุดปัญหา'], issue: ['issue', 'rawissue', 'problem', '故障原因', 'สาเหตุ', 'ปัญหา'],
    solution: ['solution', '解决办法', '解决方法', 'วิธีแก้'], repairStart: ['repairstart', 'startrepair', '维修时间', 'เวลาซ่อม'], recoveryEnd: ['recoveryend', 'recovery', '复机时间', 'เวลาพักฟื้น'],
    minutes: ['repairminutes', 'minutes', 'totalrepairtime', '维修总时间', 'เวลาทั้งหมด'], qty: ['qty', 'quantity', '设备数量', 'จำนวนเครื่อง'], leader: ['leader', '领班确认', 'หัวหน้า'], technician: ['technician', '维修人员', 'ช่างเทคนิค'], remark: ['remark', 'remarks', 'note', '备注', 'หมายเหตุ'] };
  const IMP_ORDER = ['repairStart', 'recoveryEnd', 'minutes', 'timestamp', 'issueType', 'solution', 'issue', 'machineNo', 'machine', 'factory', 'date', 'shift', 'station', 'product', 'qty', 'leader', 'technician', 'remark'];   // specific names before general ones
  const hn = s => String(s ?? '').toLowerCase().replace(/[\s_\-().:：（）\/#]/g, '');
  const colL = n => { let r = ''; for (n++; n > 0; n = Math.floor((n - 1) / 26)) r = String.fromCharCode(65 + (n - 1) % 26) + r; return r; };
  const serialStr = v => {                                          // Excel serial -> wall-clock text (no time-zone shift)
    const dt = new Date(Math.round((v - 25569) * 864e5 / 6e4) * 6e4), tm = p2(dt.getUTCHours()) + ':' + p2(dt.getUTCMinutes());
    return v < 1 ? tm : `${dt.getUTCFullYear()}-${p2(dt.getUTCMonth() + 1)}-${p2(dt.getUTCDate())}T${tm}`;
  };
  const cellVal = c => {
    if (!c || c.v == null) return '';
    if (c.t === 'n') return (c.z && XLSX.SSF.is_date(c.z)) ? serialStr(c.v) : c.v;
    if (c.t === 'd' && c.v instanceof Date) return serialStr(c.v.getTime() / 864e5 + 25569);
    return String(c.v).trim();
  };
  function readGrid(ws) {
    if (!ws || !ws['!ref']) return [];
    const rg = XLSX.utils.decode_range(ws['!ref']), out = [];
    for (let r = rg.s.r; r <= rg.e.r; r++) { const row = []; for (let c = rg.s.c; c <= rg.e.c; c++) row.push(cellVal(ws[XLSX.utils.encode_cell({ r, c })])); out.push(row); }
    return out;
  }
  function autoMap(heads) {                                         // field -> column index (or -1)
    const H = heads.map(hn), map = {}, used = new Set(); IMP_FIELDS.forEach(f => (map[f] = -1));
    const pass = (test) => IMP_ORDER.forEach(f => { if (map[f] >= 0) return; const i = H.findIndex((h, k) => h && !used.has(k) && IMP_SYN[f].some(sy => test(h, hn(sy)))); if (i >= 0) { map[f] = i; used.add(i); } });
    pass((h, sy) => h === sy);
    pass((h, sy) => (/[a-z]/.test(sy) ? sy.length >= 4 : sy.length >= 2) && h.includes(sy));
    return map;
  }
  const dayPlus = (ts, n) => { const d = new Date(Date.UTC(+ts.slice(0, 4), +ts.slice(5, 7) - 1, +ts.slice(8, 10) + n)); return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}${ts.slice(10)}`; };
  function impRows(grid, hdr, map, o) {                             // -> { good:[{v,rowNo}], errs:[], dup:n }
    const cell = (r, f) => (map[f] >= 0 ? r[map[f]] : ''), toTs = x => {
      if (x == null || x === '') return '';
      let t = String(x).trim(); if (o.mdy) t = t.replace(/^(\d{1,2})([\/.\-])(\d{1,2})([\/.\-])(\d{2,4})/, '$3$2$1$4$5');
      const r = toLocal_(t); return r ? r.slice(0, 16) : '';
    }, tOnly = x => { const m = /^\s*(\d{1,2})[:.](\d{2})/.exec(String(x ?? '')); return m ? p2(+m[1]) + ':' + m[2] : ''; };
    const good = [], errs = []; let dup = 0;
    grid.slice(hdr).forEach((r, i) => {
      if (!r.some(x => String(x).trim() !== '')) return;
      const rowNo = hdr + 1 + i, dt = toTs(cell(r, 'date')), rawT = cell(r, 'timestamp');
      let ts = toTs(rawT);
      if (!ts && tOnly(rawT) && dt) ts = dt.slice(0, 10) + 'T' + tOnly(rawT);
      if (!ts && dt && !String(rawT).trim()) ts = dt;
      const sub = f => { const x = cell(r, f); let y = toTs(x); if (!y && ts && tOnly(x)) { y = ts.slice(0, 10) + 'T' + tOnly(x); if (y < ts) y = dayPlus(ts, 1).slice(0, 10) + y.slice(10); } return y; };
      const fx = String(cell(r, 'factory') || o.factory || '').trim(), factory = FACTORIES.find(f => nk(f) === nk(fx)) || fx;
      const txt = f => sv_(cell(r, f)), numS = f => { const n = numVal_(cell(r, f)); return n === '' ? '' : String(n); };
      const v = { factory, timestamp: ts, shift: txt('shift'), station: txt('station'), machine: txt('machine'), machineNo: txt('machineNo'), product: txt('product'), issueType: txt('issueType'),
        issue: txt('issue'), solution: txt('solution'), repairStart: sub('repairStart'), recoveryEnd: sub('recoveryEnd'), minutes: numS('minutes'), qty: numS('qty'), leader: txt('leader'), technician: txt('technician'), remark: txt('remark') };
      if (o.comb && map.issue >= 0) { const sp = splitComb_(v.issue, o.sep); v.issue = sp[0]; v.solution = sp[1]; }   // problem and fix share one cell
      if (!v.minutes) v.minutes = autoMin(v);
      let why = '';
      if (!ts) why = T('impBadDate'); else if (!v.machine && !v.issue) why = T('need'); else if (!FACTORIES.includes(factory)) why = T('badFactory') + FACTORIES.join(', '); else if (v.minutes !== '' && Number(v.minutes) < 0) why = T('negMin');
      if (why) { errs.push(`${T('impRow')} ${rowNo}: ${why}`); return; }
      good.push({ v, rowNo });
    });
    return { good, errs, dup };
  }
  function parsePaste(text) {                                        // Excel / Google Sheets copy = TAB separated (quotes allowed); also accepts CSV
    const t = String(text || '').replace(/^\uFEFF/, ''), first = t.split(/\r?\n/)[0] || '', dl = t.includes('\t') ? '\t' : (first.includes(',') ? ',' : (first.includes(';') ? ';' : '\t'));
    const rows = []; let row = [], cur = '', inQ = false;
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (inQ) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else inQ = false; } else cur += c; }
      else if (c === '"' && cur === '') inQ = true;
      else if (c === dl) { row.push(cur.trim()); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cur.trim()); cur = ''; rows.push(row); row = []; }
      else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur.trim()); rows.push(row); }
    return rows.filter(r => r.some(x => x !== ''));
  }
  const splitComb_ = (s, sep) => {                                   // 'problem # fix' -> [problem, fix]; split at the first separator found
    s = String(s || ''); const list = sep === 'auto' ? ['#', '\n', '/', ','] : [sep === 'nl' ? '\n' : sep];
    for (const p of list) { const i = s.indexOf(p); if (i > 0) return [s.slice(0, i).trim(), s.slice(i + 1).trim()]; }
    return [s.trim(), ''];
  };
  const detectComb = (rows, m) => {                                   // issue + solution sharing one column? -> the separator, or ''
    if (m.issue < 0 || m.solution >= 0) return '';
    const cells = rows.map(r => String(r[m.issue] ?? '')).filter(x => x.trim()); if (!cells.length) return '';
    const rt = p => cells.filter(x => x.indexOf(p) > 0).length / cells.length;
    if (rt('#') >= 0.1) return '#';
    for (const p of ['/', ',']) if (rt(p) >= 0.4) return p;
    return '';
  };
  const guessByContent = (rows, m) => {                               // fill what the column names missed, by looking at the values
    const sample = rows.slice(0, 200), used = new Set(Object.values(m).filter(i => i >= 0)), ncol = Math.max(0, ...sample.map(r => r.length));
    const col = c => sample.map(r => String(r[c] ?? '').trim()).filter(Boolean);
    const pick = test => { for (let c = 0; c < ncol; c++) { if (used.has(c)) continue; const v = col(c); if (v.length && test(v)) { used.add(c); return c; } } return -1; };
    if (m.factory < 0) { const c = pick(v => v.filter(x => FACTORIES.some(f => nk(f) === nk(x))).length / v.length >= 0.6); if (c >= 0) m.factory = c; }
    if (m.timestamp < 0 && m.date < 0) { const c = pick(v => v.filter(x => /\d[\/\-.:]\d/.test(x) && toLocal_(x)).length / v.length >= 0.7); if (c >= 0) m.timestamp = c; }
  };
  /* ---------- duplicates: identical in every column -> overwrite; differs in exactly 1 column -> review first ---------- */
  const DUPCOLS = ['factory', 'timestamp', 'shift', 'station', 'machine', 'machineNo', 'product', 'issueType', 'issue', 'solution', 'repairStart', 'recoveryEnd', 'minutes', 'qty', 'leader', 'technician', 'remark'];
  const TSCOL = ['timestamp', 'repairStart', 'recoveryEnd'];
  const dnorm = (c, x) => { x = String(x ?? '').trim(); if (TSCOL.includes(c)) return iso16(x); if (c === 'minutes' || c === 'qty') return (x === '' || isNaN(Number(x))) ? x : String(Number(x)); return nk(x).replace(/\s+/g, ' '); };
  const dvals = v => DUPCOLS.map(c => dnorm(c, v[c]));
  const SEP = '\u0001', without = (a, i) => a.map((x, j) => (j === i ? '' : x)).join(SEP);
  function dupIndex() {                                              // built once per save / import: full-row key + one key per "all columns except i"
    const full = new Map(), part = DUPCOLS.map(() => new Map());
    all().forEach(r => { if (!r.pk) return; const a = dvals(toForm(r)), k = a.join(SEP); if (!full.has(k)) full.set(k, r); a.forEach((_, i) => { const pk = without(a, i); if (!part[i].has(pk)) part[i].set(pk, r); }); });
    return { full, part };
  }
  function dupFind(idx, v) {                                         // -> { kind:'same'|'one', row, col } or null
    const a = dvals(v), same = idx.full.get(a.join(SEP)); if (same) return { kind: 'same', row: same };
    for (let i = 0; i < a.length; i++) { const r = idx.part[i].get(without(a, i)); if (r) return { kind: 'one', row: r, col: DUPCOLS[i] }; }
    return null;
  }
  function classify(good) {                                          // import plan: new | same (overwrite) | one (review) | skip (repeated inside the file)
    const idx = dupIndex(), seen = new Set();
    return good.map(g => { const k = dvals(g.v).join(SEP); if (seen.has(k)) return { ...g, kind: 'skip' }; seen.add(k); const hit = dupFind(idx, g.v); return hit ? { ...g, kind: hit.kind, hit } : { ...g, kind: 'new' }; });
  }
  function reviewDlg(items) {                                        // -> Promise<['keep'|'overwrite'|'new', ...] | null (cancelled)>
    return new Promise(res => {
      const d = document.createElement('dialog'); d.id = 'praDup';
      const lab = c => T(c === 'timestamp' ? 'time' : c), show = (c, x) => { x = String(x ?? '').trim(); return x === '' ? `<i style="opacity:.6">${T('dupEmpty')}</i>` : E(TSCOL.includes(c) ? x.replace('T', ' ') : x); };
      const opt = [['keep', T('dupKeep')], ['overwrite', T('dupOverwrite')], ['new', T('dupAddNew')]];
      d.innerHTML = `<div class="pra-head"><span>⚠ ${T('dupTitle')} (${items.length})</span></div><div class="pra-body"><div class="lbl" style="margin-bottom:8px">${T('dupHint')}</div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:8px"><span class="lbl">${T('dupAll')}</span>${opt.map(([k, l]) => `<button class="btn" data-all="${k}">${E(l)}</button>`).join('')}</div>
        <table class="w-full" style="font-size:12px">${items.map((it, i) => { const c = it.hit.col, o = toForm(it.hit.row)[c];
          return `<tr><td>${it.label ? `<b>${E(it.label)}</b> · ` : ''}${E(it.v.factory)} · ${E((it.v.timestamp || '').replace('T', ' '))} · ${E(it.v.machine)} · ${E((it.v.issue || '').slice(0, 60))}<div class="lbl">${T('dupDiff')}: <b>${E(lab(c))}</b></div></td>
          <td>${T('dupOld')}: ${show(c, o)}<br>${T('dupNew')}: <b style="color:var(--accent)">${show(c, it.v[c])}</b></td>
          <td><select data-i="${i}">${opt.map(([k, l]) => `<option value="${k}">${E(l)}</option>`).join('')}</select></td></tr>`; }).join('')}</table></div>
        <div class="pra-foot"><button class="btn" data-x="0">${T('cancel')}</button><button class="btn primary" data-x="1">${T('dupConfirm')}</button></div>`;
      document.body.appendChild(d); let done = false;
      const fin = v => { if (done) return; done = true; d.close(); d.remove(); res(v); };
      d.querySelectorAll('[data-all]').forEach(b => (b.onclick = () => d.querySelectorAll('select[data-i]').forEach(x => (x.value = b.dataset.all))));
      d.querySelector('[data-x="0"]').onclick = () => fin(null);
      d.querySelector('[data-x="1"]').onclick = () => fin([...d.querySelectorAll('select[data-i]')].map(x => x.value));
      d.addEventListener('cancel', () => fin(null)); d.showModal();
    });
  }
  function importDlg(mode) {
    const isPaste = mode === 'paste', host = q('praAddImp'); if (!host) return;
    const d = document.createElement('div'); d.className = 'pra-inline';
    d.innerHTML = `<div class="pra-body">
      ${isPaste ? `<div class="pra-f"><label>${T('impPaste')}</label><textarea id="imp_text" rows="8" placeholder="${E(T('pasteHint'))}" style="font-family:monospace;white-space:pre"></textarea></div>` : `<div class="pra-f"><label>${T('impPick')}</label><input type="file" id="imp_file" accept=".xlsx,.xls,.csv,.txt"></div>`}
      <div id="imp_cfg" style="display:none">
        <div class="pra-grid" style="margin-top:8px">
          <div class="pra-f" style="${isPaste ? 'display:none' : ''}"><label>${T('impSheet')}</label><select id="imp_sheet"></select></div>
          <div class="pra-f"><label>${T('impHdr')}</label><input type="number" id="imp_hdr" min="1" value="1"></div>
          <div class="pra-f"><label>${T('impDateOrder')}</label><select id="imp_ord"><option value="dmy">DD/MM/YYYY</option><option value="mdy">MM/DD/YYYY</option></select></div>
          <div class="pra-f"><label>${T('impDefFactory')}</label><select id="imp_fac"><option value=""></option>${FACTORIES.map(f => `<option>${E(f)}</option>`).join('')}</select></div>
        </div>
        <div class="pra-sec">${T('impMap')}</div><div class="lbl" style="margin-bottom:6px">${T('impMapHint')}</div><div class="pra-grid" id="imp_map"></div><div class="lbl" id="imp_warn" style="margin-top:6px;color:#f59e0b"></div>
        <div class="pra-sec">${T('impSolMode')}</div>
        <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;font-size:13px">
          <label style="display:flex;gap:5px;align-items:center"><input type="radio" name="imp_sm" id="imp_sm_sep" checked>${T('impSolSep')}</label>
          <label style="display:flex;gap:5px;align-items:center"><input type="radio" name="imp_sm" id="imp_sm_comb">${T('impSolComb')}</label>
          <span id="imp_sepW" style="display:none;align-items:center;gap:6px">${T('impSplitBy')} <select id="imp_sep" style="width:auto"><option value="auto">${T('impSepAuto')}</option><option value="#">#</option><option value="/">/</option><option value=",">,</option><option value="nl">${T('impNl')}</option></select></span>
        </div><div class="lbl" style="margin-top:4px">${T('impCombHint')}</div>
        <label class="lbl" style="display:flex;gap:6px;align-items:center;margin-top:10px"><input type="checkbox" id="imp_dup" checked>${T('impSkipDup')}</label>
        <div class="pra-sec">${T('impPreview')}</div><div id="imp_sum" style="font-weight:600"></div>
        <div style="overflow:auto;max-height:190px;margin-top:6px;border:1px solid var(--line);border-radius:6px"><table id="imp_tbl" style="font-size:12px;width:100%"></table></div>
        <div id="imp_err" class="lbl" style="max-height:90px;overflow:auto;margin-top:6px;color:#ef4444"></div>
      </div></div>
      <div class="pra-foot"><span class="lbl" id="imp_prog" style="margin-right:auto"></span><button class="btn" id="imp_cancel">${T('clear')}</button><button class="btn primary" id="imp_go" disabled>${T('impStart')}</button></div>`;
    host.innerHTML = ''; host.appendChild(d);
    let wb = null, grid = [], good = [], busy = false;
    const hdrIdx = () => Math.max(0, (+q('imp_hdr').value || 1) - 1);
    const comb = () => q('imp_sm_comb').checked;
    const opts = () => ({ mdy: q('imp_ord').value === 'mdy', factory: q('imp_fac').value, skipDup: q('imp_dup').checked, comb: comb(), sep: q('imp_sep').value });
    const labelOf = f => (f === 'timestamp' ? T('time') : f === 'date' ? T('fDate') : T(f));
    let curMap = {}, autoSet = new Set(), plan = [];                               // curMap: field -> column index; autoSet: fields matched automatically (and not changed since)
    const mapNow = () => { const m = Object.assign({}, curMap); if (comb()) m.solution = -1; return m; };
    const sampleOf = c => { if (c < 0) return ''; for (const r of grid.slice(hdrIdx() + 1)) { const x = String(r[c] ?? '').replace(/\s+/g, ' ').trim(); if (x) return x.slice(0, 40); } return ''; };
    const paint = () => {                                               // selects, auto/edited tags and a sample value under each field
      IMP_FIELDS.forEach(f => {
        const s = q('imp_m_' + f), dis = f === 'solution' && comb(); s.value = String(curMap[f]); s.disabled = dis; s.style.opacity = dis ? '.5' : '';
        q('imp_s_' + f).textContent = dis ? T('impSolSame') : sampleOf(curMap[f]);
        const g = q('imp_t_' + f); g.textContent = curMap[f] < 0 ? '' : autoSet.has(f) ? '✓ ' + T('impAutoTag') : '✎ ' + T('impEditTag'); g.style.color = autoSet.has(f) ? '#22c55e' : 'var(--accent)';
      });
      q('imp_sepW').style.display = comb() ? 'inline-flex' : 'none';
    };
    const missing = () => { const m = mapNow(), o = opts(), out = []; if (m.timestamp < 0 && m.date < 0) out.push(T('time')); if (m.factory < 0 && !o.factory) out.push(T('factory')); if (m.machine < 0 && m.issue < 0) out.push(T('machine') + ' / ' + T('issue')); return out; };
    const preview = () => {
      const r = impRows(grid, hdrIdx() + 1, mapNow(), opts()); good = r.good; plan = opts().skipDup ? classify(r.good) : r.good.map(g => ({ ...g, kind: 'new' }));
      const miss = missing(); q('imp_warn').textContent = miss.length ? '⚠ ' + T('impMissing') + miss.join(', ') : '';
      const cnt = k => plan.filter(p => p.kind === k).length;
      q('imp_sum').textContent = `${cnt('new')} ${T('impNewN')} · ${cnt('same')} ${T('impSame')} · ${cnt('one')} ${T('impReview')}` + (cnt('skip') ? ` · ${cnt('skip')} ${T('impInFile')}` : '') + ` · ${r.errs.length} ${T('impErr')}`;
      q('imp_tbl').innerHTML = '<tr>' + ['factory', 'time', 'machine', 'issue', 'solution', 'minutes', 'qty'].map(k => `<th style="position:static;padding:4px 8px">${T(k)}</th>`).join('') + '</tr>' +
        r.good.slice(0, 6).map(({ v }) => `<tr>${[v.factory, v.timestamp.replace('T', ' '), (v.machine + ' ' + v.machineNo).trim(), v.issue.slice(0, 50), v.solution.slice(0, 50), v.minutes, v.qty].map(x => `<td style="padding:4px 8px">${E(x)}</td>`).join('')}</tr>`).join('');
      q('imp_err').innerHTML = r.errs.slice(0, 30).map(E).join('<br>') + (r.errs.length > 30 ? '<br>…' : '');
      q('imp_go').disabled = busy || !r.good.length;
    };
    const onMap = f => {                                                // choosing a column that another field already uses = swap the two (move)
      const nv = +q('imp_m_' + f).value, old = curMap[f]; let note = '';
      if (nv >= 0) { const g = IMP_FIELDS.find(x => x !== f && curMap[x] === nv && !(x === 'solution' && comb())); if (g) { curMap[g] = old; autoSet.delete(g); note = T('impSwapped') + labelOf(g); } }
      curMap[f] = nv; autoSet.delete(f); paint(); preview(); if (note) toast(note);
    };
    const buildMap = () => {
      if (!isPaste) grid = readGrid(wb.Sheets[q('imp_sheet').value]);
      const heads = grid[hdrIdx()] || [], rows = grid.slice(hdrIdx() + 1), am = autoMap(heads); guessByContent(rows, am);
      autoSet = new Set(IMP_FIELDS.filter(f => am[f] >= 0)); curMap = am;
      const op = `<option value="-1">${T('impNone')}</option>` + heads.map((h, i) => `<option value="${i}">${colL(i)} · ${E(String(h).replace(/\s+/g, ' ').slice(0, 40))}</option>`).join('');
      q('imp_map').innerHTML = IMP_FIELDS.map(f => `<div class="pra-f"><label>${labelOf(f)} <span id="imp_t_${f}" style="font-size:10px;font-weight:600"></span></label><select id="imp_m_${f}">${op}</select><div class="lbl" id="imp_s_${f}" style="margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div></div>`).join('');
      IMP_FIELDS.forEach(f => { q('imp_m_' + f).onchange = () => onMap(f); });
      const det = detectComb(rows, am); q('imp_sm_comb').checked = !!det; q('imp_sm_sep').checked = !det; if (det) q('imp_sep').value = det;   // one cell holds both -> pre-select 'combined'
      paint(); preview();
    };
    if (isPaste) { let tm; q('imp_text').oninput = () => { clearTimeout(tm); tm = setTimeout(() => { grid = parsePaste(q('imp_text').value); q('imp_cfg').style.display = grid.length > 1 ? '' : 'none'; if (grid.length > 1) buildMap(); else { good = []; q('imp_go').disabled = true; } }, 250); }; }
    else q('imp_file').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try {
        wb = /\.(csv|txt)$/i.test(f.name) ? XLSX.read((await f.text()).replace(/^\uFEFF/, ''), { type: 'string', raw: true }) : XLSX.read(await f.arrayBuffer(), { type: 'array', cellNF: true });
        q('imp_sheet').innerHTML = wb.SheetNames.map(n => `<option>${E(n)}</option>`).join(''); q('imp_cfg').style.display = ''; buildMap();
      } catch (err) { console.error(err); toast(T('impBadFile'), true); }
    };
    q('imp_sheet').onchange = buildMap; q('imp_hdr').oninput = buildMap; ['imp_ord', 'imp_fac', 'imp_dup'].forEach(id => (q(id).onchange = preview));
    ['imp_sm_sep', 'imp_sm_comb'].forEach(id => (q(id).onchange = () => { paint(); preview(); })); q('imp_sep').onchange = preview;
    const close = () => { if (busy) return; importDlg(mode); };                // back to an empty import box
    q('imp_cancel').onclick = close;
    q('imp_go').onclick = async () => {
      if (!plan.length) return;
      const rv = plan.filter(p => p.kind === 'one'), ch = new Map();
      if (rv.length) { const c = await reviewDlg(rv.map(p => ({ v: p.v, hit: p.hit, label: `${T('impRow')} ${p.rowNo}` }))); if (!c) return; rv.forEach((p, i) => ch.set(p, c[i])); }
      const pin = await ensurePin(); if (!pin) return;
      busy = true; q('imp_go').disabled = q('imp_cancel').disabled = true; let ok = 0, fail = 0, gasFail = 0, ow = 0, kept = 0; const errs = [];
      for (let i = 0; i < plan.length; i++) {
        const p = plan[i]; q('imp_prog').textContent = `${T('impBusy')} ${i + 1} / ${plan.length}`;
        let target = null;
        if (p.kind === 'skip') continue;
        if (p.kind === 'same') target = p.hit.row;
        else if (p.kind === 'one') { const c = ch.get(p); if (c === 'keep') { kept++; continue; } if (c === 'overwrite') target = p.hit.row; }
        try { const r = await saveOne(pin, p.v, target); ok++; if (target) ow++; if (r.gasErr) gasFail++; }
        catch (e) { fail++; errs.push(`${T('impRow')} ${p.rowNo}: ${e.message}`); if (e.message === T('badPin')) break; }
      }
      busy = false; toast(`${T('impDone')} ${ok}` + (ow ? ` · ${T('impOver')} ${ow}` : '') + (kept ? ` · ${T('impKept')} ${kept}` : '') + (fail ? ` · ${T('impFailed')} ${fail}` : '') + (gasFail ? ` · ${T('sheetFail')}${gasFail}` : ''), !!(fail || gasFail));
      await load(); if (fail) { q('imp_err').innerHTML = errs.slice(0, 30).map(E).join('<br>'); q('imp_prog').textContent = ''; q('imp_cancel').disabled = false; good = []; } else { q('imp_cancel').disabled = false; close(); }
    };
  }
  /* ---------- "Add data" tab: form | paste | file (no pop-up chooser) ---------- */
  let addMethod = 'form', mountedLang = '';
  function unmount() { const h = q('praAddHost'); if (h) h.innerHTML = ''; mountedLang = ''; }
  function mount(force) {
    const h = q('praAddHost'); if (!h) return;
    if (!force && mountedLang === lang && h.firstChild) return;      // keep what the person typed while data reloads
    mountedLang = lang;
    h.innerHTML = `<div class="font-semibold mb-1">${T('add')}</div><div class="lbl mb-2">${T('tabHint')}</div>
      <div class="flex flex-wrap gap-1.5 mb-3" id="praMethods">${[['form', '✎ ' + T('viaForm')], ['paste', '📋 ' + T('viaPaste')], ['file', '⇪ ' + T('viaFile')]].map(([k, l]) => `<button class="btn${addMethod === k ? ' primary' : ''}" data-m="${k}">${l}</button>`).join('')}</div>
      <div id="praAddForm"></div><div id="praAddImp"></div>`;
    h.querySelectorAll('[data-m]').forEach(b => (b.onclick = () => { addMethod = b.dataset.m; mount(true); }));
    if (addMethod === 'form') open(); else importDlg(addMethod);
  }
  /* ---------- toast (shows above open <dialog> top-layer too) ---------- */
  const toast = (msg, err) => {
    const host = document.querySelector('dialog[open]') || document.body;
    const d = document.createElement('div');
    d.className = 'pra-toast' + (err ? ' err' : '');
    if (host !== document.body) {
      d.style.position = 'fixed';
      d.style.zIndex = '2147483647';
    }
    d.textContent = msg;
    host.appendChild(d);
    setTimeout(() => d.remove(), err ? 7000 : 2400);
  };
  return { open, menu, del, delMany, confirm: confirmRow, applyFix, mount };
})();
