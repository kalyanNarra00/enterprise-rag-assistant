const express = require('express');
const router = express.Router();
const { submitQuery, getQueryHistory } = require('../controllers/queryController');
const auth = require('../middleware/auth');

// POST /api/query  (protected)
router.post('/', auth, submitQuery);

// GET /api/query/history  (protected)
router.get('/history', auth, getQueryHistory);

module.exports = router;
