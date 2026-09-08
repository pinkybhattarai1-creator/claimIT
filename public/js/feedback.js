/**
 * ClaimIT Frontend - Instant Hospital Feedback & Bug Reporting Widget
 * Provides a zero-friction floating feedback button and quick submission modal
 * with automatic context capture (device, page, screen dimensions) and PDPA notice.
 */

(function() {
  let selectedCategory = 'suggestion';
  let selectedRating = 5;

  function detectDeviceInfo() {
    const ua = navigator.userAgent;
    let device = 'Desktop PC';
    if (/iPhone/i.test(ua)) device = 'Apple iPhone';
    else if (/iPad/i.test(ua)) device = 'Apple iPad';
    else if (/Android/i.test(ua)) device = 'Android Device';
    else if (/Mobile/i.test(ua)) device = 'Mobile Browser';

    const width = window.innerWidth;
    const height = window.innerHeight;
    return {
      label: `${device} (${width}x${height})`,
      screen: `${width}x${height}`
    };
  }

  function getActivePageName() {
    if (typeof state !== 'undefined' && state.activeView) {
      if (state.activeView === 'ward') return 'ระบบแจ้งซ่อมเจ้าหน้าที่ (Staff Portal)';
      if (state.activeView === 'it') return 'ศูนย์จัดการเคลม & IT Hub';
      if (state.activeView === 'config') return 'ตั้งค่าระบบ (Admin/Config)';
      if (state.activeView === 'auth') return 'หน้าจอเข้าสู่ระบบ (Login)';
    }
    return window.location.pathname || 'หน้าหลัก';
  }

  function initFeedbackWidget() {
    if (document.getElementById('claimit-feedback-btn')) return;

    // 1. Inject Floating Action Button (FAB)
    const fab = document.createElement('div');
    fab.id = 'claimit-feedback-btn';
    fab.innerHTML = `
      <button type="button" class="feedback-fab-btn" onclick="openFeedbackModal()" title="ส่งความคิดเห็น / แจ้งปัญหาการใช้งาน">
        <span class="feedback-fab-icon">💬</span>
        <span class="feedback-fab-text">ติชม / แจ้งปัญหา</span>
      </button>
    `;
    document.body.appendChild(fab);

    // 2. Inject Feedback Modal
    const modal = document.createElement('div');
    modal.id = 'claimit-feedback-modal';
    modal.className = 'modal-backdrop';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="modal-dialog feedback-modal-dialog" style="max-width: 580px;">
        <div class="modal-header" style="flex-direction: column; align-items: stretch; gap: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">💬</span>
              <h3 style="font-size: 16px; margin: 0; color: var(--text-primary);">ระบบติชม & กระดานติดตามปัญหา (Hospital Feedback)</h3>
            </div>
            <button type="button" class="modal-close-btn" onclick="closeFeedbackModal()" aria-label="ปิด">✕</button>
          </div>
          <!-- Modal Tab Navigation -->
          <div style="display: flex; gap: 8px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 4px;">
            <button type="button" id="feedback-tab-form-btn" class="feedback-nav-tab active" onclick="switchFeedbackTab('form')">
              ✍️ ส่งข้อคิดเห็น / แจ้งปัญหา
            </button>
            <button type="button" id="feedback-tab-board-btn" class="feedback-nav-tab" onclick="switchFeedbackTab('board')">
              📋 กระดานรายการที่แจ้งไว้ (<span id="feedback-board-count">0</span>)
            </button>
          </div>
        </div>

        <!-- TAB 1: SUBMISSION FORM -->
        <div id="feedback-tab-form-content" class="modal-body" style="padding: 16px 20px;">
          <!-- PDPA & Hospital Privacy Reminder -->
          <div class="feedback-pdpa-alert">
            🛡️ <strong>ข้อกำหนดความเป็นส่วนตัว (PDPA):</strong> กรุณาไม่กรอกข้อมูลส่วนบุคคลของผู้ป่วย (เช่น HN, เลขบัตรประชาชน หรือประวัติรักษา)
          </div>

          <!-- Category Selection -->
          <div style="margin-top: 14px;">
            <label style="font-size: 12px; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 6px;">
              ประเภทข้อเสนอแนะ:
            </label>
            <div class="feedback-category-pills">
              <button type="button" class="feedback-cat-pill" data-cat="suggestion" onclick="setFeedbackCategory('suggestion')">
                💡 ข้อเสนอแนะ / อยากให้มี
              </button>
              <button type="button" class="feedback-cat-pill" data-cat="bug" onclick="setFeedbackCategory('bug')">
                🐞 พบปัญหา / ปุ่มกดไม่ติด
              </button>
              <button type="button" class="feedback-cat-pill" data-cat="ux" onclick="setFeedbackCategory('ux')">
                ❓ ใช้งานยาก / สับสน
              </button>
            </div>
          </div>

          <!-- Star Rating -->
          <div style="margin-top: 14px;">
            <label style="font-size: 12px; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 4px;">
              ระดับความพึงพอใจในจุดนี้:
            </label>
            <div class="feedback-stars-row" id="feedback-stars-container">
              <span class="star active" data-val="1" onclick="setFeedbackRating(1)">★</span>
              <span class="star active" data-val="2" onclick="setFeedbackRating(2)">★</span>
              <span class="star active" data-val="3" onclick="setFeedbackRating(3)">★</span>
              <span class="star active" data-val="4" onclick="setFeedbackRating(4)">★</span>
              <span class="star active" data-val="5" onclick="setFeedbackRating(5)">★</span>
              <span id="feedback-rating-label" style="font-size: 12px; color: var(--text-muted); margin-left: 8px;">ดีมาก (5/5)</span>
            </div>
          </div>

          <!-- Comment Textarea -->
          <div style="margin-top: 14px;">
            <label for="feedback-comment-input" style="font-size: 12px; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 6px;">
              รายละเอียด (บอกเราได้เต็มที่เลยครับ): <span style="color: var(--danger);">*</span>
            </label>
            <textarea id="feedback-comment-input" class="form-control" rows="3" placeholder="เช่น 'ปุ่มบันทึกบนมือถือกดยาก', 'อยากให้มีช่องพิมพ์ชื่อหมวดหมู่เร็วขึ้น'..." style="resize: vertical; font-size: 14px;"></textarea>
          </div>

          <!-- Reporter Name (Optional) -->
          <div style="margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;" id="feedback-user-info-row">
            <div>
              <label for="feedback-reporter-name" style="font-size: 11.5px; color: var(--text-muted); display: block; margin-bottom: 4px;">ชื่อผู้แจ้ง (ระบุหรือไม่ก็ได้):</label>
              <input type="text" id="feedback-reporter-name" class="form-control" style="font-size: 13px; padding: 6px 10px;" placeholder="เช่น เจ้าหน้าที่แผนกยา / ช่างไอที / แอดมิน">
            </div>
            <div>
              <label for="feedback-reporter-dept" style="font-size: 11.5px; color: var(--text-muted); display: block; margin-bottom: 4px;">แผนก / จุดบริการ:</label>
              <input type="text" id="feedback-reporter-dept" class="form-control" style="font-size: 13px; padding: 6px 10px;" placeholder="เช่น OPD, แผนกยา, การเงิน, ไอที">
            </div>
          </div>

          <!-- Auto Context Footer -->
          <div class="feedback-context-tag" id="feedback-context-display">
            📍 กำลังส่งข้อมูลจาก: กำลังตรวจจับ...
          </div>
        </div>

        <!-- TAB 2: PUBLIC BOARD & HEALTH STATUS -->
        <div id="feedback-tab-board-content" class="modal-body" style="padding: 16px 20px; display: none;">
          <!-- Live Health Status Indicator -->
          <div id="feedback-server-health-box" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius-md); margin-bottom: 12px; font-size: 12.5px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span id="health-dot" style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #22c55e;"></span>
              <strong id="health-text" style="color: #166534;">เซิร์ฟเวอร์ออนไลน์ & ฐานข้อมูลเชื่อมต่อแล้ว</strong>
            </div>
            <button type="button" class="btn btn-secondary" onclick="loadPublicFeedbackBoard()" style="font-size: 11.5px; padding: 4px 8px;">🔄 รีเฟรช</button>
          </div>

          <!-- Explanation notice -->
          <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">
            📌 ทุกคนสามารถดูรายการข้อเสนอแนะและปัญหาที่แจ้งไว้ได้ที่นี่ เพื่อความโปร่งใสและตรวจสอบว่าข้อมูลถูกส่งถึงระบบเรียบร้อย:
          </div>

          <!-- Feedback Items List -->
          <div id="feedback-public-items-list" style="max-height: 280px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
            <div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 13px;">กำลังโหลดข้อมูล...</div>
          </div>
        </div>

        <div class="modal-footer" id="feedback-modal-footer" style="padding: 12px 20px; display: flex; justify-content: space-between; align-items: center;">
          <button type="button" class="btn btn-secondary" onclick="closeFeedbackModal()">ปิด</button>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn btn-secondary" id="btn-view-board" onclick="switchFeedbackTab('board')">
              📋 ดูกระดานสถานะ
            </button>
            <button type="button" class="btn btn-primary" id="btn-submit-feedback" onclick="submitFeedback()" style="min-width: 120px;">
              🚀 ส่งความคิดเห็น
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Initial default pill
    setFeedbackCategory('suggestion');
    loadPublicFeedbackCount();
  }

  function openFeedbackModal() {
    initFeedbackWidget();
    const modal = document.getElementById('claimit-feedback-modal');
    if (!modal) return;

    // Fill contextual information
    const dev = detectDeviceInfo();
    const page = getActivePageName();
    const contextEl = document.getElementById('feedback-context-display');
    if (contextEl) {
      contextEl.innerHTML = `📍 <strong>หน้าจอ:</strong> ${page} &nbsp;|&nbsp; 📱 <strong>อุปกรณ์:</strong> ${dev.label}`;
    }

    // Pre-fill user if logged in
    if (typeof state !== 'undefined' && state.user) {
      const nameInput = document.getElementById('feedback-reporter-name');
      const deptInput = document.getElementById('feedback-reporter-dept');
      if (nameInput && !nameInput.value) nameInput.value = state.user.name || state.user.username || '';
      if (deptInput && !deptInput.value) deptInput.value = state.user.department || '';
    }

    modal.style.display = 'flex';
    const commentInput = document.getElementById('feedback-comment-input');
    if (commentInput) {
      setTimeout(() => commentInput.focus(), 100);
    }
  }
  window.openFeedbackModal = openFeedbackModal;

  function closeFeedbackModal() {
    const modal = document.getElementById('claimit-feedback-modal');
    if (modal) modal.style.display = 'none';
  }
  window.closeFeedbackModal = closeFeedbackModal;

  function setFeedbackCategory(cat) {
    selectedCategory = cat;
    const pills = document.querySelectorAll('.feedback-cat-pill');
    pills.forEach(p => {
      if (p.getAttribute('data-cat') === cat) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });
  }
  window.setFeedbackCategory = setFeedbackCategory;

  function setFeedbackRating(val) {
    selectedRating = val;
    const stars = document.querySelectorAll('#feedback-stars-container .star');
    stars.forEach((s, idx) => {
      if (idx < val) s.classList.add('active');
      else s.classList.remove('active');
    });

    const labels = {
      1: 'ปรับปรุงด่วน (1/5)',
      2: 'ยังใช้งานยาก (2/5)',
      3: 'พอใช้ได้ (3/5)',
      4: 'ใช้งานดี (4/5)',
      5: 'ยอดเยี่ยม สะดวกมาก (5/5)'
    };
    const labelEl = document.getElementById('feedback-rating-label');
    if (labelEl) labelEl.textContent = labels[val] || `${val}/5`;
  }
  window.setFeedbackRating = setFeedbackRating;

  async function submitFeedback() {
    const commentInput = document.getElementById('feedback-comment-input');
    const comment = commentInput ? commentInput.value.trim() : '';

    if (!comment) {
      if (typeof showToast === 'function') {
        showToast('กรุณากรอกข้อความก่อนส่งความคิดเห็นครับ', 'warning');
      } else {
        alert('กรุณากรอกข้อความก่อนส่งความคิดเห็น');
      }
      if (commentInput) commentInput.focus();
      return;
    }

    const nameInput = document.getElementById('feedback-reporter-name');
    const deptInput = document.getElementById('feedback-reporter-dept');
    const reporter_name = nameInput ? nameInput.value.trim() : '';
    const department = deptInput ? deptInput.value.trim() : '';

    const dev = detectDeviceInfo();
    const page_url = window.location.pathname + (window.location.hash || '');

    const btn = document.getElementById('btn-submit-feedback');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⏳ กำลังส่ง...';
    }

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (typeof getAuthHeaders === 'function') {
        const auth = getAuthHeaders();
        if (auth.Authorization) headers.Authorization = auth.Authorization;
      }

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          category: selectedCategory,
          page_url: `${getActivePageName()} (${page_url})`,
          comment,
          rating: selectedRating,
          reporter_name: reporter_name || undefined,
          department: department || undefined,
          device_info: dev.label,
          screen_size: dev.screen
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ส่งข้อมูลไม่สำเร็จ');

      // Save ticket to local storage on this device (Permanent offline backup)
      try {
        const myIds = JSON.parse(localStorage.getItem('claimit_my_feedback_ids') || '[]');
        myIds.unshift({ id: data.id, comment, time: new Date().toISOString(), category: selectedCategory });
        localStorage.setItem('claimit_my_feedback_ids', JSON.stringify(myIds.slice(0, 50)));
      } catch (e) {}

      if (commentInput) commentInput.value = '';
      loadPublicFeedbackCount();

      if (typeof showToast === 'function') {
        showToast(`🎉 ขอบคุณสำหรับข้อเสนอแนะ! บันทึกรหัส #${data.id} เรียบร้อยแล้ว`, 'success', 4000);
      } else {
        alert(`ขอบคุณสำหรับข้อเสนอแนะ! บันทึกรหัส #${data.id} เรียบร้อยแล้ว`);
      }

      // Auto-switch to board tab so the tester sees their feedback right on the screen
      switchFeedbackTab('board');

      // Enforce 3-second frontend anti-spam cooldown on the submit button
      if (btn) {
        let cd = 3;
        btn.disabled = true;
        btn.innerHTML = `⏳ รออีก ${cd}s`;
        const cdTimer = setInterval(() => {
          cd--;
          if (cd <= 0) {
            clearInterval(cdTimer);
            btn.disabled = false;
            btn.innerHTML = '🚀 ส่งความคิดเห็น';
          } else {
            btn.innerHTML = `⏳ รออีก ${cd}s`;
          }
        }, 1000);
      }
    } catch (err) {
      console.error('Feedback submit error:', err);
      if (typeof showToast === 'function') {
        showToast(err.message || 'เกิดข้อผิดพลาดในการส่งข้อมูล', 'error');
      } else {
        alert(err.message || 'ส่งข้อมูลไม่สำเร็จ');
      }
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '🚀 ส่งความคิดเห็น';
      }
    }
  }
  window.submitFeedback = submitFeedback;

  function switchFeedbackTab(tab) {
    const formTabBtn = document.getElementById('feedback-tab-form-btn');
    const boardTabBtn = document.getElementById('feedback-tab-board-btn');
    const formContent = document.getElementById('feedback-tab-form-content');
    const boardContent = document.getElementById('feedback-tab-board-content');
    const submitBtn = document.getElementById('btn-submit-feedback');
    const viewBoardBtn = document.getElementById('btn-view-board');

    if (tab === 'board') {
      if (formTabBtn) formTabBtn.classList.remove('active');
      if (boardTabBtn) boardTabBtn.classList.add('active');
      if (formContent) formContent.style.display = 'none';
      if (boardContent) boardContent.style.display = 'block';
      if (submitBtn) submitBtn.style.display = 'none';
      if (viewBoardBtn) {
        viewBoardBtn.innerHTML = '✍️ กลับไปหน้าเขียน';
        viewBoardBtn.onclick = () => switchFeedbackTab('form');
      }
      loadPublicFeedbackBoard();
    } else {
      if (formTabBtn) formTabBtn.classList.add('active');
      if (boardTabBtn) boardTabBtn.classList.remove('active');
      if (formContent) formContent.style.display = 'block';
      if (boardContent) boardContent.style.display = 'none';
      if (submitBtn) submitBtn.style.display = 'inline-block';
      if (viewBoardBtn) {
        viewBoardBtn.innerHTML = '📋 ดูกระดานสถานะ';
        viewBoardBtn.onclick = () => switchFeedbackTab('board');
      }
    }
  }
  window.switchFeedbackTab = switchFeedbackTab;

  async function checkServerHealth() {
    const box = document.getElementById('feedback-server-health-box');
    const dot = document.getElementById('health-dot');
    const text = document.getElementById('health-text');
    if (!box || !dot || !text) return;

    try {
      const res = await fetch('/health');
      const data = await res.json();
      if (res.ok && data.status === 'UP') {
        box.style.background = '#f0fdf4';
        box.style.borderColor = '#bbf7d0';
        dot.style.background = '#22c55e';
        text.style.color = '#166534';
        text.textContent = '🟢 เซิร์ฟเวอร์ออนไลน์ & ฐานข้อมูลเชื่อมต่อปกติ (Connected)';
      } else {
        throw new Error('Database status not OK');
      }
    } catch (e) {
      box.style.background = '#fef2f2';
      box.style.borderColor = '#fecaca';
      dot.style.background = '#ef4444';
      text.style.color = '#991b1b';
      text.textContent = '🔴 ตรวจพบปัญหาการเชื่อมต่อเซิร์ฟเวอร์';
    }
  }

  async function loadPublicFeedbackCount() {
    try {
      const res = await fetch('/api/feedback/public');
      if (!res.ok) return;
      const list = await res.json();
      const countEl = document.getElementById('feedback-board-count');
      if (countEl) countEl.textContent = list.length || 0;
    } catch (e) {}
  }

  async function loadPublicFeedbackBoard() {
    checkServerHealth();
    const container = document.getElementById('feedback-public-items-list');
    if (!container) return;

    container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 13px;">กำลังโหลดกระดานข้อเสนอแนะ...</div>';

    try {
      const res = await fetch('/api/feedback/public');
      if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลได้');
      const items = await res.json();

      const countEl = document.getElementById('feedback-board-count');
      if (countEl) countEl.textContent = items.length || 0;

      if (!items || items.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 13px;">ยังไม่มีรายการแจ้งปัญหาในระบบ (คุณสามารถเป็นคนแรกที่ส่งได้ครับ)</div>';
        return;
      }

      // Check which feedbacks belong to this browser device
      let myIds = [];
      try {
        const stored = JSON.parse(localStorage.getItem('claimit_my_feedback_ids') || '[]');
        myIds = stored.map(s => s.id);
      } catch (e) {}

      const catBadges = {
        bug: '<span style="background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600;">🐞 แจ้งปัญหา</span>',
        suggestion: '<span style="background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600;">💡 ข้อเสนอแนะ</span>',
        ux: '<span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600;">❓ ใช้งานยาก</span>',
        other: '<span style="background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600;">💬 ทั่วไป</span>'
      };

      const statusBadges = {
        open: '<span style="background: #fffbeb; color: #b45309; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600;">⏳ รอตรวจ</span>',
        reviewed: '<span style="background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600;">👀 รับทราบแล้ว</span>',
        resolved: '<span style="background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600;">✅ แก้ไขแล้ว</span>'
      };

      container.innerHTML = items.map(item => {
        const isMine = myIds.includes(item.id);
        const mineBadge = isMine ? '<span style="background: #fdf2f8; color: #be185d; border: 1px solid #fbcfe8; padding: 1px 6px; border-radius: 4px; font-size: 10.5px; font-weight: 700;">📱 เครื่องของคุณ</span>' : '';
        const cat = catBadges[item.category] || catBadges.other;
        const status = statusBadges[item.status] || item.status;
        const stars = item.rating ? '⭐️'.repeat(item.rating) : '';
        const timeStr = item.created_at ? new Date(item.created_at).toLocaleString('th-TH', { hour12: false }) : '';

        const adminReply = item.admin_note ? `
          <div style="margin-top: 8px; padding: 6px 10px; background: #f0fdf4; border-left: 3px solid #16a34a; border-radius: 4px; font-size: 12px; color: #166534;">
            <strong>💬 ตอบกลับจากแอดมิน:</strong> ${escapeHtml(item.admin_note)}
          </div>
        ` : '';

        return `
          <div style="background: var(--surface-card); border: 1px solid ${isMine ? '#f472b6' : 'var(--border-subtle)'}; border-radius: var(--radius-md); padding: 10px 12px; font-size: 13px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-weight: 700; color: var(--text-primary);">#${item.id}</span>
                ${cat}
                ${mineBadge}
              </div>
              <div>${status}</div>
            </div>
            <div style="color: var(--text-primary); font-size: 13.5px; margin: 6px 0; line-height: 1.4;">
              ${escapeHtml(item.comment)}
            </div>
            ${adminReply}
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-muted); margin-top: 6px;">
              <span>👤 ${escapeHtml(item.reporter_name || 'ทั่วไป')} (${escapeHtml(item.department || '-')})</span>
              <span>${stars} ${timeStr}</span>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--danger); font-size: 13px;">เกิดข้อผิดพลาดในการโหลดกระดาน: ${e.message}</div>`;
    }
  }
  window.loadPublicFeedbackBoard = loadPublicFeedbackBoard;

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Auto-mount widget once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFeedbackWidget);
  } else {
    initFeedbackWidget();
  }
})();
