import { apiData } from './http';

export const getRemoteWishlist = () => apiData<string[]>('/wishlist');
export const saveRemoteWishlist = (courseIds: string[]) => apiData<string[]>('/wishlist', { method: 'PUT', body: { courseIds } });
