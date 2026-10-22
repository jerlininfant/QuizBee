const RAW_API_URL = import.meta.env.VITE_API_URL || '';
const API_BASE = RAW_API_URL
  ? (RAW_API_URL.endsWith('/api') ? RAW_API_URL : `${RAW_API_URL.replace(/\/+$/, '')}/api`)
  : '/api';

export const api = {
  getToken() {
    return localStorage.getItem('quizbee_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('quizbee_token', token);
    } else {
      localStorage.removeItem('quizbee_token');
    }
  },

  async request(endpoint, options = {}) {
    const headers = options.headers || {};
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Do not set Content-Type if body is FormData
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    let response;
    try {
      response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });
    } catch (fetchErr) {
      console.error('[API Connection Error]', fetchErr);
      throw new Error('Network error: Unable to connect to server. Please check your backend deployment and network connection.');
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || data.message || `Request failed (${response.status})`);
    }
    return data;
  },

  // Auth
  register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },

  getMe() {
    return this.request('/auth/me');
  },

  // Quizzes
  getQuizzes() {
    return this.request('/quizzes');
  },

  getQuiz(id) {
    return this.request(`/quizzes/${id}`);
  },

  createQuiz(quizData) {
    return this.request('/quizzes', {
      method: 'POST',
      body: JSON.stringify(quizData)
    });
  },

  updateQuiz(id, quizData) {
    return this.request(`/quizzes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(quizData)
    });
  },

  deleteQuiz(id) {
    return this.request(`/quizzes/${id}`, {
      method: 'DELETE'
    });
  },

  // Rooms
  createRoom(quizId) {
    return this.request('/rooms/create', {
      method: 'POST',
      body: JSON.stringify({ quizId })
    });
  },

  getRoom(code) {
    return this.request(`/rooms/${code}`);
  },

  joinRoom(code, payload) {
    return this.request(`/rooms/${code}/join`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  getRoomResults(code) {
    return this.request(`/rooms/${code}/results`);
  },

  // AI Generation
  generateFromText(payload) {
    return this.request('/ai/generate-text', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  generateFromFile(formData) {
    return this.request('/ai/generate-file', {
      method: 'POST',
      body: formData
    });
  },

  regenerateQuestion(payload) {
    return this.request('/ai/regenerate-question', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // System status and configuration
  getSystemStatus() {
    return this.request('/system/status');
  },

  updateSystemConfig(payload) {
    return this.request('/system/configure', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};
