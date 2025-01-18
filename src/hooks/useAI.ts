import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { OpenAIService, PerplexityAIService, IAIService, AIProvider } from '../services/ai';
import { Article } from '../types/article';
import { decryptApiKey } from '../utils/encryption';

export interface UseAIResult {
  generateArticle: (title: string) => Promise<Partial<Article> | null>;
  generateArticles: (
    topic: string, 
    count: number,
    existingArticles?: Article[],
    minWordCount?: number,
    maxWordCount?: number
  ) => Promise<Array<Partial<Article>>>;
  suggestEdits: (content: string) => Promise<{ suggestions: string[]; improvedContent?: string }>;
  generateCategories: (content: string) => Promise<Array<{ id: string; name: string }>>;
  isLoading: boolean;
  error: string | null;
  provider: AIProvider;
}

export const useAI = (): UseAIResult => {
  const { currentUser } = useAuth();
  const [aiService, setAIService] = useState<IAIService | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<AIProvider>('openai');

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
          const selectedProvider = settings.provider || 'openai';
          setProvider(selectedProvider);

          let apiKey: string | undefined;
          if (selectedProvider === 'openai') {
            apiKey = settings.openaiKey ? decryptApiKey(settings.openaiKey) : undefined;
          } else {
            apiKey = settings.perplexityKey ? decryptApiKey(settings.perplexityKey) : undefined;
          }

          if (!apiKey) {
            setError(`${selectedProvider === 'openai' ? 'OpenAI' : 'Perplexity'} API key not found in settings`);
            return;
          }

          const ServiceClass = selectedProvider === 'openai' ? OpenAIService : PerplexityAIService;
          setAIService(new ServiceClass({
            provider: selectedProvider,
            apiKey
          }));
          setError(null);
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

  const generateArticles = async (
    topic: string, 
    count: number,
    existingArticles?: Article[],
    minWordCount?: number,
    maxWordCount?: number
  ): Promise<Array<Partial<Article>>> => {
    if (!aiService) {
      setError('AI service not initialized');
      return [];
    }

    try {
      setIsLoading(true);
      setError(null);
      return await aiService.generateArticles(topic, count, existingArticles, minWordCount, maxWordCount);
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
    error,
    provider
  };
}; 