import { apiClient } from './client';

export const screeningApi = {
  /**
   * Upload a document to create a new screening
   * @param {FormData} formData Must contain 'document' (file) and 'documentType'
   */
  createScreening: (formData) => {
    return apiClient.post('/screenings', formData, {
      headers: {
        // Let the browser and axios generate Content-Type with correct multipart boundary
        'Content-Type': undefined,
      },
      // Adequate timeout for full computer vision and biometrics pipeline
      timeout: 45000 
    });
  },

  /**
   * Get an existing screening by ID
   * @param {string} id Screening ID
   */
  getScreening: (id) => {
    return apiClient.get(`/screenings/${id}`);
  },

  /**
   * Get all screenings
   */
  getScreenings: () => {
    return apiClient.get(`/screenings`);
  },

  /**
   * Direct streaming URL for document image
   */
  getDocumentUrl: (id) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
    return `${baseUrl}/screenings/${id}/document`;
  },

  /**
   * Direct streaming URL for live comparison photo
   */
  getLiveFaceUrl: (id) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
    return `${baseUrl}/screenings/${id}/live-face`;
  }
};
