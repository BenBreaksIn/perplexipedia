import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Article } from '../../types/article';
import { Sidebar } from '../Sidebar';

interface ArticleVersion extends Article {
  version: number;
  timestamp: any;
}

export const ArticleHistory: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [versions, setVersions] = useState<ArticleVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!id) return;
      
      try {
        const versionsQuery = query(
          collection(db, 'articleVersions'),
          where('articleId', '==', id),
          orderBy('version', 'desc')
        );
        
        const versionsSnapshot = await getDocs(versionsQuery);
        const versionsData = versionsSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as ArticleVersion[];
        
        setVersions(versionsData);
      } catch (err) {
        setError('Failed to load article history');
        console.error('Error fetching article history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [id]);

  if (loading) {
    return (
      <div className="container !max-w-[1672px] mx-auto px-4 py-8 flex flex-1">
        <Sidebar />
        <main className="flex-1 transition-all duration-300 ease-in-out">
          <div className="perplexipedia-card">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-perplexity-primary"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container !max-w-[1672px] mx-auto px-4 py-8 flex flex-1">
        <Sidebar />
        <main className="flex-1 transition-all duration-300 ease-in-out">
          <div className="perplexipedia-card">
            <div className="text-red-500">{error}</div>
          </div>
        </main>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="container !max-w-[1672px] mx-auto px-4 py-8 flex flex-1">
        <Sidebar />
        <main className="flex-1 transition-all duration-300 ease-in-out">
          <div className="perplexipedia-card">
            <div>No revision history found</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="container !max-w-[1672px] mx-auto px-4 py-8 flex flex-1">
      <Sidebar />
      <main className="flex-1 transition-all duration-300 ease-in-out">
        <div className="perplexipedia-card">
          <h1 className="text-2xl font-linux-libertine mb-4 section-title">
            Revision history
          </h1>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {versions.map((version) => (
                <div key={version.id} className="px-4 py-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-medium">
                        Version {version.version}
                      </div>
                      <div className="text-sm text-gray-500">
                        {version.timestamp?.toDate().toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        by {version.author || 'Unknown'}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        className="px-3 py-1 text-sm rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
                        onClick={() => window.location.href = `/articles/${id}/source?version=${version.version}`}
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}; 