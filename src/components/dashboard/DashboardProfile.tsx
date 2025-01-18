import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export const DashboardProfile: React.FC = () => {
  const { currentUser, updateUserProfile } = useAuth();
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    articlesCreated: 0,
    totalEdits: 0,
    articlesSaved: 0
  });

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!currentUser) return;

      try {
        // Fetch articles created
        const articlesRef = collection(db, 'articles');
        const articlesQuery = query(articlesRef, where('authorId', '==', currentUser.uid));
        const articlesSnapshot = await getDocs(articlesQuery);
        const articlesCount = articlesSnapshot.size;

        // Fetch saved articles
        const savedRef = collection(db, 'saved_articles');
        const savedQuery = query(savedRef, where('userId', '==', currentUser.uid));
        const savedSnapshot = await getDocs(savedQuery);
        const savedCount = savedSnapshot.size;

        // Calculate total edits from article versions
        let totalEdits = 0;
        articlesSnapshot.forEach(doc => {
          const article = doc.data();
          if (article.versions) {
            totalEdits += article.versions.length;
          }
        });

        setStats({
          articlesCreated: articlesCount,
          totalEdits: totalEdits,
          articlesSaved: savedCount
        });
      } catch (error) {
        console.error('Error fetching user stats:', error);
      }
    };

    fetchUserStats();
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);
      await updateUserProfile(displayName);
      setIsEditing(false);
    } catch (err) {
      setError('Failed to update profile. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-perplexipedia-border pb-4">
        <h2 className="text-2xl font-linux-libertine section-title">Profile</h2>
        <p className="text-gray-600 dark:text-gray-400">Manage your personal information and preferences</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4">Personal Information</h3>
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="search-input w-full"
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className={`btn-primary ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setDisplayName(currentUser?.displayName || '');
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Display Name</p>
                  <p className="text-lg">{currentUser?.displayName || 'Not set'}</p>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-secondary"
                >
                  Edit
                </button>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                <p className="text-lg">{currentUser?.email}</p>
              </div>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-lg font-medium mb-4">Account Statistics</h3>
          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <div className="perplexipedia-card bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 text-center">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Articles Created</h4>
              <p className="text-2xl font-medium text-black dark:text-white mt-2">{stats.articlesCreated}</p>
            </div>
            <div className="perplexipedia-card bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 text-center">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Edits</h4>
              <p className="text-2xl font-medium text-black dark:text-white mt-2">{stats.totalEdits}</p>
            </div>
            <div className="perplexipedia-card bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 text-center">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Articles Saved</h4>
              <p className="text-2xl font-medium text-black dark:text-white mt-2">{stats.articlesSaved}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 