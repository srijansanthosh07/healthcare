import axios from 'axios';

const API_BASE = '/api';

export const api = {
  // Auth API
  register: async (email, password, fullName, role = 'patient') => {
    const res = await axios.post(`${API_BASE}/auth/register`, {
      email,
      password,
      full_name: fullName,
      role
    });
    return res.data;
  },

  login: async (email, password) => {
    const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
    return res.data;
  },

  getMe: async (token) => {
    const res = await axios.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  },

  // Document API
  uploadDocument: async (file, patientId, token) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('patient_id', patientId);

    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await axios.post(`${API_BASE}/documents`, formData, { headers });
    return res.data;
  },

  getDocumentDetails: async (documentId) => {
    const res = await axios.get(`${API_BASE}/documents/${documentId}`);
    return res.data;
  },

  // Timeline API
  getTimeline: async (patientId, eventType = '', sortOrder = 'desc') => {
    let url = `${API_BASE}/patients/${patientId}/timeline?sort_order=${sortOrder}`;
    if (eventType) url += `&event_type=${eventType}`;
    const res = await axios.get(url);
    return res.data;
  }
};
