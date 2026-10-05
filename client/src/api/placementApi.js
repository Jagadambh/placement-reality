import api from './axios';

export const placementApi = {
  getAdvertisedVsReality: (collegeId, params) =>
    api.get(`/placements/${collegeId}/advertised-vs-reality`, { params }),
  getPlacementDashboard: (collegeId, seasonId) =>
    api.get(`/placements/${collegeId}/seasons/${seasonId}`),
  getHistoricalTrends: (collegeId) =>
    api.get(`/placements/${collegeId}/history`),
  compareSessions: (collegeId, sessionIds) =>
    api.get(`/placements/${collegeId}/compare-sessions`, {
      params: { sessionIds: Array.isArray(sessionIds) ? sessionIds.join(',') : sessionIds },
    }),
  savePlacementRecord: (data) =>
    api.post('/placements/records', data),
  submitStudentSessionReport: (data) =>
    api.post('/student-session-reports', data),
  getStudentSessionReports: (collegeId) =>
    api.get(`/student-session-reports/${collegeId}`),
};
