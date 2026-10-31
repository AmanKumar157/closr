import axiosInstance from './axiosInstance.js';

export const analysisService = {
  /**
   * Upload resume and analyze against target role / JD
   * @param {FormData} formData - Contains 'resume', 'targetRole', optional 'jobDescription', 'previousAnalysisId', 'roadmapId'
   */
  async createAnalysis(formData) {
    return axiosInstance.post('/analysis', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  /**
   * Fetch all past analyses for current user
   */
  async getAnalyses() {
    return axiosInstance.get('/analysis');
  },

  /**
   * Fetch a specific analysis by its ID
   * @param {string} id
   */
  async getAnalysisById(id) {
    return axiosInstance.get(`/analysis/${id}`);
  },

  /**
   * Compare two analyses side-by-side
   * @param {string} idA
   * @param {string} idB
   */
  async compareAnalyses(idA, idB) {
    return axiosInstance.get(`/analysis/compare?a=${idA}&b=${idB}`);
  },

  /**
   * Permanently delete an analysis and cascade delete all its generated ATS resumes & roadmaps
   * @param {string} id
   */
  async deleteAnalysis(id) {
    return axiosInstance.delete(`/analysis/${id}`);
  },

  /**
   * Download original uploaded resume file directly
   * @param {string} id
   * @param {string} fileName
   */
  async downloadOriginalResumeFile(id, fileName = 'Uploaded_Resume.pdf') {
    const response = await axiosInstance.get(`/analysis/${id}/file`, {
      responseType: 'blob'
    });
    const blob = new Blob([response.data], {
      type: response.headers['content-type'] || 'application/pdf'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'Uploaded_Resume.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};

export default analysisService;

