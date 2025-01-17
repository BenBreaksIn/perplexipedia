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

  private async searchSources(topic: string): Promise<string[]> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a research assistant. Search for and provide reliable sources about the given topic.
            You must respond with ONLY a JSON array of strings containing URLs and citations.
            Focus on:
            1. Academic sources
            2. Reputable news outlets
            3. Official documentation
            4. Peer-reviewed papers
            
            Example response format:
            ["source1", "source2", "source3"]
            
            Do not include any other text or formatting. Only return the JSON array.`
          },
          {
            role: "user",
            content: `Find reliable sources about: ${topic}`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      try {
        const content = response.choices[0].message.content || '{"sources": []}';
        const parsed = JSON.parse(content);
        return Array.isArray(parsed.sources) ? parsed.sources : [];
      } catch (parseError) {
        console.error('Error parsing sources JSON:', parseError);
        return [];
      }
    } catch (error) {
      console.error('Error searching sources:', error);
      return [];
    }
  }

  private async verifyFacts(content: string, sources: string[]): Promise<boolean> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
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
        ],
        temperature: 0.3
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
      // 1. Generate initial research and sources
      const sources = await this.searchSources(title);
      if (!sources.length) {
        console.error('No sources found');
        return null;
      }

      // 2. Generate the article with integrated fact verification
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert wiki article writer with fact-checking capabilities.
            Create a comprehensive, well-structured article about the given topic.
            
            Follow these guidelines:
            1. Be objective and unbiased
            2. Use clear, academic language
            3. Include relevant facts and figures
            4. Structure with appropriate sections
            5. Cite sources inline using [1], [2], etc.
            6. Add a References section at the end listing all sources
            7. Only include verifiable information
            8. Format in markdown
            
            Return your response in this JSON format:
            {
              "content": "The article content in markdown",
              "sources_used": ["array of sources actually used"]
            }`
          },
          {
            role: "user",
            content: `Write an article about: ${title}\nAvailable sources: ${JSON.stringify(sources)}`
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      try {
        const articleData = JSON.parse(response.choices[0].message.content || '{}');
        const content = articleData.content;
        if (!content) return null;

        // 3. Moderate content
        const moderation = await this.moderateContent(content);
        if (!moderation.isAppropriate) {
          console.error('Content flagged during moderation:', moderation.reason);
          return null;
        }

        // 4. Generate tags and categories
        const categorization = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `Analyze the article and suggest relevant tags and categories.
              Return ONLY a JSON object in this exact format:
              {
                "tags": ["tag1", "tag2"],
                "categories": ["category1", "category2"]
              }
              Do not include any other text or formatting.`
            },
            {
              role: "user",
              content
            }
          ],
          temperature: 0.5,
          response_format: { type: "json_object" }
        });

        const categorizationData = JSON.parse(categorization.choices[0].message.content || '{"tags":[],"categories":[]}');
        const { tags = [], categories = [] } = categorizationData;

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
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        return null;
      }
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
        model: "gpt-4o",
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
        ],
        temperature: 0.7
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
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Generate a list of related topics that would make good wiki articles. Consider different aspects, subtopics, and connected subjects. Return as a JSON array of strings."
          },
          {
            role: "user",
            content: title
          }
        ],
        temperature: 0.8
      });

      const result = response.choices[0].message.content || '[]';
      return JSON.parse(result);
    } catch (error) {
      console.error('Error generating related topics:', error);
      return [];
    }
  }
} 