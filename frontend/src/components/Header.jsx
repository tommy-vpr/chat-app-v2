// frontend/src/components/Header.jsx (WITH THEME)
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useMessages } from "../context/MessageContext";
import ThemeSwitcher from "./ThemeSwitcher";

const Header = () => {
  const { user, logout } = useAuth();
  const { chats } = useMessages();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Calculate total unread messages
  const totalUnread = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);

  const handleLogout = async () => {
    await logout();
    setProfileMenuOpen(false);
  };

  return (
    <header className="bg-header border-b border-header sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-primary">ChatApp</h1>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:ml-10 md:flex md:space-x-8">
              <a
                href="/messages"
                className="text-theme inline-flex items-center px-1 pt-1 border-b-2 border-primary text-sm font-medium"
              >
                Messages
                {totalUnread > 0 && (
                  <span className="ml-2 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                )}
              </a>
              <a
                href="/contacts"
                className="text-theme-secondary hover:text-theme inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-theme text-sm font-medium transition-colors"
              >
                Contacts
              </a>
            </nav>
          </div>

          {/* Desktop User Menu */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {/* Theme Switcher */}
            <ThemeSwitcher />

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center space-x-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] rounded-full p-1"
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user?.fullname}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                    {user?.fullname?.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden lg:block text-theme font-medium">
                  {user?.fullname}
                </span>
                <svg
                  className={`hidden lg:block w-4 h-4 text-theme-secondary transition-transform ${
                    profileMenuOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {profileMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setProfileMenuOpen(false)}
                  ></div>

                  {/* Menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-theme rounded-lg shadow-lg py-1 z-20 border border-theme">
                    <div className="px-4 py-3 border-b border-theme">
                      <p className="text-sm font-medium text-theme">
                        {user?.fullname}
                      </p>
                      <p className="text-sm text-theme-secondary truncate">
                        {user?.email}
                      </p>
                    </div>
                    <a
                      href="/profile"
                      className="block px-4 py-2 text-sm text-theme-secondary hover:bg-sidebar-hover hover:text-theme transition-colors"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      Your Profile
                    </a>
                    <a
                      href="/settings"
                      className="block px-4 py-2 text-sm text-theme-secondary hover:bg-sidebar-hover hover:text-theme transition-colors"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      Settings
                    </a>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-[var(--color-error)] hover:bg-[var(--color-error)] hover:bg-opacity-10 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-theme-secondary hover:text-theme hover:bg-sidebar-hover focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)]"
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <svg
                  className="block h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-theme">
          <div className="pt-2 pb-3 space-y-1">
            <a
              href="/messages"
              className="bg-[var(--color-primaryLight)] border-l-4 border-primary text-primary block pl-3 pr-4 py-2 text-base font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="flex items-center justify-between">
                <span>Messages</span>
                {totalUnread > 0 && (
                  <span className="bg-primary text-white text-xs rounded-full px-2 py-1">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                )}
              </div>
            </a>
            <a
              href="/contacts"
              className="border-l-4 border-transparent text-theme-secondary hover:bg-sidebar-hover hover:border-theme hover:text-theme block pl-3 pr-4 py-2 text-base font-medium transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contacts
            </a>
          </div>

          {/* Mobile User Menu */}
          <div className="pt-4 pb-3 border-t border-theme">
            <div className="flex items-center px-4">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user?.fullname}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                  {user?.fullname?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="ml-3">
                <div className="text-base font-medium text-theme">
                  {user?.fullname}
                </div>
                <div className="text-sm text-theme-secondary">
                  {user?.email}
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <a
                href="/profile"
                className="block px-4 py-2 text-base font-medium text-theme-secondary hover:text-theme hover:bg-sidebar-hover transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Your Profile
              </a>
              <a
                href="/settings"
                className="block px-4 py-2 text-base font-medium text-theme-secondary hover:text-theme hover:bg-sidebar-hover transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Settings
              </a>
              <button
                onClick={handleLogout}
                className="w-full text-left block px-4 py-2 text-base font-medium text-[var(--color-error)] hover:bg-[var(--color-error)] hover:bg-opacity-10 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
