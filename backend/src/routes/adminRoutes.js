const express = require('express');
const router = express.Router();
const {
  ingestDocuments,
  getAuditLogs,
  getSystemStats,
} = require('../controllers/adminController');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// All admin routes require authentication + admin role
router.use(auth);
router.use(authorize('admin'));

// POST /api/admin/ingest
router.post('/ingest', ingestDocuments);

// GET /api/admin/audit-logs
router.get('/audit-logs', getAuditLogs);

// GET /api/admin/stats
router.get('/stats', getSystemStats);

module.exports = router;
