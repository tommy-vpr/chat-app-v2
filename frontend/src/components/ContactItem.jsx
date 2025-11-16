// frontend/src/components/ContactItem.jsx (NEW - MEMOIZED)
import { memo } from "react";

const ContactItem = memo(({ contact, online, typing, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
    >
      {/* Avatar with Online Indicator */}
      <div className="relative flex-shrink-0">
        {contact.avatar ? (
          <img
            src={contact.avatar}
            alt={contact.fullname}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
            {contact.fullname.charAt(0).toUpperCase()}
          </div>
        )}
        {/* Online Status Dot */}
        {online && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
        )}
      </div>

      {/* Contact Info */}
      <div className="flex-1 text-left min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">
          {contact.fullname}
        </h3>

        {/* Typing Indicator or Email */}
        {typing ? (
          <div className="flex items-center gap-1 text-sm text-blue-600">
            <span>typing</span>
            <div className="flex gap-1">
              <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce"></div>
              <div
                className="w-1 h-1 bg-blue-600 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <div
                className="w-1 h-1 bg-blue-600 rounded-full animate-bounce"
                style={{ animationDelay: "0.4s" }}
              ></div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600 truncate">{contact.email}</p>
        )}
      </div>

      {/* Online Status Badge */}
      {online && !typing && (
        <div className="flex-shrink-0">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Online
          </span>
        </div>
      )}
    </button>
  );
});

ContactItem.displayName = "ContactItem";

export default ContactItem;
