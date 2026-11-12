import { buildRequestUrl, normalizeApiBaseUrl } from '@/api/http';

describe('API base URL normalization', () => {
  it.each([
    ['https://api.example.com', 'https://api.example.com/api'],
    ['https://api.example.com/', 'https://api.example.com/api'],
    ['https://api.example.com/api', 'https://api.example.com/api'],
    ['https://api.example.com/api/', 'https://api.example.com/api'],
    [undefined, 'http://localhost:5000/api'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeApiBaseUrl(input)).toBe(expected);
  });

  it('encodes query values and omits empty values', () => {
    expect(buildRequestUrl('/health', { page: 2, search: 'TA & Instructor', empty: '' })).toMatch(/\/health\?page=2&search=TA%20%26%20Instructor$/);
  });
});
