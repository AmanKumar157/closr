import axiosInstance from './axiosInstance.js';

export const authService = {
  /**
   * Register a new user account
   */
  async register({ name, email, password }) {
    return axiosInstance.post('/auth/register', { name, email, password });
  },

  /**
   * Log into an existing account
   */
  async login({ email, password }) {
    return axiosInstance.post('/auth/login', { email, password });
  },

  /**
   * Log out current user & invalidate cookie + token
   */
  async logout() {
    return axiosInstance.post('/auth/logout');
  },

  /**
   * Fetch current authenticated user info
   */
  async getMe() {
    return axiosInstance.get('/auth/me');
  }
};

export default authService;

