import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL });

api.interceptors.response.use(
  res => res,
  err => {
    console.error('API Error:', err.response?.status, err.response?.data || err.message);
    return Promise.reject(err);
  }
);

export default api;
