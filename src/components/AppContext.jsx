import { createContext, useContext } from 'react';

// Create Contexts
export const ThemeContext = createContext(null);
export const LanguageContext = createContext(null);

// Create Custom Hooks
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === null) {
        console.warn("useTheme must be used within a ThemeProvider. Defaulting to light mode.");
        return { isDarkMode: false, toggleTheme: () => {} };
    }
    return context;
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === null) {
        console.warn("useLanguage must be used within a LanguageProvider. Defaulting to English.");
        return { language: 'en', setLanguage: () => {}, t: translations.en };
    }
    return context;
};

// Translations
export const translations = {
  it: {
    home: "Home",
    events: "Eventi", 
    articles: "Articoli",
    news: "News",
    documentation: "Documentazione",
    about: "Chi Siamo",
    opensource: "Progetto Open Source",
    changeTheme: "Cambia Tema",
    changeLanguage: "Cambia Lingua"
  },
  en: {
    home: "Home",
    events: "Events",
    articles: "Articles", 
    news: "News",
    documentation: "Documentation",
    about: "About",
    opensource: "Open Source Project",
    changeTheme: "Change Theme",
    changeLanguage: "Change Language"
  }
};