import api from './axios';

export const roiApi = {
  getRoiColleges: () => api.get('/roi/colleges'),
  calculateSimulation: (data) => api.post('/roi/simulate', data),
};
