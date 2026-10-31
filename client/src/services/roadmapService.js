import axiosInstance from './axiosInstance.js';

export const roadmapService = {
  /**
   * Generate 12-week roadmap from analysis
   */
  async generateRoadmap(analysisId, remainingGapsOnly = false) {
    return axiosInstance.post('/roadmap/generate', { analysisId, remainingGapsOnly });
  },

  /**
   * Get all roadmaps for current user
   */
  async getRoadmaps() {
    return axiosInstance.get('/roadmap');
  },

  /**
   * Get single roadmap by ID
   */
  async getRoadmapById(id) {
    return axiosInstance.get(`/roadmap/${id}`);
  },

  /**
   * Toggle milestone completion
   */
  async updateMilestone(id, weekNumber, milestoneIndex, completed) {
    return axiosInstance.patch(`/roadmap/${id}/milestone`, {
      weekNumber,
      milestoneIndex,
      completed
    });
  },

  /**
   * Lazily resolve verified links for a specific week's resources
   */
  async resolveResources(id, weekNumber) {
    return axiosInstance.post(`/roadmap/${id}/resources/resolve`, { weekNumber });
  },

  /**
   * Swap out a milestone resource
   */
  async swapResource(id, weekNumber, milestoneIndex) {
    return axiosInstance.post(`/roadmap/${id}/resources/swap`, {
      weekNumber,
      milestoneIndex
    });
  },

  /**
   * Update learning status of a milestone's resource
   */
  async updateResourceStatus(id, weekNumber, milestoneIndex, status) {
    return axiosInstance.patch(`/roadmap/${id}/resources/status`, {
      weekNumber,
      milestoneIndex,
      status
    });
  },

  /**
   * Add a custom milestone / step to a week
   */
  async addMilestone(id, weekNumber, milestoneData) {
    return axiosInstance.post(`/roadmap/${id}/weeks/${weekNumber}/milestones`, milestoneData);
  },

  /**
   * Edit / update milestone title and resource
   */
  async updateMilestoneDetails(id, weekNumber, milestoneIndex, milestoneData) {
    return axiosInstance.put(
      `/roadmap/${id}/weeks/${weekNumber}/milestones/${milestoneIndex}`,
      milestoneData
    );
  },

  /**
   * Delete a milestone from a week
   */
  async deleteMilestone(id, weekNumber, milestoneIndex) {
    return axiosInstance.delete(`/roadmap/${id}/weeks/${weekNumber}/milestones/${milestoneIndex}`);
  },

  /**
   * Permanently delete a roadmap
   */
  async deleteRoadmap(id) {
    return axiosInstance.delete(`/roadmap/${id}`);
  }
};

export default roadmapService;

