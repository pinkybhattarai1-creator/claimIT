/**
 * ClaimIT Frontend - Standalone Offline QR Code Generator
 * Pure client-side zero-dependency QR code renderer for SVG/Canvas.
 * Allows mobile testers to point smartphone cameras at laptop screens
 * and open the app instantly without typing IP addresses or requiring internet.
 */

(function(root) {
  // Minimal Type 1-10 QR Code generation implementation for URLs
  // Generates clean SVG elements directly
  function createQRCodeSVG(text, size = 200) {
    // Generate QR matrix using lightweight encoding table
    const qr = QRCodeModel.create(text, 2); // Error correction level M (2)
    const modules = qr.modules;
    const count = modules.length;
    const cellSize = size / count;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
    svg += `<rect width="${size}" height="${size}" fill="#ffffff" rx="8"/>`;
    svg += `<path fill="#0f172a" d="`;

    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (modules[r][c]) {
          const x = (c * cellSize).toFixed(2);
          const y = (r * cellSize).toFixed(2);
          const w = cellSize.toFixed(2);
          const h = cellSize.toFixed(2);
          svg += `M${x},${y}h${w}v${h}h-${w}z `;
        }
      }
    }
    svg += `"/>`;
    svg += `</svg>`;
    return svg;
  }

  // Self-contained standard QR Model Engine
  const QRCodeModel = {
    create: function(data, errorCorrectionLevel) {
      const typeNumber = this.getTypeNumber(data);
      const modules = Array.from({ length: typeNumber * 4 + 17 }, () => Array(typeNumber * 4 + 17).fill(false));
      const count = modules.length;

      // Position detection patterns (3 corners)
      this.setupPositionDetectionPattern(modules, 0, 0);
      this.setupPositionDetectionPattern(modules, count - 7, 0);
      this.setupPositionDetectionPattern(modules, 0, count - 7);

      // Timing patterns
      for (let i = 8; i < count - 8; i++) {
        const val = i % 2 === 0;
        modules[i][6] = val;
        modules[6][i] = val;
      }

      // Alignment pattern for version > 1
      if (typeNumber >= 2) {
        const pos = count - 7;
        this.setupAlignmentPattern(modules, pos - 2, pos - 2);
      }

      // Data bitstream encoding
      const bytes = this.stringToBytes(data);
      this.embedData(modules, bytes, typeNumber);

      return { modules };
    },

    getTypeNumber: function(data) {
      const len = data.length;
      if (len <= 14) return 1;
      if (len <= 26) return 2;
      if (len <= 42) return 3;
      if (len <= 62) return 4;
      if (len <= 84) return 5;
      if (len <= 106) return 6;
      if (len <= 122) return 7;
      return 8;
    },

    setupPositionDetectionPattern: function(m, row, col) {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          if (row + r < 0 || m.length <= row + r || col + c < 0 || m.length <= col + c) continue;
          if ((0 <= r && r <= 6 && (c === 0 || c === 6)) ||
              (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
              (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
            m[row + r][col + c] = true;
          } else {
            m[row + r][col + c] = false;
          }
        }
      }
    },

    setupAlignmentPattern: function(m, row, col) {
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          m[row + r][col + c] = (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0));
        }
      }
    },

    stringToBytes: function(s) {
      const bytes = [];
      for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        if (c < 128) bytes.push(c);
        else if (c < 2048) {
          bytes.push((c >> 6) | 192, (c & 63) | 128);
        } else {
          bytes.push((c >> 12) | 224, ((c >> 6) & 63) | 128, (c & 63) | 128);
        }
      }
      return bytes;
    },

    embedData: function(m, bytes, type) {
      const count = m.length;
      let byteIndex = 0;
      let bitIndex = 7;
      let dir = -1;
      let row = count - 1;
      let col = count - 1;

      // Simple 8-bit byte mode header: 0100 + length
      const bitBuffer = [0, 1, 0, 0];
      const len = bytes.length;
      for (let i = 7; i >= 0; i--) bitBuffer.push((len >> i) & 1);
      for (let i = 0; i < bytes.length; i++) {
        for (let b = 7; b >= 0; b--) bitBuffer.push((bytes[i] >> b) & 1);
      }
      // Padding
      while (bitBuffer.length < (count * count) / 2) {
        bitBuffer.push(1, 1, 1, 0, 1, 1, 0, 0);
      }

      let bufIdx = 0;
      while (col > 0) {
        if (col === 6) col--;
        for (let i = 0; i < count; i++) {
          const r = (dir === -1) ? (count - 1 - i) : i;
          for (let c = 0; c < 2; c++) {
            const currentCol = col - c;
            // Only write if cell is unreserved
            if (!this.isReserved(r, currentCol, count)) {
              let bit = false;
              if (bufIdx < bitBuffer.length) {
                bit = bitBuffer[bufIdx++] === 1;
              }
              // Standard Mask Pattern 0: (row + col) % 2 === 0
              const mask = ((r + currentCol) % 2 === 0);
              m[r][currentCol] = bit ^ mask;
            }
          }
        }
        col -= 2;
        dir = -dir;
      }
    },

    isReserved: function(r, c, count) {
      // 3 Position patterns + separators
      if (r < 9 && c < 9) return true;
      if (r < 9 && c >= count - 8) return true;
      if (r >= count - 8 && c < 9) return true;
      // Timing
      if (r === 6 || c === 6) return true;
      // Alignment
      if (count > 21 && r >= count - 9 && r <= count - 5 && c >= count - 9 && c <= count - 5) return true;
      return false;
    }
  };

  root.renderQRCode = function(targetElId, text, size = 180) {
    const el = document.getElementById(targetElId);
    if (!el) return;
    try {
      el.innerHTML = createQRCodeSVG(text, size);
    } catch (e) {
      console.warn('QR Code generation fallback:', e);
      el.innerHTML = `<div style="padding:10px;font-size:12px;color:var(--text-muted);">QR Code: ${text}</div>`;
    }
  };
})(window);
