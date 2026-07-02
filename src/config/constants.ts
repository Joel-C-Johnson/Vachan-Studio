export const APP_NAME = 'Vachan Studio';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
export const API_BASE_URL_AUTH = import.meta.env.VITE_API_BASE_URL_AUTH;

// SSE settings
export const SSE_ENDPOINT = `${API_BASE_URL}/model/events`;
export const SSE_RECONNECT_DELAY = 3000;

// Storage limits
export const MAX_OUTPUTS_STORED = 15;
export const MAX_STORAGE_SIZE_MB = 200;