export type ArticleStatus = 'draft' | 'published' | 'under_review';

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

export interface Article {
    id: string;
    title: string;
    content: string;
    status: ArticleStatus;
    author: string;
    createdAt: Date;
    updatedAt: Date;
    categories: ArticleCategory[];
    tags: ArticleTag[];
    versions: ArticleVersion[];
    currentVersion: string;
} 