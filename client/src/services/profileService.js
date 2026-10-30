import axiosInstance from './axiosInstance.js';

export const profileService = {
  /**
   * Fetch current user profile
   */
  async getProfile() {
    return axiosInstance.get('/profile');
  },

  /**
   * Update user profile (currentSkills, targetRole, jobDescription, preferredLanguage)
   */
  async updateProfile(profileData) {
    return axiosInstance.put('/profile', profileData);
  }
};

export default profileService;
