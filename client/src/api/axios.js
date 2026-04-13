import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true,
});

/**
 * Global Response Interceptor
 * Specifically designed to handle YouTube OAuth2 token expiration
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;

    // Case 1: YouTube Token Expired / Re-authentication required
    if (response?.data?.reAuthUrl) {
      console.warn("YouTube Session expired. Redirecting to Google Auth...");
      window.location.href = `${api.defaults.baseURL}${response.data.reAuthUrl}`;
    }

    // Case 2: Unauthorized (401) but no reAuthUrl
    // This could happen if the internal session (cookie) expires
    if (response?.status === 401 && !response.data?.reAuthUrl) {
      console.error("Session unauthorized. Please log in again.");
      // Optional: window.location.href = '/login'; 
    }

    // Standardize the error object before rejecting
    const processedError = {
      message: response?.data?.message || error.message || "Network Error",
      status: response?.status,
      data: response?.data
    };

    return Promise.reject(processedError);
  }
);

export default api;