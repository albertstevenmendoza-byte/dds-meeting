/**
 * gas-config.js — Novus Foods 1730 Ops Hub
 * Google Apps Script data fetcher
 * =========================================
 * Drop-in replacement for sharepoint-config.js.
 * Exposes window.NovusGAS with the same call shape the dashboards expect.
 *
 * Setup:
 *   1. Deploy Code.gs as a GAS Web App (see Code.gs for instructions)
 *   2. Paste the deployment URL as GAS_URL below
 *   3. In dds-dashboard.html / staff-meeting-dashboard.html:
 *      - Remove: <script src="sharepoint-config.js"></script>
 *      - Remove: MSAL script tag (no longer needed)
 *      - Add:    <script src="gas-config.js"></script>
 *      - Change: NovusSP → NovusGAS
 *        fetchWorkbook() → fetchData()
 *        workbook = XLSX.read(...) → workbook = data  (JSON object)
 *        function sheet(name){...} → return workbook[name]||[]
 */

window.NovusGAS = (() => {

  // ── PASTE YOUR GAS DEPLOYMENT URL HERE ───────────────────────────────────
  // Looks like: https://script.google.com/macros/s/AKfycb.../exec
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbxQGwgcbjn3hz30MSMX4MP-mnvnsAlw2Mx5WzjlDLVfPmasqqaYWXJ_tHNG8sLYpCXdKA/exec';
  // ─────────────────────────────────────────────────────────────────────────

  const SESSION_KEY      = 'novus1730_gas_data';
  const SESSION_META_KEY = 'novus1730_gas_meta';

  /**
   * Fetch all sheet data from the GAS endpoint.
   * Returns a plain object: { SheetName: [ {...row}, {...row} ], ... }
   *
   * Caches the result in sessionStorage for fast navigation between pages.
   */
  async function fetchData() {
    if (!GAS_URL || GAS_URL === 'YOUR_GAS_DEPLOYMENT_URL_HERE') {
      throw new Error('GAS URL not configured. Open gas-config.js and set GAS_URL.');
    }

    // GAS redirects the initial request to a short-lived URL.
    // fetch() follows redirects by default, but we need mode:'cors' explicitly.
    const response = await fetch(GAS_URL, {
      method:   'GET',
      redirect: 'follow',
      cache:    'no-store',
    });

    if (!response.ok) {
      throw new Error(`GAS returned HTTP ${response.status}`);
    }

    const payload = await response.json();

    if (payload.error) {
      throw new Error(`GAS error: ${payload.message || JSON.stringify(payload)}`);
    }

    // payload = { meta: {...}, data: { SheetName: [...rows] } }
    const sheetData = payload.data || payload; // handle both shapes

    // Cache in sessionStorage so navigating between pages is instant
    try {
      sessionStorage.setItem(SESSION_KEY,      JSON.stringify(sheetData));
      sessionStorage.setItem(SESSION_META_KEY, JSON.stringify(payload.meta || {}));
    } catch (_) { /* quota exceeded — ignore */ }

    return sheetData;
  }

  /**
   * Load data from sessionStorage cache (no network call).
   * Returns null if nothing is cached.
   */
  function loadFromCache() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  /**
   * Get the fetch timestamp from the last successful call.
   */
  function getLastFetchTime() {
    try {
      const meta = JSON.parse(sessionStorage.getItem(SESSION_META_KEY) || '{}');
      return meta.fetched ? new Date(meta.fetched).toLocaleTimeString() : null;
    } catch (_) { return null; }
  }

  /**
   * Returns a display name for the data source (for status bar copy).
   */
  function getDisplayName() {
    return 'Google Sheets';
  }

  /**
   * Clear the session cache (call when user triggers a manual refresh).
   */
  function clearCache() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_META_KEY);
  }

  return {
    fetchData,
    loadFromCache,
    getLastFetchTime,
    getDisplayName,
    clearCache,
    configured: GAS_URL !== 'YOUR_GAS_DEPLOYMENT_URL_HERE',
  };

})();


/**
 * NovusWorkbook — unified sheet accessor
 * =========================================
 * Wraps the GAS JSON so the dashboard's sheet() calls work identically
 * whether data came from GAS (JSON) or a manual XLSX upload.
 *
 * Usage in dashboards:
 *
 *   // After GAS fetch:
 *   NovusWorkbook.setGAS(sheetData);
 *
 *   // After manual XLSX upload:
 *   NovusWorkbook.setXLSX(xlsxWorkbookObject);
 *
 *   // In any panel render function:
 *   const rows = NovusWorkbook.sheet('Production');
 */
window.NovusWorkbook = (() => {

  let _source = null;  // 'gas' | 'xlsx'
  let _data   = null;  // raw data (GAS JSON object or XLSX workbook)

  function setGAS(sheetData) {
    _source = 'gas';
    _data   = sheetData;
  }

  function setXLSX(wb) {
    _source = 'xlsx';
    _data   = wb;
  }

  function sheet(name) {
    if (!_data) return [];

    if (_source === 'gas') {
      return _data[name] || [];
    }

    // XLSX workbook (manual upload fallback)
    if (typeof XLSX !== 'undefined' && _data.Sheets) {
      const s = _data.Sheets[name];
      return s ? XLSX.utils.sheet_to_json(s, { defval:'', raw:true, blankrows:false }) : [];
    }

    return [];
  }

  function isReady()   { return _data !== null; }
  function getSource() { return _source; }

  return { setGAS, setXLSX, sheet, isReady, getSource };

})();