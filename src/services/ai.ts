import OpenAI from 'openai';
import { Article } from '../types/article';
import { getAuth } from 'firebase/auth';

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
            content: `You are a research assistant. Search for reliable, non-biased sources from:
            1. Academic journals and publications
            2. Government research institutions
            3. Scientific databases (e.g. PubMed, ScienceDirect)
            4. Educational institutions (.edu domains)
            5. Professional organizations and industry associations
            6. Peer-reviewed publications
            7. Research institutes and think tanks
            8. Official statistics bureaus
            9. Industry standard bodies
            10. Technical documentation and specifications
            
            Return ONLY a JSON array of source objects in this format:
            {
              "sources": [{
                "url": "source url",
                "title": "source title",
                "publisher": "publishing organization",
                "type": "type of source (academic/government/research/etc)",
                "year": "publication year"
              }]
            }
            
            Ensure all sources are:
            - Recent (preferably within last 5 years unless historical)
            - Factually accurate
            - Non-biased and objective
            - From reputable organizations
            - Primary sources where possible
            - Peer-reviewed when applicable
            
            Do not include:
            - Wikipedia articles
            - Personal blogs
            - Social media posts
            - Opinion pieces
            - Unreliable news sites
            - Commercial product pages`
          },
          {
            role: "user",
            content: `Find reliable sources for an article about: ${topic}`
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

  private async verifyFacts(content: string, sources: any[]): Promise<boolean> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a fact-checking assistant. Verify if the given content is supported by the provided sources.
            
            Use this verification framework:
            1. Core Facts (70% weight):
               - Key claims and statistics
               - Historical dates and events
               - Scientific/technical information
            
            2. Supporting Details (30% weight):
               - Contextual information
               - Background details
               - General knowledge claims
            
            Verification levels:
            - Strong verification (100%): Direct source confirmation
            - Moderate verification (70%): Supported by multiple sources indirectly
            - Weak verification (30%): General alignment with source material
            - No verification (0%): Cannot be confirmed from sources
            
            Calculate overall verification score:
            1. For each claim, assign verification level
            2. Weight core facts vs supporting details
            3. Return true if overall score > 70%
            
            Return JSON response:
            {
              "verified": boolean,
              "score": number (0-100),
              "analysis": {
                "core_facts_score": number,
                "supporting_details_score": number,
                "unverified_claims": string[]
              }
            }`
          },
          {
            role: "user",
            content: `Content: ${content}\nSources: ${JSON.stringify(sources)}`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.verified === true;
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

  private async searchImages(topic: string): Promise<Array<{ url: string, attribution: string, description: string }>> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an image research assistant. Search for relevant, free-to-use images from:
            1. Wikimedia Commons
            2. Unsplash
            3. Pexels
            4. Creative Commons sources
            
            Return ONLY a JSON object in this format:
            {
              "images": [{
                "url": "direct image url",
                "attribution": "credit and license info",
                "description": "brief description for alt text"
              }]
            }
            
            Ensure all images are:
            - Free to use
            - Properly attributed
            - High quality and relevant
            - From reputable sources
            
            Return at least 2-3 relevant images per article.`
          },
          {
            role: "user",
            content: `Find relevant free images for an article about: ${topic}`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      try {
        const content = response.choices[0].message.content || '{"images": []}';
        const parsed = JSON.parse(content);
        return Array.isArray(parsed.images) ? parsed.images : [];
      } catch (parseError) {
        console.error('Error parsing images JSON:', parseError);
        return [];
      }
    } catch (error) {
      console.error('Error searching images:', error);
      return [];
    }
  }

  private async checkForDuplicates(title: string, content: string, existingArticles: Article[]): Promise<{
    isDuplicate: boolean;
    similarArticles: Array<{id: string; title: string; similarity: number}>;
    reason?: string;
  }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a duplicate content detection expert. Analyze the proposed article against existing articles to prevent duplicates.

            Check for:
            1. Title similarity (40% weight):
               - Exact matches
               - Similar meanings/synonyms
               - Subset/superset relationships
            
            2. Content similarity (60% weight):
               - Main topic overlap
               - Key concepts coverage
               - Structural similarity
               - Fact/information overlap
            
            Return JSON response:
            {
              "isDuplicate": boolean,
              "similarity_score": number (0-100),
              "similar_articles": [{
                "id": string,
                "title": string,
                "similarity": number (0-100)
              }],
              "reason": string (if duplicate),
              "recommendation": string (if duplicate)
            }`
          },
          {
            role: "user",
            content: `Proposed article:
            Title: ${title}
            Content: ${content}
            
            Existing articles:
            ${JSON.stringify(existingArticles.map(a => ({
              id: a.id,
              title: a.title,
              content: a.content
            })))}`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        isDuplicate: result.isDuplicate || false,
        similarArticles: result.similar_articles || [],
        reason: result.reason
      };
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return { isDuplicate: false, similarArticles: [] };
    }
  }

  async generateArticle(
    topic: string, 
    existingArticles: Article[] = [], 
    minWordCount: number = 500,
    maxWordCount: number = 2000
  ): Promise<Partial<Article> | null> {
    try {
      // Get the current user's ID from auth
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User must be logged in to generate articles');
      }

      // 1. Check for duplicates before proceeding
      const initialDupeCheck = await this.checkForDuplicates(topic, "", existingArticles);
      if (initialDupeCheck.isDuplicate) {
        console.error('Duplicate article detected:', initialDupeCheck.reason);
        return null;
      }

      // 2. Generate initial research and sources
      const sources = await this.searchSources(topic);
      if (!sources.length) {
        console.error('No sources found');
        return null;
      }

      // 3. Search for relevant images
      const images = await this.searchImages(topic);

      // 4. Generate the article with integrated fact verification and images
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert encyclopedia article writer with fact-checking capabilities.
            Create a comprehensive, well-structured article about the given topic.
            
            Follow these guidelines:
            1. Be objective and unbiased
            2. Use clear, academic language
            3. Include relevant facts and figures
            4. Structure the article with appropriate sections based on the topic's nature:
               - Always start with a concise introduction (no heading)
               - Choose subsequent sections based on what's most relevant to the topic
               - Common sections might include: History, Description, Types, Applications, Impact, etc.
               - Don't force sections that aren't relevant to the topic
            5. Cite sources inline using [1], [2], etc.
            6. Add a References section at the end listing all sources
            7. Only include verifiable information
            8. Format in markdown
            9. Include image placeholders where appropriate using the provided images
            10. DO NOT include the article title in the content
            11. DO NOT repeat infobox information in the main content
            12. Include "External links" section when relevant
            13. STRICTLY follow the requested word count range provided in the user's prompt
            
            Return your response in this JSON format:
            {
              "content": "The article content in markdown (start directly with the introduction, no title or key facts)",
              "sources_used": ["array of sources actually used"],
              "infobox": {
                "title": "string",
                "image": "index of main image to use",
                "key_facts": {
                  "Main Theme": "string",
                  "Primary Periods": "string",
                  "Key Dates": "string",
                  "Notable Figures": "string",
                  // Add other relevant key facts based on topic
                }
              },
              "word_count": number
            }`
          },
          {
            role: "user",
            content: `Write an article about: ${topic}
            Required word count: between ${minWordCount} and ${maxWordCount} words
            Available sources: ${JSON.stringify(sources)}
            Available images: ${JSON.stringify(images)}`
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      try {
        const articleData = JSON.parse(response.choices[0].message.content || '{}');
        const content = articleData.content;
        if (!content) return null;

        // Final duplicate check with full content
        const finalDupeCheck = await this.checkForDuplicates(topic, content, existingArticles);
        if (finalDupeCheck.isDuplicate) {
          console.error('Duplicate content detected:', finalDupeCheck.reason);
          return null;
        }

        // 5. Verify facts before proceeding
        const isFactual = await this.verifyFacts(content, sources);
        if (!isFactual) {
          console.error('Failed to verify article facts');
          return null;
        }

        // 6. Moderate content
        const moderation = await this.moderateContent(content);
        if (!moderation.isAppropriate) {
          console.error('Content flagged during moderation:', moderation.reason);
          return null;
        }

        // 7. Generate tags and categories
        const categorization = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are a encyclopedia categorization expert. Analyze the article and generate appropriate categories following encyclopedia best practices:

1. Use hierarchical categorization (from broad to specific)
2. Include both topical and administrative categories
3. Follow Encyclopedia naming conventions:
   - Use plural forms for most categories
   - Capitalize first letter of each word
   - Use natural language order
4. Ensure categories are:
   - Objective and factual
   - Neither too broad nor too specific
   - Relevant to the main topic
   - Following established category trees

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
          title: topic,
          content,
          status: 'draft',
          author: currentUser.displayName || currentUser.email || 'Anonymous',
          categories: categories.map((name: string) => ({ id: crypto.randomUUID(), name })),
          tags: tags.map((name: string) => ({ id: crypto.randomUUID(), name })),
          images,
          infobox: articleData.infobox,
          isAIGenerated: true,
          categoriesLockedByAI: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          currentVersion: crypto.randomUUID(),
          versions: [{
            id: crypto.randomUUID(),
            content,
            author: currentUser.displayName || currentUser.email || 'Anonymous',
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
            content: "Generate a list of related topics that would make good encyclopedia articles. Consider different aspects, subtopics, and connected subjects. Return as a JSON array of strings."
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

  async generateCategories(content: string): Promise<Array<{ id: string; name: string }>> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a encyclopedia categorization expert. Analyze the article and generate appropriate categories following encyclopedia guidelines:

1. Generate between 2-10 categories total (aim for 3-7 as ideal)
2. Use hierarchical categorization, including:
   - One broad/main category
   - 1-2 intermediate categories
   - 1-3 specific categories
   - 1-2 administrative categories (if needed, e.g., "Articles needing citations")

3. Follow Encyclopedia naming conventions:
   - Use plural forms for most categories
   - Capitalize first letter of each word
   - Use natural language order
   - Avoid redundant categorization

4. Ensure categories are:
   - Objective and factual
   - Neither too broad nor too specific
   - Directly relevant to the main topic
   - Following established category trees

Return ONLY a JSON object in this format:
{
  "categories": {
    "main": ["Primary category"],
    "intermediate": ["Secondary category 1", "Secondary category 2"],
    "specific": ["Specific category 1", "Specific category 2"],
    "administrative": ["Administrative category"]
  }
}`
          },
          {
            role: "user",
            content
          }
        ],
        temperature: 0.5,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{"categories": {"main":[],"intermediate":[],"specific":[],"administrative":[]}}');
      
      // Flatten and combine all category types
      const allCategories = [
        ...(result.categories.main || []),
        ...(result.categories.intermediate || []),
        ...(result.categories.specific || []),
        ...(result.categories.administrative || [])
      ];

      // Limit to maximum 10 categories
      const limitedCategories = allCategories.slice(0, 10);

      return limitedCategories.map((name: string) => ({ 
        id: crypto.randomUUID(), 
        name 
      }));
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
    const results: Array<Partial<Article>> = [];
    const failedAttempts: Record<string, string> = {};
    
    try {
      console.log(`Starting generation of ${count} articles for topic: ${topic}`);
      
      // First, expand the topic into specific subtopics
      // Request more subtopics than needed to have a pool to choose from
      const subtopics = await this.expandTopicIntoSubtopics(topic, Math.max(count * 3, 10));
      console.log('Generated subtopics:', subtopics);
      
      // If we couldn't expand the topic, try generating articles with the original topic
      if (subtopics.length === 0) {
        console.log('No subtopics generated, using original topic');
        const article = await this.generateArticle(topic, existingArticles, minWordCount, maxWordCount);
        if (article) {
          results.push(article);
        }
        return results;
      }
      
      // Keep track of used subtopics and failed attempts
      const usedSubtopics = new Set<string>();
      let attempts = 0;
      const maxAttempts = count * 3; // Allow up to 3 attempts per desired article
      
      // Generate articles until we reach count or max attempts
      while (results.length < count && attempts < maxAttempts) {
        attempts++;
        
        // Filter out used subtopics and get available ones
        const availableSubtopics = subtopics.filter(st => !usedSubtopics.has(st));
        if (availableSubtopics.length === 0) {
          console.log('No more unique subtopics available');
          break;
        }
        
        // Select a subtopic using a weighted random approach
        // Prefer subtopics that haven't failed before
        const weightedSubtopics = availableSubtopics.map(st => ({
          topic: st,
          weight: failedAttempts[st] ? 0.3 : 1.0
        }));
        
        const totalWeight = weightedSubtopics.reduce((sum, st) => sum + st.weight, 0);
        let random = Math.random() * totalWeight;
        let selectedTopic = weightedSubtopics[0].topic;
        
        for (const st of weightedSubtopics) {
          random -= st.weight;
          if (random <= 0) {
            selectedTopic = st.topic;
            break;
          }
        }
        
        usedSubtopics.add(selectedTopic);
        
        console.log(`Generating article for specific topic: ${selectedTopic} (Attempt ${attempts})`);
        try {
          // Include both existing articles and newly generated ones in duplicate check
          const allArticles = [...existingArticles, ...results.filter((a): a is Article => 
            !!a.id && !!a.title && !!a.content // Type guard to ensure required fields exist
          )];
          const article = await this.generateArticle(selectedTopic, allArticles, minWordCount, maxWordCount);
          
          if (article) {
            console.log(`Successfully generated article for: ${selectedTopic}`);
            results.push(article);
          } else {
            console.error(`Failed to generate article for: ${selectedTopic}`);
            failedAttempts[selectedTopic] = `Failed on attempt ${attempts}`;
          }
        } catch (error: unknown) {
          console.error(`Error generating article for ${selectedTopic}:`, error);
          failedAttempts[selectedTopic] = error instanceof Error ? error.message : 'Unknown error';
          continue;
        }
      }
      
      if (results.length < count) {
        console.log(`Warning: Only generated ${results.length}/${count} articles after ${attempts} attempts`);
        console.log('Failed attempts:', failedAttempts);
      }
      
      console.log(`Generation complete. Generated ${results.length} articles`);
      return results;
    } catch (error) {
      console.error('Error in generateArticles:', error);
      throw error;
    }
  }

  private async expandTopicIntoSubtopics(topic: string, count: number): Promise<string[]> {
    try {
      console.log(`Expanding topic: ${topic} into ${count} subtopics`);
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a topic research expert. Given a general topic, generate specific, diverse subtopics.
            Follow these rules strictly:
            1. For people (historical figures, leaders, etc), use ONLY their full names as titles
               - Correct: "Mahatma Gandhi", "Albert Einstein"
               - Incorrect: "Gandhi's Influence", "Einstein's Theory"
            
            2. For events, use the official or commonly accepted name
               - Correct: "World War II", "French Revolution"
               - Incorrect: "Impact of World War II", "Causes of French Revolution"
            
            3. For concepts/topics, use clear, concise noun phrases
               - Correct: "Quantum Mechanics", "Photosynthesis"
               - Incorrect: "Understanding Quantum Mechanics", "How Photosynthesis Works"
            
            Return ONLY a JSON object with a "subtopics" array of strings, each representing a specific subtopic.
            Example response:
            {
              "subtopics": ["Mahatma Gandhi", "Nelson Mandela", "Martin Luther King Jr."]
            }`
          },
          {
            role: "user",
            content: `Generate ${count} diverse subtopics for: ${topic}`
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content || '{"subtopics": []}';
      console.log('Received subtopics response:', content);
      const parsed = JSON.parse(content);
      const subtopics = Array.isArray(parsed.subtopics) ? parsed.subtopics.slice(0, count) : [];
      console.log('Parsed subtopics:', subtopics);
      return subtopics;
    } catch (error) {
      console.error('Error expanding topics:', error);
      return [];
    }
  }
} 