// frontend/src/context/MessageContext.jsx (ADD PAGINATION)
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { messageAPI } from "../services/messageApi";
import { useAuth } from "./AuthContext";
import socketService from "../services/socket";
import { PAGINATION } from "../config/constants"; // ✅ Import

const MessageContext = createContext(null);

export const MessageProvider = ({ children }) => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false); // ✅ NEW
  const [hasMore, setHasMore] = useState(true); // ✅ NEW
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  const currentChatRef = useRef(null);

  useEffect(() => {
    currentChatRef.current = currentChat;
  }, [currentChat]);

  useEffect(() => {
    if (user?.id) {
      console.log(`🔌 User logged in, connecting socket for user: ${user.id}`);
      socketService.connect();
      setupSocketListeners();

      return () => {
        console.log("🧹 Cleaning up socket listeners");
        socketService.removeAllListeners();
        socketService.disconnect();
      };
    } else {
      console.log("👤 No user, disconnecting socket");
      socketService.disconnect();
    }
  }, [user?.id]);

  const setupSocketListeners = () => {
    console.log("👂 Setting up socket listeners");

    socketService.onOnlineUsers((data) => {
      console.log("👥 Initial online users:", data.users);
      setOnlineUsers(new Set(data.users));
    });

    socketService.onNewMessage((data) => {
      const { message, from } = data;

      console.log("📨 New message received:", {
        from,
        currentChatId: currentChatRef.current?._id,
        isFromCurrentChat: currentChatRef.current?._id === from,
      });

      if (currentChatRef.current?._id === from) {
        setMessages((prev) => {
          if (prev.find((m) => m._id === message._id)) {
            console.log("⚠️ Duplicate message, ignoring");
            return prev;
          }
          console.log("✅ Adding message to current chat");
          return [...prev, message];
        });

        socketService.markMessagesRead(from);
      } else {
        console.log("📬 Message from other user, updating chat list");
      }

      loadChats();
    });

    socketService.onMessageSent((data) => {
      const { tempId, message } = data;

      console.log("✅ Message sent confirmation:", {
        tempId,
        messageId: message._id,
      });

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id === tempId) {
            console.log(
              `🔄 Replacing temp message ${tempId} with ${message._id}`
            );
            return message;
          }
          return msg;
        })
      );
    });

    socketService.onMessageError((data) => {
      const { error, tempId } = data;
      console.error("❌ Message send error:", error);

      setMessages((prev) => prev.filter((msg) => msg._id !== tempId));
      setError(error);

      setTimeout(() => setError(null), 5000);
    });

    socketService.onMessagesRead((data) => {
      const { readBy, count } = data;

      console.log(`✓ ${count} messages read by ${readBy}`);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.receiverId === readBy ? { ...msg, read: true } : msg
        )
      );

      loadChats();
    });

    socketService.onUserTyping((data) => {
      if (currentChatRef.current?._id === data.userId) {
        console.log("⌨️ User is typing:", data.userId);
        setIsTyping(true);
      }
    });

    socketService.onUserStopTyping((data) => {
      if (currentChatRef.current?._id === data.userId) {
        console.log("⏸️ User stopped typing:", data.userId);
        setIsTyping(false);
      }
    });

    socketService.onUserOnline((data) => {
      console.log("🟢 User came online:", data.userId);
      setOnlineUsers((prev) => new Set([...prev, data.userId]));
    });

    socketService.onUserOffline((data) => {
      console.log("🔴 User went offline:", data.userId);
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    });
  };

  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await messageAPI.getAllContacts();
      setContacts(data.contacts || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load contacts");
      console.error("Load contacts error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadChats = useCallback(async () => {
    try {
      const data = await messageAPI.getChatPartners();
      setChats(data.chats || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load chats");
      console.error("Load chats error:", err);
    }
  }, []);

  // ✅ UPDATED: Load initial messages
  const loadMessages = useCallback(
    async (userId) => {
      try {
        setLoading(true);
        const data = await messageAPI.getMessages(userId);
        setMessages(data.messages || []);
        setCurrentChat(data.user);
        setHasMore(data.hasMore || false); // ✅ Set hasMore from API
        setError(null);

        if (socketService.isConnected()) {
          socketService.markMessagesRead(userId);
        }

        loadChats();

        return data;
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load messages");
        console.error("Load messages error:", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [loadChats]
  );

  // ✅ NEW: Load more messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!currentChatRef.current || loadingMore || !hasMore) {
      return;
    }

    try {
      setLoadingMore(true);

      // Get oldest message timestamp as cursor
      const oldestMessage = messages[0];
      if (!oldestMessage) return;

      const cursor = oldestMessage.createdAt;

      console.log(`📜 Loading more messages before: ${cursor}`);

      const data = await messageAPI.getMessages(
        currentChatRef.current._id,
        cursor,
        PAGINATION.MESSAGES_PER_PAGE
      );

      if (data.messages && data.messages.length > 0) {
        // ✅ Prepend older messages
        setMessages((prev) => [...data.messages, ...prev]);
        setHasMore(data.hasMore || false);
        console.log(`✅ Loaded ${data.messages.length} more messages`);
      } else {
        setHasMore(false);
        console.log("📭 No more messages to load");
      }
    } catch (err) {
      console.error("Load more messages error:", err);
      setError(err.response?.data?.message || "Failed to load more messages");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoadingMore(false);
    }
  }, [messages, loadingMore, hasMore]);

  const sendMessage = useCallback(
    async (receiverId, text) => {
      try {
        if (!socketService.isConnected()) {
          throw new Error("Not connected to server. Please refresh the page.");
        }

        const tempId = `temp-${Date.now()}-${Math.random()}`;

        const optimisticMessage = {
          _id: tempId,
          senderId: user?.id,
          receiverId,
          text,
          createdAt: new Date().toISOString(),
          read: false,
        };

        setMessages((prev) => [...prev, optimisticMessage]);

        socketService.sendMessage(receiverId, text, null, tempId);

        await loadChats();

        return optimisticMessage;
      } catch (err) {
        const errorMessage =
          err.message ||
          err.response?.data?.message ||
          "Failed to send message";
        setError(errorMessage);
        console.error("Send message error:", err);

        setTimeout(() => setError(null), 5000);

        throw err;
      }
    },
    [user, loadChats]
  );

  const sendImageMessage = useCallback(
    async (receiverId, imageFile) => {
      try {
        const data = await messageAPI.sendImageMessage(receiverId, imageFile);

        setMessages((prev) => [...prev, data.message]);

        if (socketService.isConnected()) {
          socketService.sendMessage(receiverId, "", data.message.image);
        }

        await loadChats();

        return data.message;
      } catch (err) {
        setError(err.response?.data?.message || "Failed to send image");
        console.error("Send image error:", err);
        throw err;
      }
    },
    [loadChats]
  );

  const selectChat = useCallback(
    async (user) => {
      setCurrentChat(user);
      setIsTyping(false);
      setHasMore(true); // ✅ Reset hasMore for new chat
      await loadMessages(user._id);
    },
    [loadMessages]
  );

  const clearCurrentChat = useCallback(() => {
    setCurrentChat(null);
    setMessages([]);
    setIsTyping(false);
    setHasMore(true); // ✅ Reset hasMore
  }, []);

  const emitTyping = useCallback(() => {
    if (currentChatRef.current && socketService.isConnected()) {
      socketService.emitTyping(currentChatRef.current._id);
    }
  }, []);

  const emitStopTyping = useCallback(() => {
    if (currentChatRef.current && socketService.isConnected()) {
      socketService.emitStopTyping(currentChatRef.current._id);
    }
  }, []);

  const isUserOnline = useCallback(
    (userId) => {
      return onlineUsers.has(userId);
    },
    [onlineUsers]
  );

  const value = {
    contacts,
    chats,
    currentChat,
    messages,
    loading,
    loadingMore, // ✅ NEW
    hasMore, // ✅ NEW
    error,
    isTyping,
    onlineUsers,
    socketConnected: socketService.isConnected(),
    loadContacts,
    loadChats,
    loadMessages,
    loadMoreMessages, // ✅ NEW
    sendMessage,
    sendImageMessage,
    selectChat,
    clearCurrentChat,
    emitTyping,
    emitStopTyping,
    isUserOnline,
  };

  return (
    <MessageContext.Provider value={value}>{children}</MessageContext.Provider>
  );
};

export const useMessages = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error("useMessages must be used within a MessageProvider");
  }
  return context;
};
