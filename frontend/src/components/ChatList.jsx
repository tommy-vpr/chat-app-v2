// frontend/src/components/ChatList.jsx (WITH THEME)
import { useMessages } from "../context/MessageContext";
import { formatDistanceToNow } from "../utils/dateUtils";

const ChatList = () => {
  const { chats, loading, selectChat, currentChat } = useMessages();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-4xl mb-2">💬</div>
          <p className="text-theme-secondary">No conversations yet</p>
          <p className="text-sm text-theme-tertiary mt-1">
            Start a new chat to begin
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-theme">
      {chats.map((chat) => {
        const isActive = currentChat?._id === chat.user._id;
        const hasUnread = chat.unreadCount > 0;

        return (
          <button
            key={chat._id}
            onClick={() => selectChat(chat.user)}
            className={`w-full p-4 flex items-start gap-3 hover:bg-sidebar-hover transition-colors border-b border-theme ${
              isActive ? "bg-sidebar-active hover:bg-sidebar-active" : ""
            }`}
          >
            {/* Avatar */}
            <div className="flex-shrink-0">
              {chat.user.avatar ? (
                <img
                  src={chat.user.avatar}
                  alt={chat.user.fullname}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                  {chat.user.fullname.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Chat Info */}
            <div className="flex-1 min-w-0 text-left">
              {/* Name and Time */}
              <div className="flex items-center justify-between mb-1">
                <h3
                  className={`font-semibold truncate ${
                    hasUnread ? "text-theme" : "text-theme-secondary"
                  }`}
                >
                  {chat.user.fullname}
                </h3>
                {chat.lastMessage && (
                  <span className="text-xs text-theme-tertiary flex-shrink-0 ml-2">
                    {formatDistanceToNow(chat.lastMessage.createdAt)}
                  </span>
                )}
              </div>

              {/* Last Message Preview */}
              {chat.lastMessage && (
                <div className="flex items-center gap-2">
                  <p
                    className={`text-sm flex-1 min-w-0 ${
                      hasUnread
                        ? "font-medium text-theme"
                        : "text-theme-secondary"
                    }`}
                  >
                    {chat.lastMessage.image ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={chat.lastMessage.image}
                          alt="Message preview"
                          className="w-8 h-8 rounded object-cover"
                        />
                        <span className="text-theme-tertiary">Photo</span>
                      </div>
                    ) : chat.lastMessage.text.length > 30 ? (
                      <span title={chat.lastMessage.text}>
                        {chat.lastMessage.text.substring(0, 30)}...
                      </span>
                    ) : (
                      chat.lastMessage.text
                    )}
                  </p>

                  {hasUnread && (
                    <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-medium">
                      {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                    </span>
                  )}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ChatList;
