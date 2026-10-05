import api from './axios';

export const communityApi = {
  getPosts: (params) => api.get('/community/posts', { params }),
  getPostById: (id) => api.get(`/community/posts/${id}`),
  createPost: (data) => api.post('/community/posts', data),
  votePost: (id, direction) => api.post(`/community/posts/${id}/vote`, { direction }),
  createComment: (postId, data) => api.post(`/community/posts/${postId}/comments`, data),
  voteComment: (commentId, direction) => api.post(`/community/comments/${commentId}/vote`, { direction }),
  getStats: () => api.get('/community/stats'),
};
