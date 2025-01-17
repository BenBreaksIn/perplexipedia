import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { DashboardProfile } from './DashboardProfile';
import { DashboardActivity } from './DashboardActivity';
import { DashboardContributions } from './DashboardContributions';
import { DashboardSaved } from './DashboardSaved';
import { DashboardSettings } from './DashboardSettings';

type DashboardTab = 'profile' | 'activity' | 'contributions' | 'saved' | 'settings';

export const Dashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<DashboardTab>('profile');
  const { currentUser } = useAuth();

  const renderTabContent = () => {
    switch (currentTab) {
      case 'profile':
        return <DashboardProfile />;
      case 'activity':
        return <DashboardActivity />;
      case 'contributions':
        return <DashboardContributions />;
      case 'saved':
        return <DashboardSaved />;
      case 'settings':
        return <DashboardSettings />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="md:w-64 flex-shrink-0">
          <div className="wiki-card">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                {currentUser?.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt={currentUser.displayName || 'User'} 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-2xl text-gray-500 dark:text-gray-400">
                    {(currentUser?.displayName || currentUser?.email || 'U')[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-lg font-medium">{currentUser?.displayName || 'User'}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{currentUser?.email}</p>
              </div>
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => setCurrentTab('profile')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors duration-150 ${
                  currentTab === 'profile'
                    ? 'bg-perplexity-primary/10 text-perplexity-primary dark:bg-blue-900/30 dark:text-blue-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setCurrentTab('activity')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors duration-150 ${
                  currentTab === 'activity'
                    ? 'bg-perplexity-primary/10 text-perplexity-primary dark:bg-blue-900/30 dark:text-blue-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Recent Activity
              </button>
              <button
                onClick={() => setCurrentTab('contributions')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors duration-150 ${
                  currentTab === 'contributions'
                    ? 'bg-perplexity-primary/10 text-perplexity-primary dark:bg-blue-900/30 dark:text-blue-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Contributions
              </button>
              <button
                onClick={() => setCurrentTab('saved')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors duration-150 ${
                  currentTab === 'saved'
                    ? 'bg-perplexity-primary/10 text-perplexity-primary dark:bg-blue-900/30 dark:text-blue-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Saved Articles
              </button>
              <button
                onClick={() => setCurrentTab('settings')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors duration-150 ${
                  currentTab === 'settings'
                    ? 'bg-perplexity-primary/10 text-perplexity-primary dark:bg-blue-900/30 dark:text-blue-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Settings
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="wiki-card">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}; 