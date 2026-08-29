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
  } catch {}
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

    // Anti-Typo: If Scanner-Only Mode is checked, prevent slow human typing
    if (scannerOnlyChk && scannerOnlyChk.checked) {
      if (delta > 60 && input.value.length > 0) {
        e.preventDefault();
        showToast('🔒 โหมดสแกนเนอร์เปิดอยู่: กรุณาใช้เครื่องสแกนบาร์โค้ด หรือยกเลิกเครื่องหมายเพื่อพิมพ์ด้วยมือ', 'warning', 2500);
        return;
      }
    }

    // Scanner Burst Detector: When rapid keystrokes stop (<180ms debounce)
    clearTimeout(burstTimer);
    burstTimer = setTimeout(() => {
      const clean = input.value.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toUpperCase();
      // Check if length is within flexible hospital tag range (6 to 30 chars)
      if (clean.length >= 6 && clean.length <= 30) {
        if (/^CIT-\d{4}-[A-Z0-9]{2,5}-\d{1,4}$/i.test(clean) || /^[A-Z0-9\-_]{6,30}$/i.test(clean)) {
          hideFuzzySuggestion();
          lookupAsset(clean);
        }
      }
    }, 180);
  });

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
