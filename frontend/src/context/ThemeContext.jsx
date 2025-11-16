// frontend/src/context/ThemeContext.jsx
import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext(null);

// Theme definitions (Postman-inspired)
export const THEMES = {
  light: {
    name: "Light",
    colors: {
      // Background
      bg: "#FFFFFF",
      bgSecondary: "#F7F7F7",
      bgTertiary: "#EFEFEF",

      // Text
      text: "#212121",
      textSecondary: "#6B6B6B",
      textTertiary: "#999999",

      // Primary (Blue)
      primary: "#FF6C37",
      primaryHover: "#FF5722",
      primaryLight: "#FFE8DF",

      // Borders
      border: "#E0E0E0",
      borderLight: "#F0F0F0",

      // Status
      success: "#22C55E",
      error: "#EF4444",
      warning: "#F59E0B",
      info: "#3B82F6",

      // Chat specific
      chatBg: "#FAFAFA",
      messageBubble: "#FFFFFF",
      messageBubbleOwn: "#FF6C37",
      messageBubbleOwnText: "#FFFFFF",

      // Sidebar
      sidebarBg: "#FFFFFF",
      sidebarHover: "#F5F5F5",
      sidebarActive: "#FFE8DF",

      // Header
      headerBg: "#FFFFFF",
      headerBorder: "#E0E0E0",

      // Online status
      online: "#22C55E",
      offline: "#9CA3AF",
    },
  },

  darkCyan: {
    name: "Dark Cyan",
    colors: {
      // Background
      bg: "#1B1C1E",
      bgSecondary: "#222325",
      bgTertiary: "#2A2B2D",

      // Text
      text: "#D7DDE2", // Soft cool gray
      textSecondary: "#A5AEB6",
      textTertiary: "#717A83",

      // Primary (Subtle Cyan)
      primary: "#4CA7C7", // Calm cyan
      primaryHover: "#63BBD8", // Slightly brighter hover
      primaryLight: "#1D2A31", // Cyan-tinted dark panel

      // Borders
      border: "#33373A",
      borderLight: "#2A2D2F",

      // Status (Cool-toned)
      success: "#34D399", // Soft green
      error: "#F87171", // VSCode soft red
      warning: "#FBBF24", // Muted gold
      info: "#38BDF8", // Sky blue

      // Chat specific
      chatBg: "#181A1C",
      messageBubble: "#232526",
      messageBubbleOwn: "#4CA7C7", // Cyan bubble
      messageBubbleOwnText: "#0A171C", // Deep dark teal (readable)

      // Sidebar
      sidebarBg: "#1B1C1E",
      sidebarHover: "#26282A",
      sidebarActive: "#1D2A31",

      // Header
      headerBg: "#1B1C1E",
      headerBorder: "#2C2F31",

      // Online status (Cyan-tinted green)
      online: "#4CD4A9",
      offline: "#6B7280",
    },
  },

  ayuDarkCyan: {
    name: "Ayu Dark Cyan",
    colors: {
      // Background (Dark neutrals)
      bg: "#0A0E14",
      bgSecondary: "#0D1016",
      bgTertiary: "#131721",

      // Text (Cool grays to fit cyan)
      text: "#B5C2CD",
      textSecondary: "#8C99A5",
      textTertiary: "#5E6B75",

      // Primary (Cyan/Aqua)
      primary: "#4DD0E1", // Main Cyan
      primaryHover: "#6DE7F3", // Brightened Cyan
      primaryLight: "#112529", // Cyan-tinted dark

      // Borders
      border: "#1A222D",
      borderLight: "#131721",

      // Status & accents (cyan scheme)
      success: "#7BE0C3", // Minty success
      error: "#EF6F79", // Slightly cool red
      warning: "#FFD27F",
      info: "#4FC3F7", // Soft sky blue

      // Chat specific
      chatBg: "#0B0F16",
      messageBubble: "#111821", // Dark bubble for received
      messageBubbleOwn: "#4DD0E1", // Cyan bubble
      messageBubbleOwnText: "#06282E",

      // Sidebar
      sidebarBg: "#0A0E14",
      sidebarHover: "#0F151D",
      sidebarActive: "#112529",

      // Header
      headerBg: "#0A0E14",
      headerBorder: "#1A222D",

      // Online status
      online: "#4DD0E1",
      offline: "#42505A",
    },
  },
};

// ✅ Helper function to apply theme CSS variables
const applyTheme = (themeName) => {
  const theme = THEMES[themeName];
  if (!theme) return;

  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });
};

// ✅ Get initial theme synchronously (before render)
const getInitialTheme = () => {
  const savedTheme = localStorage.getItem("chatapp-theme");
  if (savedTheme && THEMES[savedTheme]) {
    return savedTheme;
  }
  return "light";
};

export const ThemeProvider = ({ children }) => {
  // ✅ Load theme synchronously in useState initializer
  const [currentTheme, setCurrentTheme] = useState(() => {
    const theme = getInitialTheme();
    // Apply theme immediately before first render
    applyTheme(theme);
    return theme;
  });

  // ✅ Apply theme whenever it changes
  useEffect(() => {
    applyTheme(currentTheme);
    localStorage.setItem("chatapp-theme", currentTheme);
  }, [currentTheme]);

  const setTheme = (themeName) => {
    if (THEMES[themeName]) {
      setCurrentTheme(themeName);
    }
  };

  const value = {
    theme: currentTheme,
    themeColors: THEMES[currentTheme].colors,
    setTheme,
    availableThemes: Object.keys(THEMES).map((key) => ({
      id: key,
      name: THEMES[key].name,
    })),
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
