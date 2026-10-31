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
  },

  /**
   * Update resume HTML or template (Live Interactive Editing)
   */
  async updateResume(id, data) {
    return axiosInstance.put(`/resume/${id}`, data);
  },

  /**
   * Tailor a new ATS resume for a specific job opening without disrupting others
   */
  async tailorResume(data) {
    return axiosInstance.post('/resume/tailor', data);
  },

  /**
   * Delete a resume (pass cascade=true to completely remove parent analysis & roadmaps from app)
   */
  async deleteResume(id, cascade = false) {
    return axiosInstance.delete(`/resume/${id}${cascade ? '?cascade=true' : ''}`);
  },

  /**
   * URL for streaming original uploaded PDF inside the browser iframe
   */
  getOriginalPdfUrl(analysisId) {
    const rawId = typeof analysisId === 'object' && analysisId !== null
      ? (analysisId._id || '')
      : (analysisId || '');
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return `${baseURL}/analysis/${rawId}/file`;
  }
};

export default resumeService;

