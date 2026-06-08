const axios = require('axios');
const AuditLog = require('../models/AuditLog');
const { departmentFilter, filterSensitiveFields } = require('../middleware/rbac');

const submitQuery = async (req, res, next) => {
  try {
    const { query } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, error: 'Query text cannot be empty.' });
    }

    const accessScope = departmentFilter(req);
    const ragServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

    let ragResponse;
    try {
      ragResponse = await axios.post(`${ragServiceUrl}/api/query`, {
        query: query.trim(),
        metadata_filter: accessScope,
        user_role: req.user.role,
        user_department: req.user.department,
      }, { timeout: 30000 });
    } catch (serviceErr) {
      if (serviceErr.code === 'ECONNREFUSED' || serviceErr.code === 'ENOTFOUND') {
        return res.status(503).json({ success: false, error: 'AI processing service is currently offline.' });
      }
      return res.status(502).json({
        success: false,
        error: serviceErr.response?.data?.error || 'AI service encountered an error.',
      });
    }

    const result = ragResponse.data;
    const sanitizedResult = filterSensitiveFields(result, req.user.role);

    const sourceNames = (result.sources || []).map(
      (s) => (typeof s === 'string' ? s : s.source || s.filename || 'unknown')
    );

    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'query',
      query: query.trim(),
      resourcesAccessed: sourceNames,
      ipAddress: req.ip,
      responseConfidence: result.confidence || null,
    });

    res.status(200).json({ success: true, data: sanitizedResult });
  } catch (err) {
    next(err);
  }
};

const getQueryHistory = async (req, res, next) => {
  try {
    const pageNum = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.limit, 10) || 20;

    const entries = await AuditLog.find({ userId: req.user._id, action: 'query' })
      .sort({ timestamp: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)
      .lean();

    const totalEntries = await AuditLog.countDocuments({ userId: req.user._id, action: 'query' });

    res.status(200).json({
      success: true,
      data: entries,
      pagination: { page: pageNum, limit: pageSize, total: totalEntries, pages: Math.ceil(totalEntries / pageSize) },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { submitQuery, getQueryHistory };
