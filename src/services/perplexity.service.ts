import { Article } from '../types/article';
import { getAuth } from 'firebase/auth';
import { AIServiceConfig, IAIService } from './ai';
import { formatPerplexityResponse } from './responseFormatter';

export class PerplexityAIService implements IAIService {
  private apiKey: string;
  private baseUrl = 'https://api.perplexity.ai';
  private model = 'llama-3.1-sonar-large-128k-online';

  constructor(config: AIServiceConfig) {
    this.apiKey = config.apiKey;
  }

  private async makeRequest(messages: any[], temperature: number = 0.2) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature,
        top_p: 0.9,
        frequency_penalty: 1,
        presence_penalty: 0,
        search_recency_filter: 'month',
        return_images: false,
        return_related_questions: false,
        stream: false
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Perplexity API Response:', result); // Debug log

    // Format citations from URLs to proper format
    const citations = (result.citations || []).map((url: string, index: number) => ({
      id: index + 1,
      url: url,
      title: `Reference ${index + 1}`
    }));

    return {
      content: result.choices[0].message.content,
      citations
    };
  }

  async generateArticle(
    topic: string,
    existingArticles: Article[] = [],
    minWordCount: number = 500,
    maxWordCount: number = 2000
  ): Promise<Partial<Article> | null> {
    try {
      // Check for duplicate titles
      const normalizedTopic = topic.trim().toLowerCase();
      const isDuplicate = existingArticles.some(article => 
        article.title.trim().toLowerCase() === normalizedTopic
      );

      if (isDuplicate) {
        console.error('Duplicate article title detected:', topic);
        return null;
      }

      const response = await this.makeRequest(
        [
          {
            role: "system",
            content: `You are an expert encyclopedia article writer.
            Create a comprehensive, well-structured article about the given topic.
            
            Content Format Requirements:
            1. Start with a concise introduction (no heading)
            2. Use markdown for formatting:
               - Use ## for main section headings
               - Use ### for subsection headings
               - Use regular text for content
               - Use [1], [2], etc. for inline citations
               - Use "- " for bullet points (with a single space after the dash)
               - NO bold text or excessive formatting
            3. Structure:
               - Introduction (no heading)
               - Main sections with ## heading
               - Subsections with ### heading if needed
               - Lists should be properly formatted with single space after bullet
               - DO NOT include a References section (it will be added automatically)
            4. Word count: ${minWordCount}-${maxWordCount} words
            5. Style:
               - Academic and neutral tone
               - Clear and concise language
               - Use inline citations [1], [2], etc. frequently to support claims
               - No excessive formatting or special characters
               - Use proper spacing between sections (one blank line)
               - Ensure lists are properly aligned with single space after bullet
            6. Citations:
               - Use square brackets for citations: [1], [2], etc.
               - Citations should be placed after relevant statements
               - Multiple citations can be used together [1][2]
               - DO NOT create your own references section`
          },
          {
            role: "user",
            content: `Write an article about: ${topic}`
          }
        ]
      );

      // Format the response
      const formattedResponse = formatPerplexityResponse(response.content, response.citations);
      if (!formattedResponse) {
        console.error('Failed to format response:', response);
        return null;
      }

      // Get the current user's ID from auth
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User must be logged in to generate articles');
      }

      return {
        title: formattedResponse.title,
        content: formattedResponse.content,
        status: 'draft',
        author: currentUser.displayName || currentUser.email || 'Anonymous',
        createdAt: new Date(),
        updatedAt: new Date(),
        currentVersion: crypto.randomUUID(),
        versions: [{
          id: crypto.randomUUID(),
          content: formattedResponse.content,
          author: currentUser.displayName || currentUser.email || 'Anonymous',
          timestamp: new Date(),
          changes: 'Initial version generated by AI'
        }],
        isAIGenerated: true,
        categoriesLockedByAI: true,
        citations: response.citations
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
      const response = await this.makeRequest(
        [
          {
            role: "system",
            content: `You are an expert editor. Review the content and suggest improvements.
            Focus on:
            1. Grammar and spelling
            2. Clarity and readability
            3. Structure and flow
            4. Technical accuracy`
          },
          {
            role: "user",
            content
          }
        ]
      );

      // Parse suggestions from the response
      const lines: string[] = response.content.split('\n');
      const suggestions: string[] = lines
        .filter((line: string) => line.trim().startsWith('-'))
        .map((line: string) => line.replace(/^-\s*/, ''));

      return {
        suggestions,
        improvedContent: response.content.includes('Improved content:') ? 
          response.content.split('Improved content:')[1].trim() : undefined
      };
    } catch (error) {
      console.error('Error suggesting edits:', error);
      return { suggestions: [] };
    }
  }

  async generateCategories(content: string): Promise<Array<{ id: string; name: string }>> {
    try {
      const response = await this.makeRequest(
        [
          {
            role: "system",
            content: `You are a content categorization expert. Analyze the content and suggest relevant categories.
            Return a list of categories, one per line, starting with a hyphen (-).
            Categories should be:
            1. Specific but not too narrow
            2. Hierarchical where appropriate
            3. Consistent with academic/professional standards`
          },
          {
            role: "user",
            content
          }
        ]
      );

      const categories = response.content
        .split('\n')
        .filter((line: string) => line.trim().startsWith('-'))
        .map((line: string) => line.replace(/^-\s*/, '').trim())
        .map((name: string) => ({
          id: crypto.randomUUID(),
          name
        }));

      return categories;
    } catch (error) {
      console.error('Error generating categories:', error);
      return [];
    }
  }

  async generateArticles(
    topic: string,
    count: number,
    existingArticles: Article[] = [],
    minWordCount: number = 500,
    maxWordCount: number = 2000
  ): Promise<Array<Partial<Article>>> {
    const articles: Array<Partial<Article>> = [];
    
    for (let i = 0; i < count; i++) {
      try {
        const article = await this.generateArticle(topic, existingArticles, minWordCount, maxWordCount);
        if (article) {
          articles.push(article);
        }
      } catch (error) {
        console.error(`Error generating article ${i + 1}/${count}:`, error);
        continue;
      }
    }
    
    return articles;
  }
} 