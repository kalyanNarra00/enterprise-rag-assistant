const API_ROOT = '/api';

function composeHeaders(authToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  return headers;
}

async function invoke(endpoint, options = {}) {
  const response = await fetch(`${API_ROOT}${endpoint}`, {
    ...options,
    headers: { ...composeHeaders(options.token), ...options.headers },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const err = new Error(body.error || body.message || `Request failed (${response.status})`);
    err.response = { data: body, status: response.status };
    throw err;
  }

  const payload = await response.json();
  return payload.data !== undefined ? payload.data : payload;
}

export const authAPI = {
  login: (email, password) =>
    invoke('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  signup: (firstName, lastName, email, password, department) =>
    invoke('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ firstName, lastName, email, password, department }),
    }),

  getMe: (token) => invoke('/auth/me', { token }),
};

export const queryAPI = {
  submitQuery: (query, token) =>
    invoke('/query', { method: 'POST', body: JSON.stringify({ query }), token }),

  getHistory: (token, limit = 50) =>
    invoke(`/query/history?limit=${limit}`, { token }),
};

export const adminAPI = {
  ingestDocuments: (token) =>
    invoke('/admin/ingest', { method: 'POST', token }),

  getAuditLogs: (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return invoke(`/admin/audit-logs${qs ? `?${qs}` : ''}`, { token });
  },

  getStats: (token) => invoke('/admin/stats', { token }),
};
