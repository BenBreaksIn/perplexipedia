import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../config/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

type AppearanceSettings = {
  fontSize: string;
  colorMode: string;
  isMenuOpen: boolean;
};

type AppearanceContextType = {
  fontSize: string;
  setFontSize: (size: string) => void;
  colorMode: string;
  setColorMode: (mode: string) => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (isOpen: boolean) => void;
};

const defaultSettings: AppearanceSettings = {
  fontSize: 'standard',
  colorMode: 'light',
  isMenuOpen: true,
};

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

export const useAppearance = () => {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error('useAppearance must be used within an AppearanceProvider');
  }
  return context;
};

export const AppearanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [fontSize, setFontSize] = useState(defaultSettings.fontSize);
  const [colorMode, setColorMode] = useState(defaultSettings.colorMode);
  const [isMenuOpen, setIsMenuOpen] = useState(defaultSettings.isMenuOpen);

  useEffect(() => {
    if (!currentUser) {
      // If no user, load from localStorage
      const savedSettings = localStorage.getItem('appearanceSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setFontSize(settings.fontSize);
        setColorMode(settings.colorMode);
        setIsMenuOpen(settings.isMenuOpen);
      }
      return;
    }

    const userSettingsRef = doc(db, 'user_settings', currentUser.uid);
    
    const unsubscribe = onSnapshot(userSettingsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.appearanceSettings) {
          setFontSize(data.appearanceSettings.fontSize);
          setColorMode(data.appearanceSettings.colorMode);
          setIsMenuOpen(data.appearanceSettings.isMenuOpen);
        }
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Save settings to Firebase/localStorage when they change
  useEffect(() => {
    const settings = {
      fontSize,
      colorMode,
      isMenuOpen,
    };

    if (currentUser) {
      const userSettingsRef = doc(db, 'user_settings', currentUser.uid);
      setDoc(userSettingsRef, { appearanceSettings: settings }, { merge: true });
    } else {
      localStorage.setItem('appearanceSettings', JSON.stringify(settings));
    }

    // Apply color mode to document
    document.documentElement.removeAttribute('data-theme');
    if (colorMode === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [fontSize, colorMode, isMenuOpen, currentUser]);

  return (
    <AppearanceContext.Provider
      value={{
        fontSize,
        setFontSize,
        colorMode,
        setColorMode,
        isMenuOpen,
        setIsMenuOpen,
      }}
    >
      {children}
    </AppearanceContext.Provider>
  );
}; 