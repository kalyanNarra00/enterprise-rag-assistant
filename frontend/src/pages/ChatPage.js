import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { queryAPI } from '../services/api';
import Navbar from '../components/Navbar';
import ChatMessage from '../components/ChatMessage';

const EXAMPLE_QUERIES = [
  'Show recent compliance violations',
  'What is the leave policy?',
  'Summarize server outage incidents',
  'What are password requirements?',
];

function ChatPage() {
  const { user, token, logout } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    loadHistory();
  // eslint-disable-next-line
  }, []);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await queryAPI.getHistory(token);
      setHistory(Array.isArray(response) ? response : response.history || response.data || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const query = input.trim();
    if (!query || isLoading) return;

    const userMessage = {
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await queryAPI.submitQuery(query, token);

      const rawSources = response.sources || response.citations || [];
      const mappedSources = rawSources.map(s => ({
        filename: s.source || s.filename || 'Unknown',
        doc_type: s.doc_type || 'document',
        department: s.department || '',
        relevance_score: s.relevance_score || s.score || null,
        snippet: s.snippet || s.text || '',
      }));

      const assistantMessage = {
        role: 'assistant',
        content: response.answer || response.response || 'No response received.',
        sources: mappedSources,
        confidence: response.confidence ?? response.confidence_score ?? 0,
        trace: response.retrieval_trace ? {
          query_route: response.retrieval_trace.retriever_type || response.retrieval_trace.query_route || 'hybrid',
          retrievers_used: response.retrieval_trace.route_info?.source_types || response.retrieval_trace.retrievers_used || [],
          chunks_retrieved: response.retrieval_trace.num_chunks_retrieved || response.retrieval_trace.chunks_retrieved || 0,
          processing_time_ms: response.retrieval_trace.processing_time_seconds
            ? Math.round(response.retrieval_trace.processing_time_seconds * 1000)
            : response.retrieval_trace.processing_time_ms || null,
          source_types: response.retrieval_trace.route_info?.source_types || response.retrieval_trace.source_types || [],
        } : null,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      loadHistory();
    } catch (err) {
      const errorMessage = {
        role: 'assistant',
        content: `I encountered an error processing your query: ${err.message}. Please try again.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleExampleClick = (query) => {
    setInput(query);
    inputRef.current?.focus();
  };

  const handleHistoryClick = (item) => {
    const query = item.query || item.question;
    if (query) {
      setInput(query);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="chat-page">
      <Navbar />

      <div className="chat-layout">
        {/* Sidebar */}
        <div className={`chat-sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
          <div className="sidebar-header">
            <h3 className="sidebar-title">Query History</h3>
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {sidebarOpen ? (
                  <polyline points="11,17 6,12 11,7" />
                ) : (
                  <polyline points="13,7 18,12 13,17" />
                )}
              </svg>
            </button>
          </div>

          {sidebarOpen && (
            <div className="sidebar-content">
              {historyLoading ? (
                <div className="sidebar-loading">
                  <div className="loading-dots"><span></span><span></span><span></span></div>
                </div>
              ) : history.length === 0 ? (
                <p className="sidebar-empty">No queries yet. Start by asking a question.</p>
              ) : (
                <div className="history-list">
                  {history.map((item, index) => (
                    <button
                      key={item._id || item.id || index}
                      className="history-item"
                      onClick={() => handleHistoryClick(item)}
                    >
                      <span className="history-query">{item.query || item.question}</span>
                      <div className="history-meta">
                        {item.responseConfidence != null && (
                          <span className={`history-confidence confidence-${
                            item.responseConfidence >= 80 ? 'high' : item.responseConfidence >= 50 ? 'medium' : 'low'
                          }`}>
                            {Math.round(item.responseConfidence)}%
                          </span>
                        )}
                        <span className="history-time">
                          {new Date(item.timestamp || item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar collapse button when sidebar is collapsed */}
        {!sidebarOpen && (
          <button
            className="sidebar-expand-btn"
            onClick={() => setSidebarOpen(true)}
            title="Expand sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13,7 18,12 13,17" />
            </svg>
          </button>
        )}

        {/* Main Chat Area */}
        <div className="chat-main">
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="chat-empty-state">
                <div className="empty-state-icon">
                  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                    <rect x="8" y="8" width="48" height="48" rx="16" stroke="#4f46e5" strokeWidth="2" />
                    <path d="M20 24h24M20 32h16M20 40h20" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                    <circle cx="48" cy="40" r="8" fill="#4f46e5" opacity="0.2" />
                    <circle cx="48" cy="40" r="4" fill="#10b981" />
                  </svg>
                </div>
                <h2 className="empty-state-title">Enterprise RAG Assistant</h2>
                <p className="empty-state-subtitle">
                  Ask questions about company documents, policies, incidents, and more.
                  Your queries are processed with role-based access control.
                </p>
                <div className="empty-state-chips">
                  {EXAMPLE_QUERIES.map((query, index) => (
                    <button
                      key={index}
                      className="example-chip"
                      onClick={() => handleExampleClick(query)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                      </svg>
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                  <ChatMessage key={index} message={message} />
                ))}
                {isLoading && (
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
                      <div className="typing-indicator">
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="chat-input-container">
            <form onSubmit={handleSubmit} className="chat-input-form">
              <div className="chat-input-wrapper">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about your enterprise documents..."
                  className="chat-input"
                  rows="1"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  className="chat-send-btn"
                  disabled={!input.trim() || isLoading}
                  title="Send message"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22,2 15,22 11,13 2,9" />
                  </svg>
                </button>
              </div>
              <div className="chat-input-footer">
                <span className="input-hint">
                  Press Enter to send, Shift+Enter for new line
                </span>
                <span className="input-user-info">
                  Querying as <strong>{user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()}</strong> ({user?.department || user?.role})
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
