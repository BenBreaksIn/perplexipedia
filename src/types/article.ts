export type ArticleStatus = 'draft' | 'published' | 'under_review' | 'submit_revision' | 'archived';

export interface ArticleVersion {
    id: string;
    content: string;
    author: string;
    timestamp: Date;
    changes: string;
}

export interface ArticleTag {
    id: string;
    name: string;
}

export interface ArticleCategory {
    id: string;
    name: string;
    description?: string;
}

export interface ArticleImage {
  url: string;
  attribution: string;
  description: string;
}

export interface InfoBox {
  title: string;
  image: number;
  key_facts: Record<string, string>;
}

export interface Article {
    id: string;
    title: string;
    content: string;
    status: ArticleStatus;
    author: string;
    authorId: string;  // User ID of the author
    createdAt: Date;
    updatedAt: Date;
    categories: Array<{ id: string; name: string }>;
    tags: Array<{ id: string; name: string }>;
    versions?: Array<{
        id: string;
        content: string;
        author: string;
        timestamp: Date;
        changes: string;
    }>;
    currentVersion?: string;
    images?: ArticleImage[];
    infobox?: InfoBox;
    isAIGenerated?: boolean;
    categoriesLockedByAI?: boolean;
    citations?: any[]; // Citations from Perplexity API
    slug?: string; // URL-friendly version of the title
} 