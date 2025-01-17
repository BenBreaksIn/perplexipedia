import { useState } from 'react';
import { Article } from '../../types/article';
import { ArticleEditor } from './ArticleEditor';
import { ArticleHistory } from './ArticleHistory';

// Mock data for demonstration - replace with actual data from your backend
const mockCategories = [
    { id: '1', name: 'Science', description: 'Scientific articles' },
    { id: '2', name: 'Technology', description: 'Technology articles' },
    { id: '3', name: 'History', description: 'Historical articles' }
];

const mockTags = [
    { id: '1', name: 'Featured' },
    { id: '2', name: 'Needs Review' },
    { id: '3', name: 'Citation Needed' }
];

interface ArticleManagementProps {
    article?: Article;
}

export const ArticleManagement = ({ article: initialArticle }: ArticleManagementProps) => {
    const [article, setArticle] = useState<Article | undefined>(initialArticle);
    const [view, setView] = useState<'edit' | 'history'>('edit');

    const handleSave = (articleData: Partial<Article>) => {
        if (article) {
            // Update existing article
            const newVersion = {
                id: crypto.randomUUID(),
                content: articleData.content!,
                author: 'current-user', // TODO: Get from auth context
                timestamp: new Date(),
                changes: 'Updated article'
            };

            const updatedArticle: Article = {
                ...article,
                ...articleData,
                versions: [...article.versions, newVersion],
                currentVersion: newVersion.id
            };
            setArticle(updatedArticle);
        } else {
            // Create new article
            const newArticle: Article = {
                id: crypto.randomUUID(),
                title: articleData.title!,
                content: articleData.content!,
                status: articleData.status!,
                author: 'current-user', // TODO: Get from auth context
                createdAt: new Date(),
                updatedAt: new Date(),
                categories: articleData.categories!,
                tags: articleData.tags!,
                versions: articleData.versions!,
                currentVersion: articleData.currentVersion!
            };
            setArticle(newArticle);
        }
        // TODO: Save to backend
    };

    const handleRestoreVersion = (versionId: string) => {
        if (!article) return;

        const version = article.versions.find(v => v.id === versionId);
        if (!version) return;

        const newVersion = {
            id: crypto.randomUUID(),
            content: version.content,
            author: 'current-user', // TODO: Get from auth context
            timestamp: new Date(),
            changes: `Restored version from ${new Date(version.timestamp).toLocaleString()}`
        };

        const updatedArticle: Article = {
            ...article,
            content: version.content,
            versions: [...article.versions, newVersion],
            currentVersion: newVersion.id,
            updatedAt: new Date()
        };
        setArticle(updatedArticle);
        setView('edit');
    };

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">
                    {article ? `Editing: ${article.title}` : 'Create New Article'}
                </h2>
                {article && (
                    <div className="space-x-4">
                        <button
                            onClick={() => setView('edit')}
                            className={`px-4 py-2 rounded ${
                                view === 'edit'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700'
                            }`}
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => setView('history')}
                            className={`px-4 py-2 rounded ${
                                view === 'history'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700'
                            }`}
                        >
                            History
                        </button>
                    </div>
                )}
            </div>

            {view === 'edit' ? (
                <ArticleEditor
                    article={article}
                    onSave={handleSave}
                    categories={mockCategories}
                    tags={mockTags}
                />
            ) : (
                article && (
                    <ArticleHistory
                        article={article}
                        onRestoreVersion={handleRestoreVersion}
                    />
                )
            )}
        </div>
    );
}; 