import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';
import Navbar from '../components/Navbar';

function AdminPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  // eslint-disable-next-line
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getStats(token);
      setStats(response);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard stats.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleIngest = async () => {
    setIngesting(true);
    setIngestResult(null);
    try {
      const response = await adminAPI.ingestDocuments(token);
      setIngestResult({
        type: 'success',
        message: response.message || `Successfully ingested ${response.documents_processed || 0} documents.`,
      });
      loadStats();
    } catch (err) {
      setIngestResult({
        type: 'error',
        message: err.message || 'Ingestion failed.',
      });
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div className="admin-page">
      <Navbar />

      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">Admin Dashboard</h1>
            <p className="admin-subtitle">System overview and document management</p>
          </div>
          <div className="admin-actions">
            <button
              className="admin-ingest-btn"
              onClick={handleIngest}
              disabled={ingesting}
            >
              {ingesting ? (
                <span className="btn-loading">
                  <span className="loading-dots"><span></span><span></span><span></span></span>
                  Ingesting...
                </span>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7,10 12,15 17,10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Ingest Documents
                </>
              )}
            </button>
            <Link to="/admin/audit" className="admin-audit-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10,9 9,9 8,9" />
              </svg>
              View Audit Logs
            </Link>
          </div>
        </div>

        {ingestResult && (
          <div className={`admin-alert admin-alert-${ingestResult.type}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {ingestResult.type === 'success' ? (
                <>
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22,4 12,14.01 9,11.01" />
                </>
              ) : (
                <>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </>
              )}
            </svg>
            <span>{ingestResult.message}</span>
            <button onClick={() => setIngestResult(null)} className="alert-dismiss">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {error && (
          <div className="admin-alert admin-alert-error">
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="admin-loading">
            <div className="loading-dots"><span></span><span></span><span></span></div>
            <p>Loading dashboard...</p>
          </div>
        ) : (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon stat-icon-docs">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                </svg>
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats?.documents ?? stats?.total_documents ?? 0}</span>
                <span className="stat-label">Total Documents</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-queries">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats?.queries?.total ?? stats?.total_queries ?? 0}</span>
                <span className="stat-label">Total Queries</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-confidence">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20V10M18 20V4M6 20v-4" />
                </svg>
              </div>
              <div className="stat-info">
                <span className="stat-value">
                  {stats?.confidence?.average != null
                    ? `${Math.round(stats.confidence.average)}%`
                    : stats?.avg_confidence != null
                    ? `${Math.round(stats.avg_confidence)}%`
                    : 'N/A'}
                </span>
                <span className="stat-label">Avg Confidence</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-users">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats?.users?.active ?? stats?.users?.total ?? stats?.total_users ?? 0}</span>
                <span className="stat-label">Active Users</span>
              </div>
            </div>
          </div>
        )}

        {stats?.recent_queries && stats.recent_queries.length > 0 && (
          <div className="admin-section">
            <h2 className="section-title">Recent Queries</h2>
            <div className="recent-queries-list">
              {stats.recent_queries.slice(0, 5).map((q, index) => (
                <div key={index} className="recent-query-item">
                  <div className="recent-query-content">
                    <span className="recent-query-text">{q.query || q.question}</span>
                    <span className="recent-query-user">{q.user_name || q.user}</span>
                  </div>
                  <div className="recent-query-meta">
                    {q.confidence_score != null && (
                      <span className={`history-confidence confidence-${
                        q.confidence_score >= 80 ? 'high' : q.confidence_score >= 50 ? 'medium' : 'low'
                      }`}>
                        {Math.round(q.confidence_score)}%
                      </span>
                    )}
                    <span className="recent-query-time">
                      {new Date(q.timestamp || q.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPage;
