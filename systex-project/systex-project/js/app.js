/* ============================================================
   app.js — 員工前台 SPA 邏輯
   ============================================================ */

const App = (function () {

  // ===== Toast =====
  function toast(msg, type = '') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast show ' + type;
    setTimeout(() => el.classList.remove('show'), 2500);
  }

  // ===== 登入頁面 =====
  function bindLogin() {
    document.getElementById('employee-login-form').addEventListener('submit', e => {
      e.preventDefault();
      const empId = document.getElementById('login-empId').value.trim();
      const pwd = document.getElementById('login-password').value;
      try {
        const emp = Data.loginEmployee(empId, pwd);
        toast(`歡迎回來,${emp.name}!`, 'success');
        setTimeout(() => enterApp(), 600);
      } catch (e) {
        toast(e.message, 'error');
      }
    });
    document.getElementById('goto-admin').addEventListener('click', () => {
      window.location.href = 'admin.html';
    });
    document.getElementById('reset-demo').addEventListener('click', () => {
      if (confirm('確定要重置所有示範資料嗎？這將清除所有學習進度。')) {
        Data.resetAll();
        toast('示範資料已重置，請重新登入', 'success');
      }
    });
  }

  // ===== 首頁 / 登入頁切換 =====
  function showLogin() {
    document.getElementById('page-landing').classList.add('hidden');
    document.getElementById('page-login').classList.remove('hidden');
  }
  function showLanding() {
    document.getElementById('page-login').classList.add('hidden');
    document.getElementById('page-landing').classList.remove('hidden');
  }
  function bindLanding() {
    ['landing-start-btn', 'landing-start-btn2', 'goto-login-btn'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', showLogin);
    });
    const backBtn = document.getElementById('back-to-landing');
    if (backBtn) backBtn.addEventListener('click', showLanding);
  }

  // ===== 進入主應用 =====
  function enterApp() {
    const landing = document.getElementById('page-landing');
    if (landing) landing.classList.add('hidden');
    document.getElementById('page-login').classList.add('hidden');
    document.getElementById('page-app').classList.remove('hidden');
    const user = Data.getCurrentUser();
    document.getElementById('user-name').textContent = `${user.name} (${user.role === 'manager' ? '主管' : '新進'})`;
    renderRoute('menu');
    checkDeadlineReminder();
    checkAnnouncements();
  }

  // ===== 完課截止日提醒 =====
  function checkDeadlineReminder() {
    const deadline = Data.getDeadline();
    if (!deadline) return;
    const user = Data.getCurrentUser();
    const overall = Data.getEmployeeOverallProgress(user.empId);
    if (overall.percent >= 100) return;

    const daysLeft = Math.ceil((new Date(deadline) - new Date()) / 86400000);
    let bgColor, icon, msg;
    if (daysLeft < 0) {
      bgColor = '#c0392b'; icon = '🚨';
      msg = `完課截止日（${deadline}）已過期 ${Math.abs(daysLeft)} 天，請儘速完成剩餘 ${overall.total - overall.completed} 門課程！`;
    } else if (daysLeft <= 3) {
      bgColor = '#e67e22'; icon = '⚠️';
      msg = `距離完課截止日（${deadline}）還有 <strong>${daysLeft}</strong> 天，請盡快完成剩餘 ${overall.total - overall.completed} 門課程！`;
    } else {
      bgColor = '#5a6b8c'; icon = '📅';
      msg = `完課截止日：${deadline}，距今還有 <strong>${daysLeft}</strong> 天，目前已完成 ${overall.completed} / ${overall.total} 門。`;
    }

    const banner = document.createElement('div');
    banner.id = 'deadline-banner';
    banner.innerHTML = `
      <div style="background:${bgColor}; color:#fff; padding:12px 24px; display:flex; align-items:center; justify-content:space-between; font-size:14px; position:sticky; top:64px; z-index:90;">
        <span>${icon} ${msg}</span>
        <button onclick="document.getElementById('deadline-banner').remove()"
          style="background:none; border:none; color:#fff; font-size:18px; cursor:pointer; margin-left:16px; flex-shrink:0;">✕</button>
      </div>`;
    const existing = document.getElementById('deadline-banner');
    if (existing) existing.remove();
    document.getElementById('page-app').insertBefore(banner, document.querySelector('.container') || document.getElementById('main-content'));
  }

  // ===== 管理員公告 =====
  function checkAnnouncements() {
    const user = Data.getCurrentUser();
    if (!user) return;
    const unread = Data.getUnreadAnnouncements(user.empId);
    if (!unread.length) return;

    const typeIcon = { info: '📘', warning: '⚠️', urgent: '🚨' };
    const typeBg   = { info: '#e8f0fe', warning: '#fff3e0', urgent: '#fdecea' };
    const typeBorder = { info: '#5a6b8c', warning: '#e67e22', urgent: '#c0392b' };
    const typeLabel  = { info: '一般通知', warning: '注意事項', urgent: '緊急公告' };

    const overlay = document.createElement('div');
    overlay.id = 'ann-overlay';
    overlay.innerHTML = `
      <div class="ann-modal-box">
        <div class="ann-modal-header">
          <span>📢 最新公告 (${unread.length} 則)</span>
          <button class="ann-close-btn" id="ann-close-btn">✕ 關閉</button>
        </div>
        <div class="ann-modal-body">
          ${unread.map(a => `
            <div style="background:${typeBg[a.type] || '#f5f5f5'}; border-left:4px solid ${typeBorder[a.type] || '#5a6b8c'}; border-radius:8px; padding:14px 16px; margin-bottom:14px;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                <span style="font-size:16px;">${typeIcon[a.type] || '📢'}</span>
                <span style="background:${typeBorder[a.type] || '#5a6b8c'}; color:#fff; font-size:11px; padding:2px 8px; border-radius:4px;">${typeLabel[a.type] || a.type}</span>
                <strong style="font-size:15px;">${escAnn(a.title)}</strong>
              </div>
              <div style="font-size:14px; color:#333; white-space:pre-wrap; line-height:1.6;">${escAnn(a.content)}</div>
              <div style="margin-top:8px; font-size:12px; color:#888;">${formatAnnTime(a.createdAt)}${a.expiry ? `　到期：${a.expiry}` : ''}</div>
            </div>
          `).join('')}
        </div>
        <div style="padding:16px 20px; text-align:right; border-top:1px solid #eee;">
          <button class="btn btn-primary" id="ann-close-btn2">我知道了</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const ids = unread.map(a => a.id);
    function close() {
      Data.markAnnouncementsRead(user.empId, ids);
      overlay.remove();
    }
    document.getElementById('ann-close-btn').onclick = close;
    document.getElementById('ann-close-btn2').onclick = close;
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  }

  function escAnn(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function formatAnnTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getFullYear()}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}`;
  }

  // ===== 學習證書 =====
  // ===== 路由 =====
  const routes = {
    menu:         renderMenu,
    home:         renderHome,
    cover:        renderCover,
    intro:        renderIntro,
    guide:        renderGuide,
    wronganswers: renderWrongAnswers,
    course:       renderCourse
  };

  function renderRoute(route, ...args) {
    flushStudyTimer();
    const fn = routes[route];
    if (fn) fn(...args);
  }

  function bindNav() {
    document.querySelectorAll('[data-route]').forEach(a => {
      a.addEventListener('click', () => renderRoute(a.dataset.route));
    });
  }

  function logout() {
    flushStudyTimer();
    try { Data.logoutUser(); } catch(e) {}
    // 關閉彈窗
    const annOverlay = document.getElementById('ann-overlay');
    if (annOverlay) annOverlay.remove();
    // 切回登入頁
    document.getElementById('main-content').innerHTML = '';
    document.getElementById('page-app').classList.add('hidden');
    document.getElementById('page-login').classList.remove('hidden');
    document.getElementById('login-empId').value = '';
    document.getElementById('login-password').value = '';
  }

  // ===== 課程子目標資料 =====
  const COURSE_OBJECTIVES = {
    pdpa:       ['個資法規範與定義', '合規蒐集處理原則', '外洩通報與法律責任'],
    osh:        ['安衛法基本規範', '職場危害辨識', '職災預防與緊急應變'],
    ai_policy:  ['AI 使用政策規範', '倫理風險與禁止事項', '合規使用行為準則'],
    infosec:    ['CIA 資安三要素', '釣魚郵件與社交工程', '疑・查・報三步驟'],
    bullying:   ['霸凌定義與認定標準', '管理者法定義務', '調查通報與輔導程序'],
    harassment: ['性騷擾法律定義', '主管防治角色與責任', '申訴受理與保護措施']
  };

  const COURSE_INTRO = {
    infosec: {
      duration: '約 15–20 分鐘',
      videoTitle: '情境劇：一封可疑的郵件',
      quizCount: 10,
      scenario: '新進員工小強收到一封「績效獎金補發」的通知郵件，同事小誠一眼發現了可疑之處。透過與虛擬資安助手 Aery 和同事小妤的對話，他們一步步拆解釣魚郵件的陷阱，學習如何在真實職場中保護企業資料與自身安全。',
      characters: [
        { icon: '👦', name: '小強', role: '新進員工' },
        { icon: '👨', name: '小誠', role: '資深同事' },
        { icon: '👩', name: '小妤', role: '資安講師' },
        { icon: '🤖', name: 'Aery', role: '資安虛擬助手' },
      ],
      keyPoints: [
        { icon: '🛡️', label: 'CIA 三要素', desc: '機密性・完整性・可用性' },
        { icon: '🎣', label: '釣魚郵件識別', desc: '寄件者・連結・急迫感' },
        { icon: '🤝', label: '社交工程防範', desc: '人性弱點與操控手法' },
        { icon: '📋', label: '疑・查・報', desc: '資安事件三步驟流程' },
      ]
    }
  };

  // ===== 課程選單 =====
  function renderMenu() {
    const user = Data.getCurrentUser();
    const main = document.getElementById('main-content');
    const overall = Data.getEmployeeOverallProgress(user.empId);
    const myCourses = Data.COURSES[user.role] || [];
    const isManager = user.role === 'manager';

    const totalStudySec = myCourses.reduce((sum, c) => sum + (Data.getProgress(user.empId, c.id).studySeconds || 0), 0);
    const quizScores = myCourses.map(c => Data.getProgress(user.empId, c.id).quizScore).filter(s => s != null);
    const avgScore = quizScores.length ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length) : null;
    const pathLabel = isManager ? '主管人員學習路徑' : '新進人員學習路徑';
    const pathIcon  = isManager ? '👔' : '👤';

    const courseCards = myCourses.map((c, i) => {
      const col = BRANCH_COLORS[i % BRANCH_COLORS.length];
      const p = Data.getProgress(user.empId, c.id);
      let statusBadge = '';
      if (p.completed) {
        statusBadge = `<span class="menu-card-badge badge-done">✓ 已完成</span>`;
      } else if (p.videoWatched || p.videoWatchedSeconds > 0) {
        statusBadge = `<span class="menu-card-badge badge-prog">學習中</span>`;
      }
      return `
        <div class="menu-card" data-course-id="${c.id}" style="--bc:${col.c}; --bbg:${col.bg}; --i:${i}">
          <div class="menu-card-left">
            <div class="menu-card-icon">${c.icon}</div>
          </div>
          <div class="menu-card-body">
            <div class="menu-card-title-row">
              <span class="menu-card-title">${c.title}</span>
              ${statusBadge}
            </div>
            <div class="menu-card-desc">${c.desc}</div>
          </div>
          <div class="menu-card-arrow">→</div>
        </div>
      `;
    }).join('');

    main.innerHTML = `
      <div class="menu-hero">
        <div class="menu-hero-inner">
          <div class="menu-hero-left">
            <div class="menu-hero-greeting">歡迎回來，<strong>${user.name}</strong>${isManager ? '　主管' : ''}</div>
            <div class="menu-hero-path">${pathIcon} ${pathLabel}</div>
          </div>
          <div class="menu-hero-stats">
            <div class="menu-stat">
              <div class="menu-stat-n">${overall.completed}<span>/${overall.total}</span></div>
              <div class="menu-stat-l">課程完成</div>
            </div>
            <div class="menu-stat">
              <div class="menu-stat-n">${formatStudyTime(totalStudySec)}</div>
              <div class="menu-stat-l">學習時間</div>
            </div>
            <div class="menu-stat">
              <div class="menu-stat-n">${avgScore != null ? avgScore + '<span>分</span>' : '--'}</div>
              <div class="menu-stat-l">測驗均分</div>
            </div>
          </div>
        </div>
        <div class="menu-prog-overall">
          <div class="menu-prog-overall-label">整體完成度 ${overall.percent}%</div>
          <div class="menu-prog-overall-bar">
            <div class="menu-prog-overall-fill" style="width:${overall.percent}%"></div>
          </div>
        </div>
      </div>

      <div class="menu-section">
        <div class="menu-section-hdr">
          <h2 class="menu-section-title">課程選單</h2>
          <p class="menu-section-sub">點擊課程卡片進入學習</p>
        </div>
        <div class="menu-grid">${courseCards}</div>
      </div>
    `;

    main.querySelectorAll('.menu-card[data-course-id]').forEach(el => {
      el.addEventListener('click', () => renderRoute('cover', el.dataset.courseId, user.role));
    });
  }


  // ===== 課程封面頁 =====
  function renderCover(courseId, role) {
    const user = Data.getCurrentUser();
    const main = document.getElementById('main-content');
    const allCourses = [...(Data.COURSES.new_employee || []), ...(Data.COURSES.manager || [])];
    const course = allCourses.find(c => c.id === courseId);
    if (!course) return renderMenu();

    const p = Data.getProgress(user.empId, courseId);
    const roleCourses = Data.COURSES[role] || [];
    const courseIdx = roleCourses.findIndex(c => c.id === courseId);
    const col = BRANCH_COLORS[courseIdx >= 0 ? courseIdx % BRANCH_COLORS.length : 0];
    const intro = COURSE_INTRO[courseId];

    const btnLabel = p.completed ? '重新學習'
      : (p.videoWatched || p.videoWatchedSeconds > 0 ? '繼續學習' : '開始學習');

    const videoPct = (p.videoDuration && p.videoWatchedSeconds)
      ? Math.round(p.videoWatchedSeconds * 100 / p.videoDuration)
      : (p.videoWatched ? 100 : 0);
    let statusHtml = '';
    if (p.completed) {
      statusHtml = `<div class="cv-status cv-status-done">✅ 已完成｜測驗 ${p.quizScore} 分</div>`;
    } else if (p.videoWatched || p.videoWatchedSeconds > 0) {
      statusHtml = `<div class="cv-status cv-status-prog">▶ 學習中｜影片進度 ${videoPct}%</div>`;
    }

    const TAGLINES = {
      infosec:    '一封可疑的郵件，背後藏著什麼陷阱？',
      pdpa:       '每一筆資料，都是責任的起點',
      osh:        '安全，是每個人共同的責任',
      ai_policy:  'AI 是工具，規範是底線',
      bullying:   '尊重，從了解界線開始',
      harassment: '友善職場，從你我做起',
    };

    const duration = intro ? intro.duration : '約 10–15 分鐘';
    const quizCount = intro ? intro.quizCount : (QUIZ_BANK[courseId] || []).length;

    main.innerHTML = `
      <div class="cv-page" style="--bc:${col.c}">
        <div class="cv-topbar">
          <a class="cv-nav-link" onclick="App.go('menu')">← 回課程選單</a>

        </div>

        <div class="cv-blob cv-blob1"></div>
        <div class="cv-blob cv-blob2"></div>

        <div class="cv-body">
          <div class="cv-badge">Unit ${String(courseIdx + 1).padStart(2,'0')} ・ ${role === 'manager' ? '主管人員' : '新進人員'} 必修</div>
          <div class="cv-icon">${course.icon}</div>
          <h1 class="cv-title">${course.title}</h1>
          <p class="cv-tagline">${TAGLINES[courseId] || course.desc}</p>
          <div class="cv-meta">
            <span>⏱ ${duration}</span>
            <span class="cv-sep">|</span>
            <span>🎬 影片教材</span>
            <span class="cv-sep">|</span>
            <span>📝 ${quizCount} 道測驗</span>
            <span class="cv-sep">|</span>
            <span>✅ 80 分通過</span>
          </div>
          ${statusHtml}
          <button class="cv-start-btn" id="cv-start-btn">${btnLabel} →</button>
        </div>
      </div>
    `;

    document.getElementById('cv-start-btn').addEventListener('click', () => {
      renderRoute('course', courseId, role);
    });
  }

  // ===== 課程前導頁 =====
  function renderIntro(courseId, role) {
    const user = Data.getCurrentUser();
    const main = document.getElementById('main-content');
    const allCourses = [...(Data.COURSES.new_employee || []), ...(Data.COURSES.manager || [])];
    const course = allCourses.find(c => c.id === courseId);
    if (!course) return renderMenu();

    const p = Data.getProgress(user.empId, courseId);
    const intro = COURSE_INTRO[courseId];
    const roleCourses = Data.COURSES[role] || [];
    const courseIdx = roleCourses.findIndex(c => c.id === courseId);
    const col = BRANCH_COLORS[courseIdx >= 0 ? courseIdx % BRANCH_COLORS.length : 0];
    const objs = COURSE_OBJECTIVES[courseId] || [];
    const quizCount = intro ? intro.quizCount : (QUIZ_BANK[courseId] || []).length;
    const duration = intro ? intro.duration : '約 10–15 分鐘';

    // 進度狀態
    const videoPct = (p.videoDuration && p.videoWatchedSeconds)
      ? Math.round(p.videoWatchedSeconds * 100 / p.videoDuration)
      : (p.videoWatched ? 100 : 0);
    let progressHtml = '';
    if (p.completed) {
      progressHtml = `<div class="ci-status-badge ci-status-done">✅ 已完成｜測驗 ${p.quizScore} 分</div>`;
    } else if (p.videoWatched || p.videoWatchedSeconds > 0) {
      progressHtml = `
        <div class="ci-prog-wrap">
          <div class="ci-prog-label">目前進度 ${videoPct}%</div>
          <div class="ci-prog-bar"><div class="ci-prog-fill" style="width:${videoPct}%"></div></div>
        </div>`;
    }

    const btnLabel = p.completed ? '重新學習' : (p.videoWatched || p.videoWatchedSeconds > 0 ? '繼續學習' : '開始學習');

    // 場景故事 or 簡介卡
    const storyCard = intro ? `
      <div class="ci-card">
        <div class="ci-card-label">🎬 課程故事情境</div>
        <p class="ci-story-text">${intro.scenario}</p>
        <div class="ci-characters">
          ${intro.characters.map(c => `
            <div class="ci-char">
              <span class="ci-char-icon">${c.icon}</span>
              <span class="ci-char-name">${c.name}</span>
              <span class="ci-char-role">${c.role}</span>
            </div>
          `).join('')}
        </div>
      </div>` : `
      <div class="ci-card">
        <div class="ci-card-label">📖 課程簡介</div>
        <p class="ci-story-text">${course.desc}</p>
      </div>`;

    // 重點概念（僅 infosec 有）
    const conceptsSection = intro ? `
      <div class="ci-concepts-section">
        <div class="ci-section-title">💡 本課重點概念</div>
        <div class="ci-concepts-grid">
          ${intro.keyPoints.map(kp => `
            <div class="ci-concept-card" style="--bc:${col.c}; --bbg:${col.bg}">
              <div class="ci-concept-icon">${kp.icon}</div>
              <div class="ci-concept-label">${kp.label}</div>
              <div class="ci-concept-desc">${kp.desc}</div>
            </div>`).join('')}
        </div>
      </div>` : '';

    main.innerHTML = `
      <a class="back-link" onclick="App.go('cover','${courseId}','${role}')" style="margin-bottom:20px;">← 回課程封面</a>

      <div class="ci-hero" style="--bc:${col.c}">
        <div class="ci-hero-inner">
          <div class="ci-hero-icon">${course.icon}</div>
          <div class="ci-hero-text">
            <div class="ci-hero-badge">Unit ${String(courseIdx + 1).padStart(2,'0')} ・ ${role === 'manager' ? '主管人員' : '新進人員'}</div>
            <h1 class="ci-title">${course.title}</h1>
            <p class="ci-desc-text">${course.desc}</p>
            <div class="ci-meta-row">
              <span class="ci-meta-pill">⏱ ${duration}</span>
              <span class="ci-meta-pill">🎬 影片教材</span>
              <span class="ci-meta-pill">📝 ${quizCount} 道測驗</span>
              <span class="ci-meta-pill">✅ 80 分通過</span>
            </div>
          </div>
        </div>
        ${progressHtml}
      </div>

      <div class="ci-grid">
        ${storyCard}
        <div class="ci-card">
          <div class="ci-card-label">🎯 學習目標</div>
          <div class="ci-obj-list">
            ${objs.map((o, i) => `
              <div class="ci-obj-item">
                <span class="ci-obj-num">${i + 1}</span>
                <span>${o}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>

      <div class="ci-structure-section">
        <div class="ci-section-title">📋 課程架構</div>
        <div class="ci-steps">
          <div class="ci-step ${p.videoWatched ? 'ci-step-done' : ''}">
            <div class="ci-step-num">01</div>
            <div class="ci-step-body">
              <div class="ci-step-icon">🎬</div>
              <div class="ci-step-label">觀看影片</div>
              <div class="ci-step-detail">${intro ? intro.videoTitle : '課程教學影片'}</div>
              <div class="ci-step-sub">${duration}</div>
            </div>
            ${p.videoWatched ? '<div class="ci-step-check">✓ 已完成</div>' : ''}
          </div>
          <div class="ci-step-arrow">▶</div>
          <div class="ci-step ${p.quizScore != null ? 'ci-step-done' : ''}">
            <div class="ci-step-num">02</div>
            <div class="ci-step-body">
              <div class="ci-step-icon">📝</div>
              <div class="ci-step-label">完成測驗</div>
              <div class="ci-step-detail">${quizCount} 道選擇題</div>
              <div class="ci-step-sub">80 分以上完課</div>
            </div>
            ${p.quizScore != null ? `<div class="ci-step-check">✓ ${p.quizScore} 分</div>` : ''}
          </div>
        </div>
      </div>

      ${conceptsSection}

      <div class="ci-cta-row">
        <button class="ci-start-btn" id="ci-start-btn" style="--bc:${col.c}">${btnLabel} →</button>
      </div>
    `;

    document.getElementById('ci-start-btn').addEventListener('click', () => {
      renderRoute('course', courseId, role);
    });
  }

  // ===== 首頁：課程架構圖 =====
  function renderHome() {
    const user = Data.getCurrentUser();
    const main = document.getElementById('main-content');
    const overall = Data.getEmployeeOverallProgress(user.empId);
    const myCourses = Data.COURSES[user.role] || [];
    const isManager = user.role === 'manager';

    const totalStudySec = myCourses.reduce((sum, c) => sum + (Data.getProgress(user.empId, c.id).studySeconds || 0), 0);
    const quizScores = myCourses.map(c => Data.getProgress(user.empId, c.id).quizScore).filter(s => s != null);
    const avgScore = quizScores.length ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length) : null;
    const totalWrong = myCourses.reduce((sum, c) => sum + Data.getWrongAnswers(user.empId, c.id).length, 0);
    const allDone = overall.percent >= 100;

    const empCourses = Data.COURSES.new_employee || [];
    const mgrCourses = Data.COURSES.manager || [];

    function courseNodeHTML(course, role, num, colorIdx) {
      const isMine = user.role === role;
      const p = isMine ? Data.getProgress(user.empId, course.id) : {};
      let statusLabel = '未開始', statusCls = 'arch-status-pending';
      if (isMine) {
        if (p.completed)                                { statusLabel = '✅ 已完成'; statusCls = 'arch-status-done'; }
        else if (p.videoWatched || p.quizScore != null) { statusLabel = '▶ 進行中';  statusCls = 'arch-status-prog'; }
      }
      const objs = COURSE_OBJECTIVES[course.id] || [];
      const col = BRANCH_COLORS[colorIdx % BRANCH_COLORS.length];
      return `
        <div class="csd-course-col" style="--bc:${col.c}; --bbg:${col.bg}">
          <div class="csd-cn ${isMine ? 'csd-cn-mine' : 'csd-cn-other'} ${isMine && p.completed ? 'csd-cn-done' : ''}"
               ${isMine ? `data-course-id="${course.id}" data-role="${role}"` : ''}>
            <div class="csd-cn-icon">${course.icon}</div>
            <div class="csd-cn-num">Unit ${String(num).padStart(2,'0')}</div>
            <div class="csd-cn-title">${course.title}</div>
            ${isMine ? `<span class="mm-node-status ${statusCls}">${statusLabel}</span>` : ''}
            <div class="csd-cn-divider"></div>
            <div class="csd-cn-subs">
              ${objs.map(o => `<div class="csd-cn-sub"><span class="csd-cn-dot">◆</span><span>${o}</span></div>`).join('')}
            </div>
            ${isMine ? `<div class="csd-cn-enter">點擊進入課程 →</div>` : `<div class="csd-cn-other-label">🔒 非本人路徑</div>`}
          </div>
        </div>
      `;
    }

    main.innerHTML = `
      <div class="home-hero">
        <div class="home-hero-inner">
          <div>
            <div class="home-welcome">歡迎回來，${user.name}${isManager ? '　主管' : ''}</div>
          </div>
          <div class="home-prog-block">
            <div class="home-prog-label">整體完成度</div>
            <div class="progress-bar home-prog-bar">
              <div class="progress-fill" style="width:${overall.percent}%;"></div>
            </div>
            <div class="home-prog-num">${overall.percent}%</div>
          </div>
        </div>
      </div>

      <div class="csd-section">
        <div class="csd-section-topbar">
          <a class="back-link csd-back-link" onclick="App.go('menu')">← 回課程選單</a>
          <div class="csd-section-label">課程架構圖</div>
        </div>

        <div class="csd-tree">
          <div class="csd-root-row">
            <div class="csd-root-node">
              <span class="csd-root-icon">📚</span>
              <div class="csd-root-info">
                <div class="csd-root-title">職場法律必修課</div>
                <div class="csd-root-sub">企業法遵數位訓練課程</div>
              </div>
              <span class="csd-root-badge">${overall.completed} / ${overall.total} 門完成</span>
            </div>
          </div>

          <div class="csd-stem"></div>

          <div class="csd-branches">
            <div class="csd-branch ${!isManager ? 'csd-branch-active' : 'csd-branch-inactive'}">
              <div class="csd-branch-hdr">
                <span>👤</span>
                <span>新進人員路徑</span>
                ${!isManager ? '<span class="csd-path-tag">我的路徑</span>' : ''}
              </div>
              <div class="csd-branch-vline"></div>
              <div class="csd-courses-row" style="--cols:${empCourses.length}">
                ${empCourses.map((c, i) => courseNodeHTML(c, 'new_employee', i + 1, i)).join('')}
              </div>
            </div>

            <div class="csd-branch ${isManager ? 'csd-branch-active' : 'csd-branch-inactive'}">
              <div class="csd-branch-hdr">
                <span>👔</span>
                <span>主管人員路徑</span>
                ${isManager ? '<span class="csd-path-tag">我的路徑</span>' : ''}
              </div>
              <div class="csd-branch-vline"></div>
              <div class="csd-courses-row" style="--cols:${mgrCourses.length}">
                ${mgrCourses.map((c, i) => courseNodeHTML(c, 'manager', i + 1, i + 4)).join('')}
              </div>
            </div>
          </div>

          ${allDone ? `<div class="mm-done-banner" style="margin-top:28px;"><span>🎉</span><span>恭喜！您已完成本學習路徑的所有課程</span></div>` : ''}
        </div>
      </div>

      <div class="home-stats-section">
        <div class="home-stats-title">📈 學習數據</div>
        <div class="dash-stats">
          <div class="dash-stat-card">
            <div class="dash-stat-icon">📚</div>
            <div class="dash-stat-num">${overall.completed}<span class="dash-stat-sub">/${overall.total}</span></div>
            <div class="dash-stat-label">課程完成</div>
          </div>
          <div class="dash-stat-card">
            <div class="dash-stat-icon">⏱️</div>
            <div class="dash-stat-num">${formatStudyTime(totalStudySec)}</div>
            <div class="dash-stat-label">總學習時間</div>
          </div>
          <div class="dash-stat-card">
            <div class="dash-stat-icon">📊</div>
            <div class="dash-stat-num">${avgScore != null ? avgScore + '<span class="dash-stat-sub">分</span>' : '--'}</div>
            <div class="dash-stat-label">測驗平均分</div>
          </div>
          <div class="dash-stat-card ${totalWrong ? 'dash-stat-warn' : ''}">
            <div class="dash-stat-icon">📝</div>
            <div class="dash-stat-num">${totalWrong || '--'}</div>
            <div class="dash-stat-label">錯題待複習</div>
          </div>
        </div>
      </div>
    `;

    main.querySelectorAll('.csd-cn-mine[data-course-id]').forEach(el => {
      el.addEventListener('click', () => renderRoute('course', el.dataset.courseId, el.dataset.role));
    });
  }

  const BRANCH_COLORS = [
    { c: '#5B8DEF', bg: '#EEF3FD' },
    { c: '#3ABFB1', bg: '#E5F7F6' },
    { c: '#F0A030', bg: '#FEF5E7' },
    { c: '#E05C5C', bg: '#FDECEA' },
    { c: '#9B6BE8', bg: '#F3ECFF' },
    { c: '#4BAE76', bg: '#EBF8F1' },
  ];

  function courseItemHTML(course, user, num) {
    const p = Data.getProgress(user.empId, course.id);
    let statusLabel = '未開始', statusCls = 'arch-status-pending';
    if (p.completed)                               { statusLabel = '✅ 已完成'; statusCls = 'arch-status-done'; }
    else if (p.videoWatched || p.quizScore != null){ statusLabel = '▶ 進行中';  statusCls = 'arch-status-prog'; }

    const objs = COURSE_OBJECTIVES[course.id] || [];
    const col = BRANCH_COLORS[(num - 1) % BRANCH_COLORS.length];
    return `
      <div class="mm-branch" style="--i:${num - 1}; --bc:${col.c}; --bbg:${col.bg}">
        <div class="mm-node-card ${p.completed ? 'mm-node-done' : ''}" data-course-id="${course.id}">
          <div class="mm-node-top">
            <span class="mm-unit-num">Unit ${String(num).padStart(2,'0')}</span>
            <span class="mm-unit-icon">${course.icon}</span>
          </div>
          <div class="mm-node-title">${course.title}</div>
          <span class="mm-node-status ${statusCls}">${statusLabel}</span>
          <div class="mm-node-divider"></div>
          <div class="mm-subs">
            ${objs.map(o => `<div class="mm-sub"><span class="mm-sub-dot">◆</span><span>${o}</span></div>`).join('')}
          </div>
          <div class="mm-enter">點擊進入課程 →</div>
        </div>
      </div>
    `;
  }




  // ===== 操作說明 =====
  function renderGuide() {
    document.getElementById('main-content').innerHTML = `
      <div class="guide-wrap">
        <div class="guide-header">
          <h1 class="page-title">操作說明</h1>
          <p class="guide-subtitle">三個步驟，輕鬆完成職場法律必修課程</p>
        </div>

        <div class="guide-steps">
          <div class="guide-step-card">
            <div class="guide-step-num">01</div>
            <div class="guide-step-icon">🗺️</div>
            <div class="guide-step-title">選擇課程</div>
            <div class="guide-step-desc">登入後首頁即顯示您的課程架構圖。瀏覽各單元的學習目標，點擊課程卡片即可進入。</div>
          </div>
          <div class="guide-step-card">
            <div class="guide-step-num">02</div>
            <div class="guide-step-icon">🎬</div>
            <div class="guide-step-title">觀看教學影片</div>
            <div class="guide-step-desc">每門課程包含一支教學影片。完整觀看後系統自動記錄進度，確保不遺漏任何重點。</div>
          </div>
          <div class="guide-step-card">
            <div class="guide-step-num">03</div>
            <div class="guide-step-icon">✏️</div>
            <div class="guide-step-title">完成課後測驗</div>
            <div class="guide-step-desc">影片結束後進行測驗，即時查看分數與每題解析。測驗可重複作答，直到完全理解為止。</div>
          </div>
        </div>

        <div class="guide-tips">
          <div class="guide-tips-hd">💡 實用小技巧</div>
          <div class="guide-tips-grid">
            <div class="guide-tip-item">
              <span class="guide-tip-ico">📊</span>
              <div>
                <div class="guide-tip-head">掌握學習數據</div>
                <div class="guide-tip-body">首頁課程架構圖下方顯示課程完成數、總學習時間與測驗平均分，隨時掌握自己的學習狀況。</div>
              </div>
            </div>
            <div class="guide-tip-item">
              <span class="guide-tip-ico">🔄</span>
              <div>
                <div class="guide-tip-head">測驗可重複作答</div>
                <div class="guide-tip-body">每次測驗皆可查看答題解析，建議確認所有題目都答對後再進入下一門課程。</div>
              </div>
            </div>
            <div class="guide-tip-item">
              <span class="guide-tip-ico">📝</span>
              <div>
                <div class="guide-tip-head">善用錯題本</div>
                <div class="guide-tip-body">課程頁面下方的錯題複習區，以及首頁下方的「錯題待複習」數字，都可幫助您鎖定需要加強的題目。</div>
              </div>
            </div>
          </div>
        </div>

        <a class="back-link" onclick="App.go('menu')">← 回課程選單</a>
      </div>
    `;
  }

  // ===== 課程內錯題複習區塊 =====
  function renderWrongAnswerSection(empId, courseId) {
    const area = document.getElementById('wrong-answer-section');
    if (!area) return;
    const wrongs = Data.getWrongAnswers(empId, courseId);
    if (!wrongs.length) { area.innerHTML = ''; return; }

    const isOpen = area.querySelector('.wrong-section-body') && !area.querySelector('.wrong-section-body').classList.contains('hidden');

    area.innerHTML = `
      <div class="wrong-section">
        <div class="wrong-section-header" id="wrong-toggle">
          <span>📝 錯題複習 — 上次測驗答錯 ${wrongs.length} 題</span>
          <span class="wrong-toggle-icon">${isOpen ? '▲' : '▼'}</span>
        </div>
        <div class="wrong-section-body ${isOpen ? '' : 'hidden'}">
          ${wrongs.map(item => `
            <div class="wrong-item">
              <div class="wrong-q">Q. ${item.q}</div>
              ${item.opts.map((opt, oi) => `
                <div class="${oi === item.a ? 'result-opt result-opt-correct' : oi === item.ua ? 'result-opt result-opt-wrong' : 'result-opt'}">
                  ${oi === item.a ? '✓' : oi === item.ua ? '✗' : '○'} ${opt}
                </div>
              `).join('')}
              ${item.explain ? `<div class="result-explain">💡 ${item.explain}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.getElementById('wrong-toggle').addEventListener('click', () => {
      const body = area.querySelector('.wrong-section-body');
      const icon = area.querySelector('.wrong-toggle-icon');
      body.classList.toggle('hidden');
      icon.textContent = body.classList.contains('hidden') ? '▼' : '▲';
    });
  }

  // ===== 錯題本頁（保留供路由使用）=====
  function renderWrongAnswers() {
    const user = Data.getCurrentUser();
    const main = document.getElementById('main-content');
    const myCourses = Data.COURSES[user.role] || [];

    const sections = myCourses.map(c => {
      const p = Data.getProgress(user.empId, c.id);
      const wrongs = Data.getWrongAnswers(user.empId, c.id);
      let body;
      if (p.quizScore == null) {
        body = `<div class="wrong-empty">尚未完成測驗</div>`;
      } else if (!wrongs.length) {
        body = `<div class="wrong-empty" style="color:#4a8a4a;">✓ 全部答對，繼續保持！</div>`;
      } else {
        body = wrongs.map(item => `
          <div class="wrong-item">
            <div class="wrong-q">Q. ${item.q}</div>
            ${item.opts.map((opt, oi) => `
              <div class="${oi === item.a ? 'result-opt result-opt-correct' : oi === item.ua ? 'result-opt result-opt-wrong' : 'result-opt'}">
                ${oi === item.a ? '✓' : oi === item.ua ? '✗' : '○'} ${opt}
              </div>
            `).join('')}
            ${item.explain ? `<div class="result-explain">💡 ${item.explain}</div>` : ''}
          </div>
        `).join('');
      }
      const badge = wrongs.length ? `<span class="wrong-badge">${wrongs.length} 題待複習</span>` : '';
      return `
        <div class="notes-card">
          <div class="notes-card-title" style="justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span>${c.icon}</span><span>${c.title}</span>
            </div>
            ${badge}
          </div>
          ${body}
        </div>
      `;
    }).join('');

    const totalWrong = myCourses.reduce((sum, c) => sum + Data.getWrongAnswers(user.empId, c.id).length, 0);

    main.innerHTML = `
      <h1 class="page-title">錯題本</h1>
      <p class="page-subtitle">${totalWrong ? `共 ${totalWrong} 題待複習 — 針對答錯的題目加強學習` : '目前沒有錯題，繼續保持！'}</p>
      <div style="max-width:720px; margin:0 auto;">${sections}</div>
      <a class="back-link" onclick="App.go('menu')">← 回課程選單</a>
    `;
  }


  // ===== 學習計時器 =====
  let _studyTimer = { empId: null, courseId: null, start: null };

  function startStudyTimer(empId, courseId) {
    flushStudyTimer();
    _studyTimer = { empId, courseId, start: Date.now() };
  }

  function flushStudyTimer() {
    const { empId, courseId, start } = _studyTimer;
    if (empId && courseId && start) {
      const elapsed = Math.round((Date.now() - start) / 1000);
      if (elapsed >= 5) {
        const p = Data.getProgress(empId, courseId);
        Data.setProgress(empId, courseId, { studySeconds: (p.studySeconds || 0) + elapsed });
      }
    }
    _studyTimer = { empId: null, courseId: null, start: null };
  }

  function formatStudyTime(secs) {
    secs = Math.floor(secs || 0);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    if (secs > 0) return `${secs}s`;
    return '--';
  }

  // ===== 課程內容頁 =====
  function renderCourse(courseId, role) {
    const user = Data.getCurrentUser();
    const course = (Data.COURSES[role] || []).find(c => c.id === courseId);
    if (!course) return renderHome();

    const isMine = user.role === role;
    const main = document.getElementById('main-content');

    if (!isMine) {
      main.innerHTML = `
        <h1 class="page-title">${course.title}</h1>
        <div style="background:var(--card-bg); padding:60px; border-radius:16px; text-align:center; margin-top:40px;">
          <div style="font-size:60px;">📚</div>
          <h3 style="margin:20px 0;">此課程屬於另一路徑</h3>
          <p style="color:var(--text-light);">您可以瀏覽課程概要,但學習紀錄不會被列入。</p>
          <p style="margin-top:12px;">課程簡介: ${course.desc}</p>
        </div>
        <a class="back-link" onclick="App.go('menu')">← 回課程選單</a>
      `;
      return;
    }

    Data.addLog(user.empId, 'enter_course', `進入課程: ${course.title}`);
    const p = Data.getProgress(user.empId, courseId);
    const videoCfg = Data.getVideoConfig(courseId);
    const hasVideo = !!videoCfg.url;

    const videoBlock = hasVideo ? `
      <video id="course-video" controls preload="metadata"
             style="width:100%; max-height:480px; border-radius:12px; background:#000;"
             src="${videoCfg.url}"></video>
      <div id="video-progress-info" style="margin-top:12px; padding:12px 16px; background:rgba(170,184,208,0.1); border-radius:8px; font-size:13px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <span>📺 觀看進度</span>
          <span id="vp-text">尚未開始</span>
        </div>
        <div class="progress-bar" style="width:100%; height:8px;">
          <div class="progress-fill" id="vp-bar" style="width:0%;"></div>
        </div>
        <div style="margin-top:8px; color:var(--text-light); font-size:12px;">
          ※ 系統將自動記錄您的觀看時長與位置,跳過的片段不會列入觀看完成
        </div>
      </div>
      <div style="display:flex; justify-content:flex-end; margin-top:10px;">
        <button id="btn-add-bm" class="btn btn-secondary" style="font-size:12px; padding:6px 14px;">📌 加書籤</button>
      </div>
      <div id="bm-input-wrap" class="hidden" style="margin-top:8px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <input type="text" id="bm-note-input" placeholder="書籤備註（選填）"
          style="flex:1; min-width:140px; padding:8px 12px; border:1px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit;" />
        <button id="bm-confirm" class="btn btn-primary" style="font-size:13px; padding:6px 14px; white-space:nowrap;">確定加入</button>
        <button id="bm-cancel" class="btn btn-secondary" style="font-size:13px; padding:6px 14px;">取消</button>
      </div>
      <div id="bookmarks-area" style="margin-top:8px;"></div>
    ` : `
      <div class="video-placeholder">
        <span style="position:absolute; bottom:20px; right:20px; font-size:14px; opacity:0.8;">教材開發中,敬請期待...</span>
      </div>
      <div style="text-align:right; margin-bottom:8px;">
        <button class="btn ${p.videoWatched ? 'btn-secondary' : 'btn-primary'}" id="mark-watched">
          ${p.videoWatched ? '✓ 已標記為觀看完成' : '標記為觀看完成 (示範用)'}
        </button>
      </div>
    `;

    main.innerHTML = `
      <a class="back-link" onclick="App.go('cover','${courseId}','${role}')" style="margin-top:0; margin-bottom:20px;">← 回課程封面</a>
      <h1 class="page-title" style="font-size:32px;">${course.icon} ${course.title}</h1>
      <p class="page-subtitle">${course.desc}</p>

      <div class="course-content">
        <h3 style="margin-bottom:16px; letter-spacing:2px;">1. 觀看影片${videoCfg.title ? ` — ${videoCfg.title}` : ''}</h3>
        ${videoBlock}

        <div class="quiz-section" style="margin-top:32px;">
          <h3 style="margin-bottom:16px; letter-spacing:2px;">2. 單元測驗</h3>
          ${renderQuiz(courseId)}
          <div style="text-align:right; margin-top:16px;">
            <button class="btn btn-primary" id="submit-quiz">送出測驗</button>
          </div>
        </div>

        ${p.completed ? `
          <div style="margin-top:32px; padding:24px; background:#d4ecd4; border-radius:12px; text-align:center;">
            <strong style="color:#4a8a4a;">🎉 您已完成此課程!</strong>
            <div style="margin-top:8px; color:#4a8a4a;">最後完成時間: ${formatTime(p.lastAt)}</div>
            ${p.quizScore != null ? `<div style="margin-top:4px;">測驗分數: ${p.quizScore} 分</div>` : ''}
          </div>
        ` : ''}

        <div id="wrong-answer-section" style="margin-top:32px;"></div>
      </div>
    `;

    if (hasVideo) {
      attachVideoTracking(user.empId, courseId, course);
    } else {
      const mw = document.getElementById('mark-watched');
      if (mw) mw.addEventListener('click', () => {
        Data.setProgress(user.empId, courseId, { videoWatched: true });
        Data.addLog(user.empId, 'video_watched', `(示範模式) 觀看影片: ${course.title}`);
        checkComplete(user.empId, courseId);
        toast('已記錄影片觀看完成', 'success');
        renderRoute('course', courseId, role);
      });
    }

    bindSubmitQuiz(courseId, role);
    renderWrongAnswerSection(user.empId, courseId);
    startStudyTimer(user.empId, courseId);
  }

  function bindSubmitQuiz(courseId, role) {
    const btn = document.getElementById('submit-quiz');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const qs = QUIZ_BANK[courseId] || [];
      const userAnswers = qs.map((q, qi) => {
        const picked = document.querySelector(`input[name="q${qi}"]:checked`);
        return picked ? parseInt(picked.value) : -1;
      });
      const unanswered = userAnswers.filter(a => a === -1).length;
      if (unanswered > 0) {
        toast(`還有 ${unanswered} 題未作答`, 'error');
        return;
      }
      const correct = userAnswers.filter((ans, i) => ans === qs[i].a).length;
      const score = qs.length ? Math.round(correct * 100 / qs.length) : 0;
      const user = Data.getCurrentUser();
      Data.setProgress(user.empId, courseId, { quizScore: score });
      Data.addLog(user.empId, 'quiz_submitted', `測驗: ${courseId} 得 ${score} 分`);
      const wrongs = qs.reduce((acc, q, i) => {
        if (userAnswers[i] !== q.a) acc.push({ q: q.q, opts: q.opts, a: q.a, ua: userAnswers[i], explain: q.explain });
        return acc;
      }, []);
      Data.saveWrongAnswers(user.empId, courseId, wrongs);
      checkComplete(user.empId, courseId);
      renderQuizResults(courseId, userAnswers, role);
      renderWrongAnswerSection(user.empId, courseId);
      document.querySelector('.quiz-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function renderQuizResults(courseId, userAnswers, role) {
    const qs = QUIZ_BANK[courseId] || [];
    const correct = userAnswers.filter((ans, i) => ans === qs[i].a).length;
    const score = qs.length ? Math.round(correct * 100 / qs.length) : 0;
    const passed = score >= 80;

    const questionHTML = qs.map((q, i) => {
      const ua = userAnswers[i];
      const isCorrect = ua === q.a;
      const optionsHTML = q.opts.map((opt, oi) => {
        let cls = 'result-opt';
        let icon = '○';
        if (oi === q.a)              { cls += ' result-opt-correct'; icon = '✓'; }
        else if (oi === ua && !isCorrect) { cls += ' result-opt-wrong';   icon = '✗'; }
        return `<div class="${cls}">${icon} ${opt}</div>`;
      }).join('');

      return `
        <div class="quiz-result-item ${isCorrect ? 'result-correct' : 'result-wrong'}">
          <div class="result-q-header">
            <span class="result-badge">${isCorrect ? '✓ 答對' : '✗ 答錯'}</span>
            <span class="result-q-text">Q${i + 1}. ${q.q}</span>
          </div>
          <div class="result-options">${optionsHTML}</div>
          ${q.explain ? `<div class="result-explain">💡 ${q.explain}</div>` : ''}
        </div>`;
    }).join('');

    const section = document.querySelector('.quiz-section');
    if (!section) return;
    section.innerHTML = `
      <h3 style="margin-bottom:16px; letter-spacing:2px;">2. 單元測驗 — 結果分析</h3>
      <div class="quiz-score-card ${passed ? 'score-pass' : 'score-fail'}">
        <div class="score-big">${score} 分</div>
        <div class="score-detail">${correct} / ${qs.length} 題答對　${passed ? '通過 ✓' : '未通過，可重新作答練習'}</div>
      </div>
      ${questionHTML}
      <div style="display:flex; gap:12px; justify-content:flex-end; margin-top:20px;">
        <button class="btn btn-secondary" id="retake-quiz">🔄 重新作答</button>
        ${passed ? `<button class="btn btn-primary" onclick="App.go('cover',courseId,role)">回課程封面 →</button>` : ''}
      </div>
    `;

    document.getElementById('retake-quiz').addEventListener('click', () => {
      section.innerHTML = `
        <h3 style="margin-bottom:16px; letter-spacing:2px;">2. 單元測驗</h3>
        ${renderQuiz(courseId)}
        <div style="text-align:right; margin-top:16px;">
          <button class="btn btn-primary" id="submit-quiz">送出測驗</button>
        </div>
      `;
      bindSubmitQuiz(courseId, role);
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // ===== HTML5 影片觀看進度追蹤 =====
  function attachVideoTracking(empId, courseId, course) {
    const video = document.getElementById('course-video');
    if (!video) return;

    const prog = Data.getProgress(empId, courseId);
    let lastTime = prog.videoLastPosition || 0;
    let segStart = null;
    let lastFlush = 0;
    let playCount = 0;
    const REQUIRED_RATIO = 0.9;  // 觀看 90% 以上才視為完成

    // 設定影片初始 metadata 與續播位置
    video.addEventListener('loadedmetadata', () => {
      Data.setVideoMeta(empId, courseId, {
        videoDuration: Math.floor(video.duration)
      });
      if (lastTime > 0 && lastTime < video.duration - 5) {
        video.currentTime = lastTime;
      }
      updateProgressUI(empId, courseId);
    });

    // 播放開始
    video.addEventListener('play', () => {
      segStart = video.currentTime;
      playCount++;
      Data.addLog(empId, 'video_play', `▶ 播放: ${course.title} (從 ${formatSec(segStart)})`);
    });

    // 暫停或結束: 記錄當前播放區段
    function flushSegment() {
      if (segStart != null && video.currentTime > segStart) {
        Data.recordVideoSegment(empId, courseId, segStart, video.currentTime);
        segStart = video.currentTime;
        updateProgressUI(empId, courseId);
      }
    }

    video.addEventListener('pause', () => {
      flushSegment();
      Data.addLog(empId, 'video_pause', `⏸ 暫停於 ${formatSec(video.currentTime)}`);
    });

    // 持續播放: 每 3 秒記錄一次區段
    video.addEventListener('timeupdate', () => {
      if (segStart == null) return;
      if (video.currentTime - lastFlush >= 3) {
        Data.recordVideoSegment(empId, courseId, segStart, video.currentTime);
        segStart = video.currentTime;
        lastFlush = video.currentTime;
        updateProgressUI(empId, courseId);
      }
    });

    // 使用者跳轉
    video.addEventListener('seeked', () => {
      const newTime = video.currentTime;
      if (segStart != null && Math.abs(newTime - segStart) > 2) {
        Data.addLog(empId, 'video_seek', `⏩ 跳轉至 ${formatSec(newTime)}`);
        segStart = newTime;
        lastFlush = newTime;
      }
    });

    // 影片結束
    video.addEventListener('ended', () => {
      flushSegment();
      Data.addLog(empId, 'video_ended', `✓ 播放結束: ${course.title}`);
      const finalProg = Data.getProgress(empId, courseId);
      const ratio = finalProg.videoDuration ? finalProg.videoWatchedSeconds / finalProg.videoDuration : 0;
      if (ratio >= REQUIRED_RATIO && !finalProg.videoWatched) {
        Data.setProgress(empId, courseId, { videoWatched: true });
        Data.addLog(empId, 'video_watched', `🎬 達成觀看門檻 (${Math.round(ratio*100)}%)`);
        toast(`觀看進度達 ${Math.round(ratio*100)}%,影片完成!`, 'success');
        checkComplete(empId, courseId);
      } else if (ratio < REQUIRED_RATIO) {
        toast(`觀看進度 ${Math.round(ratio*100)}%,需達 ${REQUIRED_RATIO*100}% 才算完成`, 'error');
      }
      updateProgressUI(empId, courseId);
    });

    // 視窗關閉前 flush 最後片段
    window.addEventListener('beforeunload', flushSegment);

    // ===== 影片書籤 =====
    renderBookmarks(empId, courseId);

    const btnBm = document.getElementById('btn-add-bm');
    const bmWrap = document.getElementById('bm-input-wrap');
    let bmCapturedTime = 0;

    if (btnBm) btnBm.addEventListener('click', () => {
      bmCapturedTime = video.currentTime;
      const isHidden = bmWrap.classList.contains('hidden');
      bmWrap.classList.toggle('hidden');
      if (isHidden) {
        document.getElementById('bm-note-input').value = '';
        document.getElementById('bm-note-input').focus();
      }
    });

    document.getElementById('bm-confirm')?.addEventListener('click', () => {
      const note = document.getElementById('bm-note-input').value.trim();
      Data.addBookmark(empId, courseId, bmCapturedTime, note);
      bmWrap.classList.add('hidden');
      toast(`📌 書籤已加入 ${formatSec(bmCapturedTime)}`, 'success');
      renderBookmarks(empId, courseId);
    });

    document.getElementById('bm-cancel')?.addEventListener('click', () => {
      bmWrap.classList.add('hidden');
    });

    document.getElementById('bm-note-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('bm-confirm').click();
      if (e.key === 'Escape') document.getElementById('bm-cancel').click();
    });
  }

  function renderBookmarks(empId, courseId) {
    const area = document.getElementById('bookmarks-area');
    if (!area) return;
    const bookmarks = Data.getBookmarks(empId, courseId);
    if (!bookmarks.length) { area.innerHTML = ''; return; }
    area.innerHTML = `
      <div class="bm-wrap">
        <div class="bm-header">📌 書籤列表（${bookmarks.length} 個）</div>
        ${bookmarks.map(b => `
          <div class="bm-item">
            <span class="bm-time" data-time="${b.time}">${formatSec(b.time)}</span>
            <span class="bm-note">${b.note || '(無備註)'}</span>
            <button class="bm-del" data-id="${b.id}">✕</button>
          </div>
        `).join('')}
      </div>
    `;
    area.querySelectorAll('.bm-time').forEach(el => {
      el.addEventListener('click', () => {
        const video = document.getElementById('course-video');
        if (video) { video.currentTime = parseFloat(el.dataset.time); video.play(); }
      });
    });
    area.querySelectorAll('.bm-del').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        Data.deleteBookmark(empId, courseId, btn.dataset.id);
        renderBookmarks(empId, courseId);
      });
    });
  }

  function updateProgressUI(empId, courseId) {
    const p = Data.getProgress(empId, courseId);
    const dur = p.videoDuration || 0;
    const watched = p.videoWatchedSeconds || 0;
    const ratio = dur ? Math.min(1, watched / dur) : 0;
    const bar = document.getElementById('vp-bar');
    const txt = document.getElementById('vp-text');
    if (bar) bar.style.width = (ratio * 100).toFixed(1) + '%';
    if (txt) {
      txt.textContent = `${formatSec(watched)} / ${formatSec(dur)} (${(ratio*100).toFixed(1)}%)${p.videoWatched ? ' ✓ 已達門檻' : ''}`;
    }
  }

  function formatSec(s) {
    s = Math.floor(s || 0);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2,'0')}`;
  }

  function checkComplete(empId, courseId) {
    const p = Data.getProgress(empId, courseId);
    if (p.videoWatched && p.quizScore != null && p.quizScore >= 80 && !p.completed) {
      Data.setProgress(empId, courseId, { completed: true });
      Data.addLog(empId, 'course_completed', `完成課程: ${courseId}`);
    }
  }

  // ===== 測驗題庫 =====
  const QUIZ_BANK = {
    pdpa: [
      { q: '依個資法,蒐集個資時應遵守哪項原則?', opts: ['尊重當事人權益,以合理方式取得', '可未告知即蒐集', '可任意提供第三方', '蒐集後不需保護'], a: 0,
        explain: '依個人資料保護法，蒐集個資應有明確目的，並以合法、正當方式為之，且須告知當事人並尊重其權益。' },
      { q: '若發生個資外洩事件,應如何處理?', opts: ['隱匿不報', '立即通報並啟動應變措施', '等待當事人發現', '刪除證據'], a: 1,
        explain: '個資外洩應立即通報主管機關並啟動應變措施。隱匿或刪除證據將加重法律責任，並使受害者無法及時保護自身權益。' }
    ],
    osh: [
      { q: '雇主應對勞工提供哪項保護?', opts: ['只在出事後才補救', '提供安全衛生教育與設備', '不需提供任何防護', '由勞工自行負責'], a: 1,
        explain: '依職業安全衛生法，雇主有義務提供安全的工作環境、必要的防護設備與安衛教育訓練，事前預防勝於事後補救。' },
      { q: '發現職場危害應如何處理?', opts: ['立即通報主管或安衛人員', '隱忍不講', '直接離職', '請其他同事處理'], a: 0,
        explain: '發現職場危害應立即通報具權責的主管或安衛人員處置，才能有效排除危險並保護所有同仁的安全。' }
    ],
    ai_policy: [
      { q: '使用公司 AI 工具時,以下何者正確?', opts: ['可上傳客戶機密資料', '應依公司規範使用並保護敏感資訊', 'AI 產出可直接視為正確答案', '不需註明 AI 協助來源'], a: 1,
        explain: '使用公司 AI 工具時，嚴禁上傳客戶機密或個人資料，AI 輸出亦需人工驗證，且應依規定說明 AI 協助來源。' },
      { q: '使用生成式 AI 時應注意?', opts: ['完全相信 AI 輸出', '需驗證資訊正確性並注意智財權', '可隨意輸入個資', '不需告知主管'], a: 1,
        explain: '生成式 AI 可能產生不正確的資訊（幻覺），使用時須自行驗證，輸入內容不得包含個資或機密，並留意智慧財產權問題。' }
    ],
    infosec: [
      { q: '在劇中，小強收到的電子郵件有明顯破綻，下列何者是判斷它是「釣魚郵件」的最關鍵線索？', opts: ['內容關於績效獎金補發', '要求點擊連結確認銀行帳號', '寄件者地址後綴為 @gmail.com', '信件語氣過於客氣'], a: 2,
        explain: '劇中小誠發現寄件人是 hr-systex@gmail.com，並質疑公司應使用官方信箱而非一般 Gmail，這是判斷釣魚郵件最關鍵的破綻。' },
      { q: '當小強說「不點就拿不到錢欸」時，這正中了駭客利用人性中的哪一種弱點？', opts: ['同情心', '急迫感與貪婪', '正義感', '恐懼感'], a: 1,
        explain: '小強因害怕錯過獎金而急於點擊，正是駭客利用「急迫感與貪婪」的典型手法。Aery 提醒：駭客攻擊往往利用的是人性，而非技術。' },
      { q: '資安核心概念「CIA 三要素」中的「I」是指「完整性」，它的具體定義是什麼？', opts: ['確保資料不被未授權的人看到', '確保資料不被意外或非法竄改', '確保系統在需要時能正常運作', '確保密碼設定超過 12 位元'], a: 1,
        explain: '小妤說明：完整性（Integrity）代表資料不能被竄改，例如帳號或金額若被非法修改，就是破壞了完整性。' },
      { q: '劇中提到，如果讓病毒進入系統導致資料損毀，除了技術損失外，還可能涉及哪方面的法律責任？', opts: ['違反著作權法', '妨害電腦使用罪', '違反交通安全法規', '詐欺罪'], a: 1,
        explain: '劇中提到若病毒進入系統造成設備故障或資料損毀，行為可能涉及刑法中的「妨害電腦使用罪」。' },
      { q: '角色 Aery 提到的「常見資安威脅」清單中，不包含下列哪一項？', opts: ['弱密碼（如 123456）', '不明隨身碟', '假冒同事傳送的請求檔案', '電腦硬體螢幕故障'], a: 3,
        explain: 'Aery 列出的常見威脅包括：釣魚信件、弱密碼（如 123456 或生日）、不明隨身碟、假冒同事傳訊。電腦硬體螢幕故障屬於設備問題，不屬於資安威脅。' },
      { q: '小妤強調遇到資安事件要記住三步驟「疑、查、報」，其中的「查」是指什麼？', opts: ['查詢自己的銀行餘額', '查詢網路上的懶人包', '確認訊息來源，或詢問 IT 部門', '檢查電腦是否已經中毒'], a: 2,
        explain: '「查」的具體作法是確認訊息來源是否合法，或直接詢問 IT 部門，不應自行上網搜尋，以免被進一步誤導。' },
      { q: '根據劇中邏輯，誰才是組織中最重要的資安「防線」？', opts: ['只有專業的 IT 人員', '公司的最高負責人', 'Aery 虛擬機器人', '每一位多確認一步的員工'], a: 3,
        explain: '劇中強調資安不只是 IT 的責任，每一位願意「多確認一步」的員工，都是組織最重要的防線。' },
      { q: '根據小妤的解釋，如果公司的獎金資料外洩，被未經授權的人看到，這會破壞「CIA 三要素」中的哪一項？', opts: ['可用性', '完整性', '機密性', '穩定性'], a: 2,
        explain: '機密性（Confidentiality）定義為「資料不能被未授權的人看到」，獎金資料外洩讓不該看到的人看到，正是破壞了機密性。' },
      { q: '劇中 Aery 提到，如果不小心點擊釣魚信件導致客戶資料外洩，公司除了技術層面的影響外，還可能會面臨什麼後果？', opts: ['違反個資保護規定，甚至面臨罰款', '必須強制關閉所有伺服器一個月', '系統會自動封鎖所有外部電子郵件', '員工會立刻被移送法辦'], a: 0,
        explain: '客戶資料外洩會使公司違反個人資料保護法，主管機關可對企業開罰，嚴重者需承擔民事賠償責任，也會損害公司商譽。' },
      { q: '遇到資安事件的「疑、查、報」三步驟中，最後一步的「報」具體應該怎麼做？', opts: ['報警並立刻聯絡新聞媒體', '使用公司資安通報機制回報', '在個人社群媒體上發文警告親友', '直接回信給寄件者要求說明'], a: 1,
        explain: '「報」是指使用公司內部的資安通報機制進行回報，每一次通報都可能阻止後續更大的風險蔓延。切勿公開或自行回覆。' }
    ],
    bullying: [
      { q: '主管發現職場霸凌行為應該?', opts: ['視而不見', '依公司程序調查並適當處置', '幫加害者隱瞞', '責備受害者'], a: 1,
        explain: '主管有義務依公司規定啟動調查程序。視而不見或包庇不僅失職，更可能讓主管本身承擔連帶法律責任。' },
      { q: '預防職場不法侵害,主管應?', opts: ['營造尊重的工作環境並建立通報機制', '只關心業績', '禁止員工發言', '不需介入'], a: 0,
        explain: '預防職場霸凌的根本在於主管以身作則，打造尊重包容的工作環境，並確保員工有安全可用的通報管道。' }
    ],
    harassment: [
      { q: '主管接獲性騷擾申訴應?', opts: ['告訴申訴人想開一點', '立即依規定保密受理並啟動調查', '通報加害者', '公開申訴內容'], a: 1,
        explain: '接獲申訴後，主管必須立即保密受理並依性騷擾防治規定啟動調查。洩漏申訴人資訊或公開事件均屬違法。' },
      { q: '預防職場性騷擾,主管角色為?', opts: ['以身作則並建立友善環境', '袖手旁觀', '只處理嚴重案件', '不需教育下屬'], a: 0,
        explain: '主管應以身作則，積極宣導性騷擾防治觀念，建立友善職場環境。輕微案件同樣須重視，不得以「不嚴重」為由忽視。' }
    ]
  };

  function renderQuiz(courseId) {
    const qs = QUIZ_BANK[courseId] || [];
    return qs.map((q, qi) => `
      <div class="quiz-question">
        <div class="q-text">Q${qi+1}. ${q.q}</div>
        <div class="quiz-options">
          ${q.opts.map((o, oi) => `
            <label class="quiz-option">
              <input type="radio" name="q${qi}" value="${oi}" style="margin-right:8px;" />
              <span>${o}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  function gradeQuiz(courseId) {
    const qs = QUIZ_BANK[courseId] || [];
    let correct = 0;
    qs.forEach((q, qi) => {
      const picked = document.querySelector(`input[name="q${qi}"]:checked`);
      if (picked && parseInt(picked.value) === q.a) correct++;
    });
    return qs.length ? Math.round(correct * 100 / qs.length) : 0;
  }

  function formatTime(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return `${d.getFullYear()}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  }

  function downloadDemo(name) {
    toast(`(示範) 開始下載 ${name}`, 'success');
  }

  // ===== 啟動 =====
  function start() {
    bindLogin();
    bindNav();
    bindLanding();
    window.addEventListener('beforeunload', flushStudyTimer);
    const u = Data.getCurrentUser();
    if (u) enterApp();
  }

  return { start, go: renderRoute, downloadDemo, logout };
})();

document.addEventListener('DOMContentLoaded', App.start);

