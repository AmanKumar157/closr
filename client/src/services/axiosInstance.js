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
  (error) => {
    const errorResponse = error.response?.data;
    const message = errorResponse?.message || error.message || 'An unexpected error occurred';
    
    // Create an augmented error object with status and backend details
    const formattedError = new Error(message);
    formattedError.status = error.response?.status;
    formattedError.errors = errorResponse?.errors || [];
    formattedError.raw = error;

    return Promise.reject(formattedError);
  }
);

export default axiosInstance;
