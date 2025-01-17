import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { encryptApiKey, decryptApiKey } from '../../utils/encryption';

interface AISettings {
  openaiKey?: string;
}

const defaultSettings: AISettings = {};

export const DashboardAISettings = () => {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState<AISettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [displayKey, setDisplayKey] = useState('');

  useEffect(() => {
    loadSettings();
  }, [currentUser]);

  const loadSettings = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    try {
      const docRef = doc(db, 'user_settings', currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const decryptedKey = data.openaiKey ? decryptApiKey(data.openaiKey) : '';
        setSettings({
          ...defaultSettings,
          openaiKey: data.openaiKey
        });
        setDisplayKey(decryptedKey);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!currentUser) return;
    try {
      setError('');
      setSuccess('');

      // Validate API key format
      if (displayKey && !displayKey.startsWith('sk-')) {
        setError('Invalid API key format. OpenAI API keys should start with "sk-"');
        return;
      }

      // Encrypt the API key before saving
      const encryptedKey = displayKey ? encryptApiKey(displayKey) : '';

      await setDoc(doc(db, 'user_settings', currentUser.uid), {
        ...settings,
        openaiKey: encryptedKey
      }, { merge: true }); // Use merge to preserve other settings
      
      setSuccess('AI settings saved successfully');
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="border-b border-wiki-border pb-4">
          <h2 className="text-2xl font-linux-libertine section-title">AI Settings</h2>
          <p className="text-gray-600 dark:text-gray-400">Loading your AI settings...</p>
        </div>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-perplexity-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-wiki-border pb-4">
        <h2 className="text-2xl font-linux-libertine section-title">AI Settings</h2>
        <p className="text-gray-600 dark:text-gray-400">Configure your OpenAI API key for AI-assisted features</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-3 rounded-lg">
          {success}
        </div>
      )}

      <div className="wiki-card space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">OpenAI API Key</label>
          <input
            type="password"
            value={displayKey}
            onChange={(e) => setDisplayKey(e.target.value)}
            placeholder="sk-..."
            className="search-input w-full"
          />
          <p className="text-sm text-gray-500 mt-1">
            Your API key is encrypted and stored securely. You can get one from OpenAI's website.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          className="btn-primary"
        >
          Save AI Settings
        </button>
      </div>
    </div>
  );
}; 