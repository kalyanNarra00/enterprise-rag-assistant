import React from 'react';
import ReactMarkdown from 'react-markdown';
import ConfidenceIndicator from './ConfidenceIndicator';
import SourceCard from './SourceCard';
import RetrievalTrace from './RetrievalTrace';

function ChatMessage({ message }) {
  const { role, content, sources, confidence, trace, timestamp } = message;

  if (role === 'user') {
    return (
      <div className="chat-message chat-message-user">
        <div className="message-bubble user-bubble">
          <p className="message-text">{content}</p>
          {timestamp && (
            <span className="message-time">
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="message-avatar user-avatar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-message chat-message-assistant">
      <div className="message-avatar assistant-avatar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="4" />
          <circle cx="9" cy="10" r="1.5" fill="currentColor" />
          <circle cx="15" cy="10" r="1.5" fill="currentColor" />
          <path d="M9 15c.83.67 2 1 3 1s2.17-.33 3-1" />
        </svg>
      </div>
      <div className="message-bubble assistant-bubble">
        <div className="message-answer">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>

        {confidence != null && (
          <ConfidenceIndicator score={confidence} />
        )}

        {sources && sources.length > 0 && (
          <div className="message-sources">
            <h4 className="sources-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
              </svg>
              Sources ({sources.length})
            </h4>
            <div className="sources-list">
              {sources.map((source, index) => (
                <SourceCard key={index} source={source} />
              ))}
            </div>
          </div>
        )}

        {trace && <RetrievalTrace trace={trace} />}

        {timestamp && (
          <span className="message-time">
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}

export default ChatMessage;
