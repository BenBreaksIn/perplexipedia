import { Article } from '../types/article';
import { getAuth } from 'firebase/auth';
import { AIServiceConfig, IAIService } from './ai';
import { formatPerplexityResponse } from './responseFormatter';

interface OpenverseImage {
  id: string;
  title: string;
  url: string;
  creator: string;
  creator_url: string;
  license: string;
  license_version: string;
  license_url: string;
  attribution: string;
}

interface OpenverseAuthResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export class PerplexityAIService implements IAIService {
  private apiKey: string;
  private baseUrl = 'https://api.perplexity.ai';
  private model = 'llama-3.1-sonar-large-128k-online';
  private openverseToken: string | null = null;
  private openverseTokenExpiry: number | null = null;

  constructor(config: AIServiceConfig) {
    this.apiKey = config.apiKey;
  }

  private async getOpenverseToken(): Promise<string> {
    // Check if we have a valid token
    if (this.openverseToken && this.openverseTokenExpiry && Date.now() < this.openverseTokenExpiry) {
      return this.openverseToken;
    }

    const clientId = import.meta.env.VITE_OPENVERSE_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_OPENVERSE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Openverse credentials not found in environment variables');
    }

    const response = await fetch('https://api.openverse.org/v1/auth_tokens/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get Openverse token: ${response.statusText}`);
    }

    const data: OpenverseAuthResponse = await response.json();
    this.openverseToken = data.access_token;
    this.openverseTokenExpiry = Date.now() + (data.expires_in * 1000);

    return this.openverseToken;
  }

  private async fetchOpenverseImages(query: string, maxImages: number = 5): Promise<OpenverseImage[]> {
    try {
      const token = await this.getOpenverseToken();
      
      // Clean up the query to extract just the topic
      const cleanQuery = query.replace(/Generate \d+ articles? about /i, '')
                             .replace(/with length between \d+ and \d+ words each/i, '')
                             .trim();
      
      // Keep only essential search parameters
      const searchParams = new URLSearchParams({
        q: cleanQuery,
        page_size: maxImages.toString(),
        mature: 'false'
      });
      
      const url = `https://api.openverse.org/v1/images/?${searchParams.toString()}`;
      console.log('Fetching images for topic:', cleanQuery);
      console.log('Openverse API URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Openverse API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Failed to fetch images: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Openverse API response:', data);

      if (!data.results || !Array.isArray(data.results)) {
        console.error('Invalid response format from Openverse API:', data);
        return [];
      }

      return data.results.map((img: any) => ({
        id: img.id,
        title: img.title || 'Untitled Image',
        url: img.url,
        creator: img.creator || 'Unknown Creator',
        creator_url: img.creator_url || '',
        license: img.license || '',
        license_version: img.license_version || '',
        license_url: img.license_url || '',
        attribution: img.attribution || `Image by ${img.creator || 'Unknown Creator'}`
      }));
    } catch (error) {
      console.error('Error fetching Openverse images:', error);
      return [];
    }
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

      // First, get key facts about the topic
      const infoboxResponse = await this.makeRequest(
        [
          {
            role: "system",
            content: `You are a factual information extractor. Extract and provide only the most essential facts about the topic.
            
            Required format:
            Type: [The main category or classification]
            Origin: [When/where it originated]
            Process: [Main method or technique]
            Key Fact 1: [Important fact about the topic]
            Key Fact 2: [Another important fact]
            Key Fact 3: [Another important fact]

            Rules:
            1. Always include Type, Origin, and Process if applicable
            2. Add 2-3 additional key facts specific to the topic
            3. Keep values concise but informative
            4. Use simple labels without special characters
            5. Every value must be a real fact, not a placeholder
            6. Do not use markdown or formatting

            Example for "Coffee":
            Type: Beverage
            Origin: Ethiopia, 9th century
            Process: Bean roasting and brewing
            Caffeine Content: 80-100mg per cup
            Plant Family: Rubiaceae
            Global Production: Over 9 million tons annually`
          },
          {
            role: "user",
            content: `Extract key facts about: ${topic}`
          }
        ],
        0.1 // Lower temperature for more factual responses
      );

      console.log('Infobox Response:', infoboxResponse.content); // Debug log

      // Parse the key facts
      const keyFacts: Record<string, string> = {};
      const factLines = infoboxResponse.content
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => {
          if (!line.includes(':')) return false;
          const [key, ...valueParts] = line.split(':');
          const value = valueParts.join(':').trim();
          // Less restrictive filtering - only exclude empty values and obvious placeholders
          return value && 
                 !value.includes('[') && 
                 !value.includes(']') &&
                 value !== '' &&
                 key.trim() !== '';
        });

      console.log('Filtered fact lines:', factLines); // Debug log

      factLines.forEach((line: string) => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length) {
          // Clean up the key - remove markdown, numbers, and standardize
          const cleanKey = key
            .replace(/^#{1,3}\s+/, '')     // Remove markdown headers (1-3 #)
            .replace(/^[-*]\s+/, '')        // Remove bullet points
            .replace(/\d+$/, '')            // Remove trailing numbers
            .replace(/Key Fact\s*\d*/, '')  // Remove "Key Fact N" format
            .replace(/###/, '')             // Remove any remaining ###
            .trim();
          
          // Clean up the value - remove markdown and extra spaces
          const cleanValue = valueParts.join(':')
            .replace(/^#{1,3}\s+/, '')     // Remove markdown headers
            .replace(/^[-*]\s+/, '')        // Remove bullet points
            .replace(/###/, '')             // Remove any remaining ###
            .replace(/\*\*/g, '')           // Remove bold markdown
            .replace(/\*/g, '')             // Remove any remaining asterisks
            .trim();

          // Only add if we have clean, non-empty values and key doesn't start with ###
          if (cleanKey && 
              cleanValue && 
              !cleanKey.toLowerCase().includes('key fact') && 
              !cleanKey.includes('#')) {
            keyFacts[cleanKey] = cleanValue;
          }
        }
      });

      // Sort the facts to ensure consistent order
      const orderedFacts: Record<string, string> = {};
      // Add standard fields first if they exist
      ['Type', 'Origin', 'Process'].forEach(key => {
        if (keyFacts[key]) {
          orderedFacts[key] = keyFacts[key];
          delete keyFacts[key];
        }
      });
      // Add remaining facts
      Object.keys(keyFacts).sort().forEach(key => {
        orderedFacts[key] = keyFacts[key];
      });

      console.log('Parsed key facts:', orderedFacts); // Debug log

      // Then generate the main article
      const articleResponse = await this.makeRequest(
        [
          {
            role: "system",
            content: `You are an expert encyclopedia article writer, following Wikipedia's style and conventions.
            Create a comprehensive, well-structured encyclopedia article about the given topic.
            
            Title Requirements:
            1. Use Wikipedia-style titles:
               - Should be a noun or noun phrase
               - Capitalize only the first letter and proper nouns
               - Be concise and descriptive
               - Avoid "A", "The", or "An" at the start
               - No punctuation (except parentheses for disambiguation)
               - Examples:
                 - "Coffee" (not "The History of Coffee")
                 - "World War II" (not "The Second World War")
                 - "Quantum mechanics" (not "Understanding Quantum Mechanics")
                 - "DNA replication" (not "How DNA Replicates")
                 - "Tiger (animal)" (when disambiguation is needed)
            
            Content Format Requirements:
            1. Start with a concise introduction (2-3 paragraphs, no heading)
               - First paragraph defines the topic and its significance
               - Following paragraphs provide overview and context
            
            2. Main Content Structure:
               - Use proper paragraphs for all main content
               - Each paragraph should be 3-5 sentences
               - Paragraphs should flow logically and be well-connected
               - Only use bullet points for lists of specific items or steps
               - AVOID using bullet points for main content
            
            3. Section Format:
               - Use ## for main section headings
               - Use ### for subsection headings
               - Each section should have at least 2-3 paragraphs
               - Maintain proper paragraph flow within sections
               - Use transitions between paragraphs and sections
            
            4. Writing Style:
               - Academic and neutral tone
               - Clear and concise language
               - Use proper paragraph structure
               - Support claims with citations [1]
               - Avoid lists or bullet points except for specific enumerations
               - Write in full, well-structured paragraphs
            
            5. Citations:
               - Use inline citations [1], [2], etc.
               - Place citations after relevant statements
               - Multiple citations can be used together [1][2]
               - DO NOT create a References section
            
            6. Word count: ${minWordCount}-${maxWordCount} words

            Remember: This is an encyclopedia article, not a list or outline.
            Focus on well-written, flowing paragraphs that explain the topic thoroughly.`
          },
          {
            role: "user",
            content: `Write an encyclopedia article about: ${topic}. Remember to use a Wikipedia-style title format and proper paragraph structure.`
          }
        ]
      );

      // Format the response
      const formattedResponse = formatPerplexityResponse(articleResponse.content, articleResponse.citations);
      if (!formattedResponse) {
        console.error('Failed to format response:', articleResponse);
        return null;
      }

      // Fetch relevant images from Openverse
      const images = await this.fetchOpenverseImages(topic);
      console.log('Fetched Openverse images:', images);

      // Get the current user's ID from auth
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User must be logged in to generate articles');
      }

      // Create the infobox structure
      const infobox = {
        title: formattedResponse.title,
        image: 0,
        key_facts: orderedFacts
      };

      // Format images for the article
      const formattedImages = images.map((img, index) => ({
        url: img.url,
        description: img.title,
        attribution: img.attribution,
        index
      }));

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
        citations: articleResponse.citations,
        infobox,
        images: formattedImages
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