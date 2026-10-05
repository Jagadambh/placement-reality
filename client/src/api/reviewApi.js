import api from './axios';

export const reviewApi = {
  getCollegeReviews: (collegeId, params) =>
    api.get(`/reviews/college/${collegeId}`, { params }),
  submitReview: (reviewData) =>
    api.post('/reviews', reviewData),
  reportReview: (id, reason) =>
    api.post(`/reviews/${id}/report`, { reason }),
  moderateReview: (id, data) =>
    api.put(`/reviews/${id}/moderate`, data),
};
