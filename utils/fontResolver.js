const fs = require('fs');
const path = require('path');

/**
 * Resolves a valid TrueType font path across Windows, Linux, and Docker environments.
 * Prioritizes local project-bundled fonts, then OS system fonts, then returns null for PDFKit default.
 */
function resolveFontPath() {
  const candidates = [
    path.join(__dirname, '../fonts/tahoma.ttf'),
    'C:\\Windows\\Fonts\\tahoma.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
  ];

  for (const fontPath of candidates) {
    if (fs.existsSync(fontPath)) {
      return fontPath;
    }
  }

  return null;
}

module.exports = { resolveFontPath };
