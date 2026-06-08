import React, { useState } from 'react';

function RetrievalTrace({ trace }) {
  const [expanded, setExpanded] = useState(false);

  if (!trace) return null;

  const {
    query_route = 'default',
    retrievers_used = [],
    chunks_retrieved = 0,
    chunks_after_rerank = 0,
    source_types = [],
    processing_time_ms,
  } = trace;

  return (
    <div className="retrieval-trace">
      <button
        className="retrieval-trace-toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`trace-chevron ${expanded ? 'expanded' : ''}`}
        >
          <polyline points="9,18 15,12 9,6" />
        </svg>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20V10M18 20V4M6 20v-4" />
        </svg>
        <span>Retrieval Trace</span>
        {processing_time_ms != null && (
          <span className="trace-time">{processing_time_ms}ms</span>
        )}
      </button>

      {expanded && (
        <div className="retrieval-trace-content">
          <div className="trace-grid">
            <div className="trace-item">
              <span className="trace-item-label">Query Route</span>
              <span className="trace-item-value trace-route-badge">{query_route}</span>
            </div>
            <div className="trace-item">
              <span className="trace-item-label">Chunks Retrieved</span>
              <span className="trace-item-value">{chunks_retrieved}</span>
            </div>
            {chunks_after_rerank > 0 && (
              <div className="trace-item">
                <span className="trace-item-label">After Reranking</span>
                <span className="trace-item-value">{chunks_after_rerank}</span>
              </div>
            )}
            {processing_time_ms != null && (
              <div className="trace-item">
                <span className="trace-item-label">Processing Time</span>
                <span className="trace-item-value">{processing_time_ms}ms</span>
              </div>
            )}
          </div>

          {retrievers_used.length > 0 && (
            <div className="trace-section">
              <span className="trace-section-label">Retrievers Used</span>
              <div className="trace-tags">
                {retrievers_used.map((retriever, index) => (
                  <span key={index} className="trace-tag retriever-tag">
                    {retriever}
                  </span>
                ))}
              </div>
            </div>
          )}

          {source_types.length > 0 && (
            <div className="trace-section">
              <span className="trace-section-label">Source Types</span>
              <div className="trace-tags">
                {source_types.map((type, index) => (
                  <span key={index} className="trace-tag source-tag">
                    {type}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RetrievalTrace;
