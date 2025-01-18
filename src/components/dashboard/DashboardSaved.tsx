import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { collection, query, where, orderBy, doc, deleteDoc, onSnapshot } from 'firebase/firestore';

type SavedArticle = {
  id: string;
  title: string;
  savedAt: Date;
  lastModified: Date;
  excerpt: string;
};

type SortOption = 'savedAt' | 'lastModified' | 'title';

export const DashboardSaved: React.FC = () => {
  const { currentUser } = useAuth();
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('savedAt');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentUser) return;

    const savedRef = collection(db, 'saved_articles');
    const q = query(
      savedRef,
      where('userId', '==', currentUser.uid),
      orderBy('savedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedArticles = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          savedAt: doc.data().savedAt.toDate(),
          lastModified: doc.data().lastModified.toDate()
        })) as SavedArticle[];

        setSavedArticles(fetchedArticles);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching saved articles:', err);
        setError('Failed to load saved articles');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const handleRemoveArticle = async (articleId: string) => {
    if (!currentUser) return;

    try {
      const articleRef = doc(db, 'saved_articles', articleId);
      await deleteDoc(articleRef);
      setSavedArticles(prev => prev.filter(article => article.id !== articleId));
    } catch (err) {
      console.error('Error removing article:', err);
      // You might want to show a toast notification here
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const sortedAndFilteredArticles = [...savedArticles]
    .filter(article => 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'lastModified':
          return b.lastModified.getTime() - a.lastModified.getTime();
        default: // savedAt
          return b.savedAt.getTime() - a.savedAt.getTime();
      }
    });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="border-b border-perplexipedia-border pb-4">
          <h2 className="text-2xl font-linux-libertine section-title">Saved Articles</h2>
          <p className="text-gray-600 dark:text-gray-400">Loading your saved articles...</p>
        </div>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-perplexity-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="border-b border-perplexipedia-border pb-4">
          <h2 className="text-2xl font-linux-libertine section-title">Saved Articles</h2>
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-perplexipedia-border pb-4">
        <h2 className="text-2xl font-linux-libertine section-title">Saved Articles</h2>
        <p className="text-gray-600 dark:text-gray-400">Access and manage your saved articles</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search saved articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input w-full"
          />
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="search-input"
          >
            <option value="savedAt">Date Saved</option>
            <option value="lastModified">Last Modified</option>
            <option value="title">Title</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {sortedAndFilteredArticles.map((article) => (
          <div key={article.id} className="perplexipedia-card hover:border-perplexity-primary transition-colors duration-150">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-lg font-medium hover:text-perplexity-primary">
                  <a href={`/article/${article.title.toLowerCase().replace(/ /g, '-')}`}>
                    {article.title}
                  </a>
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  {article.excerpt}
                </p>
              </div>
              <button
                onClick={() => handleRemoveArticle(article.id)}
                className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors duration-150"
                title="Remove from saved"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-4">
              <span>Saved on {formatDate(article.savedAt)}</span>
              <span>•</span>
              <span>Last modified {formatDate(article.lastModified)}</span>
            </div>
          </div>
        ))}

        {sortedAndFilteredArticles.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No articles match your search' : 'No saved articles'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}; 