// frontend/src/components/ContactList.jsx (WITH THEME)
import { useMessages } from "../context/MessageContext";

const ContactList = ({ onClose }) => {
  const { contacts, loading, selectChat } = useMessages();

  const handleSelectContact = (contact) => {
    selectChat(contact);
    onClose();
  };

  return (
    <div className="flex-1 flex flex-col bg-theme">
      {/* Header */}
      <div className="p-4 border-b border-theme flex items-center gap-3">
        <button
          onClick={onClose}
          className="text-theme-secondary hover:text-theme transition-colors"
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
        <h2 className="text-lg font-semibold text-theme">New Chat</h2>
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-theme-secondary">No contacts found</p>
          </div>
        ) : (
          contacts.map((contact) => (
            <button
              key={contact._id}
              onClick={() => handleSelectContact(contact)}
              className="w-full p-4 flex items-center gap-3 hover:bg-sidebar-hover transition-colors border-b border-theme"
            >
              {/* Avatar */}
              {contact.avatar ? (
                <img
                  src={contact.avatar}
                  alt={contact.fullname}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                  {contact.fullname.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Contact Info */}
              <div className="flex-1 text-left min-w-0">
                <h3 className="font-semibold text-theme truncate">
                  {contact.fullname}
                </h3>
                <p className="text-sm text-theme-secondary truncate">
                  {contact.email}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default ContactList;
