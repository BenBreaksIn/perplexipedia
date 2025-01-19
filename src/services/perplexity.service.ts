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
            content: `Write an encyclopedia article about: ${topic}. Remember to use a Wikipedia-style title format.`
          }
        ]
      );

      // Format the response
      const formattedResponse = formatPerplexityResponse(articleResponse.content, articleResponse.citations);
      if (!formattedResponse) {
        console.error('Failed to format response:', articleResponse);
        return null;
      }

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
        infobox
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