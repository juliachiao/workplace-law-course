/* ============================================================
   admin.js — 管理後台邏輯
   ============================================================ */

const Admin = (function () {

  function toast(msg, type = '') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast show ' + type;
    setTimeout(() => el.classList.remove('show'), 2500);
  }

  // ===== 登入 =====
  function bindLogin() {
    document.getElementById('admin-login-form').addEventListener('submit', e => {
      e.preventDefault();
      const u = document.getElementById('admin-username').value.trim();
      const p = document.getElementById('admin-password').value;
      try {
        Data.loginAdmin(u, p);
        enterAdmin();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  }

  function enterAdmin() {
    document.getElementById('admin-login-page').classList.add('hidden');
    document.getElementById('admin-page').classList.remove('hidden');
    bindMenu();
    showPage('dashboard');
  }

  function bindMenu() {
    document.querySelectorAll('.sidebar-menu a[data-page]').forEach(a => {
      a.addEventListener('click', () => {
        document.querySelectorAll('.sidebar-menu a').forEach(x => x.classList.remove('active'));
        a.classList.add('active');
        showPage(a.dataset.page);
      });
    });
    document.getElementById('admin-logout').addEventListener('click', () => {
      if (confirm('確定要登出後台?')) {
        Data.logoutAdmin();
        location.reload();
      }
    });
  }

  function showPage(p) {
    ({
      dashboard:     renderDashboard,
      employees:     renderEmployees,
      videos:        renderVideos,
      learning:      renderLearning,
      logs:          renderLogs,
      export:        renderExport,
      deadline:      renderDeadline,
      announcements: renderAnnouncements
    }[p] || renderDashboard)();
  }

  // ===== 公告欄管理 =====
  function renderAnnouncements() {
    const list = Data.getAnnouncements();
    const typeLabel = { info: '一般', warning: '注意', urgent: '緊急' };
    const typeColor = { info: '#5a6b8c', warning: '#e67e22', urgent: '#c0392b' };

    document.getElementById('admin-content').innerHTML = `
      <div class="admin-header">
        <h1>公告欄管理</h1>
      </div>

      <div class="stat-card" style="margin-bottom:24px;">
        <h3 style="margin-bottom:16px;">新增公告</h3>
        <div class="form-group">
          <label>公告標題 *</label>
          <input type="text" id="ann-title" placeholder="請輸入公告標題" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:8px; font-size:14px; font-family:inherit;" />
        </div>
        <div class="form-group">
          <label>公告內容 *</label>
          <textarea id="ann-content" rows="4" placeholder="請輸入公告內容..." style="width:100%; padding:10px; border:1px solid var(--border); border-radius:8px; font-size:14px; font-family:inherit; resize:vertical;"></textarea>
        </div>
        <div style="display:flex; gap:16px; flex-wrap:wrap;">
          <div class="form-group" style="flex:1; min-width:160px;">
            <label>公告類型</label>
            <select id="ann-type" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:8px; font-size:14px;">
              <option value="info">📘 一般通知</option>
              <option value="warning">⚠️ 注意事項</option>
              <option value="urgent">🚨 緊急公告</option>
            </select>
          </div>
          <div class="form-group" style="flex:1; min-width:160px;">
            <label>到期日 (選填，到期後不顯示)</label>
            <input type="date" id="ann-expiry" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:8px; font-size:14px;" />
          </div>
        </div>
        <button class="btn btn-primary" id="btn-add-ann" style="margin-top:8px;">發布公告</button>
      </div>

      <h3 style="margin-bottom:16px;">已發布公告 (${list.length} 則)</h3>
      <div id="ann-list">
        ${list.length === 0 ? '<div style="text-align:center; padding:40px; color:var(--text-light);">目前沒有公告</div>' :
          list.map(a => {
            const expired = a.expiry && new Date(a.expiry) < new Date();
            return `
            <div class="ann-item" data-id="${a.id}" style="background:#fff; border:1px solid var(--border); border-left:4px solid ${typeColor[a.type] || '#5a6b8c'}; border-radius:8px; padding:16px 20px; margin-bottom:12px; ${expired ? 'opacity:0.5;' : ''}">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
                <div style="flex:1;">
                  <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                    <span style="background:${typeColor[a.type] || '#5a6b8c'}; color:#fff; font-size:11px; padding:2px 8px; border-radius:4px;">${typeLabel[a.type] || a.type}</span>
                    ${expired ? '<span style="background:#999; color:#fff; font-size:11px; padding:2px 8px; border-radius:4px;">已到期</span>' : ''}
                    <strong style="font-size:15px;">${escapeHtml(a.title)}</strong>
                  </div>
                  <div style="color:var(--text-light); font-size:13px; white-space:pre-wrap;">${escapeHtml(a.content)}</div>
                  <div style="margin-top:8px; font-size:12px; color:#aaa;">
                    發布時間：${formatTime(a.createdAt)}
                    ${a.expiry ? `　到期日：${a.expiry}` : ''}
                  </div>
                </div>
                <button class="btn btn-danger btn-sm" onclick="Admin.deleteAnn('${a.id}')" style="flex-shrink:0; padding:6px 14px; font-size:13px;">刪除</button>
              </div>
            </div>`;
          }).join('')}
      </div>
    `;

    document.getElementById('btn-add-ann').onclick = () => {
      const title = document.getElementById('ann-title').value.trim();
      const content = document.getElementById('ann-content').value.trim();
      const type = document.getElementById('ann-type').value;
      const expiry = document.getElementById('ann-expiry').value;
      if (!title || !content) { toast('請填寫標題與內容', 'error'); return; }
      Data.addAnnouncement({ title, content, type, expiry: expiry || null });
      toast('公告已發布', 'success');
      renderAnnouncements();
    };
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ===== 截止日設定 =====
  function renderDeadline() {
    const current = Data.getDeadline();
    const today = new Date().toISOString().split('T')[0];
    let statusHTML = '';
    if (current) {
      const d = new Date(current);
      const daysLeft = Math.ceil((d - new Date()) / 86400000);
      const label = daysLeft < 0
        ? `<span style="color:#d04040;">已逾期 ${Math.abs(daysLeft)} 天</span>`
        : daysLeft === 0
          ? `<span style="color:#d04040;">今天截止</span>`
          : `<span style="color:#4a8a4a;">距今還有 ${daysLeft} 天</span>`;
      statusHTML = `<div style="margin-top:12px; font-size:14px;">目前截止日：<strong>${current}</strong>　${label}</div>`;
    } else {
      statusHTML = `<div style="margin-top:12px; font-size:14px; color:var(--text-light);">目前尚未設定截止日</div>`;
    }

    document.getElementById('admin-content').innerHTML = `
      <div class="admin-header"><h1>完課截止日設定</h1></div>
      <div class="stat-card" style="max-width:560px;">
        <h3 style="margin-bottom:20px; letter-spacing:2px;">⏰ 設定員工完課期限</h3>
        <p style="color:var(--text-light); font-size:14px; margin-bottom:20px; line-height:1.7;">
          設定後，員工登入時將看到「距離完課截止日 X 天」的提醒橫幅。<br>
          逾期 3 天內顯示橘色警告，當天或逾期顯示紅色緊急提示。
        </p>
        <div class="form-group">
          <label>完課截止日期</label>
          <input type="date" id="deadline-input" min="${today}"
            value="${current || ''}"
            style="padding:10px 14px; border:1px solid var(--border); border-radius:8px; font-size:15px; font-family:inherit; width:220px;" />
        </div>
        ${statusHTML}
        <div style="display:flex; gap:12px; margin-top:24px;">
          <button class="btn btn-primary" id="save-deadline-btn">儲存截止日</button>
          ${current ? `<button class="btn btn-secondary" id="clear-deadline-btn">清除設定</button>` : ''}
        </div>
      </div>
    `;

    document.getElementById('save-deadline-btn').addEventListener('click', () => {
      const val = document.getElementById('deadline-input').value;
      if (!val) { toast('請選擇日期', 'error'); return; }
      Data.setDeadline(val);
      toast('截止日已儲存', 'success');
      renderDeadline();
    });

    const clrBtn = document.getElementById('clear-deadline-btn');
    if (clrBtn) clrBtn.addEventListener('click', () => {
      Data.clearDeadline();
      toast('截止日已清除', 'success');
      renderDeadline();
    });
  }

  // ===== 課程影片設定 =====
  function renderVideos() {
    const all = [
      ...Data.COURSES.new_employee.map(c => ({...c, role:'new_employee'})),
      ...Data.COURSES.manager.map(c => ({...c, role:'manager'}))
    ];

    document.getElementById('admin-content').innerHTML = `
      <div class="admin-header">
        <h1>課程影片設定</h1>
      </div>

      <div class="stat-card" style="margin-bottom:24px; background:rgba(170,184,208,0.1);">
        <strong>📌 設定方式</strong>
        <ul style="margin:12px 0 0 24px; line-height:1.9; color:var(--text-light); font-size:14px;">
          <li>將影片檔案 (.mp4) 放入 <code style="background:#fff; padding:2px 8px; border-radius:4px;">platform/videos/</code> 資料夾,再填入路徑 (如 <code style="background:#fff; padding:2px 8px; border-radius:4px;">videos/pdpa.mp4</code>)</li>
          <li>也支援任何外部影片 URL (例如 CDN、YouTube 直連、雲端儲存)</li>
          <li>員工觀看時,系統會自動記錄觀看時長、跳轉行為、是否真的看完 (預設門檻 90%)</li>
        </ul>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>課程</th>
            <th>身份</th>
            <th>影片網址 / 路徑</th>
            <th>顯示名稱</th>
            <th>狀態</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${all.map(c => {
            const cfg = Data.getVideoConfig(c.id);
            return `
              <tr>
                <td><strong>${c.icon} ${c.title}</strong></td>
                <td><span class="tag ${c.role === 'manager' ? 'tag-pink' : 'tag-blue'}">${c.role === 'manager' ? '主管' : '新進'}</span></td>
                <td>
                  <input type="text" id="vurl-${c.id}" value="${cfg.url || ''}" placeholder="videos/${c.id}.mp4 或 https://..."
                         style="width:100%; padding:6px 10px; border:1px solid var(--border); border-radius:6px; background:rgba(255,255,255,0.8);" />
                </td>
                <td>
                  <input type="text" id="vtitle-${c.id}" value="${cfg.title || ''}" placeholder="(選填)"
                         style="width:160px; padding:6px 10px; border:1px solid var(--border); border-radius:6px; background:rgba(255,255,255,0.8);" />
                </td>
                <td>${cfg.url ? '<span class="tag tag-green">已設定</span>' : '<span class="tag tag-gray">未設定</span>'}</td>
                <td>
                  <button class="icon-btn" onclick="Admin.saveVideo('${c.id}')">儲存</button>
                  <button class="icon-btn danger" onclick="Admin.clearVideo('${c.id}')">清除</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  function saveVideo(courseId) {
    const url = document.getElementById('vurl-' + courseId).value.trim();
    const title = document.getElementById('vtitle-' + courseId).value.trim();
    if (!url) {
      toast('請輸入影片網址', 'error');
      return;
    }
    Data.setVideoConfig(courseId, { url, title });
    toast('影片設定已儲存', 'success');
    renderVideos();
  }

  function clearVideo(courseId) {
    if (!confirm('清除此課程的影片設定?')) return;
    Data.clearVideoConfig(courseId);
    toast('已清除', 'success');
    renderVideos();
  }

  // ===== 儀表板 =====
  function renderDashboard() {
    const stats = Data.getStats();
    const main = document.getElementById('admin-content');

    main.innerHTML = `
      <div class="admin-header">
        <h1>儀表板</h1>
        <div style="color:var(--text-light); font-size:14px;">${new Date().toLocaleString('zh-TW')}</div>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">總員工數</div>
          <div class="stat-value">${stats.totalEmployees}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">啟用中</div>
          <div class="stat-value green">${stats.activeEmployees}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">完成課程數</div>
          <div class="stat-value orange">${stats.completedCourses} / ${stats.totalCourses}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">整體完成率</div>
          <div class="stat-value">${stats.completionRate}%</div>
        </div>
      </div>

      <div class="stat-card" style="margin-bottom:20px;">
        <h3 style="margin-bottom:16px; letter-spacing:2px;">📊 各課程完成情形</h3>
        ${renderCourseStats()}
      </div>

      <div class="stat-card">
        <h3 style="margin-bottom:16px; letter-spacing:2px;">🕒 最近登入紀錄</h3>
        ${renderRecentLogs()}
      </div>
    `;
  }

  function renderCourseStats() {
    const employees = Data.getEmployees();
    const all = [...Data.COURSES.new_employee.map(c => ({...c, role:'new_employee'})),
                 ...Data.COURSES.manager.map(c => ({...c, role:'manager'}))];

    return all.map(c => {
      const targets = employees.filter(e => e.role === c.role && e.active);
      const done = targets.filter(e => Data.getProgress(e.empId, c.id).completed).length;
      const pct = targets.length ? Math.round(done * 100 / targets.length) : 0;
      return `
        <div style="margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span>${c.icon} ${c.title} <span style="color:var(--text-light); font-size:12px;">(${c.role === 'manager' ? '主管' : '新進'})</span></span>
            <span style="color:var(--text-light); font-size:13px;">${done} / ${targets.length} (${pct}%)</span>
          </div>
          <div class="progress-bar" style="width:100%;">
            <div class="progress-fill" style="width:${pct}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderRecentLogs() {
    const logs = Data.getLogs().slice(-10).reverse();
    if (!logs.length) return '<div class="empty-state">尚無紀錄</div>';
    return `
      <table class="data-table" style="background: transparent; box-shadow:none;">
        <thead><tr><th>時間</th><th>員工</th><th>動作</th><th>內容</th></tr></thead>
        <tbody>
          ${logs.map(l => {
            const emp = Data.getEmployee(l.empId);
            return `<tr>
              <td>${formatTime(l.at)}</td>
              <td>${emp ? emp.name : l.empId}</td>
              <td>${typeLabel(l.type)}</td>
              <td>${l.detail || '-'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  // ===== 員工管理 =====
  function renderEmployees() {
    const employees = Data.getEmployees();
    document.getElementById('admin-content').innerHTML = `
      <div class="admin-header">
        <h1>員工管理</h1>
        <div>
          <button class="btn btn-secondary" id="btn-import">📥 匯入 CSV</button>
          <button class="btn btn-primary" id="btn-add-emp">+ 新增員工</button>
        </div>
      </div>

      <div class="action-bar">
        <input type="text" class="search-input" id="emp-search" placeholder="🔍 搜尋員工編號 / 姓名 / 部門..." />
        <select class="search-input" id="emp-role-filter" style="flex:0 0 180px;">
          <option value="">全部身份</option>
          <option value="new_employee">新進人員</option>
          <option value="manager">主管</option>
        </select>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>員工編號</th>
            <th>姓名</th>
            <th>Email</th>
            <th>部門</th>
            <th>身份</th>
            <th>狀態</th>
            <th>建立日</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody id="emp-tbody"></tbody>
      </table>
    `;

    renderEmpRows(employees);

    document.getElementById('btn-add-emp').addEventListener('click', () => openEmpModal());
    document.getElementById('btn-import').addEventListener('click', () => {
      document.getElementById('import-modal').classList.add('show');
    });

    document.getElementById('emp-search').addEventListener('input', filterEmps);
    document.getElementById('emp-role-filter').addEventListener('change', filterEmps);

    bindEmpForm();
    bindImport();
  }

  function filterEmps() {
    const kw = document.getElementById('emp-search').value.toLowerCase();
    const role = document.getElementById('emp-role-filter').value;
    let list = Data.getEmployees();
    if (kw) list = list.filter(e =>
      e.empId.toLowerCase().includes(kw) ||
      e.name.toLowerCase().includes(kw) ||
      (e.dept || '').toLowerCase().includes(kw)
    );
    if (role) list = list.filter(e => e.role === role);
    renderEmpRows(list);
  }

  function renderEmpRows(list) {
    const tbody = document.getElementById('emp-tbody');
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:40px;">無資料</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(e => `
      <tr>
        <td><strong>${e.empId}</strong></td>
        <td>${e.name}</td>
        <td>${e.email || '-'}</td>
        <td>${e.dept || '-'}</td>
        <td><span class="tag ${e.role === 'manager' ? 'tag-pink' : 'tag-blue'}">${e.role === 'manager' ? '主管' : '新進'}</span></td>
        <td>${e.active !== false ? '<span class="tag tag-green">啟用</span>' : '<span class="tag tag-gray">停用</span>'}</td>
        <td>${e.createdAt ? e.createdAt.slice(0,10) : '-'}</td>
        <td>
          <button class="icon-btn" onclick="Admin.editEmp('${e.empId}')">編輯</button>
          <button class="icon-btn" onclick="Admin.toggleEmp('${e.empId}')">${e.active !== false ? '停用' : '啟用'}</button>
          <button class="icon-btn danger" onclick="Admin.deleteEmp('${e.empId}')">刪除</button>
        </td>
      </tr>
    `).join('');
  }

  function openEmpModal(emp) {
    document.getElementById('emp-modal-title').textContent = emp ? '編輯員工' : '新增員工';
    document.getElementById('emp-orig-id').value = emp ? emp.empId : '';
    document.getElementById('emp-id').value = emp ? emp.empId : '';
    document.getElementById('emp-id').disabled = !!emp;
    document.getElementById('emp-name').value = emp ? emp.name : '';
    document.getElementById('emp-email').value = emp ? (emp.email || '') : '';
    document.getElementById('emp-dept').value = emp ? (emp.dept || '') : '';
    document.getElementById('emp-role').value = emp ? emp.role : 'new_employee';
    document.getElementById('emp-password').value = '';
    document.getElementById('emp-modal').classList.add('show');
  }

  function bindEmpForm() {
    const form = document.getElementById('emp-form');
    form.onsubmit = e => {
      e.preventDefault();
      const orig = document.getElementById('emp-orig-id').value;
      const data = {
        empId: document.getElementById('emp-id').value.trim(),
        name: document.getElementById('emp-name').value.trim(),
        email: document.getElementById('emp-email').value.trim(),
        dept: document.getElementById('emp-dept').value.trim(),
        role: document.getElementById('emp-role').value,
        password: document.getElementById('emp-password').value || undefined
      };
      try {
        if (orig) {
          Data.updateEmployee(orig, data);
          toast('員工資料已更新', 'success');
        } else {
          Data.addEmployee(data);
          toast('新增成功!預設密碼為員工編號', 'success');
        }
        document.getElementById('emp-modal').classList.remove('show');
        renderEmployees();
      } catch (err) {
        toast(err.message, 'error');
      }
    };
  }

  function bindImport() {
    document.getElementById('csv-file').onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const result = Data.importEmployeesFromCSV(reader.result);
          const box = document.getElementById('import-result');
          box.style.display = 'block';
          box.innerHTML = `
            <div style="padding:16px; background: ${result.failed === 0 ? '#d4ecd4' : '#fff4cc'}; border-radius:8px;">
              <strong>${result.failed === 0 ? '✅' : '⚠️'} 匯入結果:</strong>
              成功 ${result.success} 筆,失敗 ${result.failed} 筆
              ${result.errors.length ? '<div style="margin-top:8px; font-size:13px; color:var(--accent-red);">' + result.errors.map(e => '• ' + e).join('<br>') + '</div>' : ''}
            </div>
          `;
          if (result.success > 0) {
            toast(`成功匯入 ${result.success} 筆員工資料`, 'success');
            setTimeout(() => {
              document.getElementById('import-modal').classList.remove('show');
              renderEmployees();
            }, 1500);
          }
        } catch (err) {
          toast(err.message, 'error');
        }
      };
      reader.readAsText(file, 'UTF-8');
    };

    document.getElementById('download-sample').onclick = () => {
      const csv = '﻿empId,name,email,dept,role,password\nE101,張三,zhang@systex.com,研發部,new_employee,\nE102,李四,li@systex.com,業務部,manager,\nE103,王五,wang@systex.com,行銷部,new_employee,';
      Data.downloadFile('員工匯入範例.csv', csv);
    };
  }

  // ===== 學習狀況 =====
  function renderLearning() {
    document.getElementById('admin-content').innerHTML = `
      <div class="admin-header">
        <h1>學習狀況</h1>
        <button class="btn btn-primary" id="btn-export-learning">📥 匯出學習紀錄</button>
      </div>

      <div class="action-bar">
        <input type="text" class="search-input" id="learn-search" placeholder="🔍 搜尋員工..." />
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>員工編號</th>
            <th>姓名</th>
            <th>部門</th>
            <th>身份</th>
            <th>學習進度</th>
            <th>最後登入</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody id="learn-tbody"></tbody>
      </table>
    `;

    renderLearnRows(Data.getEmployees());

    document.getElementById('learn-search').addEventListener('input', e => {
      const kw = e.target.value.toLowerCase();
      renderLearnRows(Data.getEmployees().filter(em =>
        em.empId.toLowerCase().includes(kw) ||
        em.name.toLowerCase().includes(kw) ||
        (em.dept || '').toLowerCase().includes(kw)
      ));
    });

    document.getElementById('btn-export-learning').addEventListener('click', () => {
      const csv = Data.exportLearningRecordsToCSV();
      Data.downloadFile(`學習紀錄_${new Date().toISOString().slice(0,10)}.csv`, csv);
      toast('學習紀錄已匯出', 'success');
    });
  }

  function renderLearnRows(list) {
    const tbody = document.getElementById('learn-tbody');
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px;">無資料</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(e => {
      const p = Data.getEmployeeOverallProgress(e.empId);
      const logs = Data.getLogs(e.empId).filter(l => l.type === 'login');
      const lastLogin = logs.length ? logs[logs.length - 1].at : null;
      return `
        <tr>
          <td><strong>${e.empId}</strong></td>
          <td>${e.name}</td>
          <td>${e.dept || '-'}</td>
          <td><span class="tag ${e.role === 'manager' ? 'tag-pink' : 'tag-blue'}">${e.role === 'manager' ? '主管' : '新進'}</span></td>
          <td>
            <div class="progress-bar"><div class="progress-fill" style="width:${p.percent}%;"></div></div>
            <span style="font-size:13px;">${p.completed}/${p.total} (${p.percent}%)</span>
          </td>
          <td>${lastLogin ? formatTime(lastLogin) : '<span style="color:#bbb;">尚未登入</span>'}</td>
          <td>
            <button class="icon-btn" onclick="Admin.showDetail('${e.empId}')">查看詳情</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function showDetail(empId) {
    const emp = Data.getEmployee(empId);
    if (!emp) return;
    const courses = Data.COURSES[emp.role] || [];
    const logs = Data.getLogs(empId).slice(-20).reverse();

    document.getElementById('detail-title').textContent = `${emp.name} (${emp.empId}) 的學習詳情`;
    document.getElementById('detail-body').innerHTML = `
      <div style="margin-bottom:24px;">
        <strong>基本資料</strong><br>
        <div style="margin-top:8px; color:var(--text-light); font-size:14px;">
          部門: ${emp.dept || '-'} | Email: ${emp.email || '-'} | 身份: ${emp.role === 'manager' ? '主管人員' : '新進人員'}
        </div>
      </div>

      <h4 style="margin-bottom:12px;">課程進度</h4>
      <table class="data-table" style="margin-bottom:24px;">
        <thead><tr><th>課程</th><th>影片觀看率</th><th>觀看時長</th><th>測驗</th><th>狀態</th><th>最後</th></tr></thead>
        <tbody>
          ${courses.map(c => {
            const p = Data.getProgress(empId, c.id);
            const dur = p.videoDuration || 0;
            const watched = p.videoWatchedSeconds || 0;
            const ratio = dur ? Math.round(watched * 100 / dur) : (p.videoWatched ? 100 : 0);
            return `<tr>
              <td>${c.icon} ${c.title}</td>
              <td>
                <div class="progress-bar"><div class="progress-fill" style="width:${ratio}%;"></div></div>
                <span style="font-size:12px;">${ratio}%</span>
              </td>
              <td style="font-size:12px;">${formatSecAdmin(watched)} / ${formatSecAdmin(dur)}</td>
              <td>${p.quizScore != null ? p.quizScore + ' 分' : '-'}</td>
              <td>${p.completed ? '<span class="tag tag-green">完成</span>' : (p.videoWatched || p.quizScore != null ? '<span class="tag tag-blue">進行中</span>' : '<span class="tag tag-gray">未開始</span>')}</td>
              <td style="font-size:12px;">${p.lastAt ? formatTime(p.lastAt) : '-'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>

      <h4 style="margin-bottom:12px;">最近活動紀錄</h4>
      <div style="max-height:240px; overflow-y:auto; background:#f9f9f9; padding:12px; border-radius:8px;">
        ${logs.length ? logs.map(l => `
          <div style="padding:6px 0; border-bottom:1px solid #eee; font-size:13px;">
            <span style="color:var(--text-light);">${formatTime(l.at)}</span>
            &nbsp;<span class="tag tag-blue" style="font-size:11px;">${typeLabel(l.type)}</span>
            &nbsp;${l.detail || ''}
          </div>
        `).join('') : '<div style="text-align:center; color:#aaa;">無紀錄</div>'}
      </div>
    `;
    document.getElementById('detail-modal').classList.add('show');
  }

  // ===== 登入紀錄 =====
  function renderLogs() {
    document.getElementById('admin-content').innerHTML = `
      <div class="admin-header">
        <h1>登入與學習紀錄</h1>
        <button class="btn btn-secondary" id="btn-export-logs">📥 匯出全部紀錄</button>
      </div>

      <div class="action-bar">
        <input type="text" class="search-input" id="log-search" placeholder="🔍 搜尋員工編號..." />
        <select class="search-input" id="log-type" style="flex:0 0 200px;">
          <option value="">全部類型</option>
          <option value="login">登入</option>
          <option value="logout">登出</option>
          <option value="enter_course">進入課程</option>
          <option value="video_play">播放影片</option>
          <option value="video_pause">暫停影片</option>
          <option value="video_seek">影片跳轉</option>
          <option value="video_ended">影片結束</option>
          <option value="video_watched">影片達標</option>
          <option value="quiz_submitted">送出測驗</option>
          <option value="course_completed">完成課程</option>
        </select>
      </div>

      <table class="data-table">
        <thead>
          <tr><th>時間</th><th>員工</th><th>姓名</th><th>動作</th><th>詳情</th></tr>
        </thead>
        <tbody id="logs-tbody"></tbody>
      </table>
    `;

    renderLogRows();

    document.getElementById('log-search').addEventListener('input', renderLogRows);
    document.getElementById('log-type').addEventListener('change', renderLogRows);
    document.getElementById('btn-export-logs').addEventListener('click', () => {
      const logs = Data.getLogs();
      const headers = ['時間','員工編號','姓名','類型','內容'];
      const lines = [headers.join(',')];
      logs.forEach(l => {
        const emp = Data.getEmployee(l.empId);
        lines.push([l.at, l.empId, emp ? emp.name : '', typeLabel(l.type), (l.detail || '').replace(/,/g,'、')].join(','));
      });
      Data.downloadFile(`登入紀錄_${new Date().toISOString().slice(0,10)}.csv`, '﻿' + lines.join('\n'));
      toast('紀錄已匯出', 'success');
    });
  }

  function renderLogRows() {
    const kw = document.getElementById('log-search').value.toLowerCase();
    const type = document.getElementById('log-type').value;
    let logs = Data.getLogs().slice().reverse();
    if (kw) logs = logs.filter(l => l.empId.toLowerCase().includes(kw));
    if (type) logs = logs.filter(l => l.type === type);

    const tbody = document.getElementById('logs-tbody');
    if (!logs.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px;">無紀錄</td></tr>';
      return;
    }
    tbody.innerHTML = logs.slice(0, 200).map(l => {
      const emp = Data.getEmployee(l.empId);
      return `<tr>
        <td>${formatTime(l.at)}</td>
        <td><strong>${l.empId}</strong></td>
        <td>${emp ? emp.name : '-'}</td>
        <td><span class="tag tag-blue">${typeLabel(l.type)}</span></td>
        <td>${l.detail || '-'}</td>
      </tr>`;
    }).join('');
  }

  // ===== 匯出專區 =====
  function renderExport() {
    document.getElementById('admin-content').innerHTML = `
      <div class="admin-header">
        <h1>資料匯出</h1>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:20px;">
        <div class="stat-card">
          <h3>👥 員工名單</h3>
          <p style="color:var(--text-light); margin:12px 0;">匯出所有員工帳號清單(CSV 格式)</p>
          <button class="btn btn-primary" id="exp-emp">下載員工名單</button>
        </div>

        <div class="stat-card">
          <h3>📚 學習紀錄</h3>
          <p style="color:var(--text-light); margin:12px 0;">匯出每位員工的課程學習狀況</p>
          <button class="btn btn-primary" id="exp-learn">下載學習紀錄</button>
        </div>

        <div class="stat-card">
          <h3>📝 操作紀錄</h3>
          <p style="color:var(--text-light); margin:12px 0;">匯出所有員工登入與學習行為紀錄</p>
          <button class="btn btn-primary" id="exp-logs">下載操作紀錄</button>
        </div>

        <div class="stat-card" style="border:1px solid #f0c0c0;">
          <h3 style="color:var(--accent-red);">⚠️ 重置示範資料</h3>
          <p style="color:var(--text-light); margin:12px 0;">清空所有資料,還原為預設示範狀態</p>
          <button class="btn btn-danger" id="reset-all">重置所有資料</button>
        </div>
      </div>
    `;

    document.getElementById('exp-emp').onclick = () => {
      Data.downloadFile(`員工名單_${new Date().toISOString().slice(0,10)}.csv`, Data.exportEmployeesToCSV());
      toast('員工名單已匯出', 'success');
    };
    document.getElementById('exp-learn').onclick = () => {
      Data.downloadFile(`學習紀錄_${new Date().toISOString().slice(0,10)}.csv`, Data.exportLearningRecordsToCSV());
      toast('學習紀錄已匯出', 'success');
    };
    document.getElementById('exp-logs').onclick = () => {
      const logs = Data.getLogs();
      const headers = ['時間','員工編號','類型','內容'];
      const lines = [headers.join(',')];
      logs.forEach(l => lines.push([l.at, l.empId, typeLabel(l.type), (l.detail || '').replace(/,/g,'、')].join(',')));
      Data.downloadFile(`操作紀錄_${new Date().toISOString().slice(0,10)}.csv`, '﻿' + lines.join('\n'));
      toast('操作紀錄已匯出', 'success');
    };
    document.getElementById('reset-all').onclick = () => {
      if (confirm('將清空所有員工、學習紀錄並還原預設資料,確定?')) {
        Data.resetAll();
        toast('已重置,請重新登入', 'success');
        setTimeout(() => location.reload(), 1200);
      }
    };
  }

  // ===== 工具 =====
  function formatTime(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return `${d.getFullYear()}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  }

  function typeLabel(t) {
    return ({
      login: '登入',
      logout: '登出',
      enter_course: '進入課程',
      video_play: '播放影片',
      video_pause: '暫停影片',
      video_seek: '影片跳轉',
      video_ended: '影片結束',
      video_watched: '影片達標',
      quiz_submitted: '送出測驗',
      course_completed: '完成課程'
    })[t] || t;
  }

  function formatSecAdmin(s) {
    s = Math.floor(s || 0);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2,'0')}`;
  }

  // ===== 外部呼叫 =====
  function editEmp(id) { openEmpModal(Data.getEmployee(id)); }
  function saveVideoExt(id) { saveVideo(id); }
  function clearVideoExt(id) { clearVideo(id); }
  function toggleEmp(id) {
    const emp = Data.getEmployee(id);
    Data.updateEmployee(id, { active: !(emp.active !== false) });
    renderEmployees();
  }
  function deleteEmp(id) {
    if (confirm('確定刪除此員工?其學習紀錄一併刪除。')) {
      Data.deleteEmployee(id);
      toast('員工已刪除', 'success');
      renderEmployees();
    }
  }

  function deleteAnn(id) {
    if (confirm('確定刪除此公告?')) {
      Data.deleteAnnouncement(id);
      toast('公告已刪除', 'success');
      renderAnnouncements();
    }
  }

  function start() {
    bindLogin();
    if (Data.getCurrentAdmin()) enterAdmin();
  }

  return { start, editEmp, toggleEmp, deleteEmp, showDetail, saveVideo, clearVideo, deleteAnn };
})();

document.addEventListener('DOMContentLoaded', Admin.start);
