import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AIService } from '../services/ai';
import { decryptApiKey } from '../utils/encryption';

interface UseAIResult {
  aiService: AIService | null;
  isLoading: boolean;
  error: string | null;
}

export const useAI = (): UseAIResult => {
  const { currentUser } = useAuth();
  const [aiService, setAIService] = useState<AIService | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeAI = async () => {
      if (!currentUser) {
        setAIService(null);
        setIsLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'user_settings', currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          setError('AI settings not found. Please configure your API key in settings.');
          setIsLoading(false);
          return;
        }

        const settings = docSnap.data();
        if (!settings.openaiKey) {
          setError('OpenAI API key not found. Please add your API key in settings.');
          setIsLoading(false);
          return;
        }

        // Decrypt the API key
        const decryptedKey = decryptApiKey(settings.openaiKey);
        if (!decryptedKey) {
          setError('Failed to decrypt API key. Please try re-entering your API key in settings.');
          setIsLoading(false);
          return;
        }

        const service = new AIService({
          apiKey: decryptedKey
        });

        setAIService(service);
        setError(null);
      } catch (err) {
        console.error('Error initializing AI service:', err);
        setError('Failed to initialize AI service');
        setAIService(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAI();
  }, [currentUser]);

  return { aiService, isLoading, error };
}; 