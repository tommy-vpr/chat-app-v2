// frontend/src/services/messageApi.js (WITH PAGINATION)
import api from "./api";
import { PAGINATION } from "../config/constants";

export const messageAPI = {
  // Get all contacts (all users)
  getAllContacts: async () => {
    const response = await api.get("/messages/contacts");
    return response.data;
  },

  // Get chat partners (users you've messaged)
  getChatPartners: async () => {
    const response = await api.get("/messages/chats");
    return response.data;
  },

  // ✅ UPDATED: Get messages with pagination
  getMessages: async (
    userId,
    before = null,
    limit = PAGINATION.MESSAGES_PER_PAGE
  ) => {
    const params = {};

    if (limit) {
      params.limit = limit;
    }

    if (before) {
      params.before = before;
    }

    const response = await api.get(`/messages/${userId}`, { params });
    return response.data;
  },

  // Send text message
  sendMessage: async (receiverId, text) => {
    const response = await api.post("/messages/send", {
      receiverId,
      text,
    });
    return response.data;
  },

  // Send image message
  sendImageMessage: async (receiverId, imageFile) => {
    const formData = new FormData();
    formData.append("receiverId", receiverId);
    formData.append("image", imageFile);

    const response = await api.post("/messages/send-image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
};

export default messageAPI;
