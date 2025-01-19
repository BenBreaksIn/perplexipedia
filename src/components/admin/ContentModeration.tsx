import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../hooks/useAdmin';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Article } from '../../types/article';
import { useAuth } from '../../contexts/AuthContext';
import { PreviewModal } from '../articles/PreviewModal';
import { generateSlug } from '../../utils/urlUtils';

interface PendingRevision {
  id: string;
  articleId: string;
  title: string;
  content: string;
  author: string;
  authorId: string;
  timestamp: Date;
  changes: string;
  version: number;
  articleTitle: string;
}

export const ContentModeration: React.FC = () => {
  const { isAdmin, loading } = useAdmin();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [pendingRevisions, setPendingRevisions] = useState<PendingRevision[]>([]);
  const [approvedRevisions, setApprovedRevisions] = useState<PendingRevision[]>([]);
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [loadingRevisions, setLoadingRevisions] = useState(true);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [selectedRevision, setSelectedRevision] = useState<PendingRevision | null>(null);
  const [previewMode, setPreviewMode] = useState<'none' | 'original' | 'revised'>('none');
  const [originalArticle, setOriginalArticle] = useState<Article | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'published'>('pending');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'a-z' | 'z-a'>('newest');

  // Redirect non-admin users
  React.useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, loading, navigate]);

  // Load revisions
  useEffect(() => {
    const loadRevisions = async () => {
      try {
        // Get all articles with pending revisions
        const articlesQuery = query(
          collection(db, 'articles'),
          where('status', 'in', ['under_review', 'published'])
        );
        const articlesSnapshot = await getDocs(articlesQuery);
        
        const pending: PendingRevision[] = [];
        const approved: PendingRevision[] = [];
        
        for (const articleDoc of articlesSnapshot.docs) {
          const article = articleDoc.data() as Article;
          
          // Get all revisions for this article
          const revisionsQuery = query(
            collection(db, 'articleVersions'),
            where('articleId', '==', article.id)
          );
          const revisionsSnapshot = await getDocs(revisionsQuery);
          
          revisionsSnapshot.forEach(revisionDoc => {
            const revision = revisionDoc.data();
            const revisionWithMeta = {
              ...revision,
              id: revisionDoc.id,
              articleTitle: article.title,
              timestamp: revision.timestamp.toDate()
            } as PendingRevision;

            if (revision.status === 'pending') {
              pending.push(revisionWithMeta);
            } else if (revision.status === 'approved') {
              approved.push(revisionWithMeta);
            }
          });
        }
        
        setPendingRevisions(pending.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
        setApprovedRevisions(approved.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
      } catch (error) {
        console.error('Error loading revisions:', error);
      } finally {
        setLoadingRevisions(false);
      }
    };

    if (isAdmin && !loading) {
      loadRevisions();
    }
  }, [isAdmin, loading]);

  // Load published articles
  useEffect(() => {
    const loadPublishedArticles = async () => {
      if (!isAdmin) return;
      
      try {
        setLoadingArticles(true);
        const articlesRef = collection(db, 'articles');
        const publishedQuery = query(
          articlesRef,
          where('status', '==', 'published')
        );
        const articlesSnapshot = await getDocs(publishedQuery);
        const articles = articlesSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as Article[];
        setAllArticles(articles);
      } catch (error) {
        console.error('Error loading articles:', error);
      } finally {
        setLoadingArticles(false);
      }
    };

    if (isAdmin && !loading) {
      loadPublishedArticles();
    }
  }, [isAdmin, loading]);

  const loadOriginalArticle = async (articleId: string) => {
    try {
      const docRef = doc(db, 'articles', articleId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setOriginalArticle(docSnap.data() as Article);
      }
    } catch (error) {
      console.error('Error loading original article:', error);
    }
  };

  const handleRevisionClick = async (revision: PendingRevision) => {
    setSelectedRevision(revision);
    await loadOriginalArticle(revision.articleId);
    setPreviewMode('none');
  };

  const handlePreviewClick = (mode: 'original' | 'revised') => {
    setPreviewMode(mode);
  };

  const renderPreviewModal = () => {
    if (previewMode === 'none' || !selectedRevision) return null;

    const previewArticle = previewMode === 'original' 
      ? originalArticle
      : {
          ...originalArticle,
          title: selectedRevision.title,
          content: selectedRevision.content,
        };

    if (!previewArticle) return null;

    return (
      <PreviewModal
        article={previewArticle}
        onClose={() => setPreviewMode('none')}
      />
    );
  };

  const handleApproveRevision = async (revision: PendingRevision) => {
    if (!currentUser) return;

    try {
      // First get the article to ensure we have access and get the slug
      const articleRef = doc(db, 'articles', revision.articleId);
      const articleSnap = await getDoc(articleRef);
      
      if (!articleSnap.exists()) {
        console.error('Article not found');
        return;
      }

      const article = articleSnap.data() as Article;
      
      // Update the revision status first
      const revisionRef = doc(db, 'articleVersions', revision.id);
      await updateDoc(revisionRef, {
        status: 'approved'
      });

      // Then update the article with the new content
      await updateDoc(articleRef, {
        content: revision.content,
        title: revision.title,
        status: 'published',
        updatedAt: new Date()
      });

      // Remove the approved revision from the list
      setPendingRevisions(prevRevisions => 
        prevRevisions.filter(r => r.id !== revision.id)
      );
      setSelectedRevision(null);

      // Navigate to the article page
      navigate(`/plexi/${article.slug}`);
    } catch (error) {
      console.error('Error approving revision:', error);
      // You might want to show an error message to the user here
    }
  };

  const handleRejectRevision = async (revision: PendingRevision) => {
    if (!currentUser) return;

    try {
      // Update the article status back to published
      const articleRef = doc(db, 'articles', revision.articleId);
      await updateDoc(articleRef, {
        status: 'published'
      });

      // Update the revision status
      const revisionRef = doc(db, 'articleVersions', revision.id);
      await updateDoc(revisionRef, {
        status: 'rejected'
      });

      // Remove the rejected revision from the list
      setPendingRevisions(prevRevisions => 
        prevRevisions.filter(r => r.id !== revision.id)
      );
      setSelectedRevision(null);
    } catch (error) {
      console.error('Error rejecting revision:', error);
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
    if (!currentUser || !window.confirm('Are you sure you want to delete this article? This action cannot be undone.')) return;

    try {
      // Delete the article
      await deleteDoc(doc(db, 'articles', articleId));
      
      // Delete all associated versions
      const versionsQuery = query(
        collection(db, 'articleVersions'),
        where('articleId', '==', articleId)
      );
      const versionsSnapshot = await getDocs(versionsQuery);
      const deletePromises = versionsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Update the UI
      setAllArticles(prev => prev.filter(article => article.id !== articleId));
      setPendingRevisions(prev => prev.filter(rev => rev.articleId !== articleId));
      setApprovedRevisions(prev => prev.filter(rev => rev.articleId !== articleId));
    } catch (error) {
      console.error('Error deleting article:', error);
    }
  };

  const handleDeleteRevision = async (revision: PendingRevision) => {
    if (!currentUser || !window.confirm('Are you sure you want to delete this revision? This action cannot be undone.')) return;

    try {
      // Delete the revision
      await deleteDoc(doc(db, 'articleVersions', revision.id));

      // Update the UI
      if (activeTab === 'pending') {
        setPendingRevisions(prev => prev.filter(rev => rev.id !== revision.id));
      } else {
        setApprovedRevisions(prev => prev.filter(rev => rev.id !== revision.id));
      }
      setSelectedRevision(null);
    } catch (error) {
      console.error('Error deleting revision:', error);
    }
  };

  const renderRevisionsList = (revisions: PendingRevision[]) => {
    if (revisions.length === 0) {
      return <p className="section-text">No {activeTab} revisions to display.</p>;
    }

    return (
      <div className="space-y-4">
        {revisions.map(revision => (
          <div 
            key={revision.id} 
            className={`p-4 border rounded-lg cursor-pointer transition-colors duration-200 ${
              selectedRevision?.id === revision.id 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
            }`}
            onClick={() => handleRevisionClick(revision)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{revision.articleTitle}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Edited by {revision.author} • {new Date(revision.timestamp).toLocaleString()}
                </p>
              </div>
              <div className="flex space-x-2">
                {selectedRevision?.id === revision.id && activeTab === 'pending' && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApproveRevision(revision);
                      }}
                      className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRejectRevision(revision);
                      }}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                      Reject
                    </button>
                  </>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteRevision(revision);
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Delete revision"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
            {selectedRevision?.id === revision.id && (
              <>
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Changes:</h4>
                  <p className="text-sm whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 p-4 rounded">
                    {revision.changes}
                  </p>
                </div>
                <div className="mt-4 flex space-x-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreviewClick('original');
                    }}
                    className="px-4 py-2 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    View Original
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreviewClick('revised');
                    }}
                    className="px-4 py-2 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Preview Changes
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    );
  };

  const getSortedArticles = (articles: Article[]) => {
    const sorted = [...articles];
    
    const getTimestamp = (date: any): number => {
      if (typeof date === 'object' && 'seconds' in date) {
        return date.seconds;
      }
      return new Date(date).getTime() / 1000;
    };

    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt));
      case 'oldest':
        return sorted.sort((a, b) => getTimestamp(a.createdAt) - getTimestamp(b.createdAt));
      case 'a-z':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'z-a':
        return sorted.sort((a, b) => b.title.localeCompare(a.title));
      default:
        return sorted;
    }
  };

  const renderArticlesList = () => {
    if (allArticles.length === 0) {
      return <p className="section-text">No articles found.</p>;
    }

    const sortedArticles = getSortedArticles(allArticles);

    return (
      <div className="space-y-4">
        <div className="flex justify-end mb-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="a-z">A to Z</option>
            <option value="z-a">Z to A</option>
          </select>
        </div>
        {sortedArticles.map(article => (
          <div 
            key={article.id} 
            className="p-4 border rounded-lg border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">
                  <a 
                    href={`/plexi/${article.slug || generateSlug(article.title)}`}
                    className="hover:text-perplexity-primary"
                  >
                    {article.title}
                  </a>
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  By {article.author} • Created {new Date(article.createdAt).toLocaleString()}
                </p>
                <div className="mt-2 flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    article.status === 'published' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                    article.status === 'under_review' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' :
                    'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400'
                  }`}>
                    {article.status.split('_').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </span>
                  <span className="text-sm text-gray-500">•</span>
                  <span className="text-sm text-gray-500">
                    {article.content.split(' ').length} words
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigate(`/plexi/${article.slug || generateSlug(article.title)}/edit`)}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteArticle(article.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Delete article"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading || loadingRevisions || loadingArticles) {
    return (
      <div className="container !max-w-[1672px] mx-auto px-4 py-8 flex flex-1">
        <Sidebar />
        <main className="flex-1 transition-all duration-300 ease-in-out">
          <div className="perplexipedia-card">
            <div className="p-4">Loading...</div>
          </div>
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container !max-w-[1672px] mx-auto px-4 py-8 flex flex-1">
      <Sidebar />
      <main className="flex-1 transition-all duration-300 ease-in-out">
        <div className="perplexipedia-card">
          <h1 className="text-4xl font-linux-libertine mb-4 section-title">Content Moderation</h1>
          <p className="text-lg mb-6 section-text">
            Review and moderate content across the platform.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="perplexipedia-card lg:col-span-2">
              <div className="flex space-x-4 mb-6">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'pending'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  Pending Revisions ({pendingRevisions.length})
                </button>
                <button
                  onClick={() => setActiveTab('approved')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'approved'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  Approved Revisions ({approvedRevisions.length})
                </button>
                <button
                  onClick={() => setActiveTab('published')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'published'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  Published Articles ({allArticles.length})
                </button>
              </div>
              
              {activeTab === 'published' ? (
                loadingArticles ? (
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-perplexity-primary"></div>
                  </div>
                ) : (
                  renderArticlesList()
                )
              ) : (
                renderRevisionsList(activeTab === 'pending' ? pendingRevisions : approvedRevisions)
              )}
            </div>
            
            <div className="perplexipedia-card">
              <h2 className="text-2xl font-linux-libertine mb-4 section-title">Content Guidelines</h2>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h3 className="font-medium mb-2">Core Principles</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>All content must maintain a neutral, unbiased perspective</li>
                    <li>Content is allowed unless explicitly illegal or harmful</li>
                    <li>Personal opinions should be clearly marked as such</li>
                    <li>Factual accuracy and verifiability are essential</li>
                  </ul>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h3 className="font-medium mb-2">Moderation Policy</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Content is reviewed only for legality and basic guidelines compliance</li>
                    <li>Different viewpoints are welcome as long as they're presented fairly</li>
                    <li>Controversial topics should present multiple perspectives</li>
                    <li>Citations and sources should be provided where applicable</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      {renderPreviewModal()}
    </div>
  );
}; 