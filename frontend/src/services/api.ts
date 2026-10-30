import axios from 'axios';
import { getLocalCache, setLocalCache, getCacheDuration } from './cacheManager';

const API_BASE_URL = 'https://thinkz.ai'; 

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    if (config.method === 'get' && config.url) {
      const cacheInfo = getLocalCache(config.url);
      
      if (cacheInfo && !cacheInfo.isExpired) {
        config.adapter = () => {
          return Promise.resolve({
            data: cacheInfo.cachedData,
            status: 200,
            statusText: 'OK (Cache-Control Hit)',
            headers: config.headers,
            config,
          });
        };
      } 
      else if (cacheInfo && cacheInfo.etag) {
        config.headers['If-None-Match'] = cacheInfo.etag;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    const { config, headers, data } = response;
    
    if (config.method === 'get' && config.url) {
      const etag = headers['etag'] || headers['ETag'];
      const maxAgeMs = getCacheDuration(config.url);
      
      if (etag && maxAgeMs > 0) {
        setLocalCache(config.url, data, etag, maxAgeMs);
      }
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 304) {
      const cacheInfo = getLocalCache(error.config.url);
      if (cacheInfo) {
        const maxAgeMs = getCacheDuration(error.config.url);
        setLocalCache(error.config.url, cacheInfo.cachedData, cacheInfo.etag, maxAgeMs);
        
        return Promise.resolve({
          ...error.response,
          status: 200,
          data: cacheInfo.cachedData,
        });
      }
    }
    return Promise.reject(error);
  }
);