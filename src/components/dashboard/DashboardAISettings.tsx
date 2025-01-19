import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { encryptApiKey, decryptApiKey } from '../../utils/encryption';
import { AIProvider } from '../../services/ai';

interface AISettings {
  provider: AIProvider;
  openaiKey?: string;
  perplexityKey?: string;
}

const defaultSettings: AISettings = {
  provider: 'openai'
};

export const DashboardAISettings = () => {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState<AISettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [perplexityKey, setPerplexityKey] = useState('');

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
        const decryptedOpenAIKey = data.openaiKey ? decryptApiKey(data.openaiKey) : '';
        const decryptedPerplexityKey = data.perplexityKey ? decryptApiKey(data.perplexityKey) : '';
        setSettings({
          provider: data.provider || defaultSettings.provider,
          openaiKey: data.openaiKey,
          perplexityKey: data.perplexityKey
        });
        setOpenaiKey(decryptedOpenAIKey);
        setPerplexityKey(decryptedPerplexityKey);
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

      // Validate API keys based on selected provider
      if (settings.provider === 'openai' && openaiKey && !openaiKey.startsWith('sk-')) {
        setError('Invalid OpenAI API key format. OpenAI API keys should start with "sk-"');
        return;
      }

      if (settings.provider === 'perplexity' && perplexityKey && !perplexityKey.startsWith('pplx-')) {
        setError('Invalid Perplexity API key format. Perplexity API keys should start with "pplx-"');
        return;
      }

      // Encrypt the API keys before saving
      const encryptedOpenAIKey = openaiKey ? encryptApiKey(openaiKey) : '';
      const encryptedPerplexityKey = perplexityKey ? encryptApiKey(perplexityKey) : '';

      await setDoc(doc(db, 'user_settings', currentUser.uid), {
        provider: settings.provider,
        openaiKey: encryptedOpenAIKey,
        perplexityKey: encryptedPerplexityKey
      }, { merge: true });
      
      setSuccess('AI settings saved successfully');
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="border-b border-perplexipedia-border pb-4">
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
      <div className="border-b border-perplexipedia-border pb-4">
        <h2 className="text-2xl font-linux-libertine section-title">AI Settings</h2>
        <p className="text-gray-600 dark:text-gray-400">Configure your AI provider and API keys for AI-assisted features</p>
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

      <div className="perplexipedia-card space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">AI Provider</label>
          <select
            value={settings.provider}
            onChange={(e) => setSettings({ ...settings, provider: e.target.value as AIProvider })}
            className="search-input w-full"
          >
            <option value="openai">OpenAI</option>
            <option value="perplexity">Perplexity AI</option>
          </select>
        </div>

        {settings.provider === 'openai' && (
          <div>
            <label className="block text-sm font-medium mb-1">OpenAI API Key</label>
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              className="search-input w-full"
            />
            <p className="text-sm text-gray-500 mt-1">
              Your API key is encrypted and stored securely. You can get one from OpenAI's website.
            </p>
          </div>
        )}

        {settings.provider === 'perplexity' && (
          <div>
            <label className="block text-sm font-medium mb-1">Perplexity AI API Key</label>
            <input
              type="password"
              value={perplexityKey}
              onChange={(e) => setPerplexityKey(e.target.value)}
              placeholder="pplx-..."
              className="search-input w-full"
            />
            <p className="text-sm text-gray-500 mt-1">
              Your API key is encrypted and stored securely. You can get one from Perplexity AI's website.
            </p>
          </div>
        )}
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