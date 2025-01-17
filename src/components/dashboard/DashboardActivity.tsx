import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';

type Activity = {
  id: string;
  type: 'edit' | 'create' | 'comment';
  article: string;
  timestamp: Date;
  description: string;
};

export const DashboardActivity: React.FC = () => {
  const { currentUser } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentUser) return;

    const activitiesRef = collection(db, 'activities');
    const q = query(
      activitiesRef,
      where('userId', '==', currentUser.uid),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedActivities = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp.toDate()
        })) as Activity[];

        setActivities(fetchedActivities);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching activities:', err);
        setError('Failed to load activities');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'edit':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      case 'create':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        );
      case 'comment':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="border-b border-wiki-border pb-4">
          <h2 className="text-2xl font-linux-libertine section-title">Recent Activity</h2>
          <p className="text-gray-600 dark:text-gray-400">Loading your recent contributions and interactions...</p>
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
          <h2 className="text-2xl font-linux-libertine section-title">Recent Activity</h2>
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-wiki-border pb-4">
        <h2 className="text-2xl font-linux-libertine section-title">Recent Activity</h2>
        <p className="text-gray-600 dark:text-gray-400">Your recent contributions and interactions</p>
      </div>

      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {activity.article}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatTimestamp(activity.timestamp)}
                </p>
              </div>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {activity.description}
              </p>
            </div>
          </div>
        ))}

        {activities.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
}; 