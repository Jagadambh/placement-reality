import api from './axios';

export const collegeApi = {
  getColleges: (params) => api.get('/colleges', { params }),
  getTop50PrivateColleges: (params) => api.get('/colleges/top-50-private', { params }),
  getCollegeBySlug: (slugOrId) => api.get(`/colleges/${slugOrId}`),
  getDepartments: (collegeId) => api.get(`/colleges/${collegeId}/departments`),
  getSeasons: (collegeId) => api.get(`/colleges/${collegeId}/seasons`),
  createCollege: (data) => api.post('/colleges', data),
  updateCollege: (id, data) => api.put(`/colleges/${id}`, data),
  submitUnlistedCollege: (data) => api.post('/colleges/submit-unlisted', data),
  classifyInstitution: (id, data) => api.put(`/colleges/${id}/classify`, data),
  getDiscoveryStatus: (collegeId) => api.get(`/colleges/${collegeId}/discovery-status`),
  triggerDiscovery: (collegeId) => api.post(`/colleges/${collegeId}/discover-placements`),
};
