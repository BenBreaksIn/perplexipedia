import React from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Article } from '../../types/article';
import { format } from 'date-fns';
import { Sidebar } from '../Sidebar';

const formatDate = (date: Date | Timestamp) => {
  if (date instanceof Timestamp) {
    return format(date.toDate(), 'PPP');
  }
  return format(date, 'PPP');
};

export const ArticleInformation: React.FC = () => {
  const { id } = useParams();
  const [article, setArticle] = React.useState<Article | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadArticle = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const docRef = doc(db, 'articles', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setArticle({
            ...docSnap.data() as Article,
            id: docSnap.id
          });
        } else {
          setError('Article not found');
        }
      } catch (error) {
        console.error('Error loading article:', error);
        setError('Failed to load article');
      } finally {
        setLoading(false);
      }
    };

    loadArticle();
  }, [id]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="perplexipedia-card">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      );
    }

    if (error || !article) {
      return (
        <div className="perplexipedia-card">
          <p className="text-red-600 dark:text-red-400">{error || 'Article not found'}</p>
        </div>
      );
    }

    const wordCount = article.content.trim().split(/\s+/).length;
    const imageCount = article.images?.length || 0;
    const versionCount = article.versions?.length || 0;
    const lastEditor = article.versions?.[article.versions.length - 1]?.author || article.author;
    const uniqueContributors = new Set(
      article.versions?.map(version => version.author) || [article.author]
    ).size;

    return (
      <div className="perplexipedia-card">
        <h1 className="text-2xl font-linux-libertine section-title mb-6">Page Information</h1>
        
        <div className="space-y-8">
          {/* Basic Information */}
          <section>
            <h2 className="text-xl font-linux-libertine section-title mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Page Title</p>
                <p className="font-medium">{article.title}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Page ID</p>
                <p className="font-medium">{article.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Current Status</p>
                <p className="font-medium capitalize">{article.status.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Created By</p>
                <p className="font-medium">{article.author}</p>
              </div>
            </div>
          </section>

          {/* Content Metrics */}
          <section>
            <h2 className="text-xl font-linux-libertine section-title mb-4">Content Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Word Count</p>
                <p className="font-medium">{wordCount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Images</p>
                <p className="font-medium">{imageCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Categories</p>
                <p className="font-medium">{article.categories?.length || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tags</p>
                <p className="font-medium">{article.tags?.length || 0}</p>
              </div>
            </div>
          </section>

          {/* History Statistics */}
          <section>
            <h2 className="text-xl font-linux-libertine section-title mb-4">History Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Creation Date</p>
                <p className="font-medium">{formatDate(article.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Last Modified</p>
                <p className="font-medium">{formatDate(article.updatedAt)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Revisions</p>
                <p className="font-medium">{versionCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Unique Contributors</p>
                <p className="font-medium">{uniqueContributors}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Last Editor</p>
                <p className="font-medium">{lastEditor}</p>
              </div>
            </div>
          </section>

          {/* Technical Information */}
          <section>
            <h2 className="text-xl font-linux-libertine section-title mb-4">Technical Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">AI Generated</p>
                <p className="font-medium">{article.isAIGenerated ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Categories Locked by AI</p>
                <p className="font-medium">{article.categoriesLockedByAI ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Current Version ID</p>
                <p className="font-medium">{article.currentVersion}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  };

  return (
    <div className="container !max-w-[1672px] mx-auto px-4 py-8 flex">
      <Sidebar />
      <main className="flex-1 transition-all duration-300 ease-in-out">
        {renderContent()}
      </main>
    </div>
  );
}; 