import axios from 'axios';

const isLocalhost = typeof window !== 'undefined'
  && ['localhost', '127.0.0.1'].includes(window.location.hostname);
const configuredBaseUrl = import.meta.env.VITE_API_URL?.trim();
const baseURL = isLocalhost
  ? '/api'
  : (configuredBaseUrl || 'https://aivorachatbackend.vercel.app/api');

const api = axios.create({
  baseURL
});

api.interceptors.response.use(
  res => res,
  err => {
    console.error('API Error:', err.response?.status, err.response?.data || err.message);
    return Promise.reject(err);
  }
);

export default api;
