import apiClient from './config';

export default {
  login(email, password) {
    return apiClient.post('/token', { email, password });
  },
};