const axios = require('axios');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

/**
 * POST /api/admin/ingest
 * Forward a document ingestion request to the AI service.
 */
const ingestDocuments = async (req, res, next) => {
  try {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

    let aiResponse;
    try {
      aiResponse = await axios.post(`${aiServiceUrl}/api/ingest`, req.body, {
        timeout: 120000, // ingestion can take longer
      });
    } catch (aiError) {
      console.error('AI service ingestion error:', aiError.message);

      if (aiError.code === 'ECONNREFUSED' || aiError.code === 'ENOTFOUND') {
        return res.status(503).json({
          success: false,
          error: 'AI service is currently unavailable. Please try again later.',
        });
      }

      return res.status(502).json({
        success: false,
        error: aiError.response?.data?.error || 'AI service ingestion failed.',
      });
    }

    res.status(200).json({
      success: true,
      data: aiResponse.data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/audit-logs
 * Return all audit log entries, sorted newest first.
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const logs = await AuditLog.find()
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'firstName lastName email role department')
      .lean();

    const total = await AuditLog.countDocuments();

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/stats
 * Return system-wide statistics: user counts, query counts, averages.
 */
const getSystemStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalQueries,
      totalLogins,
      confidenceAgg,
      usersByRole,
      usersByDepartment,
      recentQueries,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'active' }),
      AuditLog.countDocuments({ action: 'query' }),
      AuditLog.countDocuments({ action: 'login' }),
      AuditLog.aggregate([
        { $match: { action: 'query', responseConfidence: { $ne: null } } },
        {
          $group: {
            _id: null,
            avgConfidence: { $avg: '$responseConfidence' },
            minConfidence: { $min: '$responseConfidence' },
            maxConfidence: { $max: '$responseConfidence' },
          },
        },
      ]),
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      User.aggregate([
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditLog.countDocuments({
        action: 'query',
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
    ]);

    const confidence = confidenceAgg[0] || {
      avgConfidence: 0,
      minConfidence: 0,
      maxConfidence: 0,
    };

    let documentCount = 0;
    try {
      const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
      const aiStats = await axios.get(`${aiServiceUrl}/api/stats`, { timeout: 5000 });
      documentCount = aiStats.data?.document_count || 0;
    } catch (err) {
      console.error('Failed to fetch AI service stats:', err.message);
    }

    res.status(200).json({
      success: true,
      data: {
        documents: documentCount,
        users: {
          total: totalUsers,
          active: activeUsers,
          byRole: usersByRole.reduce((acc, r) => {
            acc[r._id] = r.count;
            return acc;
          }, {}),
          byDepartment: usersByDepartment.reduce((acc, d) => {
            acc[d._id] = d.count;
            return acc;
          }, {}),
        },
        queries: {
          total: totalQueries,
          last24Hours: recentQueries,
        },
        logins: {
          total: totalLogins,
        },
        confidence: {
          average: Math.round((confidence.avgConfidence || 0) * 100) / 100,
          min: confidence.minConfidence || 0,
          max: confidence.maxConfidence || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { ingestDocuments, getAuditLogs, getSystemStats };
