import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppearance } from '../../contexts/AppearanceContext';
import { db } from '../../config/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

type NotificationSetting = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
};

const defaultNotificationSettings: NotificationSetting[] = [
  {
    id: 'article_updates',
    label: 'Article Updates',
    description: 'Receive notifications when articles you follow are updated',
    enabled: true
  },
  {
    id: 'comments',
    label: 'Comments',
    description: 'Receive notifications when someone comments on your contributions',
    enabled: true
  },
  {
    id: 'contribution_status',
    label: 'Contribution Status',
    description: 'Receive notifications about the status of your contributions',
    enabled: true
  }
];

type UserSettings = {
  notificationSettings: NotificationSetting[];
  emailNotifications: boolean;
};

export const DashboardSettings: React.FC = () => {
  const { currentUser } = useAuth();
  const { fontSize, setFontSize, colorMode, setColorMode, isMenuOpen, setIsMenuOpen } = useAppearance();
  const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>(defaultNotificationSettings);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentUser) return;

    const userSettingsRef = doc(db, 'user_settings', currentUser.uid);
    
    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(userSettingsRef, 
      (doc) => {
        if (doc.exists()) {
          const data = doc.data() as UserSettings;
          setNotificationSettings(data.notificationSettings || defaultNotificationSettings);
          setEmailNotifications(data.emailNotifications ?? true);
        } else {
          // Initialize settings if they don't exist
          setDoc(userSettingsRef, {
            notificationSettings: defaultNotificationSettings,
            emailNotifications: true
          });
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching settings:', err);
        setError('Failed to load settings');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const handleNotificationToggle = async (settingId: string) => {
    if (!currentUser) return;

    const updatedSettings = notificationSettings.map(setting =>
      setting.id === settingId
        ? { ...setting, enabled: !setting.enabled }
        : setting
    );
    setNotificationSettings(updatedSettings);

    try {
      const userSettingsRef = doc(db, 'user_settings', currentUser.uid);
      await setDoc(userSettingsRef, {
        notificationSettings: updatedSettings,
        emailNotifications
      }, { merge: true });
    } catch (err) {
      console.error('Error updating notification setting:', err);
      // Revert the change if save fails
      setNotificationSettings(notificationSettings);
    }
  };

  const handleSaveSettings = async () => {
    if (!currentUser) return;

    setSaving(true);
    try {
      const userSettingsRef = doc(db, 'user_settings', currentUser.uid);
      await setDoc(userSettingsRef, {
        notificationSettings,
        emailNotifications
      }, { merge: true });
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="border-b border-wiki-border pb-4">
          <h2 className="text-2xl font-linux-libertine section-title">Settings</h2>
          <p className="text-gray-600 dark:text-gray-400">Loading your settings...</p>
        </div>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-perplexity-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="border-b border-wiki-border pb-4">
          <h2 className="text-2xl font-linux-libertine section-title">Settings</h2>
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-wiki-border pb-4">
        <h2 className="text-2xl font-linux-libertine section-title">Settings</h2>
        <p className="text-gray-600 dark:text-gray-400">Manage your account preferences and notifications</p>
      </div>

      {/* Account Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Account Settings</h3>
        <div className="wiki-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Email Notifications</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Receive important updates via email
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={emailNotifications}
                onChange={() => setEmailNotifications(!emailNotifications)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-perplexity-primary/20 dark:peer-focus:ring-perplexity-primary/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-perplexity-primary"></div>
            </label>
          </div>

          {/* Font Size */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Font Size</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Adjust the text size for better readability
              </p>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={() => setFontSize('small')}
                className={`px-3 py-1 rounded-md text-sm transition-colors duration-200 ${
                  fontSize === 'small' 
                    ? 'bg-perplexity-primary text-white' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                Small
              </button>
              <button 
                onClick={() => setFontSize('standard')}
                className={`px-3 py-1 rounded-md text-sm transition-colors duration-200 ${
                  fontSize === 'standard' 
                    ? 'bg-perplexity-primary text-white' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                Standard
              </button>
              <button 
                onClick={() => setFontSize('large')}
                className={`px-3 py-1 rounded-md text-sm transition-colors duration-200 ${
                  fontSize === 'large' 
                    ? 'bg-perplexity-primary text-white' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                Large
              </button>
            </div>
          </div>

          {/* Color Mode */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Color Mode</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Choose between light and dark theme
              </p>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={() => setColorMode('light')}
                className={`px-3 py-1 rounded-md text-sm transition-colors duration-200 ${
                  colorMode === 'light' 
                    ? 'bg-perplexity-primary text-white' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                Light
              </button>
              <button 
                onClick={() => setColorMode('dark')}
                className={`px-3 py-1 rounded-md text-sm transition-colors duration-200 ${
                  colorMode === 'dark' 
                    ? 'bg-perplexity-primary text-white' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                Dark
              </button>
            </div>
          </div>

          {/* Menu Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Sidebar Menu</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Toggle the sidebar menu visibility
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={isMenuOpen}
                onChange={() => setIsMenuOpen(!isMenuOpen)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-perplexity-primary/20 dark:peer-focus:ring-perplexity-primary/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-perplexity-primary"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Notification Settings</h3>
        <div className="space-y-4">
          {notificationSettings.map((setting) => (
            <div key={setting.id} className="wiki-card flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium">{setting.label}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {setting.description}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={setting.enabled}
                  onChange={() => handleNotificationToggle(setting.id)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-perplexity-primary/20 dark:peer-focus:ring-perplexity-primary/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-perplexity-primary"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className={`btn-primary ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}; 