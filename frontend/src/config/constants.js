// frontend/src/config/constants.js
export const PAGINATION = {
  MESSAGES_PER_PAGE: 10,
  CHATS_PER_PAGE: 50,
  CONTACTS_PER_PAGE: 100,
};

export const SOCKET = {
  RECONNECTION_ATTEMPTS: 5,
  RECONNECTION_DELAY: 1000,
};

export const FILE_UPLOAD = {
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/gif", "image/webp"],
};
