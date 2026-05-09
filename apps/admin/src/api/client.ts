import { createApiClient } from '@orvexa/api-client';

const baseUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000';
const client = createApiClient(baseUrl);

export const apiRequest = client.apiRequest;
export const apiBaseUrl = client.apiBaseUrl;
export { ApiError, type RequestOptions } from '@orvexa/api-client';
