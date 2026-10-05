import api from './axios';

export const aiApi = {
  chat: (prompt, sessionId) =>
    api.post('/ai/chat', { prompt, sessionId }),
  getConversationHistory: (sessionId) =>
    api.get(`/ai/conversations/${sessionId}`),
  getStatus: () =>
    api.get('/ai/status'),
};
