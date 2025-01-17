import { useState, useEffect } from 'react';
import { Article } from '../../types/article';
import { ArticleEditor } from './ArticleEditor';
import { ArticleHistory } from './ArticleHistory';
import { useParams } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

interface ArticleManagementProps {
    article?: Article;
}

export const ArticleManagement = ({ article: initialArticle }: ArticleManagementProps) => {
    const { id } = useParams();
    const { currentUser } = useAuth();
    const [article, setArticle] = useState<Article | undefined>(initialArticle);
    const [view, setView] = useState<'edit' | 'history'>('edit');
    const [loading, setLoading] = useState(!!id);

    useEffect(() => {
        const loadArticle = async () => {
            if (!id || !currentUser) return;

            try {
                setLoading(true);
                const docRef = doc(db, 'articles', id);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    setArticle({
                        id: docSnap.id,
                        ...docSnap.data()
                    } as Article);
                }
            } catch (error) {
                console.error('Error loading article:', error);
            } finally {
                setLoading(false);
            }
        };

        loadArticle();
    }, [id, currentUser]);

    const handleSave = async (articleData: Partial<Article>) => {
        if (!currentUser) return;

        try {
            if (article) {
                // Update existing article
                const newVersion = {
                    id: crypto.randomUUID(),
                    content: articleData.content!,
                    author: currentUser.displayName || currentUser.email || 'unknown',
                    timestamp: new Date(),
                    changes: 'Updated article'
                };

                const updatedArticle: Article = {
                    ...article,
                    ...articleData,
                    versions: [...article.versions, newVersion],
                    currentVersion: newVersion.id,
                    updatedAt: new Date()
                };

                await setDoc(doc(db, 'articles', article.id), updatedArticle);
                setArticle(updatedArticle);
            } else {
                // Create new article
                const articleId = crypto.randomUUID();
                const newArticle: Article = {
                    id: articleId,
                    title: articleData.title!,
                    content: articleData.content!,
                    status: articleData.status!,
                    author: currentUser.displayName || currentUser.email || 'unknown',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    categories: articleData.categories!,
                    tags: articleData.tags!,
                    versions: [{
                        id: crypto.randomUUID(),
                        content: articleData.content!,
                        author: currentUser.displayName || currentUser.email || 'unknown',
                        timestamp: new Date(),
                        changes: 'Initial version'
                    }],
                    currentVersion: articleData.currentVersion!
                };

                await setDoc(doc(db, 'articles', articleId), newArticle);
                setArticle(newArticle);
            }
        } catch (error) {
            console.error('Error saving article:', error);
        }
    };

    const handleRestoreVersion = async (versionId: string) => {
        if (!article || !currentUser) return;

        const version = article.versions.find(v => v.id === versionId);
        if (!version) return;

        const newVersion = {
            id: crypto.randomUUID(),
            content: version.content,
            author: currentUser.displayName || currentUser.email || 'unknown',
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

        try {
            await setDoc(doc(db, 'articles', article.id), updatedArticle);
            setArticle(updatedArticle);
            setView('edit');
        } catch (error) {
            console.error('Error restoring version:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-perplexity-primary"></div>
            </div>
        );
    }

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