import api from './axios';

export const internshipApi = {
  getInternships: (params) => api.get('/internships', { params }),
  submitInternship: (formData) =>
    api.post('/internships', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getInternshipAnalytics: (collegeId) =>
    api.get(`/internships/analytics/${collegeId}`),
};
