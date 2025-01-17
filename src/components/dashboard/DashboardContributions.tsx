import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

type Contribution = {
  id: string;
  article: string;
  type: 'major' | 'minor';
  changes: string;
  timestamp: Date;
  status: 'pending' | 'approved' | 'rejected';
};

type ContributionFilter = 'all' | 'pending' | 'approved';

export const DashboardContributions: React.FC = () => {
  const { currentUser } = useAuth();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [filter, setFilter] = useState<ContributionFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentUser) return;

    const contributionsRef = collection(db, 'contributions');
    const q = query(
      contributionsRef,
      where('userId', '==', currentUser.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedContributions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp.toDate()
        })) as Contribution[];

        setContributions(fetchedContributions);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching contributions:', err);
        setError('Failed to load contributions');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };

  const filteredContributions = contributions.filter(contribution => {
    if (filter === 'all') return true;
    return contribution.status === filter;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="border-b border-wiki-border pb-4">
          <h2 className="text-2xl font-linux-libertine section-title">Contributions</h2>
          <p className="text-gray-600 dark:text-gray-400">Loading your contributions...</p>
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
        <div className="border-b border-wiki-border pb-4">
          <h2 className="text-2xl font-linux-libertine section-title">Contributions</h2>
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-wiki-border pb-4">
        <h2 className="text-2xl font-linux-libertine section-title">Contributions</h2>
        <p className="text-gray-600 dark:text-gray-400">Track your article edits and contributions</p>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
            filter === 'all'
              ? 'bg-perplexity-primary/10 text-perplexity-primary dark:bg-blue-900/30 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
            filter === 'pending'
              ? 'bg-perplexity-primary/10 text-perplexity-primary dark:bg-blue-900/30 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
            filter === 'approved'
              ? 'bg-perplexity-primary/10 text-perplexity-primary dark:bg-blue-900/30 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Approved
        </button>
      </div>

      <div className="space-y-4">
        {filteredContributions.map((contribution) => (
          <div key={contribution.id} className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">{contribution.article}</h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  contribution.status === 'approved'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}>
                  {contribution.status.charAt(0).toUpperCase() + contribution.status.slice(1)}
                </span>
              </div>
              <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <span>{formatTimestamp(contribution.timestamp)}</span>
                <span>•</span>
                <span className={`${
                  contribution.type === 'major' 
                    ? 'text-purple-600 dark:text-purple-400' 
                    : 'text-blue-600 dark:text-blue-400'
                }`}>
                  {contribution.type.charAt(0).toUpperCase() + contribution.type.slice(1)} edit
                </span>
                <span>•</span>
                <span className="font-mono">{contribution.changes}</span>
              </div>
            </div>
          </div>
        ))}

        {filteredContributions.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No contributions found</p>
          </div>
        )}
      </div>
    </div>
  );
}; 