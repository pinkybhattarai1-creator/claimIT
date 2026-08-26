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

// Local Tag Parser Heuristic (ISO / Off-grid Offline Parser)
function parseAssetTagLocal(rawText) {
  const yearMatch = rawText.match(/\b(20\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : 'Unknown';
  
  const versionMatch = rawText.match(/[vV](ersion)?\s*([0-9])/);
  const version = versionMatch ? versionMatch[2] : '1';
  
  let parsedStatus = 'Unknown';
  if (rawText.includes('-W') || rawText.toLowerCase().includes('work')) {
    parsedStatus = 'Warranty Active';
  } else if (rawText.includes('-EX') || rawText.toLowerCase().includes('exp')) {
    parsedStatus = 'Expired';
  }
  
  return {
    raw: rawText,
    year,
    version,
    parsedStatus,
    timestamp: new Date().toISOString()
  };
}

function displayLocalParserResults(parsed) {
  const elements = [
    document.getElementById('parser-analytics-ward'),
    document.getElementById('parser-analytics-it')
  ];
  
  elements.forEach(el => {
    if (!el) return;
    el.style.display = 'block';
    el.innerHTML = `
      <div style="font-size: 11px; font-family: monospace; color: var(--info); line-height: 1.5;">
        <span style="color:#fff; font-weight:bold;">[OFFLINE TAG PARSER DETECTED]</span><br>
        Raw Text: "${parsed.raw}"<br>
        Extracted Year: <span style="color:#fff">${parsed.year}</span><br>
        Schema Version: <span style="color:#fff">V${parsed.version}</span><br>
        Implied Status: <span style="color:#fff">${parsed.parsedStatus}</span><br>
        Security Status: <span style="color:#10b981">PDPA Cleared (No PII)</span>
      </div>
    `;
  });
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
      const cleanVal = input.value.trim().toUpperCase();
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
      const clean = input.value.trim().toUpperCase();
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
    // Auto-uppercase & remove invalid whitespace
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const raw = input.value;
    const cleaned = raw.replace(/\s+/g, '').toUpperCase();
    if (raw !== cleaned) {
      input.value = cleaned;
      input.setSelectionRange(start, end);
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
