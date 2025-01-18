import { OpenAIService } from './openai.service';
import { PerplexityAIService } from './perplexity.service';
import { Article } from '../types/article';

export type AIProvider = 'openai' | 'perplexity';

export interface AIServiceConfig {
  provider: AIProvider;
  apiKey: string;
  preferredSources?: string[];
  topicsOfInterest?: string[];
}

export interface IAIService {
  generateArticle(topic: string, existingArticles?: Article[], minWordCount?: number, maxWordCount?: number): Promise<Partial<Article> | null>;
  suggestEdits(content: string): Promise<{ suggestions: string[]; improvedContent?: string }>;
  generateCategories(content: string): Promise<Array<{ id: string; name: string }>>;
  generateArticles(topic: string, count: number, existingArticles?: Article[], minWordCount?: number, maxWordCount?: number): Promise<Array<Partial<Article>>>;
}

export { OpenAIService, PerplexityAIService }; 