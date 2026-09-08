/**
 * ClaimIT Frontend - Smart Scanner & Tag Parser
 * Handles hardware burst detection (<40ms cadence), anti-typo mode,
 * local heuristics tag parsing, and fuzzy suggestion banners.
 */

// Helper to hide fuzzy suggestion banners safely
function hideFuzzySuggestion() {
  const wardBanner = document.getElementById('fuzzy-suggestion-ward');
  const itBanner = document.getElementById('fuzzy-suggestion-it');
  if (wardBanner) wardBanner.style.display = 'none';
  if (itBanner) itBanner.style.display = 'none';
}

// Audio Feedback for Barcode Scanning (Subtle Hospital Standard Beep)
function playScanBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (err) {
    console.debug('[AudioContext Beep] Playback skipped or not permitted by browser audio policy:', err);
  }
}

// Deterministic Tag Parser for Hospital IT Assets & Hardware
function parseAssetTagLocal(rawText) {
  if (!rawText) return { state: 'INVALID', raw: '', format: null };
  const clean = String(rawText).replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/[\r\n\t]/g, '').trim().toUpperCase();
  
  if (clean.startsWith('CIT-')) {
    const m = clean.match(/^CIT-(\d{4})-([A-Z0-9]{2,5})-(\d{1,4})$/);
    if (m) {
      const year = parseInt(m[1], 10);
      return { state: 'VALID', raw: clean, format: 'STANDARD_CIT', year, categoryCode: m[2], sequence: m[3] };
    }
    return { state: 'MALFORMED', raw: clean, format: 'STANDARD_CIT', year: null };
  }
  
  if (clean.startsWith('LNR-')) {
    const m = clean.match(/^LNR-([A-Z0-9]{2,5})-(\d{1,4})$/);
    if (m) {
      return { state: 'VALID', raw: clean, format: 'LOANER', categoryCode: m[1], sequence: m[2] };
    }
    return { state: 'MALFORMED', raw: clean, format: 'LOANER' };
  }
  
  if (/^\d+$/.test(clean)) {
    if (clean.length >= 10 && clean.length <= 14) {
      return { state: 'VALID', raw: clean, format: 'LEGACY_NUMERIC', isLegacy: true };
    }
    return { state: 'MALFORMED', raw: clean, format: 'LEGACY_NUMERIC', isLegacy: true };
  }
  
  if (clean.length >= 4 && clean.length <= 30 && !/[^A-Z0-9\-_\.\/]/i.test(clean)) {
    return { state: 'VALID', raw: clean, format: 'SERIAL_NUMBER' };
  }
  
  return { state: 'UNSUPPORTED_FORMAT', raw: clean, format: null };
}

function displayLocalParserResults(parsed) {
  // Silent in production UI to ensure clean hospital workflow presentation
}

// Smart Scanner & Anti-Typo Engine
function setupSmartScanner(inputId, isScannerOnlyId) {
  const input = document.getElementById(inputId);
  const scannerOnlyChk = document.getElementById(isScannerOnlyId);
  if (!input) return;

  // Auto-select text on focus so subsequent barcode scans cleanly overwrite
  input.addEventListener('focus', () => input.select());

  let lastKeystrokeTime = 0;
  let burstTimer = null;

  input.addEventListener('keydown', (e) => {
    const now = Date.now();
    const delta = now - lastKeystrokeTime;
    lastKeystrokeTime = now;

    // Enter key -> immediate search
    if (e.key === 'Enter') {
      e.preventDefault();
      hideFuzzySuggestion();
      const cleanVal = input.value.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toUpperCase();
      if (cleanVal) lookupAsset(cleanVal);
      return;
    }

    // Allow control keys (Backspace, Tab, Delete, Arrow keys, etc.)
    if (e.key.length > 1) return;

    // Normal typing is always allowed without keystroke timing choke.
    // Escape key clears any active suggestions/focus
    if (e.key === 'Escape') {
      hideFuzzySuggestion();
      return;
    }

    // Scanner Burst Detector: When rapid keystrokes stop (<180ms debounce, or 60ms if scanner-only)
    clearTimeout(burstTimer);
    const debounceMs = (scannerOnlyChk && scannerOnlyChk.checked) ? 60 : 180;
    burstTimer = setTimeout(() => {
      const clean = input.value.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toUpperCase();
      // Check if length is within flexible hospital tag range (6 to 30 chars)
      if (clean.length >= 6 && clean.length <= 30) {
        if (/^CIT-\d{4}-[A-Z0-9]{2,5}-\d{1,4}$/i.test(clean) || /^[A-Z0-9\-_]{6,30}$/i.test(clean)) {
          hideFuzzySuggestion();
          lookupAsset(clean);
        }
      }
    }, debounceMs);
  });

  if (scannerOnlyChk) {
    scannerOnlyChk.addEventListener('change', () => {
      if (scannerOnlyChk.checked) {
        input.focus();
      }
    });

    // When scanner-only is checked, re-focus if blur occurs when no modal is open
    input.addEventListener('blur', () => {
      if (scannerOnlyChk.checked) {
        setTimeout(() => {
          const activeModals = document.querySelectorAll('.modal.is-active, [id$="-modal"]');
          const isModalOpen = Array.from(activeModals).some(m => m.style.display && m.style.display !== 'none' && m.offsetParent !== null);
          if (!isModalOpen && scannerOnlyChk.checked) {
            input.focus();
          }
        }, 150);
      }
    });
  }

  input.addEventListener('input', () => {
    // Auto-uppercase & remove invalid whitespace / zero-width characters
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const raw = input.value;
    const cleaned = raw.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, '').toUpperCase();
    if (raw !== cleaned) {
      input.value = cleaned;
      input.setSelectionRange(Math.min(start, cleaned.length), Math.min(end, cleaned.length));
    }
  });
}

// Global Quick-Preset Click Handler
window.selectPreset = function(tag) {
  const prefix = state.activeView === 'ward' ? 'ward' : 'it';
  const input = document.getElementById(`${prefix}-search-input`);
  if (input) input.value = tag;
  lookupAsset(tag);
};

// ─── Camera Barcode Detector (Mobile & Tablet) ─────────────────────────────
let cameraStream = null;
let barcodeDetectorInstance = null;
let isDetectingBarcode = false;
let activeScanTargetPrefix = 'ward';

async function initBarcodeDetector() {
  if ('BarcodeDetector' in window) {
    try {
      const supported = await window.BarcodeDetector.getSupportedFormats();
      const formats = ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code', 'data_matrix', 'upc_a', 'upc_e']
        .filter(f => supported.includes(f));
      barcodeDetectorInstance = new window.BarcodeDetector({ formats });
      return true;
    } catch (e) {
      console.warn('BarcodeDetector initialization warning:', e);
    }
  }
  return false;
}

async function openCameraBarcodeScanner(prefix = 'ward') {
  activeScanTargetPrefix = prefix;
  let modal = document.getElementById('camera-barcode-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'camera-barcode-modal';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 460px; width: 95%;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px;">📷</span>
            <h3 style="font-size: 16px; margin: 0;">สแกนบาร์โค้ดด้วยกล้อง</h3>
          </div>
          <button type="button" class="modal-close-btn" onclick="closeCameraBarcodeScanner()">✕</button>
        </div>
        <div class="modal-body" style="padding: 16px; text-align: center;">
          <div class="camera-scanner-viewfinder">
            <video id="barcode-scanner-video" playsinline autoplay muted></video>
            <div class="camera-scanner-target"></div>
          </div>
          <div id="camera-scanner-status" style="margin-top: 12px; font-size: 13px; font-weight: 600; color: var(--text-secondary);">
            กำลังเปิดกล้อง...
          </div>
          <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px;">
            นำกล้องจ่อที่บาร์โค้ดหรือ QR Code ของครุภัณฑ์
          </div>
          <div id="camera-fallback-zone" style="display: none; margin-top: 12px; padding: 10px; background: var(--surface-subtle); border-radius: var(--radius-md);">
            <p style="font-size: 12px; color: var(--warning-text); margin: 0 0 8px 0;">กล้องไลฟ์สแกนไม่รองรับในเบราว์เซอร์นี้ คุณสามารถถ่ายภาพแทนได้:</p>
            <input type="file" id="camera-barcode-file-input" accept="image/*" capture="environment" onchange="handleBarcodePhotoUpload(event)">
          </div>
        </div>
        <div class="modal-footer" style="justify-content: space-between;">
          <button type="button" class="btn btn-secondary" onclick="toggleCameraTorch()" id="btn-camera-torch" style="display: none;">💡 เปิดไฟฉาย</button>
          <button type="button" class="btn btn-secondary" onclick="closeCameraBarcodeScanner()" style="margin-left: auto;">ปิดหน้าต่าง</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  modal.style.display = 'flex';
  const video = document.getElementById('barcode-scanner-video');
  const statusEl = document.getElementById('camera-scanner-status');
  const fallbackZone = document.getElementById('camera-fallback-zone');
  if (fallbackZone) fallbackZone.style.display = 'none';

  try {
    const hasDetector = await initBarcodeDetector();
    const constraints = {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };

    cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    if (video) {
      video.srcObject = cameraStream;
      await video.play();
      if (statusEl) statusEl.textContent = '🟢 กำลังตรวจจับบาร์โค้ดอัตโนมัติ...';

      const track = cameraStream.getVideoTracks()[0];
      const torchBtn = document.getElementById('btn-camera-torch');
      if (track && track.getCapabilities && track.getCapabilities().torch && torchBtn) {
        torchBtn.style.display = 'inline-flex';
      }

      if (hasDetector && barcodeDetectorInstance) {
        isDetectingBarcode = true;
        startContinuousBarcodeDetection(video);
      } else {
        if (statusEl) statusEl.textContent = 'ℹ️ ไม่พบ Live BarcodeDetector สามารถถ่ายรูปบาร์โค้ดเพื่อตรวจจับได้';
        if (fallbackZone) fallbackZone.style.display = 'block';
      }
    }
  } catch (err) {
    console.error('Camera access error:', err);
    if (statusEl) {
      statusEl.innerHTML = `<span style="color:var(--danger)">❌ ไม่สามารถเปิดกล้องได้: ${err.message || 'กรุณาอนุญาตให้เข้าถึงกล้อง'}</span>`;
    }
    if (fallbackZone) fallbackZone.style.display = 'block';
  }
}
window.openCameraBarcodeScanner = openCameraBarcodeScanner;

function closeCameraBarcodeScanner() {
  isDetectingBarcode = false;
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  const modal = document.getElementById('camera-barcode-modal');
  if (modal) modal.style.display = 'none';
}
window.closeCameraBarcodeScanner = closeCameraBarcodeScanner;

async function startContinuousBarcodeDetection(video) {
  if (!isDetectingBarcode || !barcodeDetectorInstance || !video) return;

  try {
    if (video.readyState >= 2) {
      const barcodes = await barcodeDetectorInstance.detect(video);
      if (barcodes && barcodes.length > 0) {
        const rawCode = barcodes[0].rawValue;
        if (rawCode) {
          handleBarcodeDetected(rawCode);
          return;
        }
      }
    }
  } catch (e) {
    // Frame skip
  }

  if (isDetectingBarcode) {
    requestAnimationFrame(() => startContinuousBarcodeDetection(video));
  }
}

function handleBarcodeDetected(rawCode) {
  playScanBeep();
  if (navigator.vibrate) {
    try { navigator.vibrate(100); } catch {}
  }

  const clean = String(rawCode).replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toUpperCase();
  closeCameraBarcodeScanner();

  const inputId = `${activeScanTargetPrefix}-search-input`;
  const input = document.getElementById(inputId);
  if (input) {
    input.value = clean;
  }

  if (typeof showToast === 'function') {
    showToast(`🎯 ตรวจพบบาร์โค้ด: ${clean}`, 'success', 3000);
  }

  if (typeof lookupAsset === 'function') {
    lookupAsset(clean);
  }
}

async function handleBarcodePhotoUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const statusEl = document.getElementById('camera-scanner-status');
  if (statusEl) statusEl.textContent = '⏳ กำลังประมวลผลรูปภาพบาร์โค้ด...';

  try {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();

    if ('BarcodeDetector' in window) {
      const detector = new window.BarcodeDetector();
      const barcodes = await detector.detect(img);
      if (barcodes && barcodes.length > 0) {
        handleBarcodeDetected(barcodes[0].rawValue);
        return;
      }
    }
    if (statusEl) statusEl.textContent = '❌ ไม่พบบาร์โค้ดในภาพ กรุณาลองพิมพ์รหัสแทน';
  } catch (err) {
    console.error('Barcode photo error:', err);
    if (statusEl) statusEl.textContent = '❌ ไม่สามารถอ่านภาพได้';
  }
}
window.handleBarcodePhotoUpload = handleBarcodePhotoUpload;

let isTorchOn = false;
async function toggleCameraTorch() {
  if (!cameraStream) return;
  const track = cameraStream.getVideoTracks()[0];
  if (track && track.applyConstraints) {
    isTorchOn = !isTorchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: isTorchOn }] });
      const torchBtn = document.getElementById('btn-camera-torch');
      if (torchBtn) torchBtn.textContent = isTorchOn ? '🔦 ปิดไฟฉาย' : '💡 เปิดไฟฉาย';
    } catch (e) {
      console.warn('Torch toggle error:', e);
    }
  }
}
window.toggleCameraTorch = toggleCameraTorch;

