import axiosInstance from './axiosInstance.js';

export const resumeService = {
  /**
   * Generate ATS-compliant HTML resume
   */
  async generateResume(analysisId) {
    return axiosInstance.post('/resume/generate', { analysisId });
  },

  /**
   * List all generated resumes
   */
  async getResumes() {
    return axiosInstance.get('/resume');
  },

  /**
   * Get single resume details and HTML
   */
  async getResumeById(id) {
    return axiosInstance.get(`/resume/${id}`);
  },

  /**
   * Download resume PDF as blob
   */
  async downloadPdf(id) {
    return axiosInstance.get(`/resume/${id}/pdf`, {
      responseType: 'blob'
    });
  }
};

export default resumeService;
