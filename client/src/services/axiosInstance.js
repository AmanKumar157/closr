import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Crucial for sending and receiving httpOnly cookies across requests
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor to standardize error messages and response data extraction
axiosInstance.interceptors.response.use(
  (response) => {
    // Return standard backend response { success, data, message }
    return response.data;
  },
  async (error) => {
    let errorResponse = error.response?.data;
    let message = errorResponse?.message;

    // When responseType was 'blob', error responses are also returned as Blobs
    if (typeof Blob !== 'undefined' && errorResponse instanceof Blob) {
      try {
        const text = await errorResponse.text();
        const json = JSON.parse(text);
        if (json?.message) {
          message = json.message;
          errorResponse = json;
        }
      } catch (_) {}
    }

    // Handle proxy 500 when backend server is stopped / connection refused
    if (!message) {
      if (error.response?.status === 500) {
        message = 'Backend server is offline or restarting. Please ensure the backend server is running on port 5000.';
      } else if (error.code === 'ERR_NETWORK') {
        message = 'Cannot connect to backend server. Please verify your connection.';
      } else {
        message = error.message || 'An unexpected error occurred';
      }
    }
    
    // Create an augmented error object with status and backend details
    const formattedError = new Error(message);
    formattedError.status = error.response?.status;
    formattedError.errors = errorResponse?.errors || [];
    formattedError.raw = error;

    return Promise.reject(formattedError);
  }
);

export default axiosInstance;

