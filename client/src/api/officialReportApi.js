import api from './axios';

export const officialReportApi = {
  getOfficialReports: (params) => api.get('/official-reports', { params }),
  getPublicOverview: (params) => api.get('/official-reports/public-overview', { params }),
  getReportById: (id) => api.get(`/official-reports/${id}`),
  scanCollege: (collegeId) => api.post(`/official-reports/scan/${collegeId}`),
  extractReport: (id) => api.post(`/official-reports/${id}/extract`),
  reviewReport: (id, payload) => api.put(`/official-reports/${id}/review`, payload),
  reviewMetric: (metricId, payload) => api.put(`/official-reports/metrics/${metricId}/review`, payload),
  getDiscoveryLogs: (params) => api.get('/official-reports/discovery-logs', { params }),
};
