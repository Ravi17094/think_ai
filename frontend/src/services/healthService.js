import { api } from './api';

export const checkSystemHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    return {
      status: 'failed',
      dependencies: { db: 'failed', redis: 'failed' },
      timestamp: new Date().toISOString(),
    };
  }
};