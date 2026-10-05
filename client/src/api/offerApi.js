import api from './axios';

export const offerApi = {
  submitOffer: (formData) =>
    api.post('/offers', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getMyOffers: () => api.get('/offers/my-offers'),
  getCollegePublicOffers: (collegeId, params) =>
    api.get(`/offers/college/${collegeId}`, { params }),
  verifyOffer: (id, data) =>
    api.put(`/offers/${id}/verify`, data),
};
