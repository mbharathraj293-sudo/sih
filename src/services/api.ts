import axios from 'axios';

// Get the backend URL from environment variables, supporting both Vite's import.meta and process.env
const getBaseUrl = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env.VITE_API_BASE_URL) {
    // @ts-ignore
    return process.env.VITE_API_BASE_URL;
  }
  return 'http://localhost:8000';
};

export const API_BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
