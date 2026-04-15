import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.response.use(
  res => res,
  err => {
    console.error('API Error:', err.response?.status, err.response?.data || err.message);
    return Promise.reject(err);
  }
);

export default api;
