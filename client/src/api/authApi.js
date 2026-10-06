import api from './axios';

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (payload) => api.post('/auth/reset-password', payload),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  submitIdProof: (formData) => api.post('/auth/submit-id-proof', formData),
  changePassword: (payload) => api.post('/auth/change-password', payload),
  studentJoinSubmit: (formData) =>
    api.post('/auth/student-join-submit', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};
