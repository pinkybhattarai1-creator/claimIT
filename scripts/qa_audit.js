const fs = require('fs');
const path = require('path');

const html = fs.readFileSync('public/index.html', 'utf8');
const jsFiles = fs.readdirSync('public/js').filter(f => f.endsWith('.js'));

const idsInHtml = new Set();
const idRegex = /id=["']([^"']+)["']/g;
let m;
while ((m = idRegex.exec(html)) !== null) {
  idsInHtml.add(m[1]);
}

console.log('Total IDs found in index.html:', idsInHtml.size);

const missingIds = {};
jsFiles.forEach(f => {
  const code = fs.readFileSync(path.join('public/js', f), 'utf8');
  const getElemRegex = /getElementById\(['"]([^'"]+)['"]\)/g;
  let jm;
  while ((jm = getElemRegex.exec(code)) !== null) {
    const id = jm[1];
    if (!idsInHtml.has(id)) {
      if (!missingIds[f]) missingIds[f] = new Set();
      missingIds[f].add(id);
    }
  }
});

console.log('\n--- Missing Element IDs Check ---');
let hasMissing = false;
for (const [file, ids] of Object.entries(missingIds)) {
  const arr = Array.from(ids);
  if (arr.length > 0) {
    hasMissing = true;
    console.log(`❌ File: ${file} -> Missing IDs:`, arr);
  }
}
if (!hasMissing) {
  console.log('✅ All document.getElementById references exist in index.html!');
}

console.log('\n--- Checking onclick and onchange handlers in HTML ---');
const handlerRegex = /on(?:click|change|submit|input)=["']([^"']+)["']/g;
const handlers = new Set();
while ((m = handlerRegex.exec(html)) !== null) {
  handlers.add(m[1]);
}
console.log('Total inline event handlers in HTML:', handlers.size);
handlers.forEach(h => console.log('  Handler:', h));
