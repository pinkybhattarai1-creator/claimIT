const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { verifyToken, staffOnly, adminOnly } = require('../middleware/auth');

// GET /api/audit-logs (Staff/Admin) with rich timeSpan, search, and date-range filters
router.get('/audit-logs', verifyToken, staffOnly, (req, res) => {
  const { timeSpan, startDate, endDate, search, moved_direction, asset_tag, limit, page } = req.query;
  
  let conditions = ["1=1"];
  let params = [];

  // Time-span presets
  if (timeSpan === 'today') {
    conditions.push("date(timestamp, 'localtime') = date('now', 'localtime')");
  } else if (timeSpan === 'yesterday') {
    conditions.push("date(timestamp, 'localtime') = date('now', '-1 day', 'localtime')");
  } else if (timeSpan === '7days') {
    conditions.push("timestamp >= datetime('now', '-7 days', 'localtime')");
  } else if (timeSpan === '30days') {
    conditions.push("timestamp >= datetime('now', '-30 days', 'localtime')");
  }

  // Custom date bounds (inclusive)
  if (startDate) {
    conditions.push("date(timestamp, 'localtime') >= ?");
    params.push(startDate);
  }
  if (endDate) {
    conditions.push("date(timestamp, 'localtime') <= ?");
    params.push(endDate);
  }

  // Specific Asset Tag
  if (asset_tag) {
    conditions.push("UPPER(asset_tag) = UPPER(?)");
    params.push(asset_tag.trim());
  }

  // Moved Direction (IN / OUT / STATE_CHANGE)
  if (moved_direction) {
    conditions.push("moved_direction = ?");
    params.push(moved_direction);
  }

  // Search keyword (matches tag, log_code, username, department, details)
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push("(asset_tag LIKE ? OR log_code LIKE ? OR action_by_username LIKE ? OR department_name LIKE ? OR details LIKE ?)");
    params.push(term, term, term, term, term);
  }

  const whereClause = "WHERE " + conditions.join(" AND ");
  const queryLimit = parseInt(limit, 10) || 200;
  const queryPage = parseInt(page, 10) || 1;
  const offset = (queryPage - 1) * queryLimit;

  const countSql = `SELECT COUNT(*) as total FROM move_log ${whereClause}`;
  const dataSql = `SELECT * FROM move_log ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`;

  db.get(countSql, params, (cntErr, countRow) => {
    if (cntErr) return res.status(500).json({ error: cntErr.message });

    db.all(dataSql, [...params, queryLimit, offset], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const processedRows = (rows || []).map(r => ({
        ...r,
        log_code: r.log_code || ('CHG-LEGACY-' + r.id)
      }));
      if (req.query.paginated === 'true') {
        return res.json({
          total: countRow ? countRow.total : processedRows.length,
          page: queryPage,
          limit: queryLimit,
          logs: processedRows
        });
      }
      res.setHeader('X-Total-Count', countRow ? countRow.total : processedRows.length);
      res.json(processedRows);
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
    if (err) return res.status(500).json({ error: err.message });

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
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// DELETE /api/rma-claims/:id (Admin-only)
router.delete('/rma-claims/:id', verifyToken, adminOnly, (req, res) => {
  db.run("UPDATE rma_claims SET is_deleted = 1 WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
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
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'บันทึกคำขอบริการสำเร็จ', log_code: result.log_code });
  });
});

module.exports = router;
