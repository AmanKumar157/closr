import axiosInstance from './axiosInstance.js';

export const progressService = {
  /**
   * Get overall milestone completion and current week
   */
  async getProgressSummary() {
    return axiosInstance.get('/progress/summary');
  },

  /**
   * Get score progression timeline across analyses
   */
  async getScoreHistory(roadmapId = '') {
    const url = roadmapId ? `/progress/score-history?roadmapId=${roadmapId}` : '/progress/score-history';
    return axiosInstance.get(url);
  }
};

export default progressService;

