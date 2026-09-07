const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { verifyToken, staffOnly, adminOnly } = require('../middleware/auth');
const { handleDbError } = require('../utils/safeError');

// GET /api/audit-logs (Staff/Admin) - With full filters, limit, and tracking codes
router.get('/audit-logs', verifyToken, staffOnly, (req, res) => {
  const { timeSpan, startDate, endDate, search, limit = 100, page = 1 } = req.query;

  let whereClause = "WHERE 1=1";
  let params = [];

  // Filter: Time-Span presets
  if (timeSpan === 'today') {
    whereClause += " AND date(timestamp, 'localtime') = date('now', 'localtime')";
  } else if (timeSpan === '7d') {
    whereClause += " AND timestamp >= datetime('now', '-7 days', 'localtime')";
  } else if (timeSpan === '30d') {
    whereClause += " AND timestamp >= datetime('now', '-30 days', 'localtime')";
  }

  // Filter: Custom Date Range (Inclusive)
  if (startDate) {
    whereClause += " AND date(timestamp, 'localtime') >= date(?)";
    params.push(startDate);
  }
  if (endDate) {
    whereClause += " AND date(timestamp, 'localtime') <= date(?)";
    params.push(endDate);
  }

  // Filter: Search Keyword across asset_tag, details, action_by, or log_code
  if (search) {
    const s = `%${search.trim()}%`;
    whereClause += " AND (asset_tag LIKE ? OR details LIKE ? OR action_by_username LIKE ? OR log_code LIKE ?)";
    params.push(s, s, s, s);
  }

  const queryLimit = parseInt(limit, 10) || 100;
  const queryPage = parseInt(page, 10) || 1;
  const offset = (queryPage - 1) * queryLimit;

  const countSql = `SELECT COUNT(*) as total FROM move_log ${whereClause}`;
  const dataSql = `SELECT * FROM move_log ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`;

  db.get(countSql, params, (cntErr, countRow) => {
    if (cntErr) return handleDbError(res, cntErr);

    db.all(dataSql, [...params, queryLimit, offset], (err, rows) => {
      if (err) return handleDbError(res, err);
      const processedRows = (rows || []).map(r => ({
        ...r,
        log_code: r.log_code || ('CHG-LEGACY-' + r.id)
      }));
      res.json({
        total: countRow ? countRow.total : 0,
        page: queryPage,
        limit: queryLimit,
        logs: processedRows
      });
    });
  });
});

// GET /api/audit-summary (Staff/Admin) - Aggregates daily case volumes & highlights peak days
router.get('/audit-summary', verifyToken, staffOnly, (req, res) => {
  const summarySql = `
    SELECT 
      date(timestamp, 'localtime') as log_date,
      COUNT(*) as case_count,
      SUM(CASE WHEN moved_direction = 'IN' THEN 1 ELSE 0 END) as in_count,
      SUM(CASE WHEN moved_direction = 'OUT' THEN 1 ELSE 0 END) as out_count,
      SUM(CASE WHEN moved_direction = 'STATE_CHANGE' THEN 1 ELSE 0 END) as state_change_count
    FROM move_log
    WHERE timestamp >= datetime('now', '-30 days', 'localtime')
    GROUP BY date(timestamp, 'localtime')
    ORDER BY log_date DESC
  `;

  db.all(summarySql, [], (err, rows) => {
    if (err) return handleDbError(res, err);

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayRow = (rows || []).find(r => r.log_date === todayStr);
    const todayCount = todayRow ? todayRow.case_count : 0;

    let peakDay = null;
    let maxCount = 0;
    (rows || []).forEach(r => {
      if (r.case_count > maxCount) {
        maxCount = r.case_count;
        peakDay = { date: r.log_date, count: r.case_count };
      }
    });

    res.json({
      today: todayStr,
      today_cases: todayCount,
      is_today_busy: todayCount >= 10, // Highlight if high case volume today
      peak_day: peakDay,
      daily_history: (rows || []).map(r => ({
        ...r,
        is_peak: r.case_count >= 10
      }))
    });
  });
});

// GET /api/rma-claims (Staff/Admin)
router.get('/rma-claims', verifyToken, staffOnly, (req, res) => {
  db.all("SELECT * FROM rma_claims WHERE is_deleted = 0 ORDER BY id DESC", [], (err, rows) => {
    if (err) return handleDbError(res, err);
    res.json(rows);
  });
});

// DELETE /api/rma-claims/:id (Admin-only)
router.delete('/rma-claims/:id', verifyToken, adminOnly, (req, res) => {
  db.run("UPDATE rma_claims SET is_deleted = 1 WHERE id = ?", [req.params.id], function(err) {
    if (err) return handleDbError(res, err);
    res.json({ message: 'RMA Claim soft deleted' });
  });
});

// POST /api/audit-logs (Staff/Admin) - Quick Staff Service Requests
router.post('/audit-logs', verifyToken, staffOnly, (req, res) => {
  const { asset_tag, department_name, floor, status, moved_direction, details } = req.body;
  const { recordAuditLog } = require('../db');
  recordAuditLog(null, {
    asset_tag: asset_tag || 'SERVICE-REQ',
    department_name: department_name || (req.user ? req.user.department : 'General'),
    floor: floor || 'Fl 1',
    status: status || 'Requested',
    moved_direction: moved_direction || 'IN',
    action_by_username: req.user ? req.user.username : 'staff',
    details: details || ''
  }, (err, result) => {
    if (err) return handleDbError(res, err);
    res.status(201).json({ message: 'บันทึกคำขอบริการสำเร็จ', log_code: result.log_code });
  });
});

module.exports = router;
