// backend/src/config/constants.js
export const PAGINATION = {
  MESSAGES_PER_PAGE: 10,
  CHATS_PER_PAGE: 50,
  CONTACTS_PER_PAGE: 100,
};

export const RATE_LIMITS = {
  GLOBAL_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  GLOBAL_MAX_REQUESTS: 1000,
  API_WINDOW_MS: 60 * 1000, // 1 minute
  API_MAX_REQUESTS: 100,
};

export const FILE_UPLOAD = {
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/gif", "image/webp"],
};

export const SOCKET = {
  MAX_CONNECTIONS_PER_USER: 5,
  TYPING_TIMEOUT_MS: 5000,
};
