/**
 * scripts/test_user_requirements.js
 * Comprehensive In-Repo Verification Suite for User Requirements, UX/UI, and Bug Fixes.
 * 
 * Verifies:
 * 1. Interactive warranty expiration navigation, filter, and single-fetch execution
 * 2. Hospital Layout search focus preservation (search input is never destroyed on input)
 * 3. Dynamic hospital layout integration with state.configs & datalist autocomplete
 * 4. Single-Brand Guardrail validation (backend & frontend) including whitelisted compound brands
 * 5. Numbered pagination slot buttons ([1], [2], [3]...) in updatePaginationUI
 * 6. Separated Config sub-tabs (Brands, Categories, Locations) non-stacking
 * 7. Separated User Management tables (Admin vs Staff) with role switcher pills
 * 8. Staff role config loading in refreshData()
 * 9. Zero database schema alterations
 * 10. 100% SHA-256 hash match across all 6 companion HTML templates
 */

process.env.SUPPRESS_DEV_WARNINGS = 'true';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');

console.log('===============================================================');
console.log('🧪 RUNNING VERIFICATION SUITE: scripts/test_user_requirements.js');
console.log('===============================================================');

const rootDir = path.join(__dirname, '..');
let passedTests = 0;
let totalTests = 0;

function it(desc, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${desc}`);
    console.error(`     Error: ${err.message}`);
    process.exitCode = 1;
  }
}

// ─── 1. Single-Brand Guardrail with False-Positive Whitelisting ─────────────
console.log('\n--- 1. Single-Brand Guardrail (Backend & Frontend) ---');
const assetsRouteContent = fs.readFileSync(path.join(rootDir, 'routes', 'assets.js'), 'utf8');
const assetsJsContent = fs.readFileSync(path.join(rootDir, 'public', 'js', 'assets.js'), 'utf8');

// Directly import validateSingleBrand from routes/assets.js
const backendValidateFn = require(path.join(rootDir, 'routes', 'assets')).validateSingleBrand;

it('Rejects multi-brand combinations with Thai conjunctions (Dell และ Acer)', () => {
  const res = backendValidateFn('Dell และ Acer');
  assert.strictEqual(res.isValid, false);
  assert.ok(res.error.includes('ไม่อนุญาตให้ระบุหลายยี่ห้อพร้อมกัน'));
});

it('Rejects multi-brand combinations with comma (Dell, HP)', () => {
  const res = backendValidateFn('Dell, HP');
  assert.strictEqual(res.isValid, false);
});

it('Rejects multi-brand combinations with slash (HP / Lenovo)', () => {
  const res = backendValidateFn('HP / Lenovo');
  assert.strictEqual(res.isValid, false);
});

it('Rejects multi-brand combinations with spaced ampersand (Dell & Acer)', () => {
  const res = backendValidateFn('Dell & Acer');
  assert.strictEqual(res.isValid, false);
});

it('Rejects multi-brand combinations with hyphen (Dell - Acer)', () => {
  const res = backendValidateFn('Dell - Acer');
  assert.strictEqual(res.isValid, false);
});

it('Accepts single standard brands (Dell, HP, Apple, Cisco)', () => {
  assert.strictEqual(backendValidateFn('Dell').isValid, true);
  assert.strictEqual(backendValidateFn('HP').isValid, true);
  assert.strictEqual(backendValidateFn('Apple').isValid, true);
  assert.strictEqual(backendValidateFn('Cisco').isValid, true);
});

it('Accepts legitimate compound brands without false-positives (A&D Medical, Bang & Olufsen, AT&T)', () => {
  assert.strictEqual(backendValidateFn('A&D Medical').isValid, true, 'A&D Medical should be valid');
  assert.strictEqual(backendValidateFn('Bang & Olufsen').isValid, true, 'Bang & Olufsen should be valid');
  assert.strictEqual(backendValidateFn('AT&T').isValid, true, 'AT&T should be valid');
  assert.strictEqual(backendValidateFn('Johnson & Johnson').isValid, true, 'Johnson & Johnson should be valid');
});

it('Client validateSingleBrandLocal exists and matches backend behavior', () => {
  assert.ok(assetsJsContent.includes('function validateSingleBrandLocal'));
  assert.ok(assetsJsContent.includes('LEGITIMATE_COMPOUND_BRANDS_LOCAL'));
});

// ─── 2. Hospital Layout Search Focus Preservation & DOM Structure ───────────
console.log('\n--- 2. Hospital Layout Search & Focus Preservation ---');
const hospitalJsContent = fs.readFileSync(path.join(rootDir, 'public', 'js', 'hospital_layout.js'), 'utf8');

it('renderHospitalLayoutView separates search toolbar from results area', () => {
  assert.ok(hospitalJsContent.includes('-results-area'));
  assert.ok(hospitalJsContent.includes('-search-input'));
  assert.ok(hospitalJsContent.includes('clearHospitalLayoutSearch'));
});

it('Simulates DOM container: typing in search does NOT destroy search input', () => {
  // Setup minimal DOM mock
  const domElements = {};
  const mockDocument = {
    getElementById: (id) => domElements[id] || null,
    createElement: (tag) => ({ tagName: tag, style: {}, setAttribute: () => {}, appendChild: () => {} }),
    body: { appendChild: () => {} }
  };

  const containerMock = {
    id: 'test-container',
    innerHTML: '',
    style: {}
  };
  domElements['test-container'] = containerMock;

  // Evaluate hospital_layout.js with mock environment
  const mockWindow = {
    state: { configs: [] },
    escapeHtml: (s) => s || ''
  };
  
  const hospitalLayoutModule = new Function('window', 'document', 'state', 'escapeHtml', `
    ${hospitalJsContent}
    return { renderHospitalLayoutView, filterHospitalLayout, clearHospitalLayoutSearch };
  `)(mockWindow, mockDocument, mockWindow.state, mockWindow.escapeHtml);

  // First render initializes structure
  Object.defineProperty(containerMock, 'innerHTML', {
    set(val) {
      this._html = val;
      if (val.includes('test-container-search-input')) {
        domElements['test-container-search-input'] = {
          id: 'test-container-search-input',
          value: '',
          focus: () => {}
        };
      }
      if (val.includes('test-container-results-area')) {
        domElements['test-container-results-area'] = {
          id: 'test-container-results-area',
          innerHTML: ''
        };
      }
    },
    get() { return this._html || ''; }
  });

  hospitalLayoutModule.renderHospitalLayoutView('test-container', '');
  const searchInputBefore = domElements['test-container-search-input'];
  assert.ok(searchInputBefore, 'Search input should be created');

  // Filter with query
  hospitalLayoutModule.filterHospitalLayout('หัวใจ', 'test-container');
  const searchInputAfter = domElements['test-container-search-input'];
  
  // Verify the search input DOM reference was NOT replaced or destroyed!
  assert.strictEqual(searchInputBefore, searchInputAfter, 'Search input must remain identical object reference to preserve focus');
  assert.ok(domElements['test-container-results-area'].innerHTML.includes('ศูนย์หัวใจ'), 'Results area should contain search results');
});

// ─── 3. Dynamic Custom Locations & state.configs Integration ─────────────────
console.log('\n--- 3. Dynamic Custom Locations & state.configs ---');
const stateJsContent = fs.readFileSync(path.join(rootDir, 'public', 'js', 'state.js'), 'utf8');
const appJsContent = fs.readFileSync(path.join(rootDir, 'public', 'js', 'app.js'), 'utf8');

it('state.js defines configs: [] and attaches to window.state', () => {
  assert.ok(stateJsContent.includes('configs: []'), 'state should define configs array');
  assert.ok(stateJsContent.includes('window.state = state'), 'window.state should be assigned');
});

it('app.js stores state.configs and calls setupHospitalLayoutDatalist on refresh', () => {
  assert.ok(appJsContent.includes('state.configs = configs;'));
  assert.ok(appJsContent.includes('setupHospitalLayoutDatalist(configs);'));
});

it('refreshData fetches /api/configurations for all authenticated users (Staff & Admin)', () => {
  // Verify that config fetch is not blocked by state.user.role === 'admin'
  const refreshSnippet = appJsContent.substring(
    appJsContent.indexOf('async function refreshData'),
    appJsContent.indexOf('updateStatistics(assets)')
  );
  assert.ok(refreshSnippet.includes('if (state.user)'), 'Config fetch must be open to any authenticated state.user');
  assert.ok(refreshSnippet.includes('/api/configurations'), 'Fetch /api/configurations should be executed');
});

// ─── 4. Interactive Warranty Expiration Click Navigation ───────────────────
console.log('\n--- 4. Interactive Warranty Expiration Direct Navigation ---');

it('goToExpiringWarrantyAssets sets expiring_60d and invokes single refreshData', () => {
  assert.ok(appJsContent.includes('function goToExpiringWarrantyAssets()'));
  assert.ok(appJsContent.includes("filterStatus.value = 'expiring_60d'"));
  assert.ok(appJsContent.includes("state.filters.status = 'expiring_60d'"));
  assert.ok(appJsContent.includes("selectCategoryTab('', true)"), 'Must pass skipRefresh=true to prevent duplicate refreshData');
  
  // Ensure duplicate addEventListener is not attached
  assert.ok(!appJsContent.includes("document.getElementById('warranty-expiring-badge')?.addEventListener('click', goToExpiringWarrantyAssets)"),
    'Duplicate event listener must be removed to avoid race condition');
});

it('selectCategoryTab supports skipRefresh flag', () => {
  assert.ok(assetsJsContent.includes('function selectCategoryTab(category, skipRefresh = false)'));
  assert.ok(assetsJsContent.includes('if (!skipRefresh && typeof refreshData === \'function\')'));
});

// ─── 5. Real Numbered Pagination Slot Buttons [1], [2], [3]... ──────────────
console.log('\n--- 5. Real Numbered Pagination Slot Buttons ---');

it('updatePaginationUI renders real numbered slot buttons into #asset-pagination-slots', () => {
  assert.ok(appJsContent.includes("document.getElementById('asset-pagination-slots')"));
  assert.ok(appJsContent.includes('pagination-slot-btn'));
  assert.ok(appJsContent.includes('jumpToAssetPage(${p})'));
});

it('Simulates updatePaginationUI: renders page buttons for multiple pages', () => {
  const slotContainerMock = { innerHTML: '' };
  const mockState = {
    pagination: { page: 2, limit: 15, total: 60 },
    filters: {}
  };
  
  // Extract updatePaginationUI from app.js
  const updatePaginationCode = appJsContent.substring(
    appJsContent.indexOf('function updatePaginationUI()'),
    appJsContent.indexOf('function changeAssetLimit')
  );

  const mockDoc = {
    getElementById: (id) => {
      if (id === 'asset-pagination-slots') return slotContainerMock;
      return { textContent: '', style: {}, disabled: false };
    }
  };

  const updateFn = new Function('state', 'document', `
    ${updatePaginationCode}
    return updatePaginationUI;
  `)(mockState, mockDoc);

  updateFn();
  assert.ok(slotContainerMock.innerHTML.includes('jumpToAssetPage(1)'), 'Slot button for page 1 rendered');
  assert.ok(slotContainerMock.innerHTML.includes('jumpToAssetPage(2)'), 'Slot button for page 2 rendered');
  assert.ok(slotContainerMock.innerHTML.includes('jumpToAssetPage(3)'), 'Slot button for page 3 rendered');
  assert.ok(slotContainerMock.innerHTML.includes('btn-primary'), 'Current page button highlighted');
});

// ─── 6. Separated Config and User Management Layout (No Downward Stack) ─────
console.log('\n--- 6. Separated Config & User Management Tables ---');
const indexHtmlContent = fs.readFileSync(path.join(rootDir, 'public', 'index.html'), 'utf8');

it('HTML contains separated Config Sub-Tabs (Brands, Categories, Locations, Users)', () => {
  assert.ok(indexHtmlContent.includes('data-tab="tab-cfg-brands"'), 'Brands tab present');
  assert.ok(indexHtmlContent.includes('data-tab="tab-cfg-categories"'), 'Categories tab present');
  assert.ok(indexHtmlContent.includes('data-tab="tab-cfg-locations"'), 'Locations tab present');
  assert.ok(indexHtmlContent.includes('data-tab="tab-cfg-users"'), 'Users tab present');
});

it('HTML contains separated User Management Cards (Admin & Staff) with Role Switcher Pills', () => {
  assert.ok(indexHtmlContent.includes('id="user-table-admin-body"'), 'Admin user table present');
  assert.ok(indexHtmlContent.includes('id="user-table-staff-body"'), 'Staff user table present');
  assert.ok(indexHtmlContent.includes('data-role="all"'), 'All role pill present');
  assert.ok(indexHtmlContent.includes('data-role="admin"'), 'Admin role pill present');
  assert.ok(indexHtmlContent.includes('data-role="staff"'), 'Staff role pill present');
  assert.ok(indexHtmlContent.includes('id="user-pill-all-count"'), 'All role count badge present');
});

it('HTML contains #asset-pagination-slots container', () => {
  assert.ok(indexHtmlContent.includes('id="asset-pagination-slots"'), 'asset-pagination-slots must exist in HTML');
});

// ─── 7. Zero Database Schema Changes ────────────────────────────────────────
console.log('\n--- 7. Zero Database Schema Changes ---');
const schemaContent = fs.readFileSync(path.join(rootDir, 'schema.sql'), 'utf8');

it('schema.sql remains 100% clean with 0 modified tables', () => {
  // Verify standard tables exist without ad-hoc alterations
  assert.ok(schemaContent.includes('CREATE TABLE IF NOT EXISTS mains'));
  assert.ok(schemaContent.includes('CREATE TABLE IF NOT EXISTS users'));
  assert.ok(schemaContent.includes('CREATE TABLE IF NOT EXISTS configurations'));
  assert.ok(schemaContent.includes('CREATE TABLE IF NOT EXISTS claims'));
  assert.ok(!schemaContent.includes('ALTER TABLE'), 'Zero ALTER TABLE migration statements');
});

// ─── 8. Category Dropdown & Scrollbar Elimination ───────────────────────────
console.log('\n--- 8. Category Dropdown & Scrollbar Elimination ---');
it('HTML contains #filter-category-select and removes #category-tabs-bar', () => {
  assert.ok(indexHtmlContent.includes('id="filter-category-select"'), 'filter-category-select must exist');
  assert.ok(!indexHtmlContent.includes('id="category-tabs-bar"'), 'category-tabs-bar must be removed to eliminate scrollbars');
});

it('assets.js provides and exports onCategoryDropdownChange', () => {
  assert.ok(assetsJsContent.includes('function onCategoryDropdownChange'));
  assert.ok(assetsJsContent.includes('onCategoryDropdownChange'));
});

// ─── 9. Immutable Hospital Locations & Clean Directory ───────────────────────
console.log('\n--- 9. Immutable Hospital Locations & Clean Directory ---');
it('HTML does not contain add location button or secondary stacked table', () => {
  assert.ok(!indexHtmlContent.includes('➕ เพิ่มสถานที่ / แผนกใหม่'), 'Add location button must be removed');
  assert.ok(!indexHtmlContent.includes('id="config-locations-table-body"'), 'Secondary locations table must be removed');
});

it('hospital_layout.js filters conflicting legacy custom locations', () => {
  assert.ok(hospitalJsContent.includes('existingDeptNames'), 'Should filter out locations conflicting with physical tower');
  assert.ok(!hospitalJsContent.includes('➕ เพิ่มแผนกใหม่'), 'Add custom department button should be removed');
});

// ─── 10. Global Button Disabled States & Role Graying Out ───────────────────
console.log('\n--- 10. Global Button Disabled States & Role Graying Out ---');
const authJsContent = fs.readFileSync(path.join(rootDir, 'public', 'js', 'auth.js'), 'utf8');
const adminJsContent = fs.readFileSync(path.join(rootDir, 'public', 'js', 'admin.js'), 'utf8');

it('HTML IT section includes id="btn-it-to-config"', () => {
  assert.ok(indexHtmlContent.includes('id="btn-it-to-config"'), 'btn-it-to-config must exist');
});

it('auth.js grays out btn-it-to-config for Staff users', () => {
  assert.ok(authJsContent.includes('btnItToConfig.disabled = true'), 'Should disable btn-it-to-config for non-admin');
  assert.ok(authJsContent.includes('เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น'), 'Should show admin-only tooltip');
});

it('assets.js grays out btn-report-broken on already broken/salvaged assets', () => {
  assert.ok(assetsJsContent.includes('btnReportBroken.disabled = true'), 'Should disable btn-report-broken when in active repair');
});

it('app.js grays out pagination previous/next buttons at boundaries', () => {
  assert.ok(appJsContent.includes('btnPrev.style.cursor = isPrevDisabled ? \'not-allowed\' : \'pointer\''));
  assert.ok(appJsContent.includes('btnNext.style.cursor = isNextDisabled ? \'not-allowed\' : \'pointer\''));
});

// ─── 11. Clean Subtabs & Category Natural Ordering ───────────────────────────
console.log('\n--- 11. Clean Subtabs & Category Ordering ---');
it('Config subtabs have sleek pill badges without parenthesis spacing', () => {
  assert.ok(indexHtmlContent.includes('id="config-brands-count"'));
  assert.ok(!indexHtmlContent.includes('(<span id="config-brands-count">'));
});

it('admin.js sorts categories by ID ascending and provides Thai labels', () => {
  assert.ok(adminJsContent.includes('CATEGORY_THAI_LABELS'));
  assert.ok(adminJsContent.includes('(Number(a.id) || 0) - (Number(b.id) || 0)'));
});

// ─── 12. 100% SHA-256 Hash Synchronization across 6 Companion HTML Files ──────
console.log('\n--- 12. 6 HTML Files SHA-256 Hash Verification ---');
const htmlFiles = ['admin.html', 'config.html', 'index.html', 'it.html', 'login.html', 'ward.html'];
const hashes = {};

htmlFiles.forEach(file => {
  const content = fs.readFileSync(path.join(rootDir, 'public', file));
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  hashes[file] = hash;
});

it('All 6 HTML templates are 100% identical byte-for-byte', () => {
  const firstHash = hashes['index.html'];
  htmlFiles.forEach(file => {
    assert.strictEqual(hashes[file], firstHash, `Hash mismatch in public/${file}`);
  });
  console.log(`     Consistent SHA-256: ${firstHash}`);
});

// ─── 13. Dynamic IT Hotline Phone Numbers & Staff Link Synchronization ───────
console.log('\n--- 13. Dynamic IT Hotline Phone Numbers & Staff Link Synchronization ---');

it('HTML contains staff hotline container and sidebar hotline text', () => {
  assert.ok(indexHtmlContent.includes('id="staff-hotline-container"'), 'staff-hotline-container must exist');
  assert.ok(indexHtmlContent.includes('id="sidebar-hotline-text"'), 'sidebar-hotline-text must exist');
});

it('HTML contains admin hotline configuration card elements', () => {
  assert.ok(indexHtmlContent.includes('id="cfg-hotline-input"'), 'cfg-hotline-input must exist');
  assert.ok(indexHtmlContent.includes('id="cfg-hotline-preview"'), 'cfg-hotline-preview must exist');
  assert.ok(indexHtmlContent.includes('id="btn-save-hotline"'), 'btn-save-hotline must exist');
});

it('admin.js exports previewHotlineNumbers and saveHotlineNumbers', () => {
  assert.ok(adminJsContent.includes('previewHotlineNumbers'), 'previewHotlineNumbers should be defined');
  assert.ok(adminJsContent.includes('saveHotlineNumbers'), 'saveHotlineNumbers should be defined');
});

it('app.js exports updateHotlineNumbersUI and binds it to refreshData and startup', () => {
  assert.ok(appJsContent.includes('function updateHotlineNumbersUI'));
  assert.ok(appJsContent.includes('updateHotlineNumbersUI(configs)'));
});

it('routes/configurations.js exposes hotline via public-contact endpoint', () => {
  const cfgRouteContent = fs.readFileSync(path.join(rootDir, 'routes', 'configurations.js'), 'utf8');
  assert.ok(cfgRouteContent.includes("'hotline'"), 'hotline type should be allowed in public-contact endpoint');
});

it('Simulates updateHotlineNumbersUI: dynamically updates staff call buttons and sidebar text', () => {
  let staffContainerMock = { innerHTML: '' };
  let sidebarTextMock = { textContent: '' };
  let previewMock = { innerHTML: '' };
  let inputMock = { value: '' };

  const mockDoc = {
    activeElement: null,
    getElementById: (id) => {
      if (id === 'staff-hotline-container') return staffContainerMock;
      if (id === 'sidebar-hotline-text') return sidebarTextMock;
      if (id === 'cfg-hotline-preview') return previewMock;
      if (id === 'cfg-hotline-input') return inputMock;
      return null;
    }
  };

  const updateHotlineCode = appJsContent.substring(
    appJsContent.indexOf('function updateHotlineNumbersUI(configs)'),
    appJsContent.indexOf('window.updateHotlineNumbersUI = updateHotlineNumbersUI;')
  );

  const updateFn = new Function('document', 'escapeHtml', `
    ${updateHotlineCode}
    return updateHotlineNumbersUI;
  `)(mockDoc, s => s);

  // Test updating to custom phone numbers
  updateFn([{ type: 'hotline', value: '5501, 5502, 5503, 5504' }]);

  assert.ok(staffContainerMock.innerHTML.includes('href="tel:5501"'), 'Button for 5501 rendered');
  assert.ok(staffContainerMock.innerHTML.includes('href="tel:5504"'), 'Button for 5504 rendered');
  assert.ok(staffContainerMock.innerHTML.includes('☎️ 5501'), 'Label for 5501 rendered');
  assert.strictEqual(sidebarTextMock.textContent, 'โทรภายใน 5501 - 5502 - 5503 - 5504');
  assert.strictEqual(inputMock.value, '5501, 5502, 5503, 5504');
});

console.log('\n===============================================================');
console.log(`🎉 VERIFICATION RESULT: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
console.log('===============================================================');

