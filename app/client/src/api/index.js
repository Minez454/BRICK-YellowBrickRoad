import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });

// Client auth token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

// Separate axios instance for agency portal (uses agencyToken)
export const portalApi = axios.create({ baseURL: 'http://localhost:5000/api' });
portalApi.interceptors.request.use(config => {
  const token = localStorage.getItem('agencyToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
