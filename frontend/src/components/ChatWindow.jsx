// frontend/src/components/ChatWindow.jsx (FIXED SCROLL)
import { useEffect, useRef, useState } from "react";
import { useMessages } from "../context/MessageContext";
import { useAuth } from "../context/AuthContext";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";

const ChatWindow = () => {
  const {
    currentChat,
    messages,
    loading,
    loadingMore,
    hasMore,
    clearCurrentChat,
    isTyping,
    isUserOnline,
    loadMoreMessages,
  } = useMessages();

  const { user } = useAuth();

  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const topSentinelRef = useRef(null);
  const prevMessagesLengthRef = useRef(0);
  const prevScrollHeightRef = useRef(0);
  const isLoadingMoreRef = useRef(false);

  // ✅ Track loadingMore state
  useEffect(() => {
    isLoadingMoreRef.current = loadingMore;
  }, [loadingMore]);

  // ✅ FIXED: Only scroll on REAL message changes, not typing
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || messages.length === 0) return;

    const messagesAdded = messages.length - prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;

    // Don't scroll if we're loading more (older messages)
    if (isLoadingMoreRef.current) {
      console.log("⏫ Loading more, preserving scroll position");
      return;
    }

    // Only scroll to bottom if user is near bottom (for new messages)
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      150;

    if (messagesAdded > 0 && isNearBottom) {
      console.log("⬇️ New message, scrolling to bottom");
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages]); // ✅ Only depends on real messages, not computedMessages

  // ✅ Scroll to bottom when typing indicator appears (if near bottom)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !isTyping) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      150;

    if (isNearBottom) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  }, [isTyping]);

  // ✅ Initial scroll to bottom when chat opens
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      console.log("🎯 Initial scroll to bottom");
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 100);
    }
  }, [currentChat?._id]); // Only on chat change

  // ✅ Intersection Observer for infinite scroll
  useEffect(() => {
    if (!hasMore || loadingMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting) {
          console.log("🔝 Reached top, loading more messages...");

          const container = messagesContainerRef.current;
          if (container) {
            prevScrollHeightRef.current = container.scrollHeight;
          }

          loadMoreMessages();
        }
      },
      {
        root: messagesContainerRef.current,
        rootMargin: "100px",
        threshold: 0,
      }
    );

    const sentinel = topSentinelRef.current;
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
    };
  }, [hasMore, loadingMore, loading, loadMoreMessages]);

  // ✅ FIXED: Restore scroll position after loading more messages
  useEffect(() => {
    if (!loadingMore) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const newScrollHeight = container.scrollHeight;
        const heightDifference = newScrollHeight - prevScrollHeightRef.current;

        if (heightDifference > 0) {
          container.scrollTop = container.scrollTop + heightDifference;
          console.log(
            `📍 Restored scroll position (added ${heightDifference}px)`
          );
        }
      });
    });
  }, [loadingMore, messages.length]); // ✅ Depends on real messages length

  if (!currentChat) return null;

  const userOnline = isUserOnline(currentChat._id);

  return (
    <div className="flex-1 flex flex-col bg-white h-screen">
      {/* Header */}
      {/* Header */}
      <div className="p-4 border-b border-theme flex items-center gap-3 bg-header flex-shrink-0">
        <button
          onClick={clearCurrentChat}
          className="md:hidden text-theme-secondary hover:text-theme transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <div className="relative">
          {currentChat.avatar ? (
            <img
              src={currentChat.avatar}
              alt={currentChat.fullname}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
              {currentChat.fullname.charAt(0).toUpperCase()}
            </div>
          )}
          {userOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-[var(--color-online)] border-2 border-header rounded-full"></div>
          )}
        </div>

        <div>
          <h2 className="font-semibold text-theme">{currentChat.fullname}</h2>
          <p className="text-sm text-theme-secondary">
            {isTyping ? (
              <span className="text-primary">typing...</span>
            ) : userOnline ? (
              <span className="text-[var(--color-online)]">Online</span>
            ) : (
              <span className="text-theme-tertiary">Offline</span>
            )}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--color-chatBg)]"
      >
        {/* Top Sentinel */}
        <div ref={topSentinelRef} className="h-1" />

        {/* Loading More Indicator */}
        {loadingMore && (
          <div className="flex justify-center py-2">
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-white px-3 py-1.5 rounded-full shadow-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              Loading older messages...
            </div>
          </div>
        )}

        {/* No More Messages Indicator */}
        {!hasMore && messages.length > 0 && !loading && (
          <div className="flex justify-center py-2">
            <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">
              • Beginning of conversation •
            </span>
          </div>
        )}

        {/* Initial Loading */}
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-2">👋</div>
              <p className="text-gray-600">No messages yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Send a message to start the conversation
              </p>
            </div>
          </div>
        ) : (
          // ✅ Render real messages
          messages.map((message) => (
            <MessageBubble
              key={message._id}
              message={message}
              isOwnMessage={message.senderId === user?.id}
              senderName={
                message.senderId === user?.id
                  ? user?.fullname || "You"
                  : currentChat?.fullname || "Unknown"
              }
              senderAvatar={
                message.senderId === user?.id
                  ? user?.avatar
                  : currentChat?.avatar
              }
            />
          ))
        )}

        {/* ✅ Typing Indicator (separate from messages) */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="flex-shrink-0">
        <MessageInput receiverId={currentChat._id} />
      </div>
    </div>
  );
};

export default ChatWindow;
