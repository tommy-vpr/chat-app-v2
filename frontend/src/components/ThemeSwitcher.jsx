// frontend/src/components/ThemeSwitcher.jsx
import { useState, useRef, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";

// React Icons
import { PiGearSix } from "react-icons/pi";
import { FaCheck } from "react-icons/fa";

const ThemeSwitcher = () => {
  const { theme, setTheme, availableThemes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleThemeChange = (themeName) => {
    setTheme(themeName);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Theme Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-sidebar hover:bg-sidebar-hover transition-colors"
        aria-label="Change theme"
      >
        <PiGearSix className="w-5 h-5 text-theme-secondary" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-theme-secondary border border-theme rounded-lg shadow-lg overflow-hidden z-50">
          <div className="py-1">
            {availableThemes.map((themeOption) => (
              <button
                key={themeOption.id}
                onClick={() => handleThemeChange(themeOption.id)}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  theme === themeOption.id
                    ? "bg-sidebar-active text-primary font-medium"
                    : "text-theme hover:bg-sidebar-hover"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{themeOption.name}</span>

                  {theme === themeOption.id && (
                    <FaCheck className="w-4 h-4 text-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSwitcher;
