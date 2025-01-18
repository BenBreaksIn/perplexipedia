import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { AIService } from '../services/ai';
import { Article } from '../types/article';
import { decryptApiKey } from '../utils/encryption';

export interface UseAIResult {
  generateArticle: (title: string) => Promise<Partial<Article> | null>;
  generateArticles: (topic: string, count: number) => Promise<Array<Partial<Article>>>;
  suggestEdits: (content: string) => Promise<{ suggestions: string[]; improvedContent?: string }>;
  generateCategories: (content: string) => Promise<Array<{ id: string; name: string }>>;
  isLoading: boolean;
  error: string | null;
}

export const useAI = (): UseAIResult => {
  const { currentUser } = useAuth();
  const [aiService, setAIService] = useState<AIService | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAISettings = async () => {
      if (!currentUser) {
        setError('User must be logged in to use AI features');
        return;
      }

      try {
        const docRef = doc(db, 'user_settings', currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const settings = docSnap.data();
          if (settings.openaiKey) {
            const decryptedKey = decryptApiKey(settings.openaiKey);
            if (!decryptedKey) {
              setError('Failed to decrypt API key');
              return;
            }
            
            setAIService(new AIService({
              apiKey: decryptedKey
            }));
            setError(null);
          } else {
            setError('OpenAI API key not found in settings');
          }
        } else {
          setError('AI settings not found');
        }
      } catch (error) {
        console.error('Error loading AI settings:', error);
        setError('Failed to load AI settings');
      }
    };

    loadAISettings();
  }, [currentUser]);

  const generateArticle = async (title: string): Promise<Partial<Article> | null> => {
    if (!aiService) {
      setError('AI service not initialized');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);
      return await aiService.generateArticle(title);
    } catch (error) {
      console.error('Error generating article:', error);
      setError('Failed to generate article');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const generateCategories = async (content: string): Promise<Array<{ id: string; name: string }>> => {
    if (!aiService) {
      setError('AI service not initialized');
      return [];
    }

    try {
      setIsLoading(true);
      setError(null);
      return await aiService.generateCategories(content);
    } catch (error) {
      console.error('Error generating categories:', error);
      setError('Failed to generate categories');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const suggestEdits = async (content: string): Promise<{ suggestions: string[]; improvedContent?: string }> => {
    if (!aiService) {
      setError('AI service not initialized');
      return { suggestions: [] };
    }

    try {
      setIsLoading(true);
      setError(null);
      return await aiService.suggestEdits(content);
    } catch (error) {
      console.error('Error suggesting edits:', error);
      setError('Failed to suggest edits');
      return { suggestions: [] };
    } finally {
      setIsLoading(false);
    }
  };

  const generateArticles = async (topic: string, count: number): Promise<Array<Partial<Article>>> => {
    if (!aiService) {
      setError('AI service not initialized');
      return [];
    }

    try {
      setIsLoading(true);
      setError(null);
      return await aiService.generateArticles(topic, count);
    } catch (error) {
      console.error('Error generating articles:', error);
      setError('Failed to generate articles');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generateArticle,
    generateArticles,
    suggestEdits,
    generateCategories,
    isLoading,
    error
  };
}; 