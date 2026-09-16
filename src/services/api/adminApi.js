import { apiClient } from './client';

export const adminApi = {
  getUsers: async () => {
    return await apiClient.get('/admin/users');
  },

  createUser: async (userData) => {
    return await apiClient.post('/admin/users', userData);
  },

  deleteUser: async (id) => {
    return await apiClient.delete(`/admin/users/${id}`);
  },

  getSystemHealth: async () => {
    return await apiClient.get('/admin/system');
  },
};
