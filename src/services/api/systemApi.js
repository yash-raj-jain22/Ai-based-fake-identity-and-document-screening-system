import { apiClient } from './client';

export const systemApi = {
  getSettings: async () => {
    return await apiClient.get('/system/settings');
  },

  updateSettings: async (settingsData) => {
    return await apiClient.put('/system/settings', settingsData);
  },

  updateProfile: async (profileData) => {
    return await apiClient.put('/auth/profile', profileData);
  },
};
