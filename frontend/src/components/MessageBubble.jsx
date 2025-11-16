// frontend/src/components/MessageBubble.jsx (WITH THEME)
import { formatMessageTime } from "../utils/dateUtils";

const MessageBubble = ({ message, isOwnMessage, senderName, senderAvatar }) => {
  return (
    <div className="flex items-start gap-3 py-2">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {senderAvatar ? (
          <img
            src={senderAvatar}
            alt={senderName}
            className="w-10 h-10 rounded-lg object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white font-semibold text-sm">
            {senderName?.charAt(0).toUpperCase() || "?"}
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {/* Name and Time */}
        <div className="flex items-baseline gap-2 mb-1">
          <span
            className={`text-sm font-semibold ${
              isOwnMessage ? "text-primary" : "text-theme"
            }`}
          >
            {senderName}
          </span>
          <span className="text-xs text-theme-tertiary">
            {formatMessageTime(message.createdAt)}
          </span>
        </div>

        {/* Message Text/Image */}
        <div className="text-sm text-theme">
          {message.image ? (
            <div className="space-y-2">
              <img
                src={message.image}
                alt="Shared image"
                className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity border border-theme"
                onClick={() => window.open(message.image, "_blank")}
              />
              {message.text && (
                <p className="break-words whitespace-pre-wrap">
                  {message.text}
                </p>
              )}
            </div>
          ) : (
            <p className="break-words whitespace-pre-wrap">{message.text}</p>
          )}
        </div>

        {/* Read Status (for own messages) */}
        {isOwnMessage && (
          <div className="mt-1">
            <span className="text-xs">
              {message.read ? (
                <span className="text-primary">✓✓ Read</span>
              ) : (
                <span className="text-theme-tertiary">✓ Sent</span>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
