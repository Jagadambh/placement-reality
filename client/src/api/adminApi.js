import api from './axios';

export const adminApi = {
  getOverview: () => api.get('/admin/overview'),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getOffersQueue: (params) => api.get('/admin/offers/queue', { params }),
  getReviewsQueue: (params) => api.get('/admin/reviews/queue', { params }),
  getStudentVerificationsQueue: (params) => api.get('/admin/verifications/queue', { params }),
  getInternshipsQueue: (params) => api.get('/admin/internships/queue', { params }),
  verifyInternship: (id, data) => api.put(`/admin/internships/${id}/verify`, data),
  getOfficialImportsQueue: (params) => api.get('/admin/official-imports/queue', { params }),
  verifyOfficialImport: (id, data) => api.put(`/admin/official-imports/${id}/verify`, data),
  importOfficialPlacement: (data) => api.post('/admin/official-imports', data),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUserRole: (id, data) => api.put(`/admin/users/${id}/role`, data),
  verifyCollegeAffiliation: (id, data) => api.put(`/admin/users/${id}/verify-college`, data),
};

