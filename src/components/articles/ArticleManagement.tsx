import { useState, useEffect } from 'react';
import { Article } from '../../types/article';
import { ArticleEditor } from './ArticleEditor';
import { ArticleManagementHistory } from './ArticleManagementHistory';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, query, collection, getDocs, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { generateSlug, getArticleIdFromSlug } from '../../utils/urlUtils';

interface ArticleManagementProps {
    article?: Article;
}

export const ArticleManagement = ({ article: initialArticle }: ArticleManagementProps) => {
    const { id, slug } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [article, setArticle] = useState<Article | undefined>(initialArticle);
    const [view, setView] = useState<'edit' | 'history'>('edit');
    const [loading, setLoading] = useState(!!id || !!slug);

    useEffect(() => {
        const loadArticle = async () => {
            if (!currentUser) return;

            // If there's no id or slug, we're creating a new article
            if (!id && !slug) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                let articleId: string | undefined;
                
                if (slug) {
                    const foundId = await getArticleIdFromSlug(slug);
                    articleId = foundId || undefined;
                } else if (id) {
                    articleId = id;
                }

                if (!articleId) {
                    console.error('Article not found');
                    navigate('/');
                    return;
                }

                const docRef = doc(db, 'articles', articleId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const articleData = docSnap.data() as Article;
                    setArticle({
                        ...articleData,
                        id: docSnap.id
                    });
                } else {
                    console.error('Article not found');
                    navigate('/');
                }
            } catch (error) {
                console.error('Error loading article:', error);
                navigate('/');
            } finally {
                setLoading(false);
            }
        };

        loadArticle();
    }, [id, slug, currentUser, navigate]);

    const handleSave = async (articleData: Partial<Article>) => {
        if (!currentUser) return;

        try {
            if (article) {
                // Update existing article
                const versionId = crypto.randomUUID();
                const timestamp = new Date();
                
                // Get the latest version number
                const versionsQuery = query(
                    collection(db, 'articleVersions'),
                    where('articleId', '==', article.id),
                    orderBy('version', 'desc'),
                    limit(1)
                );
                const versionsSnapshot = await getDocs(versionsQuery);
                const latestVersion = versionsSnapshot.empty ? 0 : versionsSnapshot.docs[0].data().version;
                
                // Save the new version to articleVersions collection
                await setDoc(doc(db, 'articleVersions', versionId), {
                    id: versionId,
                    articleId: article.id,
                    version: latestVersion + 1,
                    content: articleData.content!,
                    title: articleData.title || article.title,
                    author: currentUser.displayName || currentUser.email || 'unknown',
                    authorId: currentUser.uid,
                    timestamp: timestamp,
                    changes: 'Updated article'
                });

                const updatedArticle: Article = {
                    ...article,
                    ...articleData,
                    author: currentUser.displayName || currentUser.email || 'unknown',
                    updatedAt: timestamp,
                    slug: articleData.title ? generateSlug(articleData.title) : article.slug
                };

                await setDoc(doc(db, 'articles', article.id), updatedArticle);
                setArticle(updatedArticle);
                
                if (updatedArticle.status === 'published') {
                    navigate(`/plexi/${updatedArticle.slug}`);
                }
            } else {
                // Create new article
                const articleId = crypto.randomUUID();
                const versionId = crypto.randomUUID();
                const timestamp = new Date();
                
                const newArticle: Article = {
                    id: articleId,
                    title: articleData.title!,
                    content: articleData.content!,
                    status: articleData.status!,
                    author: currentUser.displayName || currentUser.email || 'unknown',
                    authorId: currentUser.uid,
                    createdAt: timestamp,
                    updatedAt: timestamp,
                    categories: articleData.categories!,
                    tags: articleData.tags!,
                    slug: generateSlug(articleData.title!)
                };

                // Save the article
                await setDoc(doc(db, 'articles', articleId), newArticle);

                // Save the initial version
                await setDoc(doc(db, 'articleVersions', versionId), {
                    id: versionId,
                    articleId: articleId,
                    version: 1,
                    content: articleData.content!,
                    title: articleData.title!,
                    author: currentUser.displayName || currentUser.email || 'unknown',
                    authorId: currentUser.uid,
                    timestamp: timestamp,
                    changes: 'Initial version'
                });

                setArticle(newArticle);
                
                if (newArticle.status === 'published') {
                    navigate(`/plexi/${newArticle.slug}`);
                }
            }
        } catch (error) {
            console.error('Error saving article:', error);
        }
    };

    const handleRestoreVersion = async (versionId: string) => {
        if (!article || !currentUser) return;

        try {
            const docRef = doc(db, 'articleVersions', versionId);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                console.error('Version not found');
                return;
            }

            const version = docSnap.data();
            const timestamp = new Date();
            const newVersionId = crypto.randomUUID();

            // Create a new version with the restored content
            await setDoc(doc(db, 'articleVersions', newVersionId), {
                id: newVersionId,
                articleId: article.id,
                version: version.version + 1,
                content: version.content,
                title: version.title,
                author: currentUser.displayName || currentUser.email || 'unknown',
                authorId: currentUser.uid,
                timestamp: timestamp,
                changes: `Restored version ${version.version} from ${new Date(version.timestamp).toLocaleString()}`
            });

            // Update the article with the restored content
            const updatedArticle: Article = {
                ...article,
                content: version.content,
                title: version.title,
                updatedAt: timestamp
            };

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
                    <ArticleManagementHistory
                        article={article}
                        onRestoreVersion={handleRestoreVersion}
                    />
                )
            )}
        </div>
    );
}; 