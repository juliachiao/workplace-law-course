/* ========================================================
   data.js — 共用資料層 (localStorage)
   - employees:      員工帳號清單
   - currentUser:    當前登入員工
   - currentAdmin:   當前登入管理員
   - learningLogs:   學習行為紀錄
   - progress:       每位員工每門課程的學習進度
   ======================================================== */

const Data = (function () {
  const KEYS = {
    EMPLOYEES: 'tp_employees',
    CURRENT_USER: 'tp_current_user',
    CURRENT_ADMIN: 'tp_current_admin',
    LOGS: 'tp_learning_logs',
    PROGRESS: 'tp_progress',
    ADMINS: 'tp_admins',
    VIDEO_CONFIG: 'tp_video_config',
    CONFIG_VERSION: 'tp_config_version',
    DEADLINE: 'tp_deadline',
    ANNOUNCEMENTS: 'tp_announcements',
    NOTICES_READ: 'tp_notices_read',
    WRONG_ANSWERS: 'tp_wrong_answers',
    BOOKMARKS: 'tp_bookmarks'
  };

  // 內建課程資料 (對應 PDF 內容)
  const COURSES = {
    new_employee: [
      { id: 'pdpa',       title: '個資管理與實務',   icon: '📇', desc: '了解個人資料保護法規範與實務應用' },
      { id: 'osh',        title: '職業安全衛生',     icon: '🛡️', desc: '職場安全與衛生基本知識' },
      { id: 'ai_policy',  title: 'AI 使用管理辦法',  icon: '🤖', desc: '人工智慧使用規範與倫理' },
      { id: 'infosec',    title: '資訊安全通識',     icon: '🔐', desc: '資安基本概念與威脅防範' }
    ],
    manager: [
      { id: 'bullying',   title: '職場霸凌預防舉措', icon: '🚫', desc: '預防職場不法侵害管理者責任' },
      { id: 'harassment', title: '職場性騷擾防治',   icon: '⚠️', desc: '主管在性騷擾防治的法定責任' }
    ]
  };

  // 取/存
  function get(key, def) {
    const v = localStorage.getItem(key);
    if (!v) return def;
    try { return JSON.parse(v); } catch { return def; }
  }
  function set(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  // ===== 初始化預設管理員與示範員工 =====
  function init() {
    const admins = get(KEYS.ADMINS, null);
    if (!admins) {
      set(KEYS.ADMINS, [
        { username: 'admin', password: 'admin123', name: '系統管理員' }
      ]);
    }
    const emps = get(KEYS.EMPLOYEES, null);
    if (!emps) {
      set(KEYS.EMPLOYEES, [
        { empId: 'E001', name: '王小明', email: 'ming@systex.com', dept: '研發部', role: 'new_employee', password: 'E001', active: true, createdAt: new Date().toISOString() },
        { empId: 'E002', name: '陳大華', email: 'hua@systex.com', dept: '業務部', role: 'manager',      password: 'E002', active: true, createdAt: new Date().toISOString() },
        { empId: 'E003', name: '林美玲', email: 'ling@systex.com', dept: '人資部', role: 'new_employee', password: 'E003', active: true, createdAt: new Date().toISOString() }
      ]);
    }
    if (!get(KEYS.LOGS, null)) set(KEYS.LOGS, []);
    if (!get(KEYS.PROGRESS, null)) set(KEYS.PROGRESS, {});
    // ===== 內容版本控管 =====
    // 每次想強制讓所有訪客（不管新舊瀏覽器）都套用最新的影片設定,
    // 只要把下面這個數字加 1,存檔重新上傳,大家打開網站就會自動套用最新版本。
    const CURRENT_CONFIG_VERSION = 3;

    // 這裡列出「目前最新、正確」的影片設定,以後新增/更換課程影片,直接改這裡
    const LATEST_VIDEO_CONFIG = {
      infosec: { url: 'https://youtu.be/6alE9ARHadI', title: '資訊安全通識教材' },
      pdpa:    { url: 'https://youtu.be/tM3N_2ZEMZo', title: '個資管理與實務教材' }
    };

    const storedVersion = get(KEYS.CONFIG_VERSION, 0);
    if (storedVersion < CURRENT_CONFIG_VERSION) {
      // 版本落後,合併最新設定(保留其他未列出的課程設定,只強制更新這裡列出的項目)
      set(KEYS.VIDEO_CONFIG, { ...get(KEYS.VIDEO_CONFIG, {}), ...LATEST_VIDEO_CONFIG });
      set(KEYS.CONFIG_VERSION, CURRENT_CONFIG_VERSION);
    } else if (!get(KEYS.VIDEO_CONFIG, null)) {
      set(KEYS.VIDEO_CONFIG, LATEST_VIDEO_CONFIG);
    }
  }

  // ===== 影片設定 =====
  function getVideoConfig(courseId) {
    const all = get(KEYS.VIDEO_CONFIG, {});
    return courseId ? (all[courseId] || {}) : all;
  }
  function setVideoConfig(courseId, cfg) {
    const all = get(KEYS.VIDEO_CONFIG, {});
    all[courseId] = { ...(all[courseId] || {}), ...cfg };
    set(KEYS.VIDEO_CONFIG, all);
  }
  function clearVideoConfig(courseId) {
    const all = get(KEYS.VIDEO_CONFIG, {});
    delete all[courseId];
    set(KEYS.VIDEO_CONFIG, all);
  }

  // ===== 影片觀看區段合併 (用於計算真實觀看時長與防快轉) =====
  function mergeSegments(segments) {
    if (!segments || !segments.length) return [];
    const sorted = segments.slice().sort((a,b) => a[0] - b[0]);
    const merged = [sorted[0].slice()];
    for (let i = 1; i < sorted.length; i++) {
      const last = merged[merged.length - 1];
      const cur = sorted[i];
      if (cur[0] <= last[1] + 1) {
        last[1] = Math.max(last[1], cur[1]);
      } else {
        merged.push(cur.slice());
      }
    }
    return merged;
  }
  function totalWatched(segments) {
    return mergeSegments(segments).reduce((s, seg) => s + (seg[1] - seg[0]), 0);
  }

  function recordVideoSegment(empId, courseId, start, end) {
    if (end <= start) return;
    const p = getProgress(empId, courseId);
    const segs = (p.videoSegments || []).concat([[Math.floor(start), Math.floor(end)]]);
    const merged = mergeSegments(segs);
    const watched = totalWatched(merged);
    setProgress(empId, courseId, {
      videoSegments: merged,
      videoWatchedSeconds: watched,
      videoLastPosition: Math.floor(end)
    });
  }

  function setVideoMeta(empId, courseId, meta) {
    setProgress(empId, courseId, meta);
  }

  // ===== 員工管理 =====
  function getEmployees() { return get(KEYS.EMPLOYEES, []); }
  function setEmployees(arr) { set(KEYS.EMPLOYEES, arr); }
  function getEmployee(empId) { return getEmployees().find(e => e.empId === empId); }

  function addEmployee(emp) {
    const list = getEmployees();
    if (list.find(e => e.empId === emp.empId)) {
      throw new Error('員工編號 ' + emp.empId + ' 已存在');
    }
    list.push({
      ...emp,
      active: emp.active !== false,
      password: emp.password || emp.empId,
      createdAt: new Date().toISOString()
    });
    setEmployees(list);
  }

  function updateEmployee(empId, patch) {
    const list = getEmployees();
    const i = list.findIndex(e => e.empId === empId);
    if (i < 0) throw new Error('找不到員工');
    list[i] = { ...list[i], ...patch };
    setEmployees(list);
  }

  function deleteEmployee(empId) {
    setEmployees(getEmployees().filter(e => e.empId !== empId));
    const prog = get(KEYS.PROGRESS, {});
    delete prog[empId];
    set(KEYS.PROGRESS, prog);
  }

  // ===== CSV 匯入/匯出 =====
  function parseCSV(text) {
    const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) throw new Error('CSV 內容不足');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const cells = line.split(',').map(c => c.trim());
      const obj = {};
      headers.forEach((h, i) => obj[h] = cells[i] || '');
      return obj;
    });
  }

  function importEmployeesFromCSV(text) {
    const rows = parseCSV(text);
    let success = 0, failed = 0, errors = [];
    rows.forEach((row, idx) => {
      try {
        const emp = {
          empId: row.empId || row['員工編號'],
          name:  row.name  || row['姓名'],
          email: row.email || row['Email'] || row['電子郵件'],
          dept:  row.dept  || row['部門'],
          role:  (row.role || row['身份'] || '').includes('主管') || row.role === 'manager' ? 'manager' : 'new_employee',
          password: row.password || row['密碼']
        };
        if (!emp.empId || !emp.name) throw new Error('缺少必要欄位');
        addEmployee(emp);
        success++;
      } catch (e) {
        failed++;
        errors.push(`第 ${idx+2} 列: ${e.message}`);
      }
    });
    return { success, failed, errors };
  }

  function exportEmployeesToCSV() {
    const headers = ['empId','name','email','dept','role','active','createdAt'];
    const rows = getEmployees().map(e => headers.map(h => e[h]).join(','));
    return '﻿' + headers.join(',') + '\n' + rows.join('\n');
  }

  function exportLearningRecordsToCSV() {
    const headers = ['員工編號','姓名','部門','身份','課程','狀態','影片觀看率','觀看秒數','影片時長(秒)','最後位置(秒)','測驗分數','最後學習時間'];
    const employees = getEmployees();
    const progress = get(KEYS.PROGRESS, {});
    const lines = [headers.join(',')];

    employees.forEach(emp => {
      const courses = COURSES[emp.role] || [];
      courses.forEach(c => {
        const p = (progress[emp.empId] && progress[emp.empId][c.id]) || {};
        const ratio = (p.videoDuration && p.videoWatchedSeconds)
          ? Math.round(p.videoWatchedSeconds * 100 / p.videoDuration) : (p.videoWatched ? 100 : 0);
        lines.push([
          emp.empId,
          emp.name,
          emp.dept,
          emp.role === 'manager' ? '主管' : '新進人員',
          c.title,
          p.completed ? '已完成' : (p.videoWatched || p.quizScore != null ? '進行中' : '未開始'),
          ratio + '%',
          p.videoWatchedSeconds || 0,
          p.videoDuration || '-',
          p.videoLastPosition || 0,
          p.quizScore != null ? p.quizScore : '-',
          p.lastAt || '-'
        ].join(','));
      });
    });
    return '﻿' + lines.join('\n');
  }

  function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ===== 登入相關 =====
  function loginEmployee(empId, password) {
    const emp = getEmployee(empId);
    if (!emp) throw new Error('員工編號不存在');
    if (!emp.active) throw new Error('帳號已停用');
    if (emp.password !== password) throw new Error('密碼錯誤');
    set(KEYS.CURRENT_USER, emp);
    addLog(empId, 'login', '員工登入');
    return emp;
  }

  function loginAdmin(username, password) {
    const admins = get(KEYS.ADMINS, []);
    const a = admins.find(x => x.username === username && x.password === password);
    if (!a) throw new Error('帳號或密碼錯誤');
    set(KEYS.CURRENT_ADMIN, a);
    return a;
  }

  function logoutUser() {
    const u = getCurrentUser();
    localStorage.removeItem(KEYS.CURRENT_USER);
    if (u) try { addLog(u.empId, 'logout', '員工登出'); } catch(e) {}
  }
  function logoutAdmin() { localStorage.removeItem(KEYS.CURRENT_ADMIN); }
  function getCurrentUser() { return get(KEYS.CURRENT_USER, null); }
  function getCurrentAdmin() { return get(KEYS.CURRENT_ADMIN, null); }

  // ===== 學習紀錄與進度 =====
  function addLog(empId, type, detail) {
    const logs = get(KEYS.LOGS, []);
    logs.push({ empId, type, detail, at: new Date().toISOString() });
    if (logs.length > 5000) logs.shift();
    set(KEYS.LOGS, logs);
  }

  function getLogs(empId) {
    const logs = get(KEYS.LOGS, []);
    return empId ? logs.filter(l => l.empId === empId) : logs;
  }

  function getProgress(empId, courseId) {
    const all = get(KEYS.PROGRESS, {});
    return (all[empId] && all[empId][courseId]) || {};
  }

  function setProgress(empId, courseId, patch) {
    const all = get(KEYS.PROGRESS, {});
    if (!all[empId]) all[empId] = {};
    if (!all[empId][courseId]) all[empId][courseId] = {};
    all[empId][courseId] = { ...all[empId][courseId], ...patch, lastAt: new Date().toISOString() };
    set(KEYS.PROGRESS, all);
  }

  function getEmployeeOverallProgress(empId) {
    const emp = getEmployee(empId);
    if (!emp) return { percent: 0, completed: 0, total: 0 };
    const courses = COURSES[emp.role] || [];
    let completed = 0;
    courses.forEach(c => {
      const p = getProgress(empId, c.id);
      if (p.completed) completed++;
    });
    return {
      percent: courses.length ? Math.round(completed * 100 / courses.length) : 0,
      completed,
      total: courses.length
    };
  }

  // ===== 統計 =====
  function getStats() {
    const emps = getEmployees();
    let totalCourses = 0, completedCourses = 0, activeEmps = 0;
    emps.forEach(e => {
      if (!e.active) return;
      activeEmps++;
      const p = getEmployeeOverallProgress(e.empId);
      totalCourses += p.total;
      completedCourses += p.completed;
    });
    return {
      totalEmployees: emps.length,
      activeEmployees: activeEmps,
      totalCourses,
      completedCourses,
      completionRate: totalCourses ? Math.round(completedCourses * 100 / totalCourses) : 0
    };
  }

  // ===== 完課截止日 =====
  function getDeadline() { return get(KEYS.DEADLINE, null); }
  function setDeadline(dateStr) { set(KEYS.DEADLINE, dateStr); }
  function clearDeadline() { localStorage.removeItem(KEYS.DEADLINE); }

  // ===== 管理員公告 =====
  function getAnnouncements() {
    return get(KEYS.ANNOUNCEMENTS, []);
  }
  function addAnnouncement(obj) {
    const list = getAnnouncements();
    const ann = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2,5),
      title: obj.title,
      content: obj.content,
      type: obj.type || 'info',
      expiry: obj.expiry || null,
      createdAt: new Date().toISOString()
    };
    list.unshift(ann);
    set(KEYS.ANNOUNCEMENTS, list);
    return ann;
  }
  function deleteAnnouncement(id) {
    set(KEYS.ANNOUNCEMENTS, getAnnouncements().filter(a => a.id !== id));
    const read = get(KEYS.NOTICES_READ, {});
    Object.keys(read).forEach(empId => {
      if (Array.isArray(read[empId])) read[empId] = read[empId].filter(x => x !== id);
    });
    set(KEYS.NOTICES_READ, read);
  }
  function getUnreadAnnouncements(empId) {
    const now = new Date();
    const read = get(KEYS.NOTICES_READ, {});
    const readIds = read[empId] || [];
    return getAnnouncements().filter(a => {
      if (readIds.includes(a.id)) return false;
      if (a.expiry && new Date(a.expiry) < now) return false;
      return true;
    });
  }
  function markAnnouncementsRead(empId, ids) {
    const read = get(KEYS.NOTICES_READ, {});
    const existing = read[empId] || [];
    read[empId] = [...new Set([...existing, ...ids])];
    set(KEYS.NOTICES_READ, read);
  }

  // 重置示範資料 (僅供 demo)
  function resetAll() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    init();
  }

  return {
    COURSES,
    init,
    getEmployees, getEmployee, addEmployee, updateEmployee, deleteEmployee,
    importEmployeesFromCSV, exportEmployeesToCSV, exportLearningRecordsToCSV,
    downloadFile,
    loginEmployee, loginAdmin, logoutUser, logoutAdmin,
    getCurrentUser, getCurrentAdmin,
    addLog, getLogs,
    getProgress, setProgress, getEmployeeOverallProgress,
    getStats, resetAll,
    getVideoConfig, setVideoConfig, clearVideoConfig,
    recordVideoSegment, setVideoMeta, totalWatched, mergeSegments,
    getDeadline, setDeadline, clearDeadline,
    getAnnouncements, addAnnouncement, deleteAnnouncement,
    getUnreadAnnouncements, markAnnouncementsRead,
    saveWrongAnswers, getWrongAnswers,
    addBookmark, getBookmarks, deleteBookmark
  };

  // ===== 錯題本 =====
  function saveWrongAnswers(empId, courseId, items) {
    const all = get(KEYS.WRONG_ANSWERS, {});
    if (!all[empId]) all[empId] = {};
    all[empId][courseId] = items;
    set(KEYS.WRONG_ANSWERS, all);
  }
  function getWrongAnswers(empId, courseId) {
    const all = get(KEYS.WRONG_ANSWERS, {});
    if (!courseId) return (all[empId]) || {};
    return (all[empId] && all[empId][courseId]) || [];
  }

  // ===== 影片書籤 =====
  function addBookmark(empId, courseId, time, note) {
    const all = get(KEYS.BOOKMARKS, {});
    if (!all[empId]) all[empId] = {};
    if (!all[empId][courseId]) all[empId][courseId] = [];
    all[empId][courseId].push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 4),
      time: Math.floor(time),
      note: note || '',
      createdAt: new Date().toISOString()
    });
    set(KEYS.BOOKMARKS, all);
  }
  function getBookmarks(empId, courseId) {
    const all = get(KEYS.BOOKMARKS, {});
    if (!courseId) return (all[empId]) || {};
    return (all[empId] && all[empId][courseId]) || [];
  }
  function deleteBookmark(empId, courseId, id) {
    const all = get(KEYS.BOOKMARKS, {});
    if (all[empId] && all[empId][courseId]) {
      all[empId][courseId] = all[empId][courseId].filter(b => b.id !== id);
      set(KEYS.BOOKMARKS, all);
    }
  }
})();

Data.init();
