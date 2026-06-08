import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';
import Navbar from '../components/Navbar';

function AuditLogPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      const response = await adminAPI.getAuditLogs(token, params);
      setLogs(Array.isArray(response) ? response : response.logs || response.audit_logs || []);
      setError(null);
    } catch (err) {
      setError('Failed to load audit logs.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, searchTerm]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      loadLogs();
    }, 300);
    return () => clearTimeout(debounce);
  }, [loadLogs]);

  const getConfidenceClass = (score) => {
    if (score == null) return '';
    if (score >= 80) return 'confidence-high';
    if (score >= 50) return 'confidence-medium';
    return 'confidence-low';
  };

  return (
    <div className="audit-page">
      <Navbar />

      <div className="audit-container">
        <div className="audit-header">
          <div>
            <div className="audit-breadcrumb">
              <Link to="/admin" className="breadcrumb-link">Dashboard</Link>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9,18 15,12 9,6" />
              </svg>
              <span className="breadcrumb-current">Audit Logs</span>
            </div>
            <h1 className="audit-title">Audit Logs</h1>
            <p className="audit-subtitle">Complete query history and access records</p>
          </div>
        </div>

        <div className="audit-toolbar">
          <div className="audit-search-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by user, query, or resource..."
              className="audit-search-input"
            />
            {searchTerm && (
              <button className="audit-search-clear" onClick={() => setSearchTerm('')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
          <span className="audit-count">
            {logs.length} {logs.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {error && (
          <div className="admin-alert admin-alert-error">
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="admin-loading">
            <div className="loading-dots"><span></span><span></span><span></span></div>
            <p>Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="audit-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14,2 14,8 20,8" />
            </svg>
            <p>No audit logs found{searchTerm ? ` matching "${searchTerm}"` : ''}.</p>
          </div>
        ) : (
          <div className="audit-table-wrapper">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Query</th>
                  <th>Resources Accessed</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr key={log._id || log.id || index} className="audit-row">
                    <td className="audit-cell-timestamp">
                      <span className="audit-date">
                        {new Date(log.timestamp || log.created_at).toLocaleDateString()}
                      </span>
                      <span className="audit-time">
                        {new Date(log.timestamp || log.created_at).toLocaleTimeString()}
                      </span>
                    </td>
                    <td className="audit-cell-user">
                      <span className="audit-user-name">{log.userEmail || log.user_name || 'Unknown'}</span>
                      {(log.userId?.department || log.department) && (
                        <span className="audit-user-dept">{log.userId?.department || log.department}</span>
                      )}
                    </td>
                    <td className="audit-cell-query">
                      <span className="audit-query-text">{log.query || log.question}</span>
                    </td>
                    <td className="audit-cell-resources">
                      {(log.resourcesAccessed || log.resources_accessed || []).length > 0 ? (
                        <div className="audit-resources-list">
                          {(log.resourcesAccessed || log.resources_accessed || []).map((resource, i) => (
                            <span key={i} className="audit-resource-tag">
                              {typeof resource === 'string' ? resource : resource.filename || resource.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="audit-no-resources">-</span>
                      )}
                    </td>
                    <td className="audit-cell-confidence">
                      {(log.responseConfidence ?? log.confidence_score) != null ? (
                        <span className={`audit-confidence-badge ${getConfidenceClass(log.responseConfidence ?? log.confidence_score)}`}>
                          {Math.round(log.responseConfidence ?? log.confidence_score)}%
                        </span>
                      ) : (
                        <span className="audit-no-resources">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuditLogPage;
