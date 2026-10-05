import api from './axios';

export const comparisonApi = {
  compareColleges: (collegeIds) =>
    api.post('/comparisons', { collegeIds }),
};
