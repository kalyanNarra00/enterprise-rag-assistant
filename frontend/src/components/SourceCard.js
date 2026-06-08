import React from 'react';

function SourceCard({ source }) {
  const {
    filename = 'Unknown Source',
    relevance_score,
    doc_type = 'document',
    snippet = '',
    chunk_index,
  } = source;

  const scorePercent = relevance_score != null
    ? Math.round(relevance_score * 100)
    : null;

  const typeColors = {
    policy: '#8b5cf6',
    incident: '#ef4444',
    hr: '#10b981',
    compliance: '#f59e0b',
    technical: '#3b82f6',
    document: '#6366f1',
  };

  const bgColor = typeColors[doc_type?.toLowerCase()] || typeColors.document;

  return (
    <div className="source-card">
      <div className="source-card-header">
        <div className="source-file-info">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14,2 14,8 20,8" />
          </svg>
          <span className="source-filename">{filename}</span>
          {chunk_index != null && (
            <span className="source-chunk">Chunk {chunk_index}</span>
          )}
        </div>
        <div className="source-meta">
          <span className="source-type-badge" style={{ background: bgColor }}>
            {doc_type}
          </span>
          {scorePercent != null && (
            <span className="source-relevance">{scorePercent}% relevant</span>
          )}
        </div>
      </div>
      {snippet && (
        <p className="source-snippet">{snippet}</p>
      )}
    </div>
  );
}

export default SourceCard;
