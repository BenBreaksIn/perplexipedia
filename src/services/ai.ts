import OpenAI from 'openai';
import { Article } from '../types/article';

interface AIServiceConfig {
  apiKey: string;
  preferredSources?: string[];
  topicsOfInterest?: string[];
}

export class AIService {
  private openai: OpenAI;

  constructor(config: AIServiceConfig) {
    this.openai = new OpenAI({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true // Note: In production, use a backend proxy
    });
  }

  private async searchSources(): Promise<string[]> {
    // TODO: Implement web search functionality
    // This would integrate with a search API (e.g., Google Custom Search, Bing Web Search)
    return [];
  }

  private async verifyFacts(content: string, sources: string[]): Promise<boolean> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a fact-checking assistant. Your task is to verify if the given content is supported by the provided sources. 
            Be extremely strict about verification. Only return true if the facts can be directly verified from the sources.
            Consider:
            1. Accuracy of claims
            2. Currency of information
            3. Reliability of sources
            4. Potential biases
            
            Return your response as a boolean (true/false) with a brief explanation.`
          },
          {
            role: "user",
            content: `Content: ${content}\nSources: ${sources.join(', ')}`
          }
        ]
      });

      const result = response.choices[0].message.content || '';
      return result.toLowerCase().includes('true');
    } catch (error) {
      console.error('Error verifying facts:', error);
      return false;
    }
  }

  private async moderateContent(content: string): Promise<{
    isAppropriate: boolean;
    reason?: string;
  }> {
    try {
      const response = await this.openai.moderations.create({
        input: content
      });

      const result = response.results[0];
      return {
        isAppropriate: !result.flagged,
        reason: result.flagged ? Object.entries(result.categories)
          .filter(([_, value]) => value)
          .map(([key]) => key)
          .join(', ') : undefined
      };
    } catch (error) {
      console.error('Error moderating content:', error);
      return { isAppropriate: false, reason: 'Error during moderation check' };
    }
  }

  async generateArticle(title: string): Promise<Partial<Article> | null> {
    try {
      // 1. Search for reliable sources
      const sources = await this.searchSources();

      // 2. Generate the article
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an expert wiki article writer. Create a comprehensive, well-structured article about the given topic.
            Follow these guidelines:
            1. Be objective and unbiased
            2. Use clear, academic language
            3. Include relevant facts and figures
            4. Structure with appropriate sections
            5. Cite sources where applicable
            
            Format the article in markdown.`
          },
          {
            role: "user",
            content: `Write an article about: ${title}\nUse these sources: ${sources.join(', ')}`
          }
        ]
      });

      const content = response.choices[0].message.content || '';
      if (!content) return null;

      // 3. Verify facts
      const isVerified = await this.verifyFacts(content, sources);
      if (!isVerified) {
        console.error('Failed to verify article facts');
        return null;
      }

      // 4. Moderate content
      const moderation = await this.moderateContent(content);
      if (!moderation.isAppropriate) {
        console.error('Content flagged during moderation:', moderation.reason);
        return null;
      }

      // 5. Generate tags and categories
      const categorization = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "Analyze the article and suggest relevant tags and categories. Return as JSON in the format: { tags: string[], categories: string[] }"
          },
          {
            role: "user",
            content
          }
        ]
      });

      const categorizationContent = categorization.choices[0].message.content || '{}';
      const { tags = [], categories = [] } = JSON.parse(categorizationContent);

      return {
        title,
        content,
        status: 'draft',
        categories: categories.map((name: string) => ({ id: crypto.randomUUID(), name })),
        tags: tags.map((name: string) => ({ id: crypto.randomUUID(), name })),
        versions: [{
          id: crypto.randomUUID(),
          content,
          author: 'AI Assistant',
          timestamp: new Date(),
          changes: 'Initial version generated by AI'
        }]
      };
    } catch (error) {
      console.error('Error generating article:', error);
      return null;
    }
  }

  async suggestEdits(content: string): Promise<{
    suggestions: string[];
    improvedContent?: string;
  }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an expert editor. Analyze the given content and:
            1. Suggest improvements for clarity, accuracy, and style
            2. Identify potential biases or unsupported claims
            3. Recommend additional sections or information
            4. Provide an improved version if necessary
            
            Return your response in JSON format:
            {
              "suggestions": string[],
              "improvedContent": string (optional)
            }`
          },
          {
            role: "user",
            content
          }
        ]
      });

      const result = response.choices[0].message.content || '{}';
      return JSON.parse(result);
    } catch (error) {
      console.error('Error suggesting edits:', error);
      return { suggestions: [] };
    }
  }

  async generateRelatedTopics(title: string): Promise<string[]> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "Generate a list of related topics that would make good wiki articles. Consider different aspects, subtopics, and connected subjects. Return as a JSON array of strings."
          },
          {
            role: "user",
            content: title
          }
        ]
      });

      const result = response.choices[0].message.content || '[]';
      return JSON.parse(result);
    } catch (error) {
      console.error('Error generating related topics:', error);
      return [];
    }
  }
} 