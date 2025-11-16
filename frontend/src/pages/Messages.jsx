// frontend/src/pages/Messages.jsx (WITH THEME)
import { useEffect, useState, useRef } from "react";
import { useMessages } from "../context/MessageContext";
import ChatList from "../components/ChatList";
import ChatWindow from "../components/ChatWindow";
import ContactList from "../components/ContactList";

const Messages = () => {
  const { loadChats, loadContacts, currentChat } = useMessages();
  const [showContacts, setShowContacts] = useState(false);

  // ✅ Sidebar resize state
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem("chatSidebarWidth");
    return saved ? parseInt(saved) : 384;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const sidebarRef = useRef(null);

  const MIN_WIDTH = 280;
  const MAX_WIDTH = 600;
  const COLLAPSED_WIDTH = 60;

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const handleNewChat = () => {
    setShowContacts(true);
    loadContacts();
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;

      const newWidth = e.clientX;

      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
        localStorage.setItem("chatSidebarWidth", newWidth.toString());
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const expandToDefault = () => {
    setSidebarWidth(384);
    setIsCollapsed(false);
    localStorage.setItem("chatSidebarWidth", "384");
  };

  const currentWidth = isCollapsed ? COLLAPSED_WIDTH : sidebarWidth;

  return (
    <div className="h-screen flex bg-theme-secondary">
      {/* Sidebar - Chat List */}
      <div
        ref={sidebarRef}
        style={{ width: `${currentWidth}px` }}
        className={`bg-sidebar border-r border-theme flex flex-col transition-all duration-200 ${
          currentChat ? "hidden md:flex" : "flex"
        } ${isResizing ? "select-none" : ""}`}
      >
        {/* Header */}
        <div className="p-4 border-b border-theme flex items-center justify-between bg-sidebar flex-shrink-0">
          {!isCollapsed && (
            <>
              <h1 className="text-xl font-bold text-theme">Messages</h1>
              <button
                onClick={handleNewChat}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium"
              >
                New Chat
              </button>
            </>
          )}

          {/* Collapse button when collapsed */}
          {isCollapsed && (
            <button
              onClick={toggleCollapse}
              className="mx-auto p-2 text-theme-secondary hover:text-theme hover:bg-sidebar-hover rounded-lg transition-colors"
              title="Expand sidebar"
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
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Chat List or Contact List */}
        {!isCollapsed &&
          (showContacts ? (
            <ContactList onClose={() => setShowContacts(false)} />
          ) : (
            <ChatList />
          ))}

        {/* Collapsed state - show icons only */}
        {isCollapsed && (
          <div className="flex-1 flex flex-col items-center py-4 gap-4">
            <button
              onClick={handleNewChat}
              className="p-3 text-primary hover:bg-[var(--color-primaryLight)] rounded-lg transition-colors"
              title="New Chat"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Resize Handle */}
        <div
          onMouseDown={handleMouseDown}
          className={`absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-primary transition-colors group ${
            isResizing ? "bg-primary" : "bg-transparent"
          }`}
          style={{ touchAction: "none" }}
        >
          {/* Visual indicator on hover */}
          <div className="absolute top-1/2 -translate-y-1/2 right-0 w-1 h-12 bg-theme-tertiary group-hover:bg-primary transition-colors rounded-full" />
        </div>
      </div>

      {/* Resize Control Panel - Only show when not collapsed */}
      {!isCollapsed && (
        <div
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10"
          style={{ left: `${currentWidth - 20}px` }}
        >
          <div className="flex flex-col gap-1 bg-theme border border-theme rounded-lg shadow-lg p-1">
            {/* Collapse Button */}
            <button
              onClick={toggleCollapse}
              className="p-2 text-theme-secondary hover:text-theme hover:bg-sidebar-hover rounded transition-colors"
              title="Collapse sidebar"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            </button>

            {/* Reset to Default Width */}
            {sidebarWidth !== 384 && (
              <button
                onClick={expandToDefault}
                className="p-2 text-theme-secondary hover:text-theme hover:bg-sidebar-hover rounded transition-colors"
                title="Reset to default width"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Expand button when collapsed - floating */}
      {isCollapsed && (
        <button
          onClick={toggleCollapse}
          className="hidden md:flex absolute top-4 bg-theme border border-theme rounded-lg shadow-lg p-2 text-theme-secondary hover:text-theme hover:bg-sidebar-hover transition-colors z-10"
          style={{ left: `${COLLAPSED_WIDTH + 10}px` }}
          title="Expand sidebar"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 5l7 7-7 7M5 5l7 7-7 7"
            />
          </svg>
        </button>
      )}

      {/* Main Chat Window */}
      <div className={`flex-1 ${currentChat ? "flex" : "hidden md:flex"}`}>
        {currentChat ? (
          <ChatWindow />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-chat">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h2 className="text-2xl font-semibold text-theme mb-2">
                Select a chat to start messaging
              </h2>
              <p className="text-theme-secondary">
                Choose a conversation from the list or start a new one
              </p>
              {!isCollapsed && (
                <p className="text-sm text-theme-tertiary mt-4">
                  💡 Tip: Drag the sidebar edge to resize or click the collapse
                  button
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Resizing overlay */}
      {isResizing && <div className="fixed inset-0 z-50 cursor-ew-resize" />}
    </div>
  );
};

export default Messages;
