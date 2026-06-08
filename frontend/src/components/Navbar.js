import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/chat" className="navbar-brand">
          <div className="navbar-logo">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="#4f46e5" />
              <path d="M7 9h14M7 14h10M7 19h12" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              <circle cx="22" cy="19" r="3" fill="#10b981" />
            </svg>
          </div>
          <span className="navbar-title">RAG Assistant</span>
        </Link>

        <div className="navbar-links">
          <Link
            to="/chat"
            className={`navbar-link ${isActive('/chat') ? 'active' : ''}`}
          >
            Chat
          </Link>
          {isAdmin && (
            <>
              <Link
                to="/admin"
                className={`navbar-link ${isActive('/admin') ? 'active' : ''}`}
              >
                Dashboard
              </Link>
              <Link
                to="/admin/audit"
                className={`navbar-link ${isActive('/admin/audit') ? 'active' : ''}`}
              >
                Audit Logs
              </Link>
            </>
          )}
        </div>

        <div className="navbar-user">
          <div className="navbar-user-info">
            <span className="navbar-user-name">{user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()}</span>
            <span className={`navbar-role-badge role-${user?.role}`}>
              {user?.role}
            </span>
          </div>
          {user?.department && (
            <span className="navbar-department">{user.department}</span>
          )}
          <button onClick={logout} className="navbar-logout-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16,17 21,12 16,7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
